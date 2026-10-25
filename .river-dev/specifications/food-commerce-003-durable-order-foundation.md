# FOOD-COMMERCE-003 — durable local order and payment foundation

2026-10-22. FOOD-COMMERCE-002R completed with FINAL PASS before this phase.
Branch: `cif-001-canonical-content-source-record`.
HEAD: `99af8686f1564372875409b6ca4fe52144f68dbe`.

This implementation is a **local synthetic integration harness**, with durable
SQLite storage and signed software fixtures. No Stripe request or real Checkout
Session is made, including in test mode. No live schema, route, webhook handler,
database binding, migration, product approval or launch setting changes.

## Existing contracts and compatibility

| Existing contract | Reuse and boundary |
| --- | --- |
| `FoodD1Database`, `FoodD1Statement`, `FoodD1Result` in `d1-draft-persistence.ts` | Implemented by `LocalTestD1` against local SQLite. Repository uses bound SQL and conditional `UPDATE ... RETURNING`. No D1 runtime acquisition. |
| `createTableOrderSimulation`, `SimulationOrder`, `SimulationAuthority` | Existing lifecycle, quote arithmetic/snapshots, versions, idempotency, capacity/expiry, cancellation, refund and launch validation reused by deterministic journal replay. Engine source is unchanged. |
| `createTableCapacityModel` and `modelFingerprint` | Existing batch/window capacity and canonical fingerprints, replayed with the same order transaction. |
| `summarizeTableSimulation` | Existing private finance/queue projection, extended locally for pending checkout, authenticated signed fixtures, late receipts and refund recovery. |
| `requireStripeSandboxSecretKey` | Existing explicit test-key validation; live keys/configuration fail before verification. |
| `Stripe.webhooks.constructEventAsync` | Installed SDK verifies exact raw body/signature with normal signature tolerance, matching the existing ingestion pattern. No SDK client or session API is constructed. |
| Existing merchandise, fulfillment, physical-order, payable-assessment and readiness contracts | Reused transitively through the engine; signed events must match exact persisted quote and cart fingerprints, integer USD cents, session/payment/account identities and hold expiration. |

Closest existing durable production candidates were inspected before authoring:
`d1-physical-order-version-persistence.ts` persists requested/cancelled immutable
physical-order truth only. It does not represent payment/preparation/fulfillment.
`d1-authoritative-capacity-reservation-mutation.ts` already guards canonical
source revisions and reservation claims inside atomic D1 batches. Those systems
retain their existing meanings. This harness does not replace either one.

The canonical durable slot claim is one reservation slot; the simulation window
counts meal quantities. Planned production capacity is also distinct from stocked
SKU inventory. Neither difference can be silently mapped into production rows.
Existing exact physical-order, reservation, acceptance and electronic-confirmation
repositories remain the production integration candidates for a later phase.

The existing production Stripe ingestion/runtime and paid-order handoff serve
canonical registered products and fulfillment dependencies. This harness does
not invoke that handoff, invent delivery email/contacts, or mint a production
`VerifiedPaymentEvent`. Integer food payable snapshots remain authoritative here.

## New modules

- `src/lib/food/table-local-order-repository.ts`: repository interface and local
  D1-compatible adapter; durable journal, order projections, checkout intents,
  receipts, provider inbox and recovery operations.
- `src/lib/food/table-test-payment.ts`: explicit offline test configuration,
  mock checkout intent and process-recognized signed-fixture evidence.
- `scripts/food/local-test-d1.ts`: isolated SQLite implementation of existing
  food D1 contracts, including transactional local batch behavior.
- `scripts/food/local-order-schema.sql`: standalone proposed local-only schema.
- `scripts/food/signed-payment-fixtures.ts`: clearly named synthetic keys,
  accounts, metadata and signed webhook fixtures; no real credential is used.
- `scripts/food/durable-order-simulation.ts`: private durable CLI.
- `src/lib/food/table-local-order-repository.test.ts`: persistence, payment,
  concurrency, recovery, operations and security integration tests.

## Persistence, concurrency and atomicity

One local store aggregate contains the initial synthetic authority, ordered
engine journal, immutable quote history via replay, current order snapshots,
capacity holds/commitments, request receipts, checkout identities and provider
inbox. The local schema has a singleton primary key, fixed provenance/format,
nonnegative revision constraint and valid-JSON constraint. It is intentionally
outside `migrations/food/` and has not been applied remotely.

