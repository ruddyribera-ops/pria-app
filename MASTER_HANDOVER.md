# ═══════════════════════════════════════════════════════════════════════════════
#  MASTER HANDOVER PROMPT — PRIA v10 Productionization
#  Powered by MiniMax M2.7
#  Generated: 2026-05-27
# ═══════════════════════════════════════════════════════════════════════════════

You are an expert full-stack productionization engineer (MiniMax M2.7). You will execute
Sprints 1–8 of the PRIA v10 productionization roadmap, sequentially, in order.

## 1. PROJECT CONTEXT

### What is PRIA?
AI lesson-planning assistant for Las Palmas teachers. Upload textbook PDFs/JPEGs → 
OCR extracts text → 12 AI "motors" generate curriculum, slides, assessments, etc.

### Location
D:\ACTIVE PROJECTS\PRIA v10

### Tech Stack
- Frontend: React 19 + TypeScript + Vite 5 (dev on :5173)
- Backend: Express + TypeScript (tsx) (prod on :3000)
- Database: SQLite (.env default) OR PostgreSQL (Docker pria-pg on :5432)
- AI: MiniMax M2.7 API (MINIMAX_API_KEY in server/.env)
- PDF OCR: pdfjs-dist (browser)
- Image OCR: tesseract.js eng+spa (browser)

### Entry Points
- Dev frontend: npm run dev (Vite proxy → :3000)
- Backend (dev): npx tsx server.js
- Production: npm start (NODE_ENV=production tsx server.js)
- Backend-only: cd server && npx tsx src/index.ts

### Database
- .env default: DATABASE_URL=sqlite://./prisa.db
- PostgreSQL: DATABASE_URL=postgresql://postgres:pria_local@localhost:5432/pria
- Docker PostgreSQL: docker start pria-pg (already exists)
- Migration framework delivered in Sprint 1

### Key Config Files
- .env (root): JWT_SECRET, CORS_ORIGIN, DATABASE_URL
- server/.env: MINIMAX_API_KEY
- MASTER_ROADMAP.md: Full sprint definitions (source of truth)
- server/src/config.ts: Env schema
- server/src/db/schema.ts: DB init (to be replaced by migrations in Sprint 1)

## 2. CURRENT STATE (POST-SPRINT 0 — May 27, 2026)

### What Changed in Sprint 0
- server.js + server/src/index.ts: initDB() and seed() now properly awaited
- seed.ts: Admin-only with crypto-generated password. No fake teachers (ruddy/adela/maria gone).
- src/api/materials.ts: getMockMaterials() deleted. No more fake PDFs on API failure.
- src/api/admin.ts: getMockEstadoSistema() deleted. No more fake motor statuses.
- src/pages/MaterialesPage.tsx: deleteMaterial shows error toast on API failure (not lying success).
- src/components/Layout/Sidebar.tsx: Polling runs only when dropdown is open (estadoOpen).
- src/context/AuthContext.tsx: No more fake apiLogin() call on page load.

### What Still Has Old DB Data
The SQLite file prisa.db has the old seed data (4 users from previous seeds).
After Sprint 1 migrations, this will be replaced. For now:
- admin/admin123 works (old hash in DB)
- Fake teachers (ruddy/adela/maria) still exist in old DB rows
- Delete prisa.db for a clean start if needed

### Build Status
- npm run build: 0 errors
- npm run typecheck: 0 errors
- npx vitest run: 27/27 passing

## 3. REMAINING SPRINTS OVERVIEW

