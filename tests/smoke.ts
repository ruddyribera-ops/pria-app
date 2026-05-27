import { chromium } from '@playwright/test';

async function smokeTest() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  console.log('Browser launched');
  
  const page = await browser.newPage();
  console.log('Navigating to login...');
  
  await page.goto('http://localhost:5173/login');
  console.log('Login page loaded, URL:', page.url());
  
  const title = await page.title();
  console.log('Page title:', title);
  
  await browser.close();
  console.log('Done!');
}

smokeTest().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});