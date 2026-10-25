# FOOD-COMMERCE-025–030 completion: private operating workflow

Status: PASS for the defined private/offline engineering scope; verification recorded below.
Commercial launch remains BLOCKED. Software checks do not establish food safety,
regulatory eligibility, sales or achieved profit.

## Preserved baseline and scope

Branch: cif-001-canonical-content-source-record.
HEAD: 99af8686f1564372875409b6ca4fe52144f68dbe.
Incoming inventory: `.river-dev/food-025-030-completion-initial-status.txt`.
The four Southwest Harvest drafts and earlier unapproved proposal snapshot remain
unchanged. Navbar and all unrelated prior work remain untouched. No reset,
clean, restore, stash, branch change, commit, push, deploy, remote migration,
production D1 connection, checkout enablement or Stripe write was performed.

Historical first sprint: 4,250 passing distinct tests; all phases were partial.
This completion extends those modules and reuses canonical domain validators.
The previous partial result remains historical, not proof of this implementation.

## Canonical source mappings and completed engineering

| Area | Source of truth and behavior |
| --- | --- |
| FOOD-025 | `reviseFoodRecipeDraft`, `reviseFoodProductDraft`, `reviseFoodDishPresentation`, `reviseFoodServingOffer`, `validateRecipeOperations`, existing `openFoodOperations` head/CAS. Separate persisted proposal and explicit owner authorization assertion. |
| FOOD-026 | Existing Q `applyPrivateFoodEvidence`, `massInGrams`, `purchaseCostProfile`; supplemental journal binds actual ingredient/source, purchased product, preparation state, observation time, receipt and measured yields. |
| FOOD-027 | Existing SKU/package governance and validators, exact product/recipe/offer references, component candidate comparison, source-bound supplier lot prices and packaging quantities. |
| FOOD-028 | Canonical rational consumed recipe cost, validated actual batch or captured usable yield, receipt-backed purchase profiles, whole supplier packs, observed ingredient/package inventory, independent weekly overhead/labor and scenario arithmetic. |
| FOOD-029 | Private local D1 journal with immutable histories, per-product/kind/subject CAS revisions and command-key replay; aggregate anonymous cohorts replace prior cohort revisions in summaries. |
| FOOD-030 | Existing recipe/workbench, SKU governance, inventory/price evidence, owner review packet, production, nutrition, scheduling, launch-readiness engines and retained local provider audit; one status crosswalk and five prioritized actions. |

No public source or route imports the private modules. Public output and pages
were searched for private module/storage references; no matches were found.

### Formulation adoption and invalidation

Owner intent excludes feta, places cilantro-lime sauce inside the frozen bowl,
and uses one sealed dry pepita packet removed before heating. Mushrooms and
greens remain unresolved. No milk-free, allergen-free or heating-safety claim.
The current mission's actual owner intent was captured as an UNAPPROVED local
proposal with its source reference and capture time. No owner authorization was
recorded and no actual recipe was adopted during this mission.

Adoption requires a persisted current proposal, a separate persisted exact-bound
owner authorization assertion, resolved ingredient selections, a recorded parent
recipe and the expected local operations head. Missing authorization or unresolved
selections returns BLOCKED. Identity, content fingerprint and revision conflicts
fail closed. Existing operations CAS makes competing adoptions select one next
recipe revision; identical command retries remain idempotent across restart.

Successful authorized adoption produces a NEW PRIVATE DRAFT and a hidden private
workbench using canonical consecutive product/presentation/offer revisions. It
clears measurements, supplier bindings, formulations, cost/nutrient profiles,
allergen/ingredient evidence, batch planning, expenses, price, SKU/package,
labels, inventory, fulfillment and review state. Public catalog files never change.
Historical recipe and evidence rows are preserved. Reports detect an older local
recipe head and mark dependent evidence STALE rather than reusing approval.
Package source changes invalidate exact cost/price bindings; old inventory/SKU
assertions are stale on a new recipe/offer/SKU context.

Owner authorization is an explicit local source assertion, not authenticated
commercial certification. There is no automatic owner approval or launch authority.

### Measurements and receipts

Routine CLI capture accepts real amounts and units, actual ingredient/source IDs,
supplier and purchased product identity, source time, raw/prepared/drained state,
raw/drained/waste/cooked/packed quantities, portions and receipt provenance.
Existing canonical ingredient index/source registration is reused; a supplemental
record must match the registered ingredient ID and supplier. Unknown indices,
wrong IDs/revisions/products, unsupported units, contradictory masses, negatives,
duplicate revisions and unsupported price approval states are rejected.

`yield-capture` validates cooked minus waste against usable packed yield, uses the
existing canonical measured-yield intake, and integrates current owner-verified
receipts through the existing purchase validator. Measurements and estimates are
not interchanged. Owner verification means the owner checked a receipt; it is not
independent supplier authentication or retail price authorization. USDA data is
never inserted automatically.

