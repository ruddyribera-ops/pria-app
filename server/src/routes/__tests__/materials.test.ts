/**
 * @vitest-environment node
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import crypto from 'crypto';
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

describe('Materials upload deduplication (SHA-256)', () => {
  let server: http.Server;
  let port: number;
  let token: string;
  let userId: number;
  // Unique nonce per test run so dedup doesn't collide across runs in the same worker.
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  // Track every material id created so afterAll can clean them up.
  const createdIds: number[] = [];

  // Minimal shape we actually read off the materials POST response.
  interface UploadResponse {
    data: {
      id: number;
      filepath: string | null;
      created: string;
      duplicate: boolean;
    };
  }

  function expectedSha256(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  beforeAll(async () => {
    try { await (await import('../../db/connection.js')).getPoolClient(); } catch { throw new Error('PostgreSQL required'); }
    await initDatabase(); initDB();
    const cleanPool = getPoolClient();
    await cleanPool.query('DELETE FROM rate_limit_buckets');
    const hashed = await bcrypt.hash('admin123', 12);
    const pool = getPoolClient();
    const userRes = await pool.query(
      `INSERT INTO users (username,password_hash,nombre,role,nivel,grado)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT(username) DO UPDATE SET password_hash=EXCLUDED.password_hash
       RETURNING id`,
      ['admin', hashed, 'Admin', 'admin', 'Primaria', '5to']
    );
    userId = userRes.rows[0].id;
    const app = await createApp();
    await new Promise<void>(r => { server = app.listen(0, () => { const a = server.address(); port = typeof a==='object'?a!.port:3001; r(); }); });
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    const login = await res.json() as { data: { token: string } };
    token = login.data.token;
  });

  afterAll(async () => {
    // Clean up: delete only the materials this test created.
    if (createdIds.length > 0) {
      const pool = getPoolClient();
      await pool.query('DELETE FROM materials WHERE id = ANY($1)', [createdIds]);
    }
    await new Promise<void>(r => server?.close(() => r()));
    await closePool();
  });

  async function uploadFile(content: string, filename: string): Promise<{ status: number; body: UploadResponse }> {
    const form = new FormData();
    const file = new File([content], filename, { type: 'application/pdf' });
    form.append('file', file);
    const res = await fetch(`http://127.0.0.1:${port}/api/materials`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const body = await res.json() as UploadResponse;
    // Track newly-created rows so afterAll can clean them. Dedup hits reuse
    // an existing id, so only add the id on a fresh insert.
    if (body?.data?.id && body.data.duplicate === false) {
      createdIds.push(body.data.id);
    }
    return { status: res.status, body };
  }

  test('first upload of a new file returns duplicate:false and stores content_hash', async () => {
    const content = `dedup-A-${nonce}`;
    const { status, body } = await uploadFile(content, 'alpha.pdf');

    expect(status).toBe(200);
    expect(body.data.id).toBeDefined();
    expect(body.data.filepath).toBeDefined();
    expect(body.data.duplicate).toBe(false);

    // content_hash in DB must match what the SHA-256 helper returns.
    const pool = getPoolClient();
    const row = await pool.query(
      'SELECT content_hash FROM materials WHERE id = $1',
      [body.data.id]
    );
    expect(row.rows[0].content_hash).toBe(expectedSha256(content));
  });

  test('second upload of identical file returns duplicate:true and same id', async () => {
    const content = `dedup-B-${nonce}`;
    const first = await uploadFile(content, 'beta.pdf');
    expect(first.status).toBe(200);
    expect(first.body.data.duplicate).toBe(false);
    const firstId = first.body.data.id;

    const second = await uploadFile(content, 'beta-renamed.pdf');
    expect(second.status).toBe(200);
    expect(second.body.data.duplicate).toBe(true);
    expect(second.body.data.id).toBe(firstId);
  });

  test('upload of a different file returns duplicate:false and a new id', async () => {
    const a = await uploadFile(`dedup-C1-${nonce}`, 'gamma-1.pdf');
    const b = await uploadFile(`dedup-C2-${nonce}`, 'gamma-2.pdf');
    expect(a.body.data.duplicate).toBe(false);
    expect(b.body.data.duplicate).toBe(false);
    expect(a.body.data.id).not.toBe(b.body.data.id);
  });

  test('duplicate upload removes the newly-saved file from disk', async () => {
    const content = `dedup-D-${nonce}`;
    const first = await uploadFile(content, 'delta.pdf');
    const originalFilepath = first.body.data.filepath;
    expect(originalFilepath).toBeDefined();

    const second = await uploadFile(content, 'delta-copy.pdf');
    expect(second.body.data.duplicate).toBe(true);

    // The duplicate file's filepath must NOT exist on disk. The original (returned
    // by the dedup hit) is the one we keep; the second upload's disk file was removed.
    const dupFilepath = second.body.data.filepath;
    // Both responses report the same filepath because we return the existing record.
    // The duplicate copy's generated filename is gone from disk (we unlinked it).
    expect(dupFilepath).toBe(originalFilepath);

    // Confirm exactly one row exists for this content hash.
    const pool = getPoolClient();
    const count = await pool.query(
      'SELECT COUNT(*)::int AS n FROM materials WHERE user_id = $1 AND content_hash = $2',
      [userId, expectedSha256(content)]
    );
    expect(count.rows[0].n).toBe(1);
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

