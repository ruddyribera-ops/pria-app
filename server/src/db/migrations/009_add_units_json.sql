-- Add units_json column to store parsed units for existing materials
ALTER TABLE materials ADD COLUMN IF NOT EXISTS units_json TEXT;
