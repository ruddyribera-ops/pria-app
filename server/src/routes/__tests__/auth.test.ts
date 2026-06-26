/**
 * @vitest-environment node
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import { createApp } from '../../app.js';
import { initDatabase, closePool, getPoolClient } from '../../db/connection.js';
import { initDB } from '../../db/schema.js';
import { seed } from '../../db/seed.js';
import bcrypt from 'bcryptjs';

describe('POST /api/auth/login', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    try { await (await import('../../db/connection.js')).getPoolClient(); } catch { throw new Error('PostgreSQL required'); }
    await initDatabase(); initDB();

    const pool = getPoolClient(); await pool.query('DELETE FROM rate_limit_buckets');
    const hashed = await bcrypt.hash('admin123', 12);
    await pool.query(
      `INSERT INTO users (username, password_hash, nombre, role, nivel, grado)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (username) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         nombre = EXCLUDED.nombre,
         role = EXCLUDED.role`,
      ['admin', hashed, 'Administrador', 'admin', 'Primaria', '5to']
    );

    const app = await createApp();
    await new Promise<void>(resolve => {
      server = app.listen(0, () => {
        const addr = server.address();
        port = typeof addr === 'object' ? (addr as any).port : 3001;
        resolve();
      });
    });
  });

  beforeEach(async () => {
    const pool = getPoolClient(); await pool.query('DELETE FROM rate_limit_buckets');
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server?.close(() => resolve()));
    await closePool();
  });

  test('valid admin credentials return JWT', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.data.token).toBeDefined();
    expect(typeof data.data.token).toBe('string');
    expect(data.data.token.split('.')).toHaveLength(3);
    expect(data.data.user.nombre).toBe('Administrador');
    expect(data.data.user.role).toBe('admin');
  });

  test('invalid password returns 401', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrong' }),
    });
    const data = await res.json() as any;
    expect(res.status).toBe(401);
    expect(data.error).toBe('Credenciales inválidas');
  });

  test('unknown user returns 401', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'ghost', password: 'any' }),
    });
    const data = await res.json() as any;
    expect(res.status).toBe(401);
    expect(data.error).toBe('Credenciales inválidas');
  });

  test('missing body returns 400', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });

  test('empty body {} returns 400', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  test('malformed JSON returns 400', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ invalid json',
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  let server: http.Server;
  let port: number;
  let adminToken: string;
  let invalidToken: string;

  beforeAll(async () => {
    try { await (await import('../../db/connection.js')).getPoolClient(); } catch { throw new Error('PostgreSQL required'); }
    await initDatabase(); initDB();

    const pool = getPoolClient(); await pool.query('DELETE FROM rate_limit_buckets');
    const hashed = await bcrypt.hash('admin123', 12);
    await pool.query(
      `INSERT INTO users (username, password_hash, nombre, role, nivel, grado)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (username) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         nombre = EXCLUDED.nombre,
         role = EXCLUDED.role`,
      ['admin', hashed, 'Administrador', 'admin', 'Primaria', '5to']
    );

    const app = await createApp();
    await new Promise<void>(resolve => {
      server = app.listen(0, () => {
        const addr = server.address();
        port = typeof addr === 'object' ? (addr as any).port : 3001;
        resolve();
      });
    });

    const loginRes = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    const loginData = await loginRes.json() as any;
    adminToken = loginData.data.token;
    invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
  });

  beforeEach(async () => {
    const pool = getPoolClient(); await pool.query('DELETE FROM rate_limit_buckets');
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server?.close(() => resolve()));
    await closePool();
  });

  test('getMe with valid token returns user data', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.data.id).toBeDefined();
    expect(data.data.nombre).toBe('Administrador');
    expect(data.data.role).toBe('admin');
  });

  test('getMe with invalid token returns 401', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${invalidToken}` },
    });
    expect(res.status).toBe(401);
  });

  test('getMe without token returns 401', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/me`, {
      method: 'GET',
    });
    expect(res.status).toBe(401);
  });
});

