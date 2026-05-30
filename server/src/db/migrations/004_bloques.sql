-- Migration 004: Schedule time-blocks for teachers
-- Blocks define available time slots per teacher per day

CREATE TABLE IF NOT EXISTS bloques (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  teacher_code TEXT NOT NULL,
  dia TEXT NOT NULL,
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT NOT NULL,
  tipo TEXT NOT NULL,
  materia TEXT,
  nivel_grado TEXT,
  ubicacion TEXT,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_bloques_teacher_code ON bloques (teacher_code);
CREATE INDEX IF NOT EXISTS idx_bloques_teacher_dia ON bloques (teacher_code, dia);