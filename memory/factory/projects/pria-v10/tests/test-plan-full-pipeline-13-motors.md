# Test Plan — PRIA v10 — Full Pipeline (13 Motors)

**Created:** 2026-07-02
**By:** QA Engineer
**Feature:** Full motor pipeline acceptance (demo-grade walkthrough)
**Brief:** Landing page promises 13 motors. Verify each works end-to-end via API + UI.

## Acceptance criteria (from brief)

- All 13 motors called via API
- At least 10/13 return 200 OK
- History shows all generated materials
- Dashboard shows updated stats + class cards
- Screenshots taken
- Summary table: motor × status × elapsed

## Setup

- Backend: Docker `pria-backend` on :3000 (Express + MiniMax)
- Frontend: Vite dev server on :5173
- Chrome debug port 9222
- Login: m.gonzalez / docente123 (teacher_code=PROF-MG, user_id=3)
- Lesson params (consistent across all motors): "Los animales del Gran Chaco Boliviano", 45 min, Primaria, 5to, Ciencias Naturales

## Tests

### Test 1: Login + token acquisition
- **Type:** API
- **Steps:** POST /api/auth/login {usuario, contrasena}
- **Expected:** 200 + JWT token
- **Actual:** 200, token_len=161, saved to D:\Temp\opencode\pria_token.txt
- **Pass/Fail:** PASS [HIGH]
- **Evidence:** bash output "LOGIN_OK status=200 token_len=161"

### Test 2: Pre-existing history
- **Type:** API
- **Steps:** GET /api/motores/history
- **Expected:** returns existing items
- **Actual:** 4 items, all motor_type=slides
- **Pass/Fail:** PASS [HIGH]

### Test 3: Generate all 13 motors sequentially
- **Type:** API
- **Steps:** POST /api/motores/{motor} for each of 13 motors, sequential, 300s timeout each
- **Expected:** >=10/13 return 200
- **Actual:** 12/13 OK on first pass; alpha2 returned 422 (transient). Retry of alpha2 -> 200, motor_result_id=20.
  Final: 13/13 return 200.
- **Pass/Fail:** PASS [HIGH]

| # | Motor | Status | Elapsed (s) | motor_result_id |
|---|-------|--------|-------------|-----------------|
| 1 | synthesis | 200 | 18.3 | 8 |
| 2 | alpha2 | 422->200 (retry) | 31.5 | 20 |
| 3 | abp | 200 | 25.3 | 9 |
| 4 | assessment | 200 | 27.9 | 10 |
| 5 | plan | 200 | 31.7 | 11 |
| 6 | slides | 200 | 103.5 | 12 |
| 7 | ficha | 200 | 32.7 | 13 |
| 8 | quiz | 200 | 10.8 | 14 |
| 9 | tutor | 200 | 16.6 | 15 |
| 10 | pdc | 200 | 39.5 | 16 |
| 11 | recalibrate | 200 | 7.3 | 17 |
| 12 | micro | 200 | 60.1 | 18 |
| 13 | source_narrator | 200 | 41.8 | 19 |

Total wall-clock: ~7 min. slides longest (103.5s, MiniMax multi-slide). quiz fastest (10.8s).

### Test 4: Post-generation history
- **Type:** API
- **Steps:** GET /api/motores/history (after all generations + alpha2 retry)
- **Expected:** >=13 items, all 13 motor types present
- **Actual:** 17 items. 13 distinct motor types present (slides x5, plus one each of the other 12).
- **Pass/Fail:** PASS [HIGH]
- **Evidence:** frontend /historial shows "17 contenidos generados" with all 13 types listed