### Packaging and purchasing

A package source binds existing governance to exact recipe/offer/SKU/package
revisions. Components cover tray, lid, seal/wrap, label, dry pepita packet and
attachment. Each retains candidate supplier/revision, capacities, weights,
food-contact/freezer/microwave/seal/cross-contact evidence, assembly and label
references, purchase lot price/quantity, observed stock and measured waste.
Seal/attachment can be explicitly zero when not used; missing facts stay null.
Exactly one removable dry packet is required. Supplier claims and recorded
manufacturer documents never imply independent approval or compostability.

Consumed ingredient cost derives from the canonical full batch rational total
and actual portions, including fractional-yield remainders. Supplier usable mass
already incorporates drained/lost material; do not count that loss twice.
Whole production batches can create surplus portions. Purchasing includes supply
for all produced portions, package waste and observed stock shortfalls. Consumed
cost for sold portions and cash spent on whole packages are separate outputs.
Receipt lots with a nonintegral cent allocation across packs are purchased as a
whole recorded lot rather than inventing a per-pack paid price.

The model reports six default volumes and arbitrary nonnegative volumes, target
profit volume, break-even, revenue, contribution, fixed overhead allocation,
owner labor treatment, operating profit before tax, whole-package purchasing cash,
remaining cash and capacity/cash feasibility. Optional percentage and per-bowl
processing assumptions are explicit. Per-bowl fixed processing means one assumed
transaction per bowl; group transaction counts need an owner-adjusted assumption.
No tax collected on behalf of authorities is assumed to be business revenue.

Unknown costs, inventory, waste or yields remain unknown and produce
INSUFFICIENT EVIDENCE. Complete supplied arithmetic remains ESTIMATED, never
verified achieved profit. Labor must be included, explicitly excluded, or unknown;
unknown is not free labor. An approved price must match its canonical SKU revision;
an owner scenario price remains hypothetical when no canonical price exists.
Capacity, available cash and ingredient gram counts are owner planning observations,
not stock-release authority or supplier availability guarantees. Demand is never
interpreted as customer orders.

### Persistence, privacy and recovery

The existing retained namespace `.river-dev/state/food-operations-019` contains a
new LOCAL ONLY immutable `table_food_commercial_evidence` table. No remote schema
or migration is involved. Records are bounded to 64 KiB; product history reads
fail closed above 1,024 rows. Revision conflicts, exact replay, changed-key content
conflicts, duplicate content, backward observation times and malformed storage
hashes fail closed. Superseded cohorts remain in history but are not double-counted.

Capture output uses synchronized temporary files and atomic exclusive hard-link
publication; existing outputs are never overwritten or exposed as partial JSON.
A storage success followed by output failure can be recovered by rerunning the
same command key and original input with a NEW output path. A crash can leave an
unpublished private `.tmp` file; it is never treated as an evidence record.

All input/output paths stay under `.river-dev/state`, reject traversal and alternate
streams, and reject symlinks/Windows junctions along the workspace-relative chain.
The Windows junction test runs without skipping protection. The filesystem is a
trusted owner workspace; hostile same-user replacement of directory metadata
between OS calls is outside this CLI's isolation boundary. Keep private state
access restricted. No credentials, customer contacts or addresses are accepted.

## Supported operator commands

All commands use `node --import tsx scripts/food/operating-system.ts`.
See README for PowerShell commands with actual-input prompts.

- `operator-report <workbench> [--sku file] [--inventory file] [--purchasing file] [--json]`
- `business-checklist <workbench>` is the same authoritative report.
- `measure-next <workbench>` identifies the next missing actual observation.
- `receipt-capture <workbench>` accepts named paid-price/package/date/source flags and a new private output.
- `measurement-capture <workbench>` accepts named identity/measurement/source flags and a new private output.
- `yield-capture <workbench>` accepts actual cooked/waste/usable yield and portion flags.
- `source-history <workbench>` reports local source revisions and operations head.
- `checkpoint <workbench> --key KEY --head N` persists the exact parent recipe.
- `proposal-record <workbench> --subject ID --at UTC --source REF --key KEY --expected N --mushrooms INCLUDE|EXCLUDE|UNRESOLVED --greens INCLUDE|EXCLUDE|UNRESOLVED`
- `owner-approval-record <workbench> --subject ID --at UTC --source REF --key KEY --expected N --proposal HASH --reviewer REF --authorize-private-revision`
- `adopt-proposal <workbench> --proposal HASH [--approval HASH] --key KEY --head N --output NEW_FILE`
- `package-link-template <workbench> --governance FILE` prints blank supplier facts tied to existing governance.
- `source-record <workbench> --kind packaging|measurement|formulation|demand --input FILE --key KEY --expected N`
- `demand-record <workbench> --subject COHORT --at UTC --source REF --key KEY --expected N --status STATUS --people N --bowls N --area TAG --timing TAG --channel TAG`
- `purchasing-template <workbench>` prints a fully bound blank purchasing model.
- `batch-cash <workbench> --input FILE [--goal DOLLARS]` reports purchasing/economics.

