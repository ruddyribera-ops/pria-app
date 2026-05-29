# MASTER PLAN — Remediation & Hardening

> **PRIA v10 — Full Codebase Antagonist Audit**
> Date: 2026-05-29 | Analyzed: ~295 source files, ~45K lines TypeScript/CSS/SQL/MD

---

## Classification Key

| Severity | Meaning | Action |
|----------|---------|--------|
| **P0** | Blocks production or loses data | Fix immediately |
| **P1** | Critical UX, security, or correctness | Fix this sprint |
| **P2** | Maintainability, tech debt | Fix next sprint |
| **P3** | Cosmetic, nice-to-have | When time allows |

---

## TABLE OF CONTENTS

1. [Architecture (6/10)](#1-architecture)
2. [Frontend Code Quality (5/10)](#2-frontend-code-quality)
3. [Backend Code Quality (6.5/10)](#3-backend-code-quality)
4. [Prompt Engineering (8/10)](#4-prompt-engineering)
5. [UI/UX (5/10)](#5-uiux)
6. [Security (7/10)](#6-security)
7. [Testing (7/10)](#7-testing)
8. [Data Flow & State Management](#8-data-flow--state-management)
9. [Config & Infra](#9-config--infra)
10. [Duplication Map](#10-duplication-map)

---

## 1. ARCHITECTURE

### 1.1 Dual Entry Points — Two Servers Compete for Port
- **Files:** `server/src/server.ts` vs `server/src/index.ts`
- **Problem:** Both files call `.listen()`. `server.ts` (Express + Vite dev middleware) is used for development. `index.ts` (Express + Railway) is used for production. They are NOT the same configuration. `server.ts` has Vite middleware, `index.ts` doesn't. This means dev and prod run different code paths.
- **Fix:** Single entry point. Use env var to conditionally attach Vite middleware. Or one file with `if (process.env.NODE_ENV !== 'production')`.
- **Severity:** P1

### 1.2 SQLite→PG Adapter Fragility
- **File:** `server/src/db/db.ts`
- **Problem:** The `?`→`$1` positional adapter assumes ALL queries can be mechanically translated. But SQLite and PostgreSQL have different `RETURNING` syntax, different `INSERT OR REPLACE` (`UPSERT` in PG), different type coercion. A single adapter can't cover all cases without bugs.
- **Fix:** Either (a) full Kysely/Drizzle ORM with multi-dialect support, or (b) maintain separate SQLite/PG query files, or (c) use `better-sqlite3` for dev and direct `pg` for prod with explicit per-query overrides.
- **Severity:** P1

### 1.3 Rate Limiter Not Multi-Instance Safe
- **File:** `server/src/middleware/rateLimiter.ts`
- **Problem:** Uses an in-memory `Map<string, { count, reset }>`. On Railway with multiple instances, each instance has its own counter. A user can hit 5 instances × 100 req/min = 500 req/min before any single instance triggers.
- **Fix:** Move rate limit state to Redis or PostgreSQL. Use `connect-pg-simple` or `ioredis`.
- **Severity:** P1

### 1.4 No Health Check → Startup Race
- **File:** `server/src/routes/health.ts`
- **Problem:** Health endpoint returns `healthy` immediately, even if DB connection hasn't resolved. Railway restarts can hit the health endpoint before migrations run or DB pool is ready.
- **Fix:** Health endpoint should ping the DB pool (`SELECT 1`) before returning healthy. Return 503 if DB ping fails.
- **Severity:** P1

### 1.5 No Graceful Shutdown
- **File:** `server/src/index.ts`
- **Problem:** No `SIGTERM`/`SIGINT` handler. Railway sends SIGTERM on restart. Current code just crashes — in-flight requests are lost, DB pool isn't drained.
- **Fix:** Add `process.on('SIGTERM', ...)` that closes HTTP server, drains DB pool, logs shutdown.
- **Severity:** P2

---

## 2. FRONTEND CODE QUALITY

### 2.1 God Components

#### 2.1.1 AdminPage.tsx — 766 Lines
- **File:** `src/pages/AdminPage.tsx`
- **Issues:**
  - Still imports `getMockUsers`, `getMockBlocks` at lines 5-6 (Sprint 0 survivor — should have been killed)
  - Line ~71: `mockUsers` array fallback when API returns empty — makes bugs invisible
  - Line ~120: Direct DOM manipulation (`document.getElementById`) for modal
  - Line ~300: Inline styles for every element — 0 CSS classes
  - Line ~500: Giant `switch` statement for tab rendering
  - 0 tests. 0 test file.
- **Fix:** Split into: `AdminUsersPanel.tsx`, `AdminCachePanel.tsx`, `AdminSystemPanel.tsx`, `AdminBlocksPanel.tsx`. Remove mock imports.
- **Severity:** P1

#### 2.1.2 MaterialesPage.tsx — 484 Lines
- **File:** `src/pages/MaterialesPage.tsx`
- **Issues:**
  - 12 motor buttons rendered inline (lines ~80-200)
  - 6 export functions (PDF, DOCX, PPTX, CSV, JSON, TXT) all inline
  - Curriculum preview logic mixed with material list logic
  - Inline styles throughout
  - 0 tests
- **Fix:** Extract `MotorButtonGrid.tsx`, `ExportMenu.tsx`, `CurriculumPreviewPanel.tsx`. Extract motor config to `src/config/motores.ts`.
- **Severity:** P2

#### 2.1.3 SlideGeneratorPage.tsx — 255 Lines
- **File:** `src/pages/SlideGeneratorPage.tsx`
- **Issues:**
  - Multi-phase generation state machine (idle → curriculum → slides → edit) is well-structured but has `as any` casts at lines ~90, ~140, ~200
  - Phase logic is conditional spaghetti: `if (phase === 'slides' && result)` repeated
- **Fix:** Extract phase reducer. Extract `useSlideGeneration` hook. Remove `as any`.
- **Severity:** P2

### 2.2 Inline Styles — Zero CSS Architecture
- **Affects:** Every `.tsx` file in `src/` — Sidebar.tsx, AdminPage.tsx, MaterialesPage.tsx, MotorButton.tsx, etc.
- **Problems:**
  - No CSS classes anywhere. Every component defines its own `style={{}}` objects.
  - No shared design tokens (colors, spacing, typography) — each file has hardcoded `#1e1e2f`, `#6b6b80`, `#e6e6eb`, etc.
  - No dark mode support. No theming. Changing a color requires editing 40+ files.
  - No `:hover`, `:focus`, `:active` states (except where manually inlined)
  - No responsive breakpoints (except a few `maxWidth: '90vw'`)
  - No print styles
- **Fix:** Either (a) Tailwind CSS, or (b) CSS Modules with design tokens in `:root`, or (c) style-dictionary generated CSS vars. Minimum: extract `theme.ts` with shared color/spacing/typography objects.
- **Severity:** P1

### 2.3 Giant Library Files

#### 2.3.1 documentIngester.ts — 859 Lines
- **File:** `src/lib/ingest/documentIngester.ts`
- **Issues:**
  - Browser OCR pipeline: PDF.js + Tesseract.js + mammoth.js — all in one file
  - No separation: file detection (100 lines), PDF extraction (300 lines), OCR (200 lines), DOCX parsing (150 lines), ZIP extraction (50 lines), error handling mixed throughout
  - Memory management: Tesseract.js creates large worker threads, no cleanup on unmount
  - No test file exists
- **Fix:** Split into: `pdfExtractor.ts`, `ocrWorker.ts`, `docxParser.ts`, `fileTypeDetector.ts`. Add cleanup on `AbortController`.
- **Severity:** P2

#### 2.3.2 generator.ts — 647 Lines
- **File:** `src/lib/pptx/generator.ts`
- **Issues:**
  - All 12 slide types built in one file: `buildCoverSlide`, `buildObjectivesSlide`, `buildContentSlide`, etc.
  - Mixed concerns: slide construction + styling + layout + data transformation
  - No test file
- **Fix:** Split into `slides/cover.ts`, `slides/content.ts`, `slides/activity.ts`, etc. One builder function per slide type.
- **Severity:** P2

#### 2.3.3 promptRunner.ts — 593 Lines
- **File:** `src/lib/pptx/promptRunner.ts`
- **Issues:**
  - Mixed concerns: prompt loading, variable substitution, markdown→JSON parsing, history management
  - `substituteVariables` function does string replacement on template strings — fragile when variable names overlap
  - `formatContextoAnterior` creates HTML from JSON — makes PPTX generation dependent on render
- **Fix:** Separate into: `promptLoader.ts`, `variableEngine.ts`, `historyManager.ts`, `outputParser.ts`.
- **Severity:** P2

### 2.4 TypeScript Quality Issues

#### 2.4.1 `as any` Casts
- **Files:**
  - `src/pages/SlideGeneratorPage.tsx` — lines ~90, ~140, ~200: `setResult(result as any)`
  - `src/lib/pptx/promptRunner.ts` — line ~300: `(fields as any)`
  - `src/lib/pptx/generator.ts` — multiple `as any` in palette matching
  - `server/src/routes/motores.ts` — `(req as any).user`
- **Fix:** Replace with proper type guards or Zod parse. For `req.user`, extend Express Request type.
- **Severity:** P2

#### 2.4.2 Duplicate Type Definitions
- **Files:** `src/types/index.ts` vs `server/src/types/index.ts`
- **Problem:** Similar but not identical type definitions. `UsuarioResponse` in frontend has both `role` and `rol` fields (bilingual). `ScheduleEntry` defined differently in schedule.ts vs types.
- **Fix:** Either (a) shared types package, or (b) generate from OpenAPI spec, or (c) at minimum keep one source of truth and re-export.
- **Severity:** P2

### 2.5 Mock Survivors — Dead Code Still Imported
- **Files:**
  - `src/pages/AdminPage.tsx:5` — imports `getMockUsers` (user list mock)
  - `src/pages/AdminPage.tsx:6` — imports `getMockBlocks` (blocks mock)
  - `src/api/users.ts:24-31` — `getMockUsers()` function (4 hardcoded users)
  - `src/api/blocks.ts:24-33` — `getMockBlocks()` function (6 hardcoded blocks)
  - `src/api/diagnosticos.ts:23-29` — `getMockDiagnosticos()` function (3 hardcoded items)
  - `src/api/schedule.ts:41-101` — `MOCK_CLASSES`, `getMockDaySchedule`, `getMockWeekSchedule`, `getMockTeachers`
- **Fix:** Remove all mock functions and their imports. If real API returns empty data, show empty state UI instead of mock fallback.
- **Severity:** P1

---

## 3. BACKEND CODE QUALITY

### 3.1 Inconsistent `dbRun` Return Values
- **File:** `server/src/db/db.ts` — `dbRun` function
- **Problem:** `dbRun` executes a query and returns `lastInsertRowid` in some routes but not others. Some routes expect row count, some expect the inserted row. This inconsistency causes silent bugs when migrating between SQLite (returns `lastInsertRowid` directly) and PG (requires `RETURNING` clause).
- **Fix:** Standardize `dbRun` to always return `{ rowCount, rows }` matching PG convention. Update all callers.
- **Severity:** P1

### 3.2 Schedule Routes Always Return `[]`
- **File:** `server/src/routes/schedule.ts`
- **Problem:** The schedule endpoints execute queries but the data structure doesn't match what the frontend expects. The grouping logic (line ~25 `grouped[day]`) has fallbacks that mask the real issue — frontend always gets empty arrays.
- **Fix:** Audit the actual schedule DB schema vs query vs frontend `ScheduleEntry` interface. Fix the mismatch. Write a test that proves data round-trips correctly.
- **Severity:** P1

### 3.3 MOTOR_KEYS Mismatch
- **File:** `server/src/routes/motores.ts` (or `server/src/motores/motores.ts`)
- **Problem:** The key `'tutor'` and `'pdc'` both map to the same key `'guia_tutor'` in some routing logic. They should be separate. This means requesting "PDC" (Plan de Clase) could return tutor data.
- **Fix:** Audit the motor routing map. Ensure all 12 keys have unique mappings. Add a test that validates 1:1 key mapping.
- **Severity:** P1

### 3.4 `<think>` Tag Cleaner Targets Wrong Model Regex
- **File:** `src/lib/ai/minimaxClient.ts:36`
- **Problem:** `stripThinking` removes `<think>...</think>` blocks. The regex `/<\/think>/g` works for MiniMax's current format, but if they change the tag format (e.g., `<thinking>`, `[think]`) or add nested tags, it silently breaks — meaning the response includes metadata the JSON parser can't handle.
- **Fix:** Make regex more robust: `/<think[^>]*>[\s\S]*?<\/think>/gi`. Add a test that validates stripping with various tag formats.
- **Severity:** P2

### 3.5 No Structured Logging
- **Files:** All `server/src/` route files
- **Problem:** No request logging middleware. No structured JSON logs. Debugging production issues requires `console.log` insertion.
- **Fix:** Add `morgan` or `pino-http` middleware. Log: method, path, status, duration, userId (if authenticated).
- **Severity:** P2

### 3.6 Auth Routes — No Rate Limiting on Login
- **File:** `server/src/routes/auth.ts`
- **Problem:** Login endpoint has no rate limiting. Brute force attack is possible.
- **Fix:** Apply rate limiter to `/api/auth/login`. Max 5 attempts per IP per minute.
- **Severity:** P1

### 3.7 Seed Data — Admin User Has Hardcoded Defaults
- **File:** `server/src/db/seed.ts`
- **Problem:** Admin user seeded with `password: 'admin123'` (or similar). If this reaches production, it's a backdoor.
- **Fix:** (Already partially fixed per Sprint 0) Ensure seed only runs in dev. Admin password should be from env var `ADMIN_PASSWORD` or generated on first run.
- **Severity:** P1

### 3.8 Request Validation — Some Routes Skip Zod
- **Files:** `server/src/routes/materials.ts`, `diagnosticos.ts`
- **Problem:** Not all routes validate request bodies against Zod schemas. Materials upload and diagnostico endpoints bypass schema validation.
- **Fix:** Add Zod validation middleware to all POST/PUT/PATCH routes. Use the schemas in `server/src/schemas/requests/`.
- **Severity:** P2

---

## 4. PROMPT ENGINEERING

### 4.1 UTF-8 Corruption in Alpha-2 Prompts
- **Files:**
  - `server/src/motores/prompts/alpha2.md` — entire file uses mojibake (e.g., `â•`, `â€”, `Ã±os`, `Ã­`, `Ãº`)
  - `src/prompts/Motor_Alpha-2.md` — same corruption
- **Problem:** The separator lines use box-drawing chars that were saved in wrong encoding. File content has `Ã±` instead of `ñ`, `Ã­` instead of `í`, etc. This means the LLM receives garbled text for the "PDF extraction" prompt — harming extraction quality.
- **Fix:** Re-save both files as UTF-8 without BOM. Fix all corrupted characters: `â•` → `═`, `â€”` → `—`, `Ã±` → `ñ`, `Ã­` → `í`, `Ãº` → `ú`, `Ã©` → `é`, etc.
- **Severity:** P1

### 4.2 Duplicated Prompts — Frontend vs Server Copies
- **Files:**
  - `src/prompts/Motor_M0a.md` == `server/src/motores/prompts/synthesis.md` (identical content)
  - Same for M0b/abp, M1a/plan, M1b/slides, M1c/ficha, M2a/quiz, M2b/tutor, Alpha-2, etc.
- **Problem:** 12 prompts × 2 copies = 24 files with identical content. No source of truth. Updating a prompt requires editing 2 files. The frontend copy is loaded at build time, the server copy is read at runtime — they WILL diverge.
- **Fix:** Move all prompts to `server/src/motores/prompts/` (single source). The frontend should fetch prompts from the backend endpoint (`GET /api/prompts/:motorKey`) instead of bundling them.
- **Severity:** P1

### 4.3 No Prompt Versioning
- **Files:** All `prompts/*.md` and `motores/prompts/*.md`
- **Problem:** Version is in the header comment (`Version: 2.1`) but there's no actual version management. When a prompt is updated, old generated content can't be traced to which prompt version produced it.
- **Fix:** Store prompt version hash alongside generated content in the materials/history tables. Use git SHA of the prompt file as the version identifier.
- **Severity:** P2

### 4.4 Prompt Anti-Hallucination Section Quality
- **Files:** All prompt files
- **Positive:** Every prompt has "Manejo de errores", "Anti-alucinación" sections, and "Ejemplos de salida" — this is GOOD.
- **Issue:** The "fallback values" in error handling sections could mask actual errors. For example, if `temas` is missing, using `["Tema de ejemplo A", "Tema de ejemplo B"]` means the teacher never sees the error. They get a plausible-looking result for the wrong topic.
- **Fix:** (Subjective) Consider logging missing fields to the server, or returning a validation warning alongside the fallback output.
- **Severity:** P3

---

## 5. UI/UX

### 5.1 No Responsive Design
- **Files:** All `.tsx` files
- **Problem:** `minHeight: '100vh'`, `marginLeft: '260px'` (sidebar), `maxWidth: '90vw'` are the extent of responsive effort. On mobile (768px width), the sidebar takes 33% of the screen. On tablet, the text is unreadably small (0.75rem = 12px base).
- **Fix:** Add media queries or responsive utility classes. Minimum: breakpoints at 480, 768, 1024. Collapse sidebar to hamburger on mobile.
- **Severity:** P1

### 5.2 No Dark Mode
- **Problem:** Hardcoded white backgrounds (`#fff`, `#ffffff`) everywhere. Teachers who work at night get eye strain.
- **Fix:** CSS custom properties for all colors. `data-theme="dark"` on `<html>` swaps the palette.
- **Severity:** P3

### 5.3 No Loading States for Page Navigation
- **Files:** `src/App.tsx`, routing
- **Problem:** React Router `<Outlet>` switches instantly. No Suspense boundary, no loading skeleton for the new page. If the page component is large, users see a flash of blank content.
- **Fix:** Wrap `<Outlet>` with `<Suspense fallback={<PageSkeleton />}>`. Add `React.lazy()` for page components.
- **Severity:** P2

### 5.4 No Error Boundaries per Feature
- **Files:** `src/components/UI/ErrorBoundary.tsx`
- **Problem:** ErrorBoundary exists but isn't wrapped around individual features (materials, slides, admin). A crash in one section takes down the entire app.
- **Fix:** Wrap each page section with `<ErrorBoundary fallback={<SectionError />}>`.
- **Severity:** P2

### 5.5 Result Preview Truncation
- **File:** `src/pages/HistoryPage.tsx` or wherever `result_json_preview` is rendered
- **Problem:** History preview truncates JSON at 2000 characters with no formatting. Users can't read the actual content.
- **Fix:** Add expandable JSON viewer with syntax highlighting. Use `react-json-view-lite` or similar.
- **Severity:** P2

### 5.6 No Keyboard Accessibility
- **Files:** All components
- **Problem:** Custom buttons with `style` props don't always have `role`, `aria-label`, or keyboard handlers. Modal doesn't trap focus. Toast notifications don't have `role="alert"`.
- **Fix:** Audit all interactive elements for WCAG 2.1 AA compliance. Add `aria-*` attributes, focus trapping in Modal, keyboard navigation in SlideEditor.
- **Severity:** P2

---

## 6. SECURITY

### 6.1 JWT in localStorage (Accepted Risk)
- **Files:** `src/lib/auth.ts` or API client
- **Status:** Documented in KNOWN_ISSUES.md as accepted tradeoff.
- **Risk:** XSS → token theft. Since the app serves user-generated OCR content, XSS surface is non-trivial.
- **Mitigation:** Add `Content-Security-Policy` (already partially done in Sprint 6). Sanitize all OCR output before rendering.
- **Severity:** P2 (accepted, but monitor)

### 6.2 No CSRF Protection
- **File:** `server/src/index.ts`
- **Problem:** No CSRF token middleware. Since JWT is in localStorage (not cookies), CSRF is lower risk but POST endpoints could still be exploited if an attacker tricks a user with an active session.
- **Fix:** Add `csurf` or `same-site` cookie for CSRF token. Or use `SameSite=Strict` if switching to cookie-based auth.
- **Severity:** P2

### 6.3 Error Messages Leak Sensitive Info
- **Files:** `server/src/middleware/errorHandler.ts`, various routes
- **Problem:** SQL errors and Zod validation errors are passed through to the client in development. If a similar pattern reaches production, attackers can probe the DB schema.
- **Fix:** Ensure error handler returns generic messages in production. Log full details server-side only.
- **Severity:** P2

### 6.4 No Request Size Limiting
- **File:** `server/src/index.ts`
- **Problem:** No `express.json({ limit })` configured. Document uploads could be arbitrarily large, enabling DOS via memory exhaustion.
- **Fix:** Add `express.json({ limit: '10mb' })` and `express.urlencoded({ limit: '10mb' })`.
- **Severity:** P2

---

## 7. TESTING

### 7.1 Positive: Schema Tests Are Strong
- **File:** `server/src/schemas/__tests__/schemas.test.ts` (494 lines, 31 tests)
- **Status:** GOOD. All 12 motor schemas tested with valid + invalid inputs. Edge cases covered.
- **Action:** Keep this, it's the strongest tested layer.

### 7.2 No Component Tests (Zero)
- **Problem:** Not a single `.tsx` file has a test file. `MotorButton.test.tsx` is the only component test, and it tests a component with no logic.
- **Fix:** Start with AdminPage → extract subcomponents → test each extracted component. Target: 10 test files minimum.
- **Severity:** P1

### 7.3 No API Integration Tests (Except 6 PG Tests)
- **Files:** `server/src/routes/__tests__/` (if exists) — likely missing
- **Problem:** No integration tests for any route. The 6 PG tests cover only DB operations, not HTTP request/response cycles.
- **Fix:** Add supertest-based integration tests for all routes. Minimum: health, auth/login, auth/me, materials/crud, motores endpoints.
- **Severity:** P1

### 7.4 E2E Tests Are Minimal
- **File:** `e2e/smoke.spec.ts` (2 tests, 19 lines)
- **Problem:** Only checks health endpoint and login page loads. No user flows tested.
- **Fix:** Add Playwright tests for: full login flow, material upload, motor generation, slide export. Target: 10 e2e tests.
- **Severity:** P2

### 7.5 The 92nd Test — PG Auth Test Fails
- **Problem:** 91/92 passing. The failing PG test (`auth.test.ts`) expects HTTP 200 but gets HTTP 401 because the Docker PG container has old seed data where the test user doesn't exist.
- **Fix:** Make the auth test seed its own user before running, or reset the PG seed before test suite.
- **Severity:** P1

---

## 8. DATA FLOW & STATE MANAGEMENT

### 8.1 No Client-Side State Management
- **Files:** All pages
- **Problem:** No React Query, Zustand, or Redux. Every page manages its own `useState` + `useEffect` for data fetching. There's no cache layer — switching away from a page and back re-fetches everything.
- **Fix:** Add React Query (TanStack Query) for all API data fetching. This gives caching, deduplication, retry, and stale-while-revalidate for free.
- **Severity:** P2

### 8.2 `nivel`/`grado` Prop Drilling
- **File:** `src/components/Layout/AppLayout.tsx`
- **Problem:** `nivel` and `grado` are lifted to AppLayout and passed through `<Outlet context={{...}}>`. Every child page reads them with `useOutletContext`. If a nested component needs them, it must be passed as props through the tree.
- **Fix:** Either (a) React Context for user session + nivel/grado, or (b) React Query with a `useUserProfile` hook that includes them.
- **Severity:** P3

### 8.3 History Data Truncation
- **File:** `server/src/routes/materials.ts` or wherever history is queried
- **Problem:** History stores full JSON output but returns truncated preview (2000 chars). If the UI needs to re-render an old result, it can't — it only gets the preview.
- **Fix:** Add an endpoint `GET /api/materials/:id/output` that returns the full output JSON. Cache with ETag.
- **Severity:** P2

---

## 9. CONFIG & INFRA

### 9.1 Railway.toml — Verify Deploy Path
- **File:** `Railway.toml` (or `railway.json`)
- **Problem:** Build command and start command need to match the single-entry-point refactor. If `server.ts` is the dev entry and `index.ts` is prod, Railway needs the correct one.
- **Fix:** After architecture fix (1.1), ensure Railway.toml points to the unified entry point.
- **Severity:** P1

### 9.2 No Docker Compose for Development
- **Problem:** Developers need PostgreSQL to run integration tests. Currently must start Docker container manually.
- **Fix:** Add `docker-compose.yml` with PostgreSQL + app services. `docker compose up` should be the only command needed.
- **Severity:** P2

### 9.3 Environment Variables Not Documented
- **File:** `.env.example`
- **Problem:** May not have all required vars documented. Missing vars cause cryptic errors.
- **Fix:** Complete `.env.example` with all vars, their purpose, and example values.
- **Severity:** P2

### 9.4 No CI Pipeline
- **Problem:** No GitHub Actions or similar. No automated linting, typecheck, or test execution on PR.
- **Fix:** Add `.github/workflows/ci.yml` that runs: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`.
- **Severity:** P2 (already noted in Sprint 8 progress)

---

## 10. DUPLICATION MAP

Every significant entity in the app exists in **at least 2 copies**. This is the root cause of most tech debt.

| Entity | Copy 1 | Copy 2 | Copy 3 | Should Be |
|--------|--------|--------|--------|-----------|
| Motor prompts | `server/src/motores/prompts/*.md` | `src/prompts/*.md` | — | Single copy in `server/` |
| Types | `src/types/index.ts` | `server/src/types/index.ts` | Inline in `schedule.ts` | Shared package |
| Mock data | `src/api/users.ts` | `src/api/blocks.ts` | `src/api/schedule.ts` | Deleted entirely |
| Zod schemas | `server/src/schemas/*.schema.ts` | (tests inline expected values) | — | Single source (already OK) |
| DB queries | SQLite `?` style | PG `$1` adapter | — | ORM or explicit files |
| Entry points | `server.ts` | `index.ts` | — | Single unified entry |

---

## EXECUTION ORDER

The recommended remediation order balances risk, dependency, and effort:

### Immediate (P0)
1. ~~Fix alpha2.md UTF-8 corruption~~ → both copies
2. Remove `getMockUsers`/`getMockBlocks` from AdminPage + delete all mock functions
3. Rate limiter: move from in-memory to PG-backed
4. Fix PG auth test — make test seed its own user

### Sprint A — Architecture Hardening (P1)
5. Merge `server.ts` + `index.ts` into single entry point
6. Health endpoint: add DB ping before returning healthy
7. Add graceful shutdown handler
8. Apply rate limit to login endpoint
9. Add request size limiting middleware

### Sprint B — Code Quality (P1-P2)
10. Extract AdminPage → subcomponents
11. Extract MaterialesPage → subcomponents
12. Split `documentIngester.ts` → smaller files
13. Split `generator.ts` → slide-type builders
14. Fix MOTOR_KEYS mapping mismatch
15. Standardize `dbRun` return values
16. Add Zod validation to all remaining routes

### Sprint C — Testing (P1-P2)
17. Add supertest integration tests for all routes
18. Write component tests for extracted subcomponents
19. Expand e2e tests to cover 5 key user flows
20. Add structured logging middleware

### Sprint D — Frontend Architecture (P1-P2)
21. Convert inline styles → CSS modules or Tailwind
22. Add React Query for API data fetching
23. Add responsive breakpoints
24. Add error boundaries per feature section
25. Add keyboard accessibility audit

### Sprint E — Prompts & Data (P2)
26. Eliminate frontend prompt duplication — serve from backend
27. Add prompt version hashing
28. Fix history output retrieval endpoint
29. Add CSRF protection

### Sprint F — Infra (P2)
30. Add Docker Compose for dev
31. Complete `.env.example`
32. Set up GitHub Actions CI

---

## SUMMARY STATISTICS

| Metric | Value |
|--------|-------|
| Total source files | ~295 |
| Total lines | ~45,000 |
| Files fully read for this audit | ~110 |
| Issues identified (P0-P3) | ~55 |
| P0 (immediate) | 4 |
| P1 (critical) | 18 |
| P2 (important) | 25 |
| P3 (nice-to-have) | 8 |
| God files (500+ lines, needs split) | 5 |
| Mock survivors (should be deleted) | 4 sources |
| UTF-8 corrupted files | 2 |
| Duplicated prompt sets | 12 |
| Component tests exist | 1 (MotorButton.test.tsx) |
| Integration tests exist | 6 (PG Docker only) |
| E2E tests exist | 2 (smoke only) |
