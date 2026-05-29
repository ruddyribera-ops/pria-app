# ══════════════════════════════════════════════════════════════════
#  HANDOVER — PRIA v10 P0 Remediation
#  Powered by MiniMax M2.7
#  Source: MASTER_PLAN_REMEDIATION.md
# ══════════════════════════════════════════════════════════════════

You are an expert full-stack engineer. Complete these 4 P0 tasks in order
on PRIA v10 at D:\ACTIVE PROJECTS\PRIA v10.

Current state: Build passes, typecheck passes, 91/92 tests passing.
Target state after P0: Build passes, typecheck passes, 92/92 tests passing,
no mock survivors, no UTF-8 corruption, rate limiter PG-backed.

---

## Task 1: Fix UTF-8 corruption in alpha2.md prompts (5 min)

### Problem
Two prompt files have mojibake (UTF-8 double-encoding corruption):
The LLM receives garbled Spanish text, harming curriculum extraction quality.

### Files
- `server/src/motores/prompts/alpha2.md`
- `src/prompts/Motor_Alpha-2.md`

### Corruption Map
| Garbled | Correct | Occurrences (per file) |
|---------|---------|----------------------|
| `â•` | `═` | ~100 (separator lines) |
| `â€”` | `—` | ~20 |
| `Ã±` | `ñ` | ~10 |
| `Ã­` | `í` | ~15 |
| `Ãº` | `ú` | ~8 |
| `Ã©` | `é` | ~12 |
| `Ã³` | `ó` | ~10 |
| `Ã¡` | `á` | ~10 |
| `â†’` | `→` | ~3 |
| `Ã‰` | `É` | ~2 |
| `Ã` | `Í` | ~3 |

### Fix
Read each file, rewrite with correct UTF-8 encoding.
Both files are identical in content. Use the clean prompt files like
`server/src/motores/prompts/synthesis.md` as a reference for correct encoding.

```powershell
# Use this to ensure proper UTF-8 without BOM:
$content = Get-Content "D:\ACTIVE PROJECTS\PRIA v10\server\src\motores\prompts\alpha2.md" -Raw
# Fix corrupted characters ...
$content = $content -replace "â•", "═" -replace "â€”", "—" # etc.
Set-Content -Path "D:\ACTIVE PROJECTS\PRIA v10\server\src\motores\prompts\alpha2.md" -Value $content -Encoding utf8
```

### Verification
```powershell
cd "D:\ACTIVE PROJECTS\PRIA v10"
# Line 1 should start with ═ not â•
(Get-Content server/src/motores/prompts/alpha2.md -First 1) -match '^# ═'
(Get-Content src/prompts/Motor_Alpha-2.md -First 1) -match '^# ═'
```

---

## Task 2: Remove all mock survivors (15 min)

### Problem
4 API modules export mock data functions that are imported by 4 page components.
When the backend is down, these mocks silently return fake data — making bugs
invisible and giving teachers a false sense of functionality.

This was supposed to be killed in Sprint 0 but survived in AdminPage.

### Files to Edit

**A) Remove mock exports from API files:**

`src/api/users.ts` — Delete the `getMockUsers()` function (lines 23-31).
Keep the real `listUsers`, `createUser`, `updateUser`, `deleteUser`.

`src/api/blocks.ts` — Delete `getMockBlocks()` function (lines 23-33).
Keep real API functions.

`src/api/diagnosticos.ts` — Delete `getMockDiagnosticos()` function (lines 22-29).
Keep real API functions.

`src/api/schedule.ts` — Delete lines 40-103 (entire mock section):
- `MOCK_CLASSES` constant
- `DAY_NAMES` array
- `getDayName()` function
- `getMockDaySchedule()` function
- `getMockWeekSchedule()` function
- `getMockTeachers()` function
- `export { DAYS, MOCK_CLASSES }` line
Keep `DAYS` (line 41) — it's used by SemanalPage.tsx.

**B) Fix all imports and fallbacks in page components:**

`src/pages/AdminPage.tsx`:
- Remove `getMockUsers` from import line 5
- Remove `getMockBlocks` from import line 6
- Line 71: Change `setUsers(getMockUsers())` → `setUsers([])`
- Line 82: Change `setBlocks(getMockBlocks())` → `setBlocks([])`
- Line 107: `.catch(() => setUsers(getMockUsers()))` → `.catch(() => setUsers([]))`
- Line 114: `.catch(() => setBlocks(getMockBlocks()))` → `.catch(() => setBlocks([]))`
- Lines 160-178: Replace mock user creation in catch → `showToast('⚠️ Error al crear usuario.', 'error')`
- Lines 273-288: Replace mock block creation in catch → `showToast('⚠️ Error al crear bloque.', 'error')`
- Lines 217-222: Replace mock delete with real `deleteUser(userId)` then `loadUsers()`

`src/pages/DiagnosticosPage.tsx`:
- Remove `getMockDiagnosticos` from import
- Replace `setDiagnosticos(getMockDiagnosticos())` → `setDiagnosticos([])`

