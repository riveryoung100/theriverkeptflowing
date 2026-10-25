# FOOD-COMMERCE-004 — integrated checkout preparation

2026-10-22. Local, private, offline and synthetic only. Built on the verified
FOOD-COMMERCE-002R and FOOD-COMMERCE-003 passes. Branch remains
`cif-001-canonical-content-source-record`, HEAD
`99af8686f1564372875409b6ca4fe52144f68dbe`.

## Integrated application contract

`createTableCheckoutService` orchestrates the existing catalog, readiness review,
order engine, capacity model, SQLite/D1-contract repository, signed-fixture
verifier and operations projection. There is no second catalog, lifecycle,
calculator or persistence system. The service is never imported by public pages,
components, API routes or production commerce handlers.

The service provides:

- `eligibility`: exact product/version and existing launch-review assessment;
  domain eligibility, synthetic test eligibility, commercial authorization,
  payment verification and fulfillment authorization remain separate.
- `select`: a strict, minimal synthetic selection contract. Unknown fields such
  as totals, payment claims and customer address data are rejected. Quantity,
  product version, availability, positive approved price and launch assertions
  are checked before draft persistence. Only synthetic fixture product/order
  identities can enter this application service.
- `quote`: delegates authoritative integer-cent merchandise/fee/tax snapshots to
  the existing engine with current product and readiness checks.
- `reserve`: delegates current quote, scheduling, delivery/approval and durable
  multi-resource capacity admission to the existing repository. A quote alone
  neither reserves a window nor accepts payment.
- `receiveWebhook`: verifies an exact raw-body/signature using the existing
  offline test adapter, then reconciles the signed synthetic evidence. Payment,
  acceptance and capacity commitment remain one repository CAS; there is no
  separate unverified accept command.
- `progress`: validates owner lifecycle transitions through the existing engine.
  Handoff/dispatch cannot silently adopt an edited schedule. The service checks
  the original quote window and passes an authority fingerprint into the durable
  transition boundary; a changed source or competing revision fails closed.
- `confirmation`: emits only the whitelist synthetic confirmation contract.
- `recover`: persists expiry, retries deferred refund work and reports remaining
  refund/fulfillment exceptions. Resolved late refunds are removed from the
  unresolved report.
- `operations`: reports existing event-derived receipts/queues/costs, with explicit
  unknown cost states when no complete costing input is supplied.

The constructor requires an offline test adapter. `commercialAuthorized` and
`realPaymentVerified` remain false. Even a fully asserted synthetic launch
checklist cannot enable an endpoint, configure a production adapter or establish
physical/legal approval.

## Reused backend and production boundary

The service reuses `LocalTableOrderRepository`, `createTableOrderSimulation`,
`SimulationAuthority`, `SimulationOrder`, `createTableCapacityModel`,
`calculateTableOrderPreview`, `tableCommercialBlockers`,
`validateFoodPurchaseQuantity`, `assessLaunchReadiness`,
`createOfflineStripeTestAdapter` and `summarizeTableSimulation`.
Underlying exact merchandise/physical-order/payable-assessment contracts and
`FoodD1Database`/statement/result interfaces remain those documented in 003.

Production Stripe ingestion and guarded D1 reservation mutation sources were
inspected read-only. They were not modified or invoked. Canonical D1 physical
orders remain requested/cancelled snapshots; synthetic planned capacity remains
distinct from stocked SKU inventory. D1 slot-unit semantics differ from the
simulation's meal capacity. Target-D1 concurrency, guarded source revisions,
cross-domain atomic acceptance and migration compatibility still require actual
verification. Local SQLite CAS/concurrency tests do not establish those facts.

No local schema migration was needed. New repository readers reconstruct current
authority and the authority/window at the original quote from existing history.
The new optional transition guard is a concurrency precondition, like expected
version, not a change to command identity. Existing journal/receipt hashes and
the retained SQLite fixture remain compatible; legacy commands still work.

## Confirmation safety

`syntheticOrderConfirmation` exposes only a labeled simulation reference, status,
whitelisted product names/disclosures/quantities and money snapshots, fulfillment
method, confirmed synthetic window and fixed simulation guidance. It excludes
owner costs, profit targets, evidence/source references, event history, customer
references, provider IDs, secrets, signatures and private address evidence.

Before signed acceptance, no window is described as confirmed and payment is
`not-confirmed`. Late payments have a separate
`synthetic-payment-requires-refund` status, without accepting the canceled order.
Confirmed refunds use `synthetic-refund-confirmed`. Every projection explicitly
says `realOrder: false` and `realPaymentVerified: false`.

Accepted synthetic windows come from the quote's historical authority, never
today's edited schedule. Refunds preserve historical fulfillment. An edited
window or changed delivery authority blocks dispatch/handoff for owner review;
there is no automatic rescheduling or invented replacement appointment.
Delivery readiness is labeled Ready for delivery. Closed/refunded/fulfilled
orders explicitly mark the handoff inactive and label retained times historical.

