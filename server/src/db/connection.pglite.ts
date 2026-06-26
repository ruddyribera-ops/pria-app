/**
 * Test-mode database connection — uses pglite directly (in-process WASM Postgres).
 * Loaded instead of connection.ts when USE_PGLITE=1 is set.
 *
 * API-compatible with connection.ts so route handlers don't need to change.
 * Uses the shared pglite instance from globalSetup via globalThis.
 */
import { PGlite } from '@electric-sql/pglite';

interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

/** Mimics pg.Pool */
class PglitePool {
  async query<T = any>(text: string, values: unknown[] = []): Promise<QueryResult<T>> {
    const db = getDb();
    const result = await db.query<T>(text, values as any[]);
    return {
      rows: result.rows as T[],
      rowCount: 'affectedRows' in result ? (result as any).affectedRows : result.rows.length,
    };
  }

  async connect(): Promise<PgliteClient> {
    return new PgliteClient(getDb());
  }

  async end(): Promise<void> {
    const db = (globalThis as any).__PRIA_PGLITE_DB__ as PGlite | undefined;
    if (db) {
      await db.close();
      (globalThis as any).__PRIA_PGLITE_DB__ = undefined;
    }
  }
}

/** Mimics pg.PoolClient */
class PgliteClient {
  constructor(private db: PGlite) {}

  async query<T = any>(text: string, values: unknown[] = []): Promise<QueryResult<T>> {
    const result = await this.db.query<T>(text, values as any[]);
    return {
      rows: result.rows as T[],
      rowCount: 'affectedRows' in result ? (result as any).affectedRows : result.rows.length,
    };
  }

  release(): void {
    // no-op for pglite in-process
  }
}

let pool: PglitePool | null = null;

function getDb(): PGlite {
  // Use the shared instance from globalSetup if available
  const shared = (globalThis as any).__PRIA_PGLITE_DB__ as PGlite | undefined;
  if (shared) return shared;

  // Fallback: create our own instance (should not happen in test context)
  return new PGlite();
}

function getPool(): PglitePool {
  if (!pool) {
    pool = new PglitePool();
  }
  return pool;
}

export async function initDatabase(): Promise<void> {
  // Touch the pool so the db initializes
  getDb();
}

export function getPoolClient(): PglitePool {
  return getPool();
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
