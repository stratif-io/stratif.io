const { chromium } = require('./node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  page.on('console', msg => console.log(`[${msg.type()}]`, msg.text()));
  page.on('request', req => {
    if (req.url().includes('/api/raw/events')) console.log('REQUEST:', decodeURIComponent(req.url()))
  });

  await page.goto('http://localhost:5173/auth/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', 'carlo.abichahine@gmail.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  await page.goto('http://localhost:5173/events');
  await page.waitForTimeout(5000);
  console.log('Events page loaded');

  await page.evaluate(() => {
    document.addEventListener('click', (e) => {
      const cell = e.target.closest('.ag-cell');
      if (cell) {
        const colId = cell.getAttribute('col-id');
        const value = cell.innerText;
        console.log('[CLICK] col-id="' + colId + '" value="' + value + '"');
      }
    }, true);
  });

  console.log('Click listener injected. Now click on cells in Chrome...');
  await page.waitForTimeout(300000);
  await browser.close();
})();
