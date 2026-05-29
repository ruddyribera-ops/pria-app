/**
 * @vitest-environment node
 */
// Integration tests for GET /api/health.
// Requires PostgreSQL running (docker start pria-pg).
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../app.js';
import { initDatabase, closePool } from '../../db/connection.js';
import { initDB } from '../../db/schema.js';
import { seed } from '../../db/seed.js';

describe('GET /api/health', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    try {
      const pool = (await import('../../db/connection.js')).getPoolClient();
      await pool.query('SELECT 1');
    } catch {
      throw new Error(
        'PostgreSQL is required for integration tests. ' +
        'Run "docker start pria-pg" or set DATABASE_URL.'
      );
    }
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

  test('returns healthy status with db=ok', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.checks.database).toBe('ok');
    expect(data.checks.server).toBe('ok');
  });

  test('returns version 10.0.0 and uptime', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    const data = await res.json() as any;
    expect(data.version).toBe('10.0.0');
    expect(typeof data.uptime).toBe('number');
    expect(data.uptime).toBeGreaterThanOrEqual(0);
  });
});
