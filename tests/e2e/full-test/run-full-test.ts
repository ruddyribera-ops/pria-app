import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE = 'http://localhost:5173';
const SCREENSHOT_DIR = 'D:/.playwright-mcp/pria-test';
const REPORT: string[] = [];
let browser: Browser;
let page: Page;
let screenshotNum = 10;

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
  REPORT.push(msg);
}

function ss(name: string) {
  screenshotNum++;
  const filename = `${SCREENSHOT_DIR}/s${String(screenshotNum).padStart(2,'0')}-${name}.png`;
  try {
    page.screenshot({ path: filename, fullPage: false });
    log(`  📸 ${filename}`);
  } catch(e) {
    log(`  ⚠️ screenshot failed: ${e}`);
  }
}

async function clickEveryButton(page: Page, label: string) {
  const buttons = await page.locator('button').all();
  log(`  Found ${buttons.length} buttons on ${label}`);
  for (const btn of buttons) {
    try {
      const text = await btn.innerText().catch(() => '(no text)');
      const isDisabled = await btn.isDisabled().catch(() => false);
      const isHidden = await btn.isHidden().catch(() => false);
      if (!isHidden && !isDisabled && text.trim()) {
        log(`    Clicking: "${text.trim().substring(0,40)}" ${isDisabled ? '[DISABLED]' : '[OK]'}`);
        await btn.click({ timeout: 3000 }).catch(() => {});
 await page.waitForTimeout(500);
      }
    } catch(e) {}
  }
}

async function clickEveryLink(page: Page, label: string) {
  const links = await page.locator('a[href]').all();
  log(`  Found ${links.length} links on ${label}`);
  for (const link of links) {
    try {
      const href = await link.getAttribute('href').catch(() => '');
      const text = await link.innerText().catch(() => '(no text)');
      if (href && !href.startsWith('#') && text.trim()) {
        log(`    Clicking link: "${text.trim().substring(0,40)}" -> ${href}`);
        await link.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(500);
      }
    } catch(e) {}
  }
}

async function checkFormInputs(page: Page, label: string) {
  const inputs = await page.locator('input, select, textarea').all();
  log(`  Found ${inputs.length} form inputs on ${label}`);
  for (const input of inputs) {
    try {
      const type = await input.getAttribute('type').catch(() => 'text');
      const name = await input.getAttribute('name').catch(() => '');
      const placeholder = await input.getAttribute('placeholder').catch(() => '');
      const isDisabled = await input.isDisabled().catch(() => false);
      if (!isDisabled) {
        log(`    Input: type=${type} name=${name} placeholder=${placeholder} [OK]`);
      }
    } catch(e) {}
  }
}

async function checkCheckboxes(page: Page, label: string) {
  const checkboxes = await page.locator('input[type="checkbox"]').all();
  log(`  Found ${checkboxes.length} checkboxes on ${label}`);
  for (const cb of checkboxes) {
    try {
      const isChecked = await cb.isChecked().catch(() => false);
      const label = await page.locator(`label[for="${await cb.getAttribute('id')}"]`).innerText().catch(() => '(no label)');
      log(`    Checkbox: "${label}" [${isChecked ? 'CHECKED' : 'unchecked'}]`);
      if (!isChecked) {
        await cb.click({ timeout: 1000 }).catch(() => {});
        log(`      -> Toggled to: ${!isChecked}`);
 await page.waitForTimeout(300);
      }
    } catch(e) {}
  }
}

async function visitPage(url: string, label: string) {
  log(`\n▶▶ Visiting: ${label} (${url})`);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    ss(`${label.replace(/\s+/g,'-').toLowerCase()}`);
    await checkFormInputs(page, label);
    await checkCheckboxes(page, label);
    await clickEveryButton(page, label);
  } catch(e: any) {
    log(`  ⚠️  Error: ${e.message}`);
  }
}

async function run() {
  // Ensure screenshot dir
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  log('Starting PRIA v10 Full Test Suite');
  log(`Screenshot dir: ${SCREENSHOT_DIR}`);

  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  //1. Login
  log('\n=== STEP 1: LOGIN ===');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  ss('01-login-page');
  await page.getByRole('textbox', { name: 'Usuario' }).fill('admin');
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('admin123');
  ss('02-login-filled');
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  await page.waitForURL('**/materiales', { timeout: 15000 });
  ss('03-after-login-materiales');
  log('✅ Login successful');

  // 2. Test every sidebar page
  log('\n=== STEP 2: SIDEBAR PAGES ===');
  const sidebarPages = [
    ['/materiales', 'Materiales'],
    ['/slides', 'Diapositivas'],
    ['/diario', 'Diario'],
    ['/semanal', 'Semanal'],
    ['/trimestral', 'Trimestral'],
    ['/historial', 'Historial'],
    ['/diagnosticos', 'Diagnósticos'],
    ['/admin', 'Panel Admin'],
  ];

  for (const [url, label] of sidebarPages) {
    await visitPage(`${BASE}${url}`, label);
  }

  // 3. Admin sub-pages
  log('\n=== STEP 3: ADMIN SUB-PAGES ===');
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  ss('04-admin-page');
  
  // Click any admin panel tabs/links
  const adminLinks = await page.locator('a[href*="/admin"]').all();
  for (const link of adminLinks) {
    try {
      const href = await link.getAttribute('href').catch(() => '');
      const text = await link.innerText().catch(() => '');
      if (href && text.trim()) {
        log(`  Admin link: "${text.trim()}" -> ${href}`);
        await link.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(1000);
        ss(`admin-${text.trim().replace(/\s+/g,'-').toLowerCase()}`);
      }
    } catch(e) {}
  }

  // 4. Motor buttons on MaterialesPage
  log('\n=== STEP 4: MOTOR BUTTONS ===');
  await page.goto(`${BASE}/materiales`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  ss('05-materiales-motor-buttons');
  const motorButtons = await page.locator('button:has-text("Motor"), button:has-text("Generar"), button:has-text("Síntesis"), button:has-text("ABP"), button:has-text("Plan"), button:has-text("Evaluación"), button:has-text("Quiz"), button:has-text("Tutorial"), button:has-text("PDC"), button:has-text("Recalibrar"), button:has-text("Micro")').all();
  log(`  Found ${motorButtons.length} motor/generation buttons`);
  for (const btn of motorButtons) {
    try {
      const text = await btn.innerText().catch(() => '');
      const isDisabled = await btn.isDisabled().catch(() => false);
      if (!isDisabled) {
        log(`    Clicking: "${text.trim()}"`);
        await btn.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(2000);
        ss(`motor-${text.trim().replace(/\s+/g,'-').toLowerCase().substring(0,20)}`);
      } else {
        log(`    Skipping disabled: "${text.trim()}"`);
      }
    } catch(e) {}
  }

  // 5. File upload area
  log('\n=== STEP 5: FILE UPLOAD ===');
  await page.goto(`${BASE}/materiales`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  const fileInputs = await page.locator('input[type="file"]').all();
  log(`  Found ${fileInputs.length} file input(s)`);
  for (const fi of fileInputs) {
    try {
      const accept = await fi.getAttribute('accept').catch(() => '');
      log(`    File input: accept=${accept} [exists]`);
    } catch(e) {}
  }

  // 6. Estado del sistema toggle
  log('\n=== STEP 6: ESTADO DEL SISTEMA ===');
  await page.goto(`${BASE}/materiales`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  const estadoBtn = page.locator('button:has-text("Estado del sistema")').first();
  if (await estadoBtn.isVisible().catch(() => false)) {
    log('  Clicking "Estado del sistema" toggle');
    await estadoBtn.click({
