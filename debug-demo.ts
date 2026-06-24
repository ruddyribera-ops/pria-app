import { chromium } from '@playwright/test';

const TXT_PATH = 'D:/Temp/opencode/texto_lenguaje_extraido.txt';
const SCREENSHOT_DIR = 'D:/Temp/opencode/memory/factory/projects/pria-v10/demos/full-materials';

async function demo() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    console.log('[1] Login');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/materiales', { timeout: 15000 });
    console.log('  URL:', page.url());

    // Wait for React to hydrate
    await page.waitForTimeout(3000);

    // Check what's visible
    const bodyText = await page.locator('body').innerText();
    console.log('  Body text length:', bodyText.length);
    console.log('  Body preview:', bodyText.slice(0, 200));

    await page.screenshot({ path: `${SCREENSHOT_DIR}/debug-login.png` });

    // Try uploading file
    console.log('[2] Upload TXT');
    const fileInput = page.locator('input[type="file"]').first();
    const fileCount = await fileInput.count();
    console.log('  File inputs found:', fileCount);

    if (fileCount > 0) {
      await fileInput.setInputFiles(TXT_PATH);
      console.log('  File set');
      await page.waitForTimeout(5000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/debug-uploaded.png` });

      const body2 = await page.locator('body').innerText();
      console.log('  After upload text length:', body2.length);
      console.log('  Has Síntesis button:', body2.includes('Generar Síntesis'));
      console.log('  Has preview:', body2.includes('Vista Previa'));
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

demo();