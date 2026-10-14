# End-to-end tests

Playwright tests that drive the real apps against the real local stack:

| Test | What it covers |
|---|---|
| `tests/order-flow.spec.ts` | A customer signs in on the app (Expo web), opens a shop in the area, adds a dish, places a cash order; the shop signs in on the web, takes the order, prepares it, sends it out and marks it delivered; the customer sees "Đã giao" |
| `tests/admin-approval.spec.ts` | A new seller submits a complete shop application (through the API); the administrator finds it in the review queue on the web and approves it |

Before the tests, `support/global-setup.ts` checks the stack is up and runs `backend/demo-data/seed.mjs --always-open`
(every demo shop open all day, so the tests pass at any hour). Selectors are roles and accessible names only.

## Run

1. Start the stack: Docker services (`deploy/compose.dev.yaml`), the backend (`:8080`), the web app (`cd web && npm run dev`,
   `:5173`) and the app on Expo web (`cd mobile && npm run web`, `:8081`).
2. Install once: `cd e2e && npm install`, then either `npx playwright install chromium` or use a browser you already
   have with `E2E_BROWSER_CHANNEL=msedge` (or `chrome`).
3. Run (Git Bash):

```bash
cd e2e
ADMIN_EMAIL=... ADMIN_PASSWORD=... DEMO_REDIS_CONTAINER=bonbon-dev-redis-1 npm test
```

`ADMIN_EMAIL` / `ADMIN_PASSWORD` are the backend's admin seed. `DEMO_REDIS_CONTAINER` lets the seed and the
approval test clear the local per-IP registration counter (5 per hour) instead of failing with 429; never set it
against production.

On failure, traces and screenshots are kept in `test-results/`; open the HTML report with `npm run report`, a trace with
`npx playwright show-trace test-results/<test>/trace.zip`.

## Settings

| Variable | Default |
|---|---|
| `E2E_API_URL`, `E2E_WEB_URL`, `E2E_MOBILE_URL`, `E2E_MAILPIT_URL` | `http://localhost:8080`, `:5173`, `:8081`, `:8025` |
| `E2E_SEED_SCRIPT` | `../backend/demo-data/seed.mjs` |
| `DEMO_PASSWORD` | `bonbon-demo-2027` (must match the seed) |
| `E2E_BROWSER_CHANNEL` | unset (bundled Chromium) |

## Reseed from scratch

See `backend/demo-data/README.md` ("Start over"). The order test cancels the customer's leftover "waiting for the shop"
orders first, because a customer may have at most 3 open orders.
