# Private first-batch costing

1. Copy `scripts/food/input.template.json` to `.river-dev/state/first-batch.json`.
2. Replace every `null` with a verified nonnegative integer and enter weekly quantities in `quantities`.
3. Run from the project folder:

```powershell
node scripts/food/cost.mjs .river-dev/state/first-batch.json
```

Use cents, not dollars, for every `Cents` field. Set the desired profit target privately in local inputs. The blank template contains no assumed prices or costs.

All variable fields are **per bowl sold**:

- `sellingPriceCents`: proposed selling price, excluding collected sales tax.
- `ingredientsCents`: receipt-based cost of the measured edible portion; include sauce and subingredients.
- `packagingAndLabelsCents`: bowl, lid, sauce container, label and other per-order packaging allocated per bowl.
- `cookingConsumablesCents`: variable cooking supplies and energy allocation.
- `laborCents`: preparation, packing, cleaning and fulfillment labor allocation.
- `paymentProcessingCents`: verified payment fees allocated per bowl at the expected order size, including fixed transaction charges divided by bowls in that order.
- `fulfillmentCents`: pickup/delivery costs allocated per bowl, excluding labor already entered above.
- `ingredientWasteBasisPoints`: **additional ingredient-only cost allowance**, in basis points (100 = 1%; 10000 = 100%). Applied to ingredients and rounded up to a cent per bowl. If measured ingredient costing already includes waste, explicitly enter zero here. This is a cost uplift, not a lost-yield percentage.
- `weeklyFixedExpensesCents`: weekly overhead not already counted per bowl; include all applicable operating expenses and consistently allocate periodic bills to a week.
- `weeklyProfitTargetCents`: desired operating profit before personal taxes.
- `quantities`: nonempty list of nonnegative whole bowls sold in a week.

Do not count any expense twice. Match fees, yield and fulfillment allocations to each scenario; rerun with new inputs when assumptions change. The linear estimate assumes all counted bowls sell at the entered price and costs stay constant. Account for unsold food in verified waste/allocations; this tool does not forecast demand, taxes, discounts, refunds, or step changes in capacity automatically. Include applicable business expenses in the proper entered category. Zero/negative contribution is rejected because no finite sales quantity reaches the target.

The report lists per-bowl costs and contribution, weekly break-even, target quantity rounded up, and revenue/cost/profit totals. Arithmetic uses integer cents and BigInt; no floating point money calculations. Illustrative figures exist only in tests:

```powershell
node --test scripts/food/cost.test.mjs
```

## Local storefront preview

```powershell
node scripts/food/preview.mjs
```

Open http://127.0.0.1:4335/the-table/ and stop with Ctrl+C. Run one instance at a time. The wrapper preserves the Cloudflare adapter and sessions, binds loopback, uses ignored isolated Vite/config/log directories, and includes `astro/assets/services/noop` before optimization. It does not alter production configuration or enable ordering.

A fresh isolated cache reproduced late discovery of that module, reoptimization, worker reload, then a missing old `base-pipeline` chunk. Including the module ahead of time prevented that sequence. Existing `node_modules/.vite` artifacts were left intact. Process enumeration was denied, so competing processes could not be ruled out. In this sandbox, the default Cloudflare registry/log location also produced EPERM; the local XDG/log paths avoid that separate failure.

Verification without leaving a server running:

```powershell
node scripts/food/preview.mjs --verify
```

This uses port 4336, checks the storefront and CSS three times, then stops its own server. Stop any interactive preview before running it; both commands share the dedicated local cache.

## Private recipe and reheating lab

Create a blank trial (never overwrites an existing file):

```powershell
node scripts/food/recipe-lab.mjs new .river-dev/state/recipe-trial-001.json
```

Edit that JSON file with actual observations. Give each trial a unique `trialId`
and a meaningful `recipeVersion` such as `A-001`, `B-001` or `C-001`. Keep
unmeasured values `null`; never copy synthetic test fixtures into real records.
`portionGrams` is the hot base only; sauce/topping weights are separate.
`storageDays` is actual elapsed duration (fractions allowed); `temperaturesF`
contains actual center/edge/bottom readings after standing. Record additional
readings and their timestamps, exact venting, ingredient/yield records and any
not-applicable components in `measurementNotes` or a linked private batch log.
`standingCovered` records whether the standing period was covered. Enter actual
heating stages, not a proposed schedule. Use actual microwave watts; do not enter
watts for a fresh control. No customer reheating time is provided.

Each safety entry needs `status` (`null`, `pass`, `fail`) and specific `evidence`
(for example a private log filename and row/time). The tool does not verify that
evidence or certify food safety. Missing context/handling data and reheating
measurements are flagged. A recorded failure, a below-165 F reheat reading, or
failure to meet this research screen's covered two-minute standing minimum
produces HOLD regardless of taste. Do not taste food with unresolved safety
controls. The physical protocol and cited source boundaries are in the
[private recipe specification](../../.river-dev/specifications/food-recipe-001-reheat-first.md).

