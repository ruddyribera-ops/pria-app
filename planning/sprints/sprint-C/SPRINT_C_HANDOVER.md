# SPRINT C — Testing & Observability

> **Source:** MASTER_PLAN_REMEDIATION.md §7.2, §7.3, §7.4, §3.5
> **Status:** Partial — E2E tests scaffolded, others not started
> **Date:** 2026-05-29
> **Branch:** `sprint_branch`

---

## Sprint C Entry State

| Check | Status |
|-------|--------|
| Build | ✅ 0 errors (674 modules, 11.27s) |
| Typecheck | ✅ 0 errors |
| Tests | ✅ 92/92 passing |
| PG integration | ✅ docker pria-pg running |
| Sprint A (Architecture) | ✅ Verified |
| Sprint B (Code Quality) | ✅ Verified |

---

## Task 1 — Supertest Integration Tests

**Source:** MASTER_PLAN §7.3 (P1)
**Status:** ❌ Not started
**Dependency:** Install `supertest` + `@types/supertest`

### What
Add integration tests for ALL server routes using supertest. These test HTTP request/response cycles (not just DB ops like current tests).

### Files
- `server/src/routes/__tests__/health.test.ts` — already exists with native `fetch`, refactor to supertest OR leave as-is
- `server/src/routes/__tests__/auth.test.ts` — already exists, fix applied. Keep, add supertest variants
- `server/src/routes/__tests__/materials.test.ts` — **NEW**
- `server/src/routes/__tests__/motores.test.ts` — **NEW**
- `server/src/routes/__tests__/schedule.test.ts` — **NEW** (covers MP §3.2 schedule routes)
- `server/src/routes/__tests__/admin.test.ts` — **NEW**

### Pattern
```ts
// server/src/routes/__tests__/materials.test.ts
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { initDatabase, closePool } from '../../db/connection.js';
import { initDB } from '../../db/schema.js';
import { seed } from '../../db/seed.js';
import http from 'http';

describe('GET /api/materials', () => {
  let server: http.Server;
  let requestAgent: ReturnType<typeof request>;

  beforeAll(async () => {
    await initDatabase();
    initDB();
    await seed();
    const app = await createApp();
    server = app.listen(0);
    requestAgent = request(server);
  });

  afterAll(async () => {
    server?.close();
    await closePool();
  });

  test('returns 401 without auth', async () => {
    const res = await requestAgent.get('/api/materials');
    expect(res.status).toBe(401);
  });

  test('returns 200 with valid auth token', async () => {
    const login = await requestAgent
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    const token = login.body.data.token;
    const res = await requestAgent
      .get('/api/materials')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
```

### Routes to cover (minimum)
| Route | Tests | Auth required? |
|-------|-------|----------------|
| `GET /api/health` | healthy response, DB ping, version | No |
| `POST /api/auth/login` | valid creds → JWT, invalid → 401, missing body → 400, rate limit → 429 | No |
| `GET /api/auth/me` | returns user, 401 without token | Yes |
| `GET /api/materials` | list, 401 without auth | Yes |
| `POST /api/materials` | create, validate body | Yes |
| `GET /api/admin/status` | returns system info | Yes (admin) |
| `GET /api/motores/:type/generate` | triggers generation, validates | Yes |

### Verify
```powershell
cd D:\ACTIVE PROJECTS\PRIA v10\server
npm install -D supertest @types/supertest
npx vitest run --reporter=verbose
```

### Edge cases
- Super test con token expirado o mal formado → 401
- Super test con body inválido → 400 con detalles de validación
- Super test a ruta admin sin role admin → 403

---

## Task 2 — Component Tests (AdminPanels)

**Source:** MASTER_PLAN §7.2 (P1)
**Status:** ❌ Not started
**Dependency:** Sprint B extraction already done (6 AdminPanels exist)

### What
Write component tests for the 6 AdminPanel components extracted in Sprint B. Testing-library/react is already in `package.json` devDependencies.

### Files to test
| Component | Test file |
|-----------|-----------|
| `src/pages/Admin/AdminArchivosPanel.tsx` | `src/pages/Admin/__tests__/AdminArchivosPanel.test.tsx` |
| `src/pages/Admin/AdminUsuariosPanel.tsx` | `src/pages/Admin/__tests__/AdminUsuariosPanel.test.tsx` |
| `src/pages/Admin/AdminResetPanel.tsx` | `src/pages/Admin/__tests__/AdminResetPanel.test.tsx` |
| `src/pages/Admin/AdminCachePanel.tsx` | `src/pages/Admin/__tests__/AdminCachePanel.test.tsx` |
| `src/pages/Admin/AdminBloquesPanel.tsx` | `src/pages/Admin/__tests__/AdminBloquesPanel.test.tsx` |
| `src/pages/Admin/AdminUsersPanel.tsx` | `src/pages/Admin/__tests__/AdminUsersPanel.test.tsx` |

### Pattern
```tsx
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminCachePanel } from '../AdminCachePanel';

describe('AdminCachePanel', () => {
  test('renders cache controls', () => {
    render(<AdminCachePanel />);
    expect(screen.getByText(/cache/i)).toBeDefined();
  });

  test('clear button triggers API call', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);
    render(<AdminCachePanel />);
    const btn = screen.getByRole('button', { name: /clear|limpiar/i });
    // userEvent.click(btn);
    // expect(mockFetch).toHaveBeenCalledWith('/api/admin/cache/clear');
  });
});
```

### Vitest config for component tests
The root `vitest` config doesn't have `jsdom` environment. Add to `vitest.workspace.ts` or use docblock:
```ts
// @vitest-environment jsdom
```

