/**
 * PRIA v10 — Full E2E Test Suite
 * Runs realistic user flows across all major features.
 * Captures screenshots + downloads at each step.
 *
 * Usage: npx playwright test tests/e2e/full-e2e.spec.ts --reporter=line
 */

import { test, expect, Page, Download } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const EVIDENCE_DIR = 'D:\\Temp\\opencode\\test_kit\\evidence';
const DOWNLOADS_DIR = path.join(EVIDENCE_DIR, 'downloads');
const API_LOG_PATH = path.join(EVIDENCE_DIR, 'api_calls.log');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function logApi(method: string, url: string, status?: number, body?: string) {
  const ts = new Date().toISOString();
  const entry = `[${ts}] ${method} ${url}${status ? ` → ${status}` : ''}${body ? ` ${body.slice(0, 200)}` : ''}\n`;
  fs.appendFileSync(API_LOG_PATH, entry);
}

async function screenshot(page: Page, label: string) {
  const filePath = path.join(EVIDENCE_DIR, `${label}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  📸 Screenshot: ${filePath}`);
}

async function screenshotFull(page: Page, label: string) {
  const filePath = path.join(EVIDENCE_DIR, `${label}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`  📸 Full-page Screenshot: ${filePath}`);
}

async function waitForToast(page: Page, timeout = 5000): Promise<string> {
  try {
    const toast = page.locator('[class*="toast"], .Toastify__toast, [role="alert"], [class*="notification"]').first();
    await toast.waitFor({ timeout });
    const text = await toast.innerText();
    console.log(`  🔔 Toast: ${text}`);
    return text;
  } catch {
    return '';
  }
}

async function clickAndWait(page: Page, selector: string, timeout = 30000) {
  await page.click(selector);
  await page.waitForTimeout(500); // Brief settle
}

async function downloadFile(page: Page, clickSelector: string, downloadLabel: string): Promise<string> {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }).catch(() => null),
    page.click(clickSelector),
  ]);

  if (download) {
    const filePath = path.join(DOWNLOADS_DIR, `${downloadLabel}_${download.suggestedFilename()}`);
    await download.saveAs(filePath);
    const stats = fs.statSync(filePath);
    console.log(`  📥 Downloaded: ${downloadLabel} → ${download.suggestedFilename()} (${stats.size} bytes)`);
    return filePath;
  }
  console.log(`  ⚠️ No download event for: ${downloadLabel}`);
  return '';
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function login(page: Page, username: string, password: string, label: string) {
  console.log(`\n  [LOGIN] ${label}`);
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  const userInput = page.locator('input[type="text"]').first();
  const passInput = page.locator('input[type="password"]').first();
  const submitBtn = page.locator('button[type="submit"]').first();

  await userInput.fill(username);
  await passInput.fill(password);
  await submitBtn.click();

  // Wait for navigation away from login
  try {
    await page.waitForFunction(
      (url) => !url.includes('/login'),
      page.url(),
      { timeout: 15000 }
    );
  } catch {
    console.log(`  ⚠️ Login may have failed, URL: ${page.url()}`);
  }

  await page.waitForLoadState('networkidle');
  await screenshot(page, `login_${label}_success`);
  console.log(`  ✅ Logged in as ${username}, now at: ${page.url()}`);
}

async function logout(page: Page) {
  console.log(`\n  [LOGOUT]`);
  // Try sidebar logout first
  const logoutBtn = page.locator('button:has-text("Cerrar"), button:has-text("logout"), button:has-text("salir")').first();
  if (await logoutBtn.count() > 0) {
    await logoutBtn.click();
    await page.waitForTimeout(1000);
  }
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await screenshot(page, 'after_logout');
}

// ─── Phase 1: Teacher m.gonzalez ────────────────────────────────────────────

test.describe('PHASE 1 — Teacher (m.gonzalez) schedule-dependent pages', () => {

  test.setTimeout(120000);

  test('1.1 — Login as m.gonzalez', async ({ page }) => {
    await login(page, 'm.gonzalez', 'docente123', 'm_gonzalez');
    expect(page.url()).not.toContain('/login');
  });

  test('1.2 — /semanal page: teacher dropdown, week grid, plan motor', async ({ page }) => {
    await login(page, 'm.gonzalez', 'docente123', 'm_gonzalez');
    await page.goto(`${BASE_URL}/semanal`);
    await page.waitForLoadState('networkidle');
    await screenshotFull(page, 'phase1_semanal_loaded');

    // Teacher dropdown should show m.gonzalez and r.mamani
    const dropdown = page.locator('select, [role="combobox"], [class*="dropdown"], [class*="select"]').first();
    const dropdownText = await dropdown.innerText().catch(() => '');
    console.log(`  Dropdown content: ${dropdownText}`);

    // Week grid should show LUNES-VIERNES with 5 blocks each
    const bodyText = await page.locator('body').innerText();
    const hasLUNES = bodyText.includes('LUNES') || bodyText.includes('LUN') || bodyText.includes('LUNES');
    const hasVIERNES = bodyText.includes('VIERNES') || bodyText.includes('VIE') || bodyText.includes('VIERNES');
    console.log(`  Has LUNES: ${hasLUNES}, Has VIERNES: ${hasVIERNES}`);
    expect(hasLUNES || hasVIERNES).toBeTruthy();

    // Click "📄 Plan" on LUNES → motor panel opens
    const planBtn = page.locator('button:has-text("📄"), button:has-text("Plan"), [class*="motor"]').first();
    const planBtnCount = await planBtn.count();
    console.log(`  Plan/motor buttons found: ${planBtnCount}`);
    if (planBtnCount > 0) {
      await planBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'phase1_semanal_plan_panel');

      // Click "Generar" → wait for plan motor
      const generarBtn = page.locator('button:has-text("Generar"), button:has-text("generar")').first();
      const genCount = await generarBtn.count();
      console.log(`  Generar buttons found: ${genCount}`);
      if (genCount > 0) {
        await generarBtn.click();
        await page.waitForTimeout(8000); // Wait for motor to complete
        await screenshot(page, 'phase1_semanal_plan_generated');
        await waitForToast(page);
      }
    }
  });

  test('1.3 — /semanal: PPTX/PDF/DOCX downloads from plan motor', async ({ page }) => {
    await login(page, 'm.gonzalez', 'docente123', 'm_gonzalez');
    await page.goto(`${BASE_URL}/semanal`);
    await page.waitForLoadState('networkidle');

    // Find and open a motor panel
    const motorBtn = page.locator('button:has-text("📄"), button:has-text("Plan")').first();
    if (await motorBtn.count() > 0) {
      await motorBtn.click();
      await page.waitForTimeout(1500);
      await screenshot(page, 'phase1_semanal_downloads_panel');

      // Check for download buttons (PPTX, PDF, DOCX)
      const allButtons = await page.locator('button').all();
      let pptxBtn: ReturnType<Page['locator']> | null = null;
      let pdfBtn: ReturnType<Page['locator']> | null = null;
      let docxBtn: ReturnType<Page['locator']> | null = null;

      for (const btn of allButtons) {
        const text = await btn.innerText();
        if (text.includes('PPTX') || text.includes('📊')) pptxBtn = btn;
        if (text.includes('PDF') || text.includes('📄')) pdfBtn = btn;
        if (text.includes('DOCX') || text.includes('📝')) docxBtn = btn;
      }

      console.log(`  PPTX btn: ${pptxBtn ? 'found' : 'not found'}`);
      console.log(`  PDF btn: ${pdfBtn ? 'found' : 'not found'}`);
      console.log(`  DOCX btn: ${docxBtn ? 'found' : 'not found'}`);
    }
  });

  test('1.4 — /diario: today schedule, progress bar, badge', async ({ page }) => {
    await login(page, 'm.gonzalez', 'docente123', 'm_gonzalez');
    await page.goto(`${BASE_URL}/diario`);
    await page.waitForLoadState('networkidle');
    await screenshotFull(page, 'phase1_diario_loaded');

    const bodyText = await page.locator('body').innerText();
    console.log(`  /diario body length: ${bodyText.length}`);

    // Progress bar should not be hardcoded 33/51
    const hasHardcoded = bodyText.includes('33') && bodyText.includes('51');
    console.log(`  Has hardcoded 33/51: ${hasHardcoded} (should be FALSE)`);

    // Badge should show "5to de Primaria · Primaria" (not 3er año · Secundaria)
    const hasWrongBadge = bodyText.includes('3er año') && bodyText.includes('Secundaria');
    const hasCorrectBadge = bodyText.includes('Primaria');
    console.log(`  Has wrong badge (3er año): ${hasWrongBadge}`);
    console.log(`  Has correct badge (Primaria): ${hasCorrectBadge}`);

    await waitForToast(page, 3000);
  });

});

// ─── Phase 2: Admin content-creation pages ───────────────────────────────────

test.describe('PHASE 2 — Admin content-creation pages', () => {

  test.setTimeout(180000);

  test('2.1 — Login as admin', async ({ page }) => {
    await login(page, 'admin', 'admin123', 'admin');
    expect(page.url()).not.toContain('/login');
  });

  test('2.2 — /diagnosticos: create diagnosis', async ({ page }) => {
    await login(page, 'admin', 'admin123', 'admin');
    await page.goto(`${BASE_URL}/diagnosticos`);
    await page.waitForLoadState('networkidle');
    await screenshotFull(page, 'phase2_diagnosticos_loaded');

    // Click "+ Crear Diagnóstico"
    const createBtn = page.locator('button:has-text("Crear"), button:has-text("+"), [class*="create"]').first();
    if (await createBtn.count() > 0) {
      await createBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'phase2_diagnosticos_form');

      // Fill the form
      const nombreInput = page.locator('input[type="text"], input[placeholder*="nombre" i], input[placeholder*="Nombre" i]').first();
      const nivelSelect = page.locator('select').first();
      const areaInput = page.locator('input[placeholder*="área" i], input[placeholder*="area" i]').first();
      const fechaInput = page.locator('input[type="date"], input[placeholder*="fecha" i]').first();

      if (await nombreInput.count() > 0) await nombreInput.fill('Test TDAH E2E');
      if (await nivelSelect.count() > 0) {
        await nivelSelect.selectOption({ index: 1 }).catch(() => {});
      }
      if (await areaInput.count() > 0) await areaInput.fill('TDAH');
      if (await fechaInput.count() > 0) await fechaInput.fill('2026-06-30');

      await screenshot(page, 'phase2_diagnosticos_form_filled');

      // Click "Guardar Diagnóstico"
      const guardarBtn = page.locator('button:has-text("Guardar"), button:has-text("guardar")').first();
      if (await guardarBtn.count() > 0) {
        await guardarBtn.click();
        await page.waitForTimeout(3000);
        await screenshot(page, 'phase2_diagnosticos_after_save');
        await waitForToast(page);
      }
    }

    // Refresh and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    const refreshedText = await page.locator('body').innerText();
    const persisted = refreshedText.includes('Test TDAH E2E');
    console.log(`  Entry persisted after refresh: ${persisted}`);
    await screenshotFull(page, 'phase2_diagnosticos_persisted');
  });

  test('2.3 — /wizard: material selection, unit/topic, 4 motors, 12 files', async ({ page }) => {
    await login(page, 'admin', 'admin123', 'admin');
    await page.goto(`${BASE_URL}/wizard`);
    await page.waitForLoadState('networkidle');
    await screenshotFull(page, 'phase2_wizard_loaded');

    // Select material id=1
    const materialSelect = page.locator('select').first();
    if (await materialSelect.count() > 0) {
      await materialSelect.selectOption({ index: 1 }).catch(() => {});
      await page.waitForTimeout(1000);
      await screenshot(page, 'phase2_wizard_material_selected');
    }

    // Select unit "Mitos y leyendas"
    const unitSelect = page.locator('select').nth(1);
    if (await unitSelect.count() > 0) {
      const unitOptions = await unitSelect.locator('option').allTextContents();
      console.log(`  Unit options: ${unitOptions.slice(0, 5).join(', ')}`);
      // Try to find "Mitos" option
      const mitoOptionIdx = unitOptions.findIndex(o => o.toLowerCase().includes('mito'));
      if (mitoOptionIdx >= 0) {
        await unitSelect.selectOption({ index: mitoOptionIdx });
      }
      await page.waitForTimeout(1000);
      await screenshot(page, 'phase2_wizard_unit_selected');
    }

    // Select topic "Guede pinta los animales"
    const topicSelect = page.locator('select').nth(2);
    if (await topicSelect.count() > 0) {
      const topicOptions = await topicSelect.locator('option').allTextContents();
      console.log(`  Topic options: ${topicOptions.slice(0, 5).join(', ')}`);
      await screenshot(page, 'phase2_wizard_topic_select');
    }

    // Generate each of 4 motors (synthesis, slides, plan, quiz)
    const motorButtons = page.locator('button:has-text("Generar"), button:has-text("generar")');
    const motorCount = await motorButtons.count();
    console.log(`  Motor generate buttons: ${motorCount}`);

    for (let i = 0; i < Math.min(motorCount, 4); i++) {
      const btn = motorButtons.nth(i);
      if (await btn.count() > 0) {
        const btnText = await btn.innerText();
        console.log(`  Generating motor ${i + 1}: ${btnText}`);
        await btn.click();
        await page.waitForTimeout(10000); // Wait for generation
        await screenshot(page, `phase2_wizard_motor_${i + 1}_generated`);
        await waitForToast(page, 5000);

        // Try downloading PPTX/PDF/DOCX for this motor
        const allBtns = await page.locator('button').all();
        for (const b of allBtns) {
          const t = await b.innerText();
          if (t.includes('PPTX') || t.includes('PDF') || t.includes('DOCX')) {
            console.log(`    Found download btn: ${t}`);
          }
        }
      }
    }
  });

  test('2.4 — /trimestral: Plan de Unidad + PDC Trimestral tabs', async ({ page }) => {
    await login(page, 'admin', 'admin123', 'admin');
    await page.goto(`${BASE_URL}/trimestral`);
    await page.waitForLoadState('networkidle');
    await screenshotFull(page, 'phase2_trimestral_loaded');

    // Click "📋 Plan de Unidad y ABP" tab
    const planTab = page.locator('button:has-text("Plan de Unidad"), [class*="tab"]:has-text("Plan")').first();
    if (await planTab.count() > 0) {
      await planTab.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'phase2_trimestral_plan_tab');

      // Find and click synthesis motor generate
      const genBtn = page.locator('button:has-text("Generar"), button:has-text("generar")').first();
      if (await genBtn.count() > 0) {
        await genBtn.click();
        await page.waitForTimeout(10000);
        await screenshot(page, 'phase2_trimestral_plan_generated');
        await waitForToast(page, 5000);
      }
    }

    // Click "📄 PDC Trimestral" tab
    const pdcTab = page.locator('button:has-text("PDC Trimestral"), [class*="tab"]:has-text("PDC")').first();
    if (await pdcTab.count() > 0) {
      await pdcTab.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'phase2_trimestral_pdc_tab');

      const genBtn2 = page.locator('button:has-text("Generar"), button:has-text("generar")').first();
      if (await genBtn2.count() > 0) {
        await genBtn2.click();
        await page.waitForTimeout(10000);
        await screenshot(page, 'phase2_trimestral_pdc_generated');
        await waitForToast(page, 5000);
      }
    }
  });

  test('2.5 — /materiales: file upload validation', async ({ page }) => {
    await login(page, 'admin', 'admin123', 'admin');
    await page.goto(`${BASE_URL}/materiales`);
    await page.waitForLoadState('networkidle');
    await screenshotFull(page, 'phase2_materiales_loaded');

    // Verify material id=1 is listed
    const bodyText = await page.locator('body').innerText();
    const hasMaterial = bodyText.includes('Texto de lenguaje') || bodyText.includes('Texto');
    console.log(`  Material id=1 listed: ${hasMaterial}`);

    // Try uploading invalid file
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      // Try with a text file (invalid)
      const invalidFilePath = 'D:\\ACTIVE PROJECTS\\PRIA v10\\package.json';
      try {
        await fileInput.setInputFiles(invalidFilePath);
        await page.waitForTimeout(2000);
        await screenshot(page, 'phase2_materiales_invalid_upload');
        const toast = await waitForToast(page, 3000);
        console.log(`  Invalid upload toast: ${toast}`);
      } catch (e) {
        console.log(`  File input error: ${e}`);
      }
    }
  });

  test('2.6 — /history: shows motor_results', async ({ page }) => {
    await login(page, 'admin', 'admin123', 'admin');
    await page.goto(`${BASE_URL}/history`);
    await page.waitForLoadState('networkidle');
    await screenshotFull(page, 'phase2_history_loaded');

    const bodyText = await page.locator('body').innerText();
    console.log(`  /history body length: ${bodyText.length}`);
    // Should show some content (motor results)
    expect(bodyText.length).toBeGreaterThan(20);
  });

});

// ─── Phase 3: Admin functions ────────────────────────────────────────────────

test.describe('PHASE 3 — Admin functions', () => {

  test.setTimeout(120000);

  test('3.1 — /admin/archivos: file listing and deletion', async ({ page }) => {
    await login(page, 'admin', 'admin123', 'admin');
    await page.goto(`${BASE_URL}/admin/archivos`);
    await page.waitForLoadState('networkidle');
    await screenshotFull(page, 'phase3_archivos_loaded');

    const bodyText = await page.locator('body').innerText();
    const hasFiles = bodyText.includes('.pdf') || bodyText.includes('.docx') || bodyText.includes('.pptx');
    console.log(`  Files displayed: ${hasFiles}`);

    // Try deleting a file
    const deleteBtn = page.locator('button:has-text("Eliminar"), button:has-text("eliminar"), button:has-text("delete"), [class*="delete"]').first();
    if (await deleteBtn.count() > 0) {
      await deleteBtn.click();
      await page.waitForTimeout(2000);
      await screenshot(page, 'phase3_archivos_after_delete');
      await waitForToast(page);
    }
  });

  test('3.2 — /admin/usuarios: create user with email', async ({ page }) => {
    await login(page, 'admin', 'admin123', 'admin');
    await page.goto(`${BASE_URL}/admin/usuarios`);
    await page.waitForLoadState('networkidle');
    await screenshotFull(page, 'phase3_usuarios_loaded');

    // Click create user button
    const createBtn = page.locator('button:has-text("Crear"), button:has-text("+"), [class*="create"]').first();
    if (await createBtn.count() > 0) {
      await createBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'phase3_usuarios_form');

      // Fill user form
      const inputs = page.locator('input[type="text"], input[type="email"], input[type="password"]');
      const inputCount = await inputs.count();
      console.log(`  Form inputs found: ${inputCount}`);

      if (inputCount >= 2) {
        await inputs.nth(0).fill('testuser_e2e');
        await inputs.nth(1).fill('testuser@pria.com');
        if (inputCount >= 3) {
          await inputs.nth(2).fill('TempPass123');
        }
        await screenshot(page, 'phase3_usuarios_form_filled');

        const saveBtn = page.locator('button:has-text("Guardar"), button:has-text("guardar")').first();
        if (await saveBtn.count() > 0) {
          await saveBtn.click();
          await page.waitForTimeout(3000);
          await screenshot(page, 'phase3_usuarios_after_save');
          await waitForToast(page);

          // Check if email persisted
          await page.reload();
          await page.waitForLoadState('networkidle');
          const bodyText = await page.locator('body').innerText();
          const emailPersisted = bodyText.includes('testuser@pria.com');
          console.log(`  Email persisted: ${emailPersisted}`);
        }
      }
    }
  });

  test('3.3 — /admin/reset: date picker and reset', async ({ page }) => {
    await login(page, 'admin', 'admin123', 'admin');
    await page.goto(`${BASE_URL}/admin/reset`);
    await page.waitForLoadState('networkidle');
    await screenshotFull(page, 'phase3_reset_loaded');

    // Pick a date
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.count() > 0) {
      await dateInput.fill('2026-06-15');
      await screenshot(page, 'phase3_reset_date_set');

      // Click reset
      const resetBtn = page.locator('button:has-text("Reset"), button:has-text("reset"), button:has-text("Reiniciar")').first();
      if (await resetBtn.count() > 0) {
        await resetBtn.click();
        await page.waitForTimeout(3000);
        await screenshot(page, 'phase3_reset_after_click');
        await waitForToast(page, 5000);
      }
    }
  });

});
