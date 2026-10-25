# FOOD restaurant and optional nutrition planning vision

## Authority and positioning

Recorded October 8, 2026 from River's original dual-experience handoff and subsequent owner closure/revision instructions. This is the canonical detailed long-term FOOD product vision. It records future requirements, not implemented capabilities, approved recipes, legal eligibility or production readiness.

One food brand, one menu, one canonical recipe/product and production system, with two levels of customer interaction. The business is a food business / restaurant platform with an optional precision nutrition and meal-planning system, not exclusively a meal-prep company. Traditional customers order great food; structured customers order the same great food with measured portion and nutrition control.

The food remains chef-driven, desirable, nutrition-aware and satisfying, with generous portions, restaurant-level flavor and repeatable production. Customers should feel fed. Culinary quality and premium presentation must not depend on tiny portions or turning the brand into restrictive diet food.

This direction extends [FOOD-002A](../../.river-dev/specifications/food-002a-public-menu-serving-offers-ordering-demand-pos-lite-architecture-direction.json) and the [shared foundations](creation-food-shared-foundations.md). The [FOOD-003 planning record](../../.river-dev/specifications/food-003-long-term-restaurant-nutrition-planning-direction.json) preserves hard requirements and sequencing. Existing publication, privacy, safety, tax, payment, fulfillment and authorization boundaries remain intact.

## Two customer experiences

Simple restaurant ordering is the default: browse the menu and beautiful food photography, read descriptions, price, portion/package size, ingredients/allergens as appropriate, choose supported pickup/delivery, add to cart and checkout once independently ready. Flagship frozen gnocchi, rotating meals, meal kits, prepared food, family portions and seasonal products must remain appealing without nutrition planning.

No customer is required to enter height or weight, select calorie/fitness goals, track macros, use a calculator or open meal-planning tools. The calculator must be easy to ignore; the default storefront must not feel like fitness software.

The optional structured experience can expose calories, macros, gram-based portions, protein/fiber targets, adult deficit / maintenance / surplus goals, weekly plans, household portions and later adaptive weight-trend recalibration. Both experiences use the same food and exact canonical recipe/product versions. Separate fitness recipes require a real culinary or product reason.

Information deepens progressively:

| View | Information |
|---|---|
| Simple restaurant | Food, photography, description, price, portion/package size, allergens and optional basic nutrition |
| Detailed nutrition | Serving weight, calories, protein, carbohydrates, fat, fiber, sodium, sufficiently reliable selected micronutrients and ingredients |
| Meal planner | Daily calorie/protein targets, meal allocation, suggested portion grams, planned meals, remaining targets, weekly plans and household portions |

## Premium flagship frozen gnocchi

Premium frozen gnocchi is a first-class flagship product line and core brand-recognition product: chef-driven, freezer-friendly, scalable, satisfying, nutrition-aware and restaurant-quality. It is a direct-to-consumer flagship with potential commercial/retail expansion, rather than merely a side dish, temporary experiment or rotating meal.

Three product forms share the production foundation:

1. **Core frozen gnocchi:** standalone packaged frozen gnocchi sold by weight/portion. Possible recipe families include classic potato, ricotta-forward, sweet-potato/vegetable, seasonal vegetable, higher-protein and legume-enhanced. These are possibilities only; River's cooking and prototypes determine final recipes and flavors.
2. **Complete gnocchi meal kits:** gnocchi with appropriate sauce, protein, vegetables, finishing components and garnish/topping, plus preparation/plating instructions. Separate packaging may improve texture, food safety, freezing, reheating, presentation and customer experience.
3. **Prepared gnocchi meals:** including rotating prepared meals designed as nutritionally complete meals; gnocchi plus sauce alone is not the full nutrition strategy.

The intended initial strategy is 2–3 permanent/core flagship gnocchi SKUs and 1 rotating/seasonal SKU, with optional meal-kit variants, individual packages and potential family-size formats. No final launch flavors are selected here.

Freezing supports batch production, repeatable portions, inventory ahead of demand, lower same-day waste, family packages, repeat purchasing and a shared foundation across flavors. These are strategic opportunities, not guarantees of storage quality or shelf life.

