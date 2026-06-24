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

## Testing

### Unit tests (no dependencies)
```bash
npm test -- --testPathPattern="unit"
```

### Integration tests (require PostgreSQL)
```bash
# Start local PostgreSQL first
docker start pria-pg  # or your local setup

# Run all tests including integration
npm test

# Skip integration tests (for CI without a DB)
SKIP_INTEGRATION_TESTS=true npm test
```

### Health endpoint tests
- `health.test.ts` — happy path 200 OK (requires PostgreSQL)
- `health-db-down.test.ts` — 503 path (no DB required, runs in CI)

## Bundle Size

| Chunk | Size | Purpose |
|-------|------|---------|
| index | ~44KB | App shell, router, main UI |
| MaterialesPage | ~78KB | Materials page (was 964KB — reduced via lazy loading) |
| documentIngester | ~429KB | Document parsing (lazy-loaded on upload) |
| pdf-worker | ~457KB | pdfjs-dist library (lazy-loaded; same chunk as pdf.worker.min after Vite processing) |
| pdf.worker.min.mjs | ~1.2MB | pdfjs worker (loaded on demand only) |
| vendor-promptrunner | ~64KB | LLM orchestration (cached separately) |
| vendor-react | ~475KB | React + ReactDOM |
| pptxgen.es | ~365KB | PPTX generation library |

Initial page load: ~690KB (down from ~1.5MB). PDF rendering loads +1.2MB on demand.

**Note on Sentry SDK:** `@sentry/react` is bundled (~70 KB gzipped) regardless of whether `VITE_SENTRY_DSN` is set. This is by design — the SDK is a side-effect import and tree-shaking cannot remove it. The graceful degradation works at runtime (no init = no network calls), but the code is still in the bundle. To reduce this, dynamic-import the Sentry SDK inside the `if (SENTRY_DSN)` block, but this adds complexity for minimal gain in a prototype. Decision: accept the 70 KB.

**Next optimization targets:**
- Vendor splitting for charting libraries (recharts, etc.) if they exceed 200KB
- Code-split the SlideEditor (next biggest after MaterialesPage)

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

## Monitoring & Uptime

The app exposes `GET /api/health` for external monitoring. It returns:
- `200 OK` with `{"status": "ok", "db": "connected", "dbLatencyMs": ..., "responseTimeMs": ..., "timestamp": "..."}` when healthy
- `503 Service Unavailable` with `{"status": "degraded", "db": "disconnected", ...}` when the DB is unreachable

### Setup with UptimeRobot (free tier — recommended)

1. Create an account at https://uptimerobot.com (free tier = 50 monitors, 5-min interval)
2. Add a new monitor:
   - **Type:** HTTP(s)
   - **Friendly name:** PRIA v10 API
   - **URL:** `https://your-app.railway.app/api/health`
   - **Monitoring interval:** 5 minutes
3. Set up alert contacts:
   - Email (default, free)
   - Optional: Slack webhook, Discord webhook, SMS (paid tier)
4. UptimeRobot will email you within 5–10 minutes if the app goes down

### Setup with Better Stack (alternative)

1. Create an account at https://betterstack.com (free tier = 10 monitors, 3-min interval)
2. Add an HTTP monitor pointing to `/api/health`
3. Configure alert channels (email, Slack, PagerDuty)

### What "down" means

| Response | Meaning | Action |
|----------|---------|--------|
| `200` + `status: ok` | App and DB are both healthy | Nothing |
| `503` + `status: degraded` + `db: disconnected` | App is up but DB is unreachable | Check Railway PostgreSQL status |
| Timeout (no response in 30s) | App process is hung | Restart the Railway service |
| `500` | Unhandled exception in the health route itself | Check Railway logs |

### Request IDs

Every API request receives a unique `X-Request-ID` header (UUID v4). If the client supplies this header, its value is honored and echoed back. Use the request ID to grep logs for correlated entries:

```bash
# Example: find all log lines for a specific request
grep "abc123-def456-ghi789" logs.txt
```