Every mutation reads a consistent aggregate, reconstructs the existing engine,
validates its order/capacity projections against the journal, applies validated
steps, then replaces the aggregate in **one version-guarded SQL statement**.
The write includes the order, all batch/window claims, inbox, history and
idempotency receipt together. A competing revision returns no row and raises
`TableLocalConflict`; callers re-read/retry rather than overwrite a winner.
The engine additionally enforces each expected order version.

Exact request retries return persisted outcomes/current order without replaying
effects. Conflicting key reuse fails. Accepted payment records and capacity
commitment share the same CAS. The journal recreates process-local simulation
proofs only from private stored steps; serialized provider input is never treated
as a valid process proof. Stored JSON is trusted local application storage, not
an authenticated remote backup format. Corrupt projections fail closed.

Tests use actual SQLite, including two connections to one file, failed SQL
updates, rollback, close/reopen and a committed write with a lost acknowledgment.
This establishes the local contract, **not Cloudflare D1 production atomicity**.
The single aggregate serializes the entire synthetic shop and grows with history;
it is not a scalable production schema or approved D1 deployment design.

Before production, map exact canonical identities/source revisions and slot-unit
semantics into existing D1 reservation/order repositories. Audit primary-consistent
reads, guarded multi-resource writes, transactional acceptance evidence, unique
provider/payment identities, cleanup races and recovery under actual D1
concurrency/failure. Use a transaction or recoverable outbox to coordinate the
existing durable domains. Do not hold a database transaction across Stripe or
notification calls. No live migration is proposed by this local schema.

## Payment trust and reconciliation

Configuration requires `mode: test`, `fixturesOnly: true`, a test-key-shaped
value, webhook secret and synthetic account. The adapter checks signatures,
`livemode === false`, exact account and explicit SYNTHETIC metadata. Copied
normalized objects, browser redirects, raw client totals and engine fake proofs
cannot pass its process-local evidence registry. Production configuration is
rejected. Public endpoints import none of these modules.

All events bind exact order, quote/cart fingerprints, amount/currency, synthetic
session/payment identities and expiration against a durable intent. The only
supported checkout success is a signed paid event. Duplicate provider event IDs
are content-checked, and different success IDs for the same payment/session do
not add revenue, orders or fulfillment. Failed/expired/pending events cannot
reverse accepted payment. Unknown orders/references fail without writes.

This is **signature-authenticated software fixture evidence**, not a claim that
Stripe originated an event or that a real charge occurred. Every engine order
still says `mode: simulation-only`, `realPaymentVerified: false`. Secrets/signatures
are not stored in the journal; only normalized synthetic evidence is stored.

Reconciliation behavior:

| Event/condition | Durable result |
| --- | --- |
| Checkout initiated | Existing engine validates quote/readiness and holds all resources; mock intent is saved with the hold. |
| Pending payment | Signed pending receipt, no acceptance. |
| Paid success while eligible | Simulated payment + acceptance + capacity commitment + inbox/receipt in one CAS. |
| Failure/expiration before payment | Cancellation and capacity release. |
| Late/canceled/expired or revoked-authority success | Canceled order stays closed, capacity releases, synthetic receipt is recorded and fully provisioned for refund. No acceptance. |
| Owner cancellation after payment | Refund-pending; prepared meals keep consumed capacity. |
| Confirmed full refund | Exact amount/reference validation, terminal refund, revenue/tax adjustment without resurrecting capacity or erasing fulfillment history. |
| Refund before success | Durable pending inbox; applied when matching success arrives. |
| Refund during delivery | Financial adjustment is immediate; fulfillment exception remains queued until handoff and explicit `retryPending`. Prepared capacity stays committed. |
| Failure before SQL commit | No partial accepted order/inbox/hold/receipt; retry identical event/key. |
| Commit succeeds but response is lost | Re-read and retry identical key; durable receipt resolves uncertainty without repeating effects. |

`cleanup` persists hold expiry; `retryPending` retries queued refund reconciliation.
Fresh cleanup/recovery instants require fresh keys; exact retries are safe.
Partial refunds, provider refund requests, card settlement, recalls, automatic
dispatch and notification delivery are not implemented. A verified fixture
refund does not send any request to a payment provider.

## Private operations

`operations` reconstructs stored engine events rather than inventing totals.
It retains the existing synthetic queue/costing report and adds pending-payment
orders, authenticated test-fixture payment counts, deferred refunds, delivery
exceptions and late-receipt refund provisions. Confirmed delivery refunds adjust
finances immediately, while the operational exception remains visible.
`totalSyntheticReceiptsCents` and `totalSyntheticRefundedCents` include late
payments; late receipts do not become operating revenue. Tax is excluded from
operating revenue; preparation costs remain after waste/cancellation/refund.
Every report is synthetic and `realRevenueCents` stays null.

