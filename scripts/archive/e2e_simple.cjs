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
  console.log('=== PRIA v10 E2E Test - Simplified ===\n');

  const loginData = await loginApi();
  console.log('1. LOGIN: ✓');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('   [Console Error]:', msg.text());
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
  console.log('2. TEACHER CONFIG SET (BUG-005 - field mismatch exists)');
  console.log('   localStorage fields: nombreDocente, colegio, ciudad, grado, materia, anoEscolar');
  console.log('   TeacherInfo fields:  nombre, email, escuela');
  console.log('   → MISMATCH: nombreDocente != nombre, etc.');

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

  // Find all visible labels containing topic checkboxes
  console.log('5. LOOKING FOR "Guede pinta los animales" TOPIC...');
  
  // Strategy: Get all checkbox inputs and their parent labels, find the one with "Guede"
  const checkboxes = await page.locator('input[type="checkbox"]').all();
  console.log(`   Found ${checkboxes.length} checkboxes total`);
  
  let guedeFound = false;
  let guedeCheckbox = null;
  
  for (let i = 0; i < checkboxes.length; i++) {
    const cb = checkboxes[i];
    // Get the label text near this checkbox
    const label = await cb.locator('..').locator('span').first();
    const labelText = await label.textContent().catch(() => '');
    
    if (labelText.includes('Guede')) {
      console.log(`   ✓ Found "Guede" in checkbox ${i}: "${labelText}"`);
      guedeFound = true;
      guedeCheckbox = cb;
      break;
    }
  }
  
  if (!guedeFound) {
    // Try finding by title/aria-label
    for (let i = 0; i < checkboxes.length; i++) {
      const cb = checkboxes[i];
      const title = await cb.getAttribute('title').catch(() => '');
      const id = await cb.getAttribute('id').catch(() => '');
      console.log(`   Checkbox ${i}: title="${title}" id="${id}"`);
      
      if (title.includes('Guede') || id.includes('Guede')) {
        guedeFound = true;
        guedeCheckbox = cb;
        break;
      }
    }
  }
  
  // If still not found, list all checkbox parent texts
  if (!guedeFound) {
    console.log('   Listing all checkbox parent texts:');
    for (let i = 0; i < Math.min(12, checkboxes.length); i++) {
      const cb = checkboxes[i];
      const parent = await cb.locator('..');
      const spans = await parent.locator('span').allTextContents();
      console.log(`     [${i}]: ${spans.join(' | ')}`);
    }
  }
  
  // Click the checkbox
  if (guedeCheckbox) {
    await guedeCheckbox.click();
    console.log('   ✓ Clicked "Guede" checkbox');
    await page.waitForTimeout(500);
  } else {
    // Fallback: click first visible checkbox
    console.log('   ! Falling back to first checkbox');
    await checkboxes[0].click();
  }
  
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_topic_selected.png') });

  // Check if "Generar temas" is now enabled
  const generarBtn = await page.locator('button:has-text("Generar")').filter({ hasText: /tema/ }).first();
  const isDisabled = await generarBtn.getAttribute('disabled');
  console.log(`\n6. GENERAR BUTTON: disabled=${isDisabled !== null}`);
  
  if (isDisabled === null) {
    // Button is enabled
    await generarBtn.click();
    console.log('   ✓ Clicked "Generar X temas"');
    await page.waitForTimeout(2000);
  } else {
    // Try "Continuar" instead
    const continuarBtn = await page.locator('button:has-text("Continuar")').first();
    if (!(await continuarBtn.isDisabled())) {
      await continuarBtn.click();
      console.log('   ✓ Clicked "Continuar"');
      await page.waitForTimeout(2000);
    }
  }
  
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_synthesis_generated.png') });

  // Now on generate step - wait for motors to load
  console.log('\n7. WAITING FOR MOTOR SECTIONS...');
  await page.waitForTimeout(3000);
  
  // Check if we have the motor buttons
  const pageText = await page.textContent('body');
  const hasSynthesis = pageText.includes('Síntesis') || pageText.includes('synthesis');
  const hasSlides = pageText.includes('Diapositivas') || pageText.includes('slides');
  const hasPlan = pageText.includes('Plan') || pageText.includes('plan');
  const hasQuiz = pageText.includes('Quiz') || pageText.includes('quiz');
  
  console.log(`   Síntesis: ${hasSynthesis ? '✓' : '✗'}`);
  console.log(`   Diapo/slides: ${hasSlides ? '✓' : '✗'}`);
  console.log(`   Plan: ${hasPlan ? '✓' : '✗'}`);
  console.log(`   Quiz: ${hasQuiz ? '✓' : '✗'}`);

  // Look for Generate buttons
  const generateButtons = await page.locator('button:has-text("Generar")').all();
  console.log(`   Found ${generateButtons.length} "Generar" buttons`);
  
  for (let i = 0; i < generateButtons.length; i++) {
    const btn = generateButtons[i];
    const text = await btn.textContent();
    const disabled = await btn.getAttribute('disabled');
    console.log(`   [${i}]: "${text}" ${disabled !== null ? '(disabled)' : '(enabled)'}`);
  }

  // Try to generate synthesis (first motor)
  console.log('\n8. GENERATING SYNTHESIS...');
  if (generateButtons.length > 0) {
    // Find the first enabled Generate button
    for (const btn of generateButtons) {
      const disabled = await btn.getAttribute('disabled');
      if (disabled === null) {
        console.log('   Clicking first enabled Generar...');
        await btn.click();
        
        // Wait for generation
        console.log('   Waiting for synthesis generation (up to 120s)...');
        let generated = false;
        for (let i = 0; i < 60; i++) {
          await waitForTimeout(2000);
          
          // Check for PPTX download button
          const pptxBtns = await page.locator('button:has-text("PPTX")').all();
          if (pptxBtns.length > 0) {
            const firstPptxBtn = pptxBtns[0];
            const btnHtml = await firstPptxBtn.innerHTML().catch(() => '');
            if (btnHtml.includes('PPTX')) {
              generated = true;
              console.log(`   ✓ Synthesis generated (found ${pptxBtns.length} PPTX buttons)`);
              break;
            }
          }
          
          // Check for Regenerar
          const regenBtns = await page.locator('button:has-text("Regenerar")').all();
          if (regenBtns.length > 0) {
            generated = true;
            console.log(`   ✓ Synthesis generated (found ${regenBtns.length} Regenerar buttons)`);
            break;
          }
          
          console.log(`   Waiting... ${(i+1)*2}s`);
        }
        
        if (!generated) {
          console.log('   ! Generation timed out');
        }
        break;
      }
    }
  }
  
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_download_buttons.png') });

  // Download synthesis PPTX
  console.log('\n9. DOWNLOADING PPTX...');
  const pptxBtns = await page.locator('button:has-text("PPTX")').all();
  console.log(`   Found ${pptxBtns.length} PPTX buttons`);
  
  if (pptxBtns.length > 0) {
    // Find the PPTX button in synthesis section (first one)
    const downloadPromise = page.waitForEvent('download', { timeout: 60000 })
      .then(async (download) => {
        const filename = path.join(OUT_DIR, 'sintesis_teacher.pptx');
        await download.saveAs(filename);
        console.log(`   ✓ Saved: ${filename}`);
        return { success: true, path: filename };
      })
      .catch((e) => {
        console.log(`   ! Download failed: ${e.message}`);
        return { success: false };
      });
    
    await pptxBtns[0].click();
    const result = await downloadPromise;
    
    if (result.success) {
      // Verify file
      console.log('\n10. FILE VERIFICATION:');
      const stats = fs.statSync(result.path);
      console.log(`    Size: ${stats.size} bytes ${stats.size > 1024 ? '(> 1KB ✓)' : '(< 1KB ✗)'}`);
      
      if (stats.size > 1024) {
        // Extract and check
        const tempDir = path.join(OUT_DIR, 'temp_verify');
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
        fs.mkdirSync(tempDir);
        
        try {
          const { execSync } = require('child_process');
          execSync(`powershell -Command "Expand-Archive -Path '${result.path}' -DestinationPath '${tempDir}' -Force"`);
          
          // Check slide 1
          const slidePath = path.join(tempDir, 'ppt', 'slides', 'slide1.xml');
          if (fs.existsSync(slidePath)) {
            const content = fs.readFileSync(slidePath, 'utf-8');
            
            console.log('\n    BUG-005 CHECK (teacher name in cover slide):');
            console.log(`    - Contains "María": ${content.includes('María') ? '✓' : '✗'}`);
            console.log(`    - Contains "González": ${content.includes('González') ? '✓' : '✗'}`);
            console.log(`    - Contains "Prof.": ${content.includes('Prof.') ? '✓' : '✗'}`);
            console.log(`    - Contains "San Andrés": ${content.includes('San Andrés') ? '✓' : '✗'}`);
            console.log(`    - Contains "nombreDocente": ${content.includes('nombreDocente') ? '✓' : '✗'}`);
            console.log(`    - Contains "Guede": ${content.includes('Guede') ? '✓' : '✗'}`);
            
            if (!content.includes('María') && !content.includes('González') && !content.includes('San Andrés')) {
              console.log('\n    !!! BUG-005 CONFIRMED: Teacher personalization NOT in PPTX !!!');
            }
          }
          
          fs.rmSync(tempDir, { recursive: true });
        } catch (e) {
          console.log(`    ! Verification error: ${e.message}`);
        }
      }
    }
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_download_complete.png') });
  console.log('\n=== COMPLETE ===');
  console.log('Screenshots:', SCREENSHOTS_DIR);
  
  await browser.close();
}

main().catch(console.error);
