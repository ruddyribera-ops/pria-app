# ══════════════════════════════════════════════════════════════════
#  HANDOVER — PRIA v10 Remaining Fixes
#  Powered by MiniMax M2.7
# ══════════════════════════════════════════════════════════════════

You are an expert full-stack engineer. You have two small tasks to complete
on PRIA v10 at D:\ACTIVE PROJECTS\PRIA v10.

## Task 1: Fix encoding bug in substituteVariables (5 minutes)

### Problem
One test fails:
`
 FAIL  src/lib/pptx/promptRunner.test.ts > substituteVariables > converts booleans to Sí/No
 AssertionError: expected 'Active: SÃ\u00ad' to contain 'Sí'
`

### Root Cause
src/lib/pptx/promptRunner.ts line 72 has a UTF-8 encoding corruption:
`	ypescript
replacement = value ? 'SÃ\xad' : 'No';  // ← broken
`

The character for "í" (0xC3 0xAD in UTF-8) was saved wrong — the file bytes got
interpreted as Latin-1 instead of UTF-8.

### Fix
Replace line 72 with:
`	ypescript
replacement = value ? 'Sí' : 'No';
`

### Verification
`ash
cd "D:\ACTIVE PROJECTS\PRIA v10"
npx vitest run src/lib/pptx/promptRunner.test.ts
`
All 13 tests should pass.

---

## Task 2: Run integration tests with PostgreSQL (10 minutes)

### Problem
6 integration tests are skipped because PostgreSQL isn't running:
- server/src/routes/__tests__/auth.test.ts (4 tests)
- server/src/routes/__tests__/health.test.ts (2 tests)

These tests have a guard that throws an explicit error:
`
PostgreSQL is required for integration tests.
Run "docker start pria-pg" or set DATABASE_URL.
`

### Fix
Start the existing Docker PostgreSQL container and re-run tests:

`powershell
docker start pria-pg
cd "D:\ACTIVE PROJECTS\PRIA v10"
npx vitest run
`

Expected: 91/92 passing (still 1 encoding fail if Task 1 not yet done).

Note: If docker start fails with "not found", the container was removed.
In that case, create it fresh:
`powershell
docker run -d --name pria-pg -e POSTGRES_PASSWORD=pria_local -e POSTGRES_DB=pria -p 5432:5432 postgres:16
`

---

## Order
1. Fix the encoding bug (Task 1) — this is a one-line change
2. Run integration tests (Task 2) — requires Docker

## Context
- Project: D:\ACTIVE PROJECTS\PRIA v10
- Shell: PowerShell (Windows)
- Node: ^22, uses tsx for running TypeScript
- MASTER_ROADMAP.md is the source of truth for all project context
- All 9 sprints are already DONE (Sprint 0-8)
- Current state: 85/92 passing, 1 encoding failure, 6 skipped (no PG)

## Completion criteria
- [ ] npm run typecheck: 0 errors
- [ ] npm run build: 0 errors
- [ ] npx vitest run: 91+/92 passing (all non-PG tests)
