import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import express from 'express';
import { createApp } from './server/src/app.js';
import { initDatabase } from './server/src/db/connection.js';
import { initDB } from './server/src/db/schema.js';
import { seed } from './server/src/db/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = process.env.PORT || 3000;

async function main() {
  // Initialize database + seed dev users
  await initDatabase();
  await initDB();
  await seed();

  // Create the backend app (includes all /api/* routes)
  const app = await createApp();

  // Serve frontend static files from dist/
  const distPath = join(__dirname, 'dist');
  if (!existsSync(distPath)) {
    console.log('ℹ️  dist/ no encontrado — frontend no servido (modo dev)');
  } else {
    app.use(express.static(distPath));

    // SPA fallback — all non-API routes go to index.html
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`✅ PRIA v10 running on :${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
