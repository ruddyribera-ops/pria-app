import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/ai/minimaxClient.ts', 'src/lib/pptx/promptRunner.ts', 'src/lib/ingest/documentIngester.ts', 'src/api/materials.ts'],
      exclude: ['**/*.d.ts', '**/*.tsx'],
      thresholds: { functions: 60 },
    },
  },
});