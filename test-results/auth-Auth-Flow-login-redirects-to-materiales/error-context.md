# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Auth Flow >> login redirects to materiales
- Location: tests\e2e\auth.spec.ts:6:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[type="text"]').first()

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { loginAsAdmin } from '../helpers/auth';
  3  | 
  4  | test.describe('Auth Flow', () => {
  5  | 
  6  |   test('login redirects to materiales', async ({ page }) => {
  7  |     await page.goto('/login');
  8  |     const usernameInput = page.locator('input[type="text"]').first();
  9  |     const passwordInput = page.locator('input[type="password"]').first();
> 10 |     await usernameInput.fill('admin');
     |                         ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  11 |     await passwordInput.fill('admin123');
  12 |     await page.click('button[type="submit"]');
  13 |     await page.waitForURL('**/materiales', { timeout: 15000 });
  14 |     // Verify we are actually on materiales page
  15 |     await expect(page.locator('body')).toContain(/material/i);
  16 |   });
  17 | 
  18 |   test('login wrong credentials shows error', async ({ page }) => {
  19 |     await page.goto('/login');
  20 |     const usernameInput = page.locator('input[type="text"]').first();
  21 |     const passwordInput = page.locator('input[type="password"]').first();
  22 |     await usernameInput.fill('wrong');
  23 |     await passwordInput.fill('wrong123');
  24 |     await page.click('button[type="submit"]');
  25 |     // Should stay on login or show error
  26 |     const url = page.url();
  27 |     const body = await page.locator('body').innerText();
  28 |     const hasError = url.includes('login') || body.toLowerCase().includes('error') || body.toLowerCase().includes('incorrect');
  29 |     expect(hasError).toBeTruthy();
  30 |   });
  31 | 
  32 |   test('unauthenticated redirect to login', async ({ page }) => {
  33 |     await page.goto('/materiales');
  34 |     await page.waitForURL(/login/, { timeout: 10000 });
  35 |     expect(page.url()).toContain('login');
  36 |   });
  37 | 
  38 | });
```