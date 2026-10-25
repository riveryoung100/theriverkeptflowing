# FOOD-COMMERCE-011 — Private offline provider-status assessment and durable audit

**Scope:** Creates an additive, private `scripts/food` fixture-based Stripe Checkout Session retrieval-*contract* and a durable check audit on isolated local Miniflare/workerd D1. This is **not** an actual Stripe API retrieval, verified provider evidence, test-mode payment, refund, commercial approval, or launch authorization.

## Reused and unchanged infrastructure

- FOOD-003–005: existing `LocalTableOrderRepository`, food-order state machine and offline signed Stripe SDK verifier.
- FOOD-008: synthetic 40-minute capacity hold.
- FOOD-009: provider Session registry with 30-minute expiry distinct from held capacity; signed webhook classification and replay checks.
- FOOD-010: quarantine exception queue. Only `REVIEW_REQUIRED` events with `PROVIDER_TIMING_UNVERIFIED` can be checked.

## New private components

- `provider-status-contract.mjs`: constructs Stripe-like *synthetic* Checkout Session fixtures; evaluates identity/account context, total minor units, USD currency, payment intent, recorded provider expiry, order ID and immutable quote/product fingerprints. Reader is a defensive-cloning **local fixture map**; no network transport or credentials are accepted. A paid-looking fixture still yields `SYNTHETIC_PAID_MATCH_REVIEW`, **never** approval.
- `provider-status-audit.ts`: durable read-only evaluation of 009/010 records, with a separate idempotent, conflict-detecting audit table `table_synthetic_provider_status_audit_011`. Stores check ID, event and session references, checked-at timestamp, snapshot hash and assessment class. Does not modify 009/010 payments, cases or reservations. Returns only hashed identifiers.
- Tests exercise conflicts, absent/non-paid fixtures, tampering, restart, concurrent retries, SQL interruption, and public isolation.
- `provider-status-report.ts` prints a redacted synthetic report without Stripe requests.

## Local commands

```powershell
node --test scripts/food/provider-status-contract.test.mjs
node --import tsx --test scripts/food/provider-status-audit.test.ts
node --import tsx scripts/food/provider-status-report.ts
node --import tsx --test scripts/food/provider-exception-queue.test.ts scripts/food/provider-session-ledger.test.ts scripts/food/long-hold.test.ts
node --import tsx --test src/lib/food/table-checkout-service.test.ts src/lib/food/table-offline-payment.test.ts
node scripts/food/preview.mjs --verify
```

## Critical deferrals

A real Stripe Checkout Session must be created in a separately authorized **Stripe test-mode** environment before actual test-mode API status can be retrieved and compared against a matching account-scoped Session, PaymentIntent and webhook. Those responses require independent trust boundaries, response-shape validation, secure credentials, handling of uncertain/late events and durable reconciliation. **No status lookup or offline paid-looking fixture can by itself accept an order, resolve a review case, release committed capacity or cause a refund.** Commercial readiness, tax, food safety, real prices and checkout remain blocked. Production D1 has not been tested and no remote migration is authorized.
