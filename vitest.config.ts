import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'server/src/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      USE_PGLITE: '1',
      DATABASE_URL: 'postgresql://postgres@localhost:5432/pria',
    },
    coverage: {
      provider: 'v8',
      include: ['src/lib/ai/minimaxClient.ts', 'src/lib/pptx/promptRunner.ts', 'src/lib/ingest/documentIngester.ts', 'src/api/materials.ts'],
      exclude: ['**/*.d.ts', '**/*.tsx'],
      thresholds: { functions: 60 },
    },
  },
});
