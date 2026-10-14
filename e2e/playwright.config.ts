import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests against the real local stack: backend on :8080, web (seller/admin) on :5173, mobile on Expo web
 * (customer) on :8081, Mailpit on :8025. globalSetup seeds the demo data (backend/demo-data/seed.mjs).
 * Set E2E_BROWSER_CHANNEL=msedge (or chrome) to use an installed browser instead of `npx playwright install chromium`.
 */
const channel = process.env.E2E_BROWSER_CHANNEL

export default defineConfig({
  testDir: './tests',
  globalSetup: './support/global-setup.ts',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'e2e',
      use: { ...devices['Desktop Chrome'], ...(channel ? { channel } : {}) },
    },
  ],
})
