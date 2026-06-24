import { chromium } from '@playwright/test';

const TXT_PATH = 'D:/Temp/opencode/texto_lenguaje_extraido.txt';
const SCREENSHOT_DIR = 'D:/Temp/opencode/memory/factory/projects/pria-v10/demos/full-materials';

async function demo() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Capture console messages
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleLogs.push(`[ERROR] ${msg.text()}`);
  });

  try {
    // 1. Login
    console.log('[1] Login');
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/materiales', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    console.log('  OK');

    // 2. Upload TXT
    console.log('[2] Upload TXT');
    await page.locator('input[type="file"]').first().setInputFiles(TXT_PATH);
    console.log('  File set');

    // 3. Wait for curriculum preview
    console.log('[3] Wait for curriculum preview');
    try {
      await page.waitForSelector('text=Vista Previa del Currículo', { timeout: 30000 });
    } catch { /* continue */ }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/T02-preview.png` });

    // 4. Check Síntesis button and click
    const sinteticoBtn = page.locator('button').filter({ hasText: /Generar Síntesis con IA/i }).first();
    const btnVisible = await sinteticoBtn.isVisible().catch(() => false);
    console.log(`  Síntesis button: ${btnVisible}`);

    if (!btnVisible) {
      // Get page state
      const body = await page.locator('body').innerText();
      console.log('  Page text (first 500):', body.slice(0, 500));
      return;
    }

    console.log('[4] Click Síntesis');
    await sinteticoBtn.click();
    console.log('  Clicked');

    // Poll every 3s for 60s to see when result appears
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(3000);
      const body = await page.locator('body').innerText();
      const hasResult = body.includes('Síntesis Neuro') || body.includes('Enfoque');
      const hasExport = body.includes('Exportar a PPTX');
      const isLoading = await page.locator('text=Generando').isVisible().catch(() => false);
      console.log(`  t=${String((i+1)*3).padStart(2)}s: result=${hasResult}, export=${hasExport}, loading=${isLoading}`);
      if (hasResult || (i > 5 && !isLoading)) {
        await page.screenshot({ path: `${SCREENSHOT_DIR}/T04-sintesis-t${(i+1)*3}s.png` });
        break;
      }
    }

    // Final check
    const finalBody = await page.locator('body').innerText();
    console.log(`\n  Síntesis Neuro: ${finalBody.includes('Síntesis Neuro')}`);
    console.log(`  Export: ${finalBody.includes('Exportar a PPTX')}`);

    // Print console errors
    if (consoleLogs.length > 0) {
      console.log('\n  Console errors:');
      consoleLogs.forEach(l => console.log('  ' + l));
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/T05-final.png` });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

demo();