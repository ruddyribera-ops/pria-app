/**
 * Database connection layer.
 *
 * Uses pglite (in-process WASM Postgres) when USE_PGLITE=1 or VITEST=true,
 * otherwise uses pg.Pool for production PostgreSQL connections.
 */
import pg from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// ─── Env detection ────────────────────────────────────────────────────────────

const USE_PGLITE = process.env.USE_PGLITE === '1' || process.env.VITEST === 'true';

// ─── pglite-backed pool (lazy singleton with auto-migration) ─────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

// All state stored on globalThis to survive vitest module re-evaluation.
// Without this, vite/vitest's module isolation can create separate module
// instances of connection.ts (one per import path), each with its own
// `let pgliteDb = null` variable, defeating the singleton.
function getState() {
  const g = globalThis as any;
  if (!g.__PRIA_PGLITE_STATE__) {
    g.__PRIA_PGLITE_STATE__ = {
      db: null,
      pool: null,
      migrationsRun: false,
    };
  }
  return g.__PRIA_PGLITE_STATE__;
}

async function ensurePgliteDb(): Promise<any> {
  const state = getState();
  if (state.db) return state.db;

  const { PGlite } = await import('@electric-sql/pglite');

  // Check for shared instance from setupFiles first
  const shared = (globalThis as any).__PRIA_PGLITE_DB__;
  if (shared) {
    state.db = shared;
    return state.db;
  }

  // Create our own instance
  state.db = new PGlite();
  await state.db.waitReady;

  // Run migrations if not already done
  if (!state.migrationsRun) {
    await runMigrationsOnPglite(state.db);
    state.migrationsRun = true;
  }

  return state.db;
}

async function runMigrationsOnPglite(db: any): Promise<void> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');

    try {
      await db.exec(sql);
    } catch (err: any) {
      // If multi-statement fails, try splitting
      if (err?.code === '42601' && /cannot insert multiple commands/i.test(String(err?.message))) {
        const statements = sql
          .split(/;[\n\r]*/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0 && !s.startsWith('--'));

        for (const stmt of statements) {
          if (!stmt) continue;
          try {
            await db.exec(stmt + ';');
          } catch (stmtErr: any) {
            // Skip "already exists" for CREATE statements
            if (
              stmt.toUpperCase().startsWith('CREATE') &&
              (stmtErr?.code === '42P07' || stmtErr?.code === '42710' || /already exists/i.test(String(stmtErr?.message)))
            ) {
              continue;
            }
            throw stmtErr;
          }
        }
      } else if (err?.code === '42P07' || err?.code === '42710' || /already exists/i.test(String(err?.message))) {
        // Skip "already exists"
      } else {
        throw err;
      }
    }
  }
}

function createPglitePool(): any {
  return {
    async query(text: string, values?: unknown[]) {
      const db = await ensurePgliteDb();
      const result = await db.query(text, values || []);
      return {
        rows: result.rows,
        rowCount: 'affectedRows' in result ? result.affectedRows : result.rows.length,
      };
    },
    async connect() {
      const db = await ensurePgliteDb();
      return {
        async query(text: string, values?: unknown[]) {
          const result = await db.query(text, values || []);
          return {
            rows: result.rows,
            rowCount: 'affectedRows' in result ? result.affectedRows : result.rows.length,
          };
        },
        release() {},
      };
    },
    async end() {
      const state = getState();
      if (!(globalThis as any).__PRIA_PGLITE_DB__ && state.db) {
        await state.db.close?.();
      }
      state.pool = null;
      state.db = null;
    },
  };
}

function getPglitePool(): any {
  const state = getState();
  if (!state.pool) {
    state.pool = createPglitePool();
  }
  return state.pool;
}

// ─── pg.Pool singleton ───────────────────────────────────────────────────────

let pgPoolRef: pg.Pool | null = null;

function getPgPoolRef(): pg.Pool {
  if (!pgPoolRef) {
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.startsWith('sqlite://')) {
      console.log('[SQLite] Dev mode — bypassing PostgreSQL pool');
      return null as unknown as pg.Pool;
    }
    const connectionString = dbUrl || 'postgresql://postgres:pria_local@localhost:5432/pria';
    pgPoolRef = new Pool({ connectionString });
  }
  return pgPoolRef;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function initDatabase(): Promise<void> {
  if (USE_PGLITE) {
    await ensurePgliteDb();
    return;
  }

  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('sqlite://')) {
    console.log('[SQLite] Skipping PostgreSQL pool init');
    return;
  }
  const p = getPgPoolRef();
  const client = await p.connect();
  client.release();
}

// Return type is 'any' to allow both pg.Pool and pglite object to be used
// interchangeably at runtime.
export function getPoolClient(): any {
  return USE_PGLITE ? getPglitePool() : getPgPoolRef();
}

export async function closePool(): Promise<void> {
  if (USE_PGLITE) {
    // Don't close the shared instance — other tests in the same worker may need it.
    // The instance is cleaned up when the worker exits.
    return;
  }
  if (pgPoolRef) {
    await pgPoolRef.end();
    pgPoolRef = null;
  }
}
