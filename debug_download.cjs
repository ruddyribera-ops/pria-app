const { chromium } = require('playwright');
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
    await checkboxes[0].click();
    await page.waitForTimeout(200);
    await page.click('button:has-text("Continuar")');
    await page.waitForTimeout(2000);
    
    // Click Diapositivas Generar
    const genBtn = await page.evaluateHandle(() => {
        const cards = Array.from(document.querySelectorAll('div'));
        for (const card of cards) {
            const text = card.textContent || '';
            if (text.includes('10-12 diapositivas') && card.querySelectorAll('button').length === 1) {
                const btn = card.querySelector('button');
                if (btn && btn.textContent.trim() === 'Generar') return btn;
            }
        }
        return null;
    });
    if (genBtn.asElement()) {
        await genBtn.asElement().click();
        for (let i = 0; i < 24; i++) {
            await page.waitForTimeout(5000);
            const done = await page.evaluate(() => {
                const cards = Array.from(document.querySelectorAll('div'));
                for (const card of cards) {
                    const text = card.textContent || '';
                    if (text.includes('10-12 diapositivas') && text.includes('Regenerar') && text.includes('PPTX')) {
                        const btns = card.querySelectorAll('button');
                        if (btns.length === 4 && btns[0].textContent.trim() === 'Regenerar') return true;
                    }
                }
                return false;
            });
            if (done) break;
        }
    }
    
    // Now list all PPTX buttons and their context
    const allPptxInfo = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('PPTX'));
        return btns.map(btn => {
            let parent = btn.parentElement;
            const parentTexts = [];
            for (let i = 0; i < 5 && parent; i++) {
                parentTexts.push({
                    tag: parent.tagName,
                    className: parent.className.slice(0, 50),
                    textLen: parent.textContent.length,
                    textSample: parent.textContent.slice(0, 100)
                });
                parent = parent.parentElement;
            }
            return parentTexts;
        });
    });
    
    console.log('PPTX buttons found:', allPptxInfo.length);
    allPptxInfo.forEach((info, i) => {
        console.log(`\nButton ${i}:`);
        info.forEach((p, j) => console.log(`  Parent ${j}: ${p.tag} cls=${p.className} len=${p.textLen} text="${p.textSample}"`));
    });
    
    await browser.close();
}

main().catch(console.error);