Scores are whole numbers 1–5: unacceptable, poor, acceptable prototype, good,
excellent. Null means untested. Moisture, liquid control and flavor balance rate
suitability, not intensity. For intentionally omitted components, leave scores
null and explain the omission; gaps remain visible. All fields are documented
in the template and specification. Unknown fields and invalid values fail safely.

Compare one file, multiple files, or several trials in one file's `trials` array:

```powershell
node scripts/food/recipe-lab.mjs compare .river-dev/state/recipe-trial-001.json
node scripts/food/recipe-lab.mjs compare .river-dev/state/recipe-trial-001.json .river-dev/state/recipe-trial-002.json
```

Use another filename with `new` for the next trial. The comparison retains
storage/day/wattage groups, shows every entered score and missing measurement,
flags texture defects and identifies unrecorded planned conditions. It does not
rank variants, infer safety from sensory scores, or supply invented results.
The initial-frozen coverage marker is day 0; always record actual elapsed days
even if this leaves a planning gap. The frozen 7/14/30-day checks are quality
research checkpoints, not shelf-life claims. Redirect a report locally if useful:

```powershell
node scripts/food/recipe-lab.mjs compare .river-dev/state/recipe-trial-001.json > .river-dev/state/recipe-report.txt
node --test scripts/food/recipe-lab.test.mjs scripts/food/cost.test.mjs
```

Keep all trials, reports and evidence in ignored `.river-dev/state/`. The utility
uses no database, network, dependencies or public route.

### Cost the three-part product without counting twice

The existing costing utility needs no schema change. Sum the verified hot bowl
and lid, sauce cup and lid, dry pepita packet and all labels into
`packagingAndLabelsCents`. Include hot-base, sauce, pepita and seasoning ingredient
costs once in `ingredientsCents`. Use measured yields for each recipe variant;
do not assume 500 g hot-base targets are raw yields (C is proposed at 380 g).
Allocate actual labor for preparation, cleaning, safety monitoring and packing
all three components. Keep waste, fulfillment, payment fees and fixed overhead
in their existing fields without duplicating allocations. Enter `20000` as the
weekly profit target. Actual prices and costs remain to be measured from receipts.

## Private Table launch-readiness review

```powershell
node scripts/food/launch-readiness.mjs new .river-dev/state/table-launch.json
node scripts/food/launch-readiness.mjs check .river-dev/state/table-launch.json
```

The new file is entirely unverified. Enter reviewed `PASS`, `BLOCKED` or
`UNVERIFIED` statuses with actual evidence references. PASS without evidence is
UNVERIFIED; missing evidence is not the same as a recorded failure. Production,
public display and commercial readiness are reported separately. Explicit launch
authorization needs its own matching product/version, attribution, date and
evidence; ordinary checks cannot supply it. `new` never overwrites an input.
`check` exits 0 for complete evidence assertions, 2 for BLOCKED/UNVERIFIED, and 1
for invalid input. A PASS neither certifies compliance nor enables checkout.
Keep filled records private under `.river-dev/state/`.

The [storefront integration record](../../.river-dev/specifications/food-commerce-001-storefront-foundation.md)
documents the catalog, future secure food ordering contracts, tests and remaining
launch gates. Recipe lab observations support qualified recipe review; receipt
costing supports proposed price; private approval supports selected public facts.
Future live checkout still needs separate authorization and server enforcement.

The local preview verification now follows catalog product links and checks both
the landing page and product details. Normal review remains:

```powershell
node scripts/food/preview.mjs
```

Open http://127.0.0.1:4335/the-table/southwest-harvest-bowl/ . Ordering and payment
stay disabled. The storefront contains no owner finances or private trial data.

## Private synthetic order engine

These commands use synthetic fixtures only, discard their in-memory state on
exit, and cannot create real customer orders, Stripe sessions, payments or
messages. No customer information is requested.

```powershell
node --import tsx scripts/food/order-simulation.ts order --synthetic
node --import tsx scripts/food/order-simulation.ts fulfill --synthetic
node --import tsx scripts/food/order-simulation.ts operations --synthetic
node --import tsx --test src/lib/food/table-order-engine.test.ts
```

`order` runs the synthetic customer flow through simulated acceptance. `fulfill`
adds modeled preparation, cold-chain/packaging evidence references and pickup.
`operations` prints the private simulated queue, capacity and financial report.
These are synthetic observations, not business activity or physical safety
verification. The actual Table catalog, prices and schedule remain unapproved.

The [order-engine specification](../../.river-dev/specifications/food-commerce-002-order-engine.md)
documents state transitions, proof isolation, idempotency, capacity/expiry rules,
timezone and delivery checks, costing assumptions, regression commands, and the
next secure D1/payment integration boundary. Existing recipe, costing and launch
tools remain unchanged. Never import the simulation harness into public pages or
production payment handlers. Any saved report belongs in ignored `.river-dev/state/`.

