# ðŸ—ºï¸ MASTER ROADMAP â€” PRIA v10 â†’ Production

> **Single source of truth for all productionization work.**
> M2.7 agent: read this at sprint start. Update sprint status table when done.
> Coordinator: reads memory updates â€” no re-queries needed.

---

## ðŸ“Š HONEST STATE (May 27, 2026)

**Rating:** 5/10 â€” It boots, auth works, login succeeds. But underneath it's full of bullshit data, fire-and-forget DB calls, and mock fallbacks that lie to the user.

### What Actually Works
- Login/logout with JWT âœ…
- MiniMax M2.7 API key exists and works (`server/.env`) âœ…
- PostgreSQL via `pg.Pool` (SQLite fallback in `.env`) âœ…
- PDF ingestion via pdfjs-dist (browser) âœ…
- Image OCR via tesseract.js (browser, eng+spa) âœ…
- DOCX ingestion via mammoth âœ…
- 12 motor Zod schemas with validation âœ…
- PPTX export via PptxGenJS âœ…
- Rate limiting (60/h motors, 5/min auth) âœ…
- Health check endpoint âœ…

### What's Full of Shit
| Problem | Severity | Location |
|---------|----------|----------|
| `initDB()` and `seed()` fire-and-forget (no await) | ðŸ”´ | `server.js:17-18`, `server/src/index.ts:10-11` |
| 4 fake teacher accounts with hardcoded passwords | ðŸ”´ | `server/src/db/seed.ts` |
| `getMockMaterials()` shows fake PDFs when API fails | ðŸ”´ | `src/api/materials.ts:22-28` |
| `getMockEstadoSistema()` shows fake motor statuses | ðŸ”´ | `src/api/admin.ts:9-14` |
| Fake login call with empty credentials on every page load | ðŸ”´ | `src/context/AuthContext.tsx:32` |
| `deleteMaterial` shows "success" toast when API call fails | ðŸ”´ | `src/pages/MaterialesPage.tsx` |
| Sidebar polls every 5s even when dropdown closed | ðŸ”´ | `src/components/Layout/Sidebar.tsx` |
| No DB migrations â€” `CREATE TABLE IF NOT EXISTS` on every startup | ðŸŸ¡ | `server/src/db/schema.ts` |
| `created_at` columns are TEXT (not TIMESTAMP) | ðŸŸ¡ | `server/src/db/schema.ts` |
| No foreign keys â€” orphaned rows everywhere | ðŸŸ¡ | `server/src/db/schema.ts` |
| 12 prompts duplicated frontend (`?raw`) + backend (filesystem) | ðŸŸ¡ | `src/prompts/*.md` + `server/src/motores/prompts/*.md` |
| Frontend `promptRunner.ts` has dead `?raw` imports (unused in motor path) | ðŸŸ¡ | `src/lib/pptx/promptRunner.ts` |
| `streaming.ts` is 95% duplicate of `promptRunner.ts` | ðŸŸ¡ | `src/lib/pptx/streaming.ts` |
| `server.js` and `server/src/index.ts` are two entry points doing the same thing | ðŸŸ¡ | `server.js` vs `server/src/index.ts` |
| Hardcoded temperature ternary instead of config table | ðŸŸ¡ | `server/src/routes/motores.ts:101` |
| `showToast` cast 12 times instead of fixing the type | ðŸŸ¡ | `src/pages/MaterialesPage.tsx:47-57` |
| No security headers (helmet) | ðŸŸ¡ | `server/src/app.ts` |
| `as any` TypeScript escapes everywhere | ðŸŸ¡ | Multiple files |
| Rate limiter error has mangled character "sesiÃƒÂ³n" | ðŸ”µ | `server/src/middleware/rateLimiter.ts:19` |
| HistoryPage shows fake constructed JSON | ðŸ”µ | `src/pages/HistoryPage.tsx` |
| package.json version is "0.0.0" | ðŸ”µ | `package.json` |
| No frontend tests, E2E not in CI | ðŸ”µ | â€” |
| railway.toml has hardcoded port | ðŸ”µ | `railway.toml` |

---

## ðŸƒ SPRINT STATUS

