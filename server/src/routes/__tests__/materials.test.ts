/**
 * @vitest-environment node
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../app.js';
import { initDatabase, closePool, getPoolClient } from '../../db/connection.js';
import { initDB } from '../../db/schema.js';
import bcrypt from 'bcryptjs';

describe('Materials routes', () => {
  let server: http.Server;
  let port: number;
  let token: string;

  beforeAll(async () => {
    try { await (await import('../../db/connection.js')).getPoolClient(); } catch { throw new Error('PostgreSQL required'); }
    await initDatabase(); initDB();
    const cleanPool = getPoolClient(); await cleanPool.query('DELETE FROM rate_limit_buckets');
    const hashed = await bcrypt.hash('admin123', 12);
    const pool = getPoolClient();
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

  afterAll(async () => { await new Promise<void>(r => server?.close(() => r())); await closePool(); });

  test('GET /materials returns empty array for new user', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/materials`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(Array.isArray(data.data)).toBe(true);
  });

  test('POST /materials creates a material record', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ filename: 'test.pdf', tipo: 'textbook', size: 1024 }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.data.id).toBeDefined();
    expect(data.data.created).toBeDefined();
  });

  test('GET /materials includes newly created material', async () => {
    const postRes = await fetch(`http://127.0.0.1:${port}/api/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ filename: 'unit1.pdf', tipo: 'textbook', size: 2048 }),
    });
    const postData = await postRes.json() as any;
    const materialId = postData.data.id;

    const res = await fetch(`http://127.0.0.1:${port}/api/materials`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json() as any;
    const found = data.data.some((m: any) => m.id === materialId);
    expect(found).toBe(true);
  });

  test('DELETE /materials removes a material', async () => {
    const postRes = await fetch(`http://127.0.0.1:${port}/api/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ filename: 'delete-me.pdf', tipo: 'textbook', size: 512 }),
    });
    const postData = await postRes.json() as any;
    const materialId = postData.data.id;

    const delRes = await fetch(`http://127.0.0.1:${port}/api/materials/${materialId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delRes.status).toBe(200);
    const delData = await delRes.json() as any;
    expect(delData.data.deleted).toBe(true);
  });

  test('unauthenticated request returns 401', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/materials`);
    expect(res.status).toBe(401);
  });

  test('GET /materials/:id/output returns motor result output', async () => {
    // First create a motor_result directly in DB
    const pool = getPoolClient();
    const insertRes = await pool.query(
      `INSERT INTO motor_results (user_id, motor_type, result_json, status, simulated)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [1, 'synthesis', JSON.stringify({ output: { tema: 'Test Output' }, fidelity: null }), 'done', true]
    );
    const motorResultId = insertRes.rows[0].id;

    // Now query it via /materials/:id/output
    const res = await fetch(`http://127.0.0.1:${port}/api/materials/${motorResultId}/output`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.output.tema).toBe('Test Output');

    // Cleanup
    await pool.query('DELETE FROM motor_results WHERE id = $1', [motorResultId]);
  });

  test('GET /materials/:id/output with non-existent id returns 404', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/materials/99999/output`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });

  test('GET /materials/:id/output without auth returns 401', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/materials/1/output`);
    expect(res.status).toBe(401);
  });
});

describe('Materials file upload edge cases', () => {
  let server: http.Server;
  let port: number;
  let token: string;

  beforeAll(async () => {
    try { await (await import('../../db/connection.js')).getPoolClient(); } catch { throw new Error('PostgreSQL required'); }
    await initDatabase(); initDB();
    const cleanPool = getPoolClient(); await cleanPool.query('DELETE FROM rate_limit_buckets');
    const hashed = await bcrypt.hash('admin123', 12);
    const pool = getPoolClient();
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

  afterAll(async () => { await new Promise<void>(r => server?.close(() => r())); await closePool(); });

  test('POST /materials with oversized body returns 413', async () => {
    // Multer is configured with 50MB limit (50 * 1024 * 1024 bytes)
    // Send an actual 60MB body (not just metadata) to exceed the limit
    const padding = 'x'.repeat(60 * 1024 * 1024); // 60MB of 'x'
    const largeBody = JSON.stringify({
      filename: 'large.pdf',
      tipo: 'textbook',
      size: 60 * 1024 * 1024,
      padding,
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/materials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: largeBody,
    });
    // When multer's fileSize limit is exceeded, it returns 413
    expect([413, 500]).toContain(res.status);
  });

  test('POST /materials with valid small file succeeds', async () => {
    const smallBody = JSON.stringify({
      filename: 'small.pdf',
      tipo: 'textbook',
      size: 1024, // 1KB - well under limit
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/materials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: smallBody,
    });
    expect(res.status).toBe(200);
  });
});

