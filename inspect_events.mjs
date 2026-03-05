import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

// Capture network responses
let eventsApiResponse = null;
page.on('response', async (response) => {
  if (response.url().includes('/api/raw/events')) {
    try {
      const json = await response.json();
      eventsApiResponse = json;
    } catch (e) {}
  }
});

const consoleMessages = [];
page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));

// Go to login page
await page.goto('http://localhost:5173/auth/login');
await page.waitForLoadState('networkidle');

// Fill login form
await page.fill('input[type="email"]', 'admin@openflow.dev');
await page.fill('input[type="password"]', 'password');
await page.click('button[type="submit"]');
await page.waitForURL(url => !url.href.includes('/auth/'), { timeout: 10000 }).catch(() => {});
await page.waitForLoadState('networkidle');
console.log('After login URL:', page.url());

// If still on login, try different credentials
if (page.url().includes('/auth/')) {
  console.log('Login may have failed, trying to see available users...');
  // Check the page for error messages
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('Page text after login attempt:', pageText.substring(0, 300));
}

// Navigate to Events page
await page.goto('http://localhost:5173/events');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(3000);
console.log('Events page URL:', page.url());

const result = await page.evaluate(() => {
  const gridDiv = document.querySelector('.ag-root-wrapper');
  const rows = document.querySelectorAll('.ag-row');
  
  const userCellsInfo = [];
  const userCells = document.querySelectorAll('[col-id="user_id"]');
  userCells.forEach((cell, i) => {
    if (i < 3) userCellsInfo.push({ index: i, innerHTML: cell.innerHTML });
  });

  const allCells = document.querySelectorAll('[col-id]');
  const colIds = new Set();
  allCells.forEach(c => colIds.add(c.getAttribute('col-id')));

  const bodyText = document.body.innerText.substring(0, 500);

  return { gridFound: !!gridDiv, rowCount: rows.length, userCells: userCellsInfo, allColIds: Array.from(colIds), bodyText };
});

console.log('\n=== Grid Inspection ===');
console.log('Grid found:', result.gridFound);
console.log('Row count:', result.rowCount);
console.log('All col IDs:', result.allColIds);
console.log('Page body (first 500):', result.bodyText);
console.log('\nUser ID cells:');
result.userCells.forEach(c => console.log(`  Row ${c.index}:`, c.innerHTML));

if (eventsApiResponse) {
  const records = Array.isArray(eventsApiResponse) 
    ? eventsApiResponse 
    : eventsApiResponse.data || eventsApiResponse.events || eventsApiResponse;
  console.log('\n=== API Response (first 3 records) ===');
  console.log(JSON.stringify(Array.isArray(records) ? records.slice(0,3) : records, null, 2));
} else {
  const apiResult = await page.evaluate(async () => {
    try {
      const r = await fetch('/api/raw/events?limit=3', { credentials: 'include' });
      const text = await r.text();
      try { return JSON.parse(text); } catch { return { rawText: text.substring(0, 500) }; }
    } catch (e) { return { error: e.message }; }
  });
  console.log('\n=== Manual API Fetch (/api/raw/events?limit=3) ===');
  console.log(JSON.stringify(apiResult, null, 2));
}

console.log('\n=== Console Errors Only ===');
consoleMessages.filter(m => m.type === 'error').forEach(m => console.log(`[error] ${m.text}`));

await browser.close();
