const { chromium } = require('playwright');
const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000/api';
const OUT_DIR = 'D:/Temp/opencode/verify_v6';
const fs = require('fs');

async function loginApi() {
    const resp = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'admin', contrasena: 'admin123' })
    });
    const json = await resp.json();
    return json.data;
}

async function main() {
    console.log('PRIA Demo - Full with Teacher Config\n');
    
    const { token, user } = await loginApi();
    console.log('Logged in');
    
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    
    await page.goto(BASE_URL + '/login');
    await page.evaluate(([t, u]) => {
        localStorage.setItem('pria_token', t);
        localStorage.setItem('pria_user', JSON.stringify(u));
        // BUG-005 fix: set teacher config
        localStorage.setItem('pria_teacher_config', JSON.stringify({
            nombre: 'Misterruddy',
            email: 'Misterruddy@laspalmas.edu.bo',
            escuela: 'Unidad Educativa Las Palmas'
        }));
    }, [token, user]);
    
    await page.goto(BASE_URL + '/wizard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('\n[Step 1] Selecting textbook...');
    await page.click('button:has-text("Texto de lenguaje")', { timeout: 5000 });
    console.log('Clicked textbook');
    
    console.log('Waiting for auto-advance...');
    try {
        await page.waitForFunction(() => document.body.textContent.includes('Selecciona los temas'), { timeout: 10000 });
        console.log('Advanced to step 2!');
    } catch {
        console.log('WARNING: Did not advance');
    }
    
    await page.waitForTimeout(1000);
    
    console.log('\n[Step 2] Selecting 1 topic (one deck per topic)...');
    const checkboxes = await page.$$('input[type="checkbox"]');
    console.log(`Found ${checkboxes.length} checkboxes`);
    // Select ONLY the first topic - one deck per topic architecture
    await checkboxes[0].click();
    await page.waitForTimeout(150);
    console.log('Selected 1 topic');
    
    await page.waitForTimeout(500);
    await page.click('button:has-text("Continuar")');
    console.log('Clicked Continuar');
    await page.waitForTimeout(2000);
    
    console.log('\n[Step 3] Generating Diapositivas...');
    await page.waitForFunction(() => document.body.textContent.includes('Genera tu material') || document.body.textContent.includes('Generar'), { timeout: 10000 });

    // Find the Diapositivas card and its Generar button
    // Use a specific selector that targets the actual card (not parent divs)
    const diapoGenerar = await page.evaluateHandle(() => {
        // Find the specific Diapositivas card by its description "10-12 diapositivas"
        const cards = Array.from(document.querySelectorAll('div'));
        for (const card of cards) {
            const text = card.textContent || '';
            // The Diapositivas card has its specific description and a Generar button
            // Must be the CARD itself (not a parent) - check it has just 1 button
            if (text.includes('10-12 diapositivas') && card.querySelectorAll('button').length === 1) {
                const btn = card.querySelector('button');
                if (btn && btn.textContent.trim() === 'Generar') return btn;
            }
        }
        return null;
    });

    if (diapoGenerar) {
        console.log('Clicking Diapositivas Generar...');
        await diapoGenerar.asElement().click();
        for (let i = 0; i < 24; i++) {
            await page.waitForTimeout(5000);
            // Check if the SPECIFIC Diapositivas card has Regenerar (4-button card)
            const hasCompleted = await page.evaluate(() => {
                const cards = Array.from(document.querySelectorAll('div'));
                for (const card of cards) {
                    const text = card.textContent || '';
                    // Find the Diapositivas card: has "10-12 diapositivas" AND Regenerar
                    // Must be a tight card (just 4 buttons) NOT a parent div
                    if (text.includes('10-12 diapositivas') && text.includes('Regenerar') && text.includes('PPTX')) {
                        const btns = card.querySelectorAll('button');
                        // A completed Diapositivas card has exactly 4 buttons: Regenerar + PPTX + PDF + DOCX
                        if (btns.length === 4 && btns[0].textContent.trim() === 'Regenerar') {
                            return true;
                        }
                    }
                }
                return false;
            });
            if (hasCompleted) {
                console.log('Generation completed!');
                break;
            }
            console.log(`  ${(i + 1) * 5}s...`);
        }
    } else {
        console.log('ERROR: Diapositivas Generar button not found');
    }

    await page.screenshot({ path: `${OUT_DIR}/after_gen.png`, fullPage: true });

    console.log('\n[Downloads]');
    // Use specific text-based selector: find PPTX button in Diapositivas card
    try {
        const diapoPptx = page.getByText('Diapositivas', { exact: true })
            .locator('xpath=ancestor::*[.//button[contains(text(), "PPTX")]][1]')
            .locator('button:has-text("PPTX")')
            .first();

        if (await diapoPptx.count() > 0) {
            console.log('Clicking Diapositivas PPTX download...');
            const [dl] = await Promise.all([
                page.waitForEvent('download', { timeout: 30000 }).catch(() => null),
                diapoPptx.click()
            ]);
            if (dl) {
                await dl.saveAs(`${OUT_DIR}/PRIA_Diapositivas.pptx`);
                console.log('  Saved PRIA_Diapositivas.pptx');
            } else {
                console.log('  Download timeout');
            }
        } else {
            console.log('PPTX button not found in Diapositivas card');
            // Fallback: just take the FIRST PPTX button
            const firstPptx = page.locator('button:has-text("PPTX")').first();
            if (await firstPptx.count() > 0) {
                console.log('Trying first PPTX button...');
                const [dl] = await Promise.all([
                    page.waitForEvent('download', { timeout: 30000 }).catch(() => null),
                    firstPptx.click()
                ]);
                if (dl) {
                    await dl.saveAs(`${OUT_DIR}/PRIA_Diapositivas.pptx`);
                    console.log('  Saved PRIA_Diapositivas.pptx (fallback)');
                }
            }
        }
    } catch (e) {
        console.log('Download error:', e.message);
    }
    
    await page.screenshot({ path: `${OUT_DIR}/final.png`, fullPage: true });
    await browser.close();
    
    console.log('\n=== OUTPUT FILES ===');
    fs.readdirSync(OUT_DIR).filter(f => f.startsWith('PRIA_')).forEach(f => {
        const s = fs.statSync(`${OUT_DIR}/${f}`);
        console.log(`${f}: ${s.size} bytes`);
    });
    
    console.log('\nDone!');
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
