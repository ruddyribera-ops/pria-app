-- PRIA v10 Migration 006 — Password Reset Tokens
-- Stores hashed reset tokens with expiry and used flag.
-- Raw tokens are NEVER stored — only SHA-256 hashes.
-- Tokens are invalidated after use and expire after 1 hour.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,                    -- SHA-256 of raw token — never store raw
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,                         -- NULL = not used yet
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user lookups (when generating new token, invalidate old ones)
CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_tokens (user_id);

-- Index for token hash lookups (main lookup path when resetting)
CREATE INDEX IF NOT EXISTS idx_password_reset_token_hash ON password_reset_tokens (token_hash);

-- Index for expiry cleanup (find expired tokens for deletion)
CREATE INDEX IF NOT EXISTS idx_password_reset_expires_at ON password_reset_tokens (expires_at);