| Sprint | Status | Started | Completed | Agent | Notes |
|--------|--------|---------|-----------|-------|-------|
| **Sprint 0** | âœ… DONE | 2026-05-27 | 2026-05-27 | M2.7 | Kill all bullshit, make it honest |
| **Sprint 1** | âœ… DONE | 2026-05-27 | 2026-05-27 | M2.7 | Database: migrations, FKs, types |
| **Sprint 2** | âœ… DONE | 2026-05-27 | 2026-05-27 | M2.7 | Real textbook pipeline (OCR â†’ curriculum) |
| **Sprint 3** | âœ… DONE | 2026-05-27 | 2026-05-27 | M2.7 | Prompt cleanup: kill duplication |
| **Sprint 4** | ✅ DONE | 2026-05-27 | 2026-05-27 | M2.7 | Security: helmet, CSP, no \s any\ |
| **Sprint 5** | ✅ DONE | 2026-05-27 | 2026-05-27 | M2.7 | Testing: mocks, components, E2E |
| **Sprint 6** | ✅ DONE | 2026-05-27 | 2026-05-27 | M2.7 | UI polish: HistoryPage, skeleton, version 10.0.0 |
| **Sprint 7** | ✅ DONE | 2026-05-27 | 2026-05-27 | M2.7 | Infrastructure: Railway.toml, CI+E2E, docker-compose |
| **Sprint 8** | ✅ DONE | 2026-05-27 | 2026-05-27 | M2.7 | Production deploy docs + project_active update |
| **Sprint 9** | ✅ DONE | 2026-05-28 | 2026-05-28 | M2.7 | PPTX partial warning, Blob API, type cleanup, prompt mapping |
| **Sprint 10** | ✅ DONE | 2026-05-29 | 2026-05-29 | M2.7 | Testing & Observability: 127 tests, 11 E2E, pino-http, 6 admin component tests |
| **Sprint 11** | ✅ DONE | 2026-05-29 | 2026-05-29 | M2.7 | Frontend Architecture: CSS Modules (10 files), React Query hooks, responsive breakpoints, accessibility WCAG 2.1 AA |
| **Sprint 12** | ⏳ PENDING | 2026-05-29 | — | — | Prompts & Data: eliminate prompt duplication (backend API), prompt versioning (git SHA), history output endpoint, CSRF protection, complete .env.example |

---

## ðŸ§  AGENT MEMORY UPDATE PROTOCOL

After completing a sprint, the M2.7 agent MUST:

1. **Update sprint table above** â€” change status to âœ… DONE, fill in date and agent name
2. **Update `.opencode/memory/project_active.md`** â€” reflect current state
3. **Create sprint report** at `.opencode/memory/sprint-NNN.md` with:
   - What was accomplished
   - Files modified + line changes
   - Verification results
   - Any edge cases found
   - Lessons learned

**Sprint report template:**
```markdown
# Sprint N: [Name] â€” Completion Report
## Date: YYYY-MM-DD | Agent: M2.7

## Accomplished
- [ ] Task X: description

## Files Modified
- `path/to/file` â€” what changed (lines N-M)

## Verification
- [ ] Check 1: âœ… passed / âŒ failed
- [ ] npm run build: âœ… / âŒ
- [ ] npm run typecheck: âœ… / âŒ

## Edge Cases Found
- Issue description (if any)

## Lessons
- Something to remember for next time
```

---

# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# SPRINT DEFINITIONS â€” EXECUTE IN ORDER
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

---

# SPRINT 0: KILL THE BULLSHIT

**Objective:** Strip ALL fake data. Make the app honest. If something fails, show an error â€” not fabricated content. This is the foundation. NOTHING else happens until this is done.

## What "Done" Means
- No fake teacher accounts. Only admin with generated password.
- No mock materials when API fails.
- No mock estado when API fails.
- No fake login call on page load.
- No lying toasts.
- No polling when dropdown is closed.
- `initDB()` and `seed()` properly awaited so server doesn't say "âœ… running" when DB is down.
- 0 occurrences of `getMockMaterials` or `getMockEstadoSistema` in the codebase.

---

### 0a. Fix `server.js` â€” Await the DB calls

**Files:** `server.js`, `server/src/index.ts`

**Current (`server.js:16-18`):**
```js
await initDatabase();
initDB();   // â† fire-and-forget. Server starts before tables exist.
seed();     // â† fire-and-forget. Seed may not run.
```

**Change to:**
```js
await initDatabase();
await initDB();
await seed();
```

**Same fix in `server/src/index.ts:10-11`.**

**Edge cases:**
- PG unreachable â†’ `main()` catch fires with "âŒ Failed to start: ..." within 3s. NOT "âœ… PRIA v10 running".
- `seed()` finds existing users â†’ logs "Users already exist, skipping" (NOT a failure)
- `initDB()` migration fails â†’ throw, server exits

**Verification:**
1. `docker stop pria-pg`. Restart server â†’ exits with error, NOT "âœ… running"
2. `docker start pria-pg`. Restart server â†’ "âœ… PRIA v10 running" after DB connects
3. `curl localhost:3000/api/health` â†’ `{"status":"healthy"}`

---

### 0b. Sanitize `seed.ts` â€” Admin only, no fake teachers

**Files:** `server/src/db/seed.ts`

**Replace entire file.** Current creates 4 users (admin, ruddy, adela, maria) with hardcoded passwords. Replace with admin-only, password from env or random generated.