| Sprint | Focus | Files Touched |
|--------|-------|--------------|
| S1 | Database migrations, FKs, TIMESTAMPTZ | server/src/db/* |
| S2 | OCR progress bar, max pages, upload fix | src/lib/ingest/*, MaterialesPage.tsx |
| S3 | Prompt dedup, merge streaming.ts, temperature config | promptRunner.ts, streaming.ts, motores.ts |
| S4 | Helmet/CSP, no as any, sanitize errors | app.ts, many .ts/.tsx files |
| S5 | Tests for mocks, components, E2E in CI | __tests__/*, .github/workflows/ |
| S6 | HistoryPage real data, skeletons, CSS vars | HistoryPage.tsx, App.css |
| S7 | railway.toml, Sentry, CI build validation | railway.toml, app.ts, CI |
| S8 | Deploy checklist, known issues, Railway deploy | PRODUCTION_CHECKLIST.md |

## 4. EXECUTION RULES

### EVERY Sprint: Start → Execute → Verify → Report

1. **Read MASTER_ROADMAP.md** for the sprint's full definition (each has sub-tasks a/b/c, 
   exact file paths, code to change, edge cases, verification checklist).
2. **Execute sub-tasks in order** within the sprint.
3. **Run verification checklist** at the end.
4. **Update MASTER_ROADMAP.md** sprint status table (change ⏳ PENDING to ✅ DONE, add date).
5. **Create sprint report** at .opencode/memory/sprint-NNN.md (see roadmap for template).

### Coding Rules
- BEFORE writing code: read the file first. State assumptions explicitly.
- Surgical changes: touch only what was asked. No speculative features.
- After changes: run npm run build && npm run typecheck. Fix all errors.
- Run tests: npx vitest run. All must pass.
- Use PowerShell syntax for shell commands (Windows).
- NEVER declare "done" without runtime evidence (curl output, test results).

### Danger Zones
- server.js vs server/src/index.ts: Two entry points. server.js is authoritative for production.
- dbRun returns { lastInsertRowid } currently — Sprint 1 changes to { id }.
- schema.ts has sqlite naming — Sprint 1 replaces with migrations.
- promptRunner.ts has dead ?raw imports — Sprint 3 removes.
- MaterialesPage.tsx has 12 showToast casts — Sprint 4 fixes the type at source.
- The old prisa.db has stale data — delete it for clean migration testing.

### Design Constraints (from project constitution)
- Spanish-first UI text, English code identifiers
- MiniMax API key strictly server-side (never in frontend bundle)
- Mock generators in server/src/motores/mocks.ts KEPT but never auto-fallback
- Express on :3000, Vite proxy in dev
- PostgreSQL via pg.Pool (SQLite fallback for local dev)

### M2.7-Specific
- Keep handovers under ~3K tokens
- State ONE alternative approach before implementing, and why you chose this one
- Before marking done: verify with curl output or test results, NOT file existence

## 5. SPRINT 1 SPECIFIC INSTRUCTIONS (NEXT SPRINT)

### Sprint 1: Database Maturity
READ MASTER_ROADMAP.md lines 376-500 for full details.

Key tasks:
1a. Create server/src/db/migrations/001_initial.sql with complete schema (FKs, TIMESTAMPTZ)
1b. Create server/src/db/migrate.ts runner with schema_migrations tracking table
1c. Replace initDB() in schema.ts to call runMigrations()
1d. Fix dbRun return type: lastInsertRowid → id (and update consumers in auth.ts, materials.ts, curriculums.ts)

IMPORTANT: Keep schema.ts exports (dbAll, dbGet, dbRun) — they're used by all route files.

For PostgreSQL testing: docker start pria-pg (port 5432, password pria_local)
The SQLite code path also needs to work for local dev.

Verification:
□ Server starts with fresh DB → all tables created via migration
□ Server starts with existing DB → migration not re-applied
□ schema_migrations table has 1 row
□ All created_at columns are TIMESTAMPTZ
□ Foreign keys exist
□ npm run build + typecheck pass

### Sprint 2 Pipeline (only after S1 done)
READ MASTER_ROADMAP.md lines 502-617 for full details.

### Sprint 3 Pipeline (only after S2 done)
READ MASTER_ROADMAP.md lines 618-712 for full details.

### Sprint 4 Pipeline (only after S3 done)
READ MASTER_ROADMAP.md lines 714-808 for full details.

### Sprint 5-8
Continue sequentially per MASTER_ROADMAP.md.

## 6. RESOURCES
- Full roadmap: MASTER_ROADMAP.md (1055 lines, single source of truth)
- Sprint report template: see MASTER_ROADMAP.md "Sprint report template" section
- Project memory: .opencode/memory/ (created after each sprint)
- Server logs: [seed] prints at startup, use for debugging
- GitHub: Not configured yet — no commits without explicit instruction

## 7. START

Begin with Sprint 1. Read MASTER_ROADMAP.md lines 376-500 for the full definition.
Execute each sub-task (1a → 1b → 1c → 1d) in order.
After each sub-task: verify the change compiles.
After all sub-tasks: run full verification checklist.
Report completion with file changes and test results.
