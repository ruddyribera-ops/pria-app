/**
 * @vitest-environment node
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import { createApp } from '../../app.js';
import { initDatabase, closePool, getPoolClient } from '../../db/connection.js';
import { initDB } from '../../db/schema.js';
import bcrypt from 'bcryptjs';

describe('Admin routes', () => {
  let server: http.Server;
  let port: number;
  let adminToken: string;
  let teacherToken: string;

  beforeAll(async () => {
    try { await (await import('../../db/connection.js')).getPoolClient(); } catch { throw new Error('PostgreSQL required'); }
    await initDatabase(); initDB();
    const cleanPool = getPoolClient(); await cleanPool.query('DELETE FROM rate_limiter');
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
    const pool = getPoolClient(); await pool.query('DELETE FROM rate_limiter');
  });

  afterAll(async () => { await new Promise<void>(r => server?.close(() => r())); await closePool(); });

  test('GET /admin/estado-sistema returns motor status', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/admin/estado-sistema`);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.data.motors).toBeDefined();
    expect(data.data.motors.synthesis).toBe('idle');
  });

  test('GET /admin/users returns user list for admin', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
  });

  test('POST /admin/users creates a new user for admin', async () => {
    const unique = Date.now();
    const res = await fetch(`http://127.0.0.1:${port}/api/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ usuario: `teacher_${unique}`, password: 'test123', nombre: 'Teacher Test', nivel: 'Secundaria', grado: '1ro' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.data.id).toBeDefined();
  });

  test('POST /admin/users returns 403 for non-admin', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
      body: JSON.stringify({ usuario: 'badactor', password: 'pass', nombre: 'Bad Actor' }),
    });
    expect(res.status).toBe(403);
  });
});