```typescript
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getPoolClient } from './connection.js';

export async function seed(): Promise<void> {
  const pool = getPoolClient();

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM users');
  if (rows[0].count > 0) {
    console.log('[seed] Users already exist, skipping');
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomUUID().slice(0, 12);
  const hash = bcrypt.hashSync(adminPassword, 12);

  await pool.query(
    `INSERT INTO users (username, password_hash, nombre, role, nivel, grado)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (username) DO NOTHING`,
    ['admin', hash, 'Administrador', 'admin', 'Primaria', '5to']
  );

  console.log('[seed] Admin user created');
  if (!process.env.ADMIN_PASSWORD) {
    console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    console.log(`ðŸ” Admin password: ${adminPassword}`);
    console.log('  CHANGE THIS ON FIRST LOGIN.');
    console.log('  Set ADMIN_PASSWORD env var to customize.');
    console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  }
}
```

**Edge cases:**
- `ADMIN_PASSWORD` set but empty string â†’ fall back to generated password
- Admin already exists â†’ `ON CONFLICT DO NOTHING` handles re-seed
- `NODE_ENV=test` â†’ don't print password (check `process.env.NODE_ENV !== 'test'`)

**Verification:**
1. Drop users table. Restart. Console prints generated password.
2. Login with admin + that password â†’ JWT returned.
3. Login with admin + wrong password â†’ 401.
4. Login with "ruddy" + anything â†’ 401 (user doesn't exist).

---

### 0c. Kill `getMockMaterials()` â€” No fake PDFs

**Files:** `src/api/materials.ts`, `src/pages/MaterialesPage.tsx`

**In `src/api/materials.ts`:** Delete the entire `getMockMaterials()` function (lines 22-28).

**In `src/pages/MaterialesPage.tsx`:**
- Remove `getMockMaterials` from import on line 5
- Find the catch block where `setMaterials(getMockMaterials())` is called â†’ replace with showToast error
- Find the `handleUpload` catch block where fake material is created â†’ replace with error toast

**Current bad pattern (around line 166):**
```tsx
} catch {
  setMaterials(getMockMaterials()); // â† LIES. Shows fake data when API fails.
}
```

**Replace with:**
```tsx
} catch (err) {
  console.error('Failed to load materials:', err);
  showToast('Error al cargar materiales. Â¿Servidor disponible?', 'error');
}
```

**Verification:**
1. Stop backend. Refresh app. Materials list shows "Error al cargar materiales" â€” NOT 3 fake PDFs.
2. `grep -r "getMockMaterials" src/` returns 0 results.

---

### 0d. Kill `getMockEstadoSistema()` â€” No fake statuses

**Files:** `src/api/admin.ts`, `src/components/Layout/Sidebar.tsx`

**In `src/api/admin.ts`:** Delete the entire `getMockEstadoSistema()` function (lines 9-14) and the `MOTORS` array (lines 42-54) if it's only used by the mock.

**In `src/components/Layout/Sidebar.tsx`:**
- Remove `getMockEstadoSistema` from import
- Remove all mock fallback calls â€” on API error, set `setEstado(null)`
- UI shows "Sistema no disponible" when estado is null

**Verification:**
1. Stop backend. Open sidebar dropdown â†’ "Sistema no disponible" (not fake ready statuses)
2. `grep -r "getMockEstadoSistema" src/` returns 0 results.

---

### 0e. Fix Sidebar polling â€” Only when dropdown is open

**Files:** `src/components/Layout/Sidebar.tsx`

**Current:** `useEffect` with `setInterval(fetchEstado, 5000)` fires unconditionally.

**Fix:**
- Add `estadoOpen` to the effect dependency array
- Only start the interval when `isAuthenticated && estadoOpen`
- Clean up interval on unmount OR when dropdown closes

```tsx
useEffect(() => {
  if (!isAuthenticated || !estadoOpen) return;

  fetchEstado(); // immediate first fetch
  const interval = setInterval(fetchEstado, 5000);

  return () => clearInterval(interval);
}, [isAuthenticated, estadoOpen]);
```

**Verification:**
1. DevTools Network tab. Log in. Dropdown closed â†’ ZERO `/api/admin/estado-sistema` requests.
2. Open dropdown â†’ first request within 1s, then every ~5s.
3. Close dropdown â†’ requests stop immediately.

---

### 0f. Fix `deleteMaterial` â€” Stop lying

**Files:** `src/pages/MaterialesPage.tsx`

**Current (around line 235):** On API failure, the catch handler removes the material from local state AND shows success toast. Both are lies.

**Replace with:**
```tsx
const handleDelete = async (id: number) => {
  if (!window.confirm('Â¿Eliminar este archivo?')) return;
  try {
    await deleteMaterial(id);
    await loadMaterials();  // re-fetch from server to get accurate list
    showToast('Archivo eliminado.', 'success');
  } catch (err) {
    console.error('Delete failed:', err);
    showToast('Error al eliminar. Intenta de nuevo.', 'error');
    // Do NOT remove from local state â€” server still has it
  }
};
```

**Verification:**
1. Delete with server running â†’ success toast, item gone.
2. Stop server. Delete again â†’ error toast, item still visible.

---

### 0g. Remove fake login call from AuthContext

**Files:** `src/context/AuthContext.tsx`

**Current (line 32):**
```tsx
apiLogin({ username: '', password: '' } as any).catch(() => {});
```

**Action:** Delete this line entirely. It POSTs empty credentials to `/api/auth/login` on every page load. The `getMe()` call on the next line already validates the session.

**Also add proper error handling on `getMe()`:**
```tsx
getMe().then((u) => {
  setUser(u);
  localStorage.setItem(USER_KEY, JSON.stringify(u));
}).catch(() => {
  // Token expired or invalid â€” clear saved session cleanly
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  setToken(null);
  setUser(null);
});
```

**Verification:**
1. Clear localStorage. Refresh page.
2. Network tab: NO `POST /api/auth/login` with empty credentials.
3. One `GET /api/auth/me` fires (to validate any saved token).

---

### âœ… Sprint 0 Verification Checklist

Run ALL of these before marking done:

```
â–¡ server.js: initDatabase(), initDB(), seed() all awaited with await
â–¡ server/src/index.ts: same fix
â–¡ seed.ts: only admin user, no fake teachers
â–¡ grep "getMockMaterials" src/ â†’ 0 results
â–¡ grep "getMockEstadoSistema" src/ â†’ 0 results
â–¡ grep "apiLogin(" src/context/AuthContext.tsx â†’ only in the login() callback, NOT in useEffect
â–¡ Sidebar: setInterval only runs when estadoOpen === true
â–¡ deleteMaterial: error toast on failure, success toast on success
â–¡ npm run build â†’ 0 errors
â–¡ npm run typecheck â†’ 0 errors
â–¡ Login with admin, generated password â†’ works
â–¡ Login with fake teacher name â†’ 401
â–¡ Stop backend, refresh materials â†’ error (not fake PDFs)
```

---

# SPRINT 1: DATABASE MATURITY

**Objective:** Replace ad-hoc table creation with proper migration system. Add foreign keys. Fix TEXTâ†’TIMESTAMP. Remove sqlite naming legacy.

**Agent Note:** You'll need Docker PostgreSQL for testing. The `pria-pg` container is already running on port 5432. Connection string: `postgresql://postgres:pria_local@localhost:5432/pria`

---

### 1a. Create migration framework

**Files:** 
- `server/src/db/migrations/` (new directory)
- `server/src/db/migrations/001_initial.sql` (new file)
- `server/src/db/migrate.ts` (new file)

**Migration runner (`migrate.ts`):**
1. Create `schema_migrations` tracking table if not exists
2. Read all `.sql` files from `migrations/` sorted by version prefix
3. For each file not yet applied: run in transaction, record version + name
4. On failure: rollback, log, exit(1)

**Migration 001 (`001_initial.sql`):**
```sql
-- Complete schema with proper types and foreign keys
CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nombre TEXT NOT NULL,
  role TEXT DEFAULT 'teacher',
  nivel TEXT DEFAULT 'Primaria',
  grado TEXT DEFAULT '5to',
  student_book BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS materials (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  tipo TEXT DEFAULT 'textbook',
  size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS curriculums (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL,
  unidad_real TEXT NOT NULL,
  temas TEXT NOT NULL,
  contenido_temas TEXT NOT NULL,
  paginas_temas TEXT NOT NULL,
  raw_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS motor_results (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  curriculum_id INTEGER REFERENCES curriculums(id) ON DELETE CASCADE,
  motor_type TEXT NOT NULL,
  result_json TEXT NOT NULL,
  status TEXT DEFAULT 'done',
  simulated BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diagnosticos (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  estudiante TEXT NOT NULL,
  nivel TEXT NOT NULL,
  area TEXT,
  fecha TEXT,
  resultado TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_motor_results_user_type ON motor_results(user_id, motor_type);
CREATE INDEX IF NOT EXISTS idx_motor_results_created ON motor_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_curriculums_user ON curriculums(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_user ON materials(user_id);
```

### 1b. Replace `initDB()` content

**Files:** `server/src/db/schema.ts`

Replace all `CREATE TABLE IF NOT EXISTS` statements in `initDB()` with:
```typescript
import { runMigrations } from './migrate.js';

export async function initDB(): Promise<void> {
  await runMigrations();
}
```

**Keep** `dbAll()`, `dbGet()`, `dbRun()` â€” they still work correctly.

### 1c. Fix `dbRun` return type

**Files:** `server/src/db/schema.ts`

sqlite naming: `lastInsertRowid` â†’ `id`. Currently returns `{ lastInsertRowid?, rowCount }`. Change to `{ id?, rowCount }`.

Update all consumers:
- `server/src/routes/auth.ts:38` â€” `info.lastInsertRowid` â†’ `info.id`
- `server/src/routes/materials.ts:21` â€” `info.lastInsertRowid` â†’ `info.id`
- `server/src/routes/curriculums.ts:27` â€” `info.lastInsertRowid` â†’ `info.id`

### âœ… Sprint 1 Verification

```
â–¡ Server starts with fresh DB â†’ all tables created via migration
â–¡ Server starts with existing DB â†’ migration not re-applied
â–¡ schema_migrations table has 1 row (version=1, name=001_initial.sql)
â–¡ All created_at columns are TIMESTAMPTZ (not TEXT)
â–¡ Foreign keys exist: materials.user_id â†’ users.id, etc.
â–¡ dbRun returns { id, rowCount } not { lastInsertRowid, ... }
â–¡ INSERT with invalid user_id â†’ FK violation error
â–¡ DELETE user â†’ their materials cascade delete
â–¡ npm run build + typecheck pass
```

---

# SPRINT 2: REAL TEXTBOOK PIPELINE

**Objective:** The OCR pipeline already works (pdfjs-dist + tesseract.js eng+spa) but has no progress bar, no error handling for large PDFs, and the upload API sends FormData when server expects JSON. Fix all that. This is where real textbook JPEGs/PDFs become usable.

---

### 2a. Fix material upload â€” JSON not FormData

**Files:** `src/api/materials.ts`

**Current:** Sends FormData with file blob, but server expects JSON `{ filename, tipo, size }`.

**Fix:**
```typescript
export async function uploadMaterial(file: File, tipo: string): Promise<Material> {
  // Send metadata as JSON â€” the actual file stays in browser for OCR
  const response = await client.post('/materials/', {
    filename: file.name,
    tipo,
    size: file.size,
  });
  return response.data;
}
```

### 2b. Add OCR progress bar

**Files:** `src/lib/ingest/documentIngester.ts`, `src/pages/MaterialesPage.tsx`

**In `documentIngester.ts`:** Add optional `onProgress` callback:
```typescript
export async function ingestDocument(
  file: File,
  onProgress?: (stage: string, percent: number) => void
): Promise<IngestResult> {
```

Pass it through to `ingestPdf()`, `ingestImage()` etc.

In `ingestPdf()`, report progress:
```typescript
if (onProgress) {
  onProgress(`Procesando pÃ¡gina ${i}/${pageCount}...`, Math.round((i / pageCount) * 100));
}
```

When Tesseract is running:
```typescript
const { data } = await Tesseract.recognize(dataUrl, 'eng+spa', {
  logger: (m) => {
    if (m.status === 'recognizing text' && onProgress) {
      onProgress(`OCR pÃ¡gina ${pageNum}...`, Math.round(m.progress * 100));
    }
  },
});
```

**In `MaterialesPage.tsx`:**
```tsx
const [ocrProgress, setOcrProgress] = useState<{ text: string; percent: number } | null>(null);

// In handleUpload:
const ingestResult = await ingestDocument(file, (text, percent) => {
  setOcrProgress({ text, percent });
});

// In JSX:
{ingesting && (
  <div style={{ padding: '1rem', textAlign: 'center', color: '#6b6b80', fontSize: '0.8125rem' }}>
    â³ {ocrProgress?.text || 'Procesando...'}
    {ocrProgress && (
      <div style={{ marginTop: '0.5rem', height: '4px', background: '#e6e6eb', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${ocrProgress.percent}%`, background: '#3A9E5E', transition: 'width 0.3s ease' }} />
      </div>
    )}
  </div>
)}
```

### 2c. Max page limit for scanned PDFs

**Files:** `src/lib/ingest/documentIngester.ts`

In `ingestPdf()`, add:
```typescript
const MAX_PDF_PAGES = 50;
const pagesToProcess = Math.min(pageCount, MAX_PDF_PAGES);

