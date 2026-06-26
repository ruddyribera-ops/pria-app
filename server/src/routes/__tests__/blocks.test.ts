/**
 * @vitest-environment node
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import { createApp } from '../../app.js';
import { initDatabase, closePool, getPoolClient } from '../../db/connection.js';
import { initDB } from '../../db/schema.js';
import bcrypt from 'bcryptjs';

describe('Blocks routes (Bug B4)', () => {
  let server: http.Server;
  let port: number;
  let adminToken: string;
  let teacherToken: string;

  beforeAll(async () => {
    try { await (await import('../../db/connection.js')).getPoolClient(); } catch { throw new Error('PostgreSQL required'); }
    await initDatabase(); initDB();
    const cleanPool = getPoolClient(); await cleanPool.query('DELETE FROM rate_limit_buckets');
    const hashed = await bcrypt.hash('admin123', 12);
    const pool = getPoolClient();
    await pool.query(`INSERT INTO users (username,password_hash,nombre,role,nivel,grado)
      VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT(username) DO UPDATE SET password_hash=EXCLUDED.password_hash`,
      ['admin', hashed, 'Administrador', 'admin', 'Primaria', '5to']);
    const teacherHashed = await bcrypt.hash('teacherpass', 12);
    await pool.query(`INSERT INTO users (username,password_hash,nombre,role,nivel,grado)
      VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT(username) DO UPDATE SET password_hash=EXCLUDED.password_hash`,
      ['teacher', teacherHashed, 'Teacher', 'teacher', 'Secundaria', '1ro']);
    const app = await createApp();
    await new Promise<void>(r => { server = app.listen(0, () => { const a = server.address(); port = typeof a==='object'?a!.port:3001; r(); }); });
    const adminRes = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    const adminData = await adminRes.json() as any;
    if (!adminData?.data?.token) throw new Error(`Admin login failed (${adminRes.status}): ${JSON.stringify(adminData)}`);
    adminToken = adminData.data.token;
    const teacherRes = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'teacher', password: 'teacherpass' }),
    });
    const teacherData = await teacherRes.json() as any;
    if (!teacherData?.data?.token) throw new Error(`Teacher login failed (${teacherRes.status}): ${JSON.stringify(teacherData)}`);
    teacherToken = teacherData.data.token;
  });

  beforeEach(async () => {
    const pool = getPoolClient();
    await pool.query('DELETE FROM rate_limit_buckets');
    await pool.query('DELETE FROM bloques');
  });

  afterAll(async () => { await new Promise<void>(r => server?.close(() => r())); await closePool(); });

  // === Bug B4: Full CRUD for /blocks/ ===
  test('GET /api/blocks/ returns empty array initially', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/blocks/`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBe(0);
  });

  test('POST /api/blocks/ creates a new block', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/blocks/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
      body: JSON.stringify({
        teacher_code: 'TEST_001',
        dia: 'Lunes',
        hora_inicio: '08:00',
        hora_fin: '09:00',
        tipo: 'regular',
        materia: 'Matematicas',
        nivel_grado: '1ro Secundaria',
        ubicacion: 'Aula 101',
        orden: 1,
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.data.id).toBeDefined();
    expect(data.data.teacher_code).toBe('TEST_001');
    expect(data.data.dia).toBe('Lunes');
  });

  test('PUT /api/blocks/:id updates a block', async () => {
    // First create a block
    const createRes = await fetch(`http://127.0.0.1:${port}/api/blocks/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
      body: JSON.stringify({
        teacher_code: 'TEST_002',
        dia: 'Martes',
        hora_inicio: '10:00',
        hora_fin: '11:00',
        tipo: 'regular',
      }),
    });
    const createData = await createRes.json() as any;
    const blockId = createData.data.id;

    const res = await fetch(`http://127.0.0.1:${port}/api/blocks/${blockId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
      body: JSON.stringify({
        dia: 'Miercoles',
        materia: 'Ciencias',
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.data.id).toBe(blockId);
    expect(data.data.dia).toBe('Miercoles');
    expect(data.data.materia).toBe('Ciencias');
  });

  test('DELETE /api/blocks/:id deletes a block', async () => {
    // First create a block
    const createRes = await fetch(`http://127.0.0.1:${port}/api/blocks/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
      body: JSON.stringify({
        teacher_code: 'TEST_003',
        dia: 'Jueves',
        hora_inicio: '12:00',
        hora_fin: '13:00',
        tipo: 'regular',
      }),
    });
    const createData = await createRes.json() as any;
    const blockId = createData.data.id;

    const res = await fetch(`http://127.0.0.1:${port}/api/blocks/${blockId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.data.deleted).toBe(true);
  });

  test('GET /api/blocks/?teacher_code=XXX returns filtered list', async () => {
    // Create blocks with different teacher codes
    await fetch(`http://127.0.0.1:${port}/api/blocks/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
      body: JSON.stringify({
        teacher_code: 'FILTER_A',
        dia: 'Viernes',
        hora_inicio: '14:00',
        hora_fin: '15:00',
        tipo: 'regular',
      }),
    });
    await fetch(`http://127.0.0.1:${port}/api/blocks/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
      body: JSON.stringify({
        teacher_code: 'FILTER_B',
        dia: 'Viernes',
        hora_inicio: '15:00',
        hora_fin: '16:00',
        tipo: 'regular',
      }),
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/blocks/?teacher_code=FILTER_A`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBe(1);
    expect(data.data[0].teacher_code).toBe('FILTER_A');
  });

  test('GET /api/blocks/ returns all blocks without filter', async () => {
    // Create two blocks
    await fetch(`http://127.0.0.1:${port}/api/blocks/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
      body: JSON.stringify({
        teacher_code: 'ALL_1',
        dia: 'Lunes',
        hora_inicio: '08:00',
        hora_fin: '09:00',
        tipo: 'regular',
      }),
    });
    await fetch(`http://127.0.0.1:${port}/api/blocks/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
      body: JSON.stringify({
        teacher_code: 'ALL_2',
        dia: 'Martes',
        hora_inicio: '10:00',
        hora_fin: '11:00',
        tipo: 'regular',
      }),
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/blocks/`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBe(2);
  });

  test('POST /api/blocks/ without auth returns 401', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/blocks/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacher_code: 'UNAUTH_1',
        dia: 'Lunes',
        hora_inicio: '08:00',
        hora_fin: '09:00',
        tipo: 'regular',
      }),
    });
    expect(res.status).toBe(401);
  });

  test('GET /api/blocks/ without auth returns 401', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/blocks/`);
    expect(res.status).toBe(401);
  });

  test('PUT /api/blocks/:id without auth returns 401', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/blocks/999`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dia: 'Miercoles' }),
    });
    expect(res.status).toBe(401);
  });

  test('DELETE /api/blocks/:id without auth returns 401', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/blocks/999`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  });
});

