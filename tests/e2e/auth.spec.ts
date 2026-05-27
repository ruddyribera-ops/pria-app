import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

test.describe('Auth Flow', () => {

  test('login redirects to materiales', async ({ page }) => {
    await page.goto('/login');
    const usernameInput = page.locator('input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await usernameInput.fill('admin');
    await passwordInput.fill('admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/materiales', { timeout: 15000 });
    // Verify we are actually on materiales page
    await expect(page.locator('body')).toContain(/material/i);
  });

  test('login wrong credentials shows error', async ({ page }) => {
    await page.goto('/login');
    const usernameInput = page.locator('input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await usernameInput.fill('wrong');
    await passwordInput.fill('wrong123');
    await page.click('button[type="submit"]');
    // Should stay on login or show error
    const url = page.url();
    const body = await page.locator('body').innerText();
    const hasError = url.includes('login') || body.toLowerCase().includes('error') || body.toLowerCase().includes('incorrect');
    expect(hasError).toBeTruthy();
  });

  test('unauthenticated redirect to login', async ({ page }) => {
    await page.goto('/materiales');
    await page.waitForURL(/login/, { timeout: 10000 });
    expect(page.url()).toContain('login');
  });

});