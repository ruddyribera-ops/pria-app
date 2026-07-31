import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:pria_local@localhost:5432/pria' });

async function main() {
  const client = await pool.connect();

  // Check users table for teacher_code
  const users = await client.query(`SELECT id, username, role, teacher_code FROM users WHERE role='docente'`);
  console.log('=== DOCENTE USERS ===');
  console.log(JSON.stringify(users.rows, null, 2));

  // Check bloques for PROF-MG
  const bloques = await client.query(`
    SELECT dia, COUNT(*)::int as count
    FROM bloques
    WHERE teacher_code='PROF-MG'
    GROUP BY dia
    ORDER BY CASE dia
      WHEN 'LUNES' THEN 1
      WHEN 'MARTES' THEN 2
      WHEN 'MIÉRCOLES' THEN 3
      WHEN 'JUEVES' THEN 4
      WHEN 'VIERNES' THEN 5
    END
  `);
  console.log('\n=== BLOQUES POR DÍA (PROF-MG) ===');
  console.log(JSON.stringify(bloques.rows, null, 2));

  // Check total bloques
  const total = await client.query(`SELECT COUNT(*)::int as total FROM bloques WHERE teacher_code='PROF-MG'`);
  console.log('\n=== TOTAL BLOQUES PROF-MG ===');
  console.log(total.rows[0].total);

  // Check column exists
  const colCheck = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='teacher_code'`);
  console.log('\n=== teacher_code COLUMN ON users ===');
  console.log(colCheck.rows.length > 0 ? 'EXISTS' : 'MISSING');

  client.release();
  await pool.end();
}

main().catch(console.error);
