# FOOD-LAUNCH-001 â€” First Bowl, Packaging, and First Order

## Goal

Launch one genuinely excellent refrigerated meal-prep bowl
through a beautiful, simple, accessible website experience.

First financial target: the owner-defined target weekly profit before personal taxes,
after documented food, packaging, payment, delivery, and overhead costs.

## Product

Working name: Southwest Harvest Bowl.

Proposed composition:
- Roasted sweet potatoes
- Black beans
- Rice
- Peppers and onions
- Cilantro-lime sauce

Working recipe only. No ingredient, allergen, nutrition, price,
shelf-life, or availability claim is final yet.

## Physical readiness gates

- Final recipe prepared and tested repeatedly.
- Recipe written in measured quantities and portions.
- Each ingredient cost and packaging cost recorded.
- Selling price determined from actual contribution margin.
- Suitable leak-resistant food-grade containers tested.
- Lids tested for refrigeration, transport, and reheating.
- Separate sauce container considered if quality requires.
- Required label fields and online disclosures verified.
- Applicable food-handler training confirmed.
- Food preparation, cooking, cooling, storage, and delivery
  process reviewed against applicable Texas rules.
- Refrigeration and delivery temperatures verified.
- Food safety and allergen information reviewed.
- Pickup/delivery radius and availability confirmed.

## Website readiness gates

- Premium mobile-first storefront visually reviewed.
- Real product photography replaces the labeled conceptual photography placeholder.
- Final ingredients, allergens, labels, and price displayed.
- Actual pickup or delivery options displayed before checkout.
- Quantity, fulfillment capacity, and availability enforced.
- Payment flow tested safely end-to-end.
- Webhook, confirmation, refund/cancellation, and order record
  behavior verified before taking customer money.
- Customer receives accurate order confirmation.
- No unverified nutrition or health claims.
- No payment button enabled until launch readiness is approved.

## First-order plan

1. Complete a test cooking and cooling session.
2. Package the bowl and inspect the final experience.
3. Calculate the real unit contribution.
4. Test the customer flow on mobile and desktop.
5. Enable a limited local preorder batch only after approval.
6. Accept and fulfill the first verified paid order.
7. Record revenue, costs, defects, and customer feedback.
8. Repeat a small batch and measure repeat purchases.

## Business model

Aim for approximately the owner-defined target weekly profit, not just revenue.
Determine required weekly meal volume using verified unit costs.
Do not purchase commercial-scale capacity before demand supports it.

## Current release boundary

The Table storefront is a preview.
No checkout is connected to this new route.
No public sale, payment, inventory reservation,
production date, nutrition label, or availability is authorized.

Preserve existing commerce, D1, identity, insurance,
Sesh, and other River operating systems.

No production deployment, database migration,
commit, or GitHub push is implied by this document.
## FOOD-UI-002 implementation and launch gates

The storefront remains a conceptual preview. The photography-ready panel is
explicitly labeled; replace it only with an owned photograph of the tested,
final portion in its actual packaging. No stock or generated meal photograph.

### Repeatable recipe and packaging

- [ ] Test the recipe repeatedly; record supplier ingredients and subingredients.
- [ ] Write gram-based raw and cooked yields, sauce weights, and final portions.
- [ ] Record actual ingredient waste, labor, packaging, payment fees, delivery,
      and allocated weekly overhead; establish price and operating margin.
- [ ] Test food-safe containers and lids with the actual portion: fit, sealing,
      leaks, stacking, condensation, refrigeration, and transport movement.
- [ ] Confirm manufacturer suitability before giving reheating instructions;
      test sauce separation and the complete customer opening experience.
- [ ] Verify complete compliant labeling and online disclosures, including all
      required ingredients/subingredients, allergens, quantity, business details,
      storage/date information, and any required instructions for this product.
- [ ] Verify applicable Texas food-handler, DSHS, and local authority requirements
      for this exact recipe, kitchen, sales channel, and delivery model. Do not
      assume cottage-food eligibility, exemptions, permits, or regulatory approval.
- [ ] Document cooking, cooling, refrigeration, monitoring, and corrective actions
      against applicable requirements before production. Validate shelf life rather
      than guessing it; confirm refrigerator capacity for safe cooling and storage.
