# Sprint 12: Prompts & Data — Handover

## Date: 2026-05-29 | Agent: M2.7

## Sprint E — 5 Tasks (all pending)

### Task 1 — Eliminate Frontend Prompt Duplication (P1) ⬅️ HIGH PRIORITY
- Add `GET /api/prompts/:motorKey` backend endpoint (`server/src/routes/prompts.ts`)
- Remove dead `?raw` imports from `src/lib/pptx/promptRunner.ts` (12 imports)
- Delete `src/prompts/` directory (12 files)
- KEEP `documentIngester.ts` alpha2 import — it's the only live use
- Register router in `server/src/app.ts`

### Task 2 — Add Prompt Version Hashing (P2)
- Migration 003: add `prompt_version TEXT` to `motor_results` and `materials` tables
- In motors route: record git SHA of prompt file on insert (short 8-char hash)
- Files: `server/src/db/migrations/003_prompt_version.sql`, `server/src/routes/motores.ts`

### Task 3 — History Output Retrieval Endpoint (P2)
- Add `GET /api/materials/:id/output` — returns full `result_json` (not truncated)
- ETag header for caching
- Auth check: user owns the result or is admin

### Task 4 — CSRF Protection (P2)
- Add `SameSite=Strict` cookie on auth login
- Or implement double-submit cookie pattern

### Task 5 — Complete `.env.example` (P2)
- Add `ADMIN_PASSWORD` documentation
- Add `MINIMAX_API_KEY` (currently missing from .env.example, only in server/.env)
- Add `LOG_LEVEL`
- Target: ~30+ lines (currently 22)

## Entry State
- Build: ✅ 0 errors | Tests: ✅ 127/127 | Docker: ✅ running

## Already Done
- docker-compose.yml ✅
- .env.example partial ✅
- GitHub Actions CI (test.yml) ✅

## Files to Read
- `planning/sprints/sprint-E/SPRINT_E_HANDOVER.md`
- `server/src/app.ts`
- `server/src/routes/motores.ts`
- `src/lib/pptx/promptRunner.ts`

## Execution Order
T1 + T3/T4/T5 can run in parallel (different files)
T2 depends on T1 (prompts must be server-only first)