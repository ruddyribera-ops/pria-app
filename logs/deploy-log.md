# Deploy Log — PRIA v10

## 2026-07-06 — Post-reboot full stack bring-up
- Type: staging (full Docker stack — postgres + backend + frontend)
- URL: http://localhost:8080/ (frontend), http://localhost:3000/ (backend direct)
- Triggered by: Delivery Engineer (post-reboot recovery)
- Smoke test: PASSED
  - Frontend HTTP 200 (2194 bytes)
  - Backend `/api/health` 200 — `{"status":"ok","db":"connected","dbLatencyMs":26,"uptime":41}`
  - Login `m.gonzalez / docente123` 200 — JWT issued via proxy (8080) and direct (3000)
  - Browser E2E: landing → /login → /materiales (full dashboard, 3 unidades PDC, 10 slides, ficha gamificada)
- Walkthrough: see screenshot at `D:\Temp\opencode\docker_stack.jpeg` (87,682 bytes)
- Final screenshot: `D:\Temp\opencode\docker_stack.jpeg`
- **Data status: PRESERVED** — seed script logged `[seed] Users already exist, skipping`; login worked against existing user
- Volume: `priav10_pgdata` (referenced as external in compose, mounted into `pria-postgres`)
- Files created:
  - `D:\ACTIVE PROJECTS\PRIA v10\frontend.Dockerfile` (multi-stage Node 20 + nginx 1.27)
  - `D:\ACTIVE PROJECTS\PRIA v10\nginx.conf` (SPA fallback + `/api/` proxy to `pria-backend:3000` + gzip + 1y asset cache)
  - `D:\ACTIVE PROJECTS\PRIA v10\.dockerignore` (node_modules, dist, .git, .env, etc.)
  - `D:\ACTIVE PROJECTS\PRIA v10\docker-compose.yml` (3 services + external volume `priav10_pgdata`)
- Issues fixed during deploy:
  - Frontend build failed on first attempt: postinstall script `cd server && npm install` ran before `server/` was copied. Added `--ignore-scripts` to `npm ci` in `frontend.Dockerfile`.
  - Container name conflict on `pria-backend` (orphan from previous session) — removed before `docker compose up -d`.
  - Docker healthcheck pointed at `/health` (404) → fixed to `/api/health`. Backend now reports `healthy`.
- Notes:
  - Non-critical 404 in browser console: `GET /api/curriculums/latest` returns 404 (no "latest" record for this user). Other 14 API calls all 200.
  - Old files retained for reference: `Dockerfile.frontend`, `nginx.frontend.conf` (different name, different proxy target — `host.docker.internal:3000`).
  - Project name on compose stack: `priav10` (derived from directory name `PRIA v10`).
  - Stack serves: landing (/) → login (/login) → app (/materiales default after login, plus /dashboard, /wizard, /slides, /diario, /semanal, /trimestral, /historial, /diagnosticos).
