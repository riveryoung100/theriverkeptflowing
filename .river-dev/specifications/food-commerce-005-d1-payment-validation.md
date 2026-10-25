# FOOD-COMMERCE-005 — local D1 and offline payment validation

2026-10-22. Branch `cif-001-canonical-content-source-record`, HEAD
`99af8686f1564372875409b6ca4fe52144f68dbe`. Prior uncommitted implementations
and the owner's development databases are preserved. No production integration
or commercial activation is performed by this phase.

## Results and precise boundary

- **TARGET-COMPATIBLE LOCAL D1: PASS**, using installed Miniflare/workerd's actual
  D1 binding API, prepared statements, result metadata, conditional writes and
  batch rollback. This is not a `node:sqlite` substitution.
- **OFFLINE SIGNATURE TEST: PASS** and **OFFLINE RECONCILIATION: PASS**, using the
  installed Stripe SDK and explicitly synthetic signed fixtures.
- **ACTUAL STRIPE TEST-MODE E2E: UNVERIFIED**. No Stripe request, actual Checkout
  Session, test card charge or provider-originated webhook was involved.
- Remote production D1 behavior, geographic concurrency, replication, deployed
  canonical capacity integration and production traffic limits remain unverified.
- 30 new focused tests and 596 existing regressions pass: **626 distinct tests**.

## Reused contracts and installed tools

Installed versions read locally, without installation or credential inspection:

| Tool | Installed version / use |
| --- | --- |
| Wrangler | 4.129.0; tooling inspected, no remote command or deployment |
| Miniflare | 5.20260903.0-alpha; workerd/D1 binding emulation |
| Stripe | 22.6.1; official raw-body signature generation/verification only |
| Node / tsx | Existing installed test runner; no new dependencies |

The existing `FoodD1Database`, `FoodD1Statement`, `FoodD1Result` and
`LocalTableDatabase` interfaces are implemented by the new local Miniflare bridge.
`LocalTableOrderRepository`, `createTableCheckoutService`, the existing journal,
engine, capacity model, quote/payable snapshots, readiness validator, confirmation
projection and operations report run unchanged in meaning over that bridge.
There is no second order engine, catalog, state machine or production store.

Existing canonical D1 migrations, guarded capacity mutation, order persistence,
Stripe checkout and webhook ingestion sources were inspected read-only. Their
production configurations and handlers remain untouched. Existing canonical food
draft D1 integration tests were also run against disposable workerd databases.
The canonical reservation mutation still has its separate fake-backed regression
coverage; this phase does not claim to have deployed or fully integrated that
adapter's distinct stocked-SKU/slot semantics with the local aggregate model.

## Local D1 methodology and isolation

`scripts/food/local-miniflare-d1.ts` creates a unique `table-commerce-005-*`
directory under the OS temporary directory. It configures only a named synthetic
D1 resource, binds loopback on an ephemeral port, disables Cloudflare metadata
fetching (`cf: false`) and blocks Worker outbound requests. The Worker entrypoint
returns 404; no simulation/order/SQL API endpoint is provided.

`getD1Database('TABLE_SYNTHETIC')` supplies the actual local binding. Bound
`prepare().all()` and native `batch()` results pass through the existing food
interfaces. Only the existing standalone `local-order-schema.sql` is applied to
this disposable store. No Wrangler config, production database ID, owner SQLite
fixture, remote binding, environment secret or deployed migration is loaded.

The installed Miniflare 5 converter ignores the old `d1Persist` option. An initial
restart assertion caught loss of fixture data with that legacy setting. The
harness now uses the supported `resourcePersistencePath`; the rerun verifies
the exact persisted snapshot after workerd shutdown/reopen. This was a harness
configuration fix, not a production schema or repository change.

Each harness disposes workerd and removes only its own newly created fixture.
Cleanup resolves and checks the exact directory is an immediate child of the
real OS temporary root with the dedicated prefix. The owner's existing
development databases are never reset or reused by these D1 scenarios.

