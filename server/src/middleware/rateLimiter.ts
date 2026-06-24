import type { Request, Response, NextFunction } from 'express';
import { getPoolClient } from '../db/connection.js';
import { dbRun } from '../db/schema.js';

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 req/min default

interface RateLimitBucket {
  key: string;
  window_start: Date;
  count: number;
}

/**
 * Postgres-backed sliding window rate limiter middleware.
 * Uses atomic upsert on (key, window_start) to handle concurrent requests
 * and multi-instance (Railway replicas) deployments.
 * Expects rate_limit_buckets table from migration 005.
 */
export function createRateLimiter(
  maxReqs: number = MAX_REQUESTS_PER_WINDOW,
  windowMs: number = WINDOW_MS
) {
  return async function rateLimiter(req: Request, res: Response, next: NextFunction) {
    // Include path in key so different endpoints have independent limits
    const key = `ratelimit:${req.ip}:${req.path}`;
    // Truncate to window boundary (sliding window start)
    const windowStart = new Date(
      Math.floor(Date.now() / windowMs) * windowMs
    );

    try {
      // Atomic upsert: insert new bucket OR increment existing one
      // Use raw pool.query (not dbRun) to capture RETURNING count
      const pool = getPoolClient();
      const result = await pool.query(
        `INSERT INTO rate_limit_buckets (key, window_start, count)
         VALUES ($1, $2, 1)
         ON CONFLICT (key, window_start)
         DO UPDATE SET count = rate_limit_buckets.count + 1
         RETURNING count`,
        [key, windowStart]
      );

      // Use the count directly from the upsert's RETURNING — no second query needed
      const count = result.rows[0]?.count ?? 1;
      const remaining = Math.max(0, maxReqs - count);

      res.setHeader('X-RateLimit-Limit', String(maxReqs));
      res.setHeader('X-RateLimit-Remaining', String(remaining));

      if (count > maxReqs) {
        const retryAfter = Math.ceil(windowMs / 1000);
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({ error: 'Too many requests' });
      }
    } catch (err) {
      // Fail open — don't block requests if DB has an issue
      console.error('[rateLimiter] DB error — failing open:', err);
    }

    next();
  };
}

/** Motor generation limiter: 60 req/hour per user */
export const motorLimiter = createRateLimiter(60, 60 * 60 * 1000);

/** Auth rate limiter: 5 req/min per IP — prevents brute-force login attacks */
export const authLimiter = createRateLimiter(5, 60 * 1000);

// Periodic cleanup — run hourly to purge expired entries
let cleanupTimer: NodeJS.Timeout | null = null;

export function startRateLimiterCleanup(intervalMs = 3600 * 1000) {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(async () => {
    try {
      // Delete buckets older than the longest window we use (1 hour)
      const cutoff = new Date(Date.now() - 60 * 60 * 1000);
      await dbRun('DELETE FROM rate_limit_buckets WHERE window_start < $1', [cutoff]);
      console.log('[rateLimiter] Cleanup: removed old buckets');
    } catch (err) {
      console.error('[rateLimiter] cleanup error:', err);
    }
  }, intervalMs);
}

export function stopRateLimiterCleanup() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}