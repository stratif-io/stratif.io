import { test as setup } from '@playwright/test'
import { STORAGE_STATE } from '../helpers/test-utils'

setup('authenticate', async ({ page }) => {
  await page.goto('/')
  
  await page.context().storageState({ path: STORAGE_STATE })
})
