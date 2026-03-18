import { test, expect } from '@playwright/test'
import { waitForLoadingToFinish } from '../helpers/test-utils'

const ROUTES = [
  { path: '/dashboard', title: 'Dashboard' },
  { path: '/trends', title: 'Trends' },
  { path: '/retention', title: 'Retention' },
  { path: '/paths', title: 'Paths' },
  { path: '/funnels', title: 'Funnels' },
  { path: '/cohorts', title: 'Cohorts' },
  { path: '/journeys', title: 'Journeys' },
  { path: '/events', title: 'Events' },
  { path: '/sessions', title: 'Sessions' },
  { path: '/settings', title: 'Settings' },
  { path: '/help', title: 'Help' },
]

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await waitForLoadingToFinish(page)
  })

  test('sidebar navigation works', async ({ page }) => {
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
    
    const trendsLink = sidebar.locator('a:has-text("Trends")')
    await expect(trendsLink).toBeVisible()
    await trendsLink.click()
    
    await expect(page).toHaveURL(/.*trends/)
    await waitForLoadingToFinish(page)
  })

  test('all routes are accessible', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route.path)
      await waitForLoadingToFinish(page)
      await expect(page).toHaveURL(new RegExp(`.*${route.path}`))
    }
  })

  test('active state shows correctly', async ({ page }) => {
    const sidebar = page.locator('aside')
    
    const dashboardLink = sidebar.locator('a:has-text("Dashboard")')
    await expect(dashboardLink).toHaveClass(/bg-primary/)
    
    await sidebar.locator('a:has-text("Trends")').click()
    await waitForLoadingToFinish(page)
    
    const trendsLink = sidebar.locator('a:has-text("Trends")')
    await expect(trendsLink).toHaveClass(/bg-primary/)
    
    const dashboardLinkAfter = sidebar.locator('a:has-text("Dashboard")')
    await expect(dashboardLinkAfter).not.toHaveClass(/bg-primary/)
  })

  test('sidebar collapses and expands', async ({ page }) => {
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
    
    const initialWidth = await sidebar.evaluate((el) => {
      return el instanceof HTMLElement ? el.offsetWidth : 0
    })
    
    const menuButton = page.locator('header button:has([class*="Menu"])')
    if (await menuButton.isVisible()) {
      await menuButton.click()
      await page.waitForTimeout(500)
      
      const newWidth = await sidebar.evaluate((el) => {
        return el instanceof HTMLElement ? el.offsetWidth : 0
      })
      expect(newWidth).not.toBe(initialWidth)
    }
  })

  test('sidebar collapses on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip()
      return
    }
    
    const sidebar = page.locator('aside')
    await expect(sidebar).not.toBeVisible()
    
    const menuButton = page.locator('header button:has([class*="Menu"])')
    await menuButton.click()
    
    await expect(sidebar).toBeVisible()
  })

  test('navigation groups expand and collapse', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/dashboard')
    await waitForLoadingToFinish(page)
    
    const analyticsGroup = page.locator('button:has-text("Analytics")')
    
    if (await analyticsGroup.isVisible()) {
      await analyticsGroup.click()
      await page.waitForTimeout(300)
      
      const retentionLink = page.locator('a:has-text("Retention")')
      await expect(retentionLink).toBeVisible()
    }
  })

  test('bottom navigation links work', async ({ page }) => {
    const sidebar = page.locator('aside')
    
    const settingsLink = sidebar.locator('a:has-text("Settings")')
    await settingsLink.click()
    await waitForLoadingToFinish(page)
    await expect(page).toHaveURL(/.*settings/)
    
    const helpLink = sidebar.locator('a:has-text("Help")')
    await helpLink.click()
    await waitForLoadingToFinish(page)
    await expect(page).toHaveURL(/.*help/)
  })

  test('brand logo navigates to dashboard', async ({ page }) => {
    await page.goto('/trends')
    await waitForLoadingToFinish(page)
    
    const logo = page.locator('aside a:has-text("stratif.io")')
    await logo.click()
    
    await expect(page).toHaveURL(/.*dashboard/)
  })
})