if (pageCount > MAX_PDF_PAGES && onProgress) {
  onProgress(`PDF tiene ${pageCount} pÃ¡ginas. Procesando primeras ${MAX_PDF_PAGES}...`, 0);
  warnings.push({
    code: 'PARTIAL_CONTENT',
    message: `PDF tiene ${pageCount} pÃ¡ginas. Solo se procesaron las primeras ${MAX_PDF_PAGES}.`,
  });
}
```

### 2d. Show OCR warnings in UI

After OCR completes, display warnings (low confidence, OCR fallback, etc.) next to curriculum preview.

### âœ… Sprint 2 Verification

```
â–¡ Upload real textbook PDF (with text layer) â†’ text extracts, curriculum shows
â–¡ Upload JPEG of textbook page â†’ OCR runs, text appears
â–¡ Progress bar visible during OCR with real percentage
â–¡ Scanned PDF (no text layer) â†’ OCR fallback triggers, per-page progress
â–¡ PDF >50 pages â†’ warning shown, first 50 processed
â–¡ Upload corrupted file â†’ error message, no fake data
â–¡ Upload succeeds â†’ material in file list
â–¡ npm run build + typecheck pass
```

---

# SPRINT 3: PROMPT ARCHITECTURE â€” Kill Duplication

**Objective:** Single source of truth for prompts (backend filesystem). Remove dead `?raw` imports. Merge `streaming.ts` into `promptRunner.ts`. Fix temperature config.

---

### 3a. Remove `?raw` prompt imports from frontend

**Files:** `src/lib/pptx/promptRunner.ts`, `src/lib/pptx/streaming.ts`

**These 12 imports are DEAD CODE.** The motor path goes through `POST /api/motores/:type` â†’ backend loads prompts from disk. The frontend `?raw` prompts are never used for motor generation.

In `promptRunner.ts`:
- Remove all 12 `?raw` imports (lines 17-28)
- Remove `PROMPT_BY_TYPE` lookup table
- Remove `systemPrompt` variable in the `FULL_AI` block

In `streaming.ts`:
- Same treatment: remove all 12 `?raw` imports
- Remove `getSystemPrompt()` function

**Do NOT touch** `src/lib/ingest/documentIngester.ts` â€” it uses `alpha2Prompt` via `?raw` for the legacy `/api/ai/generate` route (Alpha-2 extraction).

### 3b. Merge `streaming.ts` into `promptRunner.ts`

**Files:** `src/lib/pptx/streaming.ts`, `src/lib/pptx/promptRunner.ts`

1. Delete `streaming.ts` from disk
2. Add the streaming function to `promptRunner.ts`:
```typescript
export async function executePromptStreaming(
  context: PromptContext,
  mode: PromptMode,
  onChunk: StreamingCallback,
): Promise<PromptResult> {
  const result = await executePrompt(context, mode);
  if (result.structuredOutput) {
    onChunk(JSON.stringify(result.structuredOutput));
  }
  return result;
}
```
3. Update `src/hooks/useMotorGenerator.ts` to import from `promptRunner` instead of `streaming`

### 3c. Fix temperature â€” Config table, not ternary

**Files:** `server/src/routes/motores.ts`

Replace line 101 (`motorType === 'synthesis' ? 0.7 : 0.3`) with:
```typescript
const MOTOR_TEMPS: Record<string, number> = {
  synthesis: 0.7,
  abp: 0.8,
  assessment: 0.3,
  plan: 0.4,
  slides: 0.5,
  ficha: 0.6,
  quiz: 0.4,
  tutor: 0.3,
  pdc: 0.3,
  recalibrate: 0.3,
  micro: 0.3,
  alpha2: 0.2,
};
```

### 3d. Remove unused config options

**Files:** `server/src/config.ts`

Remove `MINIMAX_TEMPERATURE` and `MINIMAX_MAX_TOKENS` from the env schema â€” they're defined but never read by any code.

### 3e. Fix duplicate try/catch in promptRunner

**Files:** `src/lib/pptx/promptRunner.ts`

Remove the duplicated try/catch block (lines 679-690 are identical to 666-677).

### âœ… Sprint 3 Verification

```
â–¡ promptRunner.ts has zero ?raw imports
â–¡ streaming.ts deleted from disk (confirmed with fs)
â–¡ useMotorGenerator imports from promptRunner (not streaming)
â–¡ documentIngester.ts still imports alpha2Prompt (legitimate)
â–¡ npm run build â†’ 0 errors
â–¡ npm run typecheck â†’ 0 errors
â–¡ Motor generation works (hits backend, loads prompt from disk)
â–¡ Temperature table has entries for all 12 motors
â–¡ No duplicate try/catch in promptRunner
â–¡ MINIMAX_TEMPERATURE/MAX_TOKENS removed from config.ts
```

---

# SPRINT 4: SECURITY HARDENING

**Objective:** HTTP security headers. No stack trace leakage. No `as any` escapes. Proper error messages.

---

### 4a. Helmet + CSP headers

**Files:** `server/src/app.ts`, `package.json`

```bash
npm install helmet
```

In `createApp()`:
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: false, // PWA needs inline scripts
  crossOriginResourcePolicy: { policy: 'same-origin' },
}));

// Custom CSP
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.minimax.io;"
  );
  next();
});
```

