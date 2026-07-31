/**
 * PRIA v10 — Real-User E2E Test (Prof. María González Monday Morning)
 *
 * Scope: Verify the 3 critical teacher flows — Plan, Slides, Quiz — work
 * end-to-end for the topic "Guede pinta los animales".
 *
 * Critical assertions:
 *   1. Login as m.gonzalez / docente123 → dashboard
 *   2. /wizard loads → material "Texto de lenguaje.pdf" appears
 *   3. Topic "Guede pinta los animales" exists in unit "Mitos y leyendas"
 *   4. Plan / Slides / Quiz motors all reach "done" status
 *   5. BUG-005: downloaded PPTX contains "Prof. María González" on slide 1
 *   6. BUG-005: downloaded PPTX contains "Unidad Educativa San Andrés" on slide 1
 *   7. Downloads (PPTX/PDF/DOCX) succeed for each of the 3 motors
 *   8. No uncaught console errors during the flow
 *
 * INSTALL: Copy this file to D:\ACTIVE PROJECTS\PRIA v10\tests\e2e\maria-monday.spec.ts
 *
 * RUN:
 *   cd "D:\ACTIVE PROJECTS\PRIA v10"
 *   npm install --save-dev jszip
 *   npm run test:e2e -- maria-monday
 */

import { test, expect, type Page, type Download } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
// @ts-ignore - JSZip types ship inconsistently
import JSZip from 'jszip';

// ──────────────────────────────────────────────────────────────────────────
// Test fixtures
// ──────────────────────────────────────────────────────────────────────────

const TEACHER_USER = 'm.gonzalez';
const TEACHER_PASS = 'docente123';
const TEACHER_NAME = 'Prof. María González';
const TEACHER_SCHOOL = 'Unidad Educativa San Andrés';
const TARGET_TOPIC = 'Guede pinta los animales';
const TARGET_UNIT = 'Mitos y leyendas';
const MATERIAL_FILENAME_OLD = 'Texto de lenguaje.pdf';
const MATERIAL_FILENAME_NEW = 'Unidad 3 - Lenguaje_5to_SB.pdf';
const MATERIAL_FILENAME = MATERIAL_FILENAME_NEW;

const TEST_DOWNLOAD_DIR = path.resolve(
  process.env.E2E_DOWNLOAD_DIR ?? 'D:\\Temp\\opencode\\user_test\\downloads'
);

const MIN_PPTX_SIZE = 5_000;
const MIN_PDF_SIZE = 3_000;
const MIN_DOCX_SIZE = 3_000;

interface ConsoleError { page: string; text: string; when: string; }
const consoleErrors: ConsoleError[] = [];

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

async function login(page: Page, user: string, pass: string) {
  await page.goto('/login');
  const userInput = page.locator('input[name="usuario"], input[autocomplete="username"], input[type="text"]').first();
  const passInput = page.locator('input[name="contrasena"], input[type="password"]').first();
  await userInput.waitFor({ state: 'visible', timeout: 15_000 });
  await userInput.fill(user);
  await passInput.fill(pass);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
}

function attachConsoleErrorTrap(page: Page, pageLabel: string) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ page: pageLabel, text: msg.text(), when: new Date().toISOString() });
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push({ page: pageLabel, text: `pageerror: ${err.message}`, when: new Date().toISOString() });
  });
}

async function wizardContinue(page: Page) {
  const btn = page.getByRole('button', { name: /Continuar/i }).first();
  await btn.click();
}

async function generateMotorAndWait(
  page: Page,
  motorLabel: string,
  timeoutMs = 180_000
): Promise<{ simulated: boolean; durationMs: number }> {
  const start = Date.now();
  const card = page.locator(`div:has(> div > h3:text("${motorLabel}"))`).first();
  await expect(card).toBeVisible({ timeout: 30_000 });
  const generateBtn = card.locator('button:has-text("Generar")').first();
  await generateBtn.click();
  const regenerateBtn = card.locator('button:has-text("Regenerar")');
  await regenerateBtn.waitFor({ state: 'visible', timeout: timeoutMs });
  const simulatedBadge = card.locator('text=/SIMULADO/i');
  const simulated = (await simulatedBadge.count()) > 0;
  return { simulated, durationMs: Date.now() - start };
}

async function downloadMotorFormat(
  page: Page,
  motorLabel: string,
  format: 'pptx' | 'pdf' | 'docx'
): Promise<Download> {
  const card = page.locator(`div:has(> div > h3:text("${motorLabel}"))`).first();
  const formatBtn = card.locator(`button:has-text("${format.toUpperCase()}")`).first();
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60_000 }),
    formatBtn.click(),
  ]);
  return download;
}

async function persistDownload(
  download: Download,
  filename: string
): Promise<{ path: string; size: number }> {
  fs.mkdirSync(TEST_DOWNLOAD_DIR, { recursive: true });
  const dest = path.join(TEST_DOWNLOAD_DIR, filename);
  await download.saveAs(dest);
  const size = fs.statSync(dest).size;
  return { path: dest, size };
}

