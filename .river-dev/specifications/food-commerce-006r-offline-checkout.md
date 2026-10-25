# FOOD-COMMERCE-006R — Offline Stripe Checkout Bridge

This phase adds a **private offline-only** bridge from the existing `TestCheckout` synthetic quote/reservation record to the expected Stripe Checkout `Session.create` parameter structure. It **never instantiates the Stripe SDK client, sends network traffic, or creates provider Checkout Sessions**. Existing signed-fixture verification, synthetic order state machine, local repository, D1 tests, and the public storefront remain intact.

## Critical integration gap: Checkout expiration

The current order engine derives checkout hold expiry from the earliest of the approved quote expiry and `holdLifetimeSeconds`. Stripe Checkout `expires_at` can only be **30 minutes to 24 hours after creation** (see https://docs.stripe.com/api/checkout/sessions/create). An existing shorter hold must be marked `BLOCKED`; **do not simply extend a held reservation or pretend it remains available**. Decide a verified production reservation/expiration policy and prove reconciliation of late payments, expiry, and capacity before introducing actual Stripe test-mode traffic.

## Commands

```powershell
node --test scripts/food/table-stripe-offline-bridge.test.mjs
node --import tsx --test scripts/food/table-stripe-offline-bridge.integration.test.mjs
node scripts/food/offline-checkout-readiness.mjs
node --import tsx --test src/lib/food/table-checkout-service.test.ts src/lib/food/table-offline-payment.test.ts
node scripts/food/preview.mjs --verify
```

The integration test reuses `createTableCheckoutService`, `LocalTableOrderRepository`, `createOfflineStripeTestAdapter`, `signedFixture`, and `realisticSyntheticWebhook` already in the repo. It does not expose a new public API.

The mock `line_items` entry deliberately represents a **synthetic all-in amount**, not verified food, tax and delivery itemization. The production quote/itemization mapping and provider-created identifiers still need a separate explicit implementation and authorization.

## Deferred and not authorized

- Actual Stripe test-mode Checkout Session creation or webhook forwarding.
- Real customer data, real transactions, real receipts, or actual provider network calls.
- Production D1 atomicity and migrations.
- Live food storefront payment activation or sale authorization.
- Any automatic extension of original reservation or fulfillment windows.

A successful local test is **not** commercial readiness, food compliance, or actual Stripe end-to-end verification.