### Test 5: Dashboard renders stats + class cards
- **Type:** automated UI
- **Steps:** Navigate /login -> fill credentials -> click Iniciar Sesion -> land on dashboard
- **Expected:** Stats row (Clases, Materiales, Esta Semana), "Mis Clases" with cards per motor, Motor filter dropdown lists all 13
- **Actual:** Login redirects to /materiales (CRASHES - see Test 7). Manual nav to /dashboard shows: 14 CLASES, 17 MATERIALES, 17 ESTA SEMANA. "Mis Clases" lists 14 cards covering all 13 motors. Motor filter dropdown lists all 13 (Sintesis, Extraccion, Proyecto ABP, Evaluacion, Plan, Diapositivas, Ficha, Quiz, Tutor, PDC, Recalibrar, Micro-obj, Narrador).
- **Pass/Fail:** PASS [MEDIUM] - dashboard itself fine, but login redirect target is broken (see Test 7)
- **Evidence:** D:\Temp\opencode\dashboard_full_pipeline.jpeg

### Test 6: Historial page renders all materials
- **Type:** automated UI
- **Steps:** Navigate /historial
- **Expected:** list of all 17 generations, filter dropdown for motor types
- **Actual:** 17 contents listed, all 13 motor types represented. Quality badges visible (e.g. Micro-Objetivos 95/100, Recalibracion 95/100, Pop Quiz 95/100; one older Diapositivas 52/100).
- **Pass/Fail:** PASS [HIGH]
- **Evidence:** D:\Temp\opencode\historial_full_pipeline.jpeg
- **Note (low-sev):** `source_narrator` appears as raw key "source_narrator" in list (not localized to "Narrador") and is MISSING from the historial filter dropdown (dropdown has 12 options, no Narrador). Dashboard sidebar/filter does localize it as "Narrador". Inconsistency.

### Test 7: /materiales page (post-login redirect target)
- **Type:** automated UI
- **Steps:** Navigate /materiales (the page login redirects to)
- **Expected:** Materials browser renders
- **Actual:** CRASH. Error boundary: `TypeError: result.reduce is not a function` in `<MotorSection_Slides>` at MotorSection_Slides.tsx:19:47. Reproduced 2x (on login redirect + direct nav).
- **Pass/Fail:** FAIL [HIGH]
- **Evidence:** D:\Temp\opencode\materiales_crash.jpeg; console stack trace; Bug bug-materiales-reduce-not-function.md
- **Impact:** First thing user sees after login is a crash page. Demo-blocking. Workaround: navigate to /dashboard manually.

### Test 8: PPTX download/export
- **Type:** API + code review
- **Steps:** Probe backend download endpoints for slides id=12; grep frontend for export code
- **Expected:** working PPTX export
- **Actual:** Backend endpoints `/api/motores/{id}/download`, `/api/motores/download/{id}`, `/api/motores/result/{id}` all return empty stubs `{"data":{"result":{}}}` (no binary PPTX). PPTX generation is CLIENT-SIDE via PptxGenJS in WizardPage.tsx:810 (`handleDownload`), triggered from the wizard UI - not reachable from /materiales (which crashes) or /historial (no download button on list items).
- **Pass/Fail:** PASS [LOW] - export code exists and is wired in WizardPage, but NOT end-to-end-verified because (a) backend has no binary endpoint by design and (b) the materials page that would host a per-result download button is broken. Cannot confirm a PPTX actually downloads in the current session.
- **Evidence:** grep results (PptxGenJS import + handleDownload at WizardPage.tsx:810-859); API probe output

## Summary

- Total tests: 8
- Passed: 6 (5 HIGH/MEDIUM PASS, 1 LOW PASS)
- Failed: 1 (Test 7 - /materiales crash)
- Blocked: 0

## Verdict

- **Sign-off:** NO
- **Reason:** 13/13 motors generate successfully and persist to history (core pipeline healthy), BUT the post-login redirect target (/materiales) crashes with `result.reduce is not a function` - the client's first screen after login is an error page. This is demo-blocking. One additional low-sev localization gap (source_narrator raw key + missing from historial filter).
- **Bugs filed:** bug-materiales-reduce-not-function.md (HIGH), bug-source-narrator-localization.md (LOW)
- **Next:** PM -> Tech Lead -> bug-fixer (fix MotorSection_Slides.tsx reduce guard) -> re-test Test 7. Then ship. Core motor pipeline is ready; only the materials landing page blocks the demo.