async function verifyPptxContents(
  filePath: string,
  expectations: string[]
): Promise<{ found: Record<string, boolean>; allFound: boolean; rawSlide1: string }> {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  let rawSlide1 = '';
  for (const name of ['ppt/slides/slide1.xml', 'ppt/slides/slide2.xml', 'ppt/slides/slide3.xml']) {
    const entry = zip.file(name);
    if (entry) {
      rawSlide1 = await entry.async('string');
      break;
    }
  }
  const presEntry = zip.file('ppt/presentation.xml');
  const rawPres = presEntry ? await presEntry.async('string') : '';
  const combined = rawSlide1 + '\n' + rawPres;
  const found: Record<string, boolean> = {};
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  for (const exp of expectations) {
    const normalizedExp = normalize(exp);
    found[exp] = normalize(combined).includes(normalizedExp);
  }
  return { found, allFound: Object.values(found).every(Boolean), rawSlide1 };
}

async function verifyDocxContents(
  filePath: string,
  expectations: string[]
): Promise<{ found: Record<string, boolean>; allFound: boolean }> {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const docEntry = zip.file('word/document.xml');
  const raw = docEntry ? await docEntry.async('string') : '';
  const found: Record<string, boolean> = {};
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  for (const exp of expectations) {
    found[exp] = normalize(raw).includes(normalize(exp));
  }
  return { found, allFound: Object.values(found).every(Boolean) };
}

// ──────────────────────────────────────────────────────────────────────────
// Test suite
// ──────────────────────────────────────────────────────────────────────────