## Atomicity and concurrency validation

The existing repository resolves a consistent aggregate, replays the original
engine, validates its persisted projections, and applies a single
`UPDATE ... WHERE revision=? RETURNING revision` containing all orders, quotes,
capacity holds/commitments, checkout associations, payment references, audit
history, inbox and idempotency receipts. D1 must commit that statement entirely
or return a conflict/failure. No read-then-unconditional write was introduced.

Tests measure the following against local D1:

| Scenario | Verified outcome |
| --- | --- |
| Native prepared statements, `RETURNING`, `meta.changes` | One guarded winner; stale revision returns no row/no change |
| Two request clients read the same revision for the last serving | Exactly one reservation; loser gets a conflict, capacity-aware retry cannot oversell |
| Five request clients read the same revision for three servings | One initial CAS winner; bounded re-read/retry admits exactly three reservations |
| Repeated checkout / concurrent signed payment | One hold, one accepted transition and one capacity commitment |
| Expiry during payment / delayed success | Expired hold never commits; closed order remains closed and receipt is queued for refund |
| D1 constraint/trigger statement failure | No partial payment, acceptance, hold mutation, inbox or receipt |
| Native batch with a later failing statement | Earlier statement rolls back |
| Duplicate singleton primary key | Native uniqueness error |
| Explicit SQL `BEGIN TRANSACTION` | Rejected by the tested D1 runtime; code relies on conditional statements/native batch instead |
| Lost acknowledgment after committed reconciliation | Workerd is disposed/reopened, exact snapshot survives and exact event retry resolves its receipt |
| Cancellation before preparation | Capacity releases once |
| Cancellation/refund after preparation | Consumed meals remain committed and unavailable |
| Refund before payment / later failure | Deferred reconciliation reaches terminal refund without revenue/reactivation |
| Actual conceptual product or injected client total | Rejected; no order or capacity created |

After scenarios, invariant checks assert nonnegative capacity, conservation of
available/reserved/committed units, unique orders/payment associations, at most
one active hold per order, version/history consistency, payment before accepted
fulfillment, retained prepared capacity and null real revenue.

Read barriers intentionally synchronize request clients at the same observed
revision before writes. These are independent application requests to one local
D1 binding, not claims about multiple geographically distributed production
Workers. Local D1 serializes its SQL operations; correctness depends on the
conditional revision guard, not on holding a JavaScript lock.

The one-row aggregate remains a local test design with an ever-growing journal.
Production row/statement limits, compaction, read replication, multi-domain
transactions and recovery under actual infrastructure failures are not proven.
Canonical stocked capacity and reservation-slot units still require an explicit
mapping and target-compatible validation before production adoption.

## Offline Stripe contract changes

`realisticSyntheticWebhook` adds Stripe-shaped `checkout.session` and `refund`
objects while retaining the old fixture helper's normalized receipt identities.
Pending/expired Checkout objects can contain a null PaymentIntent. A null value
is allowed only for non-authorizing pending/expired states and must still resolve
to the stored synthetic checkout contract; paid success requires its exact
PaymentIntent identifier.

The existing offline adapter now recognizes full-refund creation/pending,
completion and failure states from explicit refund objects. It records a scoped
synthetic refund identity and prevents reuse against another payment/order.
Legacy successful refund fixtures retain their old normalized evidence shape,
preserving existing durable receipts and replay. Unknown event/state combinations
fail closed. No production webhook handler is modified.

The repository distinguishes `refund-requested`, `refund-failed`, confirmed
refund and deferred payment/fulfillment exceptions. Initiation/failure cannot
fabricate completion or reactivate an order. Refunds initiated during delivery
are provisioned financially while the handoff exception remains visible;
confirmed refunds then adjust receipts once and reconcile after handoff.
No refund API request is sent, retried or implied by these transitions.
Only full refunds are supported; partial refunds remain rejected.

