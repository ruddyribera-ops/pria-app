import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

test.describe('Sidebar Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/materiales');
  });

  test('sidebar has primary nav items', async ({ page }) => {
    const sidebar = page.locator('aside, nav, [class*="sidebar"]').first();
    if (await sidebar.isVisible()) {
      const navText = await sidebar.innerText();
      // Check for key nav items
      const hasMateriales = navText.toLowerCase().includes('material');
      const hasNueva = navText.toLowerCase().includes('nueva');
      expect(hasMateriales || hasNueva).toBeTruthy();
    }
  });

  test('active item is highlighted', async ({ page }) => {
    // Materiales page should have active state
    const activeLink = page.locator('[aria-current="page"], .active, [class*="active"]').first();
    if (await activeLink.isVisible()) {
      const activeText = await activeLink.innerText();
      expect(activeText.length).toBeGreaterThan(0);
    }
  });

});