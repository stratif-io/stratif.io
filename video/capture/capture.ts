import { chromium } from '@playwright/test'
import { execSync, spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { waitFor } from './wait-for'

const OSS_ROOT = path.resolve(__dirname, '../../')
const OUTPUT = path.resolve(__dirname, '../public/capture.webm')
const APP_URL = 'http://localhost:8000'

const PAGES = [
  { path: '/', label: 'Dashboard', waitMs: 2500 },
  { path: '/trends', label: 'Trends', waitMs: 2500 },
  { path: '/funnels', label: 'Funnels', waitMs: 2500 },
  { path: '/paths', label: 'Paths', waitMs: 2500 },
]

function checkEnv() {
  const envFile = path.join(OSS_ROOT, '.env')
  if (!fs.existsSync(envFile)) {
    console.error(`❌  Missing .env file at ${envFile}`)
    console.error('    Create one with: echo "OPENFLOW_ENCRYPTION_KEY=$(openssl rand -base64 32)" > .env')
    process.exit(1)
  }
  const contents = fs.readFileSync(envFile, 'utf8')
  if (!contents.includes('OPENFLOW_ENCRYPTION_KEY')) {
    console.error('❌  OPENFLOW_ENCRYPTION_KEY not found in .env')
    console.error('    Add it with: echo "OPENFLOW_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env')
    process.exit(1)
  }
}

async function main() {
  checkEnv()

  console.log('→ Starting app via docker compose...')
  execSync('docker compose up -d', { cwd: OSS_ROOT, stdio: 'inherit' })

  try {
    console.log('→ Waiting for app to be healthy...')
    await waitFor(APP_URL)
    console.log('✓ App ready')

    console.log('→ Installing Playwright Chromium...')
    execSync('npx playwright install chromium', { stdio: 'inherit' })

    const browser = await chromium.launch({ args: ['--no-sandbox'] })
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: path.join(__dirname, '../public/'), size: { width: 1280, height: 720 } },
    })
    const page = await context.newPage()

    for (const { path: pagePath, label, waitMs } of PAGES) {
      console.log(`→ Recording: ${label}`)
      await page.goto(`${APP_URL}${pagePath}`)
      await page.waitForLoadState('networkidle')
      await new Promise((r) => setTimeout(r, waitMs))
    }

    const videoPath = await page.video()?.path()
    await context.close()
    await browser.close()

    if (!videoPath) throw new Error('No video recorded')

    // Playwright names the file with a random UUID — rename to capture.webm
    fs.renameSync(videoPath, OUTPUT)
    console.log(`✓ Saved capture to ${OUTPUT}`)
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