Tests cover pending/success/failure/expiry, delayed and duplicate success,
duplicate refunds, out-of-order refund/payment events, invalid/modified/stale
signatures, wrong account/mode/order/version fingerprint/quote/amount/currency,
unknown types, null pending PaymentIntent, incomplete refunds and production
evidence rejection. Every engine order still has `realPaymentVerified: false`.
A locally signed event is not evidence of a provider-originated payment.

## Private diagnostics and recovery

`table-local-diagnostics.ts` supplies a bounded 200-entry in-memory diagnostic
recorder with whitelisted codes, safe boundary labels, sequence numbers and
hashed operation references. Repository changes report committed writes,
duplicates, capacity/version/idempotency conflicts and rejected/storage-failed
transitions. The application service records rejected payment evidence.
Raw errors, raw payloads/signatures, secret keys, addresses and contact details
are not accepted by the recorder. Diagnostic failures never control commit
outcomes.

`repository.diagnostics()` combines optional attempt records with durable receipt,
expiry, pending-order, duplicate-event, refund and unresolved-inbox facts.
All output distinguishes SYNTHETIC, LOCAL_TEST and UNVERIFIED production behavior.
The existing durable simulator gains a private diagnostics mode and includes the
redacted report in integrated output. No public dashboard or admin route exists.

The attempt buffer is not a durable production logging system. After a Node
controller restart it starts empty; durable inbox/receipt/order facts reconstruct
from storage. A failed write cannot atomically store its own failure record in
the same unavailable database. A future production adapter needs a durable
ingress/retry policy and independent operational telemetry.

Recovery procedure: re-read state, retry the same immutable inbound event or
command identity, and resolve the saved receipt before applying effects. SQL
failures before commit leave no accepted partial order; lost acknowledgments
after commit resolve to the already-persisted order. Expired or canceled payment
success is refund work, not permission to reuse capacity. Do not automatically
retry charges or create a second payment. A future real handler must not report
successful receipt to Stripe before its durable ingress/commit policy is met.

## Verified operating commands

All commands below were executed from the project root with the installed tools.
The D1 runner always creates and cleans its own isolated database, and does not
touch the retained 003/004 SQLite development fixture.

```powershell
# Actual local workerd/D1 concurrency, atomicity and reliability tests
node --import tsx --test src/lib/food/table-d1-reliability.test.ts

# Offline signatures, Stripe-shaped contracts, refunds and isolation
node --import tsx --test src/lib/food/table-offline-payment.test.ts

# Disposable local D1 full journey, interruption/restart recovery, diagnostics
node --import tsx scripts/food/d1-order-reliability.ts journey --synthetic
node --import tsx scripts/food/d1-order-reliability.ts recovery --synthetic
node --import tsx scripts/food/d1-order-reliability.ts diagnostics --synthetic

# Focused local D1 recovery cases
node --import tsx --test --test-name-pattern 'shutdown|SQL interruption' src/lib/food/table-d1-reliability.test.ts

# Existing canonical food-draft local D1 integration coverage
node --import tsx --test src/lib/food/d1-draft-persistence.integration.test.ts

# Website validation and preview
node node_modules/astro/bin/astro.mjs build
node --import tsx --test scripts/food/storefront-output.test.ts
node scripts/food/preview.mjs --verify
```

All three D1 runner modes end with a fulfilled synthetic order, 2580 cents gross
synthetic receipts, no unresolved work and `realPaymentVerified: false`. Recovery
injects both SQL failure and lost acknowledgment, then actually shuts down and
reopens workerd/D1. The Node controller remains alive; this does not simulate
power loss, disk corruption or a remote outage. The diagnostics scenario also
injects rejected evidence. No actual confirmation message is delivered.

## Validation results

