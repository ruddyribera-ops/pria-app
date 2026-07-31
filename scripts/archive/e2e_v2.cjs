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
  console.log('=== PRIA v10 E2E Test - FINAL ===\n');

  const loginData = await loginApi();
  console.log('1. LOGIN: OK');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`   [Error]: ${msg.text()}`);
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
  console.log('2. TEACHER CONFIG SET - BUG-005 exists');

  // Navigate to wizard
  await page.goto(BASE_URL + '/wizard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_login.png') });
  console.log('3. WIZARD LOADED');

  // Select material
  await page.locator('text=Texto de lenguaje').first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_material_selected.png') });
  console.log('4. MATERIAL SELECTED');

  // Click Guede checkbox
  const checkboxes = await page.locator('input[type="checkbox"]').all();
  console.log(`5. Found ${checkboxes.length} checkboxes`);
  
  for (let i = 0; i < checkboxes.length; i++) {
    const parent = await checkboxes[i].locator('..').first();
    const text = await parent.textContent();
    if (text && text.includes('Guede')) {
      console.log(`   Clicking Guede checkbox [${i}]`);
      await checkboxes[i].click();
      break;
    }
  }
  
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_topic_selected.png') });

  // STEP: Click "Continuar con 1 tema →" to transition to GENERATE step
  console.log('6. Transitioning to GENERATE step...');
  const continuarBtn = page.locator('button:has-text("Continuar")').first();
  
  if (await continuarBtn.isVisible().catch(() => false)) {
    console.log('   Clicking "Continuar con 1 tema →"...');
    await continuarBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_generate_step.png') });
    console.log('   Should now be on GENERATE step');
  } else {
    console.log('   ERROR: Continuar button not found');
  }

  // Check current step
  const bodyText = await page.textContent('body');
  console.log(`   Step indicator: ${bodyText.includes('3. Genera') ? 'GENERATE' : 'OTHER'}`);
  console.log(`   Has Síntesis: ${bodyText.includes('Síntesis')}`);
  console.log(`   Has slides: ${bodyText.includes('slides') || bodyText.includes('Diapositivas')}`);
  console.log(`   Has Plan: ${bodyText.includes('Plan')}`);
  console.log(`   Has Quiz: ${bodyText.includes('Quiz')}`);

  // Find Generate buttons for each motor
  console.log('7. Looking for motor Generate buttons...');
  
  // List all buttons
  const allButtons = await page.locator('button').all();
  console.log(`   Total buttons: ${allButtons.length}`);
  for (const btn of allButtons) {
    const text = await btn.textContent();
    const disabled = await btn.getAttribute('disabled');
    console.log(`   - "${text}" ${disabled !== null ? '(disabled)' : ''}`);
  }

  // Find Síntesis section and click its Generate
  console.log('8. Generating Síntesis...');
  
  // The Síntesis section has a Generate button
  // Use a more specific selector
  const sintetisisSection = page.locator('text=Síntesis').first();
  if (await sintetisisSection.isVisible().catch(() => false)) {
    console.log('   Síntesis section visible');
    
    // Get the Generate button in the Síntesis section
    // The structure is: Síntesis label → ... → Generate button
    const parent = await sintetisisSection.locator('..').locator('..');
    const genBtn = await parent.locator('button:has-text("Generar")').first();
    
    if (await genBtn.isVisible().catch(() => false)) {
      console.log('   Clicking Síntesis Generate...');
      await genBtn.click();
    } else {
      // Try alternative: find by text content
      console.log('   Trying alternative selector...');
      const allGenBtns = await page.locator('button:has-text("Generar")').all();
      for (const btn of allGenBtns) {
        const text = await btn.textContent();
        if (text === 'Generar') {
          await btn.click();
          console.log('   Clicked standalone "Generar" button');
          break;
        }
      }
    }
  }

  // Wait for generation
  console.log('9. Waiting for Síntesis generation (120s)...');
  for (let i = 0; i < 60; i++) {
    await waitForTimeout(2000);
    
    const pptxCount = await page.locator('button:has-text("PPTX")').count();
    if (pptxCount > 0) {
      console.log(`   COMPLETE! ${pptxCount} PPTX button(s) visible`);
      break;
    }
    
    const regenCount = await page.locator('button:has-text("Regenerar")').count();
    if (regenCount > 0) {
      console.log(`   COMPLETE! ${regenCount} Regenerar button(s) visible`);
      break;
    }
    
    // Check for loading state
    const generating = await page.locator('text=Generando').isVisible().catch(() => false);
    if (i % 10 === 0) {
      console.log(`   Waiting... ${i*2}s ${generating ? '(generating)' : ''}`);
    }
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_after_synthesis.png') });

  // Download PPTX
  console.log('10. Downloading PPTX...');
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
      console.log(`    SAVED: ${result.path}`);
      
      const stats = fs.statSync(result.path);
      console.log(`    SIZE: ${stats.size} bytes`);
      
      if (stats.size > 1024) {
        const tempDir = path.join(OUT_DIR, 'temp_pptx');
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
        fs.mkdirSync(tempDir);
        
        try {
          const { execSync } = require('child_process');
          execSync(`powershell -Command "Expand-Archive -Path '${result.path}' -DestinationPath '${tempDir}' -Force"`);
          
          const slidePath = path.join(tempDir, 'ppt', 'slides', 'slide1.xml');
          if (fs.existsSync(slidePath)) {
            const content = fs.readFileSync(slidePath, 'utf-8');
            
            console.log('\n    BUG-005 VERIFICATION:');
            console.log(`    "María": ${content.includes('María')}`);
            console.log(`    "González": ${content.includes('González')}`);
            console.log(`    "San Andrés": ${content.includes('San Andrés')}`);
            console.log(`    "Guede": ${content.includes('Guede')}`);
            console.log(`    "nombreDocente": ${content.includes('nombreDocente')}`);
            
            if (!content.includes('María') && !content.includes('González') && !content.includes('San Andrés')) {
              console.log('\n    !!! BUG-005 CONFIRMED: Teacher name NOT in PPTX !!!');
              console.log('    Cause: localStorage has "nombreDocente" but TeacherInfo expects "nombre"');
            }
          }
          
          fs.rmSync(tempDir, { recursive: true });
        } catch (e) {
          console.log(`    Verify error: ${e.message}`);
        }
      }
    } else {
      console.log(`    FAILED: ${result.error}`);
    }
  } else {
    console.log('    PPTX button not visible');
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_final.png') });
  
  console.log('\n=== SCREENSHOTS ===');
  const files = fs.readdirSync(SCREENSHOTS_DIR);
  for (const f of files) {
    console.log(`  ${f}`);
  }
  
  console.log('\n=== DONE ===');
  await browser.close();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
