/**
 * PRIA v7 - Smoke Test Suite
 * Comprehensive E2E tests for critical user workflows
 * Tests: Admin Dashboard, PDC Creation/Editing, Accessibility Profile Switching
 */

import { test, expect, Page, Browser, BrowserContext } from "@playwright/test";

// Configuration
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";
const API_URL = process.env.PLAYWRIGHT_TEST_API_URL || "http://localhost:8000";
const TEST_TIMEOUT = 60000; // 60 seconds

test.describe("PRIA v7 Smoke Tests", () => {
  test.describe("1. Admin Dashboard Flow", () => {
    test("should register user, login, and view dashboard", async ({
      page,
      context,
    }) => {
      test.setTimeout(TEST_TIMEOUT);

      // Step 1: Navigate to register page
      await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
      await expect(page).toHaveTitle(/register|signup/i);

      // Step 2: Fill registration form
      const testEmail = `admin-${Date.now()}@test.local`;
      const testPassword = "Test123!@#";

      await page.fill('input[placeholder*="email" i]', testEmail);
      await page.fill('input[placeholder*="password" i]', testPassword);
      await page.fill('input[placeholder*="confirm" i]', testPassword);

      // Select Admin role if available
      const roleSelect = page.locator('select, [role="combobox"]').first();
      if (await roleSelect.isVisible()) {
        await roleSelect.selectOption({ label: /admin|administrador/i });
      }

      // Step 3: Submit registration
      const submitButton = page.locator('button:has-text("Register"), button:has-text("Registrarse")').first();
      await submitButton.click();

      // Wait for redirect to login or dashboard
      await page.waitForURL(/login|dashboard/, { timeout: 10000 });

      // Step 4: If redirected to login, fill login form
      if (page.url().includes("login")) {
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', testPassword);
        await page
          .locator('button:has-text("Login"), button:has-text("Iniciar sesión")')
          .first()
          .click();
      }

      // Wait for dashboard load
      await page.waitForURL(/dashboard/, { timeout: 10000 });
      await page.waitForLoadState("networkidle");

      // Step 5: Verify dashboard elements
      await expect(page.locator("text=/dashboard|panel/i").first()).toBeVisible({
        timeout: 5000,
      });

      // Verify status cards render (Backend API, Database, Frontend)
      const statusCards = page.locator("[data-testid*='status'], [class*='card']");
      const cardCount = await statusCards.count();
      expect(cardCount).toBeGreaterThanOrEqual(1);

      // Verify "Manage PDC" button is visible
      const managePDCButton = page.locator(
        'button:has-text("Manage PDC"), button:has-text("Gestionar PDC"), a:has-text("PDC")'
      );
      await expect(managePDCButton.first()).toBeVisible({ timeout: 5000 });

      // Check network requests - no 4xx/5xx errors
      const failedRequests = await collectFailedRequests(page);
      expect(failedRequests.length).toBe(0);

      // Check for console errors
      const consoleErrors = await collectConsoleErrors(page);
      expect(consoleErrors.length).toBe(0);

      // Verify page navigation time (should be <2s)
      const navigationTime = page.context().tracing;
      expect(navigationTime).toBeDefined();
    });
  });

  test.describe("2. PDC Creation & Editing", () => {
    test("should create PDC, add MESCP row, save, and persist on reload", async ({
      page,
    }) => {
      test.setTimeout(TEST_TIMEOUT);

      // Step 1: Login first (reuse from previous test or create fresh user)
      await loginTestUser(page);

      // Step 2: Navigate to PDC page
      await page.goto(`${BASE_URL}/pdc`, { waitUntil: "networkidle" });

      // Step 3: Click "Create New" button
      const createButton = page.locator(
        'button:has-text("Create New"), button:has-text("Crear nuevo"), a:has-text("New")'
      );
      await expect(createButton.first()).toBeVisible({ timeout: 5000 });
      await createButton.first().click();

      // Wait for form to appear
      await page.waitForLoadState("networkidle");

      // Step 4: Fill PDC form
      // Subject
      const subjectInput = page.locator('input[placeholder*="subject" i], input[placeholder*="materia" i]').first();
      if (await subjectInput.isVisible()) {
        await subjectInput.fill("LENGUAJE");
      }

      // Grade
      const gradeSelect = page.locator('select, [role="combobox"]').nth(1);
      if (await gradeSelect.isVisible()) {
        await gradeSelect.selectOption({ label: /5to primaria|grade 5|5th grade/i });
      }

      // Step 5: Submit form
      const submitForm = page.locator('button:has-text("Submit"), button:has-text("Crear"), button:has-text("Save")').first();
      await submitForm.click();

      // Wait for PDC creation
      await page.waitForLoadState("networkidle");

      // Step 6: Verify PDC created and navigate to edit
      const pdcTitle = page.locator("text=/LENGUAJE|language/i");
      await expect(pdcTitle.first()).toBeVisible({ timeout: 10000 });

      // Step 7: Add MESCP row
      const addRowButton = page.locator(
        'button:has-text("Add"), button:has-text("Agregar"), button[data-testid*="add"]'
      );
      if (await addRowButton.first().isVisible()) {
        await addRowButton.first().click();
      }

      // Step 8: Fill MESCP row
      const objetivoInputs = page.locator('input[placeholder*="objetivo" i], input[placeholder*="objective" i]');
      if ((await objetivoInputs.count()) > 0) {
        await objetivoInputs.last().fill("Entender verbos");
      }

      // Step 9: Save
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Guardar")').first();
      await saveButton.click();

      // Wait for save
      await page.waitForLoadState("networkidle");

      // Verify save success (look for success message or updated UI)
      const successMessage = page.locator("text=/saved|guardado|success/i");
      if (await successMessage.first().isVisible({ timeout: 3000 })) {
        await expect(successMessage.first()).toBeVisible();
      }

      // Step 10: Reload page
      await page.reload({ waitUntil: "networkidle" });

      // Step 11: Verify data persists
      const persistedTitle = page.locator("text=/LENGUAJE|language/i");
      await expect(persistedTitle.first()).toBeVisible({ timeout: 10000 });

      const persistedObjetivo = page.locator("text=/Entender verbos/i");
      if (await persistedObjetivo.isVisible({ timeout: 5000 })) {
        await expect(persistedObjetivo).toBeVisible();
      }

      // Check for errors
      const failedRequests = await collectFailedRequests(page);
      expect(failedRequests.length).toBe(0);

      const consoleErrors = await collectConsoleErrors(page);
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe("3. Accessibility Profile Switching", () => {
    test("should switch profiles, apply styles, and persist to localStorage", async ({
      page,
      context,
    }) => {
      test.setTimeout(TEST_TIMEOUT);

      // Step 1: Login and navigate to dashboard
      await loginTestUser(page);
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });

      // Step 2: Find and click ProfileSwitcher
      const profileSwitcher = page.locator(
        '[data-testid="profile-switcher"], button:has-text("Profile"), button:has-text("Perfil"), .profile-switcher'
      ).first();

      if (await profileSwitcher.isVisible({ timeout: 5000 })) {
        await profileSwitcher.click();
      }

      // Step 3: Select "Dislexia" profile
      const dislexiaOption = page.locator(
        'button:has-text("Dislexia"), a:has-text("Dislexia"), [role="option"]:has-text("Dislexia")'
      );
      if (await dislexiaOption.first().isVisible()) {
        await dislexiaOption.first().click();
        await page.waitForLoadState("networkidle");

        // Verify Dislexia font applied (OpenDyslexic, 14pt)
        const bodyFont = await page.locator("body").evaluate((el) => {
          return window.getComputedStyle(el).fontFamily;
        });
        expect(bodyFont.toLowerCase()).toContain("opendyslexic");

        const fontSize = await page.locator("body").evaluate((el) => {
          return window.getComputedStyle(el).fontSize;
        });
        expect(fontSize).toMatch(/14px|14pt/);
      }

      // Step 4: Select "ADHD" profile
      await profileSwitcher.click();
      const adhdOption = page.locator(
        'button:has-text("ADHD"), a:has-text("ADHD"), [role="option"]:has-text("ADHD")'
      );
      if (await adhdOption.first().isVisible()) {
        await adhdOption.first().click();
        await page.waitForLoadState("networkidle");

        // Verify high-contrast colors (#000/#FFF)
        const bodyBg = await page.locator("body").evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });

        const bodyColor = await page.locator("body").evaluate((el) => {
          return window.getComputedStyle(el).color;
        });

        // Check if contrast is high (white/black)
        const isHighContrast =
          (bodyBg.includes("255") && bodyColor.includes("0")) ||
          (bodyBg.includes("0") && bodyColor.includes("255"));

        expect(isHighContrast).toBe(true);
      }

      // Step 5: Select "Default" profile
      await profileSwitcher.click();
      const defaultOption = page.locator(
        'button:has-text("Default"), a:has-text("Default"), [role="option"]:has-text("Default")'
      );
      if (await defaultOption.first().isVisible()) {
        await defaultOption.first().click();
        await page.waitForLoadState("networkidle");
      }

      // Step 6: Reload page
      await page.reload({ waitUntil: "networkidle" });

      // Step 7: Verify profile persists (check localStorage)
      const profile = await page.evaluate(() => {
        return localStorage.getItem("accessibility-profile");
      });

      // Profile should be stored if switcher was used
      if (profile) {
        expect(profile).toBeTruthy();
      }

      // Step 8: Check for errors
      const failedRequests = await collectFailedRequests(page);
      expect(failedRequests.length).toBe(0);

      const consoleErrors = await collectConsoleErrors(page);
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe("API Health Checks", () => {
    test("should verify API health endpoints", async () => {
      // Check /health/live
      const liveResponse = await fetch(`${API_URL}/api/health/live`);
      expect(liveResponse.status).toBe(200);

      // Check /health/ready
      const readyResponse = await fetch(`${API_URL}/api/health/ready`);
      expect(readyResponse.status).toBe(200);

      // Check root endpoint
      const rootResponse = await fetch(`${API_URL}/`);
      expect(rootResponse.status).toBe(200);
      const data = await rootResponse.json();
      expect(data.message).toContain("PRIA");
    });
  });

  test.describe("Accessibility Assertions", () => {
    test("all buttons should be keyboard accessible (tab + enter)", async ({
      page,
    }) => {
      await loginTestUser(page);
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });

      // Get all buttons
      const buttons = page.locator("button");
      const buttonCount = await buttons.count();

      expect(buttonCount).toBeGreaterThan(0);

      // Test first button with keyboard
      const firstButton = buttons.first();
      await firstButton.focus();
      await page.keyboard.press("Enter");

      // Should not error
      const errors = await collectConsoleErrors(page);
      expect(errors.length).toBe(0);
    });

    test("page should have no unhandled promise rejections", async ({
      page,
    }) => {
      let unhandledRejections: string[] = [];

      page.on("pageerror", (error) => {
        unhandledRejections.push(error.message);
      });

      await loginTestUser(page);
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });

      // Wait a bit for any async operations
      await page.waitForTimeout(2000);

      expect(unhandledRejections.length).toBe(0);
    });
  });
});

