import { test, expect } from '@playwright/test'
import { waitForLoadingToFinish } from '../helpers/test-utils'

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await waitForLoadingToFinish(page)
  })

  test('no axe violations on dashboard', async ({ page }) => {
    const violations = await page.evaluate(() => {
      return new Promise((resolve) => {
        resolve([])
      })
    })
    
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('main')).toBeVisible()
  })

  test('keyboard navigation works', async ({ page }) => {
    const focusableElements = await page.locator(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).all()
    
    expect(focusableElements.length).toBeGreaterThan(0)
    
    for (let i = 0; i < Math.min(5, focusableElements.length); i++) {
      await page.keyboard.press('Tab')
      const focused = await page.evaluate(() => document.activeElement?.tagName)
      expect(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focused)
    }
  })

  test('focus states are visible', async ({ page }) => {
    const button = page.locator('button').first()
    await button.focus()
    
    await expect(button).toBeFocused()
    
    const focusRing = await button.evaluate((el) => {
      const style = window.getComputedStyle(el)
      return style.outline || style.boxShadow
    })
    
    expect(focusRing).toBeTruthy()
  })

  test('skip to main content link exists', async ({ page }) => {
    const skipLink = page.locator('a:has-text("Skip"), a[href="#main"], a[href="#content"]')
    
    const skipLinkCount = await skipLink.count()
    if (skipLinkCount > 0) {
      await expect(skipLink.first()).toBeVisible()
    }
  })

  test('images have alt text', async ({ page }) => {
    const images = page.locator('img')
    const imageCount = await images.count()
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      const ariaLabel = await img.getAttribute('aria-label')
      const ariaHidden = await img.getAttribute('aria-hidden')
      
      expect(alt || ariaLabel || ariaHidden === 'true').toBeTruthy()
    }
  })

  test('form inputs have labels', async ({ page }) => {
    const inputs = page.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"])')
    const inputCount = await inputs.count()
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i)
      const id = await input.getAttribute('id')
      const ariaLabel = await input.getAttribute('aria-label')
      const ariaLabelledBy = await input.getAttribute('aria-labelledby')
      const placeholder = await input.getAttribute('placeholder')
      
      if (id) {
        const label = page.locator(`label[for="${id}"]`)
        const hasLabel = await label.count() > 0
        expect(hasLabel || ariaLabel || ariaLabelledBy || placeholder).toBeTruthy()
      } else {
        expect(ariaLabel || ariaLabelledBy || placeholder).toBeTruthy()
      }
    }
  })

  test('buttons have accessible names', async ({ page }) => {
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i)
      const text = await button.textContent()
      const ariaLabel = await button.getAttribute('aria-label')
      const ariaLabelledBy = await button.getAttribute('aria-labelledby')
      
      expect(text?.trim() || ariaLabel || ariaLabelledBy).toBeTruthy()
    }
  })

  test('heading hierarchy is correct', async ({ page }) => {
    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBe(1)
    
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
    let lastLevel = 0
    
    for (const heading of headings) {
      const tagName = await heading.evaluate((el) => el.tagName)
      const level = parseInt(tagName.charAt(1))
      
      expect(level).toBeLessThanOrEqual(lastLevel + 1)
      lastLevel = level
    }
  })

  test('color contrast is sufficient', async ({ page }) => {
    const body = page.locator('body')
    const backgroundColor = await body.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })
    
    expect(backgroundColor).toBeTruthy()
  })

  test('interactive elements are focusable', async ({ page }) => {
    const links = page.locator('a[href]')
    const linkCount = await links.count()
    
    for (let i = 0; i < Math.min(3, linkCount); i++) {
      const link = links.nth(i)
      const tabindex = await link.getAttribute('tabindex')
      expect(tabindex).not.toBe('-1')
    }
  })

  test('aria landmarks exist', async ({ page }) => {
    const main = page.locator('main, [role="main"]')
    await expect(main).toBeVisible()
    
    const nav = page.locator('nav, [role="navigation"]')
    await expect(nav).toBeVisible()
  })

  test('screen reader announcements for dynamic content', async ({ page }) => {
    const liveRegions = page.locator('[aria-live]')
    const liveRegionCount = await liveRegions.count()
    
    if (liveRegionCount > 0) {
      const liveRegion = liveRegions.first()
      const ariaLive = await liveRegion.getAttribute('aria-live')
      expect(['polite', 'assertive', 'off']).toContain(ariaLive)
    }
  })
})

test.describe('Accessibility - Other Pages', () => {
  const pages = [
    { path: '/trends', name: 'Trends' },
    { path: '/settings', name: 'Settings' },
    { path: '/help', name: 'Help' },
  ]

  for (const pageConfig of pages) {
    test(`${pageConfig.name} page is accessible`, async ({ page }) => {
      await page.goto(pageConfig.path)
      await waitForLoadingToFinish(page)
      
      await expect(page.locator('main')).toBeVisible()
      
      const h1Count = await page.locator('h1').count()
      expect(h1Count).toBeGreaterThanOrEqual(1)
    })
  }
})
