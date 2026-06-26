/**
 * @vitest-environment node
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getPoolClient, closePool, initDatabase } from '../connection.js';
import { setMotorState, getAllMotorState, warmMotorState, __clearInMemoryStateForTesting } from '../motorState.js';

describe('motorState', () => {
  const TEST_USER_ID = 99999;
  const MOTOR_TYPES = [
    'synthesis', 'abp', 'plan', 'slides', 'ficha',
    'quiz', 'tutor', 'pdc', 'recalibrate', 'micro', 'alpha2',
  ] as const;

  beforeAll(async () => {
    // Ensure PostgreSQL is available
    try {
      await initDatabase();
    } catch {
      throw new Error('PostgreSQL required for motorState tests');
    }
    // Clean up test data
    const pool = getPoolClient();
    await pool.query('DELETE FROM motor_state WHERE user_id = $1', [TEST_USER_ID]);
  });

  afterAll(async () => {
    // Clean up test data
    const pool = getPoolClient();
    await pool.query('DELETE FROM motor_state WHERE user_id = $1', [TEST_USER_ID]);
    await closePool();
  });

  beforeEach(async () => {
    // Clear in-memory state and DB state before each test
    __clearInMemoryStateForTesting();
    const pool = getPoolClient();
    await pool.query('DELETE FROM motor_state WHERE user_id = $1', [TEST_USER_ID]);
  });

  test('setMotorState + getAllMotorState returns correct status', () => {
    setMotorState(TEST_USER_ID, 'synthesis', 'generating');
    const result = getAllMotorState(TEST_USER_ID);
    expect(result.synthesis).toBe('generating');
  });

  test('unmodified motors default to pending', () => {
    const result = getAllMotorState(TEST_USER_ID);
    expect(result.synthesis).toBe('pending');
    expect(result.abp).toBe('pending');
  });

  test('setting same motor twice updates status (UPSERT behavior)', () => {
    setMotorState(TEST_USER_ID, 'synthesis', 'generating');
    setMotorState(TEST_USER_ID, 'synthesis', 'done');
    const result = getAllMotorState(TEST_USER_ID);
    expect(result.synthesis).toBe('done');
  });

  test('getAllMotorState returns correct number of motors', () => {
    const result = getAllMotorState(TEST_USER_ID);
    expect(Object.keys(result).length).toBe(MOTOR_TYPES.length);
  });

  test('multiple motors can have different states', () => {
    setMotorState(TEST_USER_ID, 'synthesis', 'generating');
    setMotorState(TEST_USER_ID, 'abp', 'done');
    setMotorState(TEST_USER_ID, 'plan', 'error');
    const result = getAllMotorState(TEST_USER_ID);
    expect(result.synthesis).toBe('generating');
    expect(result.abp).toBe('done');
    expect(result.plan).toBe('error');
    // Unmodified ones stay pending
    expect(result.slides).toBe('pending');
  });

  test('warmMotorState populates in-memory state from DB', async () => {
    // First, directly insert into DB (simulating a previous process's write)
    const pool = getPoolClient();
    await pool.query(
      `INSERT INTO motor_state (user_id, motor_type, status, last_updated)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, motor_type) DO UPDATE SET status = EXCLUDED.status`,
      [TEST_USER_ID, 'synthesis', 'done', Date.now()]
    );

    // Clear in-memory state to simulate process restart
    const result1 = getAllMotorState(TEST_USER_ID);
    expect(result1.synthesis).toBe('pending'); // Not warm yet

    // Warm from DB
    await warmMotorState(TEST_USER_ID);

    // Now should have state from DB
    const result2 = getAllMotorState(TEST_USER_ID);
    expect(result2.synthesis).toBe('done');
  });

  test('DB has correct row count after multiple sets', async () => {
    setMotorState(TEST_USER_ID, 'synthesis', 'generating');
    setMotorState(TEST_USER_ID, 'abp', 'done');
    setMotorState(TEST_USER_ID, 'plan', 'error');

    // Allow async DB writes to complete
    await new Promise(r => setTimeout(r, 100));

    const pool = getPoolClient();
    const result = await pool.query(
      'SELECT COUNT(*)::int as c FROM motor_state WHERE user_id = $1',
      [TEST_USER_ID]
    );
    expect(result.rows[0].c).toBe(3);
  });

  test('DB UPSERT creates one row when setting same motor twice', async () => {
    setMotorState(TEST_USER_ID, 'synthesis', 'generating');
    setMotorState(TEST_USER_ID, 'synthesis', 'done');

    // Allow async DB writes to complete
    await new Promise(r => setTimeout(r, 100));

    const pool = getPoolClient();
    const result = await pool.query(
      'SELECT COUNT(*)::int as c FROM motor_state WHERE user_id = $1 AND motor_type = $2',
      [TEST_USER_ID, 'synthesis']
    );
    expect(result.rows[0].c).toBe(1); // Only one row, not two
  });
});
