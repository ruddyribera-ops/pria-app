# PRIA v10 — Educational AI Content Generator

Genera automáticamente materiales didácticos neuro-inclusivos (síntesis, planes de clase, evaluaciones, diapositivas, quizzes, fichas gamificadas) usando IA de MiniMax.

## Development Setup

### Prerequisites
- Node.js 22+
- Docker Desktop (for local PostgreSQL)

### Quick start

\\\powershell
# 1. Start PostgreSQL
.\scripts\start-db.ps1

# 2. Install dependencies
cd server; npm install; cd ..
npm install

# 3. Copy env files
copy .env.example .env
copy server\.env.example server\.env
# Edit both .env files with your secrets (MINIMAX_API_KEY goes in server\.env)

# 4. Start dev server (backend + frontend)
npm run dev

# 5. Run tests
cd server; npm test; cd ..
\\\

### Useful commands

| Command | Description |
|---------|-------------|
| \.\scripts\start-db.ps1\ | Start local PostgreSQL via Docker |
| \.\scripts\stop-db.ps1\ | Stop PostgreSQL (data persists) |
| \cd server; npm run dev; cd ..\ | Start backend (port 3000) + frontend (port 5173) |
| \cd server; npm test; cd ..\ | Run backend unit tests (vitest) |
| \
px tsc --noEmit\ | Typecheck frontend |

### Default credentials (development)

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | admin |
| ruddy | profesor123 | teacher |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Express + TypeScript |
| Database | PostgreSQL 16 |
| AI | MiniMax M2.7 API |
| Presentation | PptxGenJS |

## Project Structure

\\\
PRIA v10/
├── server/               # Express API (port 3000)
│   └── src/
│       ├── db/           # PostgreSQL connection + schema
│       ├── motores/      # Motor prompt files + mock generators
│       │   └── prompts/  # Rich system prompts per motor
│       ├── routes/       # API endpoints (auth, motores, materials, ...)
│       └── schemas/      # Zod validation schemas
├── src/                 # React SPA (port 5173)
│   ├── api/             # Axios client + typed API calls
│   ├── components/      # React components
│   │   ├── Auth/        # Login, protected routes
│   │   ├── Layout/      # Header, Sidebar, AppLayout
│   │   ├── Materials/   # Upload, file list, curriculum preview
│   │   ├── Motores/     # Motor result sections
│   │   └── UI/          # Button, Input, Modal, Toast, ...
│   ├── hooks/           # useAuth, useCurriculum, useMotorGenerator
│   ├── lib/             # AI client, PPTX generator, document ingester
│   └── pages/           # Route-level page components
├── docker-compose.yml   # Local PostgreSQL setup
├── scripts/             # Dev helper scripts
└── .github/workflows/   # GitHub Actions CI
\\\

## API Endpoints

### Authentication
- \POST /api/auth/login\ — Login
- \POST /api/auth/register\ — Register
- \GET /api/auth/me\ — Current user

### Motors (AI generation)
- \POST /api/motores/:type\ — Generate content (12 motor types)
- \GET /api/motores/history\ — Generation history

### Materials
- \GET /api/materials\ — List uploaded files
- \POST /api/materials\ — Upload file
- \DELETE /api/materials/:id\ — Delete file

## Environment Variables

### Root \.env\
| Variable | Description |
|----------|-------------|
| \VITE_API_URL\ | Frontend → backend URL (default: /api) |

### Server \server/.env\
| Variable | Description |
|----------|-------------|
| \DATABASE_URL\ | PostgreSQL connection string |
| \JWT_SECRET\ | Secret for JWT signing |
| \JWT_EXPIRY\ | Token expiry (e.g. 24h) |
| \MINIMAX_API_KEY\ | MiniMax API key |
| \CORS_ORIGIN\ | Allowed frontend origin |