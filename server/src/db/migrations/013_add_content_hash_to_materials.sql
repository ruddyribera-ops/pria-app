-- Migration 013: Add content_hash to materials for upload deduplication.
-- SHA-256 hex string is 64 chars. NULL = legacy record or JSON-only create (no file).

ALTER TABLE materials ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);

-- Partial unique index: only enforce uniqueness when content_hash is set.
-- Prevents race conditions where two concurrent uploads of the same file
-- both pass the existence check and both try to INSERT.
CREATE UNIQUE INDEX IF NOT EXISTS idx_materials_user_content_hash
  ON materials (user_id, content_hash)
  WHERE content_hash IS NOT NULL;

-- Plain lookup index for content_hash-only queries (admin tooling, debug).
CREATE INDEX IF NOT EXISTS idx_materials_content_hash
  ON materials (content_hash);
