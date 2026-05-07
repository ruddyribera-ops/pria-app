/**
 * Playwright E2E tests for PDC workflow
 * Full workflow: create PDC -> add MESCP row -> save -> reload -> verify
 */
import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('PDC Workflow', () => {
  test('Create PDC → Add MESCP row → Save → Reload', async ({ page, context }) => {
    // 1. Register and login
    await page.goto(`${BASE_URL}/register`)
    const email = `pdcuser_${Date.now()}@example.com`

    await page.fill('input[name="email"]', email)
    await page.fill('input[name="full_name"]', 'PDC Test User')
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.click('button:has-text("Register")')

    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.click('button:has-text("Login")')

    await expect(page).toHaveURL(`${BASE_URL}/dashboard`)

    // 2. Navigate to PDC creation
    await page.click('a:has-text("New PDC")')
    await expect(page).toHaveURL(`${BASE_URL}/pdc/new`)

    // 3. Fill PDC form
    await page.fill('input[name="title"]', 'Test PDC Unit 1')
    await page.fill('select[name="subject"]', 'Matemáticas')
    await page.fill('select[name="grade_level"]', '6')
    await page.fill('input[name="unit_name"]', 'Algebra Basics')

    // 4. Submit form
    await page.click('button:has-text("Create PDC")')

    // 5. Wait for redirect to editor
    await page.waitForURL(`${BASE_URL}/pdc/*`)

    // 6. Click "Add Row"
    await page.click('button:has-text("Add Row")')

    // 7. Fill MESCP row
    await page.fill('input[placeholder="Objective"]', 'Solve linear equations')
    await page.fill('textarea[placeholder="Content"]', 'Linear equations of form ax + b = c')
    await page.fill('textarea[placeholder="Strategies"]', 'Hands-on practice with templates')
    await page.fill('textarea[placeholder="Criteria"]', 'Solve 5 equations correctly')
    await page.fill('input[placeholder="Products"]', 'Worksheet with 10 problems')
    await page.fill('textarea[placeholder="Evidence"]', 'Student portfolio')

    // 8. Save row
    await page.click('button:has-text("Save Row")')

    // 9. Verify row appears in table
    await expect(page.locator('text=Solve linear equations')).toBeVisible()

    // 10. Save PDC
    await page.click('button:has-text("Save PDC")')

    // 11. Wait for save confirmation
    await expect(page.locator('text=Saved successfully')).toBeVisible()

    // 12. Reload page
    await page.reload()

    // 13. Verify row still exists
    await expect(page.locator('text=Solve linear equations')).toBeVisible()
    await expect(page.locator('text=Linear equations of form ax + b = c')).toBeVisible()
  })

  test('Edit MESCP row updates correctly', async ({ page }) => {
    // Setup: Create PDC with row
    await page.goto(`${BASE_URL}/register`)
    const email = `edituser_${Date.now()}@example.com`

    await page.fill('input[name="email"]', email)
    await page.fill('input[name="full_name"]', 'Edit Test User')
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.click('button:has-text("Register")')

    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.click('button:has-text("Login")')

    await page.click('a:has-text("New PDC")')
    await page.fill('input[name="title"]', 'Edit Test PDC')
    await page.fill('select[name="subject"]', 'Science')
    await page.fill('select[name="grade_level"]', '7')
    await page.click('button:has-text("Create PDC")')

    await page.waitForURL(`${BASE_URL}/pdc/*`)

    // Add row
    await page.click('button:has-text("Add Row")')
    await page.fill('input[placeholder="Objective"]', 'Original Objective')
    await page.fill('textarea[placeholder="Content"]', 'Original Content')
    await page.click('button:has-text("Save Row")')

    // Edit row
    await page.click('button:has-text("Edit")')
    await page.fill('input[placeholder="Objective"]', 'Updated Objective')
    await page.click('button:has-text("Save Row")')

    // Verify update
    await expect(page.locator('text=Updated Objective')).toBeVisible()
  })

  test('Delete MESCP row requires confirmation', async ({ page }) => {
    // Setup PDC with row
    await page.goto(`${BASE_URL}/register`)
    const email = `deleteuser_${Date.now()}@example.com`

    await page.fill('input[name="email"]', email)
    await page.fill('input[name="full_name"]', 'Delete Test User')
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.click('button:has-text("Register")')

    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.click('button:has-text("Login")')

    await page.click('a:has-text("New PDC")')
    await page.fill('input[name="title"]', 'Delete Test PDC')
    await page.fill('select[name="subject"]', 'History')
    await page.fill('select[name="grade_level"]', '9')
    await page.click('button:has-text("Create PDC")')

    await page.waitForURL(`${BASE_URL}/pdc/*`)

    // Add row
    await page.click('button:has-text("Add Row")')
    await page.fill('input[placeholder="Objective"]', 'To Delete')
    await page.click('button:has-text("Save Row")')

    // Delete with confirmation
    page.once('dialog', dialog => {
      expect(dialog.type()).toBe('confirm')
      dialog.accept()
    })

    await page.click('button:has-text("Delete")')

    // Verify deletion
    await expect(page.locator('text=To Delete')).not.toBeVisible()
  })
})
