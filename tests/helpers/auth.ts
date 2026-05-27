import { test as base, Page } from '@playwright/test';

export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  const usernameInput = page.locator('input[type="text"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  await usernameInput.fill('admin');
  await passwordInput.fill('admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/materiales', { timeout: 10000 });
}

export const test = base.extend<{ customTest: string }>({
  customTest: 'PRIA',
});