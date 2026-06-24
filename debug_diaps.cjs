const { chromium } = require('playwright');
const fs = require('fs');
const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000/api';

async function login() {
    const resp = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'admin', contrasena: 'admin123' })
    });
    const json = await resp.json();
    return json.data;
}

async function main() {
    const { token, user } = await login();
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    
    await page.goto(BASE_URL + '/login');
    await page.evaluate(([t, u]) => {
        localStorage.setItem('pria_token', t);
        localStorage.setItem('pria_user', JSON.stringify(u));
        localStorage.setItem('pria_teacher_config', JSON.stringify({
            nombre: 'Misterruddy',
            email: 'Misterruddy@laspalmas.edu.bo',
            escuela: 'Unidad Educativa Las Palmas'
        }));
    }, [token, user]);
    
    await page.goto(BASE_URL + '/wizard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Navigate wizard
    await page.click('button:has-text("Texto de lenguaje")');
    await page.waitForFunction(() => document.body.textContent.includes('Selecciona los temas'), { timeout: 10000 });
    const checkboxes = await page.$$('input[type="checkbox"]');
    for (let i = 0; i < 3; i++) {
        await checkboxes[i].click();
        await page.waitForTimeout(100);
    }
    await page.click('button:has-text("Continuar")');
    await page.waitForTimeout(2000);
    
    // Click Diapositivas Generar
    const diapoBtn = await page.evaluateHandle(() => {
        const cards = Array.from(document.querySelectorAll('div')).filter(d => {
            return d.textContent.includes('Diapositivas') && d.textContent.includes('10-12 diapositivas');
        });
        for (const card of cards) {
            const btn = card.querySelector('button');
            if (btn && btn.textContent.trim() === 'Generar') return btn;
        }
        return null;
    });
    
    if (diapoBtn) {
        await diapoBtn.asElement().click();
        console.log('Generating...');
        // Wait for completion
        for (let i = 0; i < 24; i++) {
            await page.waitForTimeout(5000);
            const done = await page.evaluate(() => {
                const cards = Array.from(document.querySelectorAll('div')).filter(d => {
                    return d.textContent.includes('Diapositivas') && d.textContent.includes('10-12 diapositivas');
                });
                for (const card of cards) {
                    const btn = card.querySelector('button');
                    if (btn && btn.textContent.trim() === 'Regenerar') return true;
                }
                return false;
            });
            if (done) { console.log('Done!'); break; }
        }
    }
    
    await page.waitForTimeout(2000);
    
    // Now list all buttons on the page
    const allButtons = await page.$$eval('button', btns => btns.map(b => ({
        text: b.textContent.trim().slice(0, 30),
        classes: b.className.slice(0, 50)
    })));
    console.log('\n=== ALL BUTTONS ===');
    allButtons.forEach((b, i) => console.log(`${i}: "${b.text}"`));
    
    // Get the Diapositivas card structure
    const diapoCardInfo = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('div')).filter(d => {
            return d.textContent.includes('Diapositivas') && d.textContent.includes('10-12 diapositivas');
        });
        return cards.map(card => ({
            tag: card.tagName,
            className: card.className.slice(0, 100),
            buttonCount: card.querySelectorAll('button').length,
            hasRegenerar: !!Array.from(card.querySelectorAll('button')).find(b => b.textContent.trim() === 'Regenerar'),
            buttonTexts: Array.from(card.querySelectorAll('button')).map(b => b.textContent.trim().slice(0, 20))
        }));
    });
    console.log('\n=== DIAPOSITIVAS CARDS ===');
    console.log(JSON.stringify(diapoCardInfo, null, 2));
    
    // Take screenshot
    await page.screenshot({ path: 'D:/Temp/opencode/verify_v6/debug_diaps.png', fullPage: true });
    console.log('\nScreenshot saved');
    
    await browser.close();
}

main().catch(console.error);
