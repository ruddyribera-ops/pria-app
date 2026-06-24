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
    return (await resp.json()).data;
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
            nombre: 'Misterruddy', email: 'm@x.com', escuela: 'X'
        }));
    }, [token, user]);
    
    await page.goto(BASE_URL + '/wizard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.click('button:has-text("Texto de lenguaje")');
    await page.waitForFunction(() => document.body.textContent.includes('Selecciona los temas'), { timeout: 10000 });
    const checkboxes = await page.$$('input[type="checkbox"]');
    for (let i = 0; i < 3; i++) { await checkboxes[i].click(); await page.waitForTimeout(100); }
    await page.click('button:has-text("Continuar")');
    await page.waitForTimeout(2000);
    
    // Click Diapositivas Generar
    await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('div')).filter(d => 
            d.textContent.includes('Diapositivas') && d.textContent.includes('10-12 diapositivas'));
        for (const card of cards) {
            const btn = card.querySelector('button');
            if (btn && btn.textContent.trim() === 'Generar') { btn.click(); return; }
        }
    });
    
    // Wait for completion
    for (let i = 0; i < 18; i++) {
        await page.waitForTimeout(5000);
        const done = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('div')).filter(d => 
                d.textContent.includes('Diapositivas') && d.textContent.includes('10-12 diapositivas'));
            for (const card of cards) {
                const btn = card.querySelector('button');
                if (btn && btn.textContent.trim() === 'Regenerar') return true;
            }
            return false;
        });
        if (done) break;
    }
    
    await page.waitForTimeout(2000);
    
    // Find the Diapositivas PPTX button using click event
    const result = await page.evaluate(() => {
        // Find all buttons
        const allButtons = Array.from(document.querySelectorAll('button'));
        const pptxButtons = allButtons.filter(b => b.textContent.includes('PPTX') && !b.textContent.includes('Regenerar'));
        
        return pptxButtons.map((btn, idx) => {
            // Find closest card with description text
            let parent = btn.parentElement;
            let cardText = '';
            for (let i = 0; i < 6 && parent; i++) {
                if (parent.textContent && parent.textContent.length < 600 && parent.textContent.length > 50) {
                    if (parent.textContent.includes('Mitos') || 
                        parent.textContent.includes('Conceptos') ||
                        parent.textContent.includes('Quiz') ||
                        parent.textContent.includes('ABP') ||
                        parent.textContent.includes('Diapositivas') ||
                        parent.textContent.includes('Síntesis')) {
                        cardText = parent.textContent.slice(0, 200);
                        break;
                    }
                }
                parent = parent.parentElement;
            }
            return { idx, text: btn.textContent, cardText };
        });
    });
    
    console.log('PPTX buttons found:');
    result.forEach(b => {
        console.log(`\nButton ${b.idx}: "${b.text}"`);
        console.log(`Card text: ${b.cardText}`);
    });
    
    await browser.close();
}

main().catch(console.error);
