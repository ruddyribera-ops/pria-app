const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    
    const consoleErrors = [];
    page.on('console', m => {
        if (m.type() === 'error') consoleErrors.push(m.text());
    });
    
    async function ss(name) {
        try {
            await page.screenshot({ path: 'D:/Temp/opencode/verify_v7/screenshots/' + name + '.png', fullPage: true });
            console.log('[SCREENSHOT] ' + name);
        } catch(e) {
            console.log('[SS ERR] ' + name + ': ' + e.message);
        }
    }
    
    try {
        // Step 1: Open
        console.log('[1] Opening http://localhost:5173');
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);
        await ss('01_login');
        
        // Step 2: Login
        console.log('[2] Logging in...');
        await page.fill('input[type=text],input[name=usuario]', 'admin');
        await page.fill('input[type=password]', 'admin123');
        await page.click('button[type=submit]');
        await page.waitForTimeout(3000);
        await ss('02_logged_in');
        
        // Step 3: Set teacher config
        console.log('[3] Setting teacher config...');
        await page.evaluate(() => {
            localStorage.setItem('pria_teacher_config', JSON.stringify({
                nombreDocente: 'Prof. María González',
                colegio: 'Unidad Educativa San Andrés',
                ciudad: 'La Paz',
                grado: '5to de Primaria',
                materia: 'Lenguaje y Comunicación',
                anoEscolar: '2026'
            }));
        });
        await ss('03_teacher_config_set');
        
        // Step 4: Navigate to wizard
        console.log('[4] Navigating to /wizard');
        await page.goto('http://localhost:5173/wizard', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);
        await ss('04_wizard_loaded');
        
        // Step 5: On upload step - wait for materials and click on existing material
        console.log('[5] Looking for existing materials...');
        
        // Wait for material buttons to appear
        try {
            await page.waitForSelector('button:has-text("Texto de lenguaje")', { timeout: 10000 });
            console.log('[5a] Found material button - clicking...');
            await page.click('button:has-text("Texto de lenguaje")');
            await page.waitForTimeout(3000);
        } catch(e) {
            console.log('[5b] Could not find material button: ' + e.message);
            // Try clicking first available material
            const matBtn = page.locator('button').filter({ hasText: /📗/ }).first();
            if (await matBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await matBtn.click();
                await page.waitForTimeout(3000);
            }
        }
        
        await ss('05_material_selected');
        
        // Step 6: Click Continuar to go to select step
        console.log('[6] Going to select step...');
        const continuarBtn = page.locator('button').filter({ hasText: /Continuar →/ }).first();
        if (await continuarBtn.isEnabled({ timeout: 5000 }).catch(() => false)) {
            await continuarBtn.click();
            console.log('[6a] Clicked Continuar');
            await page.waitForTimeout(2000);
        } else {
            console.log('[6b] Continuar not enabled - checking why...');
            const disabled = await page.locator('button:has-text("Continuar")').first().getAttribute('disabled');
            console.log('Disabled attribute: ' + disabled);
        }
        
        await ss('06_select_step');
        
        // Step 7: Select a topic - need to expand unit and click topic
        console.log('[7] Selecting a topic...');
        
        // Look for unit "Mitos y leyendas" - it should be in the unit list
        // First expand the unit by clicking on it
        const unitDiv = page.locator('div').filter({ hasText: /Mitos y leyendas/ }).first();
        if (await unitDiv.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('[7a] Found Mitos unit - expanding...');
            await unitDiv.click();
            await page.waitForTimeout(1000);
        }
        
        await ss('07_unit_expanded');
        
        // Now look for topic "Guede pinta los animales"
        // Topics appear after expanding a unit
        const topicBtn = page.locator('div').filter({ hasText: /Guede pinta los animales/ }).first();
        if (await topicBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('[7b] Found Guede topic - clicking...');
            await topicBtn.click();
            await page.waitForTimeout(1000);
        } else {
            console.log('[7c] Guede topic not visible - trying alternative selectors...');
            // Maybe it's already expanded - look for it in the topics list
            const allText = await page.textContent('body');
            if (allText.includes('Guede')) {
                console.log('[7d] Guede found in page text but element not clickable');
            } else {
                console.log('[7e] Guede NOT found in page');
            }
        }
        
        await ss('08_topic_selected');
        
        // Step 8: Check topic count and click Continuar con N temas
        console.log('[8] Going to generate step...');
        const topicCount = await page.locator('button').filter({ hasText: /Continuar con/ }).first().textContent().catch(() => 'not found');
        console.log('[8a] Topic count button text: ' + topicCount);
        
        const genContBtn = page.locator('button').filter({ hasText: /Continuar con \d+ tema/ }).first();
        if (await genContBtn.isEnabled({ timeout: 5000 }).catch(() => false)) {
            await genContBtn.click();
            console.log('[8b] Clicked continuar with topics');
            await page.waitForTimeout(2000);
        } else {
            console.log('[8c] Could not click continuar with topics');
        }
        
        await ss('09_generate_step');
        
        // Step 9: Now on generate step - generate each motor
        console.log('[9] Generating motors...');
        
        const motorNames = ['Síntesis Curricular', 'Diapositivas', 'Plan de clase', 'Quiz'];
        const motorIds = ['synthesis', 'slides', 'plan', 'quiz'];
        
        for (let i = 0; i < motorNames.length; i++) {
            const mName = motorNames[i];
            const mId = motorIds[i];
            console.log('  === Motor: ' + mName + ' (' + mId + ') ===');
            
            // Find the "Generar" button in the motor card
            // Look for the specific motor label and then find the button near it
            const motorSection = page.locator('div').filter({ hasText: new RegExp(mName) }).last();
            
            // Look for "Generar" button in this section
            const genBtn = motorSection.locator('button').filter({ hasText: /^Generar$/ }).first();
            
            if (await genBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                console.log('  Clicking GENERAR for ' + mName + '...');
                await genBtn.click();
                
                // Wait for generation to complete (button changes to "Regenerar" or shows download buttons)
                let done = false;
                for (let j = 0; j < 120; j++) { // 4 min timeout
                    await page.waitForTimeout(2000);
                    
                    // Check if download buttons appeared in this motor section
                    const dlBtn = motorSection.locator('button').filter({ hasText: /PPTX/ }).first();
                    if (await dlBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                        done = true;
                        console.log('  ' + mName + ' COMPLETE - download buttons visible!');
                        break;
                    }
                    
                    if (j % 15 === 0) console.log('  Waiting for ' + mName + '...(' + (j*2) + 's)');
                }
                
                if (!done) {
                    console.log('  TIMEOUT waiting for ' + mName);
                    // Check button state
                    const btnTxt = await genBtn.textContent().catch(() => '');
                    console.log('  Button text: ' + btnTxt);
                }
            } else {
                // Maybe already generated - check for download buttons
                const dlBtn = motorSection.locator('button').filter({ hasText: /PPTX/ }).first();
                if (await dlBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                    console.log('  ' + mName + ' already generated - download buttons visible');
                    done = true;
                } else {
                    console.log('  Generate button NOT visible for ' + mName);
                    // Debug: print what IS visible
                    const visibleBtns = await page.locator('button').all();
                    console.log('  Total buttons on page: ' + visibleBtns.length);
                    for (const b of visibleBtns.slice(0, 5)) {
                        const txt = await b.textContent().catch(() => '');
                        console.log('    Button: ' + txt.substring(0, 50));
                    }
                }
            }
            
            await page.waitForTimeout(1000);
            await ss('10_' + mId + '_generated');
            
            // Download all 3 formats
            console.log('  Downloading files for ' + mName + '...');
            
            for (const fmt of ['PPTX', 'PDF', 'DOCX']) {
                try {
                    const dlBtn = motorSection.locator('button').filter({ hasText: fmt }).first();
                    if (await dlBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                        console.log('    Downloading ' + fmt + '...');
                        const [download] = await Promise.all([
                            page.waitForEvent('download', { timeout: 30000 }).catch(() => null),
                            dlBtn.click()
                        ]);
                        if (download) {
                            const ext = fmt === 'PPTX' ? 'pptx' : fmt === 'PDF' ? 'pdf' : 'docx';
                            const destPath = 'D:/Temp/opencode/verify_v7/' + mId + '_' + fmt.toLowerCase() + '.' + ext;
                            await download.saveAs(destPath);
                            console.log('    Saved: ' + mId + '_' + fmt.toLowerCase());
                        }
                    } else {
                        console.log('    Button not visible: ' + fmt);
                    }
                } catch(e) {
                    console.log('    Download error ' + fmt + ': ' + e.message);
                }
                await page.waitForTimeout(500);
            }
        }
        
        await ss('11_all_complete');
        
        // Report
        console.log('\n[CONSOLE ERRORS] ' + consoleErrors.length);
        consoleErrors.forEach(e => console.log('  ERR: ' + e));
        
        console.log('\n[DONE] Verification complete!');
        
    } catch(e) {
        console.log('[FATAL ERROR] ' + e.message);
        console.log(e.stack);
    } finally {
        await browser.close();
    }
})();
