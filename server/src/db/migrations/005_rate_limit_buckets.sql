-- PRIA v10 Migration 005 — Sliding Window Rate Limit Buckets
-- Replaces the old single-row-per-key rate_limiter with a sliding window approach.
-- Each window_start represents the beginning of a 1-minute bucket.
-- Old buckets are cleaned up periodically (see rateLimiter.ts startRateLimiterCleanup).

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

-- Index for cleanup queries (DELETE WHERE window_start < ...)
CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_window ON rate_limit_buckets (window_start);