### 4b. Sanitize API error messages

**Files:** `server/src/routes/ai.ts`, `server/src/middleware/errorHandler.ts`

In production, NEVER leak API internal errors to the client:
```typescript
// Before:
error: 'Error del modelo: ' + data.error.message,

// After:
error: 'Error de generaciÃ³n. Intenta de nuevo.',
```

Add `_debug` field in development only:
```typescript
(error as any)._debug = process.env.NODE_ENV === 'development' ? data.error.message : undefined;
```

### 4c. Remove ALL `as any` escapes

Inventory:
1. `server/src/routes/auth.ts:19` â€” `config.JWT_EXPIRY as any` â†’ `config.JWT_EXPIRY as string`
2. `src/pages/MaterialesPage.tsx:47-57` â€” 12 `showToast as (...)` casts â†’ fix `useMotorGenerator` signature
3. `src/lib/pptx/generator.ts:157` â€” `(data as SynthesisSlideExtended)` â†’ use `Record<string, unknown>`
4. `server/src/routes/*.ts` â€” `req: any` â†’ create `AuthRequest` interface

Fix type at source, don't cast at call site. In `src/hooks/useMotorGenerator.ts`:
```typescript
type ToastFn = (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
```

### 4d. Fix rate limiter encoding

**Files:** `server/src/middleware/rateLimiter.ts`

