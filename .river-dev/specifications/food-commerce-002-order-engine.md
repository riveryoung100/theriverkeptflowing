# FOOD-COMMERCE-002 — private offline order engine

2026-10-21. The Table / The River Kept Flowing. Local development only.
No real orders, live payments, customer contacts, messages, remote database
operations, migrations, commits, pushes or deployments are authorized here.
No physical recipe, handling process, price, schedule or legal approval is
established by this implementation or its tests.

## Run the private workflows

From the project directory, using the already-installed tsx runner:

```powershell
# Synthetic customer selection -> quote -> fake payment -> simulated acceptance
node --import tsx scripts/food/order-simulation.ts order --synthetic

# Synthetic preparation, packaging/cold-chain evidence reference, and pickup
node --import tsx scripts/food/order-simulation.ts fulfill --synthetic

# Private deterministic synthetic operations and finance report
node --import tsx scripts/food/order-simulation.ts operations --synthetic

# New focused tests
node --import tsx --test src/lib/food/table-order-engine.test.ts
```

The commands require `--synthetic`, reconstruct an isolated in-memory scenario,
and discard it when the process exits. They do not read customer files or access
the network. No actual checkout session, card charge, delivery dispatch, order
confirmation number, email or SMS is created. Any displayed amounts, locations,
schedules or approvals belong exclusively to explicitly synthetic fixtures.
The three CLI modes were executed locally, not merely documented.

Optional output belongs only in ignored `.river-dev/state/`:

```powershell
node --import tsx scripts/food/order-simulation.ts operations --synthetic > .river-dev/state/simulated-operations.txt
```

The actual production schedule is **UNVERIFIED and UNAPPROVED**. The actual Table
catalog remains in development with no approved price; an engine test confirms
it cannot produce a payable quote or capacity hold.

## Architecture and reuse

The new modules are local modeling/orchestration layers over existing food
contracts. They are not a competing persisted order/payment system:

| Module | Responsibility |
| --- | --- |
| `table-order-engine.ts` | Frozen quote/source snapshots, explicit order transitions, command/event replay protection, simulation proof boundary, local orchestration |
| `table-capacity-model.ts` | In-memory batch/window resource adapter, revision-checked holds, commitment, expiry, release and capacity changes |
| `table-scheduling.ts` | Explicit UTC/local scheduling, cutoff/lead rules, delivery eligibility and exact manual-approval scope |
| `table-order-operations.ts` | Private simulated operational/financial projection from valid engine events and existing costing calculation |
| `scripts/food/order-simulation.ts` | Explicitly synthetic authority/finance fixtures and private executable workflows |

Product identity, version, ingredient/allergen evidence, SKU/package and approved
price validation come from `table-catalog.ts` and its underlying food validators.
The engine reuses `calculateTableOrderPreview`, `createInitialFoodMerchandiseQuoteVersion`,
`createInitialFoodFulfillmentIntentVersion`, `createInitialFoodReservationRequestVersion`,
`createInitialFoodPhysicalOrderVersion` and `createInitialFoodPayableAssessmentVersion`.
It cross-checks the final payable assessment against the preview calculation.
There is no second merchandise calculator or production tax engine.

Existing `physical-order-domain.ts` deliberately represents requested/canceled
physical-order snapshots, not a complete preparation/payment state machine. The
simulation keeps those historical snapshots unchanged and overlays its explicitly
simulation-only lifecycle. Stable simulation order identity is separate from
the exact immutable quote/physical-order versions generated during requoting.
No such record is persisted as a real requested or accepted customer order.

Existing `production-batch-domain.ts` records physically produced package counts,
which must not be confused with planned production capacity. This model's `batch`
resource is a synthetic **planned-capacity** resource, not an assertion of real
food production or stocked inventory. Existing reservation source-selection,
hold-command, D1 mutation, durable acceptance and verification domains remain
the future authority for real capacity. No D1 adapter was replaced or invoked.

## State and payment boundaries

```text
draft-cart
  -> quote-awaiting-pricing OR fulfillment-unavailable
  -> quote-ready
  -> awaiting-payment (synthetic capacity held)
  -> simulation-payment-recorded
  -> accepted (synthetic hold committed)
  -> preparing
  -> ready-for-pickup (staged/ready for delivery when method is delivery)
  -> [out-for-delivery, for delivery only]
  -> fulfilled

Unpaid cancellation -> canceled
Paid cancellation -> refund-pending -> refunded
Fulfilled refund request -> refund-pending -> refunded
```

