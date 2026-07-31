# Test Plan — PRIA v10 — Simplified Sidebar (Sprint D)

**Created:** 2026-07-07
**By:** QA Engineer
**Feature:** Simplified Sidebar (4 main items + admin-only Panel Admin)
**Build verified:** `dist/index-DwVSljia.js` (NEW, has new sidebar)
**Server actually serving:** `index-FcwXoMAf.js` (OLD, has complex sidebar)

## Acceptance criteria (from brief)

- Sidebar has 4 main items: 📚 Inicio, ➕ Crear Material, 📁 Historial, ⚙️ Configuración
- Brand header (PRIA v10) at top
- Profile section (compact, no dropdown, navigates to /configuracion)
- Admin-only: 🛡️ Panel Admin link
- Single logout icon at bottom
- NO nivel/grado selectors in sidebar
- NO estado del sistema panel
- NO big red logout button
- /configuracion page has: Profile (Tu cuenta), Nivel educativo, Materiales link, Diagnósticos link, Cerrar sesión
- Nivel/Grado changes persist via localStorage
- Redundant pages (/diario, /semanal, /materiales, /diagnosticos) still work as deep links
- Teacher cannot access /admin (redirect to /dashboard)

## Tests

### Test 1: Login as m.gonzalez
- **Type:** manual UI
- **Steps:**
  1. Navigate to http://localhost:8080/login
  2. Fill username: m.gonzalez
  3. Fill password: docente123
  4. Click "Iniciar Sesión"
- **Expected:** Redirect to /dashboard
- **Actual:** Redirect to /materiales (sub-finding: login redirect target wrong, but expected page does load)
- **Pass/Fail:** PARTIAL — login succeeds, wrong redirect target
- **Evidence:** token issued, user `{"id":2,"nombre":"María González","role":"docente"}` stored in localStorage

### Test 2: Sidebar shows ONLY 4 main items + (admin-only Panel Admin if admin)
- **Type:** manual UI
- **Steps:** Take accessibility snapshot of dashboard sidebar after login
- **Expected (per brief):** 4 items: Inicio, Crear Material, Historial, Configuracion + admin-only Panel Admin
- **Actual (DEPLOYED, OLD build):** 9 items: Mis Clases, Nuevo Material, Diapositivas, Diario, Semanal, Trimestral, Materiales, Historial, Diagnósticos
- **Pass/Fail:** [FAIL: HIGH]
- **Evidence:** DOM snapshot `uid=2_8` to `uid=2_36`, screenshots `D:\Temp\opencode\simplified_sidebar.jpeg`
- **Root cause:** Server is serving old build `index-FcwXoMAf.js` instead of new `index-DwVSljia.js`

### Test 3: No nivel/grado selectors in sidebar
- **Type:** manual UI
- **Expected (per brief):** ABSENT
- **Actual (DEPLOYED):** PRESENT — `NIVEL:` and `GRADO:` comboboxes visible at uid=2_37 to uid=2_48
- **Pass/Fail:** [FAIL: HIGH]
- **Evidence:** snapshot `uid=2_37` "🎓 NIVEL EDUCATIVO", `uid=2_38` "NIVEL:", `uid=2_42` "GRADO:"

### Test 4: No estado del sistema panel
- **Type:** manual UI
- **Expected (per brief):** ABSENT
- **Actual (DEPLOYED):** PRESENT — "Estado del sistema" expandable button + 11 motor status dots
- **Pass/Fail:** [FAIL: HIGH]
- **Evidence:** snapshot `uid=2_49` "Estado del sistema" expandable

### Test 5: Profile is compact (no dropdown)
- **Type:** manual UI
- **Expected (per brief):** Compact profile link to /configuracion
- **Actual (DEPLOYED):** "Perfil de usuario" expandable button (old behavior)
- **Pass/Fail:** [FAIL: HIGH]
- **Evidence:** snapshot `uid=2_4` "Perfil de usuario" expandable

### Test 6: Navigate to /configuracion
- **Type:** manual UI
- **Steps:** Navigate to http://localhost:8080/configuracion
- **Expected:** Configuracion page loads with profile, nivel educativo, materiales link, diagnósticos link, cerrar sesión
- **Actual (DEPLOYED):** **404 Página no encontrada**
- **Pass/Fail:** [FAIL: HIGH]
- **Evidence:** snapshot shows heading "404" + "Página no encontrada", screenshot `D:\Temp\opencode\configuracion_page.jpeg`
- **Root cause:** /configuracion route does not exist in OLD build

