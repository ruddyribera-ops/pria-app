# SPRINT E — Prompts & Data

> **Source:** MASTER_PLAN_REMEDIATION.md §4 (Prompt Engineering), §6 (Security), §8.3 (History), §9.2, §9.3, §9.4
> **Status:** Not started
> **Date:** 2026-05-29
> **Branch:** master

---

## Sprint E Entry State

| Check | Status |
|-------|--------|
| Build | ✅ 0 errors |
| Typecheck | ✅ 0 errors |
| Tests | ✅ 127/127 passing |
| Docker `pria-pg` | ✅ running |
| Sprint A-D | ✅ All verified |

---

## Already Completed (partial)

These items from previous sprints or manual work:

| Item | Status | Source |
|------|--------|--------|
| Railway.toml points to unified entry | ✅ | Sprint A |
| docker-compose.yml exists | ✅ | Sprint 8 |
| `.env.example` exists (22 lines) | ✅ | Sprint 8 |
| GitHub Actions CI (`test.yml`) | ✅ | Sprint 8 |
| UTF-8 corruption in alpha2.md | ✅ Fixed | Sprint C |

---

## Task 1 — Eliminate Frontend Prompt Duplication (P1)

**Source:** MASTER_PLAN §4.2 (P1), §10 Duplication Map
**Status:** ❌ NOT DONE — 12 prompts still duplicated
**Complexity:** High — requires backend API + frontend refactor

### What
The 12 motor prompts exist in TWO copies:
- `src/prompts/Motor_*.md` (12 files) — loaded at build time via `?raw`
- `server/src/motores/prompts/*.md` (12 files) — loaded at runtime from disk