```typescript
// Before:
message: { error: 'Demasiados intentos de inicio de sesiÃƒÂ³n. Espera un minuto.' },

// After:
message: { error: 'Demasiados intentos de inicio de sesiÃ³n. Espera un minuto.' },
```

### 4e. Remove unused `refreshToken`

**Files:** `src/api/auth.ts`

Delete `refreshToken()` function â€” no backend endpoint supports it.

### âœ… Sprint 4 Verification

```
â–¡ helmet headers present in all responses (check with curl -I)
â–¡ No stack traces in production error responses
â–¡ grep "as any" --include="*.ts" --include="*.tsx" â†’ 0 results
â–¡ showToast type fixed at source, not cast at call site
â–¡ refreshToken removed from api/auth.ts
â–¡ Rate limiter shows correct "sesiÃ³n" (not "sesiÃƒÂ³n")
â–¡ CSP header allows app to function (no console errors)
â–¡ npm run build + typecheck pass
```

---

# SPRINT 5: TESTING

**Objective:** Mock generators tested against their Zod schemas. Key components tested. E2E in CI. No silent test skips.

---

### 5a. Fix integration tests â€” no silent skips

**Files:** `server/src/routes/__tests__/health.test.ts`, `server/src/routes/__tests__/auth.test.ts`

