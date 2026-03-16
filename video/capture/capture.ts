import { chromium, type Locator, type Page } from '@playwright/test'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { waitFor } from './wait-for'

// process.cwd() is always `openflow/video/` when run via `npm run capture`
const OSS_ROOT = path.resolve(process.cwd(), '..')
const PUBLIC   = path.resolve(process.cwd(), 'public')
const TMP_DIR  = path.resolve(PUBLIC, 'tmp')
const APP_URL  = 'http://localhost:8000'

const W = 1920
const H = 1080

const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// ── Smooth mouse movement ────────────────────────────────────────────────────

let mouseX = 0
let mouseY = 0

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

async function moveThenClick(page: Page, locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) { await locator.click(); return }
  const tx = box.x + box.width / 2
  const ty = box.y + box.height / 2
  const sx = mouseX, sy = mouseY
  const steps = 24
  for (let i = 1; i <= steps; i++) {
    const t = easeInOut(i / steps)
    await page.mouse.move(sx + (tx - sx) * t, sy + (ty - sy) * t)
    await pause(12)
  }
  mouseX = tx
  mouseY = ty
  await page.mouse.click(tx, ty)
}

// Apply zoom-out and inject cursor overlay
async function setup(page: Page) {
  await page.evaluate(() => { ;(document.documentElement as HTMLElement).style.zoom = '0.92' })
  await injectCursor(page)
}

// Inject a custom cursor overlay so it appears in the video recording
async function injectCursor(page: Page) {
  await page.evaluate(() => {
    // Cursor dot
    const cursor = document.createElement('div')
    cursor.id = '__recorder_cursor__'
    Object.assign(cursor.style, {
      position: 'fixed', zIndex: '999999', pointerEvents: 'none',
      width: '20px', height: '20px', borderRadius: '50%',
      backgroundColor: 'rgba(0,0,0,0.75)',
      border: '2px solid rgba(255,255,255,0.9)',
      transform: 'translate(-50%, -50%)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      top: '-40px', left: '-40px',
      transition: 'width 0.08s, height 0.08s',
    })

    // Click ripple
    const ripple = document.createElement('div')
    ripple.id = '__recorder_ripple__'
    Object.assign(ripple.style, {
      position: 'fixed', zIndex: '999998', pointerEvents: 'none',
      width: '0px', height: '0px', borderRadius: '50%',
      border: '2px solid rgba(37,99,235,0.7)',
      transform: 'translate(-50%, -50%)',
      top: '-40px', left: '-40px',
      opacity: '0',
    })

    document.body.appendChild(cursor)
    document.body.appendChild(ripple)

    document.addEventListener('mousemove', (e) => {
      // CSS zoom on <html> scales the layout but clientX/Y stay in viewport pixels.
      // Fixed elements are positioned in the zoomed coordinate space, so we must
      // divide by the zoom factor to align the overlay with the real pointer.
      const zoom = parseFloat((document.documentElement as HTMLElement).style.zoom) || 1
      const x = e.clientX / zoom
      const y = e.clientY / zoom
      cursor.style.left = x + 'px'
      cursor.style.top  = y + 'px'
      ripple.style.left = x + 'px'
      ripple.style.top  = y + 'px'
    }, { passive: true })

    document.addEventListener('mousedown', () => {
      // Shrink cursor on press
      cursor.style.width  = '14px'
      cursor.style.height = '14px'
      // Ripple expand — use a style tag with a keyframe so no CSS transition conflict
      ripple.style.width   = '0px'
      ripple.style.height  = '0px'
      ripple.style.opacity = '1'
      let size = 0
      const interval = setInterval(() => {
        size += 4
        ripple.style.width  = size + 'px'
        ripple.style.height = size + 'px'
        ripple.style.opacity = String(Math.max(0, 1 - size / 60))
        if (size >= 60) clearInterval(interval)
      }, 16)
    })

    document.addEventListener('mouseup', () => {
      cursor.style.width  = '20px'
      cursor.style.height = '20px'
    })
  })
}

// ── Music ────────────────────────────────────────────────────────────────────

const MUSIC_FILE = path.resolve(PUBLIC, 'music.mp3')
// Replace public/music.mp3 with any file you prefer — this is just a fallback download
const MUSIC_URL  = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3'

async function ensureMusic() {
  if (fs.existsSync(MUSIC_FILE)) return
  console.log('→ Downloading background music (CC0)...')
  const res = await fetch(MUSIC_URL)
  if (!res.ok) throw new Error(`Failed to download music: ${res.status}`)
  fs.writeFileSync(MUSIC_FILE, Buffer.from(await res.arrayBuffer()))
  console.log('✓ Music saved')
}

// ── Env check ────────────────────────────────────────────────────────────────

