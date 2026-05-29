# PRIA v10 — Project Memory (Updated 2026-05-27)

## Overview
AI lesson-planning assistant for Las Palmas teachers. Upload textbook PDFs/JPEGs → browser OCR → 12 AI motors generate curriculum, slides, assessments, etc.

## Tech Stack
- Frontend: React 19 + TypeScript + Vite 5 (dev :5173)
- Backend: Express + TypeScript (tsx) (prod :3000)
- Database: PostgreSQL via pg.Pool (Docker `pria-pg` on :5432) or SQLite for local dev
- AI: MiniMax M2.7 API (`MINIMAX_API_KEY` in `server/.env`)
- PDF OCR: pdfjs-dist (browser)
- Image OCR: tesseract.js eng+spa (browser)
- Error tracking: Sentry (optional, via `SENTRY_DSN` env var)

## Entry Points
- Dev frontend: `npm run dev` (Vite proxy → :3000)
- Backend (dev): `npx tsx server.js`
- Production: `npm start` (NODE_ENV=production tsx server.js)
- Railway deployment via Railway.toml (nixpacks builder)

## Database
- Default: `sqlite://./prisa.db` (local dev, no FK support)
- Production: `postgresql://postgres:pria_local@localhost:5432/pria`
- Docker: `docker start pria-pg`
- **Migration system (Sprint 1):** `server/src/db/migrations/` + `server/src/db/migrate.ts`

## Key Files
```
server/src/
├── db/
│   ├── migrations/
│   │   └── 001_initial.sql   — complete schema with FKs + TIMESTAMPTZ
│   ├── migrate.ts            — migration runner with tracking table
│   ├── schema.ts             — dbAll, dbGet, dbRun (migrations replaced initDB)
│   ├── connection.ts         — pg.Pool setup
│   └── seed.ts              — admin-only seed
├── routes/
│   ├── auth.ts              — login, register, me, patch-me (AuthRequest typed)
│   ├── materials.ts         — CRUD for uploaded textbooks
│   ├── curriculums.ts       — curriculum management
│   └── motores.ts           — 12 AI motors (MOTOR_TEMPS table)
├── middleware/
│   ├── auth.ts              — authMiddleware, AuthPayload interface
│   ├── errorHandler.ts       — sanitized error responses
│   └── rateLimiter.ts        — motorLimiter, authLimiter
├── motores/
│   ├── mocks.ts             — 12 mock generators (all Zod-validated)
│   └── prompts/             — motor prompt templates on disk
└── schemas/                 — Zod validation schemas

src/
├── api/                — client, auth, materials, admin, motores
├── lib/
│   ├── ingest/
│   │   └── documentIngester.ts  — ingestDocument/Pdf/Image with onProgress
│   └── pptx/
│       ├── promptRunner.ts  — executePrompt + executePromptStreaming (no ?raw)
│       └── generator.ts     — PPTX generation
├── hooks/
│   └── useMotorGenerator.ts — typed showToast (no as any cast)
└── pages/
    └── HistoryPage.tsx     — shows result_json_preview (real content)

.deploy/
├── Railway.toml        — Railway deployment config
├── docker-compose.yml  — PostgreSQL only
├── .github/workflows/test.yml — CI with E2E smoke tests
├── e2e/smoke.spec.ts   — Playwright smoke tests
├── PRODUCTION_CHECKLIST.md — deployment guide
└── KNOWN_ISSUES.md     — accepted tradeoffs
```

## Current Sprint Status (Sprint 8 — Final)
- Sprint 0 ✅ DONE — All fake data removed
- Sprint 1 ✅ DONE — Database migrations, FKs, TIMESTAMPTZ
- Sprint 2 ✅ DONE — Real textbook pipeline (JSON upload, OCR progress bar, MAX_PDF_PAGES=50, warnings UI)
- Sprint 3 ✅ DONE — Prompt cleanup (dead ?raw imports removed, streaming.ts merged, temperature table)
- Sprint 4 ✅ DONE — Security hardening (helmet, CSP, error sanitization, no as any)
- Sprint 5 ✅ DONE — Testing (12 mock generators vs Zod, MotorButton component tests)
- Sprint 6 ✅ DONE — UI polish (HistoryPage real JSON, skeleton, version 10.0.0)
- Sprint 7 ✅ DONE — Infrastructure (Railway.toml, CI+E2E, docker-compose, Sentry)
- Sprint 8 ✅ DONE — Production deploy (PRODUCTION_CHECKLIST.md, KNOWN_ISSUES.md, project_active.md updated)

## Verified Working
- Login/logout with JWT ✅
- MiniMax M2.7 API (key in `server/.env`) ✅
- Browser OCR (pdfjs-dist + tesseract.js) ✅
- 12 motor Zod schemas with validation ✅
- Rate limiting (motor + auth limiters) ✅
- Health check endpoint ✅
- Helmet security headers ✅
- All 24 mock generators pass Zod validation ✅
- MotorButton component tests pass ✅

## Danger Zones
- `server.js` vs `server/src/index.ts`: Two entry points. `server.js` is authoritative for production.
- `dbRun` returns `{ id }` (not `lastInsertRowid`) — changed in Sprint 1
- `server/.env` controls actual runtime config (not root `.env`)
- `promptRunner.ts` no longer imports ?raw (Sprint 3 removed them)
- `useMotorGenerator` showToast typed to specific union (no more `as any`)

## Design Constraints
- Spanish-first UI text, English code identifiers
- MiniMax API key strictly server-side (never in frontend bundle)
- Motor generation always routes through backend /motores/{type} endpoint
- Frontend promptRunner does NOT load prompts — backend owns all prompts

## Deployment
- Railway: `railway login && railway up`
- Health check: GET /api/health → { status: "healthy", version: "10.0.0" }
- Admin password: Check Railway startup logs OR set ADMIN_PASSWORD env var
- CORS_ORIGIN must match Railway deployment URL