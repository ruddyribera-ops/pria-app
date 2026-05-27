import bcrypt from 'bcryptjs';
import { getPoolClient } from './connection.js';

export async function seed(): Promise<void> {
  const pool = getPoolClient();
  const hash = bcrypt.hashSync('admin123', 12);

  const users = [
    { username: 'admin', password_hash: hash, nombre: 'Administrador', role: 'admin', nivel: 'Primaria', grado: '5to' },
    { username: 'ruddy', password_hash: bcrypt.hashSync('profesor123', 12), nombre: 'Ruddy Ribera', role: 'teacher', nivel: 'Primaria', grado: '5to' },
    { username: 'adela', password_hash: bcrypt.hashSync('profesor123', 12), nombre: 'Adela', role: 'teacher', nivel: 'Primaria', grado: '4to' },
    { username: 'maria', password_hash: bcrypt.hashSync('profesor123', 12), nombre: 'Maria', role: 'teacher', nivel: 'Secundaria', grado: '1ro' },
  ];

  for (const u of users) {
    await pool.query(
      `INSERT INTO users (username, password_hash, nombre, role, nivel, grado)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (username) DO NOTHING`,
      [u.username, u.password_hash, u.nombre, u.role, u.nivel, u.grado]
    );
  }
}
