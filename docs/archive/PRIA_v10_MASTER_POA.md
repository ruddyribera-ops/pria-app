# PRIA v10 — Master Plan of Action
## Production Readiness Sprint

**Goal:** Zero P0 issues, all P1 resolved, P2 documented for next sprint.
**Success criteria:** Railway deploy passes smoke test, E2E login→materiales→motor→export passes end-to-end.

---

## PHASE 0 — Survive Tonight (P0 — Production Breakers)

### P0-A: Schedule page returns empty forever
**Problem:** `server/src/routes/schedule.ts:7` returns `{}` literally. The schedule table (`bloques`) is populated but never queried.
**Fix:** Implement GET handler that queries `bloques` by teacher_code + dia.
```typescript
// server/src/routes/schedule.ts — replace stub with real query
router.get('/:teacherCode/:dia', authMiddleware, async (req, res) => {
  const rows = await dbAll(
    'SELECT * FROM bloques WHERE teacher_code=$1 AND dia=$2 ORDER BY hora_inicio',
    [req.params.teacherCode, req.params.dia]
  );
  res.json({ data: rows });
});
```
**Test:** `GET /api/schedule/ADMIN/LUNES` → 200 with array (may be empty initially)
**Verify:** `curl http://localhost:3000/api/schedule/ADMIN/LUNES -H "Authorization: Bearer $TOKEN"` returns 200.

---

### P0-B: Diagnosticos upload sends FormData, backend expects JSON
**Problem:** `src/api/diagnosticos.ts` sends `multipart/form-data`. `server/routes/diagnosticos.ts` reads `req.body` (JSON only). Files silently disappear.
**Fix:** Add `multer` to server, implement `uploadRouter` for file handling.
```
npm install multer --save
```
Create `server/src/routes/diagnosticos.upload.ts` with multer middleware, store files in Railway blob or local `uploads/` directory. Update DB schema to store file path.
**Backend path:** `server/src/routes/diagnosticos.ts` — add `import multer from 'multer'` + `upload.single('file')` middleware.
**Frontend path:** `src/api/diagnosticos.ts` — keep FormData, multipart/form-data is correct.
**Test:** Upload a test PDF via DiagnosticosPage, verify it appears in GET response.

---

### P0-C: Files not stored (only metadata saved)
**Problem:** `server/src/routes/materials.ts` saves `{filename, tipo, size}` but never stores the actual file blob. DB records are dangling references.
**Fix:** Add file storage. Simplest Railway-compatible: save to `uploads/` directory (Railway ephemeral FS) or use Railway Blob plugin. For MVP: store in `uploads/` and serve via static route.
```
server/src/uploads/  ← add to .gitignore
server/src/routes/materials.ts — multer upload + file path in DB
app.ts — app.use('/uploads', express.static('uploads'))
```
**Decision needed:** Ephemeral FS (file disappears on cold start) or Railway Blob (persistent)? Recommend: Railway Blob plugin or S3-compatible. Document the tradeoff.
**Verify:** Upload PDF → GET returns `filename` + `path` field → file accessible via `/uploads/{path}`.

---

### P0-D: `reset-day` endpoint doesn't exist
**Problem:** `src/pages/AdminResetPanel.tsx` calls `POST /admin/reset-day`. Backend has no such route. Panel shows mock success after real failure.
**Fix:** Either implement the endpoint or remove the panel. Decision: implement minimally — DELETE from `student_enrollment` or `attendance_day` filtered by date. Keep it simple:
```typescript
// server/src/routes/admin.ts — add:
router.post('/reset-day', authMiddleware, adminOnly, async (req, res) => {
  const { teacherCode, date } = req.body;
  // Minimal: delete today's motor_results for this teacher
  await dbRun(
    'DELETE FROM motor_results WHERE user_id=(SELECT id FROM users WHERE username=$1) AND DATE(created_at)=CURRENT_DATE',
    [teacherCode || req.user.id]
  );
  res.json({ data: { reset: true } });
});
```
**Verify:** POST `/api/admin/reset-day` → 200 `{reset: true}`.

---