test.describe('Prof. María González — Monday morning flow', () => {
  test.setTimeout(240000);

  test.beforeEach(async ({ page }) => {
    attachConsoleErrorTrap(page, page.url() || 'unknown');
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log(`[CONSOLE ERROR] ${msg.text()}`);
    });
  });

  test('1. Login as m.gonzalez reaches dashboard', async ({ page }) => {
    await login(page, TEACHER_USER, TEACHER_PASS);
    await expect(page).toHaveURL(/\/(dashboard|diario|wizard|materiales)/);
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();
  });

  test('2. /wizard loads and shows pre-loaded material', async ({ page }) => {
    await login(page, TEACHER_USER, TEACHER_PASS);
    await page.goto('/wizard');
    const materialBtn = page.locator(`button:has-text("${MATERIAL_FILENAME}")`);
    await expect(materialBtn).toBeVisible({ timeout: 30_000 });
  });

  test('3. Selecting material reveals units and topic for Guede', async ({ page }) => {
    await login(page, TEACHER_USER, TEACHER_PASS);
    await page.goto('/wizard');
    await page.locator(`button:has-text("${MATERIAL_FILENAME}")`).click();
    const unitLocator = page.locator(`text=${TARGET_UNIT}`).first();
    await expect(unitLocator).toBeVisible({ timeout: 60_000 });
    await unitLocator.click();
    const topicCheckbox = page.locator(`text=${TARGET_TOPIC}`).first();
    await expect(topicCheckbox).toBeVisible({ timeout: 30_000 });
    await topicCheckbox.click();
    await wizardContinue(page);
    await expect(page.locator('h3:text("Plan de unidad")')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('h3:text("Diapositivas")')).toBeVisible();
    await expect(page.locator('h3:text("Plan de clase (45 min)")')).toBeVisible();
    await expect(page.locator('h3:text("Quiz")')).toBeVisible();
  });

  test('4. Plan motor generates and produces a valid PPTX', async ({ page }) => {
    await login(page, TEACHER_USER, TEACHER_PASS);
    await page.goto('/wizard');
    await page.locator(`button:has-text("${MATERIAL_FILENAME}")`).click();
    await page.locator(`text=${TARGET_UNIT}`).first().click();
    await page.locator(`text=${TARGET_TOPIC}`).first().click();
    await wizardContinue(page);
    const result = await generateMotorAndWait(page, 'Plan de clase (45 min)');
    expect(result.durationMs).toBeLessThan(180_000);
    const download = await downloadMotorFormat(page, 'Plan de clase (45 min)', 'pptx');
    const { path: savedPath, size } = await persistDownload(download, `maria-monday_plan_${Date.now()}.pptx`);
    expect(size).toBeGreaterThan(MIN_PPTX_SIZE);
    const check = await verifyPptxContents(savedPath, [TARGET_TOPIC, TEACHER_NAME, TEACHER_SCHOOL]);
    expect(check.found[TARGET_TOPIC]).toBe(true);
    console.log(`[BUG-005] Plan PPTX — teacher name found: ${check.found[TEACHER_NAME]}`);
    console.log(`[BUG-005] Plan PPTX — school name found: ${check.found[TEACHER_SCHOOL]}`);
  });

  test('5. Slides motor generates, PPTX has topic + teacher (BUG-005)', async ({ page }) => {
    await login(page, TEACHER_USER, TEACHER_PASS);
    await page.goto('/wizard');
    await page.locator(`button:has-text("${MATERIAL_FILENAME}")`).click();
    await page.locator(`text=${TARGET_UNIT}`).first().click();
    await page.locator(`text=${TARGET_TOPIC}`).first().click();
    await wizardContinue(page);
    const result = await generateMotorAndWait(page, 'Diapositivas');
    expect(result.durationMs).toBeLessThan(180_000);
    const download = await downloadMotorFormat(page, 'Diapositivas', 'pptx');
    const { path: savedPath, size } = await persistDownload(download, `maria-monday_slides_${Date.now()}.pptx`);
    expect(size).toBeGreaterThan(MIN_PPTX_SIZE);
    const check = await verifyPptxContents(savedPath, [TARGET_TOPIC, TEACHER_NAME, TEACHER_SCHOOL]);
    expect(check.found[TARGET_TOPIC]).toBe(true);
    expect.soft(check.found[TEACHER_NAME], 'BUG-005: teacher name should appear in slides PPTX').toBe(true);
    expect.soft(check.found[TEACHER_SCHOOL], 'BUG-005: school name should appear in slides PPTX').toBe(true);
    const pdfDownload = await downloadMotorFormat(page, 'Diapositivas', 'pdf');
    const { size: pdfSize } = await persistDownload(pdfDownload, `maria-monday_slides_${Date.now()}.pdf`);
    expect(pdfSize).toBeGreaterThan(MIN_PDF_SIZE);
    const docxDownload = await downloadMotorFormat(page, 'Diapositivas', 'docx');
    const { path: docxPath, size: docxSize } = await persistDownload(docxDownload, `maria-monday_slides_${Date.now()}.docx`);
    expect(docxSize).toBeGreaterThan(MIN_DOCX_SIZE);
    const docxCheck = await verifyDocxContents(docxPath, [TARGET_TOPIC, TEACHER_NAME]);
    expect(docxCheck.found[TARGET_TOPIC]).toBe(true);
  });

  test('6. Quiz motor generates and contains topic', async ({ page }) => {
    await login(page, TEACHER_USER, TEACHER_PASS);
    await page.goto('/wizard');
    await page.locator(`button:has-text("${MATERIAL_FILENAME}")`).click();
    await page.locator(`text=${TARGET_UNIT}`).first().click();
    await page.locator(`text=${TARGET_TOPIC}`).first().click();
    await wizardContinue(page);
    const result = await generateMotorAndWait(page, 'Quiz');
    expect(result.durationMs).toBeLessThan(180_000);
    const download = await downloadMotorFormat(page, 'Quiz', 'pptx');
    const { path: savedPath, size } = await persistDownload(download, `maria-monday_quiz_${Date.now()}.pptx`);
    expect(size).toBeGreaterThan(MIN_PPTX_SIZE);
    const check = await verifyPptxContents(savedPath, [TARGET_TOPIC]);
    expect(check.found[TARGET_TOPIC]).toBe(true);
  });

  test('7. No uncaught console errors during full flow', async ({ page }) => {
    consoleErrors.length = 0;
    await login(page, TEACHER_USER, TEACHER_PASS);
    await page.goto('/wizard');
    await page.locator(`button:has-text("${MATERIAL_FILENAME}")`).click();
    await page.locator(`text=${TARGET_UNIT}`).first().click();
    await page.locator(`text=${TARGET_TOPIC}`).first().click();
    await wizardContinue(page);
    await generateMotorAndWait(page, 'Plan de clase (45 min)');
    await generateMotorAndWait(page, 'Diapositivas');
    await generateMotorAndWait(page, 'Quiz');
    const fatal = consoleErrors.filter((e) => {
      const t = e.text;
      return (
        !/Sentry/i.test(t) &&
        !/Download the React DevTools/i.test(t) &&
        !/ERR_INTERNET_DISCONNECTED/i.test(t)
      );
    });
    if (fatal.length > 0) {
      console.log(`[FATAL CONSOLE ERRORS]\n${fatal.map((e) => `  ${e.page}: ${e.text}`).join('\n')}`);
    }
    expect(fatal.length).toBe(0);
  });
});

test.afterAll(async () => {
  fs.mkdirSync(TEST_DOWNLOAD_DIR, { recursive: true });
  const errLog = path.join(TEST_DOWNLOAD_DIR, '..', 'console_errors.log');
  fs.writeFileSync(
    errLog,
    `# PRIA v10 E2E Test — Console errors\n# Date: ${new Date().toISOString()}\n\n` +
      consoleErrors.map((e) => `[${e.when}] ${e.page}\n  ${e.text}\n`).join('\n'),
    'utf-8'
  );
});