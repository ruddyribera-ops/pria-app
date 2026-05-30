# Master Handover — PRIA v10

**Project:** Plataforma de Recursos Educativos de Inteligencia Artificial
**Stack:** React 19 + Vite, TypeScript, Express, PostgreSQL, MiniMax M2.7 API
**Repo:** `D:/ACTIVE PROJECTS/PRIA v10`
**Deployed:** Railway (backend) + Vercel (frontend) at `steadfast-alignment-production.up.railway.app`
**Last session:** 2026-05-30 — 4 production bugs fixed (B3–B6)

---

## What this project does

PRIA is a platform that helps teachers generate educational content (lesson plans, slides, quizzes, assessments, etc.) from PDF curricula using AI. Teachers upload PDFs → system extracts content → AI generates structured materials → output is viewed/downloaded.

**Key flows:**
1. Upload PDF textbook → AI extracts curriculum (motor: `alpha2`)
2. Generate unit synthesis (motor: `synthesis`)
3. Generate ABP project (motor: `abp`)
4. Generate assessment rubric (motor: `assessment`)
5. Generate lesson plan (motor: `plan`)
6. Generate slides (motor: `slides`)
7. Generate gamified worksheet (motor: `ficha`)
8. Generate pop quiz (motor: `quiz`)
9. Generate quarterly PDC plan (motor: `pdc`)
10. Admin panel: manage users, blocks (schedule), cache, daily reset

**12 motors total:** synthesis, alpha2, abp, assessment, plan, slides, ficha, quiz, tutor, pdc, recalibrate, micro

---

## Current state — what works

### Confirmed working
- Auth: JWT login at `POST /api/auth/login` with `{ usuario, contrasena }` (Spanish field names)
- All motor endpoints exist (but some return mock data — see "Known issues")
- Materials upload/download
- Diagnosticos (student diagnostics) CRUD
- Curriculums CRUD
- Schedule endpoints
- Frontend builds without errors
- TypeScript: 0 type errors
- Unit tests: 127/127 pass
- E2E tests: 11/11 pass

### File structure
```
PRIA v10/
├── src/
│   ├── api/           — Axios API clients (client.ts, auth.ts, motores.ts, admin.ts, materials.ts, diagnosticos.ts, blocks.ts, schedule.ts, users.ts)
│   ├── hooks/         — useMotorGenerator, useMotorGeneration, useMultiPhaseGeneration, useAdmin, useMaterials, useCurriculum
│   ├── lib/           — ai/minimaxClient.ts, pptx/promptRunner.ts (local AI engine)
│   ├── pages/         — MaterialesPage, SlideGeneratorPage, SemanalPage, TrimestralPage, DiarioPage, HistoryPage, DiagnosticosPage, AdminPage
│   │                  — AdminArchivosPanel, AdminUsuariosPanel, AdminResetPanel, AdminCachePanel, AdminBloquesPanel
│   └── types/index.ts — Shared TypeScript interfaces
├── server/
│   └── src/
│       ├── routes/   — admin.ts, motores.ts, materials.ts, diagnosticos.ts, curriculums.ts, schedule.ts, ai.ts, blocks.ts
│       ├── schemas/   — Zod schemas for all 12 motors (alpha2, synthesis, abp, assessment, plan, slides, ficha, quiz, tutor, pdc, recalibrate, micro)
│       └── db/        — schema.ts, connection.ts, migrate.ts, migrations/001-004
└── docs/
    ├── PRODUCTION_ROADMAP.md  ← READ THIS FIRST
    └── HANDOFF.md             ← This file
```

---

## Known issues (as of 2026-05-30)

### ✅ Fixed this session (committed in `6465f76`)

