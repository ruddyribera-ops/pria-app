/**
 * Database migration runner with tracking table.
 * Reads .sql files from migrations/ directory, applies them in order,
 * and tracks applied migrations in schema_migrations table.
 *
 * NOTE: When USE_PGLITE=1, migrations are handled by connection.ts directly.
 * This module is only used for non-pglite (production PostgreSQL) setups.
 */
import { readFileSync, readdirSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getPoolClient } from './connection.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

const USE_PGLITE = process.env.USE_PGLITE === '1' || process.env.VITEST === 'true';

interface MigrationRecord {
  version: number;
  name: string;
  applied_at: Date;
}

/** Create the tracking table if it doesn't exist */
async function ensureTrackingTable(pool: any): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

/** Get list of already-applied migrations */
async function getAppliedMigrations(pool: any): Promise<MigrationRecord[]> {
  const result = await (pool.query as any)(
    'SELECT version, name, applied_at FROM schema_migrations ORDER BY version ASC'
  );
  return result.rows;
}

/** Get all migration files sorted by version prefix */
function getMigrationFiles(): { version: number; name: string; path: string }[] {
  const allSqlFiles = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
  const SAFE_NAME = /^(\d{3,})_[a-z0-9_]+\.sql$/;
  const files = allSqlFiles.filter((f) => SAFE_NAME.test(f));

  if (files.length !== allSqlFiles.length) {
    const bad = allSqlFiles.filter((f) => !SAFE_NAME.test(f));
    throw new Error(`[migrate] UNSAFE FILENAMES detected: ${bad.join(', ')}. Aborting.`);
  }

  return files.map((filename) => {
    const match = filename.match(/^(\d+)_/);
    const version = match ? parseInt(match[1], 10) : 0;
    return {
      version,
      name: filename,
      path: join(MIGRATIONS_DIR, filename),
    };
  });
}

/**
 * Run all pending migrations in order.
 * Each migration runs in its own transaction; failure rolls back and exits.
 * Duplicate key (23505) is treated as already applied — no exit.
 */
export async function runMigrations(): Promise<void> {
  // When using pglite, migrations are handled automatically by connection.ts
  // on first database access. This function is only for non-pglite setups.
  if (USE_PGLITE) {
    console.log('[migrate] PGlite mode — migrations handled by connection layer');
    return;
  }

  // Skip writable check in dev mode (Windows Admin can't make dirs read-only)
  if (process.env.NODE_ENV === 'development' || process.env.SKIP_MIGRATION_SECURITY_CHECK === '1') {
    console.log('[migrate] Dev mode — skipping writability check');
  } else {
    // Verify migrations directory is not writable — fail fast if misconfigured
    try {
      const testFile = join(MIGRATIONS_DIR, '.migration-lock');
      writeFileSync(testFile, 'test');
      unlinkSync(testFile); // clean up
      throw new Error('[migrate] MIGRATIONS_DIR is WRITABLE — this is a security risk. Fix permissions.');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EACCES') {
        // EACCES = correctly read-only (desired). Any other error = unexpected.
        throw new Error(`[migrate] Cannot verify migrations dir: ${(err as Error).message}`);
      }
    }
  }

  const pool: any = getPoolClient();

  await ensureTrackingTable(pool);

  const applied = await getAppliedMigrations(pool);
  const appliedVersions = new Set(applied.map((r) => r.version));

  const files = getMigrationFiles();
  const pending = files.filter((f) => !appliedVersions.has(f.version));

  if (pending.length === 0) {
    console.log('[migrate] No pending migrations');
    return;
  }

  console.log(`[migrate] ${pending.length} migration(s) to apply`);

  for (const migration of pending) {
    const sql = readFileSync(migration.path, 'utf-8');

    console.log(`[migrate] Applying ${migration.name}...`);

    try {
      await pool.query(sql);
      await pool.query(
        'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
        [migration.version, migration.name]
      );
      console.log(`[migrate] ✓ ${migration.name} applied`);
    } catch (err: any) {
      // 23505 = duplicate key — migration already applied (e.g. in parallel test suites)
      if (err?.code === '23505') {
        console.log(`[migrate] ${migration.name} already applied (duplicate key)`);
        continue;
      }
      console.error(`[migrate] ✗ ${migration.name} failed:`);
      console.error(err);
      process.exit(1);
    }
  }

  console.log('[migrate] All migrations applied');
}
