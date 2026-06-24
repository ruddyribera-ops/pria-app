const { chromium } = require('playwright');
const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000/api';

async function main() {
    const { token, user } = await loginApi();
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto(BASE_URL + '/login');
    await page.evaluate(([t, u]) => {
        localStorage.setItem('pria_token', t);
        localStorage.setItem('pria_user', JSON.stringify(u));
    }, [token, user]);
    
    await page.goto(BASE_URL + '/wizard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'D:/Temp/opencode/verify_v6/wizard_state.png', fullPage: true });
    console.log('Screenshot saved');
    
    // Get all button texts
    const buttons = await page.$$eval('button', btns => btns.map(b => ({
        text: b.textContent.trim(),
        disabled: b.disabled
    })));
    console.log('\nButtons found:');
    buttons.forEach(b => console.log(`  "${b.text}" (disabled: ${b.disabled})`));
    
    // Get all inputs
    const inputs = await page.$$eval('input', ins => ins.map(i => ({
        type: i.type,
        checked: i.checked,
        disabled: i.disabled
    })));
    console.log('\nInputs found:', inputs.length);
    
    await browser.close();
}

async function loginApi() {
    const resp = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'admin', contrasena: 'admin123' })
    });
    const json = await resp.json();
    return json.data;
}

main().catch(console.error);
