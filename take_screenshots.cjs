const { chromium } = require('playwright');

async function main() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1100, height: 700 } });
    const page = await context.newPage();
    
    await page.goto('file:///D:/Temp/opencode/all_previews.html');
    await page.waitForTimeout(2000);
    
    // Screenshot each deck
    const decks = await page.$$('.deck');
    console.log(`Found ${decks.length} decks`);
    
    for (let i = 0; i < decks.length; i++) {
        const name = ['diapositivas', 'plan', 'quiz'][i] || `deck${i}`;
        await decks[i].screenshot({ path: `D:/Temp/opencode/verify_v6/eval_${name}.png` });
        console.log(`Saved eval_${name}.png`);
    }
    
    await browser.close();
}

main().catch(console.error);
