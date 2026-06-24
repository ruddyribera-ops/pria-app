# PRIA v10 — Public Demo Deployment Guide

> Sprint A Phase 2: Make PRIA accessible via public URL for organic user testing.

## 🎯 Goal

Get PRIA running at a **public URL** so:
- Anyone (teachers, parents, investors) can try it without signup
- Organic feedback collection
- Self-service pilot (vs active outreach)

## 📋 Prerequisites

- [x] GitHub repo: https://github.com/ruddyribera-ops/pria-app
- [x] Railway CLI installed (`railway --version` → 4.36.1)
- [x] Database (PostgreSQL) ready locally
- [x] MiniMax API key configured
- [x] Backend + frontend working locally

## 🚀 Deployment Options (Pick One)

### Option A: Railway.app (recommended)

**Pros**: Free tier, automatic deploys from GitHub, PostgreSQL included
**Cons**: Requires Railway account (auth refresh needed)

```bash
# 1. Login (refresh session)
railway login

# 2. Initialize project
railway init --name pria-v10-demo

# 3. Add PostgreSQL
railway add --plugin postgresql

# 4. Set env vars
railway variables set \
  JWT_SECRET=$(openssl rand -hex 32) \
  MINIMAX_API_KEY=$MINIMAX_API_KEY \
  DATABASE_URL=$DATABASE_URL \
  NODE_ENV=production \
  CORS_ORIGINS=https://pria-v10-demo.up.railway.app

# 5. Deploy
railway up

# 6. Get URL
railway domain
```

### Option B: Render.com

**Pros**: Simpler UI, free tier
**Cons**: Slower cold starts

1. Connect GitHub repo: `ruddyribera-ops/pria-app`
2. Create `Web Service` for backend (root directory: `server`)
3. Create `Static Site` for frontend (root directory: `.`, build: `npm run build`)
4. Create `PostgreSQL` database
5. Set env vars (same as Railway)

### Option C: Self-hosted VPS (most control)

**Pros**: Full control, no platform lock-in
**Cons**: Manual setup, security responsibility

```bash
# On Ubuntu 22.04 VPS:
# 1. Install dependencies
sudo apt update
sudo apt install -y nodejs npm postgresql nginx certbot python3-certbot-nginx

# 2. Clone repo
git clone https://github.com/ruddyribera-ops/pria-app.git /opt/pria
cd /opt/pria
npm install
cd server && npm install && cd ..

# 3. Setup PostgreSQL
sudo -u postgres createuser pria
sudo -u postgres createdb pria -O pria
sudo -u postgres psql -c "ALTER USER pria WITH PASSWORD 'strongpass';"

# 4. Run migrations + seed
cd server
npm run migrate
npm run seed

# 5. Build frontend
cd /opt/pria
npm run build

# 6. Start with PM2
sudo npm install -g pm2
pm2 start server/dist/index.js --name pria-backend
pm2 start "npx serve dist -s 3000" --name pria-frontend

# 7. Setup Nginx + SSL
sudo certbot --nginx -d pria.yourdomain.com
```

### Option D: Local + ngrok (fastest, demo-only)

**Pros**: 5-minute setup
**Cons**: URL changes on restart, not production-grade

```bash
# 1. Install ngrok
npm install -g ngrok

# 2. Start PRIA locally
./start-servers.ps1

# 3. Expose to public URL
ngrok http 5173

# Output: https://abc123.ngrok-free.app
# Share this URL — anyone can try PRIA!
```

## 🎯 Recommended Path: Option A (Railway) + Fallback D (ngrok)

### Quick Win: ngrok (5 minutes)
For immediate testing while Railway auth is sorted out.

### Proper Deploy: Railway (1-2 hours)
Once Railway session is active.

## 📊 What to Deploy

### Required Services
1. **PostgreSQL database** (with sample data seeded)
2. **Backend** (Express + tsc build)
3. **Frontend** (Vite static build)
4. **Reverse proxy / SSL** (Caddy, Nginx, or Railway-provided)

### Required Environment Variables

**Backend**:
```
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/pria
JWT_SECRET=<random-32-bytes>
MINIMAX_API_KEY=<your-key>
NODE_ENV=production
CORS_ORIGINS=https://your-frontend-url.com
```

**Frontend** (Vite):
```
VITE_API_URL=https://your-backend-url.com
```

## 🧪 Pre-Deploy Checklist

- [ ] All env vars set
- [ ] Database migrations run
- [ ] Sample data seeded
- [ ] Backend builds (`npm run build`)
- [ ] Frontend builds (`npm run build`)
- [ ] CORS configured
- [ ] JWT_SECRET is strong (not default)
- [ ] MINIMAX_API_KEY is valid
- [ ] Logs accessible (Railway dashboard / PM2 logs)
- [ ] Health check works (`GET /api/health`)

## 🌐 Post-Deploy

1. Test all motor endpoints from public URL
2. Test CORS (frontend can hit backend)
3. Check SSL certificate
4. Monitor first 24h for errors
5. Add error tracking (Sentry)

## 📣 Marketing the Public URL

Once deployed, share the URL in:
- WhatsApp groups of teachers
- Bolivian education forums
- Social media
- Direct outreach to schools

Ask users to:
1. Sign up with their school email
2. Try 1 class generation
3. Give 2-min feedback (inline form)

## ⚠️ Cost Estimate

**Railway free tier**:
- 500 hrs/month compute
- $5 credit/month
- Estimated: $0-5/month for small traffic

**Render free tier**:
- 750 hrs/month
- Static site free
- PostgreSQL: $7/month after 90 days

**Self-hosted VPS**:
- Hetzner: $4-8/month
- DigitalOcean: $6-12/month
- Linode: $5-10/month

## 🚦 When to Deploy

**Now** (if you want immediate feedback):
- ngrok → 5 minutes
- Railway → 1-2 hours (need auth refresh)

**After Security Sprint** (recommended):
- Update 30 → 5 vulnerabilities
- Then deploy with confidence
- Total: 1-2 days

## 📞 Need Help?

If Railway auth issue persists:
1. `railway logout && railway login` (browser flow)
2. Use Render instead (simpler)
3. Use ngrok for instant testing

---

*Last updated: 2026-06-23 — Sprint A*