function checkEnv() {
  const envFile = path.join(OSS_ROOT, '.env')
  if (!fs.existsSync(envFile)) {
    console.error(`❌  Missing .env at ${envFile}`)
    process.exit(1)
  }
  if (!fs.readFileSync(envFile, 'utf8').includes('OPENFLOW_ENCRYPTION_KEY')) {
    console.error('❌  OPENFLOW_ENCRYPTION_KEY not in .env')
    process.exit(1)
  }
}

// ── Per-scene recorder ───────────────────────────────────────────────────────

type SceneFn = (page: Page) => Promise<void>

async function record(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  name: string,
  fn: SceneFn,
): Promise<string> {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    recordVideo: { dir: TMP_DIR, size: { width: W, height: H } },
  })
  const page = await ctx.newPage()
  await fn(page)
  const tmpPath = await page.video()!.path()
  await ctx.close()

  const dest = path.join(PUBLIC, `${name}.webm`)
  fs.renameSync(tmpPath, dest)
  console.log(`  ✓ ${name}.webm`)
  return dest
}

// ── Scenes ───────────────────────────────────────────────────────────────────

async function sceneDashboard(page: Page) {
  await page.goto(`${APP_URL}/dashboard`)
  await page.waitForLoadState('domcontentloaded')
  await setup(page)
  await pause(2000)
}

async function sceneAddConnection(page: Page) {
  await page.goto(`${APP_URL}/connections`)
  await page.waitForLoadState('domcontentloaded')
  await setup(page)
  await pause(700)

  // Open dialog
  await moveThenClick(page, page.getByRole('button', { name: /add connection|add your first connection/i }).first())
  await pause(600)

  // Fill form
  await page.getByLabel('Connection Name').fill('Sample Analytics')
  await pause(400)

  // Select DuckDB (Label is not linked via htmlFor — target the first combobox)
  await moveThenClick(page, page.getByRole('combobox').first())
  await pause(300)
  await moveThenClick(page, page.getByRole('option', { name: 'DuckDB' }))
  await pause(400)

  await page.getByLabel(/file path/i).fill('/data/sample.duckdb')
  await pause(500)

  // Let the viewer read the filled form
  await pause(1200)

  // Submit
  await moveThenClick(page, page.getByRole('button', { name: 'Create' }))
  await pause(900)
}

async function sceneSchema(page: Page) {
  // Navigate to connections list and open the newly created connection
  await page.goto(`${APP_URL}/connections`)
  await page.waitForLoadState('domcontentloaded')
  await setup(page)
  await pause(400)

  await moveThenClick(page, page.locator('p.truncate', { hasText: 'Sample Analytics' }).first())
  await page.waitForURL(/\/connections\/[^/]+$/, { timeout: 10000 })
  await page.waitForSelector('button:has-text("Schema Mapping")', { timeout: 10000 })
  await pause(400)

  // Schema Mapping tab
  await moveThenClick(page, page.getByRole('button', { name: 'Schema Mapping' }))
  await pause(700)

  // Detect from Schema
  await moveThenClick(page, page.getByRole('button', { name: /detect from schema/i }))
  await page.waitForFunction(
    () => ![...document.querySelectorAll('button')].some((b) => b.textContent?.includes('Detecting')),
    { timeout: 15000 },
  )
  await pause(800)

  // Smooth scroll down to reveal detected schema results
  await page.evaluate(() =>
    window.scrollTo({ top: 500, behavior: 'smooth' }),
  )
  await pause(2000)
}

async function sceneFilters(page: Page) {
  // Navigate back to the connection detail
  await page.goto(`${APP_URL}/connections`)
  await page.waitForLoadState('domcontentloaded')
  await setup(page)
  await pause(300)

  await moveThenClick(page, page.locator('p.truncate', { hasText: 'Sample Analytics' }).first())
  await page.waitForURL(/\/connections\/[^/]+$/, { timeout: 10000 })
  await page.waitForSelector('button:has-text("Global Filters")', { timeout: 10000 })
  await pause(300)

  // Global Filters tab
  await moveThenClick(page, page.getByRole('button', { name: 'Global Filters' }))
  await pause(700)

  // Enable country and city checkboxes (id="filter-<fieldname>")
  await moveThenClick(page, page.locator('#filter-country'))
  await pause(500)
  await moveThenClick(page, page.locator('#filter-city'))
  await pause(500)

  // Let the viewer see the enabled state + auto-save
  await pause(1200)
}

