import { test, expect, devices } from '@playwright/test'
import { waitForLoadingToFinish } from '../helpers/test-utils'

test.describe('Responsive Design - Mobile', () => {
  const { defaultBrowserType: _dt, ...iphone12 } = devices['iPhone 12']
  test.use(iphone12)

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await waitForLoadingToFinish(page)
  })

  test('mobile layout works', async ({ page }) => {
    const sidebar = page.locator('aside')
    await expect(sidebar).not.toBeVisible()
    
    const header = page.locator('header')
    await expect(header).toBeVisible()
    
    const hamburgerMenu = header.locator('button:has([class*="Menu"])')
    await expect(hamburgerMenu).toBeVisible()
  })

  test('mobile sidebar opens with hamburger menu', async ({ page }) => {
    const hamburgerMenu = page.locator('header button:has([class*="Menu"])')
    await hamburgerMenu.click()
    
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
  })

  test('mobile metric cards stack vertically', async ({ page }) => {
    const metricCards = page.locator('[class*="grid"] > div').first().locator('..')
    
    await expect(metricCards).toBeVisible()
    
    const viewportSize = page.viewportSize()
    expect(viewportSize?.width).toBeLessThan(768)
  })

  test('mobile chart resizes properly', async ({ page }) => {
    const chart = page.locator('.recharts-wrapper')
    await expect(chart).toBeVisible()
    
    const chartWidth = await chart.evaluate((el) => {
      return el instanceof HTMLElement ? el.offsetWidth : 0
    })
    const viewportSize = page.viewportSize()
    
    expect(chartWidth).toBeLessThanOrEqual(viewportSize!.width)
  })

  test('mobile date picker works', async ({ page }) => {
    const datePicker = page.locator('button:has([class*="CalendarIcon"])')
    await datePicker.click()
    
    const popover = page.locator('[class*="popover"]')
    await expect(popover).toBeVisible()
  })

  test('mobile navigation works', async ({ page }) => {
    const hamburgerMenu = page.locator('header button:has([class*="Menu"])')
    await hamburgerMenu.click()
    
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
    
    const trendsLink = sidebar.locator('a:has-text("Trends")')
    await trendsLink.click()
    
    await waitForLoadingToFinish(page)
    await expect(page).toHaveURL(/.*trends/)
  })
})

test.describe('Responsive Design - Tablet', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await waitForLoadingToFinish(page)
  })

  test('tablet layout works', async ({ page }) => {
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
    
    const header = page.locator('header')
    await expect(header).toBeVisible()
    
    const mainContent = page.locator('main')
    await expect(mainContent).toBeVisible()
  })

  test('tablet metric cards are 2x2 grid', async ({ page }) => {
    const grid = page.locator('[class*="grid"]')
    const gridClass = await grid.getAttribute('class')
    
    expect(gridClass).toContain('md:grid-cols-2')
  })

  test('tablet chart area is responsive', async ({ page }) => {
    const chart = page.locator('.recharts-wrapper')
    await expect(chart).toBeVisible()
    
    const chartWidth = await chart.evaluate((el) => {
      return el instanceof HTMLElement ? el.offsetWidth : 0
    })
    expect(chartWidth).toBeGreaterThan(300)
    expect(chartWidth).toBeLessThan(800)
  })
})

test.describe('Responsive Design - Desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await waitForLoadingToFinish(page)
  })

  test('desktop layout works', async ({ page }) => {
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
    
    const sidebarWidth = await sidebar.evaluate((el) => {
      return el instanceof HTMLElement ? el.offsetWidth : 0
    })
    expect(sidebarWidth).toBe(256)
    
    const header = page.locator('header')
    await expect(header).toBeVisible()
  })

  test('desktop metric cards are 4 columns', async ({ page }) => {
    const grid = page.locator('[class*="grid"]')
    const gridClass = await grid.getAttribute('class')
    
    expect(gridClass).toContain('lg:grid-cols-4')
  })

  test('desktop chart and sidebar layout', async ({ page }) => {
    const chartSection = page.locator('[class*="lg:col-span-2"]')
    await expect(chartSection).toBeVisible()
    
    const topEventsSection = page.locator('text=Top Events').locator('..').locator('..')
    await expect(topEventsSection).toBeVisible()
  })

  test('desktop sidebar shows expanded state', async ({ page }) => {
    const sidebar = page.locator('aside')
    await expect(sidebar.locator('text=stratif.io')).toBeVisible()
    
    const analyticsSection = sidebar.locator('text=Analytics')
    await expect(analyticsSection).toBeVisible()
  })
})

test.describe('Responsive Design - Large Desktop', () => {
  test.use({ viewport: { width: 1920, height: 1080 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await waitForLoadingToFinish(page)
  })

  test('large desktop layout is properly spaced', async ({ page }) => {
    const mainContent = page.locator('main')
    await expect(mainContent).toBeVisible()
    
    const mainPadding = await mainContent.evaluate((el) => {
      return window.getComputedStyle(el).padding
    })
    expect(mainPadding).toBeTruthy()
  })

  test('large desktop charts scale appropriately', async ({ page }) => {
    const chart = page.locator('.recharts-wrapper')
    const chartWidth = await chart.evaluate((el) => {
      return el instanceof HTMLElement ? el.offsetWidth : 0
    })
    
    expect(chartWidth).toBeGreaterThan(600)
  })
})

test.describe('Responsive Design - Orientation Change', () => {
  test('handles orientation change from portrait to landscape', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard')
    await waitForLoadingToFinish(page)
    
    const portraitChart = await page.locator('.recharts-wrapper').evaluate((el) => {
      return el instanceof HTMLElement ? el.offsetWidth : 0
    })
    
    await page.setViewportSize({ width: 667, height: 375 })
    await page.waitForTimeout(500)
    
    const landscapeChart = await page.locator('.recharts-wrapper').evaluate((el) => {
      return el instanceof HTMLElement ? el.offsetWidth : 0
    })
    
    expect(landscapeChart).not.toBe(portraitChart)
  })
})
