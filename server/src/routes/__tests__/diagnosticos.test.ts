/**
 * @vitest-environment node
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import { createApp } from '../../app.js';
import { initDatabase, closePool, getPoolClient } from '../../db/connection.js';
import { initDB } from '../../db/schema.js';
import bcrypt from 'bcryptjs';

describe('Diagnosticos routes', () => {
  let server: http.Server;
  let port: number;
  let token: string;

  beforeAll(async () => {
    try { await (await import('../../db/connection.js')).getPoolClient(); } catch { throw new Error('PostgreSQL required'); }
    await initDatabase(); initDB();
    const pool = getPoolClient(); await pool.query('DELETE FROM rate_limiter');
    const hashed = await bcrypt.hash('admin123', 12);
    await pool.query(`INSERT INTO users (username,password_hash,nombre,role,nivel,grado)
      VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT(username) DO UPDATE SET password_hash=EXCLUDED.password_hash`,
      ['admin', hashed, 'Admin', 'admin', 'Primaria', '5to']);
    const app = await createApp();
    await new Promise<void>(r => { server = app.listen(0, () => { const a = server.address(); port = typeof a==='object'?a!.port:3001; r(); }); });
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    const data = await res.json() as any; token = data.data.token;
  });

  beforeEach(async () => {
    const pool = getPoolClient(); await pool.query('DELETE FROM rate_limiter');
  });

  afterAll(async () => { await new Promise<void>(r => server?.close(() => r())); await closePool(); });

  test('GET /diagnosticos returns 200 with user diagnostics', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/diagnosticos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.data).toBeDefined();
  });

  test('POST /diagnosticos creates a diagnostic record', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/diagnosticos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ estudiante: 'Juan Perez', nivel: 'Primaria', area: 'Matematicas' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.data.id).toBeDefined();
  });

  test('unauthenticated request returns 401', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/diagnosticos`);
    expect(res.status).toBe(401);
  });
});