## Protein, nutrition and food quality

Complete entrée-style meals should include meaningful protein rather than weak protein in a carbohydrate-heavy meal. Approximately 25–40+ grams protein per complete entrée serving is a general design range where calorie context, meal size, recipe and customer use make it appropriate; it is not a universal rule for every item.

Future evaluation considers total protein, essential amino-acid adequacy, protein quality and complementary sources where useful. BCAA adequacy belongs within sufficient complete protein, not an isolated food target. Candidate sources, where legally and operationally suitable, include lentils, beans, chickpeas, peas, edamame, tofu, tempeh, eggs, dairy, cheese, ricotta, grain + legume combinations and other suitable foods. Culinary quality must not be sacrificed solely to inflate protein numbers.

Where data is sufficiently reliable, recipe analysis may track calories, protein, carbohydrates, carbohydrate quality, complex carbohydrates, added/simple sugars, fiber, total fat, saturated fat where useful, sodium, iodine, potassium, calcium, iron, magnesium, zinc, folate, relevant B vitamins and vitamins A/C/D/E/K where meaningful. Food design also considers vegetable diversity, micronutrient density, satiety, digestibility/tolerance and glycemic characteristics where useful.

The objective is to make a balanced day/week easier. No medical-treatment claims or claims that every meal supplies 100% of every nutrient are authorized. Data provenance, calculation assumptions, reliability and unknown values remain explicit; known ingredients and measured yield do not justify laboratory-exact nutrient claims.

Culinary salt choice is separate from iodine nutrition strategy. Sea, pink or flaky salt may serve flavor, texture or finishing; do not claim it is automatically healthier than iodized salt. Iodine coverage should be intentionally sourced where relevant through appropriate foods or iodized salt.

## Canonical measurements and domain separation

Use grams internally wherever practical, and liquid grams/mL where appropriate. Future canonical data supports ingredient quantities and lists, preparation method, cooking-loss adjustments, finished batch weight/yield, serving yield and weight, customer portions, calories/nutrients, allergens, cost, nutrition per gram, cost per gram, package weight and package/SKU relationships.

Make the food once, measure it correctly, and let software present it according to customer need. If we know what is in it, we can scale it; if we can scale it, we can control portions; if we can control portions, nutrition and weight goals can become more repeatable.

Do not assume one product equals one recipe:

| Concept | Meaning |
|---|---|
| Product | Customer-facing sellable item |
| Recipe | Production formula |
| Component | Reusable sauce, protein, vegetable preparation, garnish or finishing element |
| Recipe version | Controlled iteration and history |
| Package / SKU | Sellable format or quantity |
| Nutrition profile | Derived from actual ingredients, recipe and finished yield |
| Cost profile | Production economics |
| Preparation instructions | Customer cooking, reheating and plating workflow |

One canonical gnocchi recipe may support a frozen bag, prepared meal, individual meal kit, family meal kit, multiple sauces and seasonal combinations. Composition and exact versions must remain traceable across nutrition, costs, labels and historical orders; changing presentation must not silently change the food.

Future component/portion records distinguish gnocchi, sauce, protein-component, vegetable and garnish/finishing weights; complete serving weight; calories, protein and fiber; total serving yield; and portion category. Categories may include individual complete meal, larger-appetite meal, family/multi-serving and standalone frozen product.

Exact weights are driven by recipes, prototypes and economics. A 5000 g batch and 340/280/420 g customer portions are illustrative, never hardcoded. Suggested grams derive from recipe nutrition, calorie targets, protein/fiber strategy, the daily plan and realistic serving constraints. Preserve satiety and real-food adequacy; never produce absurdly tiny servings solely to hit numbers. Suggestions must map to supported production/package/serving offers before ordering; a numerical suggestion alone creates no purchasability.

## River-led prototype and recipe capture

River remains the chef and product creator. The future workflow captures food as actually developed, rather than requiring mathematically finalized recipes before cooking:

