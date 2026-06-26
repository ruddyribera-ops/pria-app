/**
 * Motor state persistence layer.
 *
 * Maintains an in-memory Map for synchronous reads (required by existing sync API),
 * with asynchronous PostgreSQL writes for durability across restarts.
 *
 * Schema:
 *   motor_state(user_id, motor_type, status, last_updated, metadata)
 *   PRIMARY KEY (user_id, motor_type)
 */
import { getPoolClient } from './connection.js';

type MotorStatus = 'pending' | 'generating' | 'done' | 'error';

interface MotorStateEntry {
  status: MotorStatus;
  updatedAt: Date;
}

// In-memory cache for synchronous reads
const state = new Map<string, MotorStateEntry>();

// Key format matches legacy behavior: "${userId}:${motorType}"
function makeKey(userId: number, motorType: string): string {
  return `${userId}:${motorType}`;
}

// ── Async DB helpers (fire-and-forget for writes) ──────────────────────────

async function upsertToDb(
  userId: number,
  motorType: string,
  status: MotorStatus,
  updatedAt: Date
): Promise<void> {
  try {
    const pool = getPoolClient();
    await pool.query(
      `INSERT INTO motor_state (user_id, motor_type, status, last_updated)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, motor_type)
       DO UPDATE SET status = EXCLUDED.status, last_updated = EXCLUDED.last_updated`,
      [userId, motorType, status, updatedAt.getTime()]
    );
  } catch (err) {
    // Log but don't throw — persistence failure shouldn't break the sync API
    console.error('[motorState] UPSERT failed:', err);
  }
}

async function loadFromDb(userId: number): Promise<void> {
  try {
    const pool = getPoolClient();
    const result = await pool.query<{
      motor_type: string;
      status: MotorStatus;
      last_updated: number;
    }>(
      'SELECT motor_type, status, last_updated FROM motor_state WHERE user_id = $1',
      [userId]
    );
    for (const row of result.rows) {
      const key = makeKey(userId, row.motor_type);
      state.set(key, { status: row.status, updatedAt: new Date(row.last_updated) });
    }
  } catch (err) {
    console.error('[motorState] loadFromDb failed:', err);
  }
}

// ── Public API (preserves existing sync signatures) ─────────────────────────

/**
 * Set a single motor's state for a user.
 * Writes to in-memory cache synchronously, persists to DB asynchronously.
 */
export function setMotorState(userId: number, motorType: string, status: MotorStatus): void {
  const updatedAt = new Date();
  // Immediate in-memory update for sync reads
  state.set(makeKey(userId, motorType), { status, updatedAt });
  // Async DB persistence (fire-and-forget)
  void upsertToDb(userId, motorType, status, updatedAt);
}

/**
 * Get all motor states for a user.
 * Returns a record mapping motorType -> status (defaults to 'pending' if not found).
 */
export function getAllMotorState(userId: number): Record<string, MotorStatus> {
  const prefixes = [
    'synthesis',
    'abp',
    'plan',
    'slides',
    'ficha',
    'quiz',
    'tutor',
    'pdc',
    'recalibrate',
    'micro',
    'alpha2',
  ];
  const result: Record<string, MotorStatus> = {};
  for (const prefix of prefixes) {
    const key = makeKey(userId, prefix);
    const entry = state.get(key);
    result[prefix] = entry?.status || 'pending';
  }
  return result;
}

/**
 * Warm the in-memory cache from the database.
 * Call this during server startup for a specific user.
 */
export async function warmMotorState(userId: number): Promise<void> {
  await loadFromDb(userId);
}

/**
 * TEST-ONLY: Clear the in-memory cache. Use in beforeEach to isolate tests.
 * Not part of the production API.
 */
export function __clearInMemoryStateForTesting(): void {
  state.clear();
}
