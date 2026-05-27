import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:pria_local@localhost:5432/pria';
    pool = new Pool({ connectionString });
  }
  return pool;
}

export async function initDatabase(): Promise<void> {
  const p = getPool();
  // Verify connection works
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