- [ ] Validate cold pickup and delivery: staging, insulated transport, temperature
      checks, handoff windows, missed pickups, and safe customer instructions.
- [ ] Establish achievable order limits from kitchen, refrigerator, packaging,
      labor, and fulfillment capacity. Test a complete small batch locally.
- [ ] Take real final product photographs after recipe and packaging verification.

### Future customer integration (design only; disabled today)

Required journey:
View product -> review verified ingredients and allergens -> choose quantity ->
select available pickup or delivery -> review price, fees, and total -> pay ->
receive an accurate order confirmation.

Before implementing payment, verify the existing checkout's suitability for food;
do not connect the generic Stripe checkout by default. A later authorized phase
must enforce real availability and capacity, validate quantity and fulfillment,
calculate totals from verified prices, and define confirmation and cancellation
behavior. Do not accept payment before those gates pass.

- [ ] Test the complete checkout in a safe test environment, including failure,
      retries, duplicate submissions, unavailable slots, total accuracy, and
      confirmation accuracy. No real orders or payment requests in FOOD-UI-002.
- [ ] Obtain separate launch authorization before enabling food ordering.
- [ ] After authorized launch, verify the first paid order, payment/order match,
      confirmation receipt, packaging, cold fulfillment, and actual unit profit.
- [ ] Track weekly repeat demand, waste, refunds, and operating profit before
      personal taxes. Target approximately the owner-defined target weekly operating profit.

Weekly volume planning: round up ((the owner-defined target + verified weekly fixed operating costs)
/ verified per-bowl contribution), only if contribution is positive. Include all
variable food, packaging, labor, payment, and fulfillment costs in contribution;
avoid counting a cost twice. Start with existing suitable equipment and small
batches; defer larger purchases until verified demand supports them.

### Local validation record

Record actual build, diagnostic, responsive, and browser results separately.
A successful production build does not establish visual quality, food safety,
regulatory approval, packaging readiness, or readiness to take payment.


FOOD-UI-002 local results (2026-10-21):
- Astro-only production build: completed; dist/client/the-table/index.html exists.
- astro check: 1,803 files; 250 errors, 0 warnings, 17 hints. No diagnostic
  entries for the storefront page, scoped stylesheet, or Navbar. Global error
  count matches the previously reported 250; unrelated errors remain unresolved.
- Built HTML verified: product identity and disabled-payment notice present;
  two shared navigation links to /the-table/; no Stripe or private candidate
  brand references. Storefront source has no form, payment control, script,
  API call, or checkout integration.
- Responsive CSS source reviewed for 360/390 phone, 768 tablet, and 1280/1440
  desktop: single-column phone hero/product, tablet two-column layouts,
  two-column steps below 980px and four columns above, flexible navigation,
  visible focus, minimum 44px link targets, and reduced-motion overrides.
  Actual rendering, clipping, overflow, and shared mobile navigation interaction
  at these widths are UNVERIFIED.
- Browser runtime setup attempted; reported "No browser is available" and
  discovery returned an empty list. No browser visual review could be performed.
- Scope check: only the three authorized launch files and a one-line shared
  Navbar link addition differ. The three launch files were already untracked
  at task start. No dependencies installed; no extra source files created.
- Packaging, recipe, regulatory, and first-order gates remain pending physical
  verification. No ordering, payment, deployment, or remote database action.

## FOOD-LAUNCH-002 — actionable first-batch sequence (2026-10-21)

No live orders are authorized. Complete these gates in order; record evidence,
owner, date and unresolved items beside each before advancing.

1. [ ] **Verify the exact operating model.** Confirm applicable Texas DSHS and
   local authority rules for this recipe, kitchen, refrigerated product, sales
   channel and pickup/delivery plan. Confirm permits, food-handler requirements
   and compliant label fields with the responsible authority. No eligibility or
   legal approval is established by this checklist.
2. [ ] **Prove a repeatable small recipe.** Weigh each ingredient and sauce in
   grams; record raw weights, cooking method, cooked yield, portion weights,
   number of bowls and actual losses across repeat trials. Retain supplier
   ingredients/subingredients and allergen information.
