/**
 * Seed test data for PRIA v10 schedule system.
 * Creates 2 docente users with teacher_codes and 25 bloques for PROF-MG.
 *
 * Usage:
 *   DATABASE_URL=postgresql://postgres:pria_local@localhost:5432/pria \
 *     npx tsx scripts/seed_test_data.ts
 */
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:pria_local@localhost:5432/pria';

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('[seed] Connecting to database...');
    const client = await pool.connect();
    console.log('[seed] Connected.');

    // ── 1. Ensure migration 011 has been applied (add teacher_code column) ─────
    try {
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_code TEXT;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_teacher_code ON users(teacher_code) WHERE teacher_code IS NOT NULL;
      `);
      console.log('[seed] Migration 011 applied (teacher_code column).');
    } catch (err: any) {
      if (err?.code === '42701' || err?.code === '42P07') {
        console.log('[seed] teacher_code column already exists, skipping migration.');
      } else {
        throw err;
      }
    }

    // ── 2. Hash passwords once ─────────────────────────────────────────────────
    const hashMG = bcrypt.hashSync('docente123', 12);
    const hashRM = bcrypt.hashSync('docente123', 12);

    // ── 3. Insert docente users ────────────────────────────────────────────────
    const userResults = await client.query(`
      INSERT INTO users (username, password_hash, nombre, role, nivel, grado, teacher_code)
      VALUES
        ('m.gonzalez', $1, 'María González', 'docente', 'Primaria', '5to', 'PROF-MG'),
        ('r.mamani',   $2, 'Roberto Mamani',  'docente', 'Primaria', '4to', 'PROF-RM')
      ON CONFLICT (username) DO NOTHING
      RETURNING id, username, teacher_code
    `, [hashMG, hashRM]);

    const usersInserted = userResults.rowCount ?? 0;
    console.log(`[seed] Inserted ${usersInserted} docente users.`);
    if (userResults.rows.length > 0) {
      for (const row of userResults.rows) {
        console.log(`       -> ${row.username} (id=${row.id}, teacher_code=${row.teacher_code})`);
      }
    }

    // ── 4. Insert 25 bloques for PROF-MG (5 days × 5 blocks) ──────────────────
    const bloquesData = [
      // LUNES
      { dia: 'LUNES', hora_inicio: '07:30', hora_fin: '08:30', tipo: 'NORMAL', materia: 'Lenguaje' },
      { dia: 'LUNES', hora_inicio: '08:30', hora_fin: '09:30', tipo: 'NORMAL', materia: 'Matemáticas' },
      { dia: 'LUNES', hora_inicio: '09:30', hora_fin: '10:00', tipo: 'RECREO',  materia: 'Recreo' },
      { dia: 'LUNES', hora_inicio: '10:00', hora_fin: '11:00', tipo: 'NORMAL', materia: 'Ciencias Naturales' },
      { dia: 'LUNES', hora_inicio: '11:00', hora_fin: '12:00', tipo: 'NORMAL', materia: 'Ed. Física' },
      // MARTES
      { dia: 'MARTES', hora_inicio: '07:30', hora_fin: '08:30', tipo: 'NORMAL', materia: 'Lenguaje' },
      { dia: 'MARTES', hora_inicio: '08:30', hora_fin: '09:30', tipo: 'NORMAL', materia: 'Matemáticas' },
      { dia: 'MARTES', hora_inicio: '09:30', hora_fin: '10:00', tipo: 'RECREO',  materia: 'Recreo' },
      { dia: 'MARTES', hora_inicio: '10:00', hora_fin: '11:00', tipo: 'NORMAL', materia: 'Sociales' },
      { dia: 'MARTES', hora_inicio: '11:00', hora_fin: '12:00', tipo: 'NORMAL', materia: 'Música' },
      // MIÉRCOLES
      { dia: 'MIÉRCOLES', hora_inicio: '07:30', hora_fin: '08:30', tipo: 'NORMAL', materia: 'Matemáticas' },
      { dia: 'MIÉRCOLES', hora_inicio: '08:30', hora_fin: '09:30', tipo: 'NORMAL', materia: 'Lenguaje' },
      { dia: 'MIÉRCOLES', hora_inicio: '09:30', hora_fin: '10:00', tipo: 'RECREO',  materia: 'Recreo' },
      { dia: 'MIÉRCOLES', hora_inicio: '10:00', hora_fin: '11:00', tipo: 'NORMAL', materia: 'Inglés' },
      { dia: 'MIÉRCOLES', hora_inicio: '11:00', hora_fin: '12:00', tipo: 'NORMAL', materia: 'Arte' },
      // JUEVES
      { dia: 'JUEVES', hora_inicio: '07:30', hora_fin: '08:30', tipo: 'NORMAL', materia: 'Ciencias' },
      { dia: 'JUEVES', hora_inicio: '08:30', hora_fin: '09:30', tipo: 'NORMAL', materia: 'Lenguaje' },
      { dia: 'JUEVES', hora_inicio: '09:30', hora_fin: '10:00', tipo: 'RECREO',  materia: 'Recreo' },
      { dia: 'JUEVES', hora_inicio: '10:00', hora_fin: '11:00', tipo: 'NORMAL', materia: 'Matemáticas' },
      { dia: 'JUEVES', hora_inicio: '11:00', hora_fin: '12:00', tipo: 'NORMAL', materia: 'Religión' },
      // VIERNES
      { dia: 'VIERNES', hora_inicio: '07:30', hora_fin: '08:30', tipo: 'NORMAL', materia: 'Sociales' },
      { dia: 'VIERNES', hora_inicio: '08:30', hora_fin: '09:30', tipo: 'NORMAL', materia: 'Matemáticas' },
      { dia: 'VIERNES', hora_inicio: '09:30', hora_fin: '10:00', tipo: 'RECREO',  materia: 'Recreo' },
      { dia: 'VIERNES', hora_inicio: '10:00', hora_fin: '11:00', tipo: 'NORMAL', materia: 'Lenguaje' },
      { dia: 'VIERNES', hora_inicio: '11:00', hora_fin: '12:00', tipo: 'NORMAL', materia: 'Deportes' },
    ];

    let bloquesInserted = 0;
    for (let i = 0; i < bloquesData.length; i++) {
      const b = bloquesData[i];
      const orden = i + 1;
      try {
        const res = await client.query(`
          INSERT INTO bloques (teacher_code, dia, hora_inicio, hora_fin, tipo, materia, nivel_grado, ubicacion, orden)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (teacher_code, dia, hora_inicio) DO NOTHING
        `, ['PROF-MG', b.dia, b.hora_inicio, b.hora_fin, b.tipo, b.materia, '5to de Primaria', 'Aula 5to A', orden]);
        bloquesInserted += res.rowCount ?? 0;
      } catch (err) {
        console.error(`[seed] Error inserting bloque ${b.dia} ${b.hora_inicio}:`, err);
      }
    }

    console.log(`[seed] Inserted ${bloquesInserted} bloques for PROF-MG.`);

    // ── 5. Summary ─────────────────────────────────────────────────────────────
    const totalUsers = await client.query(`SELECT COUNT(*)::int as c FROM users WHERE role = 'docente'`);
    const totalBloques = await client.query(`SELECT COUNT(*)::int as c FROM bloques WHERE teacher_code = 'PROF-MG'`);

    console.log(`\n[seed] ✓ Done.`);
    console.log(`       Docentes in DB : ${totalUsers.rows[0]?.c ?? 0}`);
    console.log(`       Bloques PROF-MG: ${totalBloques.rows[0]?.c ?? 0}`);

    client.release();
    await pool.end();
  } catch (err) {
    console.error('[seed] Error:', err);
    await pool.end();
    process.exit(1);
  }
}

main();
