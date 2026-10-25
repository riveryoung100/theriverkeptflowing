# FOOD-COMMERCE-010 — Local synthetic payment exception review

## Delivered

Adds an **offline, private, local-D1-only** review queue for events already marked `REVIEW_REQUIRED` by the FOOD-009 signed-event boundary. The workflow materializes cases with one SQL statement, offers an idempotent `OPEN` → `ACKNOWLEDGED` → `ESCALATED` audit progression, and preserves cases after simulated workerd restarts. It does not modify the existing order engine, checkout service, Stripe verifier, provider ledger, storefront, or any public handler.

A case cannot be "approved" or "resolved" through this module. An acknowledgement or escalation is purely operational and **never confirms payment, changes an order, commits inventory, releases a hold, authorizes a refund, or represents actual Stripe evidence**. Manual review cases need verified real provider evidence and separate commercial-authorization rules in future phases.

## Important limits

- The FOOD-009 ledger's `receivedAt >= providerExpiresAt` branch conservatively quarantines delayed arrivals. A delayed webhook **may still correspond to a payment that occurred before expiry**. Delivery timestamp alone is not authoritative paid time; no automatic payment/refund decision is made here.
- Stripe's actual provider state would need to be securely retrieved, compared to an immutable order/quote/session snapshot, and reconciled under documented business policy. That is **not implemented or verified** in FOOD-010.
- The FOOD-009 and FOOD-010 SQL tables are **only local synthetic test artifacts**. Their existence does not make remote Cloudflare D1 or real Stripe integrations production-ready.
- Existing public checkout remains disabled. Product, pricing, tax, labeling, food safety, regulatory and fulfillment launch gates remain unmet.
- The queue stores synthetic event IDs and session IDs inside local D1 only; its report API reveals SHA-256 hashes instead. Treat even hashed identifiers as operationally private.

## Verified on user's Windows project only after installer checks

```powershell
node --import tsx --test scripts/food/provider-exception-queue.test.ts
node --import tsx scripts/food/provider-exception-report.ts
node --import tsx --test scripts/food/provider-session-ledger.test.ts scripts/food/long-hold.test.ts
node --import tsx --test src/lib/food/table-checkout-service.test.ts src/lib/food/table-offline-payment.test.ts
node scripts/food/preview.mjs --verify
```

Next: provider-authoritative test-mode **retrieval** adapter and actual Stripe test-mode transactions **only following separate user authorization**, together with a demonstrated safe rule for paid-before-expiry but delivered-after-expiry evidence.
