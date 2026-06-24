import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getPoolClient } from './connection.js';

/**
 * Determines whether the seed function should run based on environment.
 * Production environments require explicit RUN_SEED=true to run seeds.
 */
export function shouldRunSeed(): { run: boolean; reason: string } {
  const env = process.env.NODE_ENV;
  const forceFlag = process.env.RUN_SEED === 'true';

  if (env === 'production') {
    if (forceFlag) {
      console.warn('[SEED] ⚠️  PRODUCTION SEED EXPLICITLY REQUESTED via RUN_SEED=true. Proceeding.');
      return { run: true, reason: 'Production + RUN_SEED=true (explicit override)' };
    }
    return { run: false, reason: 'Production environment — seed skipped. Set RUN_SEED=true to override.' };
  }

  // Non-production (development, undefined, etc.) — seed runs normally
  return { run: true, reason: `Environment: ${env ?? 'undefined'} (seed will run)` };
}

export async function seed(): Promise<void> {
  const pool = getPoolClient();

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM users');
  if (rows[0].count > 0) {
    console.log('[seed] Users already exist, skipping');
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomUUID().slice(0, 12);
  const hash = bcrypt.hashSync(adminPassword, 12);

  await pool.query(
    `INSERT INTO users (username, password_hash, email, nombre, role, nivel, grado)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (username) DO NOTHING`,
    ['admin', hash, 'admin@pria.local', 'Administrador', 'admin', 'Primaria', '5to']
  );

  console.log('[seed] Admin user created');
  if (!process.env.ADMIN_PASSWORD) {
    console.log('══════════════════════════════════════');
    console.log(`🔐 Admin password: ${adminPassword}`);
    console.log('  CHANGE THIS ON FIRST LOGIN.');
    console.log('  Set ADMIN_PASSWORD env var to customize.');
    console.log('══════════════════════════════════════');
  }
}