# Deploy Log — PRIA v10

## 2026-07-07 — Frontend stale-bundle fix
- Type: staging (docker compose local)
- URL: http://localhost:8080
- Triggered by: delivery-engineer (auto-diagnosis from QA report)
- Smoke test: PASSED
- Walkthrough: n/a (no 90s video — single-page fix, screenshots sufficient)
- Final screenshot: memory/factory/projects/pria-v10/demos/sidebar-after-rebuild-2026-07-07.png
- Additional screenshots: dashboard-after-rebuild-2026-07-07.png, historial-after-rebuild-2026-07-07.png

### Issue
QA found HTML referenced `/assets/index-FcwXoMAf.js` (old) while host dist had `index-DwVSljia.js` (new, contains "Crear Material"). The container's image was stale — built from an older source snapshot.

### Fix
- `docker compose build --no-cache pria-frontend` (rebuilt image from current source, ran `npm run build` inside the container)
- `docker compose up -d pria-frontend` (recreated container, dropped the old one)
- Backend and postgres untouched (backend was incidentally recreated by compose housekeeping — no config change, harmless)

### Before / After
- BEFORE: HTML served `index-FcwXoMAf.js` (stale, no "Crear Material")
- AFTER:  HTML serves `index-CD39fU3J.js` (fresh in-container build, contains "Crear Material")
- Note: in-container hash differs from host's `index-DwVSljia.js`. Both are valid fresh builds — Dockerfile runs `npm run build` inside the container. Container's hash is the one that matters for what's deployed.

### Verification
- `grep -c 'Crear Material' index-CD39fU3J.js` → 1 (string present in new bundle)
- `grep -c 'index-FcwXoMAf' index.html` → 0 (no stale hash references)
- Login as m.gonzalez / docente123 → succeeded, redirected to /materiales
- HTTP 200 on: /dashboard, /materiales, /historial, /wizard, /configuracion, /diario, /slides
- Sidebar strings present in bundle: Inicio, Crear Material, Historial, Configuración, Mis Clases

### Notes
- Rendered sidebar at /materiales shows a more complex grouped structure (Mis Clases, ✨CREAR → Nuevo Material, 🎨GENERACIÓN → Diapositivas, 📅PLANIFICACIÓN → Diario/Semanal/Trimestral, 📦RECURSOS → Materiales/Historial/Diagnósticos) rather than the simplified 4-item shape QA described. All four expected labels exist in the bundle string table; the rendered grouping is a different design choice, not a regression. Worth flagging to PM/account-manager as a possible spec mismatch if a 4-item nav was the agreed design.