1. River cooks the prototype.
2. Capture ingredients used.
3. Capture exact or estimated ingredient weights.
4. Capture the cooking method.
5. Capture live flavor/texture adjustments.
6. Normalize into reproducible measurements.
7. Measure actual finished yield.
8. Establish portions.
9. Calculate nutrition.
10. Calculate ingredient cost.
11. Calculate packaging cost.
12. Capture labor/time assumptions.
13. Freeze test.
14. Thaw/cook/reheat test.
15. Write customer preparation instructions.
16. Evaluate presentation.
17. Revise the recipe.
18. Create a controlled new recipe version where appropriate.

River personally wants a small digital food scale to weigh ingredients, finished yield and portions, understand contents, cook creatively with nutrition visibility, control calorie intake and body weight intentionally, reduce random eating and dependence on processed/eating-out food, and make nutrition repeatable rather than motivation-dependent. If River finds the capture, tracking or calculator tedious, the product needs simplification.

## Frozen-product development and presentation

Future test records for gnocchi and other frozen products should cover freeze method and stability, sticking/clumping, freezer burn, packaging integrity, texture after storage, boiling and pan finishing, sauce separation/stability, vegetable and protein-component texture, direct-from-frozen and thawed preparation where appropriate, customer error tolerance, safe storage guidance, realistic storage duration and storage/cooking/reheating labels. Shelf-life and safety claims require appropriate evidence; none are established here.

Premium presentation can include finished-dish/package photography, suggested plating, finishing sauce, herb oil, herbs, grated/crumbled finish, toasted texture components, seeds/nuts where allergen-appropriate, crispy components where storage permits, garnish, color contrast, plating sequence and QR-linked preparation/plating videos. The customer flow aims to open, cook/reheat simply, finish and plate beautifully.

High-level culinary quality is the aspiration. Any “Michelin-level” language is an internal quality aspiration only; no Michelin recognition is claimed.

## Product economics and inventory

Future per-SKU economics may include ingredient and component cost, packaging, labels, payment-processing allocation, delivery allocation, estimated labor, waste, yield loss, freezer/storage allocation, total COGS, selling price, gross-profit dollars and gross-margin percentage. Define allocation and cost-profile assumptions explicitly so components and allocated costs are not counted twice.

Do not shrink portions merely to create margin. Improve sourcing, batch efficiency, production methods, yield, waste reduction, packaging decisions, pricing, product mix and inventory planning. Customers should leave fed.

The future product/inventory system must distinguish made-to-order from frozen inventory and permit further storage/fulfillment types when needed. Frozen inventory may require quantity on hand, production batch, frozen date, availability, package count, reserved quantity, sold quantity and storage state. These are deferred concepts, not fields or schemas implemented now.

## Storefront and growth trajectory

Future presentation can support flagship prominence, product story, images, package size, price, availability, nutrition and protein/fiber highlights, ingredients/allergens, cooking/storage instructions, plating suggestions, preparation video, cart, pickup/delivery, reorder and seasonal releases. No public interface is implemented by this record.

The intended initial model is local direct-to-consumer operation within applicable Texas cottage-food rules, subject to recipe-specific eligibility and independently verified readiness. This records owner direction and does not establish that any recipe or channel is currently lawful or approved.

Potential growth is home/cottage food -> appropriately licensed commercial kitchen/production -> larger batches -> broader delivery/distribution -> retail freezer placement -> shipping where legally and operationally appropriate -> wholesale where legally permitted -> packaged-food brand expansion. Current cottage-food registration must not be treated as approval for every future channel or as existing commercial retail infrastructure. Architecture should avoid unnecessary barriers to future commercialization while preserving separate channel readiness.

## Optional calculator, household and weekly planning

A future calculator may use height, weight, age, sex where required by the selected formula, activity and goal to estimate resting energy, approximate total daily expenditure and target calorie ranges. Adult goals include deficit, maintenance and surplus, potentially with a sensible desired rate where appropriate. Use “estimated maintenance,” not exact metabolism. No formula is selected here.

Somatotypes (endomorph, mesomorph, ectomorph), race, ethnicity and nationality must not drive calorie estimates. Avoid needless complexity.

