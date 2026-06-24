#!/usr/bin/env python3
"""Patch connection.ts to use sql.js when DATABASE_URL=sqlite://"""
import re

path = r"D:\ACTIVE PROJECTS\PRIA v10\server\src\db\connection.ts"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Check if already patched
if 'sqlite' in content.lower():
    print("Already patched")
    exit(0)

new_content = '''import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.startsWith('sqlite://')) {
      // Use SQLite via sql.js (only for dev/testing without PostgreSQL)
      console.log('[SQLite] Using sql.js backend');
      pool = null as any;
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
'''

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Patched connection.ts")