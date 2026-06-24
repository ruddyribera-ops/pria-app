import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.startsWith('sqlite://')) {
      // Dev mode without PostgreSQL — pool stays null, skip actual queries
      console.log('[SQLite] Dev mode — bypassing PostgreSQL pool');
      pool = null as unknown as pg.Pool;
      return pool;
    }
    const connectionString = dbUrl || 'postgresql://postgres:pria_local@localhost:5432/pria';
    pool = new Pool({ connectionString });
  }
  return pool;
}

export async function initDatabase(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('sqlite://')) {
    console.log('[SQLite] Skipping PostgreSQL pool init');
    return;
  }
  const p = getPool();
  const client = await p.connect();
  client.release();
}

export function getPoolClient(): pg.Pool {
  return getPool();
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