A future account can contain self, spouse/partner and child/family-member profiles with individual portion requirements, preferences, allergens, estimated energy needs and relevant goals. One family meal may have different suggested servings for each person. Child/youth planning is a separate conservative, age-appropriate concern; never apply simplistic adult deficit/surplus dieting to minors.

“Build My Week” may arrange available products by calorie/protein targets, preferences, allergens, number of meals wanted, budget, household size, goal, favorites and availability. Support lunches only, dinners only, several meals/week (including 5 or 10), workweek meals, family dinners and custom selection. Customers need not buy all food from the restaurant.

The optional advantage over after-the-fact calorie logging is that measured recipes and yields inform portions before purchase: goal -> calorie/protein target -> choose available meals -> calculate supported portion -> order exact portions -> receive measured food -> follow plan. This is a product distinction, not a claim about every competing service or perfect nutrient precision.

## Later adaptive energy calibration

Later-phase, opt-in functionality may use body weight over time, adherence, average calorie intake from planned meals and appropriate activity observations:

Calculate -> portion -> eat -> observe weight trend -> recalibrate -> repeat.

Compare predicted maintenance/change with actual rolling trends over sufficient observation windows. Do not react to isolated daily weigh-ins. Consistent unexpected loss under a maintenance estimate may suggest higher actual maintenance; unexpected gain may suggest an adjustment. Observations and incomplete intake/adherence information do not establish certainty.

Deferred concepts include customer nutrition profile, household member profile, energy estimate, goal, activity level, target calorie/protein ranges, meal plan, meal-plan day, planned meal, portion grams, recipe nutrition per gram, package nutrition, weight trend and calibrated energy estimate. Model them only when their bounded implementation slice arrives.

## Implementation priority and phased launch

FOOD-002ZK was closed separately at commit d781fdcece3b41b046eb7eb45f56712f4ff599b8; that closure did not authorize activation. Current priority remains FOOD-002ZK1 -> resolve account-page analytics/privacy and real-browser prerequisites -> activation prerequisites -> canonical owner account -> FOOD admin authorization -> private menu/product administration. Product implementation follows those prerequisites. This documentation begins neither ZK1 nor FOOD-003A.

Preserve the future trajectory:

| Candidate slice | Scope |
|---|---|
| FOOD-003A | Flagship gnocchi product architecture and recipe-capture model |
| FOOD-003B | Recipe/version/component system |
| FOOD-003C | Ingredient/allergen/nutrition model |
| FOOD-003D | Yield/portion/cost/pricing model |
| FOOD-003E | Optional nutrition calculator/customer meal-planning architecture |

Exact numbering may adapt only if canonical repository architecture requires it; these are candidates, not completed or currently authorized implementation slices.

Launch phases are normal restaurant ordering, flagship products and transparent nutrition facts (Phase 1); optional calorie/macro/portion calculator (Phase 2); household planning (Phase 3); and adaptive calorie/weight-trend recalibration (Phase 4). Advanced nutrition features must not unnecessarily delay first revenue from an otherwise ready restaurant system.

This scope authorizes documentation revision and staging only. It creates no recipes, domain code, schemas, migrations, accounts, admin configuration, inventory, ordering or payment implementation, public exposure, production changes or deployment. Commit and push require separate owner authorization.

## Current founder direction — FOOD-032E, October 23, 2026

This owner-authorized update supersedes earlier implementation sequencing and any
implication above that gnocchi is the first active launch product. Earlier text is
retained as historical domain context. The current operating focus is exclusively
**Hot Food Bowls → Southwest Harvest Bowl**, in development. All other departments
and earlier optional nutrition features are future planning, not launch inventory.
The complete founder handoff and implementation verification are preserved in
[FOOD-032E](../../.river-dev/specifications/food-commerce-032e-vision-storefront.md).

### One family company and one current bottleneck

Build one trustworthy, repeatable and profitable family-owned food company.
Software, food production, content, SEO, ads, relationships, customer care and
reporting serve The Table. Other ventures may provide bridge income or remain
parked; they are not competing active priorities for this workstream. Do not
reuse another employer's or unrelated business's customer data without an
independent lawful basis and consent. Protect family time, integrity, stewardship
and faith-inspired service without spiritual or health product claims.