Recovery verification on 2026-10-22: all three synthetic commands above passed,
along with 42 focused tests, 426 existing regressions and 3 generated storefront
checks (471 tests total). Astro production build and
`node scripts/food/preview.mjs --verify` passed; both Table routes returned HTTP
200 and CSS loaded on three checks. The interactive preview uses the same
verified helper at port 4335. Global Astro check retains the existing 250 errors,
0 warnings and 17 hints; none reference the recovered Table files. The
specification records exact validation commands, environment limitations and
the preserved incoming file inventory. Cancellation/refund and delivery are
focused-test scenarios; the CLI supports only `order`, `fulfill`, `operations`.

## Durable local synthetic integration (FOOD-COMMERCE-003)

The separate durable harness uses built-in Node 24 SQLite, the existing order
engine and installed Stripe signature verifier. It makes no Stripe requests or
real Checkout Sessions. Run from the project root:

```powershell
node --import tsx scripts/food/durable-order-simulation.ts order --synthetic
node --import tsx scripts/food/durable-order-simulation.ts fulfill --synthetic
node --import tsx scripts/food/durable-order-simulation.ts operations --synthetic
node --import tsx scripts/food/durable-order-simulation.ts refund --synthetic
node --import tsx scripts/food/durable-order-simulation.ts recover --synthetic
node --import tsx --test src/lib/food/table-local-order-repository.test.ts
```

All five modes were verified in this sequence. They share the Git-ignored
`.river-dev/state/food-commerce-003/synthetic-table-orders.sqlite` file and retain
the same fixture order across processes. Retries do not create new orders, and
terminal orders do not reactivate. `operations` reads persisted event-derived
queues, costs and explicitly synthetic receipts/refunds; real revenue stays null.
`recover` expires holds and retries deferred refunds at the synthetic clock.
No customer data is requested. Keep database files and reports private.

The [durable foundation specification](../../.river-dev/specifications/food-commerce-003-durable-order-foundation.md)
records reused D1/domain interfaces, local SQL atomicity, signed-fixture trust,
refund recovery, verified commands and the separate production integration gates.
This local schema is not a deployed D1 migration or production-ready order store.

## Integrated private checkout (FOOD-COMMERCE-004)

The same durable simulator now routes explicitly selected synthetic orders
through the integrated application service and prints a sanitized synthetic
confirmation plus private operations. Verified commands:

```powershell
node --import tsx scripts/food/durable-order-simulation.ts journey --synthetic --order synthetic-004-journey
node --import tsx scripts/food/durable-order-simulation.ts payment --synthetic --order synthetic-004-stages
node --import tsx scripts/food/durable-order-simulation.ts fulfill-step --synthetic --order synthetic-004-stages
node --import tsx scripts/food/durable-order-simulation.ts refund --synthetic --order synthetic-004-journey
node --import tsx scripts/food/durable-order-simulation.ts crash-recovery --synthetic --order synthetic-004-crash
node --import tsx scripts/food/durable-order-simulation.ts recover --synthetic --order synthetic-004-journey
node --import tsx scripts/food/durable-order-simulation.ts operations --synthetic --order synthetic-004-journey
node --import tsx --test src/lib/food/table-checkout-service.test.ts
node scripts/food/preview.mjs --verify
```

`new`, `quote`, `reserve`, `payment`, `accept`, `prepare`, `ready`, `fulfill-step`,
`cancel`, `expire` and `confirmation` are individually supported and verified.
`accept` inspects signed acceptance; it cannot bypass payment. The detailed
[integrated checkout specification](../../.river-dev/specifications/food-commerce-004-integrated-checkout.md)
lists every verified stage in order, fixture capacity limits, recovery semantics,
test results and the commercial/target-D1 integration gates.

Commands retain the same local SQLite fixture and terminal states; they do not
silently reset capacity or create new orders on retry. Preparation consumes
capacity even if refunded. The crash command injects an acknowledgment loss and
reopens a connection; no process is killed. Already-recorded cases report replay.
Missing costing input stays unverified/null rather than zero. No actual purchase,
payment, confirmation message, customer contact or public checkout is created.

## Target-compatible local D1 reliability (FOOD-COMMERCE-005)

These verified commands use the installed Miniflare/workerd D1 binding and
disposable temporary storage. They do not open the retained SQLite fixture or
any production database, and they make no Stripe requests:

```powershell
node --import tsx --test src/lib/food/table-d1-reliability.test.ts
node --import tsx --test src/lib/food/table-offline-payment.test.ts
node --import tsx scripts/food/d1-order-reliability.ts journey --synthetic
node --import tsx scripts/food/d1-order-reliability.ts recovery --synthetic
node --import tsx scripts/food/d1-order-reliability.ts diagnostics --synthetic
node --import tsx --test --test-name-pattern 'shutdown|SQL interruption' src/lib/food/table-d1-reliability.test.ts
node scripts/food/preview.mjs --verify
```

