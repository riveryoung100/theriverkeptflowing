# FOOD-COMMERCE-013 — Stripe test-mode read-only retrieval preparation

**Not Stripe E2E**. All tests and checks in this phase are OFFLINE. Neither Stripe Checkout Session nor PaymentIntent is retrieved from Stripe by this phase. There is **no** Stripe API client, request, webhook forwarder, live payment, customer checkout, or production D1 access.

## Scope

- Strict plan for a future existing `cs_test_*` (non-synthetic) Checkout Session with an expected `pi_*`, amount, currency, reference, exact provider expiry, and 5-minute margin before held capacity expiration. No values may come from the browser as the source of truth.
- Separate Session and PaymentIntent metadata/identity/amount/status cross-checks that cannot mark an order paid. A matching test-mode status is **review-only**, not a webhook nor permission to accept an order.
- Transport injection that accepts only OFFLINE fixture readers; real Stripe SDK transport is **not installed or invoked**.
- Private readiness prints only booleans and offline verdict; no secrets or raw provider payloads.

## Real Stripe test-mode read-only retrieval — NOT AUTHORIZED YET

1. Confirm owner explicitly authorizes **isolated read-only** requests to Stripe's *test-mode* API. No session creation, charges, capture, refund, or webhooks.
2. In a **separate** future command, use a dedicated restricted test secret key only. Never put the key in chats, code, Git, console output, or logs. Do not use a `sk_live_` key.
3. Use server-side SDK operations `stripe.checkout.sessions.retrieve(sessionId)` and `stripe.paymentIntents.retrieve(paymentIntentId)` only, on an existing isolated test session whose values are verified against a non-production authority record. No arbitrary ID lookups.
4. Check retrieved `livemode === false`, linkage, status, metadata, amount, currency, expiration, and account context as supported; record redacted non-authorizing results. Response must **not** be used to release, allocate, or commit capacity or accept food orders.
5. Existing private FOOD-009 through FOOD-012 synthetic ledgers and audits are NOT authority over actual Stripe objects; production/real D1 integration remains separate and UNVERIFIED.

Stripe documentation: https://docs.stripe.com/api/checkout/sessions/retrieve and https://docs.stripe.com/api/payment_intents/retrieve

## Local commands

```powershell
node --test scripts/food/stripe-testmode-readonly-contract.test.mjs scripts/food/stripe-testmode-readonly-boundary.test.mjs
node scripts/food/stripe-testmode-readonly-readiness.mjs
node --import tsx --test scripts/food/provider-dual-status-audit.test.ts scripts/food/provider-status-audit.test.ts
node scripts/food/preview.mjs --verify
```

**No automatic payment acceptance. No real Stripe requests, production D1 access, remote migrations, commits, pushes, or deployment.**
