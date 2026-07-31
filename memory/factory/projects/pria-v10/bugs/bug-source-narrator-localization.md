# Bug — source_narrator not localized + missing from historial filter

**Filed by:** QA Engineer
**Date:** 2026-07-02
**Project:** pria-v10
**Feature:** Historial page / motor display labels
**Severity:** low

## Reproduction

1. Generate a `source_narrator` motor result (POST /api/motores/source_narrator).
2. Navigate to /historial.
3. Observe the list entry: label is the raw key `source_narrator` (not "Narrador").
4. Open the "Filtrar por tipo" dropdown: it lists 12 motor options but `source_narrator` / "Narrador" is absent.

## Expected

- List entry shows localized label "Narrador" (matching the dashboard sidebar which DOES show "📜 Narrador").
- Filter dropdown includes a "📜 Narrador" option.

## Actual

- List entry: raw key `source_narrator`.
- Filter dropdown: 12 options only (Sintesis Curricular, Extraccion de Curriculo, Proyecto ABP, Evaluacion, Plan de Clase, Diapositivas, Ficha Gamificada, Pop Quiz, Panel del Tutor, PDC Trimestral, Recalibracion, Micro-Objetivos). Narrador missing.

## Evidence

- /historial snapshot (uid=4_108): button label "source_narrator, 02 jul. 2026, 04:02 p. m."
- Filter dropdown options uid=4_94..4_106: no Narrador option.
- Contrast: dashboard motor filter (uid=3_147 option "📜 Narrador") and sidebar "Estado del sistema" both localize correctly. Only the historial page is inconsistent.

## Workaround

None needed for function - the result is still visible in the list, just mislabeled and unfilterable.

## Suggested fix area

The historial page's motor-type -> label map and filter option list. Add `source_narrator -> "Narrador"` to the same label map the dashboard uses (likely in `src/pages/HistorialPage.tsx` or its motor-label constant). Reuse the dashboard's label source to avoid divergence.

## Impact on demo

LOW. Cosmetic inconsistency. Does not block the demo but looks unfinished to a detail-oriented client.