## Verified local commands

Node 24 with built-in `node:sqlite` and the already-installed tsx/Stripe packages.
No dependencies were installed. From the repository root:

```powershell
node --import tsx scripts/food/durable-order-simulation.ts order --synthetic
node --import tsx scripts/food/durable-order-simulation.ts fulfill --synthetic
node --import tsx scripts/food/durable-order-simulation.ts operations --synthetic
node --import tsx scripts/food/durable-order-simulation.ts refund --synthetic
node --import tsx scripts/food/durable-order-simulation.ts recover --synthetic
node --import tsx --test src/lib/food/table-local-order-repository.test.ts
node --import tsx --test src/lib/food/table-order-engine.test.ts
node node_modules/astro/bin/astro.mjs build
node --import tsx --test scripts/food/storefront-output.test.ts
node scripts/food/preview.mjs --verify
```

All five durable CLI modes were executed in the sequence shown. The SQLite file
is `.river-dev/state/food-commerce-003/synthetic-table-orders.sqlite` (Git-ignored).
Each invocation closes its connection; the next invocation reconstructs stored
state. The commands reuse the same fixture identity and retain terminal states;
they do not silently reset the database or create another order. Calling fulfill
after refund cannot reactivate an order. `operations` reads stored activity;
`recover` expires holds/retries queued work at the explicit synthetic clock.
All CLI output and any saved reports are private.

After initial fulfillment: 2 units, 2580 cents gross synthetic receipts, 80 cents
tax, 2500 cents net operating revenue, 800 cents variable costs, 500 cents fixed
costs, 1200 cents synthetic operating profit. After the full refund: 2580 cents
refunded, zero operating revenue/tax liability, 2 historical fulfilled units,
800 cents retained costs and -1300 cents synthetic operating profit.

## Validation and integrity

29 focused tests passed, including local storage and signed-fixture integration.
42 existing engine tests, 446 food/D1/commerce/payment/fulfillment regressions,
37 costing/recipe/launch tests and 3 generated storefront checks passed: 557 tests
total. The expanded D1 regression set includes existing authoritative capacity
mutation, physical-order persistence and draft repository tests; these use local
fakes and do not access production D1. Full CLI logs and verification outputs
are under ignored `.river-dev/state/food-commerce-003-*.log`.

Astro production build passed. Both Table routes returned HTTP 200 and CSS loaded
on three preview checks. The generated storefront still has no customer checkout,
payment form, invented price or private operating costs. The actual Southwest
Harvest Bowl remains nonpayable; no production schedule or delivery policy is
approved. Readiness continues through the existing engine validator, and even
synthetic PASS evidence does not configure a production adapter.

Global Astro check retains the existing 250 errors, 0 warnings and 17 hints;
there are no new diagnostics in this phase's files. An initial new readonly
assignment error/unused test import were fixed. Local Wrangler logging was
directed to ignored state for build/check. Reviewed tsx execution uses the
previously established working environment because sandboxed Windows user lookup
fails before tests. No denial was bypassed.

Created paths are the seven implementation/test/schema paths above and this
specification. Modified only `scripts/food/README.md`. Preserved the complete
incoming 002R working tree, including Navbar and all untracked files; no engine,
production D1/Stripe, public route, live migration, Sesh or insurance file changed.
No real customers, payments, live credentials, external notifications, remote
migrations, commits, pushes or deployments.

## Next: integrated checkout testing and explicit commercial launch gates

Before any actual Stripe test-mode request: separately authorize it; configure
real test credentials outside source; authenticate owner/server entry points;
bind actual Stripe account/environment, session/payment/order and exact product
versions; verify provider signatures; persist durable inbox/outbox/retry state;
complete actual D1 concurrency/rollback and migration compatibility validation;
test duplicate/out-of-order and late-event/refund recovery with provider events.
Do not import fixture signers or trust synthetic metadata as a production gate.

Commercial activation additionally requires actual recipe, ingredient/allergen,
packaging/label, cooling/storage, capacity, pickup/delivery, approved price, tax,
payment/reconciliation/confirmation evidence and explicit owner authorization.
Software tests are not food-safety approval. A checklist alone must never enable
an endpoint. Production ordering requires a separately implemented, reviewed and
authorized activation stage.
