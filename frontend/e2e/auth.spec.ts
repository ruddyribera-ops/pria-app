/**
 * Playwright E2E tests for authentication
 * Full workflow: register -> login -> protected routes -> logout
 */
import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Authentication Flow', () => {
  test('Register new user', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`)

    // Fill registration form
    await page.fill('input[name="email"]', `testuser_${Date.now()}@example.com`)
    await page.fill('input[name="full_name"]', 'Test User')
    await page.fill('input[name="password"]', 'SecurePassword123!')

    // Submit form
    await page.click('button:has-text("Register")')

    // Verify redirect to login
    await expect(page).toHaveURL(`${BASE_URL}/login`)
  })

  test('Login with valid credentials', async ({ page }) => {
    // Register first
    await page.goto(`${BASE_URL}/register`)
    const email = `testuser_${Date.now()}@example.com`

    await page.fill('input[name="email"]', email)
    await page.fill('input[name="full_name"]', 'Test User')
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.click('button:has-text("Register")')

    // Now login
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.click('button:has-text("Login")')

    // Verify redirect to dashboard
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`)
  })

  test('Protected route redirects to login', async ({ page }) => {
    // Try to access protected route without token
    await page.goto(`${BASE_URL}/pdc`, { waitUntil: 'networkidle' })

    // Should redirect to login
    await expect(page).toHaveURL(`${BASE_URL}/login`)
  })

  test('Logout clears token and redirects', async ({ page }) => {
    // Register and login
    await page.goto(`${BASE_URL}/register`)
    const email = `testuser_${Date.now()}@example.com`

    await page.fill('input[name="email"]', email)
    await page.fill('input[name="full_name"]', 'Test User')
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.click('button:has-text("Register")')

    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.click('button:has-text("Login")')

    // Wait for dashboard
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`)

    // Click logout
    await page.click('button:has-text("Logout")')

    // Verify redirect to login and token cleared
    await expect(page).toHaveURL(`${BASE_URL}/login`)

    // Verify token not in localStorage
    const token = await page.evaluate(() => localStorage.getItem('access_token'))
    expect(token).toBeNull()
  })

  test('Invalid login credentials rejected', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)

    await page.fill('input[name="email"]', 'nonexistent@example.com')
    await page.fill('input[name="password"]', 'WrongPassword123!')
    await page.click('button:has-text("Login")')

    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible()

    // Should stay on login page
    await expect(page).toHaveURL(`${BASE_URL}/login`)
  })
})
