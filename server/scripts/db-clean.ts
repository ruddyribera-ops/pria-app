import { getPoolClient } from '../src/db/connection.js';

async function main() {
  const pool = getPoolClient();

  console.log('=== PRIA v10 Database Cleanup ===\n');

  const { rows: users } = await pool.query(`SELECT id, username, nombre, role FROM users`);
  const teachers = users.filter(u => u.role !== 'admin');
  console.log(`Users to delete: ${teachers.length} teacher accounts (keeping admin)`);
  for (const u of users) {
    console.log(`  [${u.role}] ${u.username} | ${u.nombre}`);
  }

  const { rows: mats } = await pool.query(`SELECT id, filename, tipo FROM materials`);
  console.log(`\nMaterials to delete: ${mats.length} files`);
  for (const m of mats) {
    console.log(`  ${m.filename} (${m.tipo})`);
  }

  const { rows: curr } = await pool.query(`SELECT id, user_id FROM curriculums`);
  console.log(`\nCurriculums to delete: ${curr.length}`);

  const { rows: motors } = await pool.query(`SELECT id, motor_type FROM motor_results`);
  console.log(`\nMotor results to delete: ${motors.length}`);

  const { rows: diag } = await pool.query(`SELECT id, estudiante, area FROM diagnosticos`);
  console.log(`\nDiagnosticos to delete: ${diag.length}`);
  for (const d of diag) {
    console.log(`  ${d.estudiante} | ${d.area}`);
  }

  const { rows: blocks } = await pool.query(`SELECT id, tipo FROM bloques`);
  console.log(`\nBloques to delete: ${blocks.length}`);
  for (const b of blocks) {
    console.log(`  id=${b.id} tipo=${b.tipo}`);
  }

  const totalRows = teachers.length + mats.length + curr.length + motors.length + diag.length + blocks.length;
  console.log(`\n▶ Total rows to delete: ${totalRows}`);

  console.log('\n--- Executing deletes ---');

  await pool.query(`DELETE FROM diagnosticos`);
  console.log('✓ Diagnosticos cleared');

  await pool.query(`DELETE FROM bloques`);
  console.log('✓ Bloques cleared');

  await pool.query(`DELETE FROM motor_results`);
  console.log('✓ Motor results cleared');

  await pool.query(`DELETE FROM curriculums`);
  console.log('✓ Curriculums cleared');

  await pool.query(`DELETE FROM materials`);
  console.log('✓ Materials cleared');

  await pool.query(`DELETE FROM users WHERE role != 'admin'`);
  console.log('✓ Teacher accounts deleted (admin kept)');

  console.log('\n=== Final state ===');
  const { rows: finalUsers } = await pool.query(`SELECT id, username, role FROM users`);
  console.log(`Users: ${finalUsers.map(u => `${u.username}(${u.role})`).join(', ')}`);

  for (const table of ['materials', 'curriculums', 'motor_results', 'diagnosticos', 'bloques']) {
    const { rows: cnt } = await pool.query(`SELECT COUNT(*)::int as c FROM "${table}"`);
    console.log(`${table}: ${cnt[0].c} rows`);
  }

  await pool.end();
  console.log('\n✅ Database cleaned — ready for real data');
}

main().catch(console.error);