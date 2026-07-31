# QA Summary — PRIA v10

**Project:** pria-v10
**Date:** 2026-07-08
**QA Engineer**

## Active bugs

### bug-001-upload-413-nginx — [FAIL: HIGH]
- **Status:** Filed, awaiting code-builder fix
- **Feature:** Materiales — PDF upload
- **Symptom:** "Error al subir el material. Intenta de nuevo." for any PDF >1 MB
- **Root cause:** `nginx.conf` missing `client_max_body_size` (default 1 MB, route allows 50 MB)
- **Fix:** Add `client_max_body_size 50M;` to nginx.conf + improve frontend catch to surface 413
- **Production risk:** HIGH — same issue likely on Railway reverse proxy if any

## Tests executed this session

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | Login as m.gonzalez / docente123 | [PASS: HIGH] | Token issued, /api/auth/me 200 |
| 2 | GET /api/materials/ | [PASS: HIGH] | Returns 200, list rendered |
| 3 | Direct curl upload 288 B PDF | [PASS: HIGH] | 200, file written to /app/uploads/ |
| 4 | Direct curl upload 2 MB PDF | [PASS: HIGH] | 200, file written |
| 5 | UI upload 2.1 KB PDF (vite-served, actually HTML) | [PASS: HIGH] | 200, listed in UI |
| 6 | UI upload 2 MB PDF | **[FAIL: HIGH]** | nginx 413, generic toast shown |
| 7 | curl through nginx 500 KB | [PASS: HIGH] | 200 (under 1 MB default) |
| 8 | curl through nginx 1.5 MB | **[FAIL: HIGH]** | 413 |
| 9 | curl through nginx 2 MB | **[FAIL: HIGH]** | 413 |

## Sign-off status

- **Materiales / Upload:** ❌ **NOT READY** — bug-001 blocks real-world textbook uploads
- All other features: not yet tested this session
