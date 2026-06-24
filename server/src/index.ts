import { config } from './config.js';
import { initDatabase } from './db/connection.js';
import { initDB } from './db/schema.js';
import { seed, shouldRunSeed } from './db/seed.js';
import { createApp } from './app.js';
import { closePool } from './db/connection.js';
import { startRateLimiterCleanup, stopRateLimiterCleanup } from './middleware/rateLimiter.js';

async function start() {
  await initDatabase();
  await initDB();

  const seedDecision = shouldRunSeed();
  console.log(`[SEED] ${seedDecision.reason}`);
  if (seedDecision.run) {
    await seed();
  } else {
    console.log('[SEED] Skipping seed.');
  }

  const app = await createApp();

  const server = app.listen(config.PORT, () => {
    console.log(`✅ PRIA backend on :${config.PORT}`);
  });

  // Start the hourly cleanup of stale rate limit buckets
  startRateLimiterCleanup();

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

  // Safety nets for unhandled errors that escape Express
  process.on('unhandledRejection', (reason: unknown) => {
    console.error('[FATAL] Unhandled Promise Rejection:', reason);
    // Don't exit — log and continue. Let health check / monitoring flag the issue.
  });

  process.on('uncaughtException', (err: Error) => {
    console.error('[FATAL] Uncaught Exception:', err);
    // For uncaughtException, the process is in an undefined state. Log and exit.
    // Railway will restart the container.
    process.exit(1);
  });
}

start().catch(console.error);