Every order carries `mode: simulation-only` and `realPaymentVerified: false`,
including after simulated acceptance and fulfillment. The actual payment-verified
boundary belongs to existing trusted payment evidence and a future secure
adapter. No engine command reaches it. The exposed live-adapter descriptor is
unconfigured and incapable of authorization.

`fakePayment` and `fakeRefund` create process-local proof objects registered to
their own engine instance. A copied, JSON-reconstructed, altered, unsigned,
cross-engine or Stripe-shaped object is not a recognized proof. Proofs bind
event identity, order, frozen quote and exact cents; payment currency is USD.
Payment event IDs and refund event IDs cannot be reused for another order.
The fake proof shape also fails the existing electronic-confirmation validator.
No conversion to a real `VerifiedPaymentEvent` is implemented.

The simulation proof boundary is deliberately **not cryptographic provider
verification**. Its safety comes from having no live adapters, endpoints or
production effects. It cannot be copied into a live checkout as an authority.
The CLI accepts no real payment event or customer payload.

Invalid transitions throw before state changes. Command IDs are namespaced by
order; matching retries return current state without adding events or effects.
Different contents under the same ID fail. Expected order versions reject stale
commands, and events cannot move backward in time. Repeated payment/refund events
are also deduplicated independently of command IDs. Refunded/canceled orders
cannot become active or fulfill through a new command.

Cart and fulfillment selection can change only before checkout starts. Doing so
invalidates the quote, and quote sequence numbers remain monotonic. All returned
snapshots are deeply frozen. No client price or total field is accepted.

## Quote, launch and availability rules

The constructor takes an explicitly synthetic authority snapshot, not trusted
browser product records. Product/version selection resolves against that catalog.
Quotation requires positive approved integer-cent prices, complete approved
disclosures, availability, measured package/serving information and handling
instructions, known order/capacity limits and fulfillment eligibility.

The existing private `assessLaunchReadiness` validator runs against each exact
product/version review. All display/production/commercial evidence assertions
and separate explicit launch authorization must report PASS. Missing evidence
does not pass. This code reuses that validator without modifying or overriding
it. Synthetic PASS assertions are not real compliance evidence.

Quotes also require the configured sales interval and production cutoff to be
open, the approved price to be unexpired, and the selected handoff window to
meet all schedule/eligibility rules. The production day cannot fall after the
handoff day. Missing price, fee or reviewed tax classification/amount leaves
the result nonpayable. Explicit reviewed zero is distinct from unknown. No
Texas tax classification or rate is invented.

Quote expiry is bounded by quote lifetime, sale/price/order/window cutoffs and
manual-approval expiry where present. The quote fingerprints the authority
snapshot. Before beginning checkout, recording a fake payment or accepting it,
the engine revalidates current authority, time, launch, fulfillment and total.
A price/fee/policy/version change invalidates a pending quote; cancellation and
requote are required rather than silently charging a revised total. This
fingerprint is conservative: even an unrelated authority change can invalidate
a pending quote. After the payment boundary the original prices stay frozen.
Launch evidence is checked again before preparation/release/fulfillment.

## Capacity and transaction limits

Each synthetic hold claims all required planned-batch resources **and** the
fulfillment window in one model mutation. A single quantity is counted once per
resource; duplicate resource lines are rejected. A verified current quote is
required by the adapter's injected hold-authorizer. All resource checks precede
mutation, and injected reservation failures leave order, batch and slot unchanged.

The model uses an expected revision to reject deterministic competing snapshots.
Two attempts for the last units cannot both succeed in that sequential model.
Holds, accepted commitments, remaining units and sold-out status are exposed in
private snapshots. Reducing capacity below existing commitments is rejected.
Resizing the adapter never creates a verified schedule or raises configured
product/window ceilings; those independent authority limits remain in force.

`cleanup` expires unpaid holds at the explicit clock instant. Unpaid orders are
canceled; a fake payment recorded just before hold expiry moves to refund-pending
if it was not accepted. A late event cannot revive expired capacity. Committed
accepted holds do not expire automatically. New cleanup instants need distinct
command IDs; exact retries are idempotent.

