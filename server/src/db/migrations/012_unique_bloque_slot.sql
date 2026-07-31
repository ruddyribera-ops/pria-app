-- Migration 012: Unique constraint on bloques (teacher_code + dia + hora_inicio)
-- Prevents duplicate time slots for the same teacher in the same day.
-- Enables idempotent INSERT ... ON CONFLICT (teacher_code, dia, hora_inicio) DO NOTHING.

CREATE UNIQUE INDEX IF NOT EXISTS idx_bloques_teacher_slot
  ON bloques (teacher_code, dia, hora_inicio);
