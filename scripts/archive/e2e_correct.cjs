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
  console.log('=== PRIA v10 E2E Test - Corrected ===\n');

  const loginData = await loginApi();
  console.log('1. LOGIN: OK');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`   [Console Error]: ${msg.text()}`);
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
  console.log('2. TEACHER CONFIG SET - BUG-005: field mismatch exists');
  console.log('   localStorage: nombreDocente, colegio, ciudad');
  console.log('   TeacherInfo: nombre, email, escuela');

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

  // STEP 1: Click "Generar 1 tema" to transition to GENERATE step
  console.log('6. Transitioning to GENERATE step...');
  const gen1Btn = page.locator('button:has-text("Generar 1 tema")').first();
  await gen1Btn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_generate_step.png') });
  console.log('   Now on generate step');

  // STEP 2: Find the Síntesis section and its Generate button
  console.log('7. Looking for Síntesis Generate button...');
  
  // The Síntesis section contains a "Generar" button
  // Let's find all "Generar" buttons that are standalone (not "Generar 1 tema")
  const generateButtons = await page.locator('button:has-text("Generar")').filter({ hasText: /^(?!.*1 tema)/ }).all();
  console.log(`   Found ${generateButtons.length} motor Generate buttons`);
  
  for (let i = 0; i < generateButtons.length; i++) {
    const text = await generateButtons[i].textContent();
    const visible = await generateButtons[i].isVisible();
    console.log(`   [${i}]: "${text}" (visible: ${visible})`);
  }

  // Click the Síntesis Generate button
  // Look for button that has "Generar" and is near "Síntesis" text
  const sintesisGenBtn = page.locator('button:has-text("Síntesis")').locator('..').locator('button:has-text("Generar")').first();
  
  if (await sintesisGenBtn.isVisible().catch(() => false)) {
    console.log('   Clicking Síntesis Generate...');
    await sintesisGenBtn.click();
  } else {
    // Fallback: click first available motor Generate button
    console.log('   Fallback: clicking first motor Generate button');
    if (generateButtons.length > 0) {
      await generateButtons[0].click();
    }
  }

  // Wait for synthesis generation
  console.log('8. Waiting for synthesis generation (120s max)...');
  let generated = false;
  for (let i = 0; i < 60; i++) {
    await waitForTimeout(2000);
    
    // Check for PPTX button
    const pptxCount = await page.locator('button:has-text("PPTX")').count();
    if (pptxCount > 0) {
      console.log(`   Generation complete! Found ${pptxCount} PPTX buttons`);
      generated = true;
      break;
    }
    
    // Check for Regenerar button
    const regenCount = await page.locator('button:has-text("Regenerar")').count();
    if (regenCount > 0) {
      console.log(`   Generation complete! Found ${regenCount} Regenerar buttons`);
      generated = true;
      break;
    }
    
    if (i % 10 === 0) console.log(`   Still waiting... ${i*2}s`);
  }
  
  if (!generated) {
    console.log('   WARNING: Generation timed out');
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_after_synthesis.png') });

  // Download PPTX
  console.log('9. Downloading PPTX...');
  const pptxBtn = page.locator('button:has-text("PPTX")').first();
  
  if (await pptxBtn.isVisible().catch(() => false)) {
    const downloadPromise = page.waitForEvent('download', { timeout: 120000 })
      .then(async (download) => {
        const filename = path.join(OUT_DIR, 'sintesis_teacher.pptx');
        await download.saveAs(filename);
        return { success: true, path: filename };
      })
      .catch((e) => ({ success: false, error: e.message }));
    
    await pptxBtn.click();
    const result = await downloadPromise;
    
    if (result.success) {
      console.log(`   SAVED: ${result.path}`);
      
      // Verify
      const stats = fs.statSync(result.path);
      console.log(`   SIZE: ${stats.size} bytes ${stats.size > 1024 ? '(OK)' : '(SMALL)'}`);
      
      if (stats.size > 1024) {
        const tempDir = path.join(OUT_DIR, 'temp_verify');
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
        fs.mkdirSync(tempDir);
        
        try {
          const { execSync } = require('child_process');
          execSync(`powershell -Command "Expand-Archive -Path '${result.path}' -DestinationPath '${tempDir}' -Force"`);
          
          const slidePath = path.join(tempDir, 'ppt', 'slides', 'slide1.xml');
          if (fs.existsSync(slidePath)) {
            const content = fs.readFileSync(slidePath, 'utf-8');
            
            console.log('\n   BUG-005 VERIFICATION:');
            console.log(`   Contains "María": ${content.includes('María')}`);
            console.log(`   Contains "González": ${content.includes('González')}`);
            console.log(`   Contains "San Andrés": ${content.includes('San Andrés')}`);
            console.log(`   Contains "Guede": ${content.includes('Guede')}`);
            console.log(`   Contains "nombreDocente": ${content.includes('nombreDocente')}`);
            
            if (!content.includes('María') && !content.includes('González') && !content.includes('San Andrés')) {
              console.log('\n   !!! BUG-005 CONFIRMED: Teacher personalization NOT in PPTX !!!');
              console.log('   The TeacherInfo interface expects "nombre" but localStorage has "nombreDocente"');
            } else {
              console.log('\n   BUG-005: Teacher name FOUND in PPTX');
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
  } else {
    console.log('   PPTX button not visible');
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_final.png') });
  
  // List all screenshots
  console.log('\n=== SCREENSHOTS ===');
  const files = fs.readdirSync(SCREENSHOTS_DIR);
  for (const f of files) {
    console.log(`   ${f}`);
  }
  
  console.log('\n=== DONE ===');
  await browser.close();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
