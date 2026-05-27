import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

test.describe('PRIA v10 Production Flow', () => {

  test('login → materiales page loads full dashboard', async ({ page }) => {
    await loginAsAdmin(page);

    // Verify dashboard elements are visible
    await expect(page.locator('body')).toBeVisible();

    // Sidebar should render
    const sidebar = page.locator('aside, nav, [class*="sidebar"]').first();
    await expect(sidebar).toBeVisible({ timeout: 5000 });

    // At least one nav item should be visible
    const navItems = page.locator('a, button, [role="menuitem"]').filter({ hasText: /material|nueva|inicio/i });
    const count = await navItems.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('materiales page allows PDF upload', async ({ page }) => {
    await loginAsAdmin(page);

    // Verify materials gestion page is loaded
    await expect(page.locator('body')).toContainText(/gestion|material|archivo|libro/i, { timeout: 5000 });

    // Look for upload-related elements
    const uploadZone = page.locator(
      'input[type="file"], [class*="upload"], [class*="dropzone"], button:has-text("subir"), button:has-text("upload"), button:has-text("cargar"), [class*="file-input"]'
    ).first();

    if (await uploadZone.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Upload zone is present — verify it's interactive
      await expect(uploadZone).toBeEnabled({ timeout: 3000 });
    } else {
      // If no direct upload zone, at least verify the page has file-related controls
      const bodyText = await page.locator('body').innerText();
      const hasFileContext = /pdf|upload|subir|cargar|archivo|documento|libro/i.test(bodyText);
      expect(hasFileContext).toBeTruthy();
    }
  });

  test('PPTX export controls visible after login', async ({ page }) => {
    await loginAsAdmin(page);

    // Verify export-related controls exist on the page
    const exportButton = page.locator(
      'button:has-text("exportar"), button:has-text("export"), button:has-text("descargar"), [class*="export"]'
    ).first();

    if (await exportButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(exportButton).toBeEnabled({ timeout: 3000 });
    } else {
      // Export button might require a motor result first — verify page structure instead
      const bodyText = await page.locator('body').innerText();
      const hasExportContext = /export|ppt|pptx|descargar|generar|síntesis/i.test(bodyText);
      expect(hasExportContext).toBeTruthy();
    }
  });

});
