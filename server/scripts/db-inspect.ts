import { getPoolClient } from '../src/db/connection.js';

async function main() {
  const pool = getPoolClient();

  // Show diagnosticos columns
  const { rows: diagCols } = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'diagnosticos' ORDER BY ordinal_position
  `);
  console.log('Diagnosticos columns:', diagCols.map(c => c.column_name).join(', '));
  const { rows: diag } = await pool.query(`SELECT * FROM diagnosticos LIMIT 5`);
  console.log('Diagnosticos rows:', JSON.stringify(diag, null, 2));

  // Show bloques columns
  const { rows: blockCols } = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'bloques' ORDER BY ordinal_position
  `);
  console.log('\nBloques columns:', blockCols.map(c => c.column_name).join(', '));
  const { rows: blocks } = await pool.query(`SELECT * FROM bloques`);
  console.log('Bloques rows:', JSON.stringify(blocks, null, 2));

  await pool.end();
}

main().catch(console.error);