-- Add filepath column to materials table if not exists
ALTER TABLE materials ADD COLUMN IF NOT EXISTS filepath TEXT;
