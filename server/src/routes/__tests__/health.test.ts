/**
 * @vitest-environment node
 *
 * Integration tests for /api/health — require a live PostgreSQL connection.
 *
 * Setup:   docker start pria-pg  (or set DATABASE_URL to your local PostgreSQL)
 * Skip:    Set SKIP_INTEGRATION_TESTS=true to skip this file entirely
 *
 * The 3 healthy-path tests (200 OK, db=connected) will FAIL their `beforeAll`
 * hook without a running PostgreSQL. This is intentional — these are
 * integration tests, not unit tests.
 *
 * For the 503 DB-down path (no PostgreSQL required), see
 * ./health-db-down.test.ts — those tests are runnable anywhere.
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../app.js';
import { initDatabase, closePool } from '../../db/connection.js';
import { initDB } from '../../db/schema.js';
import { seed } from '../../db/seed.js';

const SKIP_INTEGRATION = process.env.SKIP_INTEGRATION_TESTS === 'true';
const describeIf = SKIP_INTEGRATION ? describe.skip : describe;

describeIf('GET /api/health -- happy path (requires PostgreSQL)', () => {
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

  test('returns healthy status with db=connected', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.db).toBe('connected');
    expect(data.dbLatencyMs).toBeGreaterThanOrEqual(0);
    expect(data.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test('returns uptime and ISO timestamp', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    const data = await res.json() as any;
    expect(typeof data.uptime).toBe('number');
    expect(data.uptime).toBeGreaterThanOrEqual(0);
    expect(data.timestamp).toBeDefined();
  });

  test('health endpoint is unauthenticated', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    expect(res.status).toBe(200);
  });
});