### P0-E: `admin/cache/stats` always returns zeros
**Problem:** `server/src/routes/admin.ts:74-82` hardcodes `{entries:0, motores_cache:0, pdfs_cache:0}`.
**Fix:** Either implement real stats or remove the panel from Admin page. Decision: implement trivially (count DB rows).
```typescript
// server/src/routes/admin.ts — replace hardcoded with real counts
router.get('/cache/stats', authMiddleware, adminOnly, async (req, res) => {
  const [materials, diagnosticos, schedules] = await Promise.all([
    dbGet('SELECT COUNT(*)::int as c FROM materials'),
    dbGet('SELECT COUNT(*)::int as c FROM diagnosticos'),
    dbGet('SELECT COUNT(*)::int as c FROM bloques'),
  ]);
  res.json({ data: { entries: (materials.c + diagnosticos.c + schedules.c), motores_cache: 0, pdfs_cache: 0 } });
});
```
**Verify:** AdminCachePanel shows non-zero count after uploading files.

---

### P0-F: `/admin/estado-sistema` always idle
**Problem:** `server/src/routes/admin.ts:8-16` returns hardcoded `{synthesis:'idle', ...}` — polling is decoupled from real motor state. The frontend sees idle forever even during generation.
**Fix:** Store motor state in Redis (or in-memory Map if single-instance). Backend motors update state on submit/start/error/done.
```
# Option A (simple — Redis)
# server/src/db/motorState.ts
# Option B (in-memory — for single instance)
```
Recommended: In-memory Map for MVP (single Railway instance). Store `{userId, motorType, status, output}` in a module-level Map. Update on motor POST start and completion.
**Trigger:** `server/src/routes/motores.ts` — on POST, set `motorState.set(userId, type, 'generating')`. On done, set `'done'` with output.
**Frontend:** `src/hooks/useMotorGeneration.ts` already polls this. Wire it to real state.
**Verify:** During motor generation, sidebar shows green dot on motor key.

---

### P0-G: `users.ts` frontend calls wrong endpoint + wrong unwrapping
**Problem:** `src/api/users.ts:7` calls `GET /users/` (404). Backend has `GET /admin/users`. Response unwrapped as `response.data` instead of `response.data.data`.
**Fix:**
```typescript
// src/api/users.ts — replace with:
import { getAdminUsers } from './admin';  // re-use existing working function
export async function listUsers() { return getAdminUsers(); }
// OR fix the path:
const response = await client.get('/admin/users/');
return response.data.data;  // FIX unwrapping
```
**Verify:** Admin → Users tab → shows actual users from DB.

---

### P0-H: `blocks.ts` response.data unwrapping
**Problem:** `src/api/blocks.ts:7` returns `response.data` instead of `response.data.data`.
**Fix:** `return response.data.data` in `listBlocks()`.
**Verify:** AdminBloquesPanel shows actual blocks after creation.

---

## PHASE 1 — Clean the Zombie Graveyard (P1 — Dead Code Removal)

### P1-A: Delete 8 zombie components
These files do nothing or are completely duplicated. Delete them all in one PR:
```
src/components/Materials/MotorChainPanel.tsx          ← just <>{children}</>
src/components/Materials/createAbpButton.ts         ← duplicate of AbpButtonFragment
src/components/Materials/AbpButtonFragment.tsx        ← conditionally null, imported nowhere
src/components/Materials/AbpButtonSection.tsx        ← same logic as AbpButtonFragment
src/components/Materials/MotorResultSkeleton.tsx     ← inline <style> injection
src/components/Motores/MotorResultPanel.tsx           ← imported nowhere in pages
src/components/Materials/MotorResult.tsx             ← simple wrapper, check if actually used
```
**Verify after deletion:** `npm run build` still succeeds. Run full test suite.
**Critical check:** Search for each filename in imports before deleting. Update: `MotorResult.tsx` — check if `MotorSection_*.tsx` files import it.

---

### P1-B: Delete orphaned `server.js` at root
**Problem:** Root `server.js` is pre-refactor code. Never imported in package.json scripts.
**Fix:** Delete it. Add `server.js` to `.gitignore` if not already there.
**Verify:** `git status` shows deletion.

