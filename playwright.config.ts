import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';
// Enforce HTTPS for non-localhost targets — prevent accidental prod runs
if (!baseURL.includes('localhost') && !baseURL.includes('127.0.0.1') && baseURL.startsWith('http:')) {
  throw new Error(`E2E_BASE_URL must use HTTPS for non-localhost targets. Got: ${baseURL}`);
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  // Auto-start and manage the dev server for E2E tests
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 30000,
  },
  globalSetup: './tests/global-setup.ts',

  // Auto-start Express backend on 3001
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});