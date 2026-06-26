/**
 * @vitest-environment node
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../app.js';
import { initDatabase, closePool, getPoolClient } from '../../db/connection.js';
import { initDB } from '../../db/schema.js';
import bcrypt from 'bcryptjs';

describe('Diagnosticos upload route', () => {
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

  test('POST /diagnosticos/upload with valid file and tipo returns 200 with filepath', async () => {
    const form = new FormData();
    const file = new File(['contenido de prueba'], 'test.pdf', { type: 'application/pdf' });
    form.append('file', file);

    const res = await fetch(`http://127.0.0.1:${port}/api/diagnosticos/upload?tipo=lectura`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.data).toBeDefined();
    expect(data.data.id).toBeDefined();
    expect(data.data.filepath).toBeDefined();
    expect(data.data.tipo).toBe('lectura');
  });

  test('POST /diagnosticos/upload without file returns 400', async () => {
    const form = new FormData();

    const res = await fetch(`http://127.0.0.1:${port}/api/diagnosticos/upload?tipo=lectura`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.error).toContain('archivo');
  });

  test('POST /diagnosticos/upload without tipo returns 400', async () => {
    const file = new File(['contenido'], 'test.pdf', { type: 'application/pdf' });
    const form = new FormData();
    form.append('file', file);

    const res = await fetch(`http://127.0.0.1:${port}/api/diagnosticos/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.error).toContain('tipo');
  });

  test('POST /diagnosticos/upload with invalid file type returns 400', async () => {
    const file = new File(['contenido'], 'test.exe', { type: 'application/x-msdownload' });
    const form = new FormData();
    form.append('file', file);

    const res = await fetch(`http://127.0.0.1:${port}/api/diagnosticos/upload?tipo=lectura`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    // multer fileFilter rejects with 500 if error thrown, or we get 400 from our handler
    // The middleware will reject .exe files via diagFilter
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test('GET /diagnosticos after upload includes record with filepath', async () => {
    // Upload a file first
    const file = new File(['contenido'], 'get-test.pdf', { type: 'application/pdf' });
    const form = new FormData();
    form.append('file', file);

    const uploadRes = await fetch(`http://127.0.0.1:${port}/api/diagnosticos/upload?tipo=escrita`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    expect(uploadRes.status).toBe(200);
    const uploadData = await uploadRes.json() as any;
    const diagnosticoId = uploadData.data.id;

    // Fetch all diagnosticos
    const getRes = await fetch(`http://127.0.0.1:${port}/api/diagnosticos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getRes.status).toBe(200);
    const getData = await getRes.json() as any;
    const found = getData.data.find((d: any) => d.id === diagnosticoId);
    expect(found).toBeDefined();
    expect(found.filepath).toBeDefined();
    expect(found.tipo).toBe('escrita');
  });

  test('unauthenticated upload request returns 401', async () => {
    const file = new File(['contenido'], 'test.pdf', { type: 'application/pdf' });
    const form = new FormData();
    form.append('file', file);

    const res = await fetch(`http://127.0.0.1:${port}/api/diagnosticos/upload?tipo=lectura`, {
      method: 'POST',
      body: form,
    });

    expect(res.status).toBe(401);
  });
});

