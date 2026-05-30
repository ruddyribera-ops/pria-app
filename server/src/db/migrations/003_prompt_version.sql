-- Migration 003: Add prompt_version column
-- Tracks which prompt file version (git SHA) produced each motor result

ALTER TABLE motor_results ADD COLUMN IF NOT EXISTS prompt_version TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS prompt_version TEXT;

-- Index for tracing prompt versions
CREATE INDEX IF NOT EXISTS idx_motor_results_prompt_version ON motor_results(prompt_version);
