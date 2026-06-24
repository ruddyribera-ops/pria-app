const { chromium } = require('playwright');

async function main() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1100, height: 700 } });
    const page = await context.newPage();
    
    await page.goto('file:///D:/Temp/opencode/tier1_preview.html');
    await page.waitForTimeout(2000);
    
    // Take individual screenshots of each slide
    const slides = await page.$$('.slide');
    console.log(`Found ${slides.length} slides`);
    
    for (let i = 0; i < slides.length; i++) {
        await slides[i].screenshot({ path: `D:/Temp/opencode/verify_v6/t1_slide_${String(i+1).padStart(2, '0')}.png` });
        console.log(`Saved t1_slide_${String(i+1).padStart(2, '0')}.png`);
    }
    
    // Also a combined screenshot
    await page.screenshot({ path: 'D:/Temp/opencode/verify_v6/t1_all_slides.png', fullPage: true });
    console.log('Saved t1_all_slides.png');
    
    await browser.close();
}

main().catch(console.error);
