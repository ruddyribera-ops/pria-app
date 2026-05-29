import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getPoolClient } from './connection.js';

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
    `INSERT INTO users (username, password_hash, nombre, role, nivel, grado)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (username) DO NOTHING`,
    ['admin', hash, 'Administrador', 'admin', 'Primaria', '5to']
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
