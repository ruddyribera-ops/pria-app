# Bug — Grado dropdown does not update options when Nivel changes to Secundaria

**Filed by:** QA Engineer
**Date:** 2026-07-07
**Project:** pria-simplified-sidebar
**Feature:** Configuración page — Nivel educativo section
**Severity:** low (UX nit, non-blocking)

## Reproduction

1. Open /login?nocache=20260707 in fresh session
2. Login as m.gonzalez / docente123
3. Navigate to /configuracion
4. In "Nivel educativo" section, change the **Nivel** dropdown from "Primaria" to "Secundaria"
5. Observe the **Grado** dropdown below it

## Expected

Grado dropdown should show secundaria-grade options (e.g., "1ro secundaria", "2do secundaria", ... "6to secundaria"). At minimum, the option values should not be labeled "primaria" when nivel is secundaria.

## Actual

Grado dropdown still shows primaria-grade options:
- 5to primaria (selected by default)
- 4to primaria
- 3ro primaria
- 2do primaria
- 1ro primaria

The selected value remains "5to primaria" even though nivel=Secundaria. This is internally inconsistent — a secundaria user with a "5to primaria" grado.

## Evidence

Sidebar snapshot uid=18_38 combobox "Nivel:" value="Secundaria" (option uid=18_40 selected), while uid=18_42 combobox "Grado:" still shows primaria options with uid=18_43 ("5to primaria") selected.

## Workaround

None in UI. User can leave grado as-is and only the nivel change is meaningful.

## Suggested fix area

Look at the Configuración page component. The grado `<select>` options are likely hardcoded to primaria values. The fix: either derive grado options from selected nivel, or rename the values to be nivel-agnostic (e.g., "5to" instead of "5to primaria") and let consumers interpret based on nivel.

## Persistence observation (related, not a separate bug)

`pria_user.nivel` in localStorage stays at "Primaria" while `pria_nivel=Secundaria` is the dropdown's source of truth. Two sources of truth for the same field. If the backend re-derives user state from `pria_user`, the user will be "Primaria" again on next API call. Recommend syncing both keys.
