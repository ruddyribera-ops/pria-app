# PRIA v10 — Production Readiness Assessment & Roadmap

**Date:** 2026-05-30
**Status:** Assessment Complete — Roadmap In Progress
**Files Assessed:** ~45 across frontend, backend, migrations, prompts, schemas

---

## 1. Confirmed Bugs (Must Fix Before Production)

### P0 — Crash-Level

| # | Bug | File | Cause | Fix |
|---|-----|------|-------|-----|
| B1 | `diagnosticos.map is not a function` | `src/api/diagnosticos.ts` | Wrong `response.data.data` unwrapping | ✅ Fixed + committed (`5be01a9`) |
| B2 | `materials.map is not a function` (same pattern) | `src/api/materials.ts` | Wrong `response.data.data` unwrapping | ✅ Fixed + committed (`1b99f2b`) |
| B3 | Admin `/users/` 404 | `src/api/users.ts` vs `server/src/routes/admin.ts` | Frontend calls `GET /users/`, backend only has `GET /admin/users` | Add `/users/` route or change frontend |
| B4 | Admin `/blocks/` 404 | `src/api/blocks.ts` | Full CRUD frontend but **zero** backend routes | Implement backend route or remove frontend |
| B5 | Admin `/admin/cache/stats` 404 | `AdminCachePanel` vs `server/src/routes/admin.ts` | Frontend expects stats endpoint that doesn't exist | Implement or remove panel |
| B6 | Motor URL malformed: `/api/motores/pdc/:0` | `useMotorGenerator` / backend routing | `req.params.id` undefined → Express treats `:0` as literal param | Fix null check in motor route or frontend |

### P1 — Functional Issues

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| F1 | Mock mode always active for motors | `server/src/routes/motores.ts` | No real AI generation ever runs server-side |
| F2 | 12 motors but 3 not implemented (tutor, recalibrate, micro) | `server/src/routes/motores.ts` | Calling these throws 500 "not implemented" |
| F3 | `callMinimax` fallback: `POST /ai/generate` never implemented | `server/src/routes/` | Generic AI calls will 404 |
| F4 | Streaming noted as TODO — polling only | `minimaxClient.ts` comment | No real SSE, UI uses polling instead |
| F5 | OCR runs client-side, no progress indicator | `documentIngester.ts` + `ocrWorker.ts` | 145-page PDF = ~15 min with no feedback |
| F6 | CORS origins hardcoded to localhost | `server/src/index.ts` | Can't deploy to production without config change |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (Vite + React + TypeScript)                       │
│  localhost:5173                                             │
├─────────────────────────────────────────────────────────────┤
│  Pages                                                      │
│  ├── MaterialesPage    — upload PDF, trigger motors        │
│  ├── SlideGeneratorPage — multi-phase AI (frontend-only)   │
│  ├── SemanalPage       — multi-phase AI (frontend-only)    │
│  ├── TrimestralPage    — multi-phase AI (frontend-only)    │
│  ├── DiarioPage        — multi-phase AI (frontend-only)   │
│  ├── HistoryPage       — motor result viewer               │
│  ├── DiagnosticosPage   — diagnostic upload/list           │
│  └── AdminPage          — users / cache / archivos / bloques │
│                                                             │
│  AI Layer                                                   │
│  ├── minimaxClient.ts  → POST /motores/{type}/ (backend)    │
│  ├── promptRunner.ts  → mode: FULL_AI | MOCK | SKIP       │
│  └── multiPhaseContent.ts → frontend multi-phase pipeline  │
│                                                             │
│  Ingest Pipeline                                            │
│  └── documentIngester → pdfExtractor (pdf.js) → OCR        │
│      (Tesseract.js, browser) → extractCurriculumWithAI()  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND (Express + TypeScript)                             │
│  localhost:3000                                             │
├─────────────────────────────────────────────────────────────┤
│  Routes                                                     │
│  ├── /motores/{type}/  — 12 motors, Zod validation        │
│  ├── /materials/       — list + upload                     │
│  ├── /diagnosticos/    — list + upload                     │
│  ├── /curriculums/     — CRUD                              │
│  ├── /schedule/        — weekly schedule                    │
│  └── /admin/          — users, estado-sistema, reset-day  │
│                                                             │
│  DB                                                         │
│  └── PostgreSQL (Docker: pria-pg)                           │
│      tables: users, materials, curriculums,                 │
│              motor_results, diagnosticos, schedule          │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Test Status

| Suite | Result |
|-------|--------|
| Unit tests | 127/127 ✅ |
| E2E tests | 11/11 ✅ |
| Build | 0 errors ✅ |
| TypeScript | 0 errors ✅ |

> **Note:** Tests pass with the B1/B2 fixes applied. B3–B6 are pre-existing runtime bugs not covered by current test suite.

---

## 4. File Inventory

### Frontend API Layer
| File | Status | Notes |
|------|--------|-------|
| `src/api/client.ts` | ✅ OK | Axios instance, auth interceptor |
| `src/api/auth.ts` | ✅ OK | login, logout, profile |
| `src/api/motores.ts` | ✅ OK | 8 motors, 3 throw "not implemented" |
| `src/api/materials.ts` | ✅ Fixed | B1 — fixed `response.data.data` |
| `src/api/diagnosticos.ts` | ✅ Fixed | B2 — fixed `response.data.data` |
| `src/api/blocks.ts` | ⚠️ Orphan | Full CRUD, no backend route |
| `src/api/users.ts` | ⚠️ Path mismatch | B3 — calls `/users/`, backend `/admin/users` |
| `src/api/schedule.ts` | ✅ OK | Weekly schedule CRUD |

