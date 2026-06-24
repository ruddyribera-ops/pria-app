import { chromium } from '@playwright/test';

const PDF_PATH = 'D:/Users/Windows/Desktop/01_Escuela/PLANIFICACION 2026/PDC_5TO DE PRIMARIA/PRIMER TRIMESTRE_2026/LENGUAJE Y COMUNICACION _ 2026/Text pages/Texto de lenguaje.pdf';
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
    console.log('   ✓ Logged in');

    // 2. Upload real textbook PDF
    console.log('[2] Upload PDF (11.6 MB)...');
    await page.locator('input[type="file"]').first().setInputFiles(PDF_PATH);
    console.log('   ✓ File set');

    // 3. Wait for curriculum preview to appear
    console.log('[3] Wait for curriculum preview (up to 120s for OCR)...');
    try {
      await page.waitForSelector('text=Vista Previa del Currículo', { timeout: 120000 });
      console.log('   ✓ Preview appeared');
    } catch {
      console.log('   ⚠ Timeout — checking page state');
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/demo-02-uploaded.png` });

    // 4. Check what topics were detected
    const noTopics = await page.locator('text=No se detectaron temas').isVisible().catch(() => false);
    console.log(`   Topics detected: ${!noTopics}`);

    // 5. Click Síntesis
    console.log('[4] Click Síntesis');
    const sinteticoBtn = page.locator('button').filter({ hasText: /Generar Síntesis con IA/i }).first();
    const btnVisible = await sinteticoBtn.isVisible().catch(() => false);
    console.log(`   Button visible: ${btnVisible}`);

    if (btnVisible) {
      await sinteticoBtn.click();
      console.log('   ✓ Clicked — waiting 15s for generation...');
      await page.waitForTimeout(15000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/demo-03-after-sintesis.png` });

      // 6. Check for Síntesis result and export section
      const body = await page.locator('body').innerText();
      const hasSintesisResult = body.includes('Síntesis Neuro') || body.includes('Enfoque');
      const hasExport = body.includes('Exportar a PPTX');
      console.log(`   Síntesis result visible: ${hasSintesisResult}`);
      console.log(`   Export section visible: ${hasExport}`);

      if (hasExport) {
        await page.screenshot({ path: `${SCREENSHOT_DIR}/demo-04-export.png` });
        console.log('   ✓ Export screenshot captured');
      }

      // 7. Try clicking export if visible
      if (hasExport) {
        console.log('[5] Try export...');
        const exportBtn = page.locator('button').filter({ hasText: /Exportar Todo|Exportar.*Síntesis/i }).first();
        const exportBtnVisible = await exportBtn.isVisible().catch(() => false);
        if (exportBtnVisible) {
          await exportBtn.click();
          await page.waitForTimeout(3000);
          await page.screenshot({ path: `${SCREENSHOT_DIR}/demo-05-export-click.png` });
          console.log('   ✓ Export clicked');
        }
      }
    }

    // Final screenshot
    await page.screenshot({ path: `${SCREENSHOT_DIR}/demo-06-final.png` });
    console.log('\n=== Done ===');

  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/demo-error.png` }).catch(() => {});
  } finally {
    await browser.close();
  }
}

demo();