/**
 * @vitest-environment node
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import { createApp } from '../../app.js';
import { initDatabase, closePool, getPoolClient } from '../../db/connection.js';
import { initDB } from '../../db/schema.js';
import bcrypt from 'bcryptjs';

const validAlpha2 = {
  unidad_real: 'Unidad 1 — Numeros y Operaciones',
  temas: ['Suma y resta', 'Multiplicacion', 'Division'],
  contenido_temas: {
    'Suma y resta': 'En esta unidad los estudiantes aprenderan a sumar y restar numeros naturales de hasta tres cifras.',
    'Multiplicacion': 'Se introducira el concepto de multiplicacion como suma repetida y se practicaran las tablas.',
    'Division': 'Se presentara la division como la operacion inversa de la multiplicacion con dividendos pequenos.',
  },
  paginas_temas: {
    'Suma y resta': 'pp. 12-18',
    'Multiplicacion': 'pp. 19-25',
    'Division': 'pp. 26-30',
  },
};

describe('Motores routes', () => {
  let server: http.Server;
  let port: number;
  let token: string;

  beforeAll(async () => {
    try { await (await import('../../db/connection.js')).getPoolClient(); } catch { throw new Error('PostgreSQL required'); }
    await initDatabase(); initDB();
    const pool = getPoolClient(); await pool.query('DELETE FROM rate_limit_buckets');
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
    const pool = getPoolClient(); await pool.query('DELETE FROM rate_limit_buckets');
  });

  afterAll(async () => { await new Promise<void>(r => server?.close(() => r())); await closePool(); });

  test('POST /motores/synthesis returns 200 (mock or real)', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/motores/synthesis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ alpha2: validAlpha2, grado_nivel: '5to Primaria' }),
    });
    expect([200, 422, 429]).toContain(res.status);
  });

  test('POST /motores/abp returns 200 or 429 or 422', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/motores/abp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ alpha2: validAlpha2, grado_nivel: '5to Primaria' }),
    });
    expect([200, 422, 429]).toContain(res.status);
  });

  test('POST /motores/assessment returns 200 or 429 or 422', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/motores/assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ alpha2: validAlpha2, grado_nivel: '5to Primaria' }),
    });
    expect([200, 422, 429]).toContain(res.status);
  });

  test('POST /motores/plan returns 200 or 429 or 422', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/motores/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ alpha2: validAlpha2, grado_nivel: '5to Primaria' }),
    });
    expect([200, 422, 429]).toContain(res.status);
  });

  test('unauthenticated motor request returns 401', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/motores/synthesis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alpha2: validAlpha2, grado_nivel: '5to Primaria' }),
    });
    expect(res.status).toBe(401);
  });

  // === Bug B6: Motor routes must NOT crash without curriculum_id ===
  test('POST /motores/synthesis without curriculum_id does NOT crash (Bug B6)', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/motores/synthesis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ alpha2: validAlpha2, grado_nivel: '5to Primaria' }),
    });
    // Must NOT return 500 (crash) - should return 200, 422, or 429
    expect(res.status).not.toBe(500);
    expect([200, 422, 429]).toContain(res.status);
  });

  test('POST /motores/plan without curriculum_id does NOT crash (Bug B6)', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/motores/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ alpha2: validAlpha2, grado_nivel: '5to Primaria' }),
    });
    // Must NOT return 500 (crash) - should return 200, 422, or 429
    expect(res.status).not.toBe(500);
    expect([200, 422, 429]).toContain(res.status);
  });

  test('POST /motores/abp without curriculum_id does NOT crash (Bug B6)', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/motores/abp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ alpha2: validAlpha2, grado_nivel: '5to Primaria' }),
    });
    // Must NOT return 500 (crash) - should return 200, 422, or 429
    expect(res.status).not.toBe(500);
    expect([200, 422, 429]).toContain(res.status);
  });

  test('POST /motores/assessment without curriculum_id does NOT crash (Bug B6)', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/motores/assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ alpha2: validAlpha2, grado_nivel: '5to Primaria' }),
    });
    // Must NOT return 500 (crash) - should return 200, 422, or 429
    expect(res.status).not.toBe(500);
    expect([200, 422, 429]).toContain(res.status);
  });
});

