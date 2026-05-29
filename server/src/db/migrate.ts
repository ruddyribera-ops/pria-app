/**
 * Database migration runner with tracking table.
 * Reads .sql files from migrations/ directory, applies them in order,
 * and tracks applied migrations in schema_migrations table.
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getPoolClient } from './connection.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

interface MigrationRecord {
  version: number;
  name: string;
  applied_at: Date;
}

/** Create the tracking table if it doesn't exist */
async function ensureTrackingTable(pool: ReturnType<typeof getPoolClient>): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

/** Get list of already-applied migrations */
async function getAppliedMigrations(pool: ReturnType<typeof getPoolClient>): Promise<MigrationRecord[]> {
  const result = await pool.query<{ version: number; name: string; applied_at: Date }>(
    'SELECT version, name, applied_at FROM schema_migrations ORDER BY version ASC'
  );
  return result.rows;
}

/** Get all migration files sorted by version prefix */
function getMigrationFiles(): { version: number; name: string; path: string }[] {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

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
 */
export async function runMigrations(): Promise<void> {
  const pool = getPoolClient();

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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
        [migration.version, migration.name]
      );
      await client.query('COMMIT');
      console.log(`[migrate] ✓ ${migration.name} applied`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[migrate] ✗ ${migration.name} failed:`);
      console.error(err);
      process.exit(1);
    } finally {
      client.release();
    }
  }

  console.log('[migrate] All migrations applied');
}