### Frontend Pages
| File | LOC | Status |
|------|-----|--------|
| `MaterialesPage.tsx` | ~500 | ✅ OK |
| `SlideGeneratorPage.tsx` | large | ✅ OK |
| `SemanalPage.tsx` | large | ✅ OK |
| `TrimestralPage.tsx` | large | ✅ OK |
| `DiarioPage.tsx` | large | ✅ OK |
| `HistoryPage.tsx` | medium | ✅ OK |
| `DiagnosticosPage.tsx` | large | ✅ OK |
| `AdminPage.tsx` | large | ✅ OK |

### Frontend Hooks
| Hook | Status |
|------|--------|
| `useMotorGenerator` | ✅ OK |
| `useMotorGeneration` | ✅ OK |
| `useMotorHistory` | ✅ OK |
| `useMultiPhaseGeneration` | ✅ OK |
| `useAdmin` | ✅ OK |
| `useMaterials` | ✅ OK |
| `useCurriculum` | ✅ OK |

### Backend Routes
| Route | Status |
|-------|--------|
| `routes/motores.ts` | ✅ Full, 12 motors, Zod schemas |
| `routes/admin.ts` | ⚠️ Incomplete — missing `/cache/stats`, wrong `/users/` path |
| `routes/materials.ts` | ✅ OK |
| `routes/diagnosticos.ts` | ✅ OK |
| `routes/curriculums.ts` | ✅ OK |
| `routes/schedule.ts` | ✅ OK |

### Backend Schemas (Zod)
All 11 schemas present: `alpha2`, `synthesis`, `abp`, `assessment`, `plan`, `slides`, `ficha`, `quiz`, `tutor`, `pdc`, `recalibrate`, `micro`

### Motor Prompts
11 prompt files: `Motor_M0a` through `Motor_M2c` (`.md`)

---

## 5. Production Roadmap

### Phase 1 — Crash Fixes (1–2 days)

1. **Fix B3:** Add `GET /users/` route to `server/src/routes/admin.ts` (or change frontend)
2. **Fix B4:** Either implement `server/src/routes/blocks.ts` or remove `blocks.ts` frontend + `AdminBloquesPanel`
3. **Fix B5:** Either implement `/admin/cache/stats` or remove `AdminCachePanel`
4. **Fix B6:** Fix motor route to handle undefined `materialId`/`curriculumId`

### Phase 2 — Core Hardening (3–5 days)

1. **Fix F1:** Implement real MiniMax API calls (currently `USE_MOCK=true` always)
2. **Fix F3:** Implement `POST /ai/generate` generic endpoint
3. **Fix F6:** Make CORS origins configurable via env var
4. **Add B3–B6 tests:** Write unit tests covering the previously untested crash bugs
5. **Fix F4:** Implement SSE streaming in backend (or formally document polling-only)

### Phase 3 — UX & Reliability (1–2 weeks)

1. **Fix F5:** Add OCR progress indicator + Web Worker to prevent UI blocking
2. **Add offline mode:** Cache motor results in IndexedDB
3. **Add retry logic:** `promptRunner.ts` has `SKIP` mode — make it a real retry
4. **Improve error messages:** Motor errors should be user-friendly, not raw Zod failures
5. **Add audit log:** Track who ran which motor with what params

### Phase 4 — Feature Gaps (2–4 weeks)

1. **Implement 3 missing motors:** `tutor`, `recalibrate`, `micro` (currently throw 500)
2. **Blocks management UI + backend:** The `AdminBloquesPanel` has a full UI with tabs, pagination, search — but no backend
3. **Scheduling improvements:** Add drag-drop, conflict detection, export to PDF
4. **Multi-language support:** i18n for all UI strings
5. **Dark mode:** Per-user theme preference

### Phase 5 — Scale & Observability (ongoing)

1. **Add structured logging:** Replace `console.log` with Pino.js or similar
2. **Add metrics:** Request latency per motor, error rates, usage per user
3. **Add rate limiting:** Protect MiniMax API from runaway loops
4. **Add caching layer:** Redis for curriculum/motor results (currently PostgreSQL only)
5. **Database migrations:** Add proper migration runner with rollback support
6. **CI/CD pipeline:** GitHub Actions → Railway auto-deploy with smoke tests

---

## 6. Open Questions

| # | Question | Owner | Priority |
|---|----------|-------|----------|
| Q1 | Should `blocks` be a full CRUD module or removed? | Ruddy | High |
| Q2 | What is the intended behavior of the 3 unimplemented motors (tutor, recalibrate, micro)? | Ruddy | High |
| Q3 | Is `USE_MOCK=true` intentional for all environments, or was production supposed to have real AI? | Ruddy | High |
| Q4 | Should the generic `/ai/generate` endpoint exist, or should all AI go through motors? | Ruddy | Medium |
| Q5 | What is the target deployment environment? (Railway, VPS, dedicated server?) | Ruddy | Medium |

---

## 7. Quick Wins Summary

| Action | Effort | Impact |
|--------|--------|--------|
| Fix `USE_MOCK=true` → `USE_MOCK=false` | 1 line | Real AI generation |
| Make CORS env-configurable | 1 line | Can deploy anywhere |
| Fix motor URL `:0` bug | 1 null check | Motors work without material context |
| Implement `/users/` route | 5 lines | Admin user management works |
| Add B3–B6 unit tests | ~2 hours | These bugs never regress again |
| Remove orphan `blocks.ts` frontend | 0 effort | Cleaner codebase |

---

## 8. Research Notes (Pending)

> TODO: Research these before Phase 3
- Similar open-source: AI-powered curriculum generation tools on GitHub
- PDF → structured data pipelines (已有 pdfExtractor + OCR)
- Express + SSE streaming best practices for MiniMax API passthrough
- Educational content generation benchmarks/standards
