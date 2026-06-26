-- Motor state persistence table
-- Stores per-user, per-motor state to survive server restarts
CREATE TABLE IF NOT EXISTS motor_state (
  user_id      INTEGER NOT NULL,
  motor_type   TEXT    NOT NULL,
  status       TEXT    NOT NULL,
  last_updated BIGINT NOT NULL,   -- unix ms timestamp (BIGINT for ms-since-epoch)
  metadata     TEXT,              -- JSON string
  PRIMARY KEY (user_id, motor_type)
);

-- Index for efficient lookups by user
CREATE INDEX IF NOT EXISTS idx_motor_state_user_id ON motor_state (user_id);