Add `beforeAll` that fails fast if PostgreSQL is unavailable:
```typescript
beforeAll(async () => {
  try {
    const pool = getPoolClient();
    await pool.query('SELECT 1');
  } catch {
    throw new Error(
      'PostgreSQL is required for integration tests. ' +
      'Run "docker start pria-pg" or set DATABASE_URL.'
    );
  }
});
```

### 5b. Mock generator unit tests

**Files:** `server/src/__tests__/mocks.test.ts` (new)

Test ALL 12 mock generators (`mockAlpha2Output`, `mockSynthesisOutput`, etc.) against their Zod schemas. Each test:
1. Returns valid output with empty params
2. Returns valid output with realistic params
3. Passes its Zod schema validation
4. Contains required minimum fields

### 5c. Frontend component tests

**Files:** `src/components/__tests__/MotorButton.test.tsx` (new)

**MotorButton tests:**
- Renders label text
- Shows loading spinner when loading=true
- Does NOT fire onClick when loading
- Fires onClick when not loading

### 5d. Wire E2E into CI

**Files:** `.github/workflows/test.yml`

Add after integration tests:
1. Install Playwright: `npx playwright install --with-deps`
2. Build frontend: `npm run build`
3. Start server, run E2E tests

### âœ… Sprint 5 Verification

```
â–¡ npm test shows accurate count (no silent skips)
â–¡ All 12 mock generators tested against their Zod schemas
â–¡ MotorButton tests pass
â–¡ CI runs E2E tests
â–¡ CI fails on test failure
â–¡ npm test completes < 30s
```

---

# SPRINT 6: UI/UX & CODE QUALITY

**Objective:** Polish. Fix HistoryPage. Loading skeletons. CSS variables. PPTX fonts. Version number.

---

### 6a. Fix HistoryPage â€” show real content

**Files:** `server/src/routes/motores.ts`, `src/pages/HistoryPage.tsx`

**Backend:** Add `result_json` to history query (truncated to 2000 chars):
```typescript
SELECT id, motor_type, status, simulated, created_at,
       LEFT(result_json, 2000) AS result_json_preview
FROM motor_results
```

**Frontend:** Show `result_json_preview` in expandable section instead of fake constructed JSON.

### 6b. Loading skeleton

**Files:** `src/components/Materials/MotorResultSkeleton.tsx` (new)

Pulsing placeholder for motor results while loading. Simple CSS animation.

### 6c. CSS variables (proof of concept)

**Files:** `src/App.css`

Convert 3-4 components from inline styles to CSS classes using `--pria-green`, `--pria-dark`, etc. Variables are already defined â€” use them.

### 6d. Fix package.json version

**Files:** `package.json`

`"version": "0.0.0"` â†’ `"version": "10.0.0"`

### âœ… Sprint 6 Verification

