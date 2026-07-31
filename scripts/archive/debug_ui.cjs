const { chromium } = require('playwright');
const http = require('http');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000/api';

function req(opts, body) {
  return new Promise((resolve, reject) => {
    const r = http.request(opts, x => {
      let d = '';
      x.on('data', c => d += c);
      x.on('end', () => resolve({ status: x.statusCode, body: d }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function loginApi() {
  const r = await req({
    hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ usuario: 'admin', contrasena: 'admin123' }));
  return JSON.parse(r.body).data;
}

async function main() {
  console.log('=== Debug Test: Understanding UI Structure ===\n');

  const loginData = await loginApi();
  console.log('Logged in');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // Set localStorage
  await page.goto(BASE_URL + '/login');
  await page.waitForLoadState('networkidle');
  await page.evaluate(([token, user]) => {
    localStorage.setItem('pria_token', token);
    localStorage.setItem('pria_user', JSON.stringify(user));
  }, [loginData.token, loginData.user]);

  // Set teacher config
  const teacherConfig = {
    nombreDocente: "Prof. María González",
    colegio: "Unidad Educativa San Andrés",
    ciudad: "La Paz",
    grado: "5to de Primaria",
    materia: "Lenguaje y Comunicación",
    anoEscolar: "2026"
  };
  await page.evaluate((cfg) => {
    localStorage.setItem('pria_teacher_config', JSON.stringify(cfg));
  }, [teacherConfig]);

  // Go to wizard
  await page.goto(BASE_URL + '/wizard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Select material
  const materialBtn = await page.locator('text=Texto de lenguaje').first();
  if (await materialBtn.isVisible()) {
    await materialBtn.click();
    await page.waitForTimeout(2000);
  }

  // Now we're on the select step - let's explore the DOM
  console.log('\n=== Exploring Select Step DOM ===\n');

  // Get the full page text
  const bodyText = await page.textContent('body');
  console.log('Page text (searching for units and topics):');
  console.log('----------------------------------------');
  
  // Find Mitos y leyendas
  if (bodyText.includes('Mitos y leyendas')) {
    console.log('✓ Found "Mitos y leyendas" in page');
  }
  
  // Find Guede
  if (bodyText.includes('Guede')) {
    console.log('✓ Found "Guede" in page');
  } else {
    console.log('✗ "Guede" NOT in page text - topics may be hidden');
  }

  // List all buttons
  console.log('\nAll buttons on page:');
  const buttons = await page.locator('button').all();
  for (const btn of buttons) {
    const text = await btn.textContent();
    const disabled = await btn.getAttribute('disabled');
    console.log(`  - "${text}" ${disabled !== null ? '(disabled)' : ''}`);
  }

  // Find the unit selector area
  console.log('\nLooking for unit/topic structure:');
  
  // Check for unit headers (clickable divs with unit names)
  const unitHeaders = await page.locator('text=/^Unidad \\d+:/').all();
  console.log(`Found ${unitHeaders.length} unit headers`);
  
  for (const header of unitHeaders) {
    const text = await header.textContent();
    const isVisible = await header.isVisible();
    console.log(`  - "${text}" (visible: ${isVisible})`);
  }

  // Check for any expand/collapse icons
  const expandableElements = await page.locator('[class*="expand"], [class*="collapse"], [class*="chevron"]').all();
  console.log(`\nFound ${expandableElements.length} expandable elements`);

  // Try to find the checkbox inputs
  const checkboxes = await page.locator('input[type="checkbox"]').all();
  console.log(`Found ${checkboxes.length} checkboxes`);
  
  for (const cb of checkboxes) {
    const checked = await cb.isChecked();
    const visible = await cb.isVisible();
    console.log(`  - checkbox (checked: ${checked}, visible: ${visible})`);
  }

  // Get full HTML of the selector area
  console.log('\n=== Full HTML of selector ===');
  const selectorHtml = await page.locator('[style*="border-radius: 8px"]').first().innerHTML().catch(() => 'not found');
  console.log(selectorHtml.slice(0, 3000));

  await browser.close();
}

main().catch(console.error);
