const { chromium } = require('./node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('ERROR:', msg.text())
  });
  page.on('request', req => {
    if (req.url().includes('/api/raw/events')) console.log('REQUEST:', decodeURIComponent(req.url()))
  });

  await page.goto('http://localhost:5173/auth/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', 'carlo.abichahine@gmail.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log('After login:', page.url());

  if (!page.url().includes('auth')) {
    await page.goto('http://localhost:5173/events');
    await page.waitForTimeout(5000);
    console.log('Events page loaded, URL:', page.url());
  }

  console.log('Browser open for 5 minutes...');
  await page.waitForTimeout(300000);
  await browser.close();
})();
