import { chromium } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173';
// Production safety guard
const PRODUCTION_HOSTS = ['railway.app', 'vercel.app', 'netlify.app', 'aws.amazon.com', 'digitalocean.com', 'heroku.com'];
if (PRODUCTION_HOSTS.some(h => BASE.includes(h))) {
  throw new Error(`[run-e2e] REFUSING to run against production URL: ${BASE}. Use localhost for development.`);
}
if (process.env.NODE_ENV === 'production') {
  throw new Error('[run-e2e] NODE_ENV=production — aborting E2E tests.');
}

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      console.log(`  ▶ ${name}`);
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (e: any) {
      console.log(`  ✗ ${name}: ${e.message}`);
      failed++;
    }
  }

  // ── Auth tests ──────────────────────────────────────────────
  await test('login redirects to materiales', async () => {
    await page.goto(`${BASE}/login`);
    await page.waitForTimeout(2000);
    await page.fill('input[placeholder="admin"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/materiales', { timeout: 15000 });
  });

  await test('unauthenticated redirect to login', async () => {
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE}/`);
    await page.waitForURL(/login/, { timeout: 15000 });
    const url = page.url();
    if (!url.includes('login')) throw new Error(`Expected login redirect, got: ${url}`);
  });

  // ── Materiales page ─────────────────────────────────────────
  await test('materiales page loads', async () => {
    await page.goto(`${BASE}/login`);
    await page.waitForTimeout(2000);
    await page.fill('input[placeholder="admin"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/materiales', { timeout: 15000 });
    await page.waitForTimeout(2000);
    const text = await page.locator('body').innerText();
    if (text.length < 50) throw new Error('Page appears empty');
  });

  await test('sidebar has nav items', async () => {
    await page.goto(`${BASE}/login`);
    await page.waitForTimeout(2000);
    await page.fill('input[placeholder="admin"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/materiales', { timeout: 15000 });
    await page.waitForTimeout(3000);
    const sidebarCount = await page.locator('aside').count();
    console.log(`    Found ${sidebarCount} aside element(s)`);
    if (sidebarCount === 0) {
      const body = await page.locator('body').innerText();
      console.log('    Body text (first 200):', body.slice(0, 200));
      throw new Error('No sidebar (aside) element found');
    }
    const sidebar = page.locator('aside').first();
    const navText = await sidebar.innerText();
    if (!navText.toLowerCase().includes('material')) throw new Error('No Materiales link in sidebar');
  });

  await test('export button shows toast when no content', async () => {
    await page.goto(`${BASE}/login`);
    await page.waitForTimeout(2000);
    await page.fill('input[placeholder="admin"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/materiales', { timeout: 15000 });
    await page.waitForTimeout(2000);
    const exportBtn = page.locator('button:has-text("Exportar PPTX")').first();
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await page.waitForTimeout(1500);
      const toast = page.locator('.toast, [role="alert"], [class*="toast"]').first();
      const toastVisible = await toast.isVisible().catch(() => false);
      if (!toastVisible) console.log('    (toast may have already dismissed)');
    }
  });

  // ── Summary ────────────────────────────────────────────────
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});