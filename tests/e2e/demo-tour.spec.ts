import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

test.describe('PRIA v10 Demo Tour', () => {
  test('login page', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/demo-login.png', fullPage: true });
  });

  test('materiales page after login', async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/demo-materiales.png', fullPage: true });
  });

  test('sidebar navigation items', async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/demo-sidebar.png', fullPage: true });
  });
});
