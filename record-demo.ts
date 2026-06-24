import { chromium } from '@playwright/test';

const PDF_PATH = 'docs/Unidad 3 - Lenguaje_5to_SB.pdf';
const SCREENSHOT_DIR = 'D:/Temp/opencode/memory/factory/projects/pria-v10/demos';

async function recordDemo() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const screenshots = [];

  try {
    // 1. Login
    console.log('1. Logging in...');
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/materiales', { timeout: 15000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-login.png` });
    screenshots.push('01-login.png');
    console.log('   OK');

    // 2. Upload PDF
    console.log('2. Uploading PDF...');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="file"]').first().setInputFiles(PDF_PATH);
    console.log('   PDF uploaded');

    // 3. Wait for OCR processing to complete (up to 120s)
    console.log('3. Waiting for OCR + curriculum detection (up to 120s)...');

    // Wait for either: curriculum preview OR "No se detectaron temas" message
    let previewAppeared = false;
    try {
      await page.waitForSelector('text=Vista Previa del Currículo', { timeout: 120000 });
      previewAppeared = true;
      console.log('   Curriculum preview appeared!');
    } catch {
      // Try fallback - maybe topics weren't detected but Síntesis button still exists
      try {
        await page.waitForSelector('text=No se detectaron temas', { timeout: 10000 });
        previewAppeared = true;
        console.log('   No topics detected but Síntesis button should be visible');
      } catch {
        console.log('   Neither preview nor "no topics" message found');
      }
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-after-upload.png` });
    screenshots.push('02-after-upload.png');

    // 4. Check Síntesis button
    console.log('4. Looking for Síntesis button...');
    const sinteticoBtn = page.locator('button').filter({ hasText: /Generar Síntesis con IA/i }).first();
    const isVisible = await sinteticoBtn.isVisible().catch(() => false);

    if (isVisible) {
      console.log('   Síntesis button FOUND — clicking it!');
      await page.screenshot({ path: `${SCREENSHOT_DIR}/03-before-sintesis.png` });
      screenshots.push('03-before-sintesis.png');
      await sinteticoBtn.click();

      // Wait for generation to complete (up to 30s)
      console.log('5. Waiting for Síntesis generation (up to 30s)...');
      await page.waitForTimeout(30000);

      await page.screenshot({ path: `${SCREENSHOT_DIR}/04-after-sintesis.png` });
      screenshots.push('04-after-sintesis.png');
      console.log('   Síntesis generation captured');

      // 6. Check export section
      console.log('6. Checking export section...');
      const exportVisible = await page.locator('text=Exportar a PPTX').isVisible().catch(() => false);
      if (exportVisible) {
        await page.screenshot({ path: `${SCREENSHOT_DIR}/05-export-section.png` });
        screenshots.push('05-export-section.png');
        console.log('   Export section visible!');
      } else {
        console.log('   Export section not visible');
      }
    } else {
      console.log('   Síntesis button NOT visible — page state:');
      const bodyText = await page.locator('body').innerText();
      console.log('   Page text preview:', bodyText.slice(0, 300));
      await page.screenshot({ path: `${SCREENSHOT_DIR}/03-no-sintesis-btn.png` });
      screenshots.push('03-no-sintesis-btn.png');
    }

    // Final screenshot
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-final-state.png` });
    screenshots.push('06-final-state.png');

    console.log('\n=== Demo screenshots captured ===');
    screenshots.forEach(s => console.log('  ' + s));

  } catch (err) {
    console.error('Error:', err.message);
    try {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/error-state.png` });
    } catch {}
  } finally {
    await browser.close();
  }
}

recordDemo();