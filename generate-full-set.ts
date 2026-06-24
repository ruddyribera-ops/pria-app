import { chromium } from '@playwright/test';

const PDF_PATH = 'D:/Users/Windows/Desktop/01_Escuela/PLANIFICACION 2026/PDC_5TO DE PRIMARIA/PRIMER TRIMESTRE_2026/LENGUAJE Y COMUNICACION _ 2026/Text pages/Texto de lenguaje.pdf';
const SCREENSHOT_DIR = 'D:/Temp/opencode/memory/factory/projects/pria-v10/demos/full-materials';

async function generateFullSet() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const screenshots: string[] = [];

  const snap = async (name: string) => {
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png` });
    screenshots.push(name);
    console.log(`  📸 ${name}`);
  };

  try {
    // Ensure screenshot dir exists
    await page.goto('data:text/html,<h1>init</h1>').catch(() => {});

    // 1. Login
    console.log('\n[1] LOGIN');
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/materiales', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await snap('01-login');
    console.log('  ✓ Logged in as admin');

    // 2. Upload PDF
    console.log('\n[2] UPLOAD PDF (this may take a few minutes for OCR)...');
    await page.locator('input[type="file"]').first().setInputFiles(PDF_PATH);
    await snap('02-pdf-uploaded');
    console.log('  ✓ PDF selected — waiting for OCR + curriculum detection...');

    // 3. Wait for curriculum preview (OCR takes time on scanned PDF)
    console.log('  Waiting for curriculum preview...');
    let previewReady = false;
    for (let i = 0; i < 60; i++) { // up to 10 min
      const preview = await page.locator('text=Vista Previa del Currículo').isVisible().catch(() => false);
      const noTopics = await page.locator('text=No se detectaron temas').isVisible().catch(() => false);
      if (preview || noTopics) {
        previewReady = true;
        console.log(`  ✓ Preview ready after ~${(i+1)*10}s`);
        break;
      }
      await page.waitForTimeout(10000);
      if (i % 6 === 0) console.log(`  ...${(i+1)*10}s elapsed, still processing...`);
    }

    await page.waitForTimeout(3000);
    await snap('03-curriculum-preview');

    // 4. Check topics detected
    const noTopics = await page.locator('text=No se detectaron temas').isVisible().catch(() => false);
    console.log(`  Topics detected: ${!noTopics}`);

    // 5. Click Síntesis
    console.log('\n[3] GENERATE SÍNTESIS');
    const sinteticoBtn = page.locator('button').filter({ hasText: /Generar Síntesis con IA/i }).first();
    const btnVisible = await sinteticoBtn.isVisible().catch(() => false);
    if (!btnVisible) {
      console.log('  ✗ Síntesis button not visible — check page state');
      await snap('03b-no-sintesis-btn');
    } else {
      await sinteticoBtn.click();
      console.log('  ✓ Síntesis clicked — waiting 20s...');
      await page.waitForTimeout(20000);
      await snap('04-sintesis-result');

      const body = await page.locator('body').innerText();
      console.log(`  Síntesis Neuro: ${body.includes('Síntesis Neuro')}`);
      console.log(`  Enfoque: ${body.includes('Enfoque')}`);
      console.log(`  Export section: ${body.includes('Exportar a PPTX')}`);
    }

    // 6. Generate Slides
    console.log('\n[4] GENERATE SLIDES');
    const slidesBtn = page.locator('button').filter({ hasText: /Generar Diapositivas/i }).first();
    const slidesVisible = await slidesBtn.isVisible().catch(() => false);
    if (slidesVisible) {
      await slidesBtn.click();
      console.log('  ✓ Slides clicked — waiting 15s...');
      await page.waitForTimeout(15000);
      await snap('05-slides-result');
    } else {
      console.log('  ✗ Slides button not visible');
    }

    // 7. Generate Quiz
    console.log('\n[5] GENERATE QUIZ');
    const quizBtn = page.locator('button').filter({ hasText: /Generar Quiz|Generar Pop Quiz/i }).first();
    const quizVisible = await quizBtn.isVisible().catch(() => false);
    if (quizVisible) {
      await quizBtn.click();
      console.log('  ✓ Quiz clicked — waiting 15s...');
      await page.waitForTimeout(15000);
      await snap('06-quiz-result');
    } else {
      console.log('  ✗ Quiz button not visible');
    }

    // 8. Generate ABP
    console.log('\n[6] GENERATE ABP');
    const abpBtn = page.locator('button').filter({ hasText: /Generar Proyecto ABP|Generar ABP/i }).first();
    const abpVisible = await abpBtn.isVisible().catch(() => false);
    if (abpVisible) {
      await abpBtn.click();
      console.log('  ✓ ABP clicked — waiting 15s...');
      await page.waitForTimeout(15000);
      await snap('07-abp-result');
    } else {
      console.log('  ✗ ABP button not visible');
    }

    // 9. Generate Plan
    console.log('\n[7] GENERATE PLAN');
    const planBtn = page.locator('button').filter({ hasText: /Generar Plan|Plan de Clase/i }).first();
    const planVisible = await planBtn.isVisible().catch(() => false);
    if (planVisible) {
      await planBtn.click();
      console.log('  ✓ Plan clicked — waiting 15s...');
      await page.waitForTimeout(15000);
      await snap('08-plan-result');
    } else {
      console.log('  ✗ Plan button not visible');
    }

    // 10. Generate Ficha
    console.log('\n[8] GENERATE FICHA GAMIFICADA');
    const fichaBtn = page.locator('button').filter({ hasText: /Generar Ficha/i }).first();
    const fichaVisible = await fichaBtn.isVisible().catch(() => false);
    if (fichaVisible) {
      await fichaBtn.click();
      console.log('  ✓ Ficha clicked — waiting 15s...');
      await page.waitForTimeout(15000);
      await snap('09-ficha-result');
    } else {
      console.log('  ✗ Ficha button not visible');
    }

    // 11. Final state - show export panel
    await snap('10-final-state');
    const body = await page.locator('body').innerText();
    const exportCount = (body.match(/Exportar/gi) || []).length;
    console.log(`\n[RESULTS]`);
    console.log(`  Export buttons found: ${exportCount}`);
    console.log(`  Síntesis Neuro: ${body.includes('Síntesis Neuro')}`);
    console.log(`  ABP: ${body.includes('proyecto') || body.includes('ABP')}`);
    console.log(`  Quiz: ${body.includes('Quiz') || body.includes('quiz')}`);
    console.log(`  Slides: ${body.includes('Diapositiva') || body.includes('slide')}`);

    console.log(`\n=== SCREENSHOTS CAPTURED ===`);
    screenshots.forEach(s => console.log(`  ${s}`));

  } catch (err) {
    console.error('Error:', err.message);
    await snap('error');
  } finally {
    await browser.close();
  }
}

generateFullSet();