Existing Q/R/S/T and prior operating commands remain available. Legacy
`weekly-profit` remains a scenario calculator; use `batch-cash` for purchasing.

## Verification

Measured initial global baseline: 256 errors, 0 warnings, 17 hints.
Strict scoped TypeScript uses `--allowJs` to follow existing JavaScript contracts
without replacing their declarations or weakening TS strictness:

`node node_modules/typescript/bin/tsc --noEmit --strict --allowJs --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --types node scripts/food/food-commercial-evidence.ts scripts/food/food-batch-purchasing.ts scripts/food/food-commercial-report.ts scripts/food/food-commercial-workflow.ts scripts/food/food-commercial-completion.test.ts`

Latest focused run: 33 tests passed, zero failed/skipped. This includes the ten
previous planning tests and 23 new completion tests. Cases cover exact formulation
identity, authorization blocking, cleared canonical adoption, competing adoptions,
replay/restart, immutable demand history, source conflicts, invalid measurements,
cooked/waste/packed yield, exact package relationships, whole-pack rounding,
unknown costs, zero sales, labor choices, fractional portions, insufficient cash,
package revisions, report joins and Windows junction/no-overwrite protection.
An isolated temporary-workspace CLI test exercises actual-input receipt capture
through canonical ingredient measurement/source registration without JSON editing.
All fixture evidence and authorizations are explicitly synthetic and removed.

Production build passed. Both Table HTTP routes and three CSS checks passed.
Changed-scope strict diagnostics are zero. Global check returned the same
256 errors, 0 warnings, 17 hints as the measured baseline. Final distinct verification totals are recorded in the completion evidence below. Diagnostic artifacts:
`.river-dev/food-025-030-completion-*`.

## External blockers and owner sequence

Real draft inspection still establishes no weighed ingredient masses, actual
purchase costs, approved SKU/price, independently verified packaging, food safety,
regulatory eligibility, sales or achieved weekly profit.

1. Resolve mushrooms and greens and detailed sauce ingredients; review the proposal.
2. Weigh actual raw/drained ingredients, cooked/usable yield and packed portions.
3. Capture exact supplier products, receipts, stock counts and every business expense.
4. Obtain food-contact documents and validate complete-bowl freezing, seal and heating.
5. Obtain independent regulatory, handling, label, tax and fulfillment review; collect
   anonymous interest before separate owner launch authorization.

No unavailable owner authorization was supplied or inferred. Real adoption,
commercial SKU/price authorization, food-safety decisions and launch remain
blocked external actions. Next milestone is the owner's documented physical test
batch and receipt-backed purchasing review, not another development phase.


## Final completion evidence

PASS for FOOD-025–030 private/offline engineering. The combined matrix passed
4,272 tests (4,250 existing and 22 new), zero failures/skips, in 380.83 seconds.
One subsequently added isolated CLI integration test passed in the final focused
suite. That suite passed 33 tests: the 10 prior planning tests plus 23 new
completion tests. The union is **4,273 DISTINCT TESTS PASSED**, not 4,272 + 33.
The latest focused run verifies final receipt conflict triggers, exact decimal
pack rounding, source freshness and report-priority refinements. Repeated runs
and overlapping tests are not counted twice. Earlier fixture/type issues were
repaired and are not outstanding verification failures.

Strict scoped typecheck passed with no diagnostics. Final global Astro check:
256 errors, 0 warnings, 17 hints, matching the measured incoming baseline.
Final production build passed. Both Table routes returned HTTP 200 and all
three CSS delivery checks passed. Private module/storage searches in public
pages/assets/build output returned no matches. All incoming porcelain-listed
paths still exist; branch and HEAD are unchanged; git diff --check passed.

Created: food-commercial-evidence.ts, food-batch-purchasing.ts,
food-commercial-report.ts, food-commercial-workflow.ts,
food-commercial-completion.test.ts, and completion diagnostic artifacts.
Modified: food-commercial-command.ts, operating-system.ts, README.md and this
specification. Existing private operations D1 gained only the immutable local
journal, its concurrency guards and one source-backed UNAPPROVED owner proposal.
No owner authorization, adoption, payment, reservation, sale or inventory release
was executed. The four original drafts and prior proposal snapshot were untouched.

Remaining engineering gaps in the defined private/offline scope: none known.
Known boundaries remain: trusted owner filesystem, local source assertions rather
than independent certification, and no guarantee of future supplier availability
or customer demand. These limits are represented in status reports rather than
being silently promoted to approval. Real food, price/SKU and launch approvals
remain external owner/independent actions. Public checkout stays DISABLED.
