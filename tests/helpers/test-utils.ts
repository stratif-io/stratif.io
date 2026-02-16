import { Page, Locator, expect } from '@playwright/test'

export const STORAGE_STATE = 'tests/.auth/user.json'

export async function waitForLoadingToFinish(page: Page): Promise<void> {
  const skeletons = page.locator('[class*="skeleton"]')
  
  await expect(skeletons).toHaveCount(0, { timeout: 30000 }).catch(() => {})
  
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})
  
  await page.waitForTimeout(500)
}

export async function login(page: Page, options?: { 
  username?: string
  password?: string 
}): Promise<void> {
  const username = options?.username || process.env.TEST_USERNAME || 'testuser'
  const password = options?.password || process.env.TEST_PASSWORD || 'testpassword'
  
  await page.goto('/login')
  
  const usernameInput = page.locator('input[name="username"], input[type="text"]').first()
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first()
  
  if (await usernameInput.isVisible()) {
    await usernameInput.fill(username)
    await passwordInput.fill(password)
    
    const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")')
    await loginButton.click()
    
    await waitForLoadingToFinish(page)
  }
}

export function getMetricCardByTitle(page: Page, title: string): Locator {
  return page.locator(`text=${title}`).locator('..').locator('..')
}

export async function takeScreenshot(
  page: Page, 
  name: string, 
  options?: { 
    fullPage?: boolean 
    mask?: Locator[] 
  }
): Promise<Buffer> {
  return await page.screenshot({
    path: `tests/screenshots/${name}.png`,
    fullPage: options?.fullPage ?? false,
    mask: options?.mask,
  })
}

export async function compareScreenshots(
  page: Page,
  name: string,
  threshold: number = 0.1
): Promise<boolean> {
  try {
    await expect(page).toHaveScreenshot(`${name}.png`, {
      maxDiffPixels: Math.round(1280 * 720 * threshold),
    })
    return true
  } catch {
    return false
  }
}

export async function waitForApiCall(
  page: Page, 
  urlPattern: string | RegExp,
  options?: { timeout?: number }
): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url()
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern)
      }
      return urlPattern.test(url)
    },
    { timeout: options?.timeout ?? 30000 }
  )
}

export async function mockApiRoute(
  page: Page,
  urlPattern: string | RegExp,
  response: unknown,
  options?: { status?: number }
): Promise<void> {
  await page.route(
    typeof urlPattern === 'string' ? `**/${urlPattern}` : urlPattern,
    (route) => {
      route.fulfill({
        status: options?.status ?? 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      })
    }
  )
}

export async function clearLocalStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

export async function setTheme(page: Page, theme: 'light' | 'dark' | 'system'): Promise<void> {
  await page.evaluate((t) => {
    localStorage.setItem('openflow-storage', JSON.stringify({
      state: { theme: t },
      version: 0
    }))
  }, theme)
  
  await page.reload()
  await waitForLoadingToFinish(page)
}

export async function setDateRange(
  page: Page, 
  from: Date, 
  to: Date
): Promise<void> {
  const datePicker = page.locator('button:has([class*="CalendarIcon"])')
  await datePicker.click()
  
  const fromInput = page.locator('input[type="date"]').first()
  const toInput = page.locator('input[type="date"]').last()
  
  await fromInput.fill(from.toISOString().split('T')[0])
  await toInput.fill(to.toISOString().split('T')[0])
  
  const applyButton = page.locator('button:has-text("Apply")')
  await applyButton.click()
  
  await waitForLoadingToFinish(page)
}

export async function toggleSidebar(page: Page): Promise<void> {
  const menuButton = page.locator('header button:has([class*="Menu"])')
  if (await menuButton.isVisible()) {
    await menuButton.click()
    await page.waitForTimeout(300)
  }
}

export async function getChartLegendItems(page: Page): Promise<string[]> {
  const legend = page.locator('.recharts-legend-item-text')
  const items = await legend.allTextContents()
  return items.map((text) => text.trim())
}

export async function isElementVisibleInViewport(
  page: Page,
  selector: string
): Promise<boolean> {
  return await page.locator(selector).evaluate((el) => {
    const rect = el.getBoundingClientRect()
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    )
  })
}

export async function scrollToElement(page: Page, selector: string): Promise<void> {
  await page.locator(selector).scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
}
