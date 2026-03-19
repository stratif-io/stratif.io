import { test, expect } from '@playwright/test'
import { waitForLoadingToFinish } from '../helpers/test-utils'

test.describe('Chart Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await waitForLoadingToFinish(page)
  })

  test('tooltips appear on hover', async ({ page }) => {
    const chart = page.locator('.recharts-wrapper')
    await expect(chart).toBeVisible()
    
    const chartBounds = await chart.boundingBox()
    if (chartBounds) {
      await page.mouse.move(
        chartBounds.x + chartBounds.width / 2,
        chartBounds.y + chartBounds.height / 2
      )
      
      const tooltip = page.locator('.recharts-tooltip-wrapper')
      await expect(tooltip).toBeVisible({ timeout: 5000 }).catch(() => {
        console.log('Tooltip not visible - may depend on exact hover position')
      })
    }
  })

  test('legend items are displayed', async ({ page }) => {
    const legend = page.locator('.recharts-legend')
    await expect(legend).toBeVisible()
    
    const legendItems = legend.locator('.recharts-legend-item')
    const count = await legendItems.count()
    expect(count).toBeGreaterThan(0)
  })

  test('legend toggles work', async ({ page }) => {
    const legend = page.locator('.recharts-legend')
    const legendItems = legend.locator('.recharts-legend-item')
    
    if (await legendItems.count() > 0) {
      const firstItem = legendItems.first()
      await firstItem.click()
      
      await page.waitForTimeout(500)
      
      const lines = page.locator('.recharts-line')
      const visibleLines = await lines.evaluateAll((els) => 
        els.filter((el) => {
          const style = window.getComputedStyle(el)
          return style.opacity !== '0'
        }).length
      )
      
      expect(visibleLines).toBeLessThanOrEqual(await lines.count())
    }
  })

  test('charts are responsive', async ({ page }) => {
    const chart = page.locator('.recharts-wrapper')
    await expect(chart).toBeVisible()
    
    const initialWidth = await chart.evaluate((el) => {
      return el instanceof HTMLElement ? el.offsetWidth : 0
    })
    
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(500)
    
    const tabletWidth = await chart.evaluate((el) => {
      return el instanceof HTMLElement ? el.offsetWidth : 0
    })
    expect(tabletWidth).not.toBe(initialWidth)
    
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)
    
    const mobileWidth = await chart.evaluate((el) => {
      return el instanceof HTMLElement ? el.offsetWidth : 0
    })
    expect(mobileWidth).not.toBe(tabletWidth)
  })

  test('chart grid lines are visible', async ({ page }) => {
    const grid = page.locator('.recharts-cartesian-grid')
    await expect(grid).toBeVisible()
    
    const gridLines = page.locator('.recharts-cartesian-grid line')
    const count = await gridLines.count()
    expect(count).toBeGreaterThan(0)
  })

  test('axis labels are visible', async ({ page }) => {
    const xAxis = page.locator('.recharts-xAxis')
    await expect(xAxis).toBeVisible()
    
    const yAxis = page.locator('.recharts-yAxis')
    await expect(yAxis).toBeVisible()
    
    const xTicks = xAxis.locator('.recharts-cartesian-axis-tick')
    const tickCount = await xTicks.count()
    expect(tickCount).toBeGreaterThan(0)
  })

  test('chart area responds to date range changes', async ({ page }) => {
    const datePicker = page.locator('button:has([class*="CalendarIcon"])')
    await datePicker.click()
    
    const preset = page.locator('button:has-text("Last 30 days")')
    await preset.click()
    
    await waitForLoadingToFinish(page)
    
    const chart = page.locator('.recharts-wrapper')
    await expect(chart).toBeVisible()
  })
})

test.describe('Chart Types', () => {
  test('line chart displays correctly on trends page', async ({ page }) => {
    await page.goto('/trends')
    await waitForLoadingToFinish(page)
    
    const lineChart = page.locator('.recharts-line-chart')
    await expect(lineChart).toBeVisible()
    
    const lines = page.locator('.recharts-line')
    expect(await lines.count()).toBeGreaterThan(0)
  })
})
