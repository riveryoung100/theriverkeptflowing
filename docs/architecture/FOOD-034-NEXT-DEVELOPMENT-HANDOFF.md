# FOOD-034 next development handoff

2026-10-25. Founder approval CONFIRMED for the final FOOD-033 storefront, including the restored disabled ordering preview. The founder explicitly authorized final validation, scoped commit, ordinary push, established Cloudflare deployment and live verification. This document supersedes earlier pending-acceptance handoffs. FOOD-034 implementation has not begun.

## Release record

Baseline: `be09e5ea038dcc5497f638a200973c121d6b496a`.
Branch: `cif-001-canonical-content-source-record`.
Remote: `https://github.com/riveryoung100/theriverkeptflowing.git`.
Worker: `theriverkeptflowing-site`.
Release commit and deployed version: recorded in the final release completion section after deployment.

Final release gates are being run on the preserved source-only validation directory at `C:/Users/river/AppData/Local/Temp/food-033-source-review-20261025`. It reuses installed dependencies and excludes original private evidence. All executable source must match the working tree before release. The established workflow is `npm run check`, FOOD tests, focused output/operator checks, then the package's `npm run deploy` (Wrangler using generated `dist/server/wrangler.json` and `dist/client` assets). No D1 migrations or commerce operations are part of this workflow. Existing Cloudflare OAuth is used; no credential values are copied or committed.

## Approved 13-path scope

- `src/pages/the-table/index.astro`
- `src/pages/the-table/[slug].astro`
- `src/styles/table-launch.css`
- `src/components/table/ProductImage.astro`
- `src/components/table/TableNavigation.astro`
- `src/components/table/OpeningQuestions.astro`
- `scripts/food/storefront-output.test.ts`
- `scripts/food/stripe-testmode-operator.test.mjs`
- `docs/architecture/FOOD-033-UX-REFERENCE-MATRIX.md`
- `docs/architecture/FOOD-033-HOSPITALITY-PRIVATE-SPEC.md`
- `docs/architecture/FOOD-033-RETURN-REVIEW.md`
- `docs/architecture/FOOD-033-MANUAL-VISUAL-REVIEW.md`
- `docs/architecture/FOOD-034-NEXT-DEVELOPMENT-HANDOFF.md`

Use explicit paths only. All `.river-dev` recovery reports, manifests, scripts, logs, screenshots, profiles, databases and temporary copies remain local evidence and outside commit/deployment assets. No reset, clean, evidence deletion, dependency/rule changes or unrelated content edits occurred. FOOD-031 recipe history is unchanged.

## Completed storefront and architecture

`/the-table/` has a premium food-first hero, direct bowl destination, owned concept illustration, ingredient composition, family-owned grandmother-style hospitality story, three future-intent process steps, readiness disclosures and six native FAQs. `/the-table/southwest-harvest-bowl/` retains proposed ingredients, inside sauce, removable dry pepita packet, unverified allergen/handling disclosures, availability status and the restored ordering preview followed by all six FAQs. Shared `TableNavigation`, `OpeningQuestions`, `ProductImage`, existing `ProductCard` and scoped `table-launch.css` preserve parent navigation, focus/skip links, responsive grids and reduced-motion rules.

The restored section is titled "A preview of ordering at The Table" and reuses unchanged `QuantitySelector`, `FulfillmentOptions` (including `FulfillmentWindow`), `OrderSummary` (including `OrderStatus`) and `ProductAvailability`. Quantity buttons/input, fulfillment fieldset/window and checkout remain disabled. No order, payment, reservation or coupon can be created by the presentation. Unknown price, portion, tax, fee, capacity, limits, nutrition and availability remain unverified. No offers, ratings, new SKUs or commercial schema were invented.

`src/lib/food/table-catalog.ts` owns the public catalog; `table-menu-plan.ts` preserves six private planning departments and the one active Southwest experiment. `SOUTHWEST_PRELAUNCH_DESIGN` expresses current presentation intent without rewriting canonical recipe history. `table-order-preview.ts` reuses existing exact-SKU quote/currency validation and distinguishes unknown fees/tax from zero/exempt. No separate cart was introduced.

The existing food domains/services cover exact SKU/package/label/nutrition, recipe/menu publication and persistence, physical inventory movements/balances/provenance, durable inventory resolution, payable assessment/reconciliation, manual fulfillment approval, private draft/runtime/request adapters and local operational/order services. `src/pages/api/food/menu.ts` is the existing menu API; FOOD-033 adds no API handler or migration.

