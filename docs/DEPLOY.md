# PRIA v10 -- Deployment Guide

## Pre-Deploy Checklist

Run through this BEFORE pushing to production.

### 1. Secrets & Environment
- [ ] `JWT_SECRET` -- set to a fresh `openssl rand -hex 32` value (NOT the placeholder)
- [ ] `MINIMAX_API_KEY` -- set to your real API key (not the placeholder, not committed)
- [ ] `DATABASE_URL` -- set to the Railway Postgres URL
- [ ] `FRONTEND_URL` -- set to the production URL (e.g., `https://pria.example.com`)
- [ ] `VITE_API_URL` -- set to the production URL (frontend -> backend communication)
- [ ] `SMTP_URL` and `FROM_EMAIL` -- set if you want password reset emails to actually send (otherwise reset links will be logged to console)
- [ ] `VITE_SENTRY_DSN` -- set if you want error tracking
- [ ] `RUN_SEED` is **NOT** set (or set to `false`) -- seed should NOT run in production

### 2. Code Health
- [ ] `npm run build` exits 0 (no errors)
- [ ] `npx tsc --noEmit` exits 0 for both client and server
- [ ] All commits are pushed to main
- [ ] No uncommitted secrets in `git status`

### 3. Database
- [ ] Postgres is provisioned (Railway add-on or external)
- [ ] Connection pool is sized appropriately (default 10 connections is usually fine)
- [ ] Migrations will run automatically on first boot (verify by reading `server/src/db/migrations/`)

### 4. Observability
- [ ] Sentry project created (if using)
- [ ] UptimeRobot (or similar) monitor added:
  - URL: `https://your-app.railway.app/api/health`
  - Interval: 5 minutes
  - Alert: email + Slack (if configured)

## Deploy Steps

```powershell
# 1. Verify the build locally
cd "D:\ACTIVE PROJECTS\PRIA v10"
npm run build

# 2. Run smoke test against a local instance (optional but recommended)
npm run dev  # in one terminal
node scripts/smoke-test.js http://localhost:3000  # in another

# 3. Push to Railway
git add .
git commit -m "Deploy v10 -- Phase 1-5 complete"
git push origin main
# Railway auto-detects and deploys

# 4. Wait for Railway to finish (3-5 min typically)
# Check the Railway dashboard for deploy status

# 5. Run smoke test against production
node scripts/smoke-test.js https://your-app.railway.app
```

## Post-Deploy Verification

```powershell
# Health check
curl https://your-app.railway.app/api/health
# Should return: {"status":"ok","db":"connected",...}

# Check Railway logs
# In Railway dashboard -> your service -> Logs
# Look for:
#   - "[SEED] Skipping" (if RUN_SEED is not set)
#   - "[SERVER] Listening on port 3000"
#   - No "ECONNREFUSED" or other errors
```

## Rollback Plan

If something goes wrong post-deploy:

1. **Revert the commit:** `git revert HEAD && git push origin main` (Railway will redeploy the previous version)
2. **Check the database:** If migrations ran on the bad deploy, the schema may be inconsistent. You may need to manually `psql` to inspect.
3. **Communicate:** If users are affected, post in the relevant channel.

## Common Issues

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| 500 errors on every request | DB not connected, check `DATABASE_URL` | Verify Railway Postgres is running |
| 401 on auth requests | JWT_SECRET changed between deploys (invalidate all tokens) | Expected; users must log in again |
| Password reset email not received | `SMTP_URL` not set, link is in server logs | Check Railway logs for the reset link |
| CSP violations in browser console | Third-party scripts blocked | Review the CSP directives in `server/src/middleware/csp.ts` |
| High DB CPU | Rate limit table bloat | Cleanup runs hourly; manual: `DELETE FROM rate_limit_buckets WHERE window_start < NOW() - INTERVAL '1 hour'` |