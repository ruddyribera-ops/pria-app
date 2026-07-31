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
    
    async function waitAndClick(text, timeout = 5000) {
        try {
            await page.waitForSelector('button:has-text("' + text + '")', { timeout });
            await page.click('button:has-text("' + text + '")');
            return true;
        } catch(e) {
            return false;
        }
    }
    
    async function clickFirstMatch(text) {
        const btn = page.locator('button').filter({ hasText: new RegExp(text, 'i') }).first();
        if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await btn.click();
            return true;
        }
        return false;
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
        
        // Check what step we're on by looking at the content
        const pageContent = await page.textContent('body');
        
        if (pageContent.includes('Sube tu libro') || pageContent.includes('ya subido')) {
            console.log('[4a] On upload step - waiting for materials to load...');
            
            // Wait for the "ya subido" section or material buttons to appear
            try {
                await page.waitForSelector('button:has-text("Texto de lenguaje"), button:has-text("ya subido")', { timeout: 10000 });
                console.log('[4b] Materials loaded - clicking on first material...');
                
                // Find and click the first material button (contains filename or emoji)
                const materialBtns = page.locator('button').filter({ hasText: /📗|Texto de lenguaje/ });
                if (await materialBtns.first().isVisible({ timeout: 3000 }).catch(() => false)) {
                    await materialBtns.first().click();
                    console.log('[4c] Clicked on existing material');
                    await page.waitForTimeout(3000);
                }
            } catch(e) {
                console.log('[4d] Material list did not load: ' + e.message);
            }
            
            // Now try the continuar button
            const continuarBtn = page.locator('button').filter({ hasText: /Continuar/ }).first();
            if (await continuarBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
                console.log('[4e] Clicking Continuar to go to select step...');
                await continuarBtn.click();
                await page.waitForTimeout(2000);
            } else {
                console.log('[4f] Continuar still disabled - checking state...');
                const body = await page.textContent('body');
                console.log('Page content: ' + body.substring(0, 800));
            }
        }
        
        await ss('05_select_step');
        
        // Now on select step - need to select unit and topic
        console.log('[5] On select step - selecting unit...');
        
        // Wait for selects to be available
        await page.waitForSelector('select', { timeout: 5000 });
        const selects = await page.locator('select').all();
        console.log('  Found ' + selects.length + ' selects');
        
        if (selects.length >= 1) {
            // Select first unit (Mitos y leyendas)
            const unitOptions = await selects[0].locator('option').all();
            for (const opt of unitOptions) {
                const text = await opt.textContent();
                if (text && text.includes('Mitos')) {
                    console.log('  Selecting unit: ' + text.trim());
                    await opt.click();
                    await page.waitForTimeout(1500);
                    break;
                }
            }
        }
        await ss('06_unit_selected');
        
        // Select topic
        console.log('[6] Selecting topic...');
        const selects2 = await page.locator('select').all();
        if (selects2.length >= 2) {
            const topicOptions = await selects2[1].locator('option').all();
            for (const opt of topicOptions) {
                const text = await opt.textContent();
                if (text && text.includes('Guede')) {
                    console.log('  Selecting topic: ' + text.trim());
                    await opt.click();
                    await page.waitForTimeout(1500);
                    break;
                }
            }
        }
        await ss('07_topic_selected');
        
        // Click "Continuar con N temas →" to go to generate step
        console.log('[7] Going to generate step...');
        const continuarGenBtn = page.locator('button').filter({ hasText: /Continuar con/ }).first();
        if (await continuarGenBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await continuarGenBtn.click();
            console.log('[7a] Clicked continuar with topics');
            await page.waitForTimeout(2000);
        }
        await ss('08_generate_step');
        
        // Now on generate step - generate each motor
        console.log('[8] Generating motors...');
        const motors = ['sintesis', 'slides', 'plan', 'quiz'];
        
        for (const m of motors) {
            console.log('  === Motor: ' + m + ' ===');
            
            // Find the motor card and click "Generar" inside it
            // Each motor card has a "Generar" / "Regenerar" / "Generando..." button
            const motorCard = page.locator('div').filter({ hasText: new RegExp(m.charAt(0).toUpperCase() + m.slice(1)) }).last();
            
            // Look for the generate button specifically
            const genBtn = page.locator('button').filter({ hasText: /^(Generar|Regenerar)$/ }).first();
            
            if (await genBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                console.log('  Clicking GENERAR for ' + m + '...');
                await genBtn.click();
                
                // Wait for generation to complete (check for "✓" or "Descargar")
                let done = false;
                for (let i = 0; i < 120; i++) { // 4 min timeout
                    await page.waitForTimeout(2000);
                    
                    // Check if button text changed to something indicating completion
                    const allButtons = await page.locator('button').all();
                    for (const b of allButtons) {
                        const txt = await b.textContent().catch(() => '');
                        if (txt && (txt.includes('Descargar') || txt.includes('✓') || txt.includes('Regenerar'))) {
                            // Also check this button is in the right section (not a different motor)
                            const parentText = await b.locator('xpath=..').textContent().catch(() => '');
                            if (parentText && parentText.toLowerCase().includes(m.toLowerCase())) {
                                done = true;
                                console.log('  ' + m + ' COMPLETE!');
                                break;
                            }
                        }
                    }
                    if (done) break;
                    if (i % 15 === 0) console.log('  Waiting for ' + m + '...(' + (i*2) + 's)');
                }
                
                if (!done) {
                    console.log('  TIMEOUT waiting for ' + m);
                }
            } else {
                console.log('  Generate button NOT visible for ' + m + ' - checking page content...');
                const body = await page.textContent('body');
                console.log('  Body snippet: ' + body.substring(0, 500));
            }
            
            await page.waitForTimeout(1000);
            await ss('09_' + m + '_generated');
            
            // Download all 3 formats
            console.log('  Downloading files for ' + m + '...');
            
            // Look for download buttons in the motor card
            const downloadSection = page.locator('div[style*="motorCard"], div').filter({ hasText: new RegExp(m.charAt(0).toUpperCase() + m.slice(1)) }).last();
            
            for (const fmt of ['PPTX', 'PDF', 'DOCX']) {
                try {
                    const dlBtn = page.locator('button').filter({ hasText: fmt }).first();
                    if (await dlBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                        console.log('    Downloading ' + m + ' ' + fmt + '...');
                        const [download] = await Promise.all([
                            page.waitForEvent('download', { timeout: 30000 }).catch(() => null),
                            dlBtn.click()
                        ]);
                        if (download) {
                            const ext = fmt === 'PPTX' ? 'pptx' : fmt === 'PDF' ? 'pdf' : 'docx';
                            const destPath = 'D:/Temp/opencode/verify_v7/' + m + '_' + fmt.toLowerCase() + '.' + ext;
                            await download.saveAs(destPath);
                            console.log('    Saved: ' + m + '_' + fmt.toLowerCase());
                        }
                    } else {
                        console.log('    Button not visible: ' + m + ' ' + fmt);
                    }
                } catch(e) {
                    console.log('    Download error ' + m + ' ' + fmt + ': ' + e.message);
                }
                await page.waitForTimeout(500);
            }
        }
        
        await ss('10_all_complete');
        
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