// Dashboard filter + Pivot in the same browser context so the country/date filter carries over
async function sceneDashboardAndPivot(page: Page) {
  await page.goto(`${APP_URL}/dashboard`)
  await page.waitForLoadState('domcontentloaded')
  await setup(page)
  // Short pause — let viewer see the charts start rendering
  await pause(600)

  // Wait for charts to be visible, then linger so the viewer can appreciate the dashboard
  await page.waitForSelector('[aria-label="Global filters"] button', { timeout: 10000 })
  await pause(3000)

  // Open country dimension filter
  await moveThenClick(page, page.locator('[aria-label="Global filters"] button', { hasText: /^All /i }).first())
  await pause(2000)

  // Options in Radix portal — click "United States" or first non-empty option
  await page.waitForSelector('[data-radix-popper-content-wrapper] button', { timeout: 10000 })
  const usOption = page.locator('[data-radix-popper-content-wrapper] button', { hasText: /US/i })
  if (await usOption.count() > 0) {
    await moveThenClick(page, usOption.first())
  } else {
    await moveThenClick(page, page.locator('[data-radix-popper-content-wrapper] button').first())
  }
  await pause(2000)

  // Now select "Year to date" from DateRangePicker
  await moveThenClick(page, page.locator('[aria-label="Global filters"] button').first())
  await pause(1000)

  // Presets are buttons inside the calendar popover
  await page.waitForSelector('[data-radix-popper-content-wrapper] button', { timeout: 10000 })
  const ytdBtn = page.locator('[data-radix-popper-content-wrapper] button', { hasText: /year to date/i })
  if (await ytdBtn.count() > 0) {
    await moveThenClick(page, ytdBtn.first())
    await pause(1500)
  }

  // Close the popover and let viewer see the result
  await page.keyboard.press('Escape')
  await pause(2000)

  // Navigate to Pivot — filter state is preserved in Zustand (localStorage) + same session
  await page.goto(`${APP_URL}/pivot`)
  await page.waitForLoadState('domcontentloaded')
  await setup(page)
  await pause(800)

  // GROUP BY — add month (index 0 = GROUP BY zone)
  await moveThenClick(page, page.getByRole('button', { name: 'Field' }).nth(0))
  await pause(600)
  await moveThenClick(page, page.getByRole('button', { name: /month/i }).first())
  await pause(1200)

  // PIVOT — add city (index 1 = PIVOT zone)
  await moveThenClick(page, page.getByRole('button', { name: 'Field' }).nth(1))
  await pause(600)
  await moveThenClick(page, page.getByRole('button', { name: /city/i }).first())
  await pause(1200)

  // VALUES — count events (index 2 = VALUES zone)
  await moveThenClick(page, page.getByRole('button', { name: 'Field' }).nth(2))
  await pause(600)
  await moveThenClick(page, page.getByRole('button', { name: /event/i }).first())
  await pause(1200)

  // VALUES — count distinct user_id (field may render as "user_id" or "User" depending on UI)
  await moveThenClick(page, page.getByRole('button', { name: 'Field' }).nth(2))
  await pause(600)
  // Prefer exact user_id label; fall back to any user-related option
  const userIdBtn = page.locator('button').filter({ hasText: /user_id/i })
  if (await userIdBtn.count() > 0) {
    await moveThenClick(page, userIdBtn.first())
  } else {
    await moveThenClick(page, page.getByRole('button', { name: /user/i }).first())
  }
  await pause(1000)

  // Let the pivot table render
  await page.waitForLoadState('domcontentloaded')
  await pause(3000)
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  checkEnv()
  await ensureMusic()

  // Ensure tmp dir exists and is empty
  fs.rmSync(TMP_DIR, { recursive: true, force: true })
  fs.mkdirSync(TMP_DIR, { recursive: true })

  console.log('→ Starting app via docker compose...')
  execSync('docker compose up -d', { cwd: OSS_ROOT, stdio: 'inherit' })
  await pause(4000)

  try {
    console.log('→ Waiting for app to be healthy...')
    await waitFor(APP_URL)
    console.log('✓ App ready')

    // Wipe existing connections so UI starts with 0
    console.log('→ Clearing existing connections...')
    execSync(
      `docker compose exec -T app python -c ` +
      `"import sqlite3; db = sqlite3.connect('/data/openflow_product.sqlite'); ` +
      `db.execute('DELETE FROM connections'); db.commit(); print('done')"`,
      { cwd: OSS_ROOT, stdio: 'inherit' },
    )

    console.log('→ Installing Playwright Chromium...')
    execSync('npx playwright install chromium', { stdio: 'inherit' })

    const browser = await chromium.launch({ args: ['--no-sandbox'] })

    console.log('→ Recording scenes...')
    await record(browser, 'scene-01-connection',      sceneAddConnection)
    await record(browser, 'scene-02-schema',          sceneSchema)
    await record(browser, 'scene-03-filters',         sceneFilters)
    await record(browser, 'scene-04-dashboard-pivot', sceneDashboardAndPivot)

    await browser.close()

    // Clean up tmp dir (individual scenes already moved to public/)
    fs.rmSync(TMP_DIR, { recursive: true, force: true })

    console.log('✓ All scenes saved to', PUBLIC)
  } finally {
    console.log('→ Stopping app...')
    execSync('docker compose down', { cwd: OSS_ROOT, stdio: 'inherit' })
    console.log('✓ Done')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
