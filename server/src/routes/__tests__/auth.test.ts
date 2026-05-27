/**
 * Integration tests for POST /api/auth/login.
 * Requires PostgreSQL running (DATABASE_URL or default Docker PG).
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../app.js';
import { initDatabase, closePool } from '../../db/connection.js';
import { initDB } from '../../db/schema.js';
import { seed } from '../../db/seed.js';

describe('POST /api/auth/login', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    await initDatabase();
    initDB();
    await seed();
    const app = await createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        port = typeof addr === 'object' ? (addr as any).port : 3001;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
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
    expect(data.data.token.split('.')).toHaveLength(3); // JWT has 3 parts
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
});
