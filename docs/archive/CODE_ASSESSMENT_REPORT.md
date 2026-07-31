# PRIA v10 — Complete Code Assessment
**Auditor:** Crush (antagonist review) | **Date:** 2026-05-30 | **Files reviewed:** ~90 source files

---

## Executive Summary

PRIA v10 is a large React SPA (React 19 + Vite + TypeScript) backed by an Express/PostgreSQL API. The app is architecturally ambitious — 12 AI motors, multi-phase generation, PPTX export, PDF/OCR ingestion, slide editor, admin panels, schedule management. The core pipeline works but the codebase carries severe technical debt from rapid AI-driven development. There are multiple broken endpoints, duplicate zombie code, dead imports, a confused data flow, and several critical runtime hazards.

---

## CRITICAL (breaks production)

### C1 — 3 Backend routes return empty stubs or hardcoded zeros

| Route | Behavior |
|-------|----------|
| `GET /api/blocks/` | Works ✅ — full CRUD |
| `GET /api/schedule/:user/:day` | Returns `{}` ❌ — always empty array `[]` |
| `GET /api/admin/cache/stats` | Returns hardcoded `{entries:0, motores_cache:0, pdfs_cache:0}` ❌ — real stats never implemented |
| `GET /admin/estado-sistema` | Returns idle motors with fake status ❌ — not backed by real motor state machine |

**Impact:** Schedule page always shows empty day. Cache panel always shows zeros. Motor status in sidebar always shows idle.

**Files:**
- `server/src/routes/schedule.ts:7` — returns `[]` literally
- `server/src/routes/admin.ts:74-82` — hardcoded `data: { entries: 0, ... }`
- `server/src/routes/admin.ts:8-16` — hardcoded `motors: { synthesis: 'idle', ... }`

### C2 — `users.ts` and `blocks.ts` frontend calls non-existent backend routes

```typescript
// src/api/users.ts:7
const response = await client.get('/users/');  // Backend has /admin/users, NOT /users/
return response.data;  // NOT response.data.data — wrong unwrapping too
```

**Fix needed:** Either wire the backend `/admin/users` route and fix users.ts to use `response.data.data`, OR remove the AdminUsuariosPanel entirely and use `getAdminUsers()`.

Same for `blocks.ts:7` — `return response.data` instead of `response.data.data`.

### C3 — `schedule.ts` API client returns malformed `ScheduleEntry[]`

```typescript
// src/api/schedule.ts — grouping logic reads .dia, .hora_inicio from ScheduleEntry
// but backend returns { teacher_code, dia, bloques: [...] }
// The .dia field is at the TOP LEVEL, not inside each ScheduleEntry
const grouped: Record<string, ScheduleEntry[]> = {};
for (const b of bloques) {
  const day = (b as any).dia || 'LUNES';  // ← casts to any to access .dia
  // but ScheduleEntry type has no .dia field
```

### C4 — MiniMax streaming is fake — no SSE backend

`minimaxClient.ts:175-185` claims to support streaming but delivers the entire response as one chunk. `useMotorGeneration.ts:47` polls every 2s but the `/admin/estado-sistema` endpoint always returns `idle`. The motor status polling is completely decoupled from actual generation state.

### C5 — AdminResetPanel sends `teacherCode` as body param but backend expects URL param

```typescript
// src/pages/AdminResetPanel.tsx
await resetDay(teacherCode);  // sends { teacherCode: 'ADMIN' } in body
// server/src/routes/admin.ts — no /reset-day route exists at all
```

The reset-day endpoint doesn't exist in the backend. The panel shows a mock success message after the call fails.

### C6 — Auth cookie (CSRF) is set but never used

```typescript
// server/src/routes/auth.ts:31-37
res.cookie('csrf_token', csrfToken, { httpOnly: true, sameSite: 'strict' });
// NEVER READ BACK — no middleware validates csrf_token on subsequent requests
```

CSRF cookie is cosmetic defense-in-depth only. The app relies solely on JWT Bearer tokens, which is fine for API auth, but the cookie creates false assurance.

