import { expect, test } from '@playwright/test'
import { api, cancelWaitingOrders, login } from '../support/api'
import { demo, env } from '../support/env'
import { signInWeb } from '../support/web'

/**
 * The core path: a customer orders cash on delivery in the app (Expo web), the shop takes the order on the web
 * and walks it to delivered, and the customer sees every step.
 */
test('customer orders, shop fulfils, customer sees it delivered', async ({ browser }) => {
  const token = await login(demo.customer, 'CUSTOMER')
  await cancelWaitingOrders(token)

  const customerCtx = await browser.newContext({ viewport: { width: 400, height: 860 } })
  const sellerCtx = await browser.newContext()
  const customer = await customerCtx.newPage()
  const seller = await sellerCtx.newPage()

  // Customer: sign in, open the shop, add a dish, place the order.
  await customer.goto(env.mobile)
  await customer.getByLabel('Email').fill(demo.customer)
  await customer.getByLabel('Mật khẩu').fill(env.demoPassword)
  await customer.getByRole('button', { name: 'Đăng nhập', exact: true }).click()

  await customer.getByRole('button', { name: `${demo.shop}, đang mở` }).click()
  await customer.getByRole('button', { name: demo.dish, exact: true }).click()
  await customer.getByRole('button', { name: /^Thêm vào giỏ/ }).click()
  await customer.getByRole('button', { name: /^Xem giỏ hàng/ }).click()
  await customer.getByText('Tiền mặt khi nhận hàng').click()
  await customer.getByRole('button', { name: /^Đặt đơn/ }).click()

  await customer.waitForURL(/\/customer\/order\?id=/)
  const orderId = new URL(customer.url()).searchParams.get('id')!
  await expect(customer.getByText('Chờ quán xác nhận').first()).toBeVisible()
  const { number } = await api<{ number: number }>('GET', `/api/orders/${orderId}`, { token })

  // Shop: sign in on the web, take the order and move it forward step by step.
  await signInWeb(seller, '/seller/login', demo.seller, env.demoPassword)
  await seller.goto(`${env.web}/seller/orders`)
  const row = seller.getByRole('listitem').filter({ has: seller.getByRole('button', { name: `Mở đơn #${number}` }) })
  await row.getByRole('button', { name: 'Nhận đơn' }).click()

  await seller.getByRole('tab', { name: /Đang làm/ }).click()
  for (const step of ['Bắt đầu chuẩn bị', 'Giao đi', 'Đã giao xong']) {
    await row.getByRole('button', { name: step }).click()
    if (step !== 'Đã giao xong') await expect(row.getByRole('button', { name: step })).toBeHidden()
  }

  // Customer: the order shows as delivered.
  await customer.reload()
  await expect(customer.getByText('Đã giao').first()).toBeVisible()

  await customerCtx.close()
  await sellerCtx.close()
})
