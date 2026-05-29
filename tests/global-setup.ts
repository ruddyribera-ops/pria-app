import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function globalSetup() {
  // Clear the rate_limiter table before E2E tests to prevent 429 blocks
  try {
    await execAsync(
      'docker exec pria-pg psql -U postgres -d pria -c "DELETE FROM rate_limiter;"',
      { timeout: 5000 }
    );
    console.log('[globalSetup] Rate limiter cleared');
  } catch (err) {
    console.warn('[globalSetup] Could not clear rate limiter:', err);
  }
}