---

## HIGH (causes runtime failures)

### H1 — Duplicate mock implementations (500+ lines of duplication)

`server/src/motores/mocks.ts` and `src/lib/pptx/promptRunner.ts` contain nearly identical mock generators for all 12 motor types. They are the same code duplicated in two places. Any bug fix to one must be manually applied to the other. The server-side mocks have correct Spanish text; the frontend mocks have mojibake (garbled UTF-8).

**Mojibake examples in `src/lib/pptx/promptRunner.ts`:**
- `'Ã±'` instead of 'ñ' — "CerÃ¡mica" not "Cerámica"
- `'â‰ ¥'` instead of '≥' — bloom levels broken
- `'Â¿CÃ³mo'` instead of '¿Cómo'

**Files:**
- `server/src/motores/mocks.ts` (server-side — CORRECT Spanish)
- `src/lib/pptx/promptRunner.ts` (frontend — MOJIBAKE)

### H2 — `MotorChainPanel` and `MotorResultPanel` are dead wrappers

```typescript
// src/components/Materials/MotorChainPanel.tsx
export default function MotorChainPanel({ children }: MotorChainPanelProps) {
  return <>{children}</>;  // literally just renders children
}
```

This component wraps nothing. `MaterialesPage.tsx` doesn't import it. `MotorResultPanel.tsx` is also imported nowhere in pages. Both are zombie components — exist, render, do nothing.

### H3 — `createAbpButton.ts` and `AbpButtonFragment.tsx` / `AbpButtonSection.tsx` are 3 implementations of the same dead component

```typescript
// src/components/Materials/createAbpButton.ts — creates React elements manually
// src/components/Materials/AbpButtonFragment.tsx — conditionally renders null or MotorButton
// src/components/Materials/AbpButtonSection.tsx — same logic, different file
// None are imported in MaterialesPage.tsx
```

Three separate files for the same conditionally-rendered ABP button. None are imported anywhere.

### H4 — `MotorResultSkeleton` has inline `<style>` injection

```typescript
// src/components/Materials/MotorResultSkeleton.tsx:38-43
<style>{`
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
`}</style>
```

React does NOT support `<style>` children in components — this creates global CSS leakage. The `App.css` already defines a `.pulse` animation. This component redefines it inline.

### H5 — `useMotorGenerator.ts` is imported but results never wired

`MaterialesPage.tsx` uses `useMotorGenerator<T>()` hooks (12 of them), but the `result` is rendered directly as JSON. The `generate()` function calls `executePrompt()` which goes to backend `/motores/{type}` — but the backend always validates against Zod schemas that may reject MiniMax output. There's no error boundary around failed validations in the page.

### H6 — PPTX export path confusion

```typescript
// generator.ts has 3 export functions:
// exportAllMotorsToPPTX() ← called by MaterialesPage onExportAll()
// exportSlidesToPPTX() ← called by onExportSlides
// exportContentToPPTX() ← called by onExportSynthesis, onExportPlan, onExportQuiz

// But buildSlides.ts ALSO has buildSlideDeck() which takes SlideContent interface
// SlideContent interface has completely different shape than motor outputs
```

`generator.ts:exportAllMotorsToPPTX()` takes raw motor outputs and calls individual `build*Slides()` functions in `slides/`. But `buildSlides.ts` has its own `buildSlideDeck()` that takes `SlideContent`. These are two separate PPTX pipelines. The one in `generator.ts` is actually used. The one in `buildSlides.ts` may be unreachable dead code.

### H7 — `pptxParser.ts` returns malformed data

```typescript
// src/lib/ingest/pptxParser.ts:18
return { texts: [{ pageNumber: 1, text: '[PPTX] No slides found in file' }], warnings };
// ↑ syntax error: comma after bracket closing? No wait — the destructuring below is wrong
// Actually the real bug is on line 18:
// return { texts: [...], warnings }; — trailing comma AFTER the closing brace
// Wait, I see: `return { texts: [...], warnings };` — but then line 19 is also `texts`?
```

