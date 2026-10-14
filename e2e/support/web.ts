import { expect, type Page } from '@playwright/test'
import { env } from './env'

/** Signs in on the web app (seller or admin login page) and waits to leave the login page. */
export async function signInWeb(page: Page, path: string, email: string, password: string) {
  await page.goto(env.web + path)
  await page.getByLabel('Email').fill(email)
  await page.getByRole('textbox', { name: 'Mật khẩu' }).fill(password)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).not.toHaveURL(new RegExp(`${path}$`))
}
