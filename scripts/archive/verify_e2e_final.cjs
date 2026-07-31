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
    
    async function getGenButtons() {
        // Get all buttons that say exactly "Generar"
        return await page.locator('button').filter({ hasText: /^Generar$/ }).all();
    }
    
    async function waitForGeneration(genBtn) {
        for (let j = 0; j < 120; j++) {
            await page.waitForTimeout(2000);
            
            // Check if download buttons appeared
            const dlBtns = await page.locator('button').filter({ hasText: /PPTX/ }).all();
            if (dlBtns.length > 0) {
                return true;
            }
            
            const newText = await genBtn.textContent().catch(() => '');
            if (newText.includes('Regenerar') || newText.includes('Descargar')) {
                return true;
            }
            
            if (j % 10 === 0) console.log('  Waiting...(' + (j*2) + 's)');
        }
        return false;
    }
    
    async function generateMotor(motorIndex) {
        // Re-find all Generar buttons each time since DOM changes
        const genButtons = await getGenButtons();
        console.log('  Found ' + genButtons.length + ' Generar buttons');
        
        if (motorIndex >= genButtons.length) {
            console.log('  Button index ' + motorIndex + ' not found!');
            return false;
        }
        
        const genBtn = genButtons[motorIndex];
        const btnText = await genBtn.textContent();
        console.log('  Button text: ' + btnText);
        
        if (btnText.includes('Regenerar') || btnText.includes('Descargar')) {
            console.log('  Already completed');
            return true;
        }
        
        if (btnText.includes('Generando')) {
            console.log('  Already generating, waiting...');
            return await waitForGeneration(genBtn);
        }
        
        // Click Generar
        console.log('  Clicking Generar...');
        await genBtn.click();
        return await waitForGeneration(genBtn);
    }
    
    try {
        // Login
        console.log('[1] Opening & login...');
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);
        await page.fill('input[type=text]', 'admin');
        await page.fill('input[type=password]', 'admin123');
        await page.click('button[type=submit]');
        await page.waitForTimeout(2000);
        await ss('01_login');
        
        // Teacher config
        console.log('[2] Teacher config...');
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
        
        // Wizard flow
        console.log('[3] Wizard flow...');
        await page.goto('http://localhost:5173/wizard', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);
        await ss('02_wizard');
        
        await page.click('button:has-text("Texto de lenguaje")');
        await page.waitForTimeout(3000);
        await ss('03_material');
        
        const topicSpan = page.locator('span').filter({ hasText: /Guede pinta los animales/ }).first();
        await topicSpan.click({ force: true });
        await page.waitForTimeout(1000);
        await ss('04_topic');
        
        const continuarBtn = page.locator('button').filter({ hasText: /Continuar con \d+ tema/ }).first();
        await continuarBtn.click();
        await page.waitForTimeout(2000);
        await ss('05_generate_step');
        
        // Motors to generate
        const motorIds = ['sintesis', 'slides', 'plan', 'quiz'];
        
        for (let i = 0; i < motorIds.length; i++) {
            const motorId = motorIds[i];
            console.log('\n[4.' + (i+1) + '] Motor: ' + motorId);
            
            const success = await generateMotor(i);
            if (!success) {
                console.log('  FAILED to generate!');
            }
            
            await page.waitForTimeout(1000);
            await ss('06_' + motorId + '_gen');
            
            // Download files
            console.log('  Downloading...');
            for (const fmt of ['PPTX', 'PDF', 'DOCX']) {
                try {
                    const dlBtn = page.locator('button').filter({ hasText: fmt }).first();
                    if (await dlBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                        console.log('    ' + fmt + '...');
                        const [download] = await Promise.all([
                            page.waitForEvent('download', { timeout: 30000 }).catch(() => null),
                            dlBtn.click()
                        ]);
                        if (download) {
                            const ext = fmt === 'PPTX' ? 'pptx' : fmt === 'PDF' ? 'pdf' : 'docx';
                            const destPath = 'D:/Temp/opencode/verify_v7/' + motorId + '_' + fmt.toLowerCase() + '.' + ext;
                            await download.saveAs(destPath);
                            console.log('    Saved: ' + motorId + '_' + fmt.toLowerCase());
                        }
                    } else {
                        console.log('    ' + fmt + ' not visible');
                    }
                } catch(e) {
                    console.log('    ' + fmt + ' error: ' + e.message.substring(0, 60));
                }
                await page.waitForTimeout(500);
            }
        }
        
        await ss('07_all_complete');
        
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