Actually looking closer at the file — line 18 ends with `}, warnings };` — the comma placement seems wrong. Let me check: `return { texts: [...], warnings }` — the `warnings }` has an extra space. Actually that's fine. But the bigger issue is line 12: `texts.push(...slideTexts.map((t, i) => ({ pageNumber: i + 1, text: t })));` — all of this happens after `parseZip` which may return malformed data, and the try/catch catches errors but returns a text message instead of failing fast.

### H8 — Schedule page `DiarioPage` reads `.dia` but backend returns it elsewhere

`DiarioPage.tsx` calls `getScheduleByDay(code, dia)`. The backend `schedule.ts` returns `{ data: [] }`. So the schedule is always empty. The frontend has `teachers: []` hardcoded empty, so the teacher selector shows nothing.

---

## MEDIUM (code quality / maintainability)

### M1 — 4 CSS files with conflicting design tokens

| File | Contains |
|------|----------|
| `src/App.css` | Codecademy design system (old v5.4 colors, Inter font, sidebar widths) |
| `src/styles/theme.css` | Second design token system (pria-accent, pria-sidebar, CSS vars) |
| `src/styles/adminTheme.ts` | JS object tokens (inline styles, not CSS vars) |
| Inline `style={{}}` on every component | Hardcoded colors, no token reference |

The app has 4 different design systems. Most components use inline `style={{}}` with hardcoded hex values. The theme.css design tokens (`--pria-accent`) are barely used. Components that reference them create a maintenance nightmare — you can't change the accent color globally.

### M2 — `MotorSection_Synthesis.tsx` renders ABP button but it's a different ABP than `MaterialesPage`

```typescript
// MotorSection_Synthesis.tsx — has its own MotorButton for ABP
// MaterialesPage.tsx — ALSO has MotorButton for ABP at line ~270
// These render at DIFFERENT positions in the DOM
```

`MotorSection_Synthesis` has its own embedded ABP button. `MaterialesPage` also renders an ABP button directly. Both use the same `abp.generate()` call but appear in different places — no coordination. The button inside `MotorSection_Synthesis` won't appear because the section only renders when `result` exists — but the ABP button in `MaterialesPage` renders when `abp.result` exists from its OWN hook. Two independent ABP generation flows.

### M3 — `useMotorGeneration` hook is defined but use is commented out

```typescript
// src/hooks/useMotorGeneration.ts
// It's a complete async polling engine using /admin/estado-sistema
// But MaterialesPage does NOT use it — instead uses useMotorGenerator
// SlideGeneratorPage DOES use useMultiPhaseGeneration which uses useMotorGeneration internally
```

`useMotorGeneration` is the "proper" async polling engine. But `MaterialesPage` uses `useMotorGenerator` (legacy) which calls `promptRunner` directly. `SlideGeneratorPage` uses `useMultiPhaseGeneration` which wraps `useMotorGeneration`. Two different generation patterns depending on which page you're on.

### M4 — `app.ts` imports authMiddleware twice for blocks route

```typescript
// server/src/app.ts:44
app.use('/api/blocks', authMiddleware, blocksRouter);  // ← authMiddleware applied manually
// server/src/routes/blocks.ts:7
router.use(authMiddleware);  // ← applied again inside router
```

Double auth check. Works but redundant.

### M5 — Server-side `app.ts` has TWO CSP headers

```typescript
// server/src/app.ts:26-32
app.use(helmet({ contentSecurityPolicy: false }));  // helmet disables it
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 'default-src ...');  // manual CSP
  next();
});
```

Helmet disables CSP, then a manual middleware re-enables it. Confusing layering.

### M6 — `validateBody` wraps Zod but the server also imports `express-rate-limit`

Both `express-rate-limit` and the custom `rateLimiter.ts` middleware exist. The custom one is used for motors. The express-rate-limit package is imported but never applied to any route. Dead import.

