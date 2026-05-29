import { getPoolClient } from './connection.js';
import { runMigrations } from './migrate.js';

/** Convert ? placeholders to $1, $2, … style for pg */
function toPgSql(sql: string): string {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

export async function initDB(): Promise<void> {
  // Migrations handle all schema creation — initDB delegates entirely
  await runMigrations();
}

/** Return all rows for a SELECT query */
export async function dbAll(sql: string, params: any[] = []): Promise<any[]> {
  const pool = getPoolClient();
  const result = await pool.query(toPgSql(sql), params);
  return result.rows;
}

/** Return first row or undefined */
export async function dbGet(sql: string, params: any[] = []): Promise<any | undefined> {
  const pool = getPoolClient();
  const result = await pool.query(toPgSql(sql), params);
  return result.rows[0];
}

/**
 * Run INSERT/UPDATE/DELETE.
 * For INSERT … RETURNING id, returns { id, rowCount }.
 * For UPDATE/DELETE, returns { rowCount }.
 */
export async function dbRun(
  sql: string,
  params: any[] = []
): Promise<{ id?: number; rowCount: number }> {
  const pool = getPoolClient();
  const result = await pool.query(toPgSql(sql), params);
  const rawId = result.rows[0]?.id as number | undefined;
  return { id: rawId, rowCount: result.rowCount ?? 0 };
}
