-- PRIA v10 Initial Schema — Migration 001
-- Complete schema with proper types, foreign keys, and TIMESTAMPTZ

CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nombre TEXT NOT NULL,
  role TEXT DEFAULT 'teacher',
  nivel TEXT DEFAULT 'Primaria',
  grado TEXT DEFAULT '5to',
  student_book BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS materials (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  tipo TEXT DEFAULT 'textbook',
  size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS curriculums (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL,
  unidad_real TEXT NOT NULL,
  temas TEXT NOT NULL,
  contenido_temas TEXT NOT NULL,
  paginas_temas TEXT NOT NULL,
  raw_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS motor_results (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  curriculum_id INTEGER REFERENCES curriculums(id) ON DELETE CASCADE,
  motor_type TEXT NOT NULL,
  result_json TEXT NOT NULL,
  status TEXT DEFAULT 'done',
  simulated BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diagnosticos (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  estudiante TEXT NOT NULL,
  nivel TEXT NOT NULL,
  area TEXT,
  fecha TEXT,
  resultado TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_motor_results_user_type ON motor_results(user_id, motor_type);
CREATE INDEX IF NOT EXISTS idx_motor_results_created ON motor_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_curriculums_user ON curriculums(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_user ON materials(user_id);
