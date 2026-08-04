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

// ───────────────────────────────────────────────────────────────────────────
// Password reset flow
//
// These tests share a single seeded admin user and use the same app/server
// boot pattern as the login/me describes. They isolate themselves by
// truncating password_reset_tokens in beforeEach.
// ───────────────────────────────────────────────────────────────────────────

describe('Password reset flow', () => {
  let server: http.Server;
  let port: number;
  const ADMIN_EMAIL = 'admin@pria.local';

  beforeAll(async () => {
    try { await (await import('../../db/connection.js')).getPoolClient(); } catch { throw new Error('PostgreSQL required'); }
    await initDatabase(); initDB();

    const pool = getPoolClient();
    await pool.query('DELETE FROM rate_limit_buckets');
    await pool.query('DELETE FROM password_reset_tokens');
    const hashed = await bcrypt.hash('admin123', 12);
    await pool.query(
      `INSERT INTO users (username, password_hash, email, nombre, role, nivel, grado)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (username) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         email = EXCLUDED.email,
         nombre = EXCLUDED.nombre,
         role = EXCLUDED.role`,
      ['admin', hashed, ADMIN_EMAIL, 'Administrador', 'admin', 'Primaria', '5to']
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
    const pool = getPoolClient();
    await pool.query('DELETE FROM rate_limit_buckets');
    await pool.query('DELETE FROM password_reset_tokens');
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server?.close(() => resolve()));
    await closePool();
  });

  test('forgot-password by email creates a token row and returns raw token in dev', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL }),
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(typeof data.resetToken).toBe('string');
    expect(data.resetToken).toMatch(/^[0-9a-f]{64}$/);

    const pool = getPoolClient();
    const rows = await pool.query(
      `SELECT user_id, token_hash, expires_at, used_at
       FROM password_reset_tokens WHERE user_id = (SELECT id FROM users WHERE username = 'admin')`
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].used_at).toBeNull();
    expect(new Date(rows.rows[0].expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  test('forgot-password by username also resolves the user', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin' }),
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.resetToken).toMatch(/^[0-9a-f]{64}$/);
  });

  test('forgot-password with unknown identifier returns ok:true without leaking', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ghost@nowhere.test' }),
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.resetToken).toBeUndefined(); // never reveal token for unknown user

    const pool = getPoolClient();
    const rows = await pool.query('SELECT COUNT(*)::int AS c FROM password_reset_tokens');
    expect(rows.rows[0].c).toBe(0);
  });

  test('forgot-password with missing identifier returns 400', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  test('verify-reset-token returns valid=true for a fresh token', async () => {
    const fp = await fetch(`http://127.0.0.1:${port}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL }),
    });
    const { resetToken } = await fp.json() as any;

    const res = await fetch(`http://127.0.0.1:${port}/api/auth/verify-reset-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken }),
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.valid).toBe(true);
    expect(data.expired).toBe(false);
    expect(data.used).toBe(false);
  });

  test('verify-reset-token returns expired=true for a stale token', async () => {
    const fp = await fetch(`http://127.0.0.1:${port}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL }),
    });
    const { resetToken } = await fp.json() as any;

    // Force the token to be in the past
    const pool = getPoolClient();
    await pool.query(
      `UPDATE password_reset_tokens SET expires_at = NOW() - INTERVAL '1 hour'`
    );

    const res = await fetch(`http://127.0.0.1:${port}/api/auth/verify-reset-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken }),
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.valid).toBe(false);
    expect(data.expired).toBe(true);
  });

  test('verify-reset-token returns valid=false for an unknown token', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/verify-reset-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'nope-this-is-not-a-real-token' }),
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.valid).toBe(false);
    expect(data.expired).toBe(false);
    expect(data.used).toBe(false);
  });

  test('reset-password with valid token updates the password', async () => {
    const fp = await fetch(`http://127.0.0.1:${port}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL }),
    });
    const { resetToken } = await fp.json() as any;

    const res = await fetch(`http://127.0.0.1:${port}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword: 'newSecret9!' }),
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);

    // Confirm new password works on /login
    const loginRes = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'newSecret9!' }),
    });
    expect(loginRes.status).toBe(200);
    const loginData = await loginRes.json() as any;
    expect(loginData.data.token).toBeDefined();

    // Old password no longer works
    const oldLogin = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    expect(oldLogin.status).toBe(401);
  });

  test('reset-password with expired token fails with "Token expirado"', async () => {
    const fp = await fetch(`http://127.0.0.1:${port}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL }),
    });
    const { resetToken } = await fp.json() as any;

    const pool = getPoolClient();
    await pool.query(
      `UPDATE password_reset_tokens SET expires_at = NOW() - INTERVAL '1 hour'`
    );

    const res = await fetch(`http://127.0.0.1:${port}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword: 'anotherSecret9!' }),
    });
    const data = await res.json() as any;
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/expirado/i);
  });

  test('reset-password with already-used token fails with "Token ya utilizado"', async () => {
    const fp = await fetch(`http://127.0.0.1:${port}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL }),
    });
    const { resetToken } = await fp.json() as any;

    // First reset consumes the token
    const first = await fetch(`http://127.0.0.1:${port}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword: 'firstReset9!' }),
    });
    expect(first.status).toBe(200);

    // Second reset with same token must fail
    const second = await fetch(`http://127.0.0.1:${port}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword: 'secondReset9!' }),
    });
    const data = await second.json() as any;
    expect(second.status).toBe(400);
    expect(data.error).toMatch(/utilizado/i);

    // Confirm the password is the FIRST reset, not the second (atomicity)
    const login = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'firstReset9!' }),
    });
    expect(login.status).toBe(200);
  });

  test('reset-password with unknown token fails with "Token inválido"', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'unknown-token-bytes', newPassword: 'whatever9!' }),
    });
    const data = await res.json() as any;
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/inválido/i);
  });

  test('reset-password with short password (< 8 chars) is rejected', async () => {
    const fp = await fetch(`http://127.0.0.1:${port}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL }),
    });
    const { resetToken } = await fp.json() as any;

    const res = await fetch(`http://127.0.0.1:${port}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword: 'short' }),
    });
    expect(res.status).toBe(400);

    // Token should still be unused (rejected before claim)
    const pool = getPoolClient();
    const rows = await pool.query('SELECT used_at FROM password_reset_tokens');
    expect(rows.rows[0].used_at).toBeNull();
  });

  test('reset-password with missing password is rejected', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'something' }),
    });
    expect(res.status).toBe(400);
  });

  test('forgot-password invalidates any prior unused token for the same user', async () => {
    const fp1 = await fetch(`http://127.0.0.1:${port}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL }),
    });
    const { resetToken: t1 } = await fp1.json() as any;

    const fp2 = await fetch(`http://127.0.0.1:${port}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL }),
    });
    const { resetToken: t2 } = await fp2.json() as any;
    expect(t1).not.toEqual(t2);

    // Old token must no longer be usable
    const old = await fetch(`http://127.0.0.1:${port}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: t1, newPassword: 'hijackAttempt9!' }),
    });
    expect(old.status).toBe(400);

    // New token works
    const fresh = await fetch(`http://127.0.0.1:${port}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: t2, newPassword: 'freshReset9!' }),
    });
    expect(fresh.status).toBe(200);
  });
});

