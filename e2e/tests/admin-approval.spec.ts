import { expect, test } from '@playwright/test'
import { submitShopApplication } from '../support/api'
import { env } from '../support/env'
import { signInWeb } from '../support/web'

/** An administrator finds a newly submitted shop in the review queue and approves it. */
test('admin approves a submitted shop application', async ({ page }) => {
  const shopName = await submitShopApplication()

  await signInWeb(page, '/admin/login', env.adminEmail, env.adminPassword)
  await page.goto(`${env.web}/admin/shop-review`)
  await page.getByLabel('Tìm cửa hàng').fill(shopName)
  await page.getByRole('row').filter({ hasText: shopName }).getByRole('link', { name: 'Xem hồ sơ' }).click()

  await page.getByRole('button', { name: 'Duyệt cửa hàng' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Duyệt', exact: true }).click()
  await expect(page.getByText(`Đã duyệt ${shopName}`)).toBeVisible()
})
