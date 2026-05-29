import type { Request, Response, NextFunction } from 'express';
import { dbRun, dbGet } from '../db/schema.js';

interface RateLimitRow {
  key: string;
  count: number;
  reset_at: Date;
}

/**
 * Postgres-backed rate limiter middleware.
 * Uses atomic upsert + window enforcement to handle multi-instance deployments.
 * Expects rate_limiter table from migration 002.
 */
export function createRateLimiter(maxReqs: number, windowMs: number) {
  const windowSec = Math.ceil(windowMs / 1000);

  return async function rateLimiter(req: Request, res: Response, next: NextFunction) {
    const key = `ratelimit:${req.ip}:${req.path}`;

    try {
      // Atomic upsert: insert on first hit, increment on subsequent
      await dbRun(
        `INSERT INTO rate_limiter (key, count, reset_at)
         VALUES ($1, 1, NOW() + INTERVAL '${windowSec} seconds')
         ON CONFLICT (key) DO UPDATE SET
           count = rate_limiter.count + 1,
           reset_at = CASE
             WHEN rate_limiter.reset_at > NOW() THEN rate_limiter.reset_at
             ELSE NOW() + INTERVAL '${windowSec} seconds'
           END`,
        [key]
      );

      const row = await dbGet<RateLimitRow>(
        'SELECT count, reset_at FROM rate_limiter WHERE key = $1',
        [key]
      );

      if (row && row.count > maxReqs) {
        res.set('Retry-After', String(windowSec));
        return res.status(429).json({ error: 'Too many requests' });
      }
    } catch (err) {
      // If rate limiter DB fails, log but don't block the request
      console.error('[rateLimiter] DB error:', err);
    }

    next();
  };
}

/** Motor generation limiter: 60 req/hour per user */
export const motorLimiter = createRateLimiter(60, 60 * 60 * 1000);

/** Auth rate limiter: 50 req/min per IP (supports E2E parallel test runs) */
export const authLimiter = createRateLimiter(50, 60 * 1000);

// Periodic cleanup — run hourly to purge expired entries
let cleanupTimer: NodeJS.Timeout | null = null;

export function startRateLimiterCleanup(intervalMs = 3600 * 1000) {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(async () => {
    try {
      await dbRun('DELETE FROM rate_limiter WHERE reset_at < NOW()');
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