- New local D1 reliability tests: **14/14 PASS**.
- New offline payment/diagnostics tests: **16/16 PASS**.
- Existing service/repository/engine tests: **104/104 PASS**.
- Existing food/D1-contract/commerce/fulfillment regressions: **446/446 PASS**.
- Existing costing/recipe/launch tests: **37/37 PASS**.
- Existing generated storefront checks: **4/4 PASS**.
- Existing canonical draft tests on real local D1: **5/5 PASS**.
- Total: **626 distinct passing tests**. Filtered/repeated verification runs are
  not added to this total. All 591 tests from 004 are included.
- Three D1 CLI scenarios pass; filtered SQL-interruption/restart command passes
  its two selected tests.
- Astro production build passes. Both Table routes remain generated and return
  HTTP 200; CSS delivery passes all three preview rounds.
- Astro check remains **250 errors, 0 warnings, 17 hints**, with no diagnostics
  in changed/new scoped files. Existing unrelated errors remain unresolved.
- Scoped source hash comparison preserves public storefront, catalog, engine,
  schema, live migrations, production Stripe/D1/auth/deployment code, Navbar and
  unrelated insurance/Sesh work. Public output checks retain disabled purchasing,
  honest missing price/disclosures/windows and no owner cost/simulation leakage.
- No real credentials were read; a source scan finds no plausible live credential
  values in the phase's code. Synthetic fixture constants are explicitly labeled.

## Source inventory

Created:

```text
scripts/food/local-miniflare-d1.ts
scripts/food/d1-order-reliability.ts
src/lib/food/table-local-diagnostics.ts
src/lib/food/table-d1-reliability.test.ts
src/lib/food/table-offline-payment.test.ts
.river-dev/specifications/food-commerce-005-d1-payment-validation.md
```

Modified:

```text
src/lib/food/table-test-payment.ts
src/lib/food/table-local-order-repository.ts
src/lib/food/table-checkout-service.ts
scripts/food/signed-payment-fixtures.ts
scripts/food/durable-order-simulation.ts
scripts/food/README.md
```

Diagnostics, verification logs and the before/after hash inventory remain in
ignored `.river-dev/state/food-commerce-005-*` files. There is no new live schema,
binding, deployment configuration, production adapter or public endpoint. No
production D1 access, remote migration, real order, Stripe request, card charge,
notification, public candidate branding, commit, push or deployment occurred.

## Remaining production requirements and next authorization

Target-compatible local behavior is now measured. Remote D1 acceptance still
requires explicit authorization, canonical exact-source/slot-unit integration,
migration compatibility review, target concurrency/failure tests, primary/session
consistency, capacity/expiry race validation and journal/size-limit strategy.

Actual Stripe test-mode E2E needs separate explicit authorization. A future
network-capable implementation must obtain genuine test credentials outside
source and configure explicit test mode, the exact Stripe account, a test-mode
secret key, the matching endpoint webhook signing secret and an approved API
version. It must persist actual returned session/PaymentIntent identities,
server-derived amount/currency/product/quote/hold references and idempotency keys;
verify actual provider raw-body events; implement durable ingress/outbox/retry
and refund recovery; and authenticate confirmation access. Current synthetic
accounts/IDs/signers cannot be repurposed as real evidence. No environment values
are invented or read here, and no actual test-mode session is authorized yet.

Production ordering additionally requires actual recipe, portion, ingredient/
allergen, receipt-based costs, packaging/labels, applicable Texas/food-handler,
temperature-control/freezing/reheating, capacity, pickup/delivery, price/tax/fees,
security/logging, confirmation and explicit owner/deployment approvals. Tests
and private readiness assertions grant none of these approvals. The Table stays
closed.

Primary references consulted: [Cloudflare D1 binding and batch API](https://developers.cloudflare.com/d1/worker-api/d1-database/)
and [Stripe refund lifecycle](https://docs.stripe.com/refunds). The tests measure
the installed local runtime; these references do not establish a remote test pass.