`scripts/food/` supplies evidence intake, cost/pricing/inventory governance, readiness/owner packets, local D1 simulations, synthetic order/payment/fulfillment journeys, provider observation/session ledgers and exception/reconciliation tools. Synthetic matches, audit/replay/concurrency results and test-mode tooling do not constitute production payment evidence or sales authorization.

The Stripe read-only operator remains pinned to its historical branch/HEAD `99af8686f1564372875409b6ca4fe52144f68dbe`. Current and future release HEADs must STOP at that authorization boundary. Its corrected test derives the actual configured identity and requires no Session/PaymentIntent retrieval, no storage and no payment/order authorization at unauthorized HEAD. Do not advance that pin during storefront or FOOD-034 work.

## Validation and visual acceptance

Founder final visual approval is explicit and includes the restored preview. Automated browser discovery previously returned no available browser; no fresh agent screenshots or interactive browser results are claimed. Founder approval is distinct from test-derived structural/accessibility evidence. Historical screenshots are preserved without relabelling them as fresh captures.

Final release test totals and live route/asset/essay evidence are recorded in the release completion section. Required gates: full `npm run check`; complete FOOD suite; Stripe operator tests; generated storefront output, canonical and sitemap assertions; source-copy equality; explicit staged-path review; scoped credential/private-artifact exclusion. Preserved local logs use `.river-dev/food-033-release-*` names.

## Private hospitality and physical launch gates

[Hospitality planning](FOOD-033-HOSPITALITY-PRIVATE-SPEC.md) remains private SPEC ONLY: first-family invitation, first paid return courtesy and second paid return courtesy are separate events. Future behavior requires founder issue approval, household and campaign exposure caps, evidenced economics, secure opaque digest-only tokens, expiry, atomic single use, idempotency and append-only provenance. No runtime campaign, public coupon, issue/redemption endpoint, contact collection or notifications are authorized.

Physical launch still needs actual accepted recipe/ingredient and sauce evidence, supplier/allergen/cross-contact review, portion/nutrition/label evidence, validated packaging/storage/reheating/shelf life, lawful regulatory/tax operations, verified food/packaging/labor/delivery costs, approved exact SKU/price, recorded stock and capacity, fulfillment locations/windows and explicitly approved integrations. Unknown costs block exposure approval; intended free pickup/delivery does not imply zero operating cost. Storefront publication satisfies none of these launch gates.

## Prioritized FOOD-034 sequence

The storefront acceptance bottleneck is resolved by founder approval. Commercial launch remains blocked by physical/economic/operational evidence. Next engineering proposal: one bounded, synthetic hospitality eligibility/exposure domain, only after a separate FOOD-034 specification is approved.

1. Map existing domains, persistence and paired tests; select one missing boundary rather than duplicating order/cart services.
2. Specify eligibility, terms, owner approval and exposure invariants. Unknown economics or missing lawful-sale evidence must block issuance.
3. Implement pure synthetic behavior and rejection, expiry, concurrency, double-redemption, idempotency and provenance tests; no public/runtime wiring.
4. Review actual recipe, safety, economics and fulfillment evidence separately.
5. Only then propose explicitly authorized persistence/integration and launch readiness work.

Do not begin implementation from this release handoff alone. No production database migrations, payment writes, customer messages, coupon issuance or sales activation were performed or authorized.
## Final release validation — 2026-10-25

Fresh full `npm run check` PASS: lint, Astro zero errors/warnings (11 existing hints), production build and Pagefind (168 pages). Complete FOOD suite **4,286/4,286 PASS**, zero failures/cancellations/skips, 208.80 seconds. Focused storefront **9/9 PASS** and Stripe operator **11/11 PASS**. Canonical URLs, owned illustration, six FAQs, disabled preview controls, privacy and sitemap assertions passed. `git diff --check` passed.

Comparison of 2,923 tracked source/component files against the source-only validation copy found zero mismatches. All four generated essay article bodies match the pre-release live hashes. Explicit approved-source and complete generated-build secret/private-marker scans found no matches; public asset inventory contains no matching private evidence files. These are scoped exclusion checks, not a universal secret-detection claim. Cloudflare dry run passed using the generated deployment configuration, with no upload, migration or commercial activation.

Local evidence: `.river-dev/food-033-release-check.log`, `food-033-release-food-tests.log`, `food-033-release-focused.log`, `food-033-release-source-equality.json`, `food-033-release-privacy.json`, `food-033-release-full-build-privacy.json`, `food-033-release-live-before.json` and `food-033-release-dryrun-approved.log`. All evidence remains excluded from Git and deployment assets.
