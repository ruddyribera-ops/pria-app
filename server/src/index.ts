import { config } from './config.js';
import { initDatabase } from './db/connection.js';
import { initDB } from './db/schema.js';
import { seed } from './db/seed.js';
import { createApp } from './app.js';

async function start() {
  await initDatabase();
  initDB();
  seed();

  const app = await createApp();

  app.listen(config.PORT, () => {
    console.log(`✅ PRIA backend on :${config.PORT}`);
  });
}

start().catch(console.error);