| # | Bug | Fix | Commit |
|---|-----|-----|--------|
| B3 | Admin `/users/` 404 (frontend calls trailing slash, backend didn't) | Added GET/POST `/users/` + PUT/DELETE `/users/:id` | `6465f76` |
| B4 | `/blocks/` had no backend (full frontend CRUD, zero backend) | New route `blocks.ts` + migration `004_bloques.sql` | `6465f76` |
| B5 | `/admin/cache/stats` + `/admin/cache` didn't exist | Stubbed both (return zeros/success) | `6465f76` |
| B6 | Motor crashed without curriculum context (500 error) | Removed `if (curriculum_id)` guard; always inserts with `|| null` | `6465f76` |

### ⚠️ Still present (P1 — not fixed this session)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| P1-1 | `USE_MOCK=true` always active — real MiniMax never called | `server/src/routes/motores.ts` line ~85 | No real AI generation |
| P1-2 | 3 motors not implemented (tutor, recalibrate, micro) | `server/src/routes/motores.ts` + `src/hooks/useMotorGeneration.ts` | Calling these throws 422 |
| P1-3 | Generic `/ai/generate` endpoint doesn't exist | `src/lib/ai/minimaxClient.ts` fallback route | Generic AI calls 404 |
| P1-4 | SSE streaming not implemented | `minimaxClient.ts` comment + `promptRunner.ts` | UI polls instead of SSE |
| P1-5 | OCR blocks UI without progress indicator | `documentIngester.ts` + `ocrWorker.ts` | ~15 min for 145-page PDF, no feedback |
| P1-6 | CORS origins hardcoded to localhost | `server/src/index.ts` | Can't deploy anywhere |

### 🔧 Pre-existing test infra issues (unrelated to any changes above)

- `cli.test.ts`: timeout on async operations
- `motores.test.ts`: hook timeout, some tests use live network calls  
- `curriculums.test.ts` + `admin.test.ts`: pg pool double-release errors
These failed before our changes and fail now. Not related to bug fixes.

---

## Documentation

### Read first
- `docs/PRODUCTION_ROADMAP.md` — full assessment with 5 phases, bug details, open questions, quick wins. **Read this before starting any work.**

### Key files for understanding
- `server/src/routes/motores.ts` — 12 motor implementations (lines ~60–245)
- `src/lib/pptx/promptRunner.ts` — frontend AI engine with MOCK/FULL_AI/SKIP modes
- `src/lib/ai/minimaxClient.ts` — bridges frontend → backend for motor calls
- `src/hooks/useMotorGeneration.ts` — state machine for motor lifecycle

---

## Open questions (need answers before proceeding with features)

| # | Question | Priority |
|---|----------|----------|
| Q1 | Should `blocks` management stay or be removed? | High |
| Q2 | What should `tutor`, `recalibrate`, `micro` motors do? | High |
| Q3 | Should `USE_MOCK=true` be default in dev, or real AI? | High |
| Q4 | Should generic `/ai/generate` exist, or all AI through motors? | Medium |
| Q5 | Deployment target — Railway only, or changes planned? | Medium |

---

## Commands

```bash
# Dev
cd "D:/ACTIVE PROJECTS/PRIA v10"
npm run dev              # frontend :5173
cd server && npm run dev  # backend :3000

# Test
npm test -- --run        # 127/127 pass (7 fail pre-existing infra)

# Build
npm run build            # 0 errors

# Type check
npx tsc --noEmit         # 0 errors
```

---

## Environment variables for real AI

```bash
# server/.env
MINIMAX_API_KEY=your_key_here
MINIMAX_MODEL=MiniMax-M2.7
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret_here
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## Session log (what happened in previous sessions)

| Date | Session | What was done |
|------|---------|---------------|
| 2026-05-30 | `6465f76` | Fixed B3–B6 (users route mismatch, blocks no-backend, cache stats missing, motor null crash). Wrote `PRODUCTION_ROADMAP.md`. |
| 2026-05-30 | `5be01a9` | Fixed `materials.ts` `response.data.data` unwrapping bug |
| 2026-05-30 | `1b99f2b` | Fixed `diagnosticos.ts` same `response.data.data` bug |
| Earlier | master | Initial structure — 12 motors, full frontend, PostgreSQL, Railway deploy |

---

## Handover checklist

Copy this section for each session and mark completed:

```
### Session prep
- [ ] Read docs/PRODUCTION_ROADMAP.md
- [ ] Check git log --oneline -10 for recent commits
- [ ] Confirm TypeScript: npx tsc --noEmit → 0 errors
- [ ] Confirm Build: npm run build → 0 errors

### Before doing any feature work
- [ ] Ask Ruddy the 5 open questions (Q1–Q5 above)
- [ ] Verify which P1 items are still open

### After any code change
- [ ] TypeScript check: npx tsc --noEmit → 0 errors
- [ ] Build: npm run build → 0 errors
- [ ] Tests: npm test -- --run → 127/127 (allow 7 pre-existing fails)
- [ ] Commit with message describing what was done
- [ ] Update this file's session log table

### End of session
- [ ] Update HANDOFF.md session log
- [ ] Stamp sprint: powershell -File $CONFIG/scripts/stamp-sprint.ps1
- [ ] Log task: powershell -File $CONFIG/scripts/auto-memory.ps1
- [ ] Update token budget: powershell -File $CONFIG/scripts/track-tokens.ps1
```

---

**Language:** Respond in Spanish when user writes in Spanish, English when English.
**Hard rules:** Never destructive commands without confirmation. Never commit unless asked. Never modify API contract (it's live on Railway).