Canceling before preparation releases held/committed planned capacity. Canceling
after preparation starts **retains** that commitment; those meals must not
magically reappear as sellable inventory. The simulated report retains their
variable costs as waste. Post-dispatch cancellation is intentionally rejected;
recall/exception policies and partial refunds remain future work. Full refunds
are modeled; no partial-refund or card-settlement implementation is claimed.

This is **not atomicity across real concurrent users/processes**. Future D1
integration must reuse and audit the existing guarded transaction/reservation
machinery, preserving at least these invariants:

1. Resolve exact authoritative product/price, SKU, stock/capacity source and
   window revisions in trusted server context. A local planned batch is not
   physically stocked inventory evidence.
2. Atomically guard all SKU/batch/window quantities, source revisions, cutoff
   checks, reservation identity and duplicate-request uniqueness. Never do a
   read-then-unconditional-write from a browser or separate unguarded statements.
3. Commit all reservation lines and durable acceptance evidence together, or
   leave all unchanged. Validate outcomes before marking the order accepted.
4. Make expiry/release/commit state-conditional and idempotent. Race cleanup
   against payment acceptance using a single authoritative order/reservation
   version. Late payment after expiry needs reconciliation/refund, not oversell.
5. Persist order commands/provider events with stable unique keys. Coordinate
   accepted reservation and paid-order state through a durable transaction or
   explicit recoverable orchestration; handle process death between effects.
6. Do not hold a database transaction open during a processor or messaging call.
   Use persisted intents, retries, bounded lifetimes and a transactional outbox
   or equivalent recovery design for external effects.

## Scheduling and delivery scope

All instants include explicit UTC `Z`; no server-local timezone or `Date.now()`
drives decisions. Each window declares its local day/time, timezone, approved
opaque handoff reference, UTC start/end, order cutoff, minimum lead time,
capacity, closed/unavailable days and evidence reference. UTC instants are
cross-checked against `Intl` timezone formatting. Tests cover local date rollover,
the repeated fall-back hour and an impossible spring-forward local time.

Handoff is rejected outside the selected window. Preparation cannot precede
the configured production day. Ready/dispatch/handoff commands require opaque
packaging/cold-chain/handoff evidence references; those references are assertions
for model testing, not validation of physical temperatures or safe food.

Delivery requires a verified policy version, zone and maximum distance, verified
address/distance evidence, approved handoff, delivery window and known fee.
All examples use synthetic references and measurements. There is no routing,
geocoding, distance estimator, travel-time promise or customer address collection.

An outside-area selection produces an awaiting-manual-approval eligibility result
and a fulfillment-unavailable order. A subsequent private `select-fulfillment`
command can include reviewed synthetic approval; it invalidates/requotes first.
Approval binds request, order, location, window, policy version, distance, fee,
expiry and evidence. It never authorizes payment. Once checkout starts selection
cannot change under the frozen quote. The future real flow must authenticate
owner approvals and revalidate plan/price before payment and before dispatch.

## Private operations accounting

The report derives its queue, receipts and quantities from engine-produced
events and frozen quotes, not arbitrary customer JSON. It reports awaiting
approval, paid simulation orders, batches, meals to prepare, pickup/delivery
queues, historical fulfillment, cancellations and outstanding refunds.
Duplicate payment events do not duplicate receipts. Real revenue is `null` and
the report explicitly says SIMULATED / REAL DATA UNAVAILABLE.

The existing private costing calculator validates the supplied synthetic cost
profile. Preparation-start events incur its variable per-bowl cost, including
subsequently canceled food. Weekly fixed costs are applied once. Tax is excluded
from operating revenue. Full refunds and pending-refund provisions remove
associated operating receipts and tax liability from the modeled totals.
The report is a simplified cash/provision model, not business accounting or a
processor settlement statement. Unprepared accepted meals have no incurred
variable cost in this model yet; that is not a forecast of their eventual profit.
Mixed product/version reports fail until a per-product cost adapter is supplied,
preventing silent use of one bowl's cost across different products.

The owner's the owner-defined target target remains in private costing, not the storefront. Actual
ingredient/packaging/labor receipts, refunds, production waste, settlement fees,
tax obligations and profit are still unavailable.

## Next secure payment integration boundary — existing system read only

