const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000/api';

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
    console.log('Starting demo...');
    
    const { token, user } = await loginApi();
    console.log('Logged in, token:', token.substring(0, 20) + '...');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Set localStorage before navigating
    await page.goto(BASE_URL + '/login');
    await page.evaluate(([t, u]) => {
        localStorage.setItem('pria_token', t);
        localStorage.setItem('pria_user', JSON.stringify(u));
    }, [token, user]);
    
    console.log('Navigating to wizard...');
    await page.goto(BASE_URL + '/wizard');
    await page.waitForLoadState('networkidle');
    
    // Check if we need to upload or if material already exists
    console.log('Checking wizard state...');
    
    // Wait for wizard to load
    await page.waitForTimeout(2000);
    
    const pageContent = await page.content();
    console.log('Page loaded, checking for upload zone or existing material...');
    
    // Check if material is already loaded
    const hasMaterial = pageContent.includes('Texto de lenguaje') || pageContent.includes('Mitos');
    console.log('Has material loaded:', hasMaterial);
    
    // Try to proceed to step 2 (select topics)
    // Look for "Siguiente" or "Continuar" buttons
    const nextBtn = await page.$('button:has-text("Siguiente"), button:has-text("Continuar"), button:has-text("sigiente")');
    if (nextBtn) {
        console.log('Found next button, clicking...');
        await nextBtn.click();
        await page.waitForTimeout(1000);
    }
    
    // Look for topic checkboxes or select element
    const topicCheckboxes = await page.$$('input[type="checkbox"]');
    console.log(`Found ${topicCheckboxes.length} topic checkboxes`);
    
    // Select first 3 topics if available
    let topicsSelected = 0;
    for (let i = 0; i < Math.min(3, topicCheckboxes.length); i++) {
        const isChecked = await topicCheckboxes[i].isChecked();
        if (!isChecked) {
            await topicCheckboxes[i].click();
            topicsSelected++;
        }
    }
    console.log(`Selected ${topicsSelected} topics`);
    
    // Look for Síntesis button
    const synthesisBtn = await page.$('button:has-text("Síntesis"), button:has-text("Sintesis"), button:has-text("Generar")');
    if (synthesisBtn) {
        console.log('Found Síntesis button, clicking...');
        await synthesisBtn.click();
        console.log('Waiting for synthesis generation (60s)...');
        await page.waitForTimeout(60000);
    }
    
    // Look for download buttons
    const downloadBtns = await page.$$('button:has-text("Descargar"), button:has-text("Download")');
    console.log(`Found ${downloadBtns.length} download buttons`);
    
    // Try to download each format
    const formats = ['PPTX', 'PDF', 'DOCX'];
    for (const fmt of formats) {
        const btn = await page.$(`button:has-text("${fmt}")`);
        if (btn) {
            console.log(`Downloading ${fmt}...`);
            // Set download path
            const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
            await btn.click();
            const download = await downloadPromise;
            if (download) {
                const path = `D:/Temp/opencode/verify_v6/PRIA_Sintesis.${fmt === 'PPTX' ? 'pptx' : fmt === 'PDF' ? 'pdf' : 'docx'}`;
                await download.saveAs(path);
                console.log(`Saved: ${path}`);
            }
        }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'D:/Temp/opencode/verify_v6/wizard_state.png', fullPage: true });
    console.log('Screenshot saved');
    
    await browser.close();
    console.log('Demo complete!');
}

main().catch(err => {
    console.error('Demo error:', err.message);
    process.exit(1);
});
