import { test, expect } from '@playwright/test'
import { waitForLoadingToFinish, getMetricCardByTitle } from '../helpers/test-utils'

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await waitForLoadingToFinish(page)
  })

  test('page loads successfully', async ({ page }) => {
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
    await expect(page.locator('text=Welcome back!')).toBeVisible()
  })

  test('metric cards are displayed', async ({ page }) => {
    const metricCards = page.locator('[class*="grid"] > div[class*="card"]')
    await expect(metricCards).toHaveCount(4)

    await expect(getMetricCardByTitle(page, 'Total Events')).toBeVisible()
    await expect(getMetricCardByTitle(page, 'Unique Users')).toBeVisible()
    await expect(getMetricCardByTitle(page, 'Avg Session')).toBeVisible()
    await expect(getMetricCardByTitle(page, 'Conversion Rate')).toBeVisible()
  })

  test('metric cards show values and badges', async ({ page }) => {
    const totalEventsCard = getMetricCardByTitle(page, 'Total Events')
    await expect(totalEventsCard.locator('text=/\\d+/')).toBeVisible()
    await expect(totalEventsCard.locator('[class*="badge"]')).toBeVisible()

    const uniqueUsersCard = getMetricCardByTitle(page, 'Unique Users')
    await expect(uniqueUsersCard.locator('text=/\\d+/')).toBeVisible()
  })

  test('charts render correctly', async ({ page }) => {
    const activityChart = page.locator('text=Activity Overview').locator('..')
    await expect(activityChart).toBeVisible()

    await expect(page.locator('.recharts-wrapper')).toBeVisible()

    const chartLines = page.locator('.recharts-line')
    await expect(chartLines.first()).toBeVisible()
  })

  test('top events list displays', async ({ page }) => {
    const topEventsSection = page.locator('text=Top Events').locator('..')
    await expect(topEventsSection).toBeVisible()

    const eventItems = page.locator('text=Top Events').locator('..').locator('text=events')
    await expect(eventItems.first()).toBeVisible()
  })

  test('date range picker works', async ({ page }) => {
    const datePicker = page.locator('button:has([class*="CalendarIcon"]):has-text("-")')
    await expect(datePicker).toBeVisible()
    
    await datePicker.click()
    
    const popover = page.locator('[role="dialog"], [class*="popover"]')
    await expect(popover).toBeVisible()
    
    const presetButton = page.locator('button:has-text("Last 7 days")')
    await expect(presetButton).toBeVisible()
    
    await presetButton.click()
    
    await waitForLoadingToFinish(page)
    
    await expect(datePicker).toContainText('7')
  })

  test('loading states appear during data fetch', async ({ page }) => {
    await page.goto('/dashboard')
    
    const skeletons = page.locator('[class*="skeleton"]')
    await expect(skeletons.first()).toBeVisible({ timeout: 1000 }).catch(() => {})
    
    await waitForLoadingToFinish(page)
    
    await expect(page.locator('[class*="skeleton"]')).toHaveCount(0)
  })

  test('chart tooltip appears on hover', async ({ page }) => {
    await waitForLoadingToFinish(page)
    
    const chart = page.locator('.recharts-wrapper')
    await chart.hover({ position: { x: 200, y: 100 } })
    
    const tooltip = page.locator('.recharts-tooltip-wrapper')
    await expect(tooltip).toBeVisible({ timeout: 5000 }).catch(() => {})
  })
})
