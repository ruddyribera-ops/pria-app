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
  console.log('=== PRIA v10 E2E Test - Fixed ===\n');

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

  // Find all checkboxes and their parent label text
  console.log('5. SEARCHING FOR GUEDE TOPIC...');
  
  const checkboxes = await page.locator('input[type="checkbox"]').all();
  console.log(`   Found ${checkboxes.length} checkboxes`);
  
  let guedeFound = false;
  let guedeIndex = -1;
  
  for (let i = 0; i < checkboxes.length; i++) {
    const cb = checkboxes[i];
    // Get all text content from parent container
    const parent = await cb.locator('..').first();
    const allText = await parent.textContent();
    
    if (allText && allText.includes('Guede')) {
      console.log(`   FOUND "Guede" at checkbox ${i}: "${allText.trim().slice(0, 60)}..."`);
      guedeFound = true;
      guedeIndex = i;
      break;
    }
  }
  
  // Click the checkbox
  if (guedeFound && guedeIndex >= 0) {
    await checkboxes[guedeIndex].click();
    console.log('   CLICKED checkbox');
  } else {
    // Fallback: just click first checkbox
    console.log('   Using first checkbox');
    await checkboxes[0].click();
  }
  
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_topic_selected.png') });

  // Click Generar button
  console.log('6. CLICKING GENERAR...');
  const generarBtn = page.locator('button:has-text("Generar")').filter({ hasText: /tema/ }).first();
  const isDisabled = await generarBtn.getAttribute('disabled');
  
  if (isDisabled === null) {
    await generarBtn.click();
    console.log('   CLICKED Generar');
    await page.waitForTimeout(2000);
  } else {
    // Try clicking first available Generar
    const allGenBtns = await page.locator('button:has-text("Generar")').all();
    console.log(`   Found ${allGenBtns.length} Generar buttons`);
    if (allGenBtns.length > 0) {
      await allGenBtns[0].click();
      console.log('   Clicked first Generar');
      await page.waitForTimeout(2000);
    }
  }
  
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_synthesis_generated.png') });

  // Wait for generate step
  console.log('7. WAITING FOR GENERATE STEP...');
  await page.waitForTimeout(5000);
  
  // List Generate buttons
  const genBtns = await page.locator('button:has-text("Generar")').all();
  console.log(`   Found ${genBtns.length} Generar buttons`);
  for (let i = 0; i < genBtns.length; i++) {
    const text = await genBtns[i].textContent();
    const disabled = await genBtns[i].getAttribute('disabled');
    console.log(`   [${i}]: "${text}" ${disabled !== null ? '(DISABLED)' : '(enabled)'}`);
  }

  // Generate synthesis
  console.log('8. GENERATING SYNTHESIS...');
  if (genBtns.length > 0) {
    // Find first enabled Generate
    for (const btn of genBtns) {
      const disabled = await btn.getAttribute('disabled');
      if (disabled === null) {
        await btn.click();
        console.log('   Clicked Generate');
        break;
      }
    }
    
    // Wait for generation
    console.log('   Waiting for generation...');
    for (let i = 0; i < 60; i++) {
      await waitForTimeout(2000);
      
      // Check for PPTX button
      const pptxBtn = page.locator('button:has-text("PPTX")').first();
      if (await pptxBtn.isVisible().catch(() => false)) {
        console.log('   Generation complete - PPTX button visible');
        break;
      }
      
      // Check for Regenerar
      const regen = page.locator('button:has-text("Regenerar")').first();
      if (await regen.isVisible().catch(() => false)) {
        console.log('   Generation complete - Regenerar visible');
        break;
      }
      
      if (i % 10 === 0) console.log(`   Still waiting... ${i*2}s`);
    }
  }
  
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_download_buttons.png') });

  // Download PPTX
  console.log('9. DOWNLOADING PPTX...');
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
      
      // Verify file
      const stats = fs.statSync(result.path);
      console.log(`   SIZE: ${stats.size} bytes ${stats.size > 1024 ? '(OK)' : '(TOO SMALL)'}`);
      
      if (stats.size > 1024) {
        // Extract PPTX
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
            console.log(`   "María": ${content.includes('María') ? 'FOUND' : 'NOT FOUND'}`);
            console.log(`   "González": ${content.includes('González') ? 'FOUND' : 'NOT FOUND'}`);
            console.log(`   "Prof.": ${content.includes('Prof.') ? 'FOUND' : 'NOT FOUND'}`);
            console.log(`   "San Andrés": ${content.includes('San Andrés') ? 'FOUND' : 'NOT FOUND'}`);
            console.log(`   "nombreDocente": ${content.includes('nombreDocente') ? 'FOUND' : 'NOT FOUND'}`);
            console.log(`   "Guede": ${content.includes('Guede') ? 'FOUND' : 'NOT FOUND'}`);
            
            if (!content.includes('María') && !content.includes('González') && !content.includes('San Andrés')) {
              console.log('\n   !!! BUG-005 CONFIRMED: Teacher name NOT in PPTX !!!');
              console.log('   CAUSE: localStorage has "nombreDocente" but TeacherInfo expects "nombre"');
            }
          }
          
          fs.rmSync(tempDir, { recursive: true });
        } catch (e) {
          console.log(`   Verify error: ${e.message}`);
        }
      }
    } else {
      console.log(`   DOWNLOAD FAILED: ${result.error}`);
    }
  } else {
    console.log('   PPTX button not visible');
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_download_complete.png') });
  
  console.log('\n=== DONE ===');
  await browser.close();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
