# Bug — Upload of PDFs >1MB fails with generic error toast (nginx 413, masked as axios parse error)

**Filed by:** QA Engineer
**Date:** 2026-07-08
**Project:** pria-v10
**Feature:** Materiales — upload PDF
**Severity:** high (blocks all real-world textbook uploads)

## Reproduction

1. Open `http://localhost:8080/materiales` in a browser
2. Log in as `m.gonzalez` / `docente123`
3. Click the "📗 Libro de Texto (PDF)" file input
4. Select a real textbook PDF (most are 2-50 MB)
5. Watch Network tab + the toast that appears
6. The toast reads: **"Error al subir el material. Intenta de nuevo."**

**Boundary check (verified):**
- File size 500 KB → 200 OK, file stored, listed in UI ✓
- File size 1.5 MB → **413 Request Entity Too Large** (HTML response) → frontend shows generic error toast ✗
- File size 2 MB → 413, frontend shows generic error toast ✗

## Expected

- File uploads successfully (the route accepts up to 50 MB per multer config)
- Either a success toast, or a clear, specific error if the file is too large (e.g. "El archivo supera el límite de 50 MB")

## Actual

- The Express/multer route never sees the request
- nginx rejects the upload with HTTP 413 and an HTML body
- Axios throws because it expects JSON
- The catch-all in `MaterialesPage.tsx:220-222` shows a generic, useless toast:

  ```js
  } catch {
    showToast('Error al subir el material. Intenta de nuevo.', 'error');
  }
  ```

## Root cause

**`D:\ACTIVE PROJECTS\PRIA v10\nginx.conf` does not set `client_max_body_size`.**

The nginx default is **1 MB**. The multer route in `server/src/routes/materials.ts:23` allows **50 MB**:

```ts
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max
```

The mismatch is silent: nginx rejects the request before it reaches Express, the frontend never sees the real 413 reason, and the user gets a generic error.

## Evidence

### Network — direct curl, 2 MB PDF
```
$ curl -X POST http://localhost:3000/api/materials/ -F "file=@big.pdf;type=application/pdf" -F "tipo=textbook"
{"data":{"id":3,"filepath":"385badb0-...","created":"2026-07-08T01:40:20.904Z"}}
---DIRECT_STATUS:200---
```

### Network — through nginx (8080), 2 MB PDF
```
$ curl -X POST http://localhost:8080/api/materials/ -F "file=@big.pdf;type=application/pdf" -F "tipo=textbook"
<html>
<head><title>413 Request Entity Too Large</title></head>
<body>
<center><h1>413 Request Entity Too Large</h1></center>
<hr><center>nginx/1.27.5</center>
</body>
</html>
---NGINX_STATUS:413---
```

### Browser fetch (same path the UI takes) — 2 MB PDF
```js
POST /api/materials/
→ status: 413
→ ok: false
→ content-type: text/html
→ body: "<html><head><title>413 Request Entity Too Large</title></head>..."
```

### Boundary verification
| File size | Through nginx (8080) | Direct to Express (3000) |
|-----------|----------------------|--------------------------|
| 500 KB    | 200 ✓                | 200 ✓                    |
| 1.5 MB    | **413 ✗**            | 200 ✓                    |
| 2 MB      | **413 ✗**            | 200 ✓                    |
| 50 MB     | **413 ✗** (route unreachable) | would succeed |

### Frontend code that masks the real error
`D:\ACTIVE PROJECTS\PRIA v10\src\pages\MaterialesPage.tsx:217-222`
```tsx
try {
  await uploadMaterial(file, 'textbook');
  await loadMaterials();
} catch {
  showToast('Error al subir el material. Intenta de nuevo.', 'error');
}
```

The `catch {}` swallows the axios error without inspecting `err.response?.status` or `err.message`, so the user never sees "archivo demasiado grande" — only the generic message.

## Recommended fix

**Primary (required):** Add to `D:\ACTIVE PROJECTS\PRIA v10\nginx.conf` inside `server { ... }`:

```nginx
client_max_body_size 50M;
```

Then rebuild the frontend container: `docker compose up -d --build pria-frontend`.

**Secondary (defensive — ship together with the nginx fix):** Improve the frontend catch block in `MaterialesPage.tsx:220` so the user sees a useful message on real backend errors. Suggested:

```tsx
} catch (err: any) {
  const status = err?.response?.status;
  if (status === 413) {
    showToast('El archivo es demasiado grande (máx 50 MB).', 'error');
  } else if (status === 401) {
    showToast('Sesión expirada. Inicia sesión de nuevo.', 'error');
  } else if (!err?.response) {
    showToast('No se pudo conectar al servidor. Revisa tu red.', 'error');
  } else {
    showToast(`Error al subir (${status}). Intenta de nuevo.`, 'error');
  }
}
```

**Also check:** if the production deployment on Railway uses a similar nginx/reverse proxy in front, the same `client_max_body_size` directive must be set there too — otherwise live users will hit this bug. The route allows 50 MB but Railway's default proxy may cap at 1 MB.

## Workaround (until fix lands)

- Users can shrink PDFs to <1 MB before uploading (print-to-PDF with low quality, or use a free compressor)
- Or upload via direct backend port `:3000` (bypasses nginx, but only works inside the Docker network)

## Suggested fix area

- `D:\ACTIVE PROJECTS\PRIA v10\nginx.conf` — add `client_max_body_size 50M;`
- `D:\ACTIVE PROJECTS\PRIA v10\src\pages\MaterialesPage.tsx:220` — improve error message
- Verify production reverse proxy on Railway allows ≥50 MB uploads