These projections are private tooling output only. Future customer tracking
requires authenticated order ownership or a high-entropy scoped token, hashed
token storage, expiry/revocation, rate limiting, access auditing, cache/privacy
controls and generic unknown-order errors. Stable order references alone must
never authorize retrieval. No tracking URL, bearer token, public retrieval
endpoint, customer email or SMS delivery was added.

## Closed public storefront experience

The existing cream/ivory and river-green design, editorial typography,
photography placeholder, shared navigation and truthful ingredient/allergen
disclosures remain. Changes add:

- Accessible disabled increment/decrement quantity controls, minimum one and
  honest unverified maximum/capacity messaging.
- A reusable disabled fulfillment-window selector, without fabricated dates,
  locations or trips, and clearer delivery/manual-approval limitations.
- A reusable status component backed by presentation-only status vocabulary for
  unavailable, awaiting confirmation, accepted, preparing, ready, delivery,
  fulfilled, canceled, refund-pending and refunded stages. The actual product
  renders only **Not yet available**.
- An honest packaging/testing note and scoped styles for the new controls,
  status block and keyboard focus treatment.

No enabled purchase controls, order form, customer input capture, price,
nutrition claim, fake completed order or synthetic receipt is published.
The actual Southwest Harvest Bowl remains experimental and nonpayable. No public
brand or exclusively vegan/vegetarian business claim was introduced.

## Private financial reconciliation

Existing synthetic receipt, tax, refund, preparation-cost and consumed-capacity
logic is retained. Reports now include gross order count and separately entered
food, packaging and fulfillment cost allocations, operating expenses and the
private planning target. These component costs are subsets of variable cost,
not additional deductions. Costs accrue when preparation starts, including
prepared cancellations and waste.

Omitting costing input yields `costStatus: unverified` and null cost/profit
fields, while known signed synthetic receipts remain reportable. Incomplete or
invalid supplied costing records still fail through the existing calculator.
There are no guessed costs or missing-as-zero defaults. Complete synthetic
costing remains labeled synthetic-entered; real revenue is always null.
The existing owner-defined weekly operating-profit target stays private.

## Verified CLI commands

The existing `scripts/food/durable-order-simulation.ts` now supports integrated
commands with `--order synthetic-reference`, using the same Git-ignored file:
`.river-dev/state/food-commerce-003/synthetic-table-orders.sqlite`.
The original five unqualified 003 modes remain compatible; its legacy operations
command was also rerun successfully.

Full journey, confirmation, private operations, refund and recovery:

```powershell
node --import tsx scripts/food/durable-order-simulation.ts journey --synthetic --order synthetic-004-journey
node --import tsx scripts/food/durable-order-simulation.ts confirmation --synthetic --order synthetic-004-journey
node --import tsx scripts/food/durable-order-simulation.ts operations --synthetic --order synthetic-004-journey
node --import tsx scripts/food/durable-order-simulation.ts refund --synthetic --order synthetic-004-journey
node --import tsx scripts/food/durable-order-simulation.ts recover --synthetic --order synthetic-004-journey
```

Individual stages, including an authenticated synthetic payment and its atomic
acceptance/capacity commitment:

```powershell
node --import tsx scripts/food/durable-order-simulation.ts new --synthetic --order synthetic-004-stages
node --import tsx scripts/food/durable-order-simulation.ts quote --synthetic --order synthetic-004-stages
node --import tsx scripts/food/durable-order-simulation.ts reserve --synthetic --order synthetic-004-stages
node --import tsx scripts/food/durable-order-simulation.ts payment --synthetic --order synthetic-004-stages
node --import tsx scripts/food/durable-order-simulation.ts accept --synthetic --order synthetic-004-stages
node --import tsx scripts/food/durable-order-simulation.ts prepare --synthetic --order synthetic-004-stages
node --import tsx scripts/food/durable-order-simulation.ts ready --synthetic --order synthetic-004-stages
node --import tsx scripts/food/durable-order-simulation.ts fulfill-step --synthetic --order synthetic-004-stages
```

`accept` only checks an existing signed acceptance; it cannot create one.
`ready` records synthetic packaging/handling evidence, not physical validation.

Expiration, late-payment refund, cancellation and injected crash-boundary recovery:

```powershell
node --import tsx scripts/food/durable-order-simulation.ts new --synthetic --order synthetic-004-expiry
node --import tsx scripts/food/durable-order-simulation.ts quote --synthetic --order synthetic-004-expiry
node --import tsx scripts/food/durable-order-simulation.ts reserve --synthetic --order synthetic-004-expiry
node --import tsx scripts/food/durable-order-simulation.ts expire --synthetic --order synthetic-004-expiry
node --import tsx scripts/food/durable-order-simulation.ts payment --synthetic --order synthetic-004-expiry
node --import tsx scripts/food/durable-order-simulation.ts refund --synthetic --order synthetic-004-expiry
node --import tsx scripts/food/durable-order-simulation.ts recover --synthetic --order synthetic-004-expiry
node --import tsx scripts/food/durable-order-simulation.ts crash-recovery --synthetic --order synthetic-004-crash
node --import tsx scripts/food/durable-order-simulation.ts accept --synthetic --order synthetic-004-crash
node --import tsx scripts/food/durable-order-simulation.ts cancel --synthetic --order synthetic-004-crash
node --import tsx scripts/food/durable-order-simulation.ts refund --synthetic --order synthetic-004-crash
```

