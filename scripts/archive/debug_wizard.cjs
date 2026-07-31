const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
        await page.fill('input[type=text]', 'admin');
        await page.fill('input[type=password]', 'admin123');
        await page.click('button[type=submit]');
        await page.waitForTimeout(2000);
        
        await page.goto('http://localhost:5173/wizard', { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(3000);
        
        // Select material
        await page.click('button:has-text("Texto de lenguaje")');
        await page.waitForTimeout(3000);
        
        // Select topic
        const topicSpan = page.locator('span').filter({ hasText: /Guede pinta los animales/ }).first();
        await topicSpan.click({ force: true });
        await page.waitForTimeout(1000);
        
        // Click continuar
        const continuarBtn = page.locator('button').filter({ hasText: /Continuar con \d+ tema/ }).first();
        console.log('Antes de click:', await continuarBtn.textContent());
        await continuarBtn.click();
        await page.waitForTimeout(3000);
        
        // Check page content
        const bodyText = await page.textContent('body');
        console.log('Page contains Genera tu material:', bodyText.includes('Genera tu material'));
        console.log('Page contains Síntesis:', bodyText.includes('Síntesis'));
        console.log('Page contains Diapositivas:', bodyText.includes('Diapositivas'));
        console.log('Page contains Plan de clase:', bodyText.includes('Plan de clase'));
        console.log('Page contains Quiz:', bodyText.includes('Quiz'));
        console.log('Page contains Generar:', bodyText.includes('Generar'));
        
        // List all buttons
        const buttons = await page.locator('button').all();
        console.log('\nAll buttons:', buttons.length);
        for (const btn of buttons) {
            const txt = await btn.textContent().catch(() => '');
            console.log('  -', txt.trim().substring(0, 50));
        }
        
        // Check for any div containing Síntesis
        const sintDivs = await page.locator('div').filter({ hasText: /Síntesis/ }).all();
        console.log('\nDivs containing Síntesis:', sintDivs.length);
        
    } catch(e) {
        console.log('Error:', e.message);
    } finally {
        await browser.close();
    }
})();