The frontend copies are **dead code** for the motor generation path (they're only used by the legacy `documentIngester.ts` for alpha2 extraction). But they still exist and will diverge over time.

### Backend — Add `GET /api/prompts/:motorKey` endpoint

**File:** `server/src/routes/prompts.ts` (NEW)

```typescript
// server/src/routes/prompts.ts
import { Router } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/prompts/:motorKey — returns prompt content as text/plain
// No auth required — prompts are not secret
router.get('/:motorKey', async (req, res) => {
  const { motorKey } = req.params;
  const validKeys = [
    'synthesis', 'abp', 'assessment', 'plan', 'slides', 'ficha',
    'quiz', 'tutor', 'pdc', 'recalibrate', 'micro', 'alpha2',
  ];

  if (!validKeys.includes(motorKey)) {
    return res.status(404).json({ error: 'Prompt not found' });
  }

  try {
    const promptPath = join(process.cwd(), 'src', 'motores', 'prompts', `${motorKey}.md`);
    const content = readFileSync(promptPath, 'utf-8');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // cache 1 hour
    res.send(content);
  } catch {
    res.status(500).json({ error: 'Failed to load prompt' });
  }
});

export default router;
```

**Register in `server/src/app.ts`:**
```typescript
import promptsRouter from './routes/prompts.js';
app.use('/api/prompts', promptsRouter);
```

### Frontend — Remove dead `?raw` prompt imports

**Files to check and clean:**
1. `src/lib/pptx/promptRunner.ts` — remove all `?raw` prompt imports (12 imports)
2. `src/lib/ingest/documentIngester.ts` — KEEP `alpha2Prompt` import (it's used for legacy alpha2 route)

**In `promptRunner.ts` — remove these imports:**
```typescript
// DELETE these 12 imports (they are dead code for motor generation):
// import alpha2Prompt from '../../prompts/Motor_Alpha-2.md?raw';
// import synthesisPrompt from '../../prompts/Motor_M0a.md?raw';
// import abpPrompt from '../../prompts/Motor_M0b.md?raw';
// ... etc for all 12
```

After removal, verify:
```powershell
grep -r "?raw" src/lib/pptx/promptRunner.ts  # Should return 0 results
grep -r "Motor_M" src/lib/pptx/promptRunner.ts  # Should return 0 results
```

### Delete frontend prompt files (after verifying)

```powershell
# Verify no imports remain
grep -r "prompts/Motor_" src/ --include="*.ts" --include="*.tsx"

# If 0 results, safe to delete
Remove-Item src/prompts/ -Recurse -Force
```

### Verify
```powershell
npm run build  # 0 errors
npx vitest run  # 127/127
# Manual: POST /api/motores/synthesis with real request → still returns valid JSON
```

### Edge cases
- `documentIngester.ts` uses `alpha2Prompt` via `?raw` for the `/api/ai/generate` alpha2 route → do NOT delete this import, it's the only live use
- Prompt cache: the `Cache-Control` header means browsers cache for 1 hour — okay for prompts that rarely change

---

## Task 2 — Add Prompt Version Hashing (P2)

**Source:** MASTER_PLAN §4.3 (P2)
**Status:** ❌ Not started
**Complexity:** Low — add one field to insert queries

### What
Store the git SHA of the prompt file alongside generated content so old outputs can be traced to which prompt version produced them.

### Implementation

**In `server/src/db/schema.ts` — add `prompt_version` column:**
```sql
-- Migration: 003_prompt_version.sql
ALTER TABLE motor_results ADD COLUMN prompt_version TEXT;
ALTER TABLE materials ADD COLUMN prompt_version TEXT;
```

**In `server/src/routes/motores.ts` — record git SHA on insert:**
```typescript
import { execSync } from 'child_process';

function getPromptVersion(motorKey: string): string {
  try {
    const promptPath = join(process.cwd(), 'src', 'motores', 'prompts', `${motorKey}.md`);
    const sha = execSync(`git hash-object ${promptPath}`, { encoding: 'utf-8' }).trim();
    return sha.slice(0, 8); // short SHA
  } catch {
    return 'unknown';
  }
}

// In the route handler that saves motor_results:
const promptVersion = getPromptVersion(motorType);
await pool.query(
  `INSERT INTO motor_results (user_id, curriculum_id, motor_type, result_json, prompt_version, ...)
   VALUES ($1, $2, $3, $4, $5, ...)`,
  [userId, curriculumId, motorType, resultJson, promptVersion, ...]
);
```

### Verify
```powershell
# After migration runs, check a motor result has prompt_version
# Query: SELECT prompt_version FROM motor_results ORDER BY created_at DESC LIMIT 1;
# Should show 8-char hex string (e.g., "a3f1b2c4")
```

---

## Task 3 — History Output Retrieval Endpoint (P2)

**Source:** MASTER_PLAN §8.3 (P2)
**Status:** ❌ Not started
**Complexity:** Low — add one route + ETag

### What
Add `GET /api/materials/:id/output` that returns the full output JSON (not the 2000-char truncated preview).

### Implementation

**In `server/src/routes/materials.ts` — add route:**
```typescript
// GET /api/materials/:id/output — returns full result_json
router.get('/:id/output', authMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const row = await dbGet<{result_json: string, user_id: number}>(
    'SELECT result_json, user_id FROM motor_results WHERE id = $1',
    [id]
  );

  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.setHeader('Cache-Control', 'private, max-age=300'); // 5 min client cache
  res.setHeader('ETag', `"${hash(row.result_json).slice(0,16)}"`);
  res.json(JSON.parse(row.result_json));
});
```

### Verify
```powershell
# Create a motor result via POST /api/motores/synthesis
# Then GET /api/materials/<id>/output
# Should return full JSON (> 2000 chars), not truncated
```

---

## Task 4 — CSRF Protection (P2)

**Source:** MASTER_PLAN §6.2 (P2)
**Status:** ❌ Not started
**Complexity:** Medium — JWT in localStorage reduces CSRF risk, but still worth adding

### What
Add `SameSite=Strict` cookie + double-submit pattern for state-changing requests.

### Implementation

**Option A — SameSite=Strict cookie (simpler):**
In `server/src/index.ts`, after JWT is set in cookie:
```typescript
res.cookie('csrf_token', crypto.randomUUID(), {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 86400000, // 24 hours
});
```

**Option B — double-submit cookie (full CSRF):**
1. Server sets `CSRF_TOKEN` cookie (httpOnly: false, sameSite: strict)
2. Client reads token and sends as `X-CSRF-TOKEN` header on POST/PUT/PATCH
3. Server validates `X-CSRF-TOKEN === CSRF_TOKEN` cookie

### Verify
```powershell
# Login and check Set-Cookie header has SameSite attribute
curl -v -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' 2>&1 | grep -i "set-cookie"
# Should show SameSite=Strict
```

---

## Task 5 — Complete `.env.example` (P2)

**Source:** MASTER_PLAN §9.3 (P2)
**Status:** ⚠️ Partial — only 22 lines, missing ADMIN_PASSWORD

### What
`.env.example` exists but doesn't document `ADMIN_PASSWORD`. Add all missing variables.

### Update `.env.example`
```bash
# -- Required --
JWT_SECRET=                           # openssl rand -hex 32 (min 32 chars)
JWT_EXPIRY=24h                        # e.g., 24h, 7d, 30d

# -- Server --
PORT=3000
NODE_ENV=development                  # development | production | test
CORS_ORIGIN=http://localhost:5173   # Your Railway URL in production

# -- Database --
DATABASE_URL=postgresql://postgres:pria_local@localhost:5432/pria

# -- MiniMax --
MINIMAX_API_KEY=sk-...               # Set in server/.env (never commit)
MINIMAX_MODEL=MiniMax-M2.7
MINIMAX_TEMPERATURE=0.2
MINIMAX_MAX_TOKENS=4096

# -- Security --
# Admin password — random generated if unset (shown in logs on first start)
# ADMIN_PASSWORD=                    # Optional override

# -- Optional --
SENTRY_DSN=                          # e.g., https://...
LOG_LEVEL=info                       # debug | info | warn | error
```

### Verify
```powershell
# Count lines in .env.example (should be ~30+)
# Check ADMIN_PASSWORD is documented
Select-String -Path .env.example -Pattern "ADMIN_PASSWORD"
```

---

## Execution Order

```
1. Task 1 (Prompts API)    — High effort, high impact, unlocks prompt versioning
2. Task 2 (Versioning)    — Depends on Task 1 (needs prompt files in server/ only)
3. Task 3 (History API)   — Independent
4. Task 4 (CSRF)          — Independent
5. Task 5 (.env.example)  — Quick win, can do anytime
```

**Task 1 and Task 3/4/5 can run in parallel** (different files, different layers).

## Exit Criteria

- [ ] `GET /api/prompts/synthesis` returns 200 with prompt text
- [ ] `src/lib/pptx/promptRunner.ts` has 0 `?raw` imports
- [ ] `src/prompts/` directory deleted (12 files removed)
- [ ] `documentIngester.ts` still works (alpha2 route only) — `npm run build` passes
- [ ] `GET /api/materials/:id/output` returns full JSON (not truncated)
- [ ] Prompt version column exists in motor_results table
- [ ] `SameSite=Strict` cookie set on auth login
- [ ] `.env.example` has `ADMIN_PASSWORD` documented
- [ ] `npm run build` → 0 errors
- [ ] `npx vitest run` → 127+ tests pass

## Files to Read

- `server/src/app.ts` — where to register prompts router
- `server/src/routes/motores.ts` — where to inject prompt version on insert
- `src/lib/pptx/promptRunner.ts` — verify dead imports before deletion
- `src/lib/ingest/documentIngester.ts` — verify alpha2 still works after deletion

## Files to NOT Touch

- `server/src/motores/prompts/*.md` — these stay as single source of truth
- `server/src/db/schema.ts` — unless adding migration 003