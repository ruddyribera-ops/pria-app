import { chromium } from '@playwright/test';

const SCREENSHOT_DIR = 'D:/Temp/opencode/memory/factory/projects/pria-v10/demos/full-materials';

async function debug() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Capture all requests
  const requests: string[] = [];
  page.on('request', req => {
    if (req.url().includes('/api/')) {
      requests.push(`${req.method()} ${req.url()}`);
    }
  });
  page.on('response', async res => {
    if (res.url().includes('/api/')) {
      const status = res.status();
      const timing = res.request().timing();
      const duration = timing ? Math.round(timing.responseEnd - timing.requestStart) : 0;
      if (status >= 400 || duration > 5000) {
        console.log(`  ${res.request().method()} ${res.url()} -> ${status} (${duration}ms)`);
      }
    }
  });

  try {
    console.log('[1] Login');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/materiales', { timeout: 15000 });
    console.log('  Logged in');

    // Wait up to 15s for the page to finish loading
    console.log('[2] Waiting for page to settle...');
    const start = Date.now();
    try {
      await page.waitForSelector('text=Cargando materiales', { state: 'hidden', timeout: 15000 });
      console.log('  Materials loaded after', Date.now() - start, 'ms');
    } catch {
      console.log('  Still loading after', Date.now() - start, 'ms');
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/debug2.png` });

    const body = await page.locator('body').innerText();
    console.log('  Body length:', body.length);
    console.log('  Síntesis button:', body.includes('Generar Síntesis'));
    console.log('  Loading:', body.includes('Cargando'));

    // Capture network requests
    console.log('\n  Slow API requests:');
    requests.forEach(r => console.log('  ', r));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

debug();