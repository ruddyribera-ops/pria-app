# Test Plan — PRIA v10 — Simplified Sidebar

**Created:** 2026-07-07
**By:** QA Engineer
**Feature:** Simplified sidebar (4 nav items only) + Configuración page
**Brief:** memory/factory/projects/pria-simplified-sidebar/brief.md (assumed)
**Decisions:** memory/factory/projects/pria-simplified-sidebar/decisions.md (assumed)

## Acceptance criteria (from brief)

- Sidebar nav shows EXACTLY 4 items: Inicio, Crear Material, Historial, Configuración
- No other items visible in sidebar (redundant items reachable only as deep links)
- Configuración page shows 4 sections: Tu cuenta, Nivel educativo, Materiales, Diagnósticos, plus Cerrar sesión
- Nivel educativo persists in localStorage across navigation
- Profile click in sidebar header navigates to /configuracion

## Tests

### Test 1: Sidebar shows exactly 4 nav items
- **Type:** automated UI
- **Steps:**
  1. Open fresh page at /login?nocache=20260707
  2. Close all other pages
  3. Login as m.gonzalez / docente123
  4. Wait for navigation to /materiales
  5. Take snapshot of sidebar
- **Expected:** 4 links: 📚 Inicio, ➕ Crear Material, 📁 Historial, ⚙️ Configuración
- **Actual:** Sidebar nav contained exactly these 4 links (uid=11_9, 11_12, 11_15, 11_18). No other items.
- **Pass/Fail:** [PASS: HIGH]
- **Evidence:** D:\Temp\opencode\FINAL_simplified_sidebar.jpeg

### Test 2: Configuración page sections
- **Type:** automated UI
- **Steps:**
  1. Click ⚙️ Configuración in sidebar
  2. Take snapshot
  3. Verify all sections present
- **Expected:** 4 sections: Tu cuenta (Nombre/Rol/Código), Nivel educativo (Nivel/Grado), Materiales (link), Diagnósticos (link), plus Cerrar sesión button
- **Actual:** Found 5 sections on page:
  - 👤 Tu cuenta → Nombre: María González, Rol: Docente, Código: PROF-MG
  - 🎓 Nivel educativo → Nivel: Primaria/Secundaria, Grado: 1ro-5to primaria
  - 📚 Materiales → "Ir a Materiales →" link
  - 🩺 Diagnósticos → "Ir a Diagnósticos →" link
  - 🚪 Sesión → "Cerrar sesión" button
- **Pass/Fail:** [PASS: HIGH] (5th section "Sesión" wraps the Cerrar sesión button — matches spec)
- **Evidence:** D:\Temp\opencode\FINAL_configuracion.jpeg

### Test 3: Nivel/Grado persistence
- **Type:** automated UI + localStorage
- **Steps:**
  1. On /configuracion, set Nivel dropdown to "Secundaria"
  2. Verify `pria_nivel=Secundaria` in localStorage
  3. Navigate to /dashboard
  4. Navigate back to /configuracion
  5. Verify Nivel is still "Secundaria"
- **Expected:** Nivel persists as "Secundaria" after navigation
- **Actual:** Persistence works. localStorage key `pria_nivel=Secundaria` survived both navigations. Dropdown shows "Secundaria" selected on return.
- **Pass/Fail:** [PASS: HIGH]
- **Evidence:** localStorage inspection, dropdown value snapshots before/after

### Test 4: Profile click navigates to /configuracion
- **Type:** automated UI
- **Steps:**
  1. Navigate to /dashboard
  2. Click profile link "MG María González Docente" in sidebar header
  3. Verify URL becomes /configuracion
- **Expected:** Navigation to /configuracion
- **Actual:** Page navigated to http://localhost:8080/configuracion. pathname === "/configuracion" confirmed via evaluate_script.
- **Pass/Fail:** [PASS: HIGH]
- **Evidence:** Click response, window.location.pathname assertion

## Summary

- Total tests: 4
- Passed: 4
- Failed: 0
- Blocked: 0

## Verdict

- **Sign-off:** YES
- **Reason:** All 4 acceptance criteria met in fresh browser session (cache-busted via ?nocache=20260707). Sidebar has exactly 4 nav items, configuracion page shows all required sections, nivel persists across navigation, profile click navigates correctly.
- **Bugs filed:** 1 minor observation (see below)
- **Next:** PM → Delivery Engineer → Ship to staging

## Observations (non-blocking)

1. **Visual issue: Grado dropdown does not react to Nivel change.** When Nivel=Secundaria is selected, the Grado dropdown still shows primaria options ("5to primaria", "4to primaria", etc.). Either the grado options should change based on nivel, OR the label "primaria" in the option values should be neutralized. Recommend filing as low-severity UX bug.

2. **Data duplication: `pria_user.nivel` vs `pria_nivel`.** Two localStorage keys hold nivel. `pria_user` object still says `nivel: "Primaria"` while `pria_nivel=Secundaria` is the source of truth for the UI. Risk: stale user data if backend auth is read from `pria_user`. Recommend consolidating or syncing both.
