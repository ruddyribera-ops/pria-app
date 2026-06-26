/**
 * Vitest global setup — runs once before all tests in the SAME process as workers
 * (via vitest's globalSetup with array syntax).
 *
 * Creates a SINGLE shared PGlite instance, runs all migrations, exposes on globalThis.
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'src', 'db', 'migrations');

export default async function setup() {
  process.env.USE_PGLITE = '1';
  console.log('[pglite-setup] USE_PGLITE=1 set, creating shared PGlite...');

  const db = new PGlite();
  await db.waitReady;

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    try {
      await db.exec(sql);
    } catch (err) {
      const msg = String((err as any)?.message ?? err);
      if (/already exists/i.test(msg)) continue;
      throw err;
    }
  }
  console.log(`[pglite-setup] ${files.length} migrations applied`);

  // Expose on globalThis so connection.ts finds the SAME instance regardless of
  // how it was imported. With singleFork + setupFiles, this works.
  (globalThis as any).__PRIA_PGLITE_DB__ = db;
  console.log('[pglite-setup] Shared PGlite exposed on globalThis');
}