`src/pages/DiarioPage.tsx`:
- Remove `getMockDaySchedule, getMockTeachers` from import
- Replace `setSchedule(getMockDaySchedule())` → `setSchedule([])`
- Replace `getMockTeachers()` → `[]`

`src/pages/SemanalPage.tsx`:
- Read file to see current state
- Remove `getMockWeekSchedule` from import (keep DAYS)
- Replace `getMockWeekSchedule()` → `{}`

### Verification
```powershell
cd "D:\ACTIVE PROJECTS\PRIA v10"
npm run build 2>&1
npm run typecheck 2>&1
npx vitest run 2>&1
```
All must pass with 0 errors. No TS errors about missing exports.

---

## Task 3: Migrate rate limiter from in-memory to PG-backed (30 min)

### Problem
Rate limiter at `server/src/middleware/rateLimiter.ts` uses an in-memory Map.
On Railway with multiple instances, each instance has its own counter.
A user can hit 5 instances × 100 req/min = 500 req/min undetected.

### Files
- `server/src/middleware/rateLimiter.ts`
- `server/src/db/db.ts` (or server/src/db/migrate.ts for schema)

### Fix

**Step 1: Create rate_limiter table migration**
Add to the migration file:
```sql
CREATE TABLE IF NOT EXISTS rate_limiter (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMP NOT NULL
);
```

**Step 2: Rewrite rateLimiter.ts**
Replace the in-memory Map with DB queries:

```typescript
import { db } from '../db/db';

interface RateLimitRow {
  key: string;
  count: number;
  reset_at: string;
}

export async function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const key = `ratelimit:${req.ip}:${req.path}`;
  const now = new Date();
  
  // Atomic upsert: increment or create
  await db.run(
    `INSERT INTO rate_limiter (key, count, reset_at)
     VALUES (?, 1, datetime('now', '+1 minute'))
     ON CONFLICT(key) DO UPDATE SET count = count + 1
     WHERE reset_at > datetime('now')`,
    [key]
  );
  
  const row = await db.get<RateLimitRow>(
    'SELECT count, reset_at FROM rate_limiter WHERE key = ?', 
    [key]
  );
  
  if (row && row.count > 100) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  next();
}
```

Note: If using SQLite for dev and PG for prod, handle the ON CONFLICT syntax.
For SQLite: `ON CONFLICT(key) DO UPDATE SET count = count + 1`
For PG: `ON CONFLICT (key) DO UPDATE SET count = rate_limiter.count + 1`

**Step 3: Periodic cleanup (optional but recommended)**
Add a cleanup query that runs every hour to delete expired entries:
```sql
DELETE FROM rate_limiter WHERE reset_at < datetime('now');
```

### Verification
```powershell
cd "D:\ACTIVE PROJECTS\PRIA v10"
npm run build 2>&1
npm run typecheck 2>&1
```
No type errors. The module should export a middleware function.

---

## Task 4: Fix PG auth test — seed its own user (10 min)

### Problem
91/92 tests pass. The failing test is in PG integration tests:
`server/src/routes/__tests__/auth.test.ts` expects HTTP 200 but gets 401
because the Docker PG container has old seed data where the test user
doesn't exist or has a different password.

### Fix
Add a `beforeAll` hook in `server/src/routes/__tests__/auth.test.ts` that
seeds a test user specifically for this test suite:

```typescript
beforeAll(async () => {
  // Seed a test user for integration tests
  const hashedPassword = await bcrypt.hash('testpass123', 10);
  await db.run(
    `INSERT INTO users (username, password, nombre, role, teacher_code)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(username) DO UPDATE SET password = ?`,
    ['testuser', hashedPassword, 'Test User', 'admin', 'TEST', hashedPassword]
  );
});
```

Then update the test expectations to use `testuser` / `testpass123`.

If the test file doesn't have bcrypt imported, add:
```typescript
import bcrypt from 'bcrypt';
```

### Verification
```powershell
docker start pria-pg
cd "D:\ACTIVE PROJECTS\PRIA v10"
npx vitest run server/src/routes/__tests__/auth.test.ts
```
Expected: All tests pass (HTTP 200 on login).

---

## Execution Order

1. **Task 1** — UTF-8 fix (5 min, independent)
2. **Task 2** — Remove mocks (15 min, independent of others)
3. **Task 3** — Rate limiter PG (30 min, independent)
4. **Task 4** — Fix auth test (10 min, requires Docker)

## Context
- **Project:** D:\ACTIVE PROJECTS\PRIA v10
- **Shell:** PowerShell (Windows)
- **Node:** ^22, uses tsx for running TypeScript
- **Full analysis:** MASTER_PLAN_REMEDIATION.md (493 lines)
- **Sprint source:** MASTER_ROADMAP.md (all 9 sprints DONE)
- **Current state:** 91/92 passing, 6 PG skipped

## Completion Criteria
- [ ] `npm run typecheck`: 0 errors
- [ ] `npm run build`: 0 errors
- [ ] `npx vitest run`: 92/92 passing (all non-PG)
- [ ] No `getMock*` function remains in src/api/
- [ ] alpha2.md line 1 starts with `# ═` not `# â•`
- [ ] Rate limiter uses DB, not in-memory Map
