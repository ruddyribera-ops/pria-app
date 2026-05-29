import { test as base, Page } from '@playwright/test';

export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  const usernameInput = page.locator('input[type="text"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  await usernameInput.fill('admin');
  await passwordInput.fill('admin123');
  await page.click('button[type="submit"]');
  // Wait for navigation away from login — use networkidle + URL check for robustness
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 15000 });
}

export const test = base.extend<{ customTest: string }>({
  customTest: 'PRIA',
});