import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { env } from '../support/env'
import { signInWeb } from '../support/web'

/**
 * WCAG 2.2 AA checks (axe) on every page of the web app, signed out, as a seller and as an administrator.
 * Pages that need an id are reached through their list page instead. Fails on serious or critical violations.
 */
const PUBLIC = ['/', '/seller/login', '/admin/login', '/seller/register', '/forgot-password', '/legal/CUSTOMER_TERMS']
const SELLER = ['/seller', '/seller/shop', '/seller/orders', '/seller/menu', '/seller/statistics', '/seller/performance',
  '/seller/order-cases', '/seller/chat', '/seller/help', '/seller/support-tickets', '/seller/notification-settings',
  '/seller/earnings', '/seller/reviews', '/seller/account', '/seller/category-cases']
const ADMIN = ['/admin', '/admin/statistics', '/admin/merchants', '/admin/shop-review', '/admin/categories',
  '/admin/category-moderation', '/admin/commission', '/admin/settlement', '/admin/refunds', '/admin/order-cases',
  '/admin/penalties', '/admin/reviews', '/admin/lookup', '/admin/support-tickets', '/admin/help-articles',
  '/admin/legal-documents', '/admin/app-config', '/admin/admins']

type Finding = { page: string; rule: string; impact: string; count: number; help: string; target: string }

async function audit(page: Page, paths: string[]): Promise<Finding[]> {
  const findings: Finding[] = []
  for (const path of paths) {
    await page.goto(env.web + path)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300) // let skeletons settle
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    for (const v of result.violations) {
      findings.push({ page: path, rule: v.id, impact: v.impact ?? 'unknown', count: v.nodes.length, help: v.help, target: String(v.nodes[0]?.target ?? '') })
    }
  }
  return findings
}

function report(findings: Finding[]) {
  test.info().annotations.push(...findings.map((f) => ({ type: `${f.impact} ${f.rule}`, description: `${f.page} ×${f.count}: ${f.help} (${f.target})` })))
  const blocking = findings.filter((f) => f.impact === 'serious' || f.impact === 'critical')
  expect(blocking.map((f) => `${f.page} ${f.rule} ×${f.count} ${f.target}`)).toEqual([])
}

test('public pages', async ({ page }) => {
  report(await audit(page, PUBLIC))
})

test('seller pages', async ({ page }) => {
  await signInWeb(page, '/seller/login', 'demo.seller1@example.com', env.demoPassword)
  report(await audit(page, SELLER))
})

test('admin pages', async ({ page }) => {
  await signInWeb(page, '/admin/login', env.adminEmail, env.adminPassword)
  report(await audit(page, ADMIN))
})

test('keyboard users can skip to the main content', async ({ page }) => {
  await signInWeb(page, '/seller/login', 'demo.seller1@example.com', env.demoPassword)
  await page.goto(`${env.web}/seller/orders`)
  const skip = page.getByRole('link', { name: 'Bỏ qua đến nội dung chính' })
  // The workspace mounts after the session check; a Tab pressed before that goes nowhere.
  await expect(skip).toBeAttached()
  await page.keyboard.press('Tab')
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main#main')).toBeFocused()
})

test('no horizontal scrolling at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await signInWeb(page, '/admin/login', env.adminEmail, env.adminPassword)
  const wide: string[] = []
  for (const path of ['/', '/admin', '/admin/shop-review', '/admin/merchants', '/admin/statistics', '/admin/settlement']) {
    await page.goto(env.web + path)
    await page.waitForLoadState('networkidle')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    if (overflow > 1) wide.push(`${path} +${overflow}px`)
  }
  expect(wide).toEqual([])
})