Long-term intent is a legally compliant dedicated production facility, reliable
staff, measured operations and a transferable business. On-site/nearby residence
requires independently established zoning and facility separation. Manager-run
repeatability precedes a choice among company-owned sites, franchising, licensing
or sale. These are distinct economic/legal models, not current implementation.
Growth is earned through safe operations, repeat demand, capacity and cash flow.
No quantitative growth slogan is a verified business promise.

### Six durable departments, one active experiment

The lightweight planning registry is `src/lib/food/table-menu-plan.ts`; it creates
no product, offer, SKU, price, inventory, ordering permission or public category
route. Only the first department appears in the current storefront navigation.

| Stable ID | Department | Planning scope |
| --- | --- | --- |
| hot-food-bowls | Hot Food Bowls | Southwest Harvest Bowl is the only active experiment; vegetable stir-fry bowl is a future concept. |
| cold-bowls | Cold Bowls / Açaí / Playa-inspired | Future açaí/customizable bowls and ube, mango, coconut, cacao/nibs. Other brands are inspiration only, without affiliation. |
| hot-soups | Hot Soups | Seasonal soups and Mi-Mi-inspired Chickenless Gnocchi Soup featuring The Table's Signature Gnocchi. Soft dumpling-like gnocchi is desired HERE. |
| signature-gnocchi | Signature Gnocchi | Garden Vegetable Gnocchi and sauced dishes; tender interior, possible seared exterior and distinct freeze/microwave texture goals. Soup is not duplicated here. |
| juice-water | Juice / Water | Separate measured pressed juices and juice/water blend formulas; treatment, fermentation, cold chain, labels and regulatory scope require validation. |
| freezer-packs | Take-Home Frozen Gnocchi Packs | Bulk frozen signature gnocchi, with independently validated home preparation, package, storage and legal requirements. |

Far-future bookmark only: tortellini and ravioli may eventually extend a mature specialty pasta line; no current recipes, category, SKU, images, purchases or work estimates.

Recognizable produce-forward ingredients, flavor, value and repeatable texture
come before marketing slogans. Avoid the nine major U.S. food allergens in core
formulations where practical, without claiming allergen-free food or universal
allergy safety. Verify supplier subingredients, shared equipment and cross-contact;
any deliberate exceptions need justified, prominent disclosure. Soy/tofu is parked
and not in the current bowl. No unsubstantiated all-natural, low-sodium, detox,
nutrition, fruit-ripeness, dilution or hypoallergenic claims.

### Current Southwest Harvest Bowl and physical evidence

Proposed components are sweet potatoes, black beans, rice, peppers/onions,
cilantro-lime sauce above rice and below vegetables, and one sealed dry pepita
packet removed before microwaving. No feta or extra chilled topping kit.
Mushrooms are excluded from current experiments as a preference, not a final
approved formulation decision. Kale is unresolved. Preserve the distinct FOOD-031
A/no-kale, B/blanched-kale and C/lightly-steamed-kale trial histories. Ten grams
cooked/drained kale per portion is a test hypothesis, never measured evidence.
Sauce and package freeze/reheat performance remain unverified.

Real grocery/packaging spending and physical trials are intentionally postponed
until the founder can review a nearly finished storefront, launch preparation,
SEO and operations. This does not authorize sales or imply available food.
Canonical recipe evidence and adoption remain separate from public owner-intent
copy. Physical food, ingredients, labels, costs and approvals still gate launch.

### Customer experience and fulfillment direction

Preserve the existing visual brand and routes. Use image-led, accessible,
mobile-first food presentation with honest concept imagery until actual product
photography exists. Diagnose assets and CSS before aesthetic replacement.
Standard browsing is the default. Optional gram/nutrition/household planning
comes later, only with verified data and demand; never force it onto shoppers.

Future daily ordering/fulfillment is restricted to owner-set windows, lead times,
capacity and independent legal permission; no automatic same-day promise. Free
scheduled pickup and qualifying local delivery are customer pricing goals, not
zero operating costs. Model labor, fuel/mileage, transport, insulation, packaging,
fees, tax and waste before price authorization. Home/property pickup needs safe
staffed access and family privacy; public/third-party sites need permission. No
unattended cooler for temperature-controlled meals. Prepaid home/off-site pickup
and any family-member address require exact independent Texas legal review.

