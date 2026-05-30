# PRIA v10 — Project Memory (Updated 2026-05-30)

## Overview
AI lesson-planning assistant for Las Palmas teachers. Upload textbook PDFs/JPEGs → browser OCR → 12 AI motors generate curriculum, slides, assessments, etc.

## Tech Stack
- Frontend: React 19 + TypeScript + Vite 5 (dev :5173)
- Backend: Express + TypeScript (tsx) (server :3000)
- Database: PostgreSQL via pg.Pool (Docker `pria-pg` on :5432)
- AI: MiniMax M2.7 API (`MINIMAX_API_KEY` in `server/.env`)
- PDF OCR: pdfjs-dist (browser)
- Image OCR: tesseract.js eng+spa (browser)
- Error tracking: Sentry (optional, via `SENTRY_DSN` env var)

## Entry Points
- Dev frontend: `npm run dev` (Vite proxy → :3000)
- Backend (dev): `npx tsx server/src/index.ts`
- Production: `npm start` (NODE_ENV=production tsx server/src/index.js)
- Railway deployment via Railway.toml (nixpacks builder)

## Database
- Default: `postgresql://postgres:pria_local@localhost:5432/pria`
- Docker: `docker start pria-pg`
- Migration system: `server/src/db/migrations/` + `server/src/db/migrate.ts`
- Migrations applied: 001 (schema), 002 (rate_limiter), 003 (prompt_version)

## Key Files
```
server/src/
├── db/
│   ├── migrations/
│   │   ├── 001_initial.sql    — complete schema with FKs + TIMESTAMPTZ
│   │   ├── 002_rate_limiter.sql
│   │   └── 003_prompt_version.sql  — prompt_version TEXT column
│   ├── migrate.ts            — graceful23505 handling (no process.exit)
│   ├── schema.ts             — dbAll, dbGet, dbRun (no generic type args)
│   ├── connection.ts         — pg.Pool setup
│   └── seed.ts              — admin-only seed
├── routes/
│   ├── auth.ts              — login with CSRF cookie (SameSite=Strict)
│   ├── materials.ts         — CRUD + GET /:id/output endpoint
│   ├── motores.ts           — 12 AI motors + getPromptVersion()
│   └── prompts.ts           — GET /api/prompts/:motorKey (NEW)
├── middleware/
│   ├── auth.ts              — authMiddleware, AuthPayload (sub + role)
│   ├── errorHandler.ts       — sanitized error responses
│   └── rateLimiter.ts        — motorLimiter, authLimiter
├── motores/
│   ├── mocks.ts             — 12 mock generators (all Zod-validated)
│   └── prompts/             — 12 motor prompt templates (SINGLE source of truth)
└── schemas/                 — Zod validation schemas

src/
├── api/                — client, auth, materials, admin, motores
├── lib/
│   ├── ingest/
│   │   └── documentIngester.ts  — ingestDocument/Pdf/Image with onProgress
│   └── pptx/
│       ├── promptRunner.ts  — NO ?raw imports (cleaned Sprint E)
│       └── generator.ts     — PPTX generation
├── hooks/
│   └── useMotorGenerator.ts — typed showToast, polling
└── pages/
    ├── MaterialesPage.tsx  — 12 motor buttons, OCR upload
    ├── HistoryPage.tsx — result_json preview
    └── AdminPage.tsx       — 6 panels (Cache, Reset, Archivos, Bloques, Usuarios)

src/prompts/ — 11 files DELETED (Sprint E dedup)
 Motor_Alpha-2.md RETAINED (legacy alpha2 use only)
```

## Current Sprint Status (Updated 2026-05-30)
| Sprint | Status | Date Done | Agent | Notes |
|--------|--------|----------|-------|-------|
| Sprint 0-8 | ✅ DONE | 2026-05-27 | M2.7 | Infrastructure, DB, security, testing |
| Sprint 9 | ✅ DONE | 2026-05-28 | M2.7 | PPTX partial warning, Blob API, type cleanup |
| Sprint 10 | ✅ DONE | 2026-05-29 | M2.7 | Testing& Observability: 127 tests, pino-http |
| Sprint 11 | ✅ DONE | 2026-05-29 | M2.7 | Frontend Architecture: CSS Modules, React Query |
| Sprint 12 | ✅ DONE | 2026-05-30 | External Agent | Prompts & Data: backend API, versioning, CSRF |

## Sprint 12 Completed Features
- `GET /api/prompts/:motorKey` — backend endpoint, text/plain, 1hr cache
- `src/prompts/` — 11 files deleted (single source of truth: server/src/motores/prompts/)
- Migration 003 — `prompt_version TEXT` on motor_results + materials
- `GET /api/materials/:id/output` — full JSON retrieval, ETag, Cache-Control
- Auth CSRF cookie — `SameSite=Strict; HttpOnly`
- `.env.example` —28 lines, ADMIN_PASSWORD documented

## Verified Working (2026-05-30)
- `npm run build` → 0 errors
- `npx tsc --noEmit` →0 errors
- `npx vitest run` → 127/127 passed, 0 errors
- `GET /api/prompts/synthesis` → 200 + full prompt text (~3KB)
- `GET /api/materials/1/output` → 200 + full JSON + ETag + Cache-Control
- Auth login cookie → `SameSite=Strict; HttpOnly`
- `prompt_version` column → exists in DB
- `migrate.ts` duplicate key → graceful continue (no crash)

## TypeScript Fixes Applied (2026-05-30)
- pino-http ESM import → `import { pinoHttp as pinoHttpFn }`
- jwt.sign overload → `as Parameters<typeof jwt.sign>[2]`
- dbGet generic args → removed, used `as Type | undefined` cast
- AuthRequest type mismatch → `req: any`
- migrate.ts duplicate key → `err?.code === '23505'` → continue

## Danger Zones
- `server/src/index.ts` is the dev entry (tsx), NOT `server.js`
- `dbRun` returns `{ id }` (not `lastInsertRowid`)
- `server/.env` controls actual runtime config (not root `.env`)
- `src/prompts/` — do NOT re-add files here; server/src/motores/prompts/ is the source of truth
- `prompt_version` shows `unknown` in dev (git hash-object not available in all run contexts)

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
- Git: local-only, no remote configured