`stripe-webhook-ingestion.ts` verifies raw body/signature using
`Stripe.webhooks.constructEventAsync` before normalizing supported events.
`stripe-webhook-runtime.ts` composes registered product fulfillment through
`handoffVerifiedPaidOrderAtRuntime`. `processVerifiedPaidOrder` requires a paid
event, normalizes it and saves the canonical order before fulfillment, relying
on durable identity/idempotency contracts. The runtime currently resolves
approved digital release artifacts and a delivery-message provider; it is not
automatically a prepared-food dispatch service. None of these sources changed.

Future food integration should reuse those trust/replay boundaries, the existing
provider-neutral food confirmation/reconciliation domains and reservation
repositories, rather than adding an unsigned alternate payment endpoint:

1. Authenticate/validate a minimal order request and resolve authoritative exact
   product/SKU/approved price and independent explicit launch authorization.
2. Revalidate food fulfillment, owner approvals, schedule, capacity, charges and
   product-specific tax treatment; persist a versioned quote and expiring hold.
3. Persist a food-specific payment-session intent with exact order/quote/payable
   assessment/hold references and an idempotency key. Create only an authorized
   test-mode session in the next phase; production remains separately gated.
4. Verify provider raw-body signatures and environment/account/mode before
   trusting any event. A browser success redirect or session ID is not proof.
5. Uniquely persist provider event/payment identities; require correct paid
   state, amount, currency, product/order versions and current reservation.
   Different event IDs for one payment must not create another order.
6. Reconcile the exact payable assessment, durable capacity commitment and
   accepted food order. Recover partial failures and late/out-of-order events;
   duplicates return the recorded outcome rather than repeat acceptance.
7. Confirm once through a durable idempotent messaging boundary only after
   payment and capacity are authoritative. Schedule preparation and protect
   actual cold-chain release. Never attach a digital-release delivery adapter
   to physical-food dispatch by default.
8. Handle failed/expired sessions, cleanup races, cancellations, refund attempts,
   refund verification and retry/outbox reconciliation. Preserve immutable paid
   snapshots; do not turn refunded orders back into paid orders on old replays.

Physical launch gates, authenticated approval, durable atomicity, real test-mode
provider integration, confirmation delivery and operational exception policies
remain future work. No simulated proof or local readiness PASS can unlock them.

## Regression and build commands

```powershell
node --import tsx --test src/lib/food/table-order-engine.test.ts
node --import tsx --test src/lib/food/table-storefront.test.ts src/lib/food/cart-quote-domain.test.ts src/lib/food/approved-commercial-price-domain.test.ts src/lib/food/fulfillment-capacity-reservation-domain.test.ts src/lib/food/menu-publication-domain.test.ts src/lib/food/physical-order-domain.test.ts src/lib/food/payable-assessment-domain.test.ts src/lib/food/payment-reconciliation-domain.test.ts src/lib/food/reservation-acceptance-domain.test.ts src/lib/food/reservation-hold-command.test.ts src/lib/food/fulfillment-slot-capacity-source-domain.test.ts src/lib/food/production-batch-domain.test.ts
node --test scripts/food/cost.test.mjs scripts/food/recipe-lab.test.mjs scripts/food/launch-readiness.test.mjs
node node_modules/astro/bin/astro.mjs build
node --import tsx --test scripts/food/storefront-output.test.ts
node scripts/food/preview.mjs --verify
```

The tsx runner requires Windows user metadata; its sandbox limitation was already
known. Local tsx executions used approved execution outside that sandbox. They
used only local synthetic fixtures and no network/production service. No new
dependencies were installed.

## FOOD-COMMERCE-002R recovery validation — 2026-10-22

Recovered the existing working tree on `cif-001-canonical-content-source-record`,
HEAD `99af8686f1564372875409b6ca4fe52144f68dbe`. Preserved all pre-existing
changes. No implementation rewrite or source fix was necessary. The actual
focused suite contains 42 tests, exceeding the earlier reported 40.

Verified results:

