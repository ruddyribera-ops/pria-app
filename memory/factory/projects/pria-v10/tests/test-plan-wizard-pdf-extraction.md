# Test Plan — PRIA v10 — Wizard PDF Extraction (E2E)

**Created:** 2026-07-08
**By:** QA Engineer
**Feature:** PDF Upload → Unit Detection (wizard + materiales path)
**Tooling note:** chrome-devtools MCP was unresponsive (timeouts on every call after 7 attempts). Fell back to `playwright-core` `connectOverCDP("http://localhost:9222")` against the running Chrome 150. Tests executed deterministically against the live dev server on `:8080`.

## Acceptance criteria (from brief)

1. Upload a real PDF (`docs/Unidad 3 - Lenguaje_5to_SB.pdf`, 649 KB) on `/wizard`.
2. Wizard advances to step 2 ("Selecciona") and displays detected units.
3. User can select a unit and see topics for it.
4. Same PDF on `/materiales` populates the curriculum preview with detected units.
5. No unhandled errors visible to the user.

## Tests

### Test 1: Wizard login + navigation
- **Type:** automated UI
- **Steps:** POST credentials on /login, then GET /wizard.
- **Expected:** Login redirects to authenticated app; /wizard loads with file input visible.
- **Actual:** Login redirected to `/materiales`; `/wizard` loaded with file input present.
- **Pass/Fail:** [PASS: HIGH]
- **Evidence:** `D:\Temp\opencode\qa_step02_login_filled.png`, `D:\Temp\opencode\wizard_initial.html`

### Test 2: Wizard PDF upload → unit detection (original filename)
- **Type:** automated UI + network capture
- **Steps:** Upload `Unidad 3 - Lenguaje_5to_SB.pdf` via the file input. Poll DOM for 35 s.
- **Expected:** "Unidad 1: …" / "Unidad 2: …" rendered after extraction.
- **Actual:** Wizard advanced to step 2 immediately; body shows *"No se detectaron unidades en este libro."* Info banner: *"Este libro no tiene unidades detectadas. Sube el PDF de nuevo."* Same state for 35 s. No units rendered.
- **Pass/Fail:** [FAIL: HIGH]
- **Evidence:** `D:\Temp\opencode\wizard_step2_units.jpeg`, `D:\Temp\opencode\wizard_after_upload.html`, `D:\Temp\opencode\qa_report.json`

### Test 3: Wizard PDF upload → unit detection (renamed copy, fresh hash-equivalent identifier — bypass any filename cache)
- **Type:** automated UI
- **Steps:** Copy PDF to `D:\Temp\opencode\Unidad_3_Lenguaje_FRESH.pdf`. Upload again. Poll DOM for 45 s.
- **Expected:** Identical to Test 2.
- **Actual:** Identical failure (immediate "no se detectaron" message, then static). No fallback, no retry, no error.
- **Pass/Fail:** [FAIL: HIGH]
- **Evidence:** `D:\Temp\opencode\wizard_fresh_after_upload.html`, `D:\Temp\opencode\qa_report_v3.json`

### Test 4: Select a unit and view topics
- **Type:** automated UI
- **Steps:** With detected units, click the first one, then read DOM for topics.
- **Actual:** Skipped — no units to click (blocked by Tests 2 & 3).
- **Pass/Fail:** [BLOCKED]

### Test 5: Wizard — network capture during upload (root-cause)
- **Type:** network capture
- **Steps:** Listen to all `/api/...` requests while uploading the fresh PDF.
- **Expected:** A request that returns populated units (or an error from a known extraction endpoint).
- **Actual:**
  - `POST /api/materials/` → `200 {"data":{"id":12,...}}`
  - `GET /api/materials/12/units` → **`200 {"data":[]}`** ← empty units returned
  - `GET /api/materials/` → lists all 12 rows; **every** row has `"units_json":null`
  - `GET /api/health` → 200 (healthy)
- **Pass/Fail:** [FAIL: HIGH]
- **Evidence:** `D:\Temp\opencode\qa_network.json`

### Test 6: Materiales — same PDF, second SPA path
- **Type:** automated UI
- **Steps:** Navigate `/materiales`, upload the renamed PDF, wait 30 s, read DOM.
- **Expected:** Curriculum preview re-renders with units from the new PDF.
- **Actual:** Upload is silently added to the file list. The preview area still renders *stale* data from a previous session (slides about "ciclo del agua"; PDC Trimestral "Los animales del Gran Chaco Boliviano" — Units 1, 2, 3 about animals). The pre-upload and post-upload HTML are byte-identical at the curriculum area. No network call to re-extract is made.
- **Pass/Fail:** [FAIL: HIGH]
- **Evidence:** `D:\Temp\opencode\materiales_preview.jpeg`, `D:\Temp\opencode\materiales_initial.html`, `D:\Temp\opencode\materiales_after_upload.html`

### Test 7: Console / network errors visible to the user
- **Type:** console capture
- **Steps:** Listen to console messages and `requestfailed`.
- **Expected:** Zero related errors; or clear user-facing error.
- **Actual:** 1 unrelated 404 (PWA icon `/icon-192.png`). Zero `requestfailed`. The empty `/units` array is a valid 200 response — no error surfaced.
- **Pass/Fail:** [PASS: MEDIUM] (no user-visible noise, but also no actionable error)
- **Evidence:** `D:\Temp\opencode\qa_network.json`, `D:\Temp\opencode\qa_report_v3.json`

## Summary

- Total tests: **7**
- Passed: **2** (Test 1 login/nav, Test 7 no user-visible noise)
- Failed: **4** (Tests 2, 3, 5, 6)
- Blocked: **1** (Test 4 — couldn't run, blocked by 2)

## Verdict

- **Sign-off:** **NO** — DO NOT SHIP.
- **Reason:** The wizard advances to step 2 but renders zero units for every PDF; the underlying `GET /api/materials/{id}/units` endpoint returns an empty array because `materials.units_json` is `null` for every row. The materiales path shows stale cached curriculum content (previous session's data) and never refreshes on upload. The "client-side extraction" fix is wired in but does not produce units.
- **Bug filed:** `memory/factory/projects/pria-v10/bugs/bug-pdf-extraction-zero-units.md`
- **Next:** PM → Tech Lead → code-builder: investigate whether `/api/materials/` upload triggers the AI extraction and persists to `units_json`; or has the client-side flow drifted away from the working AI endpoint.
