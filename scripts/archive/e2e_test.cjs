const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000/api';
const OUT_DIR = 'D:\\Temp\\opencode\\verify_v7';
const SCREENSHOTS_DIR = path.join(OUT_DIR, 'screenshots');

// Ensure directories exist
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

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
  console.log('=== PRIA v10 Full Wizard E2E Test ===\n');

  // Step 1: Login via API
  console.log('1. LOGIN');
  let loginData;
  try {
    loginData = await loginApi();
    console.log(`   ✓ Logged in as: ${loginData.user?.usuario || loginData.user?.name || 'admin'}`);
  } catch (e) {
    console.error('   ✗ Login failed:', e.message);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false }); // headed for screenshots
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  // Capture console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('   [Console Error]:', msg.text());
    }
  });

  try {
    // Step 2: Navigate to login page and set localStorage
    console.log('\n2. SETUP BROWSER');
    await page.goto(BASE_URL + '/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_login.png') });
    console.log('   ✓ Login page loaded');

    // Set localStorage with token and user
    await page.evaluate(([token, user]) => {
      localStorage.setItem('pria_token', token);
      localStorage.setItem('pria_user', JSON.stringify(user));
    }, [loginData.token, loginData.user]);

    // Step 3: Set teacher config for BUG-005
    console.log('\n3. SET TEACHER CONFIG (BUG-005)');
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
    console.log('   ✓ Teacher config set in localStorage');
    console.log('   NOTE: Fields are nombreDocente, colegio, ciudad, grado, materia, anoEscolar');
    console.log('   BUT TeacherInfo interface expects: nombre, email, escuela');
    console.log('   → FIELD NAME MISMATCH = BUG-005');

    // Step 4: Navigate to wizard
    console.log('\n4. NAVIGATE TO WIZARD');
    await page.goto(BASE_URL + '/wizard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_wizard_initial.png') });
    console.log('   ✓ Wizard page loaded');

    // Step 5: Check if material exists and select it
    console.log('\n5. SELECT MATERIAL');
    const materialBtn = await page.locator('text=Texto de lenguaje').first();
    if (await materialBtn.isVisible()) {
      console.log('   ✓ Found "Texto de lenguaje.pdf"');
      await materialBtn.click();
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_unit_selected.png') });

    // Step 6: Wait for units to load and find "Mitos y leyendas"
    console.log('\n6. SELECT UNIT AND TOPIC');
    
    // Wait for the unit list to appear
    await page.waitForSelector('text=Mitos y leyendas', { timeout: 10000 }).catch(() => null);
    
    const mitosUnit = await page.locator('text=Mitos y leyendas').first();
    if (await mitosUnit.isVisible()) {
      console.log('   ✓ Found "Mitos y leyendas" unit');
      
      // Click on the unit header to expand it (if not already expanded)
      // The unit header should be clickable to expand/collapse
      const unitHeader = mitosUnit.locator('..');
      await unitHeader.click().catch(async () => {
        // If that doesn't work, try finding the chevron/icon
        console.log('   Trying alternative click for unit expansion...');
        const chevron = await mitosUnit.locator('..').locator('[style*="cursor"]').first();
        await chevron.click().catch(() => null);
      });
      await page.waitForTimeout(1000);
    }

    // Now find and select "Guede pinta los animales" topic
    // The topic might be inside a collapsed section, so we need to check
    const guedeTopic = await page.locator('text=Guede pinta los animales').first();
    
    if (await guedeTopic.isVisible()) {
      console.log('   ✓ Found "Guede pinta los animales" topic');
      
      // Find the checkbox for this topic
      const checkbox = guedeTopic.locator('input[type="checkbox"]');
      if (await checkbox.isVisible()) {
        await checkbox.click();
        console.log('   ✓ Selected the topic checkbox');
      } else {
        // Try clicking the topic row itself
        await guedeTopic.click();
        console.log('   ✓ Clicked on topic');
      }
      await page.waitForTimeout(500);
    } else {
      console.log('   ! Topic "Guede pinta los animales" not visible - may be collapsed');
      
      // Let's try to expand all units first
      const expandButtons = await page.locator('button[aria-expanded="false"]').all();
      console.log(`   Found ${expandButtons.length} collapsed sections, expanding...`);
      for (const btn of expandButtons) {
        try {
          await btn.click();
          await waitForTimeout(300);
        } catch {}
      }
      
      // Try again to find the topic
      if (await guedeTopic.isVisible()) {
        console.log('   ✓ Topic now visible after expanding');
        const checkbox = guedeTopic.locator('input[type="checkbox"]');
        await checkbox.click();
        console.log('   ✓ Selected the topic checkbox');
      } else {
        // Last resort: look for any available topic
        console.log('   ! Topic still not found, checking available content...');
        const pageText = await page.textContent('body');
        console.log('   Page content (first 1000 chars):', pageText.slice(0, 1000));
      }
    }
    
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_topic_selected.png') });

    // Step 7: Look for "Generar" button and proceed
    console.log('\n7. PROCEED TO GENERATE');
    
    // The footer has a "Generar X temas" button
    const generarBtn = await page.locator('button:has-text("Generar")').filter({ hasText: /tema/ }).first();
    
    if (await generarBtn.isVisible() && await generarBtn.isEnabled()) {
      console.log('   ✓ Found enabled "Generar X temas" button');
      await generarBtn.click();
      console.log('   ✓ Clicked Generate - proceeding to generation step');
      await page.waitForTimeout(2000);
    } else {
      // Check if there's a disabled button
      const disabledBtn = await page.locator('button:has-text("Generar")').filter({ hasText: /tema/ }).first();
      const isDisabled = await disabledBtn.getAttribute('disabled');
      console.log(`   Button state: disabled=${isDisabled !== null}`);
      
      // Try to click "Continuar" if available
      const continuarBtn = await page.locator('button:has-text("Continuar")').first();
      if (await continuarBtn.isVisible() && !(await continuarBtn.isDisabled())) {
        console.log('   ✓ Clicking Continuar button');
        await continuarBtn.click();
        await page.waitForTimeout(2000);
      }
    }
    
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_synthesis_generated.png') });

    // Step 8: Generate each motor one at a time
    const motors = ['synthesis', 'slides', 'plan', 'quiz'];
    
    for (const motor of motors) {
      console.log(`\n8. GENERATING ${motor.toUpperCase()}`);
      
      // Find the motor section and its Generate button
      // The structure is: motor name text → parent container → Generate button
      try {
        // Look for the Generate button associated with this motor
        const motorPattern = new RegExp(motor, 'i');
        const motorSection = await page.locator('text').filter({ hasText: motorPattern }).first();
        
        if (await motorSection.isVisible()) {
          // Find the Generate button in the same section
          const container = await motorSection.locator('..');
          const genBtn = await container.locator('button:has-text("Generar")').first();
          
          if (await genBtn.isVisible()) {
            console.log(`   Clicking Generar for ${motor}...`);
            await genBtn.click();
            
            // Wait for generation to complete (look for Regenerar button or download button)
            console.log(`   Waiting for ${motor} generation...`);
            let generated = false;
            for (let i = 0; i < 60; i++) { // 60 * 2s = 120s timeout
              await waitForTimeout(2000);
              
              // Check if Regenerar button appeared (means generation complete)
              const regenPattern = new RegExp(`Regenerar.*${motor}`, 'i');
              const regenBtn = await page.locator('button').filter({ hasText: regenPattern }).first();
              if (await regenBtn.isVisible().catch(() => false)) {
                generated = true;
                console.log(`   ✓ ${motor} generation complete`);
                break;
              }
              
              // Also check for download buttons
              const pptxBtn = await page.locator('button:has-text("PPTX")').first();
              if (await pptxBtn.isVisible().catch(() => false)) {
                generated = true;
                console.log(`   ✓ ${motor} appears to be ready`);
                break;
              }
              
              // Check if still generating
              const generating = await page.locator('text=Generando').first().isVisible().catch(() => false);
              if (!generating) {
                // Check if there's content
                const hasContent = await page.locator(`text=${motor}`).first().isVisible().catch(() => false);
                if (hasContent) {
                  console.log(`   ${motor} status check (${i*2}s)...`);
                }
              }
            }
            
            if (!generated) {
              console.log(`   ! ${motor} generation timed out`);
            }
          } else {
            console.log(`   ! Generate button not found for ${motor}`);
          }
        } else {
          console.log(`   ! Motor section not found: ${motor}`);
        }
      } catch (e) {
        console.log(`   ! Error generating ${motor}: ${e.message}`);
      }
      
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_download_buttons.png') });
    console.log('\n   ✓ All motors processed');

    // Step 9: Download PPTX for synthesis (BUG-005 verification)
    console.log('\n9. DOWNLOADING PPTX FOR BUG-005 VERIFICATION');
    
    // Find synthesis section and its PPTX download button
    const synthesisSection = await page.locator('text=synthesis').first();
    if (await synthesisSection.isVisible()) {
      const container = await synthesisSection.locator('..');
      const pptxBtn = await container.locator('button:has-text("PPTX")').first();
      
      if (await pptxBtn.isVisible()) {
        console.log('   Downloading synthesis PPTX...');
        
        const downloadPromise = page.waitForEvent('download', { timeout: 60000 })
          .then(async (download) => {
            const filename = path.join(OUT_DIR, 'sintesis_teacher.pptx');
            await download.saveAs(filename);
            console.log(`   ✓ Saved: ${filename}`);
            return { success: true, path: filename };
          })
          .catch((e) => {
            console.log(`   ! Download failed: ${e.message}`);
            return { success: false, error: e.message };
          });
        
        await pptxBtn.click();
        const downloadResult = await downloadPromise;
        
        if (downloadResult.success) {
          // Step 10: Verify file
          console.log('\n10. FILE VERIFICATION');
          
          const filePath = downloadResult.path;
          if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            console.log(`   File size: ${stats.size} bytes`);
            
            if (stats.size > 1024) {
              console.log('   ✓ File is non-empty (> 1KB)');
              
              // Extract and check content for teacher name (BUG-005)
              try {
                const { execSync } = require('child_process');
                
                // Extract PPTX to temp folder
                const tempDir = path.join(OUT_DIR, 'temp_pptx');
                if (fs.existsSync(tempDir)) {
                  fs.rmSync(tempDir, { recursive: true });
                }
                fs.mkdirSync(tempDir);
                
                execSync(`powershell -Command "Expand-Archive -Path '${filePath}' -DestinationPath '${tempDir}' -Force"`);
                
                // Check slide 1 for teacher name
                const slide1Path = path.join(tempDir, 'ppt', 'slides', 'slide1.xml');
                if (fs.existsSync(slide1Path)) {
                  const slide1Content = fs.readFileSync(slide1Path, 'utf-8');
                  
                  // Check for teacher name fields
                  const hasMaria = slide1Content.includes('María');
                  const hasGonzalez = slide1Content.includes('González');
                  const hasProf = slide1Content.includes('Prof.');
                  const hasNombreDocente = slide1Content.includes('nombreDocente');
                  const hasSanAndres = slide1Content.includes('San Andrés');
                  
                  console.log('\n   BUG-005 VERIFICATION:');
                  console.log(`   - Contains "María": ${hasMaria ? 'YES ✓' : 'NO ✗'}`);
                  console.log(`   - Contains "González": ${hasGonzalez ? 'YES ✓' : 'NO ✗'}`);
                  console.log(`   - Contains "Prof.": ${hasProf ? 'YES ✓' : 'NO ✗'}`);
                  console.log(`   - Contains "nombreDocente": ${hasNombreDocente ? 'YES ✓' : 'NO ✗'}`);
                  console.log(`   - Contains "San Andrés": ${hasSanAndres ? 'YES ✓' : 'NO ✗'}`);
                  
                  if (!hasMaria && !hasGonzalez && !hasProf && !hasSanAndres) {
                    console.log('\n   !!! BUG-005 CONFIRMED: Teacher name NOT in PPTX !!!');
                    console.log('   The TeacherInfo fields (nombre, email, escuela) do not match');
                    console.log('   the localStorage fields (nombreDocente, colegio, ciudad, etc.)');
                  }
                  
                  // Also check for "Guede" (topic name should always be present)
                  const hasGuede = slide1Content.includes('Guede');
                  console.log(`\n   - Contains topic "Guede": ${hasGuede ? 'YES ✓' : 'NO ✗'}`);
                  
                  // Cleanup
                  fs.rmSync(tempDir, { recursive: true });
                } else {
                  console.log('   ! slide1.xml not found in PPTX');
                }
              } catch (e) {
                console.log(`   ! Could not verify PPTX content: ${e.message}`);
              }
            } else {
              console.log('   ! File too small (< 1KB)');
            }
          } else {
            console.log('   ! File not found');
          }
        }
      }
    }

    // Final screenshot
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_download_complete.png') });
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('Screenshots saved to:', SCREENSHOTS_DIR);
    
  } catch (error) {
    console.error('\n!!! TEST ERROR !!!');
    console.error(error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