```
â–¡ HistoryPage shows real JSON preview (not fake metadata)
â–¡ Loading skeleton visible during motor generation
â–¡ At least 3 components use CSS variables (not inline)
â–¡ grep "onMouseEnter" Sidebar.tsx â†’ 0 results
â–¡ package.json version is "10.0.0"
â–¡ npm run build passes
```

---

# SPRINT 7: PRODUCTION INFRASTRUCTURE

**Objective:** Fix deploy pipeline. Sentry. docker-compose with app service.

---

### 7a. Fix railway.toml

**Files:** `railway.toml`

Remove hardcoded `port = 3000` â€” Railway sets `$PORT` dynamically.

### 7b. Add Sentry

**Files:** `server/src/app.ts`, `server/src/config.ts`

```bash
npm install @sentry/node
```

Init if `SENTRY_DSN` is set. `tracesSampleRate: 0.1`.

### 7c. Add build validation to CI

**Files:** `.github/workflows/test.yml`

After tests: build frontend, start server, hit health endpoint, verify 200.

### 7d. Update project_active.md

**Files:** `.opencode/memory/project_active.md`

Replace stale content with current state (deployed URL, known issues, etc.)

### âœ… Sprint 7 Verification

```
â–¡ railway.toml has no hardcoded port
â–¡ Sentry captures errors in production
â–¡ CI builds frontend + verifies server starts
â–¡ docker-compose up brings up PostgreSQL + app
â–¡ docker-compose down cleans up
```

---

# SPRINT 8: PRODUCTION DEPLOY

**Objective:** Deploy to Railway. Verify with real textbooks. Document known issues.

---

### 8a. Deploy checklist

Create `PRODUCTION_CHECKLIST.md`:

**Required env vars:**
- `JWT_SECRET` (min 32 chars, generate with `crypto.randomUUID()`)
- `DATABASE_URL` (Railway PostgreSQL plugin)
- `MINIMAX_API_KEY`

**Optional:**
- `ADMIN_PASSWORD` (random generated if unset)
- `SENTRY_DSN`
- `CORS_ORIGIN` (set to Railway URL)

### 8b. Create `KNOWN_ISSUES.md`

Document accepted tradeoffs:
1. JWT in localStorage (not HttpOnly cookies) â€” acceptable for <50 teachers
2. Browser-side OCR (not server) â€” large PDFs use client memory
3. No true SSE streaming â€” returns full result
4. No password policy
5. 100% inline CSS (partial migration in Sprint 6)

### 8c. Deploy + verify

1. `railway login && railway up`
2. Set all env vars in Railway dashboard
3. Find admin password in startup logs
4. Login as admin
5. Upload a real textbook JPEG/PDF
6. Full pipeline: OCR â†’ curriculum â†’ all motors â†’ PPTX export
7. Verify HistoryPage, logout/relogin

### âœ… Sprint 8 Verification

```
â–¡ Railway deployment accessible via URL
â–¡ Login with generated admin password works
â–¡ Upload real textbook â†’ OCR â†’ curriculum â†’ 12 motors â†’ PPTX export
â–¡ HistoryPage shows real content
â–¡ Multiple teachers can use simultaneously
â–¡ railway logs show no unhandled errors
â–¡ PRODUCTION_CHECKLIST.md and KNOWN_ISSUES.md committed
```

---

# âš™ï¸ ARCHITECTURE NOTES FOR M2.7 AGENT

### Entry Points
- **Dev:** `npm run dev` â†’ Vite proxy â†’ backend on `:3000`
- **Production:** `node server.js` â†’ backend + serves `dist/` frontend
- **Backend-only:** `cd server && npx tsx src/index.ts`

### Database
- Default: SQLite (`prisa.db`) â€” requires no setup, but no FKs
- Production: PostgreSQL via `pg.Pool` (`DATABASE_URL` env var)
- Migration system: created in Sprint 1

### AI Pipeline
- Frontend uploads file â†’ browser-side OCR (pdfjs-dist/tesseract.js) â†’ extract curriculum text
- Frontend sends params to `POST /api/motores/:type` â†’ backend loads prompt from disk â†’ calls MiniMax M2.7 API â†’ returns structured JSON
- All 12 motors: alpha2, synthesis, abp, assessment, plan, slides, ficha, quiz, tutor, pdc, recalibrate, micro
- Mock fallback in `server/src/motores/mocks.ts` â€” **KEPT** as clearly-labeled simulation fallback

### MiniMax API
- Key in `server/.env`: `MINIMAX_API_KEY=sk-cp-...`
- Endpoint: `https://api.minimax.io/v1/chat/completions`
- Model: `MiniMax-M2.7` (default)
- Rate limit: 60 requests/hour per user

### Prompts
- **Authoritative copy:** `server/src/motores/prompts/<motortype>.md`
- **Legacy frontend copies:** `src/prompts/Motor_*.md` (Sprint 3 removes ?raw imports)
- **No sync mechanism yet** â€” Sprint 3 makes backend authoritative
