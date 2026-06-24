import { chromium } from '@playwright/test';

const FILE_PATH = 'tests/fixtures/test-curriculum.txt';
const SCREENSHOT_DIR = 'D:/Temp/opencode/memory/factory/projects/pria-v10/demos';

async function demo() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // 1. Login
    console.log('[1] Login');
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/materiales', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/demo-01-login.png` });
    console.log('   ✓');

    // 2. Upload TXT file
    console.log('[2] Upload TXT');
    await page.locator('input[type="file"]').first().setInputFiles(FILE_PATH);
    console.log('   ✓');

    // 3. Wait for curriculum preview (up to 30s)
    console.log('[3] Wait for curriculum preview');
    try {
      await page.waitForSelector('text=Vista Previa del Currículo', { timeout: 30000 });
    } catch { console.log('   Timeout, checking anyway'); }
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/demo-02-uploaded.png` });

    // 4. Check if topics were detected
    const noTopics = await page.locator('text=No se detectaron temas').isVisible().catch(() => false);
    console.log(`   No topics detected: ${noTopics}`);

    // 5. Click Síntesis
    console.log('[4] Click Síntesis');
    const sinteticoBtn = page.locator('button').filter({ hasText: /Generar Síntesis con IA/i }).first();
    const btnVisible = await sinteticoBtn.isVisible().catch(() => false);
    console.log(`   Button visible: ${btnVisible}`);

    if (btnVisible) {
      await sinteticoBtn.click();
      console.log('   Clicked, waiting 10s...');
      await page.waitForTimeout(10000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/demo-03-after-sintesis.png` });

      // Check page content
      const body = await page.locator('body').innerText();
      const hasSintesisResult = body.includes('Síntesis Neuro') || body.includes('Enfoque');
      const hasExport = body.includes('Exportar a PPTX');
      console.log(`   Síntesis result: ${hasSintesisResult}`);
      console.log(`   Export section: ${hasExport}`);

      if (hasExport) {
        await page.screenshot({ path: `${SCREENSHOT_DIR}/demo-04-export.png` });
        console.log('   Export screenshot captured');
      }
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/demo-05-final.png` });
    console.log('Done');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

demo();