---

### P1-C: Merge duplicate mock generators
**Problem:** `server/src/motores/mocks.ts` (correct Spanish) and `src/lib/pptx/promptRunner.ts` (mojibake) have 12 identical mock functions.
**Fix:**
Option A: Move mocks to shared package `packages/shared/` — import from both frontend and backend.
Option B (faster): Have `promptRunner.ts` import from server mocks via relative path through the API boundary. The frontend's `executePrompt` already calls the backend API anyway.
**Recommended:** Option B. The `promptRunner.ts` mocks should be deleted entirely — FULL_AI mode goes through the backend which has the correct mocks. Only keep MOCK mode for offline/demo. Delete the mojibake mocks from `promptRunner.ts`.
**Fix:** Remove all `mock*Output` functions from `promptRunner.ts`. Keep only `executePrompt` and `executePromptStreaming`. The `generateMockOutput` dispatcher becomes dead code — either delete or keep for offline demo mode.
**Verify:** `npm run build` + E2E test with MiniMax API key unset → should show simulated output (server-side mock).

---

### P1-D: Consolidate 4 design systems → 1
**Problem:** `App.css` (old Codecademy design), `theme.css` (new tokens), `adminTheme.ts` (JS objects), `inline styles` everywhere.
**Fix:** Phased approach — don't rewrite everything at once.
1. Establish `src/styles/design-tokens.css` as the single source of truth for CSS custom properties
2. Move all `theme.css` tokens to `design-tokens.css`
3. Deprecate `App.css` (mark it) — only active styles that need migration
4. Slowly migrate inline `style={{}}` in components to className + CSS Module
5. `adminTheme.ts` → convert to CSS Module
**Short-term:** At minimum, define a shared `STYLES.ts` constant file that both pages and admin panels import. Don't touch inline styles yet.
**Decision:** This is a 2-sprint effort. Document as P1 cleanup, close in next sprint. Not blocking for Phase 0.

---

### P1-E: Fix CSRF cookie (remove or implement)
**Problem:** Cookie set on login, never read. Creates false security assurance.
**Fix (quick):** Remove cookie logic from `auth.ts` + remove `SameSite=Strict` from JWT cookie. The JWT Bearer token is sufficient for API auth.
**Fix (proper):** Implement CSRF token validation in middleware.
**Decision:** Quick fix (remove cookie) is 5 minutes. Do that now. Proper fix is future sprint.

---

### P1-F: `MotorResult.tsx` usage audit
**Problem:** `MotorResult` wrapper used by MotorSection components. Check if actually needed or if it's just styling.
**Fix:** Search all imports. If used only for styling, replace with a shared `<Section>` component and delete MotorResult.
**Verify:** Build passes after deletion.

---

## PHASE 2 — Polish the Edges (P2 — Quality of Life)

### P2-A: `TrimestralPage` `_curriculumLoading` unused
```typescript
// src/pages/TrimestralPage.tsx:35
const { curriculum: curriculumFromMaterials, loading: _curriculumLoading } = useCurriculum();
// Remove _: prefix entirely
const { curriculum: curriculumFromMaterials } = useCurriculum();
```
**Verify:** TypeScript build still clean.

---

### P2-B: Remove dead `optimizeDeps` exclusion
```typescript
// vite.config.ts — delete this line:
optimizeDeps: { exclude: ['@anthropic-akai/sdk'] },
```
**Verify:** Build still works.

---

### P2-C: `server.js` at root — add to .gitignore
```bash
# Add to .gitignore:
server.js
**/server_out.log
**/server_err.log
```
**Verify:** `git check-ignore server.js` returns true.

---

### P2-D: Two prompts directories — pick one canonical location
**Problem:** `src/prompts/` and `server/src/motores/prompts/` serve different purposes.
**Fix:** Document the split is intentional:
- `src/prompts/` → only for `curriculumExtractor.ts` AI calls (frontend-side PDF extraction prompts)
- `server/src/motores/prompts/` → motor system prompts for backend AI calls
**Verify:** Each is imported from exactly one place. Add a comment header in each directory explaining its purpose.

---

