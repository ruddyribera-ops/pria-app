import { chromium } from '@playwright/test';

const TXT_PATH = 'D:/Temp/opencode/texto_lenguaje_extraido.txt';
const SCREENSHOT_DIR = 'D:/Temp/opencode/memory/factory/projects/pria-v10/demos/full-materials';

async function demo() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // 1. Login
    console.log('[1] Login');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/materiales', { timeout: 15000 });
    // Wait for React to render the Materiales page content
    await page.waitForSelector('text=Gestión de libros de texto', { timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/G01-login.png` });
    console.log('  OK');

    // 2. Upload TXT (no OCR needed — instant)
    console.log('[2] Upload TXT (26k words from real textbook)');
    await page.locator('input[type="file"]').first().setInputFiles(TXT_PATH);
    console.log('  File set');

    // 3. Wait for curriculum preview (TXT upload is fast)
    console.log('[3] Wait for curriculum preview');
    try {
      await page.waitForSelector('text=Vista Previa del Currículo', { timeout: 20000 });
    } catch { /* continue */ }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/G02-preview.png` });

    // 4. Check Síntesis button
    const sinteticoBtn = page.locator('button').filter({ hasText: /Generar Síntesis con IA/i }).first();
    const btnVisible = await sinteticoBtn.isVisible().catch(() => false);
    console.log(`  Síntesis button: ${btnVisible}`);

    if (!btnVisible) {
      const body = await page.locator('body').innerText();
      console.log('  Page text (first 300):', body.slice(0, 300));
      await page.screenshot({ path: `${SCREENSHOT_DIR}/G03-no-btn.png` });
      return;
    }

    // 5. Click Síntesis — uses full_text fallback since no topics detected
    console.log('[4] Generate Síntesis from source text');
    await sinteticoBtn.click();
    console.log('  Clicked, waiting for MiniMax response...');

    // Poll every 5s for up to 90s (MiniMax can be slow)
    for (let i = 0; i < 18; i++) {
      await page.waitForTimeout(5000);
      const body = await page.locator('body').innerText();
      const hasResult = body.includes('Síntesis Neuro') || body.includes('Enfoque');
      const hasExport = body.includes('Exportar a PPTX');
      const loadingText = await page.locator('text=/Generando|Generación/i').isVisible().catch(() => false);
      console.log(`  t=${String((i+1)*5).padStart(2)}s: result=${hasResult}, export=${hasExport}, loading=${loadingText}`);
      if (hasResult || (!loadingText && i > 5)) {
        await page.screenshot({ path: `${SCREENSHOT_DIR}/G04-sintesis-${String((i+1)*5)}s.png` });
        break;
      }
    }

    // 6. Check all motors and generate
    const finalBody = await page.locator('body').innerText();
    console.log(`\n  Síntesis Neuro: ${finalBody.includes('Síntesis Neuro')}`);
    console.log(`  Enfoque: ${finalBody.includes('Enfoque')}`);
    console.log(`  Export: ${finalBody.includes('Exportar a PPTX')}`);
    console.log(`  ABP: ${finalBody.includes('ABP') || finalBody.includes('proyecto')}`);

    if (finalBody.includes('Exportar a PPTX')) {
      await page.screenshot({ path: `${SCREENSHOT_DIR}/G05-export-visible.png` });

      // Click each export button to trigger generation
      const motorButtons = [
        { name: 'ABP', pattern: /Generar Proyecto ABP|Generar ABP/i },
        { name: 'Quiz', pattern: /Generar Pop Quiz|Generar Quiz/i },
        { name: 'Slides', pattern: /Generar Diapositivas/i },
        { name: 'Plan', pattern: /Plan de Clase/i },
        { name: 'Ficha', pattern: /Generar Ficha/i },
      ];

      for (const m of motorButtons) {
        const btn = page.locator('button').filter({ hasText: m.pattern }).first();
        const vis = await btn.isVisible().catch(() => false);
        if (vis) {
          console.log(`  Clicking ${m.name}...`);
          await btn.click();
          await page.waitForTimeout(12000);
          await page.screenshot({ path: `${SCREENSHOT_DIR}/G06-${m.name.toLowerCase()}.png` });
        }
      }
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/G07-final.png` });
    const finalBody2 = await page.locator('body').innerText();
    console.log(`\n[FINAL STATE]`);
    console.log(`  Síntesis result: ${finalBody2.includes('Síntesis Neuro')}`);
    console.log(`  Export buttons: ${(finalBody2.match(/Exportar/gi) || []).length}`);
    if (consoleErrors.length > 0) {
      console.log('  Console errors:', consoleErrors.slice(0, 5));
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

demo();