- Focused order engine: 42/42 pass.
- Food/storefront domain regression command above: 310/310 pass.
- Costing, recipe lab and launch readiness: 37/37 pass.
- Existing commerce/payment and fulfillment regression command below: 79/79 pass.
- Generated storefront output: 3/3 pass. Total: 471 passing tests.
- All three documented synthetic CLI modes exit 0. `order` ends accepted;
  `fulfill` ends fulfilled; `operations` derives its report from those synthetic
  engine events. The fixture reports 2 prepared/fulfilled meals, 2580 cents gross,
  80 cents tax, 2500 cents operating revenue, 800 cents variable costs and 500
  cents fixed costs, yielding 1200 cents simulated profit. Real revenue is null.
- Astro production build exits 0 and generates both Table routes.
- `node scripts/food/preview.mjs --verify` exits 0: both Table routes return HTTP
  200, with CSS delivered on all three checks; the helper stops its own server.
- `node node_modules/astro/bin/astro.mjs check` completes with the exact existing
  baseline: 250 errors, 0 warnings, 17 hints across 1827 files. No diagnostics
  reference the recovered engine, catalog, preview, tests, CLI, Table components
  or Table pages. Global typecheck remains failing; unrelated errors were left
  untouched. Full diagnostics are local in ignored
  `.river-dev/state/food-commerce-002r-typecheck.log`.

The initial sandboxed tsx test failed before executing tests because Windows
`uv_os_get_passwd` returned ENOMEM. Reviewed execution outside the sandbox was
approved and passed. Build/check also reported EPERM writing Wrangler's default
external log directory; build completed successfully and check produced the
complete baseline diagnostics. No denied command was bypassed.

Additional verified local regression command:

```powershell
node --import tsx --test src/lib/commerce/payment-event.test.ts src/lib/commerce/paid-order-fulfillment.test.ts src/lib/commerce/stripe-webhook-ingestion.test.ts src/lib/commerce/stripe-webhook-runtime.test.ts src/lib/fulfillment/lifecycle.test.ts src/lib/fulfillment/orchestration.test.ts src/lib/food/electronic-payment-confirmation-domain.test.ts src/lib/food/cash-payment-evidence-domain.test.ts src/lib/food/manual-fulfillment-approval-domain.test.ts
```

Cancellation/refund and delivery/manual-approval scenarios are exercised by the
focused tests; they are not additional CLI modes. Prepared cancellations retain
consumed capacity. The model handles planned capacity only, not already-stocked
inventory; the durable transaction requirements above remain mandatory for live
multi-customer ordering. No real schedule or delivery policy was approved.

Only this specification and `scripts/food/README.md` were edited during recovery.
The incoming tracked modification was `src/components/Navbar.astro`. Incoming
untracked files, all retained:

```text
.river-dev/specifications/food-commerce-001-storefront-foundation.md
.river-dev/specifications/food-commerce-002-order-engine.md
.river-dev/specifications/food-launch-001-first-order.md
.river-dev/specifications/food-recipe-001-reheat-first.md
scripts/food/README.md
scripts/food/cost.mjs
scripts/food/cost.test.mjs
scripts/food/input.template.json
scripts/food/launch-readiness.mjs
scripts/food/launch-readiness.template.json
scripts/food/launch-readiness.test.mjs
scripts/food/order-simulation.ts
scripts/food/preview.mjs
scripts/food/recipe-lab.mjs
scripts/food/recipe-lab.template.json
scripts/food/recipe-lab.test.mjs
scripts/food/storefront-output.test.ts
src/components/table/FulfillmentOptions.astro
src/components/table/OrderSummary.astro
src/components/table/ProductAvailability.astro
src/components/table/ProductCard.astro
src/components/table/ProductImage.astro
src/components/table/QuantitySelector.astro
src/lib/food/table-capacity-model.ts
src/lib/food/table-catalog.ts
src/lib/food/table-order-engine.test.ts
src/lib/food/table-order-engine.ts
src/lib/food/table-order-operations.ts
src/lib/food/table-order-preview.ts
src/lib/food/table-scheduling.ts
src/lib/food/table-storefront.test.ts
src/pages/the-table/[slug].astro
src/pages/the-table/index.astro
src/styles/table-launch.css
```

Source/import and built-output checks confirm no simulation imports in public
pages/components/payment handlers, no food-order API addition, no public checkout
or Vie Naturelle branding, and the actual Southwest Harvest Bowl remains
nonpayable. No real customers, payments, revenue, live Stripe calls, production
D1 mutations, secret exposure, deployment, commit or push occurred.