### P2-E: `buildSlides.ts` vs `generator.ts` — audit which PPTX pipeline is live
**Problem:** Two PPTX generation paths: `generator.ts` (called from pages) and `buildSlides.ts` (may be dead code).
**Fix:** Add a comment at the top of `buildSlides.ts`:
```typescript
/**
 * DEAD CODE — only kept for reference.
 * Use generator.ts for PPTX generation.
 * @deprecated since Sprint 9
 */
```
Search for imports of `buildSlides.ts`:
```bash
grep -r "from.*buildSlides" src/  # should return nothing
```
If nothing imports it → delete `src/lib/pptx/buildSlides.ts` and its `slides/` subdirectory.

---

## PHASE 3 — Document & Test

### T1: Write smoke test that covers P0 paths
```typescript
// tests/e2e/p0-smoke.spec.ts
test('P0 smoke: login → upload material → generate motor → export PPTX', async ({ page }) => {
  await login(page);
  await uploadMaterial(page, testFile);
  await generateSynthesis(page);
  await expect(page.locator('[data-testid="motor-result"]')).toBeVisible();
  await exportPPTX(page);
  // verify download triggered
});
```

### T2: Write integration tests for P0 backend routes
```typescript
// server/src/routes/__tests__/p0-routes.test.ts
test('schedule returns blocks for teacher', async () => {
  const res = await request(app).get('/api/schedule/ADMIN/LUNES').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.data)).toBe(true);
});
test('diagnosticos upload accepts multipart/form-data', async () => {
  // upload a real PDF
});
```

### T3: Document all API contracts in `api_contract.json`
Current `api_contract.json` is stale. Update it with actual request/response shapes for all 11 routes.

---

## CHECKLIST (master reference)

### Phase 0 — P0 (must fix before next deploy)
- [ ] P0-A: schedule.ts returns real blocks from DB
- [ ] P0-B: diagnosticos handles multipart upload
- [ ] P0-C: files stored (not just metadata)
- [ ] P0-D: reset-day endpoint exists or panel removed
- [ ] P0-E: cache/stats returns real counts
- [ ] P0-F: estado-sistema reflects real motor state
- [ ] P0-G: users.ts calls correct endpoint + unwraps correctly
- [ ] P0-H: blocks.ts unwraps `response.data.data`

### Phase 1 — P1 (clean next sprint)
- [ ] P1-A: Delete 8 zombie components
- [ ] P1-B: Delete orphaned server.js
- [ ] P1-C: Remove mojibake mocks from promptRunner.ts
- [ ] P1-D: Design system consolidation (Phase 1 of N — document the plan)
- [ ] P1-E: Remove fake CSRF cookie
- [ ] P1-F: Audit MotorResult.tsx usage

### Phase 2 — P2 (polish)
- [ ] P2-A: Remove unused `_curriculumLoading` variable
- [ ] P2-B: Remove dead `optimizeDeps` exclusion
- [ ] P2-C: Add temp logs to .gitignore
- [ ] P2-D: Document two prompts directories
- [ ] P2-E: Audit buildSlides.ts — delete if dead

### Phase 3 — Testing
- [ ] T1: P0 E2E smoke test
- [ ] T2: P0 integration tests
- [ ] T3: Update api_contract.json

### Build & Deploy
- [ ] `npm run build` succeeds (0 errors)
- [ ] `npm run test` passes (27+ tests green)
- [ ] Railway deploy succeeds
- [ ] Railway smoke test passes (login → material → export)

---

## Decisions Needed From Ruddy

1. **File storage strategy:** Railway ephemeral FS (files vanish on cold start) OR Railway Blob plugin (persistent, paid) OR S3-compatible (setup required)?
2. **CSRF cookie:** Remove (quick) or implement properly (2 sprints)?
3. **Design system:** Incremental migration (this sprint) or defer to backlog?
4. **SlideEditor complexity:** Is the live editor used? If not, deprioritize that whole pipeline.
5. **Motor chaining:** Is it intentional that MotorSection_Synthesis has its own ABP button AND MaterialesPage has another? Need ONE source of truth.

---

*Last updated: 2026-05-30 | Owner: Ruddy Ribera*
