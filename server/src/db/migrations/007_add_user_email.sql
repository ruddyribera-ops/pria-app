-- Migration 007: Add email column to users table
-- For password reset feature which queries users by email

ALTER TABLE users ADD COLUMN email TEXT;

-- Index for fast lookups (case-insensitive via LOWER in query)
CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;

-- Basic email format validation
ALTER TABLE users ADD CONSTRAINT users_email_format
  CHECK (email IS NULL OR email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$');