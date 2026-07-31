# Dev Workflow - PRIA v10

## New Pattern: Unified Dev

```bash
npm run dev:all
```

This starts both backend and frontend with a single command, both with hot reload.

- Backend: `http://localhost:3000` (tsx watch, no build step)
- Frontend: `http://localhost:5173` (Vite HMR)
- Logs: `logs/dev-backend.log`, `logs/dev-frontend.log`

The terminal shows live log output from both services prefixed with `[BACKEND]` and `[FRONTEND]`.

Press **Ctrl+C** to stop both servers cleanly.

---

## When to Use Each Command

| Command | When to Use |
|---------|-------------|
| `npm run dev:all` | Normal development. Both servers, unified logs. |
| `npm run dev:backend` | Backend only. Frontend already running separately. |
| `npm run dev:frontend` | Frontend only. Backend already running separately. |
| `npm run dev:reset` | Port stuck (EADDRINUSE), or you want a fresh start. Kills both ports then starts both. |
| `npm run port:kill -- 3000` | Surgical: kill whatever is on port 3000 and nothing else. |

---

## Why No `tsc && node dist`?

The `server/package.json` already has:

```json
"dev": "tsx watch src/index.ts"
```

`tsx watch` compiles and runs TypeScript directly, with hot reload on file changes. No build step, no `dist/` folder, no copy commands. Changes to `.ts` files are reflected instantly.

The old `restart-server.ps1` workflow (tsc + xcopy + node dist) is deprecated. Use `npm run dev:all` instead.

---

## Port 3000 Conflict Resolution

If you see `EADDRINUSE` on port 3000:

```bash
npm run port:kill -- 3000
```

Then restart:
```bash
npm run dev:all
```

Or use the nuclear reset:
```bash
npm run dev:reset
```

---

## What `npm run dev:reset` Does

1. Kills ALL processes on port 3000
2. Kills ALL processes on port 5173
3. Waits for kernel to release both ports
4. Starts both servers fresh

Use when ports are genuinely stuck and you need a clean slate.

---

## Logs

Both servers write to the `logs/` directory:

- `logs/dev-backend.log` - backend stdout (tsx watch output)
- `logs/dev-backend.err.log` - backend stderr
- `logs/dev-frontend.log` - frontend stdout (vite output)
- `logs/dev-frontend.err.log` - frontend stderr

The `dev.ps1` script also tails these in real-time with prefix tags.

---

## Backend Health Check

The `dev.ps1` orchestrator polls `http://localhost:3000/api/health` up to 30 seconds for the backend to become ready before starting the frontend. If the backend takes longer, it proceeds anyway and logs a warning.

---

## Killing Stale Processes Manually

Find what's on a port:
```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
```

Kill all listeners on a port (PowerShell):
```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```
