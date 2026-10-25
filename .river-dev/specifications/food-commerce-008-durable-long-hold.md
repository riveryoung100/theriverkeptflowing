# FOOD-COMMERCE-008 — Actual Local D1 Long-Hold Integration

This is an additive, **private local synthetic-only** integration test. The existing order engine already accepts adjustable `quoteLifetimeSeconds` / `holdLifetimeSeconds`, while offer and window cutoffs can shorten those times. The new test fixture produces a coherent, 40-minute synthetic quote/hold and a separately proposed 30-minute provider Session with five-minute timing margin, verified by the FOOD-007 policy function.

It does **not** update the order engine, real product, public storefront, production D1, or payment paths. It tests against disposable Miniflare/workerd D1 and its real repository CAS implementation. Local D1 concurrency cannot establish remote D1 production guarantees.

**Critical integration gate:** Current `TestCheckout.expiresAt` is the local hold expiration, not an independently stored real Stripe Session expiry. The new test **does not claim the provider deadline is persisted or enforced for out-of-order webhook delivery**. Real test-mode Checkout Session creation, provider session ID persistence and effective expiry/event-created timing, async-payment handling, webhook delivery ordering, and refund reconciliation must be designed and tested before activation. An event observed after the provider's Session expires is NOT in itself proof that payment was late; check authoritative provider evidence and actual payment creation/completion timing, and never create an accepted order without verified payment, valid capacity, and all launch gates.

## Commands

```powershell
node --import tsx --test scripts/food/long-hold.test.ts
node --import tsx scripts/food/long-hold-report.ts
node --test scripts/food/table-stripe-hold-policy.test.mjs
node scripts/food/preview.mjs --verify
```

`FINAL PASS` for this phase means only the tests/build in this installation pass. Public food ordering, real Stripe transactions, remote migration, commit, push and deployment remain disabled.
