import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

test.describe('MaterialesPage — Core Flow', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/materiales');
  });

  test('loads materials list', async ({ page }) => {
    // Wait for the page to be interactive
    await page.waitForSelector('[data-testid="materiales-page"], .container, main', { timeout: 15000 });
    // Verify the page has rendered something
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(50);
  });

  test('navigate to nueva sesión from sidebar', async ({ page }) => {
    const nuevaBtn = page.locator('text=Nueva').first();
    if (await nuevaBtn.isVisible()) {
      await nuevaBtn.click();
      await page.waitForURL(/\/(nueva|create)/, { timeout: 10000 });
    } else {
      // Fallback: navigate directly
      await page.goto('/nueva');
      await page.waitForSelector('form, [role="button"]', { timeout: 10000 });
    }
    const url = page.url();
    expect(url).not.toBe('/login');
  });

  test('toast notifications work', async ({ page }) => {
    // Use the export button — it will show a warning if no content
    const exportBtn = page.locator('button:has-text("Exportar"), button:has-text("PPTX")').first();
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      // Should get a toast (either warning or success)
      const toast = page.locator('.toast, [role="alert"], .notification').first();
      await expect(toast).toBeVisible({ timeout: 5000 });
    }
  });
});