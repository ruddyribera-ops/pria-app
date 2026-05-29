import { config } from './config.js';
import { initDatabase } from './db/connection.js';
import { initDB } from './db/schema.js';
import { seed } from './db/seed.js';
import { createApp } from './app.js';
import { closePool } from './db/connection.js';
import { stopRateLimiterCleanup } from './middleware/rateLimiter.js';

async function start() {
  await initDatabase();
  await initDB();
  await seed();

  const app = await createApp();

  const server = app.listen(config.PORT, () => {
    console.log(`✅ PRIA backend on :${config.PORT}`);
  });

  function gracefulShutdown(signal: string) {
    console.log(`\n⏳ ${signal} received — shutting down gracefully...`);
    server.close(() => {
      console.log('  ✓ HTTP server closed');
      stopRateLimiterCleanup();
      console.log('  ✓ Rate limiter cleanup stopped');
      closePool()
        .then(() => {
          console.log('  ✓ DB pool drained');
          process.exit(0);
        })
        .catch((err) => {
          console.error('  ✗ DB pool drain error:', err);
          process.exit(1);
        });
    });

    // Force exit after 10s if graceful shutdown hangs
    setTimeout(() => {
      console.error('  ✗ Forced exit after timeout');
      process.exit(1);
    }, 10_000).unref();
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

start().catch(console.error);
