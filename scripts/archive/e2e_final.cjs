const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000/api';
const OUT_DIR = 'D:\\Temp\\opencode\\verify_v7';
const SCREENSHOTS_DIR = path.join(OUT_DIR, 'screenshots');

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
  console.log('=== PRIA v10 E2E Test - Final ===\n');

  const loginData = await loginApi();
  console.log('1. LOGIN: OK');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // Capture ALL console messages
  page.on('console', msg => {
    console.log(`   [${msg.type()}]: ${msg.text()}`);
  });

  // Setup
  await page.goto(BASE_URL + '/login');
  await page.waitForLoadState('networkidle');
  await page.evaluate(([token, user]) => {
    localStorage.setItem('pria_token', token);
    localStorage.setItem('pria_user', JSON.stringify(user));
  }, [loginData.token, loginData.user]);

  // Teacher config
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
  console.log('2. TEACHER CONFIG SET');

  // Navigate to wizard
  await page.goto(BASE_URL + '/wizard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_wizard_initial.png') });
  console.log('3. WIZARD LOADED');

  // Select material
  await page.locator('text=Texto de lenguaje').first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_unit_selected.png') });
  console.log('4. MATERIAL SELECTED');

  // Click first checkbox (Guede)
  const checkboxes = await page.locator('input[type="checkbox"]').all();
  console.log(`5. Found ${checkboxes.length} checkboxes`);
  
  // Find Guede
  for (let i = 0; i < checkboxes.length; i++) {
    const parent = await checkboxes[i].locator('..').first();
    const text = await parent.textContent();
    if (text && text.includes('Guede')) {
      console.log(`   Clicking checkbox ${i} (Guede)`);
      await checkboxes[i].click();
      break;
    }
  }
  
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_topic_selected.png') });

  // Click Generar
  console.log('6. Clicking Generar...');
  const genBtn = page.locator('button:has-text("Generar")').filter({ hasText: /tema/ }).first();
  await genBtn.click();
  await page.waitForTimeout(2000);

  // Now we should be on step 3 (generate)
  console.log('7. Waiting for generate step...');
  
  // Look for all buttons on this page
  const allButtons = await page.locator('button').all();
  console.log(`   Total buttons: ${allButtons.length}`);
  for (const btn of allButtons) {
    const text = await btn.textContent();
    const visible = await btn.isVisible();
    console.log(`   - "${text}" (visible: ${visible})`);
  }
  
  // Find the synthesis Generate button specifically
  // Looking for: "Generar Síntesis" or just "Generar"
  const synthesisGenBtn = await page.locator('button:has-text("Síntesis")').locator('..').locator('button:has-text("Generar")').first();
  
  // Alternative: look for any "Generar" that comes after "Síntesis" text
  const pageContent = await page.content();
  const hasSintesis = pageContent.includes('Síntesis') || pageContent.includes('synthesis');
  console.log(`   Page has Síntesis: ${hasSintesis}`);
  
  // Find Regenerar buttons (indicates completion)
  const regenBtns = await page.locator('button:has-text("Regenerar")').all();
  console.log(`   Found ${regenBtns.length} Regenerar buttons`);
  
  // Find PPTX buttons
  const pptxBtns = await page.locator('button:has-text("PPTX")').all();
  console.log(`   Found ${pptxBtns.length} PPTX buttons`);
  
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_check_state.png') });

  // If no Generate buttons, try clicking Síntesis directly
  if (regenBtns.length === 0 && pptxBtns.length === 0) {
    console.log('7b. Looking for Síntesis section...');
    
    // Find Síntesis text and get its parent container
    const sintesisElement = page.locator('text=Síntesis').first();
    if (await sintesisElement.isVisible()) {
      console.log('   Found Síntesis element');
      
      // Get the container with Síntesis and look for Generar button nearby
      const container = await sintesisElement.locator('..').locator('..');
      const genInContainer = await container.locator('button:has-text("Generar")').first();
      if (await genInContainer.isVisible().catch(() => false)) {
        console.log('   Clicking Generar in Síntesis container');
        await genInContainer.click();
      }
    }
    
    // Wait for generation
    console.log('   Waiting for synthesis generation (120s max)...');
    for (let i = 0; i < 60; i++) {
      await waitForTimeout(2000);
      
      const regen = await page.locator('button:has-text("Regenerar")').count();
      const pptx = await page.locator('button:has-text("PPTX")').count();
      
      if (regen > 0 || pptx > 0) {
        console.log(`   Generation may be complete: regen=${regen}, pptx=${pptx}`);
        break;
      }
      
      if (i % 10 === 0) console.log(`   Still waiting... ${i*2}s`);
    }
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_download_buttons.png') });

  // Try to download
  console.log('8. Looking for download buttons...');
  const downloadBtns = await page.locator('button:has-text("PPTX"), button:has-text("Descargar")').all();
  console.log(`   Found ${downloadBtns.length} download buttons`);
  
  if (downloadBtns.length > 0) {
    const downloadPromise = page.waitForEvent('download', { timeout: 120000 })
      .then(async (download) => {
        const filename = path.join(OUT_DIR, 'sintesis_teacher.pptx');
        await download.saveAs(filename);
        return { success: true, path: filename };
      })
      .catch((e) => ({ success: false, error: e.message }));
    
    await downloadBtns[0].click();
    const result = await downloadPromise;
    
    if (result.success) {
      console.log(`   SAVED: ${result.path}`);
      
      // Verify
      const stats = fs.statSync(result.path);
      console.log(`   SIZE: ${stats.size} bytes`);
      
      if (stats.size > 1024) {
        // Extract and check
        const tempDir = path.join(OUT_DIR, 'temp_verify');
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
        fs.mkdirSync(tempDir);
        
        try {
          const { execSync } = require('child_process');
          execSync(`powershell -Command "Expand-Archive -Path '${result.path}' -DestinationPath '${tempDir}' -Force"`);
          
          const slidePath = path.join(tempDir, 'ppt', 'slides', 'slide1.xml');
          if (fs.existsSync(slidePath)) {
            const content = fs.readFileSync(slidePath, 'utf-8');
            
            console.log('\n   BUG-005 CHECK:');
            console.log(`   "María": ${content.includes('María')}`);
            console.log(`   "González": ${content.includes('González')}`);
            console.log(`   "San Andrés": ${content.includes('San Andrés')}`);
            console.log(`   "Guede": ${content.includes('Guede')}`);
            
            if (!content.includes('María') && !content.includes('González')) {
              console.log('\n   BUG-005: Teacher name NOT in PPTX');
            }
          }
          
          fs.rmSync(tempDir, { recursive: true });
        } catch (e) {
          console.log(`   Verify error: ${e.message}`);
        }
      }
    } else {
      console.log(`   FAILED: ${result.error}`);
    }
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_final.png') });
  console.log('\n=== DONE ===');
  await browser.close();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
