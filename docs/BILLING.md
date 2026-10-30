# Company billing (Stripe)

Companies pay for this product with a Stripe subscription. The plans are Starter, Growth, and Scale, priced in INR per month. This is separate from the wallet. The wallet still uses the Transaction Junction API and does not move money through Stripe.

Company admins manage that subscription at `/customer/billing`. This document covers the screen, the database, the API, and the Stripe setup.

## Prices

| Plan | Code | Price | Stripe price env |
| --- | --- | ---: | --- |
| Starter | `starter` | ₹1,499 / month | `STRIPE_PRICE_STARTER` |
| Growth | `growth` | ₹4,999 / month | `STRIPE_PRICE_GROWTH` |
| Scale | `scale` | ₹14,999 / month | `STRIPE_PRICE_SCALE` |

Amounts are stored in paise (₹1 = 100 paise). The catalogue is `src/lib/billing/plans.ts`. Checkout reads the Stripe Price id from the environment when a request runs. It does not read those variables at build time.

## 1. Apply the migration

Run `supabase/migrations/005_billing.sql` in the Supabase SQL editor after migrations 001–004. It is safe to run again.

It creates three tables, each keyed by `company_id`:

- `plans` — the company's copy of a catalogue plan
- `subscriptions` — one row per Stripe subscription
- `invoices` — one row per Stripe invoice

Row level security is on. The `anon` role is revoked and has a restrictive policy that denies every command. The app writes with the service role, which bypasses RLS.

## 2. Create the Stripe products

In the Stripe Dashboard (test mode first):

1. Open **Product catalogue** and add three products: Starter, Growth, and Scale.
2. On each product add a recurring price in **INR**, billed **monthly**, for the amount in the table above.
3. Copy each price id (`price_...`).

Use the same three products in live mode when you are ready to charge. Test and live price ids are different. Point each environment at the ids for that mode.

## 3. API keys

In **Developers → API keys**, copy the secret key (`sk_test_...` or `sk_live_...`). The app does not use the publishable key. Do not commit the secret.

## 4. Webhook

In **Developers → Webhooks**, add an endpoint:

`https://<your-vercel-domain>/api/billing/webhook`

Subscribe to these events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.finalized`

Reveal the signing secret (`whsec_...`). For local checks, Stripe CLI can forward to `http://localhost:3000/api/billing/webhook` and will print a signing secret for that session.

The route reads the raw body and verifies `Stripe-Signature`. A bad signature returns 400. A verified event upserts `subscriptions` and `invoices` by Stripe id, so retries do not create duplicates. Checkout writes `company_id` and `plan_code` onto the session and the subscription metadata. That is how a webhook row stays on the right company.

## 5. Environment variables on Vercel

Set these for Production, Preview, and Development as needed. Leave them unset in any environment that should not charge.

| Name | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | Secret key from step 3 |
| `STRIPE_WEBHOOK_SECRET` | Signing secret from step 4 |
| `STRIPE_PRICE_STARTER` | Starter price id |
| `STRIPE_PRICE_GROWTH` | Growth price id |
| `STRIPE_PRICE_SCALE` | Scale price id |

Also keep `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set. The webhook cannot store a row without them.

Redeploy after changing variables. The names are listed in `.env.example`. Values stay in the host, not in git.

## What happens with no keys

`npm run build` does not construct a Stripe client and does not require these variables. `POST /api/billing/checkout` is company-admin only. When `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` is missing, or the chosen plan has no price id, the route returns HTTP 503 and this JSON:

```json
{ "error": "Billing not configured" }
```

`POST /api/billing/webhook` returns the same 503 when those two secrets are missing. It does not accept an unsigned body.

## Checkout

`POST /api/billing/checkout` with the customer session cookie.

Admins only. Anyone else gets 401 or 403.

```json
{ "plan": "starter" }
```

`plan` is `starter`, `growth`, or `scale`. The response is `{ "url": "https://checkout.stripe.com/..." }`. Stripe sends the browser back to `/customer/billing` on success or cancel.

## Customer billing screen

`/customer/billing` is limited to company admins. Anyone else sees the admin gate and cannot start checkout.

The screen reads `subscriptions` and `invoices` for the signed-in company. It shows the subscription status and the invoice rows. If those tables are not in the database yet, or a read fails, the page shows an empty state. It does not crash.

The plan cards are Starter, Growth, and Scale from `src/lib/billing/plans.ts`. Subscribe and Upgrade post the plan code to `POST /api/billing/checkout`. The clicked button shows a loading state. A response that includes a Stripe checkout `url` sends the browser there.

When that route returns HTTP 503 and `{ "error": "Billing not configured" }`, the page shows a toast and a “Billing is not set up yet” state. No card is charged.

Usage counts on the same page are company totals. They are not a Stripe meter, and they are not the wallet. The wallet still uses the Transaction Junction API.
