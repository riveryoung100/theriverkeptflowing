# FOOD-COMMERCE-012 — Private OFFLINE dual-provider status review

## Context
FOOD-005 validated local Miniflare/workerd D1 contracts. FOOD-009 records separate local/provider expiries and quarantines late signed events. FOOD-010 maintains the exception-review queue, and FOOD-011 stores an initial offline Checkout Session status audit. All remain synthetic and local-only.

## Implementation
- `provider-dual-status-contract.mjs`: models Checkout Session and PaymentIntent retrieval **shapes**, validates their mutual identity, test/synthetic provenance, immutable price/currency/quote/product references, provider expiry, and payment status. It is not a Stripe client and makes no network calls.
- `provider-dual-status-audit.ts`: durable local workerd D1 audit for a quarantined signed event which already has a FOOD-011 audit. Stores hashes of synthetic pairs rather than raw customer/payment details, is idempotent, and never accepts/cancels/refunds an order, resolves the case, or provides real payment proof.
- `provider-dual-status-report.ts`: synthetic offline diagnostic only.

A synthetic matching `Checkout Session` + `PaymentIntent` yields `SYNTHETIC_DUAL_PAID_MATCH_REVIEW`, **not** payment authorization. Changed amount, currency, account context, Session ID, PaymentIntent ID/status, metadata, expiry, or missing data remain review-only or conflict states.

## Verification
```powershell
node --test scripts/food/provider-dual-status-contract.test.mjs
node --import tsx --test scripts/food/provider-dual-status-audit.test.ts
node --import tsx scripts/food/provider-dual-status-report.ts
node --import tsx --test scripts/food/provider-status-audit.test.ts scripts/food/provider-exception-queue.test.ts scripts/food/provider-session-ledger.test.ts
node --import tsx --test src/lib/food/table-checkout-service.test.ts src/lib/food/table-offline-payment.test.ts
node scripts/food/preview.mjs --verify
```

## Requirements before ANY provider read
A separately authorized, isolated real Stripe **test-mode** retrieval client must be implemented, with test-only credentials in safe local environment variables, expected account context, query allowlist, audited authorization, safe request timeouts and retry policy. Its outputs must not impersonate these synthetic fixtures, and its test results must never authorize live orders. Actual test-mode E2E and production D1 concurrency remain unverified.

Commercial launch additionally requires actual recipe, pricing, food-safety and compliance checks, approval of capacity windows, public-route security review, deployment approval and order/payment reconciliation. This work does not alter those gates.
