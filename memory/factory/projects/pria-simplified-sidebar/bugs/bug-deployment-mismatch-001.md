# Bug — Server is serving OLD bundle, new Sidebar not in production

**Filed by:** QA Engineer
**Date:** 2026-07-07
**Project:** pria-simplified-sidebar
**Feature:** Simplified Sidebar
**Severity:** critical

## Reproduction

1. `npm run build` (rebuilds `dist/` with new Sidebar code from `src/components/Layout/Sidebar.tsx`)
2. Start/serve the app on port 8080
3. Open http://localhost:8080/login in browser
4. Login as `m.gonzalez` / `docente123`
5. Observe sidebar after login

## Expected

- Sidebar shows 4 main items: 📚 Inicio, ➕ Crear Material, 📁 Historial, ⚙️ Configuración
- No nivel/grado selectors in sidebar
- No "Estado del sistema" panel
- Profile is a compact link to /configuracion
- Navigating to /configuracion loads the Configuracion page with Tu cuenta, Nivel educativo, Materiales link, Diagnósticos link, Cerrar sesión

## Actual

- Sidebar shows 9 items: Mis Clases, Nuevo Material, Diapositivas, Diario, Semanal, Trimestral, Materiales, Historial, Diagnósticos
- Nivel/Grado selectors ARE in the sidebar
- "Estado del sistema" panel IS in the sidebar
- Profile is a "Perfil de usuario" expandable button (old design)
- Navigating to `/configuracion` returns **404 Página no encontrada**

## Evidence

**Server response (HTML at /):**
```html
<script type="module" crossorigin src="/assets/index-FcwXoMAf.js"></script>
<link rel="stylesheet" crossorigin href="/assets/index-BZihcDH4.css">
```

**dist/ contents (the build we just ran):**
- `dist/assets/index-DwVSljia.js` (95,303 bytes, 2026-07-07 15:47:50)
- `dist/assets/index-B1HIub15.css` (2026-07-07 15:47:50)

**404 / 200 checks:**
- `HEAD /assets/index-DwVSljia.js` → **404 Not Found** (nginx/1.27.5)
- `HEAD /assets/index-FcwXoMAf.js` → 200 OK
- `GET /configuracion` → 404 Página no encontrada

**Browser-loaded scripts (verified via `document.scripts`):**
```json
["http://localhost:8080/assets/index-FcwXoMAf.js"]
```

**Source code IS correct** (`src/components/Layout/Sidebar.tsx` lines 6-11):
```ts
const NAV_ITEMS = [
  { to: '/dashboard', icon: '📚', label: 'Inicio' },
  { to: '/wizard', icon: '➕', label: 'Crear Material' },
  { to: '/historial', icon: '📁', label: 'Historial' },
  { to: '/configuracion', icon: '⚙️', label: 'Configuración' },
];
```

**dist build IS correct** (verified by string search):
- `dist/index-DwVSljia.js` contains `"Crear Material"`, `"Panel Admin"`, `profileName:Br,profileRole:jr,nav:Jr,...`
- `dist/ConfiguracionPage-D2PDg87C.js` contains `"Tu cuenta"`, `"Nivel educativo"`, `"Cerrar sesi"`, `"Materiales"`, `"Diagn"`

**Screenshots:**
- `D:\Temp\opencode\simplified_sidebar.jpeg` — shows OLD 9-item sidebar
- `D:\Temp\opencode\configuracion_page.jpeg` — shows 404 Página no encontrada

## Workaround

None for end users. Cannot demo new sidebar to client until deployment is fixed.

## Suggested fix area

The deployment pipeline / nginx config. Two likely root causes:

1. **nginx `root` directive points to a different directory** than `D:\ACTIVE PROJECTS\PRIA v10\dist\`. Check nginx config for `root` directive and ensure it matches the project dist.

2. **nginx/browser cache.** The service worker `dist/sw.js` is registered. Service workers can serve stale assets. Verified that unregistering the SW and clearing `caches.delete('workbox-precache-v2-...')` did NOT change the served HTML (the HTML itself points to OLD hashes, so this is server-side, not SW).

**Investigation steps for bug-fixer:**
1. Find where nginx's `root` is pointing (e.g., `nginx.conf`, `sites-enabled/`)
2. Check if there is a deployment step that copies `dist/` to that location
3. Verify the nginx user has read permissions on the new dist files
4. If the deployment script copies to a separate location, run it
5. If nginx points to a symlink, check the symlink target
6. After fix, verify `GET /` returns HTML pointing to `index-DwVSljia.js`
7. Verify `GET /configuracion` returns the configuracion page (not 404)

**Additional sub-finding (not blocking but worth noting):**
- Login redirects to `/materiales` (not `/dashboard`). Source: `src/pages/LoginPage.tsx` line 23 `m("/materiales")`. Should be `/dashboard` per the brief's "After login, take a screenshot of the dashboard" instruction. This is in source code (both new and old builds likely share this).