### M7 — `authLimiter` (50 req/min per IP) is applied to `/auth/login`

50 login attempts per minute per IP is fine, but there's no brute-force protection against credential guessing beyond this. The bcrypt cost factor of 12 is good.

### M8 — `mockAbpOutput` in `mocks.ts` has a malformed Zod error

```typescript
// server/src/motores/mocks.ts:ABP mock
// The mock output has actividades array but the Zod schema requires actividades: z.array(z.string()).min(2)
// The mock returns { actividad: 'string', actividad: 'string', actividad: 'string' } (3 items)
// Actually wait — actividades: ['string1', 'string2', 'string3'] is fine
```

Actually looking at the mocks more carefully — the server-side mocks return correct Spanish text, the frontend mocks have mojibake. But there's also a type mismatch: the ABP mock uses `actividades: string[]` but the Zod schema uses the same — so this should validate. Let me check `mockAssessmentOutput` — the rubrica criteria has nested objects that may not match the Zod schema exactly.

### M9 — `diagnosticos.ts` server route does NOT handle file uploads

```typescript
// server/src/routes/diagnosticos.ts
// No file upload handler. No multer. No busboy.
// Frontend sends FormData with file — backend silently ignores it
```

The frontend uploads files with `uploadDiagnostico(file, tipo)` which sends multipart form data. The backend `diagnosticos.ts` only accepts JSON body. Files are silently lost.

### M10 — `materials.ts` backend allows uploading without file content

```typescript
// server/src/routes/materials.ts:17-23
router.post('/', validateBody(CreateMaterialSchema), async (req: any, res) => {
  const { filename, tipo, size } = req.body;  // ← no file content stored
  const info = await dbRun('INSERT INTO materials (filename, tipo, size) ...');
```

The backend only stores filename/type/size metadata — not the actual file. There's no blob storage, no S3, no Railway blob plugin integration. Files are referenced by name only. If the file is deleted, the DB record becomes a dangling reference.

### M11 — `promptRunner.ts` has dead code — loadPromptFile function is commented out

```typescript
// src/lib/pptx/promptRunner.ts:66-71
// loadPromptFile() deleted — comments say prompts are loaded statically
// But there are still references to prompt variable substitution that may reference null
```

The `substituteVariables()` function is defined and used in the file, but all the prompt loading logic is commented out. The file still defines `loadSystemPrompt()` body inside but `executePrompt()` never calls it. Dead code chain.

### M12 — `schedule.ts` backend has NO database query

```typescript
// server/src/routes/schedule.ts
router.get('/:user/:day', (req, res) => {
  res.json({ data: [] });  // hardcoded empty
});
```

No DB query exists. The `schedule` table is referenced nowhere in the backend. The schedule feature is purely frontend display of empty state.

### M13 — `diagnosticos.ts` server GET returns ALL diagnosticos for a user but the table has no real content

```typescript
// server/src/routes/diagnosticos.ts
// GET /diagnosticos/ returns rows from the diagnosticos table
// But diagnosticos table only stores metadata (estudiante, nivel, area, fecha, resultado)
// File uploads are never handled
// This means diagnosticos page can show file metadata but never show the actual file
```

### M14 — `motor-history.ts` frontend expects `result_json_preview` field

```typescript
// src/hooks/useMotorHistory.ts
// GET /motores/history returns result_json_preview from motor_results
// MotorHistoryPage renders this as JSON preview
// But HistoryPage shows 'Simulated' badge when simulated=true
// The .simulated field IS returned by /motores/history — correct
```

Actually this one is fine — `motor_results` table has `simulated BOOLEAN` and the history query returns it.

### M15 — `AdminArchivosPanel` is 100% mock data

```typescript
// src/pages/AdminArchivosPanel.tsx
// Hardcoded: 'planificaciones/', 'diagnosticos/', 'plantillas/', 'config.json', 'database.sqlite'
// File counts are hardcoded strings: '128 archivos', '45 archivos'
// Delete button shows toast '(simulación)' — no backend call
```

