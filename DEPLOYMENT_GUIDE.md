# PRIA v7 Deployment Guide

This guide covers local development, Docker deployment, and production deployment to Railway.

**Table of Contents:**
1. [Local Development](#local-development)
2. [Docker Local Deployment](#docker-local-deployment)
3. [Railway Staging Deployment](#railway-staging-deployment)
4. [Railway Production Deployment](#railway-production-deployment)
5. [Database Migrations](#database-migrations)
6. [Health Checks](#health-checks)
7. [Troubleshooting](#troubleshooting)

---

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

### Backend Setup

```powershell
# Navigate to backend directory
cd D:\pria-v7\backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Create .env.local file
copy ..\env.example .env.local

# Edit .env.local with your settings
# For local development, use:
$env:DATABASE_URL = "sqlite:///./test.db"
# or
$env:DATABASE_URL = "postgresql://user:password@localhost:5432/pria_v7"

# Run migrations
python -m alembic upgrade head

# Start backend server
python -m uvicorn app.main:app --reload --port 8000
```

Backend will be available at: **http://localhost:8000**
- API Docs: http://localhost:8000/api/docs
- Health: http://localhost:8000/api/health/live

### Frontend Setup

```powershell
# Open new PowerShell terminal
cd D:\pria-v7\frontend

# Install dependencies
pnpm install

# Create .env.local file (optional)
# Default NEXT_PUBLIC_API_URL is http://localhost:8000

# Start development server
pnpm dev
```

Frontend will be available at: **http://localhost:3000**

### Access Application

1. Open http://localhost:3000 in browser
2. Register new account
3. Login with credentials
4. Navigate to Dashboard

---

## Docker Local Deployment

### Prerequisites

- Docker Desktop installed and running
- Docker Compose available

### Start All Services

```powershell
# Navigate to project root
cd D:\pria-v7

# Create .env.local file if not exists
if (-Not (Test-Path ".env.local")) {
    Copy-Item ".env.example" ".env.local"
}

# Start services in background
docker-compose up -d

# Check service status
docker-compose ps

# Expected output:
# NAME                STATUS              PORTS
# pria_postgres       Up (healthy)        5432
# pria_redis          Up (healthy)        6379
```

### Access Services

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8000
- **API Docs:** http://localhost:8000/api/docs
- **PostgreSQL:** localhost:5432 (user: pria_dev, password: pria_dev_password_123)
- **Redis:** localhost:6379

### Run Migrations

```powershell
# Run database migrations
docker exec pria_backend python -m alembic upgrade head

# Check migration status
docker exec pria_backend python -m alembic current
```

### View Logs

```powershell
# Backend logs
docker logs -f pria_backend

# Frontend logs
docker logs -f pria_frontend

# All logs
docker-compose logs -f
```

### Stop Services

```powershell
# Stop all services (keeps data)
docker-compose down

# Stop and remove volumes (wipes data)
docker-compose down -v
```

---

## Railway Staging Deployment

### Prerequisites

1. **Railway Account** — Sign up at https://railway.app
2. **Railway CLI** — Install globally:

```powershell
npm install -g @railway/cli
```

3. **GitHub Repository** — Push code to GitHub

4. **Environment Variables** — Set in Railway dashboard:
   - `SECRET_KEY` — Generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
   - `GEMINI_API_KEY` — Get from Google Cloud Console
   - `DATABASE_URL` — Railway will generate PostgreSQL connection string
   - `REDIS_URL` — Railway will generate Redis connection string

### Automatic Deployment (GitHub Actions)

On every push to `main` branch, GitHub Actions will:
1. Run tests
2. Build Docker images
3. Deploy to Railway staging
4. Run database migrations
5. Health check (retry 3x, max 30s)
6. Notify Slack on success/failure

### Manual Deployment

```powershell
# Login to Railway
railway login

# Link project (first time only)
railway link

# Deploy all services
railway up --service backend --service frontend --service postgres

# Monitor logs
railway logs --service backend -f
railway logs --service frontend -f
```

### View Deployed Application

```powershell
# Get Railway project URL
railway open

# Test health endpoint
$deploymentUrl = "https://pria-v7-staging.railway.app"
Invoke-RestMethod "$deploymentUrl/api/health/live"
```

### Rollback

If deployment fails:

```powershell
# List recent deployments
railway deployments

# Rollback to previous version
railway deploy --skip-build --tag <previous-tag>
```

---

## Railway Production Deployment

### Prerequisites

1. All staging prerequisites
2. **Railway environment variables** configured
3. **Database backup** before migrations

### Manual Production Deployment

```powershell
# Login to Railway
railway login

# Switch to production environment
railway env:switch production

# Deploy
railway up --service backend --service frontend --service postgres

# Run migrations
railway exec alembic upgrade head

# Health check
Invoke-RestMethod "https://pria-v7.railway.app/api/health/live"
```

### Protected Deployment

Only the `main` branch can deploy to production. Create a pull request, get approval, then merge to `main`.

```powershell
# Merge to main triggers automatic deployment
git push origin feature-branch
# ... create PR, get approval, merge ...
```

---

## Database Migrations

### Create New Migration

```powershell
cd D:\pria-v7\backend

# Generate migration file
python -m alembic revision --autogenerate -m "description of changes"

# Edit alembic/versions/XXXX_description.py as needed
```

### Apply Migrations

```powershell
# Development
python -m alembic upgrade head

# Docker
docker exec pria_backend python -m alembic upgrade head

# Railway
railway exec alembic upgrade head
```

### Rollback Migration

```powershell
# Rollback one version
python -m alembic downgrade -1

# Rollback to specific version
python -m alembic downgrade <version>

# Check current version
python -m alembic current
```

---

## Health Checks

### API Health Endpoints

```powershell
# Liveness check (is service running?)
$response = Invoke-RestMethod "http://localhost:8000/api/health/live"
Write-Output $response

# Readiness check (is service ready to handle requests?)
$response = Invoke-RestMethod "http://localhost:8000/api/health/ready"
Write-Output $response

# Root endpoint
$response = Invoke-RestMethod "http://localhost:8000"
Write-Output $response
```

### Expected Response

```json
{
  "status": "healthy",
  "timestamp": "2026-05-07T10:30:45Z",
  "uptime": 3600.5
}
```

---

## Troubleshooting

### Backend Won't Start

```powershell
# Check if port 8000 is in use
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue

# Kill process on port 8000 (Windows)
Stop-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess -Force

# Clear pip cache
pip cache purge

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Database Connection Error

```powershell
# Test PostgreSQL connection
psql -h localhost -U pria -d pria_v7

# Check environment variables
$env:DATABASE_URL
Write-Output $env:DATABASE_URL

# Verify PostgreSQL is running
docker ps | Select-String postgres
```

### Docker Compose Issues

```powershell
# Rebuild services
docker-compose build --no-cache

# Remove all containers and volumes
docker-compose down -v

# Restart services
docker-compose up -d

# Check service health
docker-compose ps
```

### Frontend Build Fails

```powershell
# Clear Next.js cache
Remove-Item -Recurse -Force "D:\pria-v7\frontend\.next"

# Reinstall dependencies
cd D:\pria-v7\frontend
Remove-Item -Recurse -Force "node_modules"
pnpm install
pnpm build
```

### Migration Stuck

```powershell
# Check migration status
python -m alembic current

# Downgrade to previous version
python -m alembic downgrade -1

# Re-apply migrations
python -m alembic upgrade head
```

---

## CI/CD Pipeline

### GitHub Actions Workflows

**test.yml** — Runs on every push and PR:
1. Backend tests (pytest)
2. Frontend linting (ESLint)
3. Frontend build (Next.js)
4. Type checking (mypy, tsc)

**deploy.yml** — Runs on main branch push:
1. Build Docker images
2. Run tests
3. Deploy to Railway staging
4. Run migrations
5. Health checks
6. Slack notification

### Monitor Workflows

1. Go to GitHub repository
2. Click "Actions" tab
3. View workflow runs

### View Logs

```powershell
# GitHub Actions logs visible in web UI
# Or download logs from workflow run details
```

---

## Performance Monitoring

### API Response Times

```powershell
# Measure API endpoint response time
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
Invoke-RestMethod "http://localhost:8000/api/pdc/"
$stopwatch.Stop()
Write-Output "Response time: $($stopwatch.ElapsedMilliseconds)ms"

# Target: <200ms for all endpoints
```

### Database Query Performance

Check PostgreSQL query logs:

```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- View logs
SELECT * FROM pg_logs;
```

### Docker Resource Usage

```powershell
# Check container resource usage
docker stats

# Limit container resources
docker-compose -f docker-compose.prod.yml up -d --limit pids=512 --limit cpus=2 --limit memory=2g
```

---

## Backup & Restore

### Database Backup

```powershell
# Local backup
docker exec pria_postgres pg_dump -U pria_dev pria_v7 > backup.sql

# Restore from backup
docker exec -i pria_postgres psql -U pria_dev pria_v7 < backup.sql

# Railway backup
railway backup create

# Railway restore
railway backup restore <backup-id>
```

---

## Environment Checklist

Before deploying to production:

- [ ] SECRET_KEY set and strong (32+ characters)
- [ ] GEMINI_API_KEY configured
- [ ] DATABASE_URL points to production database
- [ ] REDIS_URL points to production Redis
- [ ] ALLOWED_ORIGINS includes production domain
- [ ] All tests passing (≥80% coverage)
- [ ] Docker images build successfully
- [ ] Database migrations run without errors
- [ ] Health checks passing
- [ ] No console errors or warnings
- [ ] Performance acceptable (<200ms API response)

---

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review logs: `docker-compose logs -f`
3. Check GitHub Actions: https://github.com/your-repo/actions
4. Contact DevOps team

---

**Last Updated:** 2026-05-07
**Maintained by:** PRIA v7 Team
