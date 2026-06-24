const { chromium } = require('playwright');

async function main() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('file:///D:/Temp/opencode/slides_preview.html');
    await page.waitForTimeout(2000);
    
    // Screenshot each slide
    const slides = await page.$$('.slide');
    console.log(`Found ${slides.length} slides`);
    
    for (let i = 0; i < slides.length; i++) {
        await slides[i].screenshot({ path: `D:/Temp/opencode/verify_v6/slide_${i+1}.png` });
        console.log(`Saved slide_${i+1}.png`);
    }
    
    // Also take a full page screenshot
    await page.screenshot({ path: 'D:/Temp/opencode/verify_v6/all_slides.png', fullPage: true });
    console.log('Saved all_slides.png');
    
    await browser.close();
}

main().catch(console.error);
