import { chromium } from '@playwright/test';

const SCREENSHOT_DIR = 'D:/Temp/opencode/memory/factory/projects/pria-v10/demos/full-materials';
const TXT_PATH = 'D:/Temp/opencode/texto_lenguaje_extraido.txt';

async function debug() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleLogs: string[] = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

  const networkErrors: string[] = [];
  page.on('response', async res => {
    if (res.status() >= 400 && res.url().includes('/api/')) {
      networkErrors.push(`${res.status()} ${res.url()}`);
    }
  });

  try {
    console.log('[1] Login');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/materiales', { timeout: 15000 });
    console.log('  URL:', page.url());

    // Wait for initial load
    await page.waitForTimeout(2000);

    console.log('[2] Upload TXT');
    await page.locator('input[type="file"]').first().setInputFiles(TXT_PATH);
    console.log('  File uploaded');

    // Wait and check state every 5s
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(5000);
      const body = await page.locator('body').innerText();
      const hasPreview = body.includes('Vista Previa del Currículo');
      const hasSintesisBtn = body.includes('Generar Síntesis');
      const hasNoTopics = body.includes('No se detectaron temas');
      const isLoading = body.includes('Cargando materiales');
      const hasFile = body.includes('texto_lenguaje_extraido') || body.includes('texto_lenguaje');
      console.log(`  t=${String((i+1)*5).padStart(2)}s: preview=${hasPreview}, sintetico=${hasSintesisBtn}, noTopics=${hasNoTopics}, loading=${isLoading}, hasFile=${hasFile}`);

      if (hasSintesisBtn || hasPreview) {
        await page.screenshot({ path: `${SCREENSHOT_DIR}/progress-t${(i+1)*5}s.png` });
        break;
      }
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/progress-final.png` });
    const finalBody = await page.locator('body').innerText();
    console.log('\n[FINAL STATE]');
    console.log('  Síntesis button:', finalBody.includes('Generar Síntesis'));
    console.log('  No topics:', finalBody.includes('No se detectaron temas'));

    if (consoleLogs.length > 0) {
      console.log('\n[CONSOLE LOGS]');
      consoleLogs.filter(l => l.includes('[error]') || l.includes('[warn]')).forEach(l => console.log('  ', l));
    }
    if (networkErrors.length > 0) {
      console.log('\n[NETWORK ERRORS]');
      networkErrors.forEach(e => console.log('  ', e));
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

debug();