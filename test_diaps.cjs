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
    console.log('Testing DIAPOSITIVAS motor\n');
    
    const { token, user } = await loginApi();
    console.log('Logged in');
    
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
    
    // Select textbook
    console.log('[1] Selecting textbook...');
    await page.click('button:has-text("Texto de lenguaje")');
    await page.waitForFunction(() => document.body.textContent.includes('Selecciona los temas'), { timeout: 10000 });
    console.log('OK - on step 2');
    
    // Select first 3 topics
    const checkboxes = await page.$$('input[type="checkbox"]');
    for (let i = 0; i < Math.min(3, checkboxes.length); i++) {
        await checkboxes[i].click();
        await page.waitForTimeout(100);
    }
    console.log('[2] Selected 3 topics');
    
    await page.click('button:has-text("Continuar")');
    await page.waitForTimeout(2000);
    console.log('[3] On step 3');
    
    // Take screenshot to see buttons
    await page.screenshot({ path: `${OUT_DIR}/step3_state.png`, fullPage: true });
    console.log('Screenshot saved');
    
    // List all buttons
    const buttons = await page.$$eval('button', btns => btns.map(b => ({
        text: b.textContent.trim(),
        disabled: b.disabled
    })));
    console.log('\nButtons on step 3:');
    buttons.forEach(b => console.log(`  "${b.text}" (disabled: ${b.disabled})`));
    
    await browser.close();
}

main().catch(console.error);
