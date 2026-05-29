-- PRIA v10 Migration 002 — Rate Limiter table
-- Replaces in-memory Map rate limiting with Postgres-backed atomic counters

CREATE TABLE IF NOT EXISTS rate_limiter (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limiter_reset_at ON rate_limiter (reset_at);
