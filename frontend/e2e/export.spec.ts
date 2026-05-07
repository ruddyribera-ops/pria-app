"""
Playwright E2E tests for export workflow
Full workflow: select format → start export → monitor progress → download
"""
import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Export Workflow', () => {
  test('Select format → Start export → Monitor progress → Download', async ({ page, context }) => {
    // 1. Register and login
    await page.goto(`${BASE_URL}/register`)
    const email = `exportuser_${Date.now()}@example.com`

    await page.fill('input[name="email"]', email)
    await page.fill('input[name="full_name"]', 'Export Test User')
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.click('button:has-text("Register")')

    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.click('button:has-text("Login")')

    await expect(page).toHaveURL(`${BASE_URL}/dashboard`)

    // 2. Create PDC with content
    await page.click('a:has-text("New PDC")')
    await page.fill('input[name="title"]', 'Export Test PDC')
    await page.fill('select[name="subject"]', 'Matemáticas')
    await page.fill('select[name="grade_level"]', '6')
    await page.click('button:has-text("Create PDC")')

    await page.waitForURL(`${BASE_URL}/pdc/*`)

    // Add MESCP row
    await page.click('button:has-text("Add Row")')
    await page.fill('input[placeholder="Objective"]', 'Export Test Objective')
    await page.fill('textarea[placeholder="Content"]', 'Export Test Content')
    await page.click('button:has-text("Save Row")')

    // Save PDC
    await page.click('button:has-text("Save PDC")')

    // 3. Navigate to export
    await page.click('a:has-text("Export")')
    await expect(page).toHaveURL(`${BASE_URL}/export`)

    // 4. Select PDC and format
    await page.fill('select[name="pdc"]', 'Export Test PDC')
    await page.click('button:has-text("Select PDC")')

    // 5. Select DOCX format
    await page.click('input[value="docx"]')
    await expect(page.locator('input[value="docx"]')).toBeChecked()

    // 6. Start export
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Start Export")')

    // 7. Monitor progress
    await expect(page.locator('text=Processing')).toBeVisible()

    // Wait for progress bar to appear
    const progressBar = page.locator('[role="progressbar"]')
    await progressBar.waitFor({ state: 'visible' })

    // Wait for completion
    await expect(page.locator('text=Complete')).toBeVisible({ timeout: 30000 })

    // 8. Download file
    await page.click('button:has-text("Download")')

    // Verify download
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('.docx')
  })

  test('Export XLSX format', async ({ page, context }) => {
    // Setup: Register and create PDC
    await page.goto(`${BASE_URL}/register`)
    const email = `xlsxuser_${Date.now()}@example.com`

    await page.fill('input[name="email"]', email)
    await page.fill('input[name="full_name"]', 'XLSX Export User')
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.click('button:has-text("Register")')

    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.click('button:has-text("Login")')

    await page.click('a:has-text("New PDC")')
    await page.fill('input[name="title"]', 'XLSX Test PDC')
    await page.fill('select[name="subject"]', 'Science')
    await page.fill('select[name="grade_level"]', '7')
    await page.click('button:has-text("Create PDC")')

    await page.waitForURL(`${BASE_URL}/pdc/*`)
    await page.click('button:has-text("Save PDC")')

    // Navigate to export
    await page.click('a:has-text("Export")')
    await page.fill('select[name="pdc"]', 'XLSX Test PDC')
    await page.click('button:has-text("Select PDC")')

    // Select XLSX
    await page.click('input[value="xlsx"]')
    await expect(page.locator('input[value="xlsx"]')).toBeChecked()

    // Start export
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Start Export")')

    // Wait for completion
    await expect(page.locator('text=Complete')).toBeVisible({ timeout: 30000 })

    // Download
    await page.click('button:has-text("Download")')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('.xlsx')
  })

  test('Export shows error on failure', async ({ page }) => {
    // Setup: Register and login
    await page.goto(`${BASE_URL}/register`)
    const email = `erruser_${Date.now()}@example.com`

    await page.fill('input[name="email"]', email)
    await page.fill('input[name="full_name"]', 'Error Test User')
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.click('button:has-text("Register")')

    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.click('button:has-text("Login")')

    // Navigate to export without creating PDC
    await page.click('a:has-text("Export")')

    // Try to export without selecting PDC
    await page.click('button:has-text("Start Export")')

    // Should show error
    await expect(page.locator('text=Please select a PDC')).toBeVisible()
  })

  test('Monitor multiple exports in queue', async ({ page }) => {
    // Setup: Register and login
    await page.goto(`${BASE_URL}/register`)
    const email = `queueuser_${Date.now()}@example.com`

    await page.fill('input[name="email"]', email)
    await page.fill('input[name="full_name"]', 'Queue Test User')
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.click('button:has-text("Register")')

    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.click('button:has-text("Login")')

    // Create PDC
    await page.click('a:has-text("New PDC")')
    await page.fill('input[name="title"]', 'Queue Test PDC')
    await page.fill('select[name="subject"]', 'History')
    await page.fill('select[name="grade_level"]', '9')
    await page.click('button:has-text("Create PDC")')

    await page.waitForURL(`${BASE_URL}/pdc/*`)
    await page.click('button:has-text("Save PDC")')

    // Navigate to export
    await page.click('a:has-text("Export")')
    await page.fill('select[name="pdc"]', 'Queue Test PDC')
    await page.click('button:has-text("Select PDC")')

    // Start first export (DOCX)
    await page.click('input[value="docx"]')
    await page.click('button:has-text("Start Export")')

    // Start second export (XLSX)
    await page.click('input[value="xlsx"]')
    await page.click('button:has-text("Start Export")')

    // Should show both jobs in queue
    const jobQueue = page.locator('[data-testid="job-queue"]')
    await expect(jobQueue).toBeVisible()

    // Both should eventually complete
    await expect(page.locator('text=Complete').first()).toBeVisible({ timeout: 30000 })
    await expect(page.locator('text=Complete').nth(1)).toBeVisible({ timeout: 30000 })
  })
})
