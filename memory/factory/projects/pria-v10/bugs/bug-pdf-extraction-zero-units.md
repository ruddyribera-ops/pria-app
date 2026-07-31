# Bug — PRIA Wizard PDF extraction returns 0 units on all uploads

**Filed by:** QA Engineer
**Date:** 2026-07-08
**Project:** pria-v10
**Feature:** Wizard PDF Upload → Unit Detection (client-side extraction)
**Severity:** critical
**Status:** BLOCKING SHIP

## Reproduction

1. Login as `m.gonzalez / docente123` on `http://localhost:8080`.
2. Navigate to `/wizard`.
3. Upload any PDF (e.g. `docs/Unidad 3 - Lenguaje_5to_SB.pdf`, 649 KB).
4. The wizard advances to step 2 ("2. Selecciona" — green active).
5. The body shows: **"No se detectaron unidades en este libro."**
6. Wait 45 seconds — message never changes. No loading indicator, no retry, no error banner.

Reproduction rate: **4/4** (two E2E passes — v2 with original filename, v3 with renamed copy `Unidad_3_Lenguaje_FRESH.pdf`; both fail identically).

## Expected

After upload, the wizard should display detected units from the PDF (e.g. "Unidad 1: …", "Unidad 2: …") and let the user select one.

## Actual

The wizard immediately (t=0s after `setInputFiles`) renders **"No se detectaron unidades en este libro."** with an info banner: *"Este libro no tiene unidades detectadas. Sube el PDF de nuevo."*

### Network trace (captured during upload — `qa_network.json`)

```
POST /api/materials/                                    -> 200
   {"data":{"id":12,"filepath":"08e78143-...pdf", ...}}
GET  /api/materials/12/units                            -> 200
   {"data":[]}                                          <-- EMPTY ARRAY
GET  /api/materials/                                    -> 200
   (lists 12 materials; ALL have units_json:null)
GET  /api/health                                        -> 200
```

Every PDF in the materials table (`GET /api/materials/` response) has `units_json: null`, including the just-created material `id=12`. The new client-side extraction does NOT populate unit data.

## Evidence

- Wizard screenshot: `D:\Temp\opencode\wizard_step2_units.jpeg` — shows green "2. Selecciona" step with the "No se detectaron unidades" body.
- Materiales screenshot: `D:\Temp\opencode\materiales_preview.jpeg` — shows uploaded file in list, but PDC Trimestral still renders *stale* units from a previous session ("Los animales del Gran Chaco Boliviano") instead of the freshly uploaded Language PDF.
- Full network + bodies: `D:\Temp\opencode\qa_network.json`.
- Test reports: `D:\Temp\opencode\qa_report.json`, `D:\Temp\opencode\qa_report_v3.json`.
- Saved HTML snapshots: `D:\Temp\opencode\wizard_fresh_after_upload.html`, `D:\Temp\opencode\materiales_fresh_after_upload.html`.

## Workaround

None. Uploading the same PDF multiple times (different filenames or identical) consistently returns 0 units.

## Suggested fix area

The recent client-side extraction refactor in the wizard calls `GET /api/materials/{id}/units` after upload, but:

1. That endpoint returns `units_json` directly from the `materials` row — extraction must have already run and written `units_json` at upload time or via a background job.
2. The AI extraction endpoint (separately confirmed working by the Tech Lead) is not being invoked by the upload pipeline — or it is invoked but its output is not persisted to `materials.units_json`.
3. Check the upload handler in `server/` for the POST `/api/materials/` route: does it trigger extraction synchronously / async / never? Then check the wizard's `WizardPage.tsx` for the client-side flow after a successful POST — it queries the new `/units` endpoint and renders empty state on `[]`.

### Suspect code paths (verified by reading the saved HTML, not file access)

- Server: `POST /api/materials/` handler — does not trigger or persist extraction.
- Client: `WizardPage.tsx` (renders the empty-state message) and the post-upload fetch.
- Client: `materiales` page reads `units_json` from the materials list; since it's `null` for all rows, no preview ever refreshes.

## Console / errors

No client-side console errors during the bug. Only 1 unrelated 404 (likely `/icon-192.png` from PWA manifest), and zero `requestfailed` events. The failure is silent: the empty array is a valid 200 response, so no error is surfaced.
