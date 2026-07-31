const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = 'D:\\Temp\\opencode\\verify_v7';

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

async function waitForTimeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== Testing PDF and DOCX formats ===\n');

  const loginData = await loginApi();
  console.log('1. LOGIN: OK');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // Setup
  await page.goto(BASE_URL + '/login');
  await page.waitForLoadState('networkidle');
  await page.evaluate(([token, user]) => {
    localStorage.setItem('pria_token', token);
    localStorage.setItem('pria_user', JSON.stringify(user));
  }, [loginData.token, loginData.user]);

  // Navigate to wizard
  await page.goto(BASE_URL + '/wizard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Select material and Guede
  await page.locator('text=Texto de lenguaje').first().click();
  await page.waitForTimeout(2000);
  
  const checkboxes = await page.locator('input[type="checkbox"]').all();
  for (let i = 0; i < checkboxes.length; i++) {
    const parent = await checkboxes[i].locator('..').first();
    const text = await parent.textContent();
    if (text && text.includes('Guede')) {
      await checkboxes[i].click();
      break;
    }
  }
  
  await page.waitForTimeout(500);

  // Continue to generate step
  const continuarBtn = page.locator('button:has-text("Continuar")').first();
  await continuarBtn.click();
  await page.waitForTimeout(3000);

  // Click Generate for Síntesis
  const genBtns = await page.locator('button:has-text("Generar")').all();
  for (const btn of genBtns) {
    const text = await btn.textContent();
    if (text === 'Generar') {
      await btn.click();
      break;
    }
  }

  // Wait for synthesis
  console.log('2. Waiting for synthesis generation...');
  for (let i = 0; i < 60; i++) {
    await waitForTimeout(2000);
    const pptxCount = await page.locator('button:has-text("PPTX")').count();
    if (pptxCount > 0) {
      console.log('   Synthesis complete');
      break;
    }
    if (i % 10 === 0) console.log(`   Waiting... ${i*2}s`);
  }

  await page.waitForTimeout(1000);

  // Test PDF format
  console.log('\n3. Testing PDF format...');
  const pdfBtns = await page.locator('button:has-text("PDF")').all();
  console.log(`   Found ${pdfBtns.length} PDF buttons`);
  
  for (const btn of pdfBtns) {
    const text = await btn.textContent();
    const title = await btn.getAttribute('title');
    console.log(`   Button: "${text}", title: "${title}"`);
  }
  
  // Check if PDF is enabled or shows "próximamente"
  if (pdfBtns.length > 0) {
    const firstPdfBtn = pdfBtns[0];
    const isDisabled = await firstPdfBtn.getAttribute('disabled');
    const title = await firstPdfBtn.getAttribute('title');
    console.log(`   PDF enabled: ${isDisabled === null && !title?.includes('próximamente')}`);
    console.log(`   Status: ${title || 'enabled'}`);
  }

  // Test DOCX format
  console.log('\n4. Testing DOCX format...');
  const docxBtns = await page.locator('button:has-text("DOCX")').all();
  console.log(`   Found ${docxBtns.length} DOCX buttons`);
  
  for (const btn of docxBtns) {
    const text = await btn.textContent();
    const title = await btn.getAttribute('title');
    console.log(`   Button: "${text}", title: "${title}"`);
  }

  await browser.close();
  console.log('\n=== DONE ===');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