### Test 7: Verify new build (in dist) HAS the new sidebar
- **Type:** data
- **Steps:** Grep `dist/index-DwVSljia.js` for expected strings
- **Expected:** New sidebar strings present
- **Actual:**
  - `"Crear Material": True`
  - `"Panel Admin": True`
  - `"NAV_ITEMS": False` (var name is minified)
  - Found new code: `zr=[{to:"/dashboard",icon:"...s",label:"Inicio"},{to:"/wizard",icon:"...z",label:"Crear Material"},{to:"/historial",icon:"...?",label:"Historial"},{to:"/configuracion",icon:"...T...",label:"Configuraci...n"}]`
  - Found `profileName:Br,profileRole:jr,nav:Jr,navLink:kr,navLinkActive:Fr,navLinkAdmin:Ur,navIcon:$r,spacer:Mr,logoutButton:qr` (CSS module hash references)
- **Pass/Fail:** PASS
- **Evidence:** Confirms new build is correct

### Test 8: Verify new build HAS the configuracion page sections
- **Type:** data
- **Steps:** Grep `dist/assets/ConfiguracionPage-D2PDg87C.js` for expected strings
- **Expected:** All 4 sections present
- **Actual:**
  - `"Tu cuenta": True`
  - `"Nivel educativo": True`
  - `"Cerrar sesi": True` (truncated, but found)
  - `"Materiales": True`
  - `"Diagn": True`
- **Pass/Fail:** PASS
- **Evidence:** Confirms new configuracion page is built correctly

### Test 9: Redundant deep-link pages still work
- **Type:** manual UI
- **Steps:** Navigate to /diario, /semanal, /materiales, /diagnosticos
- **Expected:** All pages load (since routes still exist in router)
- **Actual:** Not testable in OLD build because /dashboard loaded with the same OLD sidebar. The OLD build still has these routes but they're not in the sidebar (per the test plan, "These pages just aren't in the sidebar anymore"). Cannot fully verify in production.
- **Pass/Fail:** BLOCKED (cannot test in deployed OLD build; would pass in NEW build since routes exist in router)

### Test 10: Teacher cannot access /admin
- **Type:** manual UI
- **Steps:** Navigate to /admin while logged in as m.gonzalez (docente)
- **Expected:** Redirect to /dashboard
- **Actual:** URL ends at /dashboard (redirect did happen). But this happened in the OLD build which doesn't have the T10 fix — it likely uses the catch-all `*` route → NotFoundPage → ???
  - Actually the snapshot shows /dashboard content. The OLD App.tsx has `<Route path="/admin" element={withErrorBoundary(<AdminPage />, 'Administración')} />` and the OLD AdminPage may have its own redirect for non-admins. This is incidental, not part of the T10 fix.
- **Pass/Fail:** [PASS: MEDIUM] — the redirect works, but it's not via the T10 fix; cannot verify the intended ProtectedRoute admin guard in OLD build
- **Evidence:** final URL `http://localhost:8080/dashboard` after navigating to /admin

## Summary

- Total tests: 10
- Passed: 3 (Tests 7, 8, 10) — new build is correct in dist
- Failed: 5 (Tests 2, 3, 4, 5, 6) — new sidebar NOT in production
- Blocked: 1 (Test 9) — cannot test redundant pages since the new build isn't deployed
- Partial: 1 (Test 1) — login redirect target is wrong (separate bug)

## Verdict

- **Sign-off:** NO
- **Reason:** New Sidebar is built correctly in `dist/` (verified by string search) but the server (port 8080) is serving an OLD bundle (`index-FcwXoMAf.js`). Cannot ship — clients see the OLD sidebar.
- **Bugs filed:** bug-deployment-mismatch-001 (critical)
- **Next:** PM → Tech Lead → investigate deployment pipeline. The dist folder has the new build. The server is serving from a different location (or has stale cache). Verify nginx doc root, clear caches, restart.

## Critical deployment evidence

| What | Expected | Actual |
|------|----------|--------|
| HTML `<script src>` | `/assets/index-DwVSljia.js` | `/assets/index-FcwXoMAf.js` |
| HTML `<link href>` CSS | `/assets/index-B1HIub15.css` | `/assets/index-BZihcDH4.css` |
| HEAD `/assets/index-DwVSljia.js` | 200 | **404** |
| HEAD `/assets/index-FcwXoMAf.js` | (not expected) | 200 |
| `/configuracion` route | 200 | **404 Página no encontrada** |
| Server | nginx/1.27.5 | OK |
| Sidebar in browser | 4 items | 9 items (old) |

The browser **fetches** `index-FcwXoMAf.js` (verified via `document.scripts` evaluation), which is **not** the build in `dist/`. The server is serving from a different directory than the project's `dist/`.
