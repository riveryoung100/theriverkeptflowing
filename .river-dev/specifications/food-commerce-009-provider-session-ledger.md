# FOOD-COMMERCE-009 — Private provider Session ledger

This implementation introduces **separate, durable synthetic provider Session expiration** in the isolated Miniflare/workerd local D1 binding. No production migration or public route changes are made.

- A proposed 30-minute `provider_expires_at` is recorded separately from the order engine's actual 40-minute `hold_expires_at`, with a minimum 5-minute buffer.
- Provider Session identity, quote fingerprint, and price are fixed at registration; conflicting re-registration is rejected.
- A **verified signed synthetic event** is recorded in a separate durable local inbox. The raw webhook, signature, and secrets are **not** stored.
- Successful payment evidence *arriving* at or after the provider's expiration enters durable `REVIEW_REQUIRED` without advancing the existing order service. **Webhook delivery time is not proof of when payment was made.** The live future implementation must reconcile authoritative provider payment status and timing before accepting or refunding any order.
- Signed events delivered before the provider expiration flow through the existing `app.receiveWebhook` and durable order repository. If acknowledgment fails after the order commit, the `PENDING` receipt can be retried idempotently.
- Offline payment fixtures, not actual Stripe test-mode transactions. Neither local D1 tests nor signatures generated from synthetic fixtures prove production concurrency or provider payment chronology.

## Verified on user machine by installer (required)

```powershell
node --import tsx --test scripts/food/provider-session-ledger.test.ts
node --import tsx scripts/food/provider-session-report.ts
node --import tsx --test scripts/food/long-hold.test.ts src/lib/food/table-checkout-service.test.ts src/lib/food/table-offline-payment.test.ts
node scripts/food/preview.mjs --verify
```

A phase PASS does **not** grant food-safety approval, commercial launch authorization, real payments, or Stripe test-mode E2E. The simulated provider identity is **not** an actual Stripe session ID. The synthetic event review queue is not linked to any production inbox. It is unsafe to deploy the private tool as a real provider webhook handler.

Next: source-aware migration/adapter plan for *real* Stripe test-mode Session IDs and event timestamps, with explicit authorization before any network request or checkout activation.
