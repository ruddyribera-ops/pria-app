import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CONNECTION_ABS = resolve(__dirname, 'src/db/connection.ts');

export default defineConfig({
  resolve: {
    alias: [
      // Force all imports of connection.ts to resolve to the same absolute path
      // so vitest treats them as the same module instance (and they share state)
      { find: /.*src[\/\\]db[\/\\]connection.*/, replacement: CONNECTION_ABS },
    ],
  },
  test: {
    globals: true,
    setupFiles: ['./test-pglite-setup.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
    teardownTimeout: 30000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    env: {
      NODE_ENV: 'development',
      SKIP_MIGRATION_SECURITY_CHECK: '1',
    },
  },
});
