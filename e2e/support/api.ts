import { execFileSync } from 'node:child_process'
import { env } from './env'

/** Small API client for test setup and for reading state the UI doesn't print in a stable place. */
export async function api<T = unknown>(method: string, path: string, opts: { token?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`
  let body: BodyInit | undefined
  if (opts.form) body = opts.form
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }
  const res = await fetch(env.api + path, { method, headers, body })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`)
  return (text ? JSON.parse(text) : null) as T
}

type LoginResponse = { needsRoleSelection: boolean; roleToken?: string; tokens: { accessToken: string } }

export async function login(email: string, role: 'CUSTOMER' | 'SELLER', password = env.demoPassword): Promise<string> {
  let data = await api<LoginResponse>('POST', '/api/auth/login', { body: { email, password } })
  if (data.needsRoleSelection) data = await api<LoginResponse>('POST', '/api/auth/select-role', { body: { roleToken: data.roleToken, role } })
  return data.tokens.accessToken
}

export async function adminLogin(): Promise<string> {
  return (await api<{ accessToken: string }>('POST', '/api/admin/auth/login', { body: { email: env.adminEmail, password: env.adminPassword } })).accessToken
}

async function verificationToken(email: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const found = await fetch(`${env.mailpit}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}&limit=5`).then((r) => r.json())
    for (const m of found.messages ?? []) {
      const msg = await fetch(`${env.mailpit}/api/v1/message/${m.ID}`).then((r) => r.json())
      const match = /verify-email\?token=([A-Za-z0-9_-]+)/.exec(`${msg.Text ?? ''} ${msg.HTML ?? ''}`)
      if (match) return match[1]
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`No verification email for ${email}`)
}

/** The API allows 5 registrations per IP per hour; on a local stack, clear that counter (see DEMO_REDIS_CONTAINER). */
function resetRegisterLimit() {
  const container = process.env.DEMO_REDIS_CONTAINER
  if (!container) return
  const keys = execFileSync('docker', ['exec', container, 'redis-cli', '--scan', '--pattern', 'register_count:ip:*'], { encoding: 'utf8' })
    .split(/\s+/).filter(Boolean)
  if (keys.length) execFileSync('docker', ['exec', container, 'redis-cli', 'del', ...keys])
}

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')

/**
 * Registers a fresh seller (unique email) and submits a complete shop application, so the admin queue has
 * something new to approve. Returns the shop name.
 */
export async function submitShopApplication(): Promise<string> {
  const stamp = Date.now().toString(36)
  const email = `e2e.seller.${stamp}@example.com`
  const name = `Quán thử E2E ${stamp}`
  const doc = async (type: string) => (await api<{ id: string }>('GET', `/api/legal/documents/${type}`)).id
  const [terms, privacy] = [await doc('SELLER_TERMS'), await doc('PRIVACY_POLICY')]

  resetRegisterLimit()
  await api('POST', '/api/auth/register', { body: { email, password: env.demoPassword, name: 'Người bán E2E', role: 'SELLER', acceptedDocumentIds: [terms, privacy] } })
  await api('GET', `/api/auth/verify-email?token=${await verificationToken(email)}`)
  const token = await login(email, 'SELLER')

  const [place] = await api<{ placeId: string }[]>('GET', `/api/geo/autocomplete?input=${encodeURIComponent('Vinhomes Smart City Tây Mỗ')}`, { token })
  const hours = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, opensAt: '07:00', closesAt: '21:00' }))
  const steps = [
    { name, phone: '0900000399', email, placeId: place.placeId, addressDetail: 'Ki-ốt thử nghiệm' },
    { openingHours: hours, deliveryRadiusKm: 2, deliveryFee: 5000 },
    { businessType: 'INDIVIDUAL', businessAddress: 'Ki-ốt thử nghiệm', taxCode: '0100000000', invoiceEmails: [email],
      bankName: 'Vietcombank', accountNumber: '0000000000', accountHolderName: 'Người bán E2E' },
    { docType: 'CCCD', docNumber: '000000000000', fullName: 'Người bán E2E', accuracyConfirmed: true,
      sellerTermsDocumentId: terms, privacyPolicyDocumentId: privacy },
  ]
  for (const [i, body] of steps.entries()) await api('PUT', `/api/merchant/shop/steps/${i + 1}`, { token, body })
  for (const kind of ['identity-front', 'identity-selfie']) {
    const form = new FormData()
    form.append('file', new Blob([PNG], { type: 'image/png' }), 'id.png')
    await api('POST', `/api/merchant/shop/files/${kind}`, { token, form })
  }
  await api('POST', '/api/merchant/shop/submit', { token })
  return name
}

/** Cancels the customer's orders still waiting for the shop, left behind by an earlier failed run. */
export async function cancelWaitingOrders(token: string) {
  const { items } = await api<{ items: { id: string; status: string }[] }>('GET', '/api/orders?size=50', { token })
  for (const o of items.filter((x) => x.status === 'PLACED')) {
    await api('POST', `/api/orders/${o.id}/cancel`, { token, body: { reason: 'Dọn dữ liệu kiểm thử.' } })
  }
}
