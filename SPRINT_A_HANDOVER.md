# ══════════════════════════════════════════════════════════════════
#  HANDOVER — PRIA v10 Sprint A: Architecture Hardening
#  Powered by MiniMax M2.7
#  Source: MASTER_PLAN_REMEDIATION.md (items 1.5, 6.4)
# ══════════════════════════════════════════════════════════════════

You are an expert full-stack TypeScript engineer. Complete these 2 tasks
on PRIA v10 at D:\ACTIVE PROJECTS\PRIA v10.

Before implementing, state ONE alternative approach and why you chose this one.

Current state: Build passes, typecheck passes, 92/92 tests passing,
rate limiter PG-backed, mock survivors eliminated, UTF-8 clean.

---

## Task 1: Add graceful shutdown handler (10 min)

### Problem
`server/src/index.ts` has no `SIGTERM`/`SIGINT` handler.
Railway sends SIGTERM on every restart/deploy. Currently:
- In-flight HTTP requests are abruptly terminated
- PostgreSQL pool is not drained (potential connection leak)
- No cleanup of the rate limiter cleanup interval

### Why
A Railway deploy takes ~5s but the old instance gets SIGTERM immediately.
If a teacher is mid-generation, the request is lost AND the DB pool
holds a dead connection for 30s+ until PG timeout.

### Files
- `server/src/index.ts` — entry point
- `server/src/db/connection.ts` — exports `closePool()` already exists

### Pattern
```typescript
// Add to server/src/index.ts, after app.listen():
const server = app.listen(config.PORT, () => {
  console.log(`✅ PRIA backend on :${config.PORT}`);
});

function gracefulShutdown(signal: string) {
  console.log(`\n⏳ ${signal} received — shutting down gracefully...`);
  server.close(() => {
    console.log('  ✓ HTTP server closed');
    closePool()
      .then(() => {
        console.log('  ✓ DB pool drained');
        process.exit(0);
      })
      .catch((err) => {
        console.error('  ✗ DB pool drain error:', err);
        process.exit(1);
      });
  });

  // Force exit after 10s if graceful shutdown hangs
  setTimeout(() => {
    console.error('  ✗ Forced exit after timeout');
    process.exit(1);
  }, 10_000).unref();
}

// Import closePool at top:
// import { closePool } from './db/connection.js';
```

**Important:** Also stop the rate limiter cleanup interval:
```typescript
// Import at top:
import { stopRateLimiterCleanup } from './middleware/rateLimiter.js';

// Inside gracefulShutdown, after server.close:
stopRateLimiterCleanup();
console.log('  ✓ Rate limiter cleanup stopped');
```

### Verification
```powershell
cd "D:\ACTIVE PROJECTS\PRIA v10"
npm run build 2>&1
npm run typecheck 2>&1
npx vitest run 2>&1
```
All 92 tests must pass. No type errors.

Also verify manually that SIGTERM doesn't crash:
```powershell
cd "D:\ACTIVE PROJECTS\PRIA v10"
timeout /t 3 /nobreak 2>$null; npx tsx server/src/index.ts &
$pid = $!
Start-Sleep -Seconds 2
# SIGTERM simulation (Windows: taskkill sends CTRL_BREAK)
taskkill /PID $pid /F 2>$null
```
Expected: Clean shutdown log, no crash message.

---

## Task 2: Reduce request body limit from 50mb to 10mb (2 min)

### Problem
`server/src/app.ts` line 42:
```typescript
app.use(express.json({ limit: '50mb' }));
```
50MB is excessive. A single 50MB JSON request can exhaust Node's memory.
This is a trivial DOS vector — attacker sends a 50MB payload and the
server OOMs. For context, the largest document upload is ~20MB PDF
which gets streamed, not JSON-parsed.

### Fix
```typescript
app.use(express.json({ limit: '10mb' }));
```
10MB is plenty for all legitimate use cases:
- Motor params: ~2KB
- OCR metadata: ~100KB  
- Document payloads: streamed via multipart, not JSON
- History entries: ~500KB max

### Verify
```powershell
cd "D:\ACTIVE PROJECTS\PRIA v10"
npm run build 2>&1
npm run typecheck 2>&1
npx vitest run 2>&1
```

---

## Context
- **Project:** D:\ACTIVE PROJECTS\PRIA v10
- **Shell:** PowerShell (Windows)
- **Node:** ^22, uses tsx for dev, tsc for build
- **State:** P0 done (92/92 tests, no mocks, rate limiter PG, UTF-8 clean)
- **Full analysis:** MASTER_PLAN_REMEDIATION.md

## Completion Criteria
- [ ] `npm run typecheck`: 0 errors
- [ ] `npm run build`: 0 errors
- [ ] `npx vitest run`: 92/92 passing
- [ ] `server/src/index.ts` has SIGTERM handler that closes HTTP server + drains DB
- [ ] `app.ts` express.json limit reduced from 50mb to 10mb
