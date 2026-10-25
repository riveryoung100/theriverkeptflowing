# FOOD-COMMERCE-007 — Stripe Session and capacity-hold timing policy

This is a **private, local-only, synthetic policy model**. It does not alter the order engine, quote lifetime, checkout service, D1 schema, Stripe provider, or storefront. It imports the existing `table-stripe-offline-bridge.mjs` from FOOD-COMMERCE-006R.

## Why the current workflow is blocked

The existing order engine derives its hold expiration from the **minimum** of the quote expiration and `now + holdLifetimeSeconds`. In FOOD-006R, the existing shorter reservation is correctly blocked because Stripe's Checkout Session expiry parameter has a 30-minute minimum. Neither silently changing Stripe expiry to 30 minutes while holding inventory for 5 minutes nor extending a reservation without proven capacity-safe semantics is authorized.

## Required safety requirements

- An offline Session proposal must have a duration from 30 minutes through 24 hours.
- The **already-existing** quote, inventory hold, and approved sales cutoff must continue through the proposed session expiry **plus an explicitly selected grace**; this checker does not extend any of them.
- The fulfillment window must begin after the proposed expiry and grace.
- Capacity must already be sufficient, but this tool **does not reserve or confirm capacity**.
- Late or unsigned events are held for the **existing signed-webhook reconciliation or refund path**; never treat a client redirect as verified payment.
- All synthetic examples remain nonpayable, and the real Southwest Harvest Bowl remains commercially blocked.

## Commands (after installer)

```powershell
node --test scripts/food/table-stripe-hold-policy.test.mjs
node scripts/food/hold-policy-report.mjs
node --test scripts/food/table-stripe-offline-bridge.test.mjs
node --import tsx --test scripts/food/table-stripe-offline-bridge.integration.test.mjs
node scripts/food/preview.mjs --verify
```

## Not yet solved / requiring separate approval

Actual order-engine changes to a 30-minute-plus hold/quote/cutoff and required capacity safeguards, including provider checkout-expiration callbacks, asynchronous payments, late paid webhooks, manual refunds, test-mode transactions, server-side fulfillment authorization, and target production D1 guarantees. A model PASS is **only** offline policy compatibility, not a live-transaction or regulatory approval. No production checkout, Stripe network, remote D1, or deployment is authorized.
