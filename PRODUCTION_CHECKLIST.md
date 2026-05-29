# Production Checklist — PRIA v10

## Required Environment Variables

| Variable | Description | Generate |
|----------|-------------|----------|
| `JWT_SECRET` | Min 32 chars. Used to sign JWT tokens. | `node -e "console.log(require('crypto').randomUUID())"` |
| `DATABASE_URL` | Railway PostgreSQL plugin provides this automatically | — |
| `MINIMAX_API_KEY` | MiniMax API key for AI generation | Get from MiniMax dashboard |
| `SENTRY_DSN` | Optional. Sentry error tracking. | Get from Sentry dashboard |
| `CORS_ORIGIN` | Set to your Railway deployment URL | Railway provides `RAILWAY_PUBLIC_DOMAIN` |

## Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_PASSWORD` | Auto-generated (logged at startup) | Only if you want a specific password |
| `NODE_ENV` | `production` | Set automatically by Railway |
| `PORT` | `3000` | Railway sets `$PORT` dynamically |

## Deployment Steps

1. **Login to Railway:**
   ```bash
   railway login
   railway up
   ```

2. **Add PostgreSQL plugin:**
   - In Railway dashboard: Add plugin → PostgreSQL
   - `DATABASE_URL` will be set automatically

3. **Set environment variables in Railway dashboard:**
   - `JWT_SECRET` (required, min 32 chars)
   - `MINIMAX_API_KEY` (required for AI features)
   - `SENTRY_DSN` (optional)
   - `CORS_ORIGIN` = your Railway URL (e.g., `https://pria-production.up.railway.app`)

4. **Find admin password:**
   - Check Railway deployment logs for: `Admin password: <generated>`
   - Or set `ADMIN_PASSWORD` env var before deploying

5. **Verify deployment:**
   - Health check: `GET /api/health` should return `200 { status: "healthy" }`
   - Login at `/` with admin credentials
   - Upload a real textbook JPEG/PDF in Materiales page
   - Generate a motor (e.g., Síntesis Curricular)

## Post-Deploy Verification

```bash
# Health check
curl https://your-railway-url.up.railway.app/api/health

# Expected response:
# {"status":"healthy","checks":{"database":"ok","server":"ok"},"version":"10.0.0","uptime":...}
```

## Troubleshooting

**Health check fails:** Check Railway logs for startup errors. Verify `DATABASE_URL` is set and PostgreSQL container is running.

**AI generation fails:** Verify `MINIMAX_API_KEY` is set. Without it, motors fall back to simulated output (labeled "⚠️ Simulado").

**CORS errors:** Set `CORS_ORIGIN` to your exact Railway URL (including https://).