Delivery uses consented addresses and scheduled windows. No customer GPS, route
or location telemetry. Future tracking links are scoped per order; manual operator
state transitions must agree with customer views and be durable/idempotent.
Optional on-the-way/almost-there notifications and customer I'm-here signals
must be truthful and consented. No real email/SMS integration or sends now.
Staff/family roles, shifts and delivery assignments come later with lawful
compensation; meals do not replace required wages.

### Ordered roadmap — preparation only

1. **Finish and review this first-product prelaunch storefront.** Current increment
   repairs its missing visual focal point, keeps navigation narrow, and tests
   closed-order states. No public signup unless a real consent-aware backend is
   independently verified; no inert form masquerading as functional.
2. **Private synthetic customer status journey.** Reuse existing order/status
   engines. Manual truthful updates, scoped tracking tokens, durable events,
   operator/customer agreement and retry tests; no GPS or timer-invented progress.
3. **Owner capacity and fulfillment controls.** Reuse scheduling/production and
   inventory authorities for explicit windows, batch lead times, daily limits,
   permissioned sites and delivery zones. Establish legality and actual free-to-
   customer fulfillment allocations before publishing options.
4. **Notification design.** Independently verify opt-in consent, provider costs,
   privacy, idempotency/retries and channel preferences before optional email/SMS.
   No live notifications or credentials are configured by this mission.
5. **Truthful local discovery and marketing drafts.** Big Spring and only genuinely
   intended/served areas; accurate titles/meta/canonical/robots/sitemap, accessible
   local media and privacy-aware analytics. Determine GBP eligibility/service-area
   configuration without publishing a false address, hours, reviews or ratings.
   Draft campaign tags, referrals, opted-in CRM and ads; no paid activation now.
6. **Physical/legal launch gates.** Exact production/fulfillment eligibility,
   independent food handling/cooling/storage/transport review, measured ingredients
   and yields, supplier allergens/cross-contact, package freezing/heating/seals,
   shelf-life, labels, tax, price/SKU, capacity and owner go/no-go. Then genuine
   photography, approved offers and separately authorized controlled activation.
7. **Earn additional product lines.** Repeat demand, profitable economics, reliable
   handoffs and capacity precede one-at-a-time seasonal products. Charity meals
   and private aggregate impact remain aspirations, with recipient privacy.
8. **Facility-aware scale after proof.** QA/SOPs, staff roles, production/inventory/
   order ledgers and site KPIs only as operational need emerges; no speculative
   multi-facility infrastructure in this slice. Choose expansion model after
   compliant manager-run repeatability is demonstrated.

The next single bottleneck is founder review of the first-product prelaunch
storefront. Physical evidence and separate launch authorization follow; software
quality never substitutes for business permission or food validation.


### FOOD-032E final founder amendment: governing brand direction

The Table is one family-owned food company built around real food, homestyle
cooking, thoughtful ingredients, exceptional flavor, consistent quality, repeat
customers and long-term family ownership. Grandmother-style comfort and care are
culinary inspiration, not verified nutrition, health, processing, allergen or
safety claims. Earn repeat business through trustworthy experience. Use genuine
product photography when available; until then clearly identify concept imagery.
Expand only when capacity, economics and operations justify it, toward a company
the family can own without performing every task forever.

The earlier game-inspired marketing direction is rejected and superseded. No
locked/silhouette cards, unlockable or mystery products, artificial scarcity,
countdowns, game-style release animations or manufactured urgency. No such
mechanics were found in the current Table implementation. Future departments
remain planning only; restrained Coming Soon copy is optional, not a current task.

This exclusion does not remove useful order progress: preserve the planned
practical tracker, scheduled pickup/delivery windows, manual operator updates,
optional consented notifications and customer reassurance. No GPS, customer
location surveillance or live driver coordinates. Existing commercial gates,
FOOD-031's three unchanged sauce trials and the one-bowl implementation scope
remain authoritative. No FOOD-033, new infrastructure or additional product work.
