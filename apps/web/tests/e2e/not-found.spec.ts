import { test, expect } from '@playwright/test'

test.describe('404 Not Found page', () => {
  test('shows 404 page for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-xyz')
    await expect(page.getByRole('heading', { name: 'Nothing to chart here' })).toBeVisible()
    await expect(page.getByText(/This page has zero data points/i)).toBeVisible()
  })

  test('has working link back to dashboard', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-xyz')
    await page.getByRole('link', { name: /back to dashboard/i }).click()
    await expect(page).toHaveURL(/\/dashboard(\?.*)?$/)
  })
})