The recovery runner injects SQL failure and lost acknowledgment, shuts down and
reopens workerd/D1, then retries the same signed inbound fixture. The Node
controller stays alive; no remote outage or power-loss guarantee is claimed.
Diagnostics contain whitelisted codes and hashed references, with no raw keys,
signatures, addresses or customer contacts. Failure attempts are held in a bounded
in-memory buffer; durable order/inbox/receipt facts survive runtime reopen.

Local D1 tests pass 14/14; offline payment contracts pass 16/16. All 591 prior
tests plus 5 existing canonical local D1 tests pass (626 distinct tests total).
**Actual Stripe test-mode end-to-end checkout remains UNVERIFIED.** A signed local
fixture is not a real Stripe payment. Commercial ordering remains disabled.
See the [D1/payment validation specification](../../.river-dev/specifications/food-commerce-005-d1-payment-validation.md)
for tool versions, the Miniflare 5 persistence setting, measured concurrency,
transaction limitations, refund states and required future authorization.

## Private retrieval and audit repair (FOOD-COMMERCE-014B–018)

**FOOD-016–018 completion supersedes the partial status below.** The existing dual
audit now persists sanitized observations and explicit correlation history in local
workerd D1. Recognized SDK receipts alone can mint actual-test provenance; injected
readers remain fixtures. Actual reads without authoritative local bindings remain
uncorrelated and cannot change orders, refunds or capacity.

```powershell
# Fresh private operational readiness; expected exit 2 while launch is blocked.
node --import tsx scripts/food/launch-readiness.mjs operations --verify-local --recipe scripts/food/recipe-lab.template.json --json
# Concise report without rerunning tests; engineering evidence remains unverified.
node --import tsx scripts/food/launch-readiness.mjs operations
# Inspect canonical retained audit; no provider request.
node --import tsx scripts/food/provider-observation-report.ts
# Focused integration suites (actual disposable local workerd D1).
node --import tsx --test scripts/food/provider-observation-audit.test.ts scripts/food/commerce-completion-journey.test.ts scripts/food/operational-readiness.test.ts
```

The original secure retrieval command below now stores allowed evidence and shows
an audit ID under **LOCAL TEST DURABILITY**, or explicitly reports storage failure.
Its dedicated retained namespace is `.river-dev/state/food-provider-audit-016`,
separate from all production and retained synthetic order databases. Audit inspection
does not create fixture orders. No actual Stripe request has been made in this
sprint. Existing Session/credential input remains an external DEFERRED dependency.

The new readiness command ingests validated actual catalog, recipe-lab, costing,
launch and audit sources. Only current successful fixed-suite executions can satisfy
local engineering gates. Serialized PASS assertions, stale runs and manual JSON
cannot promote provider or production gates. Business records remain assertions
until independently approved; entered costs remain estimates. Missing receipt costs,
food/legal approvals, fulfillment and owner authorization keep public launch blocked.
The authoritative specification records the full current architecture and commands.

The following paragraphs describe the previous partial sprint for historical context:

