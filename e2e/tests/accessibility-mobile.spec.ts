import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { env } from '../support/env'

/**
 * The app on Expo web at a phone size: axe (WCAG 2.2 AA, serious/critical fail) on the customer and seller screens,
 * and every pressable at least 44×44 px (the app's own rule is 48 dp; 44 is the iOS minimum and leaves room for
 * how react-native-web rounds sizes). Expo web renders the same components with their accessibility props as ARIA.
 * Switches are left out of the size check: they are the platform's own control, sized by Android/iOS on a phone
 * (react-native-web draws a 40×20 stand-in).
 */
const CUSTOMER = ['/customer', '/customer/orders', '/customer/messages', '/customer/account', '/customer/addresses',
  '/customer/address-form', '/customer/cart', '/customer/notifications', '/customer/notification-settings', '/customer/help',
  '/customer/support']
const SELLER = ['/seller', '/seller/menu', '/seller/shop', '/seller/earnings', '/seller/statistics', '/seller/reviews',
  '/seller/performance', '/seller/order-cases', '/seller/messages', '/seller/notifications', '/seller/notification-settings',
  '/seller/help', '/seller/support']

test.use({ viewport: { width: 400, height: 860 } })

async function signIn(page: Page, email: string) {
  await page.goto(env.mobile)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mật khẩu').fill(env.demoPassword)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await page.waitForURL(/\/(customer|seller)/)
}

async function audit(page: Page, paths: string[]) {
  const problems: string[] = []
  const small: string[] = []
  for (const path of paths) {
    await page.goto(env.mobile + path)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    for (const v of result.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical')) {
      problems.push(`${path} ${v.id} ×${v.nodes.length} ${v.nodes[0]?.target}`)
    }
    const tiny = await page.evaluate(() =>
      [...document.querySelectorAll('[role=button], button, [role=link], a[href], [role=checkbox], [role=radio], [role=tab]')]
        .filter((e) => {
          const r = e.getBoundingClientRect()
          return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && (r.width < 44 || r.height < 44)
        })
        .map((e) => `${e.getAttribute('aria-label') ?? (e.textContent ?? '').trim().slice(0, 30)} ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`))
    small.push(...tiny.map((t) => `${path}: ${t}`))
  }
  test.info().annotations.push(...small.map((s) => ({ type: 'small target', description: s })))
  expect(problems).toEqual([])
  expect(small).toEqual([])
}

test('customer screens', async ({ page }) => {
  await signIn(page, 'demo.khach2@example.com')
  await audit(page, CUSTOMER)
})

test('seller screens', async ({ page }) => {
  await signIn(page, 'demo.seller2@example.com')
  await audit(page, SELLER)
})
