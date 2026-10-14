/** Where the stack runs and who signs in; every value can be overridden through the environment. */
export const env = {
  api: process.env.E2E_API_URL ?? 'http://localhost:8080',
  web: process.env.E2E_WEB_URL ?? 'http://localhost:5173',
  mobile: process.env.E2E_MOBILE_URL ?? 'http://localhost:8081',
  mailpit: process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025',
  adminEmail: process.env.ADMIN_EMAIL ?? '',
  adminPassword: process.env.ADMIN_PASSWORD ?? '',
  demoPassword: process.env.DEMO_PASSWORD ?? 'bonbon-demo-2027',
}

/** Demo accounts created by backend/demo-data/seed.mjs. */
export const demo = {
  /** khach4 has the fewest open orders in the seed (a customer may have at most 3 open at once). */
  customer: 'demo.khach4@example.com',
  /** Owner of "Bánh mì Nắng" (the 4th demo shop). */
  seller: 'demo.seller4@example.com',
  shop: 'Bánh mì Nắng',
  /** A dish without option groups, so the dish sheet adds it in one tap. */
  dish: 'Xôi xéo',
}
