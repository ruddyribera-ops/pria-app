const {chromium} = require('playwright');

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
        
        // Step 5: Select unit
        console.log('[5] Selecting unit...');
        const selects = await page.locator('select').all();
        console.log('  Found ' + selects.length + ' selects');
        if (selects.length >= 1) {
            const options = await selects[0].locator('option').all();
            for (const opt of options) {
                const text = await opt.textContent();
                if (text && text.includes('Mitos')) {
                    await opt.click();
                    break;
                }
            }
            await page.waitForTimeout(1000);
        }
        await ss('05_unit_selected');
        
        // Step 6: Select topic
        console.log('[6] Selecting topic...');
        const selects2 = await page.locator('select').all();
        if (selects2.length >= 2) {
            const options2 = await selects2[1].locator('option').all();
            for (const opt of options2) {
                const text = await opt.textContent();
                if (text && text.includes('Guede')) {
                    await opt.click();
                    break;
                }
            }
            await page.waitForTimeout(1000);
        }
        await ss('06_topic_selected');
        
        // Step 7: Generate motors
        console.log('[7] Generating motors...');
        const motors = ['sintesis', 'slides', 'plan', 'quiz'];
        
        for (const m of motors) {
            console.log('  Motor: ' + m);
            const btns = await page.locator('button').all();
            let genBtn = null;
            for (const b of btns) {
                const t = await b.textContent().catch(() => '');
                if (t && (t.toLowerCase().includes('generar') || t.toLowerCase().includes(m))) {
                    genBtn = b;
                    break;
                }
            }
            if (genBtn) {
                console.log('  Clicking generate for ' + m + '...');
                await genBtn.click();
                let done = false;
                for (let i = 0; i < 90; i++) { // 3 min timeout per motor
                    await page.waitForTimeout(2000);
                    const txt = await genBtn.textContent().catch(() => '');
                    if (txt && (txt.includes('Descargar') || txt.includes('✓') || txt.includes('✔'))) {
                        done = true;
                        console.log('  ' + m + ' generation complete!');
                        break;
                    }
                    if (i % 15 === 0) console.log('  Waiting for ' + m + '...(' + (i*2) + 's)');
                }
                if (!done) console.log('  TIMEOUT waiting for ' + m);
            } else {
                console.log('  Generate button NOT FOUND for ' + m);
            }
            await page.waitForTimeout(1000);
            await ss('07_' + m + '_generated');
        }
        
        await ss('08_all_downloads');
        
        // Report errors
        console.log('\n[CONSOLE ERRORS] ' + consoleErrors.length);
        consoleErrors.forEach(e => console.log('  ERR: ' + e));
        
    } catch(e) {
        console.log('[FATAL ERROR] ' + e.message);
        console.log(e.stack);
    } finally {
        await browser.close();
    }
    
    console.log('[DONE] Browser automation complete!');
})();
