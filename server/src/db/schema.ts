import { getPoolClient } from './connection.js';

let idx = 0;

/** Convert ? placeholders to $1, $2, … style for pg */
function toPgSql(sql: string): string {
  idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

export async function initDB(): Promise<void> {
  const pool = getPoolClient();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nombre TEXT NOT NULL,
      role TEXT DEFAULT 'teacher',
      nivel TEXT DEFAULT 'Primaria',
      grado TEXT DEFAULT '5to',
      student_book BOOLEAN DEFAULT FALSE,
      created_at TEXT DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      tipo TEXT DEFAULT 'textbook',
      size INTEGER,
      created_at TEXT DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS curriculums (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id INTEGER NOT NULL,
      material_id INTEGER,
      unidad_real TEXT NOT NULL,
      temas TEXT NOT NULL,
      contenido_temas TEXT NOT NULL,
      paginas_temas TEXT NOT NULL,
      raw_text TEXT,
      created_at TEXT DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS motor_results (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id INTEGER NOT NULL,
      curriculum_id INTEGER NOT NULL,
      motor_type TEXT NOT NULL,
      result_json TEXT NOT NULL,
      status TEXT DEFAULT 'done',
      simulated BOOLEAN DEFAULT FALSE,
      error_message TEXT,
      created_at TEXT DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS diagnosticos (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id INTEGER NOT NULL,
      estudiante TEXT NOT NULL,
      nivel TEXT NOT NULL,
      area TEXT,
      fecha TEXT,
      resultado TEXT,
      created_at TEXT DEFAULT NOW()
    );
  `);
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
 * For INSERT … RETURNING id, returns { lastInsertRowid, rowCount }.
 * For UPDATE/DELETE, returns { rowCount }.
 */
export async function dbRun(
  sql: string,
  params: any[] = []
): Promise<{ lastInsertRowid?: number; rowCount: number }> {
  const pool = getPoolClient();
  const result = await pool.query(toPgSql(sql), params);
  const rawId = result.rows[0]?.id as number | undefined;
  return { lastInsertRowid: rawId, rowCount: result.rowCount ?? 0 };
}