Every command above was executed. For the first run, expiry and crash scenarios
ran before the full/prepared journeys so released capacity was available. The
crash case injects a lost acknowledgment **after** SQLite commits reconciliation,
closes/reopens a connection, then retries the exact signed event. No process is
killed. Subsequent invocations report idempotent replay if the prior receipt is
already present. Separate tests inject SQL failure before commit.

These references already exist in the retained fixture. Retrying commands reads
their current/terminal state and does not start new orders or reset inventory.
Reports aggregate all retained fixture orders, including 003. Prepared meals
continue consuming finite capacity even after refund; exhausted capacity must
reject additional reservations. Do not delete/reset the fixture to hide this.
All fixtures use opaque synthetic identities and no personal data or network.

## Tests and verification

```powershell
node --import tsx --test src/lib/food/table-checkout-service.test.ts
node --import tsx --test src/lib/food/table-local-order-repository.test.ts src/lib/food/table-order-engine.test.ts
node node_modules/astro/bin/astro.mjs build
node --import tsx --test scripts/food/storefront-output.test.ts
node scripts/food/preview.mjs --verify
```

33 new integrated-service tests and one new generated-output check pass.
Combined focused invocation: 108 tests (33 service, 29 repository, 42 engine,
4 generated-output). Additional relevant existing food/D1/payment/fulfillment
regressions: 446 pass. Costing, recipe and launch tests: 37 pass. Total: **591
passing tests**, including all 557 tests from the prior verified scope.

Coverage includes invalid identity/version/quantity, missing price/readiness,
closed/unavailable fulfillment, capacity competition, stale versions, quote
expiry, raw-body signatures and mismatch checks, duplicate/out-of-order events,
late-payment refunds, SQL failure, lost acknowledgment/restart, manual delivery
approval expiry/withdrawal, delivery progression, consumed-capacity safeguards,
confirmation sanitization/original schedule, authority races, unknown costs and
public import/output isolation. Existing 003 tests retain actual two-connection
SQLite contention and file-backed restart coverage. No unrelated full-repository
suite or production D1 integration was run.

Astro build passed; both Table routes remain generated. HTTP preview and scoped
CSS checks passed in three rounds. Browser setup succeeded but selection reported
no browser; troubleshooting discovery returned an empty list. Rendered graphical
review is **UNVERIFIED**, including viewport/overflow/contrast interactions.
Source checks do not substitute for that review.

Global Astro check remains at the existing 250 errors, 0 warnings, 17 hints,
with no diagnostics naming changed/new phase files. Build/check logs use ignored
local Wrangler paths; tsx uses the previously approved execution environment.
Logs, fixture data and a before/after hash inventory are private under ignored
`.river-dev/state/food-commerce-004-*` paths.

## Changed paths and integrity

Created:

```text
src/lib/food/table-checkout-service.ts
src/lib/food/table-checkout-service.test.ts
src/lib/food/table-checkout-confirmation.ts
src/lib/food/table-order-status.ts
src/components/table/OrderStatus.astro
src/components/table/FulfillmentWindow.astro
.river-dev/specifications/food-commerce-004-integrated-checkout.md
```

Modified:

```text
src/lib/food/table-local-order-repository.ts
src/lib/food/table-order-operations.ts
scripts/food/durable-order-simulation.ts
scripts/food/storefront-output.test.ts
scripts/food/README.md
src/components/table/QuantitySelector.astro
src/components/table/FulfillmentOptions.astro
src/components/table/OrderSummary.astro
src/pages/the-table/[slug].astro
src/styles/table-launch.css
```

Incoming tracked/untracked work is preserved. Catalog, engine, payment verifier,
production Stripe/D1 sources, live migrations, Navbar, insurance and Sesh are
unchanged. No public ordering/status/admin endpoint, real customers, live keys,
Stripe requests, production database access, notifications, commit, push or
deployment occurred.

## Next integration stage

Verify concurrency/rollback and source revision semantics in target D1 before
adopting a production schema or adapter. Separately authorize actual Stripe
test-mode end-to-end calls with genuine test credentials held outside source;
verify actual account/environment/session/payment linkage, durable inbox/outbox,
refund retry and authenticated confirmation access. Synthetic signing helpers
must remain unreachable from that production request path.

Commercial launch additionally needs actual recipe/quality/ingredient/allergen,
portion/packaging/label, applicable Texas/food-handler, cooling/freezing/storage,
refrigeration/capacity, pickup/delivery, receipt-based costs/price/tax/fees,
security/logging, payment/confirmation/reconciliation evidence and explicit owner
sales approval plus separate deployment authorization. Private readiness reports
prepare assertions; they cannot provide legal or food-safety approval or activate
sales by setting a Boolean.
