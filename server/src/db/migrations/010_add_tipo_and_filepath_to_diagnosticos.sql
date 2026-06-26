-- Add tipo and filepath columns to diagnosticos table for file upload support
ALTER TABLE diagnosticos ADD COLUMN IF NOT EXISTS tipo TEXT;
ALTER TABLE diagnosticos ADD COLUMN IF NOT EXISTS filepath TEXT;