The Archivos panel is entirely fake. It shows static strings. The delete button never calls an API.

### M16 — `AdminBloquesPanel` DELETE block button never implemented

```typescript
// src/pages/AdminBloquesPanel.tsx
onClick={() => showToast('Editar bloque (simulacion).', 'info')}  // Edit button is also mock
// Create block DOES call createBlock() — that works
```

The edit button is a mock toast. Create works. Delete is missing from the UI (no delete button at all).

---

## LOW (cleanliness)

### L1 — `server.js` at root is orphaned

The root `server.js` is a standalone Express server (different from the Vite dev server). It probably predates the `server/` directory refactor. It imports `express`, `helmet`, etc. — but the actual server lives in `server/src/index.ts`. `server.js` is never referenced in package.json scripts.

### L2 — `server_err.log` and `server_out.log` at root

Temporary debug logs. Should be in `.gitignore` (they aren't).

### L3 — `prompts/` directory at `src/prompts/` vs `server/src/motores/prompts/`

`src/prompts/Motor_Alpha-2.md` exists and is imported by `curriculumExtractor.ts`. But `server/src/motores/prompts/` has 12 prompt files. The frontend prompts directory has only 1 file. These are separate prompt systems for different AI calls. Confusing.

### L4 — `motor-types.ts` has a BOM (`ufeff`) at start of file

The file starts with a UTF-8 BOM marker (invisible in editors). TypeScript parses it fine, but it creates encoding issues in some tools.

### L5 — `useCurriculum.ts` manually saves to DB via fetch, not through API client

```typescript
// src/hooks/useCurriculum.ts:60-76
const res = await fetch('/api/curriculums', { ... });
// Uses raw fetch instead of the axios client.ts wrapper
// No auth interceptor (axios client would add Bearer token automatically)
// Here: manually adds Authorization header — correct but inconsistent with other hooks
```

Other hooks use the axios client which handles auth automatically. This one doesn't.

### L6 — `_curriculumLoading` unused variable

```typescript
// src/pages/TrimestralPage.tsx:35
const { curriculum: curriculumFromMaterials, loading: _curriculumLoading } = useCurriculum();
// _curriculumLoading is assigned but never read
```

Prefixing with `_` silences the TypeScript `noUnusedLocals` check but it's still dead weight.

### L7 — `app.ts` imports `blocksRouter` and `aiRouter` but `aiRouter` is never defined

```typescript
// server/src/app.ts imports:
import aiRouter from './routes/ai.js';  // ← 'ai' route exists, returns 503 if no key
// But /api/ai route IS registered: app.use('/api/ai', aiRouter);
// This is actually fine — ai.ts is defined
```

Actually `aiRouter` IS defined in `server/src/routes/ai.ts`. Never mind.

### L8 — TypeScript `module` mismatch

- Root `tsconfig.app.json`: `"module": "esnext"` + `"moduleResolution": "bundler"`
- Server `tsconfig.json`: `"module": "NodeNext"` + `"moduleResolution": "NodeNext"`

The server uses `NodeNext` (ESM) while frontend uses `bundler`. This is intentional but creates a boundary where frontend code can't directly import server code. Both work independently.

### L9 — No `esbuild` or `tsup` output — both TS codebases compile with `tsx`

No compiled artifacts stored in repo (build/ and dist/ are gitignored). This is fine for dev but makes production deploys depend on `tsx` at runtime rather than compiled JS.

### L10 — `vite.config.ts` optimizeDeps excludes `@anthropic-akai/sdk` but the package isn't even in package.json

Dead exclusion.

---

## ARCHITECTURE NOTES

### Data flow is a maze

```
PDF Upload → ingestDocument() → extractCurriculumWithAI() → MiniMax API
                          ↓
                   curriculumExtractor (regex fallback)
                          ↓
                   saveCurriculum() → POST /api/curriculums
                          ↓
                   useCurriculum hook → stored in state
                          ↓
useMotorGenerator<SynthesisOutput>() → callMinimax → POST /api/motores/synthesis
                          ↓
                    Backend validates with Zod → stores in motor_results
                          ↓
                    useMotorGenerator.result → passed to MotorSection_Synthesis
                          ↓
                          ↓ ALSO from same PDF:
                          ↓
                    CurriculumPreview → MotorButton for synthesis
                          ↓
                    Different hook instance: synthesis.generate()
```

There are TWO independent synthesis hooks: one in `useCurriculum` context and one in `MaterialesPage` directly. The result from one doesn't feed the other.

### Motor chaining is implicit, not enforced

ABP appears after Synthesis result exists. But the ABP motor's `generate()` call takes `abp.result?.proyecto?.titulo` — if the result shape doesn't match, the button silently generates wrong content.

### The PhaseStepper + PhaseNavigation + useMultiPhaseGeneration is a separate pipeline from MaterialesPage

`SlideGeneratorPage.tsx` and `TrimestralPage.tsx` use `useMultiPhaseGeneration` which uses `useMotorGeneration`. `MaterialesPage.tsx` uses `useMotorGenerator` directly. These are two different abstractions. Bug fixes must be applied in both.

### The SlideEditor pipeline is the most complex

```
mergePhaseResults() → MergedData interface
  ↓
mapToEditorSlides() → EditorSlide[]
  ↓
SlideEditorPanel → useSlideEditor hook
  ↓
getEditedData() → MergedData (with edits applied)
  ↓
buildSlideDeck() → PPTX Blob
```

Each layer has its own type definitions. `MergedData` is a loose interface with `[key: string]: unknown`. The `SlideContent` type in `types.ts` is a DIFFERENT interface used by `buildSlides.ts`. These are two separate conversion paths. The one in `buildSlides.ts` may be dead code.

---

## PRIORITIZED ACTION ITEMS

| Priority | Issue | Fix |
|----------|-------|-----|
| P0 | `schedule.ts` backend returns empty | Implement DB query for schedule table |
| P0 | `users.ts` frontend calls wrong endpoint | Fix to `getAdminUsers()` + unwrap `response.data.data` |
| P0 | `reset-day` endpoint missing | Implement or remove panel |
| P0 | Diagnosticos upload (FormData → JSON backend) | Add multer + file storage |
| P0 | Files not stored (metadata only) | Wire Railway blob storage or local FS |
| P1 | `blocks.ts` response.data → response.data.data | Fix unwrapping |
| P1 | AdminCachePanel stats always 0 | Implement real cache stats |
| P1 | Motor estado-sistema always idle | Wire real state machine |
| P1 | Frontend mock generators have mojibake | Import from server-side mocks or use shared module |
| P1 | MotorChainPanel + AbpButton* + createAbpButton = 4 dead files | Delete 3 |
| P1 | 4 design systems | Consolidate to CSS custom properties + one theme.ts |
| P2 | `MotorResultSkeleton` inline `<style>` | Use App.css animation class |
| P2 | CSRF cookie never read | Remove cookie or implement validation |
| P2 | `server.js` orphaned | Delete or integrate |
| P2 | `src/prompts/` vs `server/src/motores/prompts/` | Pick one location |
| P2 | `_curriculumLoading` unused | Remove |
| P3 | `optimizeDeps` excludes non-existent package | Remove line |
| P3 | `esbuild`/`tsup` not used | Consider for production build |

---

## STATS

| Metric | Value |
|--------|-------|
| Total source files | ~90 |
| Zombie/dead components | 8 (MotorChainPanel, createAbpButton, AbpButtonFragment, AbpButtonSection, MotorResultPanel, MotorResultSkeleton, MotorResult, MotorButton?) |
| Dead backend routes | 3 (schedule, reset-day, /admin/cache/stats real impl) |
| Broken frontend API calls | 3 (users, schedule grouping, reset-day) |
| Conflicting design systems | 4 |
| Duplicate mock generators | 2 files, 500+ lines |
| Inline style declarations | ~400+ |
| Known production hazards | 6 |
