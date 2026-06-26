/**
 * @vitest-environment node
 */
// Tests for GET /api/health when DB is down (503 path).
// Uses vi.mock at file level — isolated to this file only.
import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import { createApp } from '../../app.js';
import { closePool } from '../../db/connection.js';

vi.mock('../../db/connection.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../db/connection.js')>();
  return {
    ...actual,
    getPoolClient: vi.fn().mockReturnValue({
      query: vi.fn().mockRejectedValue(new Error('Connection refused (mocked)')),
    }),
    getPool: vi.fn().mockImplementation(() => {
      throw new Error('PostgreSQL pool unavailable (mocked)');
    }),
  };
});

describe('GET /api/health -- DB down', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
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

  test('returns 503 with db: "disconnected"', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    const data = await res.json() as any;
    expect(res.status).toBe(503);
    expect(data.status).toBe('degraded');
    expect(data.db).toBe('disconnected');
  });
});

