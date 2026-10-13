import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from './env'

/** Checks the stack is up, then seeds the demo data with every shop open so orders can be placed at any hour. */
export default async function globalSetup() {
  for (const [name, url] of [['backend', `${env.api}/actuator/health`], ['web', env.web], ['mobile (Expo web)', env.mobile], ['Mailpit', env.mailpit]]) {
    const ok = await fetch(url).then((r) => r.ok).catch(() => false)
    if (!ok) throw new Error(`${name} is not reachable at ${url}; start the stack first (see e2e/README.md).`)
  }
  if (!env.adminEmail || !env.adminPassword) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (the backend admin seed).')

  const here = dirname(fileURLToPath(import.meta.url))
  const seed = resolve(process.env.E2E_SEED_SCRIPT ?? resolve(here, '../../backend/demo-data/seed.mjs'))
  if (!existsSync(seed)) throw new Error(`Seed script not found at ${seed}; set E2E_SEED_SCRIPT.`)
  execFileSync(process.execPath, [seed, '--always-open'], {
    stdio: 'inherit',
    env: { ...process.env, BONBON_API: env.api, BONBON_MAILPIT: env.mailpit },
  })
}