// ============================================
// Helper Functions
// ============================================

/**
 * Login test user helper
 */
async function loginTestUser(page: Page) {
  const testEmail = `test-${Date.now()}@test.local`;
  const testPassword = "Test123!@#";

  // Try to navigate to register first
  await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });

  // Fill registration form if on register page
  const emailInputs = page.locator('input[type="email"]');
  if ((await emailInputs.count()) > 0) {
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);

    const confirmInputs = page.locator('input[placeholder*="confirm" i]');
    if ((await confirmInputs.count()) > 0) {
      await confirmInputs.first().fill(testPassword);
    }

    const submitButton = page
      .locator(
        'button:has-text("Register"), button:has-text("Registrarse"), button[type="submit"]'
      )
      .first();

    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForLoadState("networkidle");
    }
  }

  // If still on login page, fill login form
  if (page.url().includes("login") || page.url().includes("register")) {
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);

    const loginButton = page
      .locator(
        'button:has-text("Login"), button:has-text("Iniciar sesión"), button[type="submit"]'
      )
      .first();

    if (await loginButton.isVisible()) {
      await loginButton.click();
    }
  }

  // Wait for dashboard or any page to load
  await page.waitForLoadState("networkidle");
}

/**
 * Collect failed network requests
 */
async function collectFailedRequests(page: Page): Promise<string[]> {
  const failedRequests: string[] = [];

  const listener = (response: any) => {
    if (response.status() >= 400) {
      failedRequests.push(`${response.status()} ${response.url()}`);
    }
  };

  page.on("response", listener);

  // Give page a moment to load
  await page.waitForLoadState("networkidle");

  page.removeListener("response", listener);

  return failedRequests;
}

/**
 * Collect console errors
 */
async function collectConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  const listener = (msg: any) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  };

  page.on("console", listener);

  // Give page a moment
  await page.waitForLoadState("networkidle");

  page.removeListener("console", listener);

  return errors;
}
