# PRIA v7 — Development Setup Guide

## Prerequisites

- Node.js 18+ (for frontend)
- Python 3.9+ (for backend)
- Docker & Docker Compose (for PostgreSQL + Redis)
- Git

## Week 1 Setup — Getting Started

### Step 1: Start Infrastructure (Docker)

```bash
cd /d/pria-v7
docker-compose up -d

# Verify services are running
docker ps

# Check PostgreSQL is healthy
docker-compose ps postgres
```

PostgreSQL is now running on `localhost:5432`
Redis is now running on `localhost:6379`

### Step 2: Backend Setup

```bash
cd /d/pria-v7/backend

# Create virtual environment
python -m venv venv
source venv/Scripts/activate  # On Windows PowerShell: .\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Copy .env.example to .env
copy .env.example .env

# Initialize database (creates all tables)
python -m app.database

# Expected output: ✓ Database initialized
```

### Step 3: Start FastAPI Backend

```bash
cd /d/pria-v7/backend

# Run development server (auto-reload on changes)
python -m uvicorn app.main:app --reload --port 8000

# Server should start at http://localhost:8000
# API docs available at http://localhost:8000/api/docs
```

**Test it works:**
```bash
# In another terminal
curl http://localhost:8000/

# Expected response:
# {"message":"PRIA v7 API","version":"0.1.0","docs":"/api/docs"}
```

### Step 4: Frontend Setup

```bash
# Create Next.js project
cd /d/pria-v7
npx create-next-app@latest frontend --typescript --tailwind --app --eslint

# Navigate to frontend
cd frontend

# Install additional dependencies
npm install zustand framer-motion axios date-fns
npm install -D tailwindcss postcss autoprefixer

# Configure Shadcn/ui
npx shadcn-ui@latest init -d

# Install key Shadcn components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add form

# Create .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=PRIA v7
EOF

# Start development server
npm run dev

# Frontend should start at http://localhost:3000
```

### Step 5: Test Full Stack

**Backend test:**
```bash
# Terminal 1 (already running backend)
# Check API docs at http://localhost:8000/api/docs
```

**Frontend test:**
```bash
# Navigate to http://localhost:3000
# Should see Next.js welcome page
```

**Database test:**
```bash
# Connect to PostgreSQL
docker exec -it pria_postgres psql -U pria_dev -d pria_v7

# List tables
\dt

# Expected:
# public | pdcs          | table | pria_dev
# public | schools       | table | pria_dev
# public | users         | table | pria_dev
# public | weekly_plans  | table | pria_dev
```

---

## Project Structure After Week 1

```
pria-v7/
├── docker-compose.yml          (PostgreSQL + Redis)
├── SETUP_GUIDE.md              (this file)
│
├── backend/                    (FastAPI)
│   ├── app/
│   │   ├── main.py             ✅ Server entry point
│   │   ├── database.py         ✅ PostgreSQL config
│   │   ├── auth/
│   │   │   ├── routes.py       ✅ Login/register endpoints
│   │   │   └── utils.py        ✅ Password hashing + JWT
│   │   ├── pdc/
│   │   │   └── routes.py       ✅ PDC CRUD endpoints
│   │   ├── planning/
│   │   │   └── routes.py       ✅ Weekly plan endpoints
│   │   ├── models/
│   │   │   ├── user.py         ✅ User + School models
│   │   │   └── pdc.py          ✅ PDC + WeeklyPlan models
│   │   ├── schemas/
│   │   │   └── auth.py         ✅ Request/response schemas
│   │   └── health/
│   │       └── routes.py       ✅ Health check endpoints
│   ├── requirements.txt         ✅ Python dependencies
│   ├── .env.example             ✅ Environment template
│   └── venv/                    (created by setup)
│
├── frontend/                   (Next.js)
│   ├── app/
│   │   ├── layout.tsx          (to create)
│   │   ├── page.tsx            (to create)
│   │   ├── (auth)/             (to create)
│   │   └── (dashboard)/        (to create)
│   ├── components/
│   │   └── ui/                 (Shadcn/ui)
│   ├── lib/
│   │   └── api.ts              (to create)
│   ├── .env.local              ✅ Frontend config
│   └── package.json            ✅ Dependencies
│
└── .git/                       (version control)
```

---

## Testing Checklist ✅

- [ ] PostgreSQL running (docker ps)
- [ ] Redis running (docker ps)
- [ ] Backend starts without errors (python -m uvicorn app.main:app --reload)
- [ ] API docs work (http://localhost:8000/api/docs)
- [ ] Frontend starts (npm run dev)
- [ ] Home page loads (http://localhost:3000)
- [ ] Database tables created (docker exec ... psql \dt)

---

## Next Steps

**Week 2 starts with:**
1. Create auth UI (login/register pages)
2. Build PDC list page
3. Connect frontend to backend API
4. Implement real login flow

See PRIA_v7_QUICK_START.md for code examples!

---

## Troubleshooting

### PostgreSQL won't connect
```bash
# Check if container is running
docker ps | grep postgres

# Check logs
docker logs pria_postgres

# Restart
docker-compose restart postgres
```

### Python venv issues
```bash
# Delete and recreate
rm -r backend/venv
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows
source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
```

### Next.js port already in use
```bash
# Use different port
npm run dev -- -p 3001
```

### CORS errors from frontend → backend
- Check `ALLOWED_ORIGINS` in backend `.env`
- Should include `http://localhost:3000`
- Restart backend after changing

---

**All set! Your PRIA v7 development environment is ready. 🚀**
