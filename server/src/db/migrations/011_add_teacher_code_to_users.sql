-- Migration 011: Add teacher_code to users table
-- Links docentes to their schedule blocks (bloques table references teacher_code)

ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_teacher_code ON users(teacher_code) WHERE teacher_code IS NOT NULL;