### Verify
```powershell
cd D:\ACTIVE PROJECTS\PRIA v10
npx vitest run --reporter=verbose src/pages/Admin/__tests__/
```

### Edge cases
- Panel renders empty state when API returns no data
- Panel shows loading state while fetching
- Error state when API returns 500
- Form validation before submit

---

## Task 3 — E2E Tests (Already Scaffolded)

**Source:** MASTER_PLAN §7.4 (P2)
**Status:** ✅ **Scaffolded** — 11 tests across 4 files in `tests/e2e/` — **NOT YET RUN**

### What
- Verify all existing e2e tests pass
- Playwright config already points to `./tests/e2e` (not the deprecated `e2e/`)
- The old `e2e/smoke.spec.ts` can be deleted once verified

### Existing tests
| File | Tests | Coverage |
|------|-------|----------|
| `tests/e2e/auth.spec.ts` | 3 | login, wrong creds, unauthenticated redirect |
| `tests/e2e/materiales.spec.ts` | 3 | list loads, navigate, toasts |
| `tests/e2e/navigation.spec.ts` | 2 | sidebar items, active highlight |
| `tests/e2e/production-flow.spec.ts` | 3 | dashboard, PDF upload, PPTX export |

### Verify
```powershell
# Start server first
cd D:\ACTIVE PROJECTS\PRIA v10\server
Start-Process "cmd" -ArgumentList "/c npx tsx src/index.ts" -WindowStyle Hidden

# Then run e2e
cd D:\ACTIVE PROJECTS\PRIA v10
npx playwright test --reporter=list
```

### Fixes likely needed
| Issue | Likely | Fix |
|-------|--------|-----|
| `playwright.config.ts` has `testDir: './tests/e2e'` — verify this is correct | Already set | Already correct |
| Login flow may fail if PG rate limiter blocks | High | Already fixed (DELETE FROM rate_limiter) but these e2e tests use a REAL browser session hitting the real server |
| Selector fragility — `input[type="text"]` may not match React rendered inputs | Medium | Use `getByRole('textbox')` or `getByLabel()` instead |
| Toast selector `.toast, [role="alert"]` may not match actual toast implementation | Medium | Check actual toast component structure |

### Edge cases
- Rate limiter en E2E si se corre el test varias veces seguidas
- La página de login puede tener diferentes estructuras de input
- El servidor E2E necesita PostgreSQL corriendo

---

## Task 4 — Structured Logging (pino-http)

**Source:** MASTER_PLAN §3.5 (P2)
**Status:** ❌ Not started
**Dependency:** Install `pino` + `pino-http`

### What
Add structured JSON logging middleware to Express. Replace ad-hoc `console.log` with pino-http for request logging and pino for general logging.

### Files to modify
| File | Change |
|------|--------|
| `server/src/index.ts` | Add `pinoHttp` middleware, configure logger |
| `server/src/routes/auth.ts` | Replace `console.log` with `req.log` |
| `server/src/middleware/rateLimiter.ts` | Replace `console.error` with logger |
| `server/src/db/connection.ts` | Add DB query logging |

### Pattern
```ts
// server/src/index.ts
import pino from 'pino';
import pinoHttp from 'pino-http';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

const app = express();
app.use(pinoHttp({ logger }));
app.use(express.json({ limit: '10mb' }));
```

```ts
// In any route handler — logger available as req.log
router.post('/login', async (req, res) => {
  req.log.info({ username: req.body.username }, 'login attempt');
  // ...
  req.log.warn({ username }, 'login failed — invalid credentials');
});
```

### Verify
```powershell
cd D:\ACTIVE PROJECTS\PRIA v10\server
npm install pino pino-http
npm install -D pino-pretty

# Test manually
npx tsx src/index.ts &
curl http://localhost:3000/api/health
# Check stdout for JSON log line
```

### Edge cases
- `pinoHttp` may interfere with existing error handler middleware — test error paths
- Log level should be configurable via env var, not hardcoded
- In production (Railway), use JSON transport (no pino-pretty)
- Sensitive data (passwords, tokens) must NOT appear in logs — add `redact` config

---

## Execution Order

```
1. Install dependencies (supertest, pino, pino-http, pino-pretty)
2. Supertest tests — 5 new test files, parallels well with Task 3
3. E2E tests — run and fix selector issues
4. Component tests — 6 new test files for AdminPanels
5. Structured logging — modify 4 server files
```

## Parallel Work

Tasks 1 (supertest) and 3 (E2E verify) can run in **parallel** since they test different layers.

Tasks 2 (component tests) and 4 (structured logging) can also run in **parallel** since they touch entirely different domains (frontend vs backend).

## Exit Criteria

- [ ] `npx vitest run` → all tests pass (92 + new = 97+ total)
- [ ] `npx playwright test` → all 11 E2E tests pass
- [ ] `npx tsc --noEmit --project tsconfig.app.json` → 0 errors
- [ ] Structured JSON logs visible on server restart
- [ ] No `console.log`/`console.error` remaining in route handlers

---

## Sprint C Deliverables Checklist

- [ ] **T1:** supertest integration tests for 5+ routes
- [ ] **T2:** component tests for 6 AdminPanels
- [ ] **T3:** E2E tests verified — 11 tests passing
- [ ] **T4:** pino-http structured logging on all server requests
- [ ] Old `e2e/smoke.spec.ts` deleted (replaced by `tests/e2e/`)
- [ ] Build + typecheck + tests verified before merge
