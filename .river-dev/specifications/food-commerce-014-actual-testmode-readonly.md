# FOOD-COMMERCE-014 â€” Actual Stripe TEST-mode read-only retrieval

Owner explicitly authorized read-only Stripe **test-mode** API retrieval from their Windows computer only, to inspect an **existing** test Checkout Session and its linked PaymentIntent. Authorization excludes creating sessions, charges, capturing funds, issuing refunds, customer checkout activation, remote D1 operations, commits, pushes, or deployment.

## Scope and boundaries

- `scripts/food/stripe-testmode-real-readonly-core.mjs` implements strict identity and test-mode checks and copies only a redacted set of provider status/amount/expiry fields. Results are `reviewOnly` and never authorize an order or payment.
- `scripts/food/stripe-testmode-real-readonly-cli.mjs` is the **only** module constructing a Stripe SDK client for this phase. It calls `checkout.sessions.retrieve(existingCsTestId)` and, if there is a linked PaymentIntent, `paymentIntents.retrieve(providerPiId)` only. It makes zero POST/PUT/DELETE operations. No automatic listing or discovery of unrelated objects.
- `scripts/food/stripe-testmode-readonly-retrieve.ps1` reads the ID interactively, prompts for a masked API key, and sends that key to Node via anonymous stdin; it does not include the key in CLI args, environment variables, files, or Git. In-memory key exposure cannot be eliminated entirely. Prefer a Stripe restricted `rk_test_` key with read permissions for Checkout Sessions and PaymentIntents. A `sk_test_` secret is supported as fallback, but broader in scope; never use a live-mode key. No secret or full API response may be uploaded to ChatGPT.
- If the user lacks an existing `cs_test_` Session, pressing Enter safely defers retrieval. Creating a session is not in scope; an actual end-to-end Stripe test is still unverified.
- Raw Stripe customer details, emails, addresses, payment methods, tokens, billing data and secret fields are not printed or persisted. Session and PI IDs appear only transiently in local process memory; hashed references may appear in returned internal report but are not printed by PowerShell.
- A consistent Session + PaymentIntent provider status **does not** prove correspondence with local food order authority or a valid signed webhook; do not auto-resolve quarantined events, book capacity, or mark an order paid. FOOD-009 through FOOD-013 ledgers remain synthetic and unchanged.

## Tests and re-execution

```powershell
node --test scripts/food/stripe-testmode-real-readonly.test.mjs
node --test scripts/food/stripe-testmode-readonly-contract.test.mjs scripts/food/stripe-testmode-readonly-boundary.test.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/food/stripe-testmode-readonly-retrieve.ps1
```

Exact allowed Stripe API calls:
- `GET /v1/checkout/sessions/:id` (existing test Session only)
- `GET /v1/payment_intents/:id` (linked test PaymentIntent only)

Stripe docs: https://docs.stripe.com/api/checkout/sessions/retrieve and https://docs.stripe.com/api/payment_intents/retrieve

### Limitations

- Actual test-mode retrieval will report **not attempted** if no existing Session is supplied; this is not an installation failure.
- A session without an associated PaymentIntent yields a session-only verdict; no PaymentIntent can be retrieved in that case.
- Provider pair consistency does not validate original food quote, Stripe account independently, webhook signature, reservation safety, or commercial readiness.
- No actual Stripe response can be asserted until this installer runs on the owner's Windows computer with a valid `cs_test_` ID and test-mode key.