3. [ ] **Prove safe handling and capacity.** Document verified cooking, cooling,
   refrigeration, shelf-life and corrective-action procedures; use temperature
   monitoring and a batch log. Establish practical capacity from measured labor,
   safe cooling/storage space, packing and fulfillment time. Do not guess safe
   limits or shelf life.
4. [ ] **Test real packaging.** Verify food-contact and intended-use suitability;
   test lids, leaks, stacking, cold storage and transport with the real portion.
   Separate sauce where needed. Verify reheating suitability before giving
   instructions. Prepare and verify compliant labels and customer handling
   instructions. Test temperature-controlled pickup/delivery and missed handoffs.
5. [ ] **Cost from receipts.** Complete `.river-dev/state/first-batch.json` using
   [the private tool instructions](../../scripts/food/README.md). Measure waste,
   include packaging, consumables, labor, fees, fulfillment and fixed overhead
   once each. Run `node scripts/food/cost.mjs .river-dev/state/first-batch.json`.
   Confirm the owner-defined target target volume fits demonstrated first-batch capacity before
   choosing a final price. No figures in tests are verified business data.
6. [ ] **Approve the public presentation.** Photograph the actual final product
   in its actual packaging; replace the labeled placeholder. Review the page
   at 360, 390, 768, 1280 and 1440px, shared navigation and keyboard behavior.
   Publish only verified price, ingredients/allergens, availability and
   fulfillment details; avoid unsupported legal, nutrition or health claims.
7. [ ] **Authorize and test a later checkout phase.** In a safe payment test
   environment verify quantity, fulfillment selection, capacity protection,
   accurate price/fees/totals, failed/retried payments and confirmation. Check
   that duplicate submission cannot exceed capacity. This mission does not
   authorize enabling checkout; obtain separate launch authorization afterward.
8. [ ] **After authorized launch only:** reconcile the first real paid order
   against payment, order total and confirmation; record actual ingredients,
   packaging, labor, waste, fees and cold fulfillment. Record customer feedback,
   refunds and operating profit; repeat within proven capacity.

### FOOD-UI-003 local verification

- Production Astro build: PASS; storefront generated. Full build/search result
  and current typecheck totals are recorded in the final task report.
- Preview: isolated fresh-cache reproduction identified late discovery of
  `astro/assets/services/noop` followed by optimizer reload and missing old SSR
  chunk. Local wrapper includes it before optimization; production config and
  original cache remain untouched. Default Cloudflare registry/log access also
  failed in this sandbox, addressed with local-only XDG/log paths.
- HTTP route and shared/scoped CSS delivery: PASS after recovery. Vite serves
  imported CSS through its JavaScript style-injection module in development.
- Browser connection returned no available browser; rendered review at all five
  target widths and shared menu interaction: UNVERIFIED. Source review alone
  does not establish visual approval. Use the local preview command in the README.
- Physical, regulatory, labeling and checkout gates remain pending. No orders,
  payments, remote data changes or deployment are authorized by these checks.

Final FOOD-UI-003 / FOOD-LAUNCH-002 results (2026-10-21):
- `node --test scripts/food/cost.test.mjs`: 12/12 PASS.
- `npm run build`: PASS, including Pagefind (161 pages indexed).
- `node scripts/food/preview.mjs --verify`: PASS; three HTTP 200 storefront
  checks and three rounds of shared/scoped CSS checks; own server stopped.
- Built product/prelaunch text, both Table navigation links and CSS files:
  PASS. No checkout/form/Stripe integration in generated storefront.
- No candidate private branding in src, public or dist/client.
- `astro check`: 1,806 files, 250 existing errors, 0 warnings, 17 hints;
  no diagnostics for scoped files. Count matches supplied baseline; exact
  diagnostic-by-diagnostic comparison to a prior log was unavailable.
- Actual browser review at all five target widths: UNVERIFIED (no browser).
- Existing Navbar change and Table page preserved. Targeted CSS changes only:
  shrinkable hero copy, wrapping headings, single-column facts below 400px.
- No commit, push, deployment, order/payment activation or production data access.