The Windows PowerShell wrapper now parses and safely defers when no actual test
Session exists. This command prompts for an existing Session and masked test-only
read credential, then retrieves only that Session and its associated PaymentIntent:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/food/stripe-testmode-readonly-retrieve.ps1
node scripts/food/launch-readiness.mjs private-check scripts/food/launch-readiness.template.json
```

Retrieval is observation-only and is **not stored or correlated to a food order**.
Prefer a dedicated restricted test read key. Never paste a key into chat, arguments
or files. Actual retrieval remains DEFERRED; Stripe E2E is UNVERIFIED. The private
readiness command returns exit 2 because production gates remain blocked.

The existing dual-status D1 audit now rejects stale/competing append revisions and
preserves exact retries after restart. Verified sprint scope: 876 distinct passing
tests, including 47 new tests; build and local HTTP/CSS pass. Global typecheck
retains 250 existing errors. Phases 016–018 remain INCOMPLETE as detailed in the
[authoritative sprint record](../../.river-dev/specifications/food-commerce-014b-018-integrated-provider-readiness.md).
That record lists operator boundaries, parser root cause, commands, recovery
evidence, actual-observation persistence gaps and remaining launch blockers.

## FOOD-COMMERCE-025–030 private commercial planning (partial implementation)

Run the consolidated report against your preserved draft:

```powershell
$workbench = '.river-dev/state/southwest-harvest-20261022-165953-workbench.json'
node --import tsx scripts/food/operating-system.ts business-checklist $workbench
node --import tsx scripts/food/operating-system.ts product-review $workbench
node --import tsx scripts/food/operating-system.ts kitchen-checklist $workbench
```

Add `--json` to obtain the same report as machine-readable JSON. These commands
only read bounded private JSON files and reject symlink/junction paths. They do
not overwrite the four existing Southwest Harvest draft records. Proposal reports
are traceable to the mission and current recipe fingerprint; they do not revise
or approve a canonical recipe. All derived evidence remains stale for that
proposed formulation until a genuine canonical revision and fresh evidence exist.

In the kitchen, resolve mushrooms/greens first, exclude feta, weigh each raw
ingredient, note drained bean yield separately, then weigh cooked usable yield
and portions. Record actual evidence through the existing Q intake CLI:

```powershell
node --import tsx scripts/food/food-evidence-intake-cli.ts template $workbench ingredient-measurement .river-dev/state/my-new-mass-command.json 0
# Fill the new template with an actual scale measurement and source reference.
node --import tsx scripts/food/food-evidence-intake-cli.ts apply $workbench .river-dev/state/my-new-mass-command.json .river-dev/state/my-new-measured-workbench.json
```

Continue from the NEW workbench for each measurement. Existing validators reject
stale fingerprints and duplicate masses; ingredient-source, measured-yield,
verified-purchase and operating-expense templates retain their existing contracts.
Receipt purchases require explicit tax/fees and usable grams. Full drained/raw/
cooked supplemental evidence intake is still an engineering gap; do not force
those distinct observations into a single ingredient mass field.

For weekly planning, generate a blank model to a NEW private file (PowerShell
redirection overwrites, so first guard against an existing target):

```powershell
$weekly = '.river-dev/state/my-new-weekly-model.json'
if (Test-Path -LiteralPath $weekly) { throw 'Choose a new output file' }
node --import tsx scripts/food/operating-system.ts weekly-template $workbench | Out-File -LiteralPath $weekly -Encoding utf8
node --import tsx scripts/food/operating-system.ts weekly-profit $workbench $weekly --goal 200
```

Amounts are USD cents with `state` KNOWN, ESTIMATED or UNKNOWN and a source
reference; UNKNOWN requires null amount and reference. Enter price only as an
owner-supplied scenario, never as a catalog approval. Fixed costs are per WEEK;
all enumerated variable expenses and labor valuation are per BOWL. Ingredient
cost derives from canonical recipe cost profiles. Do not duplicate ingredients
in expenses. Yield-loss expense means additional attributable loss beyond the
loss already reflected in usable-mass recipe costing. Explicit zeros need
sources too. Owner hours are separately reported, not added a second time to
labor expense. Never treat unknown labor valuation as free labor.

All six volumes (25, 30, 40, 50, 60, 75) preserve missing totals as null. Complete
arithmetic remains ESTIMATED because supplied cost profiles cannot independently
verify receipts. Full-batch ingredient requirements are shown; package unit
counts exclude unmeasured waste and supplier pack rounding. Cash requirements,
canonical approved-price crosswalk and complete-evidence certification are NOT
yet implemented. This is not a declaration of profitability or sale readiness.

Additional private machine reports:

```powershell
node --import tsx scripts/food/operating-system.ts packaging-comparison .river-dev/state/my-packaging-candidates.json
node --import tsx scripts/food/operating-system.ts demand-capacity .river-dev/state/my-anonymous-interest.json
```

Packaging input contains `recipeFingerprint` and `candidates`. Each candidate
contains `reference`, `component` (main-meal or dry-pepita-packet), and ALL fields
listed by `packageFields` in food-pilot-planning.ts; use null for missing values.
Prices are cents; volumes ml and weights grams. Evidence fields are bounded
source references, not safety certificates. Dry packets must be removed before
heating. Candidates remain unapproved even when every reference is supplied.

Demand input contains `recipeFingerprint`, `capacityBowls` (integer or null), and
`observations`. Each aggregate observation contains reference, status, people,
bowls, area, timing, channel and sourceReference. Status is INTERESTED,
RECONFIRMED INTEREST, NOT INTERESTED or UNKNOWN. Use anonymous area/channel tags,
not names, addresses or contacts. Cohorts must be mutually exclusive; update a
cohort rather than adding reaffirmed people a second time. Capacity is a planning
assertion, never released inventory. No messages, accounts, orders, deposits or
reservations are created. A cohort overlap cannot be independently detected.

The authoritative partial-scope record is
[FOOD-025–030](../../.river-dev/specifications/food-commerce-025-030-product-commercial-readiness.md).

Use `packaging-template <workbench.json>` and `demand-template <workbench.json>`
with the same operator entry point to print blank, fingerprint-bound planning
JSON. Save to a new private file using the guarded PowerShell pattern above.
The demand template starts with no observations, not fictional customer interest.
The packaging template has main-meal and dry-packet candidates with null facts.

The mission's actual formulation decisions are also captured in private
`.river-dev/state/food-commerce-025-030-owner-formulation-proposal-v1.json`.
This exclusive-create snapshot is NOT_APPROVED and does not change canonical
history. Preserve it as proposal provenance; do not feed it to recipe intake as
though it were a measured recipe or approved SKU.

Sprint verification: 4,250 distinct offline/local tests passed (10 new, 4,240
existing), zero failed/skipped; repeated focused runs are not added to this
count. Build and both Table HTTP routes passed; CSS passed three checks.
Strict scoped type diagnostics: zero. Global Astro check: 256 errors, zero
warnings, 17 hints; six beyond the historical baseline are in untouched prior
food tests. See the specification for incomplete phases and precise limits.

## FOOD-025–030 completion: current private owner workflow

This section supersedes the first sprint's partial-scope limitations above.
Use one authoritative command; `business-checklist` is now an alias:

```powershell
$wb = '.river-dev/state/southwest-harvest-20261022-165953-workbench.json'
$sku = '.river-dev/state/southwest-harvest-20261022-165953-sku-history.json'
node --import tsx scripts/food/operating-system.ts operator-report $wb --sku $sku
node --import tsx scripts/food/operating-system.ts operator-report $wb --sku $sku --json
node --import tsx scripts/food/operating-system.ts measure-next $wb
node --import tsx scripts/food/operating-system.ts source-history $wb
```

The report reads the current local recipe head, revisioned source journal, private
SKU history, optional inventory/price assertions and purchasing model, and the
retained local provider audit without making provider requests. It also runs the
existing owner-review and launch engines. Each JSON row contains source, exact
binding, fingerprint, status, missing information, stale flag and next action.
Public launch stays BLOCKED. Existing source assertions never become independent
food safety, payment or inventory-release authority.

### Capture an actual receipt and ingredient without JSON editing

Enter facts from your own scale, product label and receipt. No example price or
measurement below is supplied as business evidence. These commands create NEW
files and reject existing destinations. Obtain the ingredient index from
`measure-next`; source IDs are explicit owner registrations in the existing
canonical ingredient-source workflow, not inferred supplier verification.

```powershell
$ingredientIndex = Read-Host 'Canonical ingredient index shown by measure-next'
$ingredientId = Read-Host 'Exact registered ingredient ID (or explicit new source ID)'
$purchasedProduct = Read-Host 'Exact purchased product identity as an opaque source reference'
$supplier = Read-Host 'Actual supplier reference'
$receiptRef = Read-Host 'Actual private receipt reference (no sensitive receipt content)'
$receiptDate = Read-Host 'Actual receipt date YYYY-MM-DD'
$packageGrams = Read-Host 'Grams per purchased package'
$packs = Read-Host 'Number of purchased packages on this receipt'
$usableGrams = Read-Host 'Actual net usable grams across those packages'
$paidCents = Read-Host 'Actual merchandise total paid in USD cents'
$taxFeeCents = Read-Host 'Actual additional tax/fees in cents; enter 0 only if known'
$receiptOut = '.river-dev/state/owner-new-receipt.json'
node --import tsx scripts/food/operating-system.ts receipt-capture $wb --output $receiptOut --index $ingredientIndex --id receipt:owner-new --revision 1 --supplier $supplier --product $purchasedProduct --date $receiptDate --receipt $receiptRef --quantity $packageGrams --unit g --packs $packs --usable-grams $usableGrams --paid-cents $paidCents --tax-fee-cents $taxFeeCents
```

The default is RECORDED. Add `--owner-verified-receipt` only after personally
checking the actual receipt, usable mass and totals. This attests to a receipt;
it does not approve a retail product price. Amounts may be omitted when unknown;
they remain null and cannot supply verified canonical cost profiles.

For an actual raw ingredient observation (use drained state and `--drained-grams`
for a drained observation, retaining a separately measured `--raw-grams`):

```powershell
$rawGrams = Read-Host 'Actual raw ingredient grams weighed for this batch'
$observedAt = Read-Host 'Actual observation time YYYY-MM-DDTHH:mm:ssZ'
$scaleRef = Read-Host 'Actual measurement/source reference'
$newWb = '.river-dev/state/owner-new-measured-workbench.json'
node --import tsx scripts/food/operating-system.ts measurement-capture $wb --output $newWb --subject measurement:owner-new --at $observedAt --source $scaleRef --key capture:owner-new --expected 0 --index $ingredientIndex --ingredient $ingredientId --product $purchasedProduct --supplier $supplier --quantity $rawGrams --unit g --preparation raw --raw-grams $rawGrams --purchase $receiptOut --recall-reviewed-clear
```

Use `--recall-reviewed-clear` only after reviewing the actual source for recall
status. No cross-contact approval is inferred. Continue from `$newWb` for the
next ingredient. A different mass cannot overwrite a captured canonical mass;
make an authorized new formulation revision instead. Existing measurements can
receive a new supplemental receipt revision using the same exact mass and source.
`--expected` is the previous revision of THIS subject, not the global DB head.
Use `source-history` to inspect exact heads. Reuse a command key only for an
identical retry; changed content requires a new key and consecutive revision.

### Record actual cooked/usable yield

After all ingredient masses and source identities have been captured:

```powershell
$cooked = Read-Host 'Actual cooked batch grams'
$waste = Read-Host 'Actual measured waste grams; explicit 0 only when known'
$packed = Read-Host 'Actual usable packed-yield grams after loss'
$portion = Read-Host 'Actual measured portion grams'
$portions = Read-Host 'Actual whole portions produced from that yield'
$method = Read-Host 'Actual preparation method recorded for this batch'
$captureRef = Read-Host 'Actual food-prototype-capture: reference'
$yieldAt = Read-Host 'Actual yield observation UTC time'
node --import tsx scripts/food/operating-system.ts yield-capture $newWb --output .river-dev/state/owner-new-yield-workbench.json --subject batch-yield:owner-new --at $yieldAt --source $scaleRef --key yield:owner-new --expected 0 --cooked-yield-grams $cooked --waste-grams $waste --packed-yield-grams $packed --portion-grams $portion --portions $portions --method $method --capture $captureRef --storage frozen
```

The existing measured-yield validator determines whole portions and remainder.
Owner-verified current receipts are projected through the existing purchase-cost
validator after yield exists. Missing receipts remain missing. No nutrient
profiles or safe storage durations are fabricated. A validated BatchOperations
record can alternatively supply actual portions to the purchasing model.

### Proposal, approval and private adoption

`proposal-record` records choices with INCLUDE, EXCLUDE or UNRESOLVED for mushrooms
and greens. Feta exclusion, internal sauce and removable dry pepitas are enforced.
The current mission's actual decisions are already persisted as an unapproved
local proposal. No approval or adoption was performed.

Use `source-history` to obtain proposal hashes and current operations head.
`checkpoint <workbench> --key KEY --head N` records an exact parent recipe.
Only the owner should invoke `owner-approval-record ... --authorize-private-revision`
with the exact proposal hash and real approval reference. `adopt-proposal` without
that separate approval remains BLOCKED. Authorized adoption writes a new hidden
private workbench and clears dependent evidence; it never edits catalog source,
releases stock, sets a product price or enables checkout. All old snapshots remain.
The authoritative specification lists the complete named flags.

### Package linkage and whole-package purchasing

```powershell
node --import tsx scripts/food/operating-system.ts package-link-template $wb --governance $sku
node --import tsx scripts/food/operating-system.ts purchasing-template $wb
# Save each template to a NEW private file; fill only actual facts or explicit estimates.
node --import tsx scripts/food/operating-system.ts source-record $wb --kind packaging --input .river-dev/state/owner-package-source.json --key package:owner-new --expected 0
node --import tsx scripts/food/operating-system.ts batch-cash $wb --input .river-dev/state/owner-purchasing-model.json --goal 200
```

Packaging has six explicit roles: tray, lid, seal, label, pepitaPacket and
attachment. Seal/attachment may be explicitly zero if the design does not use
them; unknown does not mean zero. The dry packet quantity is exactly one per meal.
Every component binds existing SKU/package governance and records quantity/meal,
purchase pack units/price/source, available units/count reference and actual
waste/batch. Supplier claims and documents remain unapproved source evidence.
The packet is removed before heating; neither adhesive nor material is assumed safe.

The purchasing model includes exact product/recipe/cost/package/price fingerprints,
actual batch or captured yield, ingredientStock rows (ingredientIndex, ingredientId,
availableGrams, sourceReference, observedAt), weekly expenses, laborTreatment
(INCLUDE, EXCLUDE_EXPLICITLY, UNKNOWN), processingBasisPoints, processingFixedMinorPerBowl,
processingReference, weeklyBatchCapacity, availableCashMinor and volumes.
Use null for unknown facts. Set packageFingerprint to the validated linked package
fingerprint shown in the JSON operator report; priceRevision is null until a
canonical price exists. Regenerate the model after any source revision.

Consumed cost and whole-pack purchase cash are different. The report includes
surplus production portions, waste, observed stock shortfalls, package rounding,
remaining cash, fixed weekly overhead, explicit owner labor treatment and all six
requested weekly scenarios. Additional nonnegative volumes are supported. Supplier
availability and hypothetical demand are not guaranteed. Unknown facts produce
INSUFFICIENT EVIDENCE; complete supplied arithmetic remains ESTIMATED. There are
no actual sales or verified achieved-profit claims.

### Anonymous demand revisions

Use one opaque subject per disjoint aggregate cohort; do not enter names,
addresses, phone numbers, emails or customer account identifiers.

```powershell
$people = Read-Host 'Actual anonymous aggregate people count'
$bowls = Read-Host 'Actual aggregate intended bowls, not orders'
$demandAt = Read-Host 'Actual interest observation UTC time'
$demandSource = Read-Host 'Actual anonymous survey source reference'
$areaTag = Read-Host 'General area tag, not an address'
$timingTag = Read-Host 'General timing tag'
$channelTag = Read-Host 'Marketing channel tag'
node --import tsx scripts/food/operating-system.ts demand-record $wb --subject cohort:owner-new --at $demandAt --source $demandSource --key demand:owner-new --expected 0 --status INTERESTED --people $people --bowls $bowls --area $areaTag --timing $timingTag --channel $channelTag
```

Use RECONFIRMED INTEREST, NOT INTERESTED or UNKNOWN when appropriate, quoting a
status containing spaces in PowerShell. A reconfirmation updates the same subject
with the prior revision and a new key; it does not add a second cohort. History
is retained and recoverable after restart. No messages, orders, payments,
reservations or marketing consent are created.

Output publication is atomic and exclusive. If persistence succeeds but export
fails, retry the identical command/input with a NEW output path. Junctions,
symlinks, traversal and overwrites are rejected. Keep all state private.

Completion verification: 23 new and 4,250 existing distinct tests passed
(4,273 total; overlapping focused runs counted once), zero failed/skipped.
Build, both Table HTTP routes, three CSS checks and strict changed-scope types
passed. Global Astro diagnostics remain 256 errors, 0 warnings and 17 hints.
All six private/offline engineering areas are complete; physical evidence,
independent approvals, actual sales and achieved profit remain unverified.

## FOOD-032E — first-product storefront and founder direction

The existing strategy now explicitly prioritizes Hot Food Bowls / Southwest
Harvest Bowl, preserving all six long-term planning departments without adding
products, SKUs, prices or public future-category pages. See
[the founder strategy](../../docs/architecture/food-restaurant-product-vision.md)
and [FOOD-032E execution evidence](../../.river-dev/specifications/food-commerce-032e-vision-storefront.md).

The old image branch intentionally rendered text rather than loading a bowl
asset. It now shows a local authored SVG illustration on both Table routes,
clearly marked as a concept rather than a product photograph. Canonical recipe
history, FOOD-031 and the three A/B/C sauce histories remain unchanged. The public
concept copy describes internal sauce and a removable dry packet, and keeps
feta exclusion, experimental mushroom removal and unresolved kale explicit.

Local preview and checks:

```powershell
node scripts/food/preview.mjs
# Open http://127.0.0.1:4335/the-table/
npm run build
node scripts/food/preview.mjs --verify
node --import tsx --test --test-concurrency=1 scripts/food/storefront-output.test.ts src/lib/food/table-storefront.test.ts src/lib/food/table-checkout-service.test.ts scripts/food/commerce-completion-journey.test.ts src/lib/food/public-menu-runtime.test.ts src/lib/food/table-menu-plan.test.ts scripts/food/food-commercial-completion.test.ts scripts/food/food-first-batch-cli.test.ts
```

Verification: 104 distinct tests passed (6 new, 98 existing), zero failed/skipped.
Build, generated image checks, both HTTP routes, SVG delivery and three CSS checks
passed. Strict registry/type tests passed; global Astro check remains at 256
errors, 0 warnings and 18 hints, with none in changed Table scope. No connected
browser was available, so screenshots and browser viewport testing are not claimed.
Ordering stays blocked. No forms, notifications, ads, payments or deployment.
Next bottleneck: founder visual review, followed by separately authorized evidence
and launch preparation. The ordered future roadmap is documentation only.


FOOD-032E final founder amendment (2026-10-24): the existing landing copy now
expresses real food, homestyle comfort, grandmother-style inspiration and family
ownership as brand intent. The six stable department IDs remain unchanged; future
cold-bowl and frozen-gnocchi-pack labels now match the final directive. Marketing
gamification is excluded; the practical manual order-status roadmap remains.
The complete amendment and closure evidence are in the existing FOOD-032E spec.
No additional product, checkout activation or new infrastructure was introduced.

Amendment validation: 104/104 tests passed after the sandbox ENOMEM retry; build,
local preview/CSS checks and scoped types passed. Browser viewport verification
remains pending; final amendment status PARTIAL. No live commerce or deployment.


FOOD-032F: both Table routes now provide a keyboard skip link; focus outlines on
the dark launch section have improved source-color contrast (2.27 to 10.94:1).
The existing FOOD-032E specification contains the 10-case desktop/mobile screenshot
checklist and explicit browser limitation. No browser or screenshot pass claimed.

FOOD-032F verification: 105 passed, 0 failed/skipped; build, scoped types, local
route/CSS and SVG checks passed. Baseline preservation and sauce hashes verified.
Final PARTIAL: browser visual review at the five requested widths remains pending.
