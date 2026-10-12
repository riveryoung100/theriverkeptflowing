# Optional FOOD nutrition calculator and customer meal-planning architecture

## Authority and implementation decision

FOOD-003E formalizes the [canonical candidate](../../.river-dev/specifications/food-003-long-term-restaurant-nutrition-planning-direction.json) and [restaurant product vision](food-restaurant-product-vision.md) under the owner's architecture-first instruction. The [standalone specification](../../.river-dev/specifications/food-003e-optional-nutrition-calculator-customer-meal-planning-architecture.json) records the contract.

Mode is **ARCHITECTURE_ONLY**. The roadmap names architecture, defers planning types and selects no energy-estimation formula. This slice defines boundaries and future arithmetic contracts; it implements no calculator, profile types, persistence, UI or ordering capability. Future code requires a separate bounded implementation instruction.

## Two experiences, one food foundation

Simple ordering remains browse → view dish → choose supported available format → review required food information → order once independently enabled. No nutrition goals, body measurements, macros, calculator, meal-plan profile or account solely for nutrition is required. The [FOOD-002A direction](../../.river-dev/specifications/food-002a-public-menu-serving-offers-ordering-demand-pos-lite-architecture-direction.json) already separates browsing/ordering from optional account features and commercial activation. This document does not imply ordering or checkout is currently enabled.

Structured planning is deliberate opt-in. It adds arithmetic visibility to the same recipes and food catalog, without a separate fitness catalog. Customers can plan selected meals without buying all meals from this business. Optional tools must not delay an otherwise ready normal restaurant launch.

| Concept | Boundary |
|---|---|
| Menu item / dish presentation | Food presentation; not a nutrition target |
| Recipe version | Exact FOOD-003B formulation and internal process |
| Nutrition profile | Exact FOOD-003C derived values and provenance |
| Internal portion definition | FOOD-003D recipe-bound gram target; not a SKU |
| Serving offer | Independent FOOD-002 commercial format/version |
| Customer nutrition target | Supplied values; not a health recommendation |
| Planning profile | Optional planning identity/version; not legal identity |
| Meal plan | Selected food allocations; not an order |

## Exact foundation references

[FOOD-003B](../../.river-dev/specifications/food-003b-recipe-version-component-system.json) owns canonical recipe/component identities, composition and yield. [FOOD-003A](../../.river-dev/specifications/food-003a-flagship-gnocchi-product-architecture-and-recipe-capture-model.json) captures experimental observations only; measurements and yield are never automatically promoted to canonical formulation or nutrition truth.

[FOOD-003C](../../.river-dev/specifications/food-003c-ingredient-allergen-nutrition-model.json) owns nutrition. Its `FoodRecipeNutritionProfile` retains `formulation`, per-100-g `nutrients`, `inputs`, `completeness` and conservative `allergens`. Ingredient source revisions and nested component input provenance identify the exact nutrition basis. This profile currently has no independent persisted profile ID/version. Two projections for one recipe version can use different source revisions: recipe ID/version alone is insufficient to identify nutrition.

A future allocation must retain the exact immutable FOOD-003C snapshot and provenance, or a separately designed durable reference that resolves that exact snapshot. It must not invent a profile identifier or resolve latest. Derived allocation values may be cached only with their exact inputs and recalculation rule; they never become independent hard-coded nutrition facts. Later source/formulation changes create deliberate new projections and plan revisions; old plans remain unchanged.

## Future gram calculator boundary

For supplied planning grams greater than zero, validate with existing FOOD gram rules. For each known nutrient:

`planned amount = planned grams / 100 × exact per-100-g nutrient`

The initial set is FOOD-003C energy kcal, protein g, carbohydrate g and fat g. Preserve explicit unknown values and known zero. Completeness means all required nutrients are known, not that source data is certified accurate. Reject nonfinite inputs/results; add no presentation rounding or energy-from-macros formula.

This answers what a selected amount provides. It does not choose what someone should eat, infer targets, optimize meals or grant commercial authority. An arbitrary planning mass creates no recipe version, published serving, package or SKU.

[FOOD-003D](../../.river-dev/specifications/food-003d-yield-portion-cost-pricing-model.json) internal portions may supply a deliberately selected target if the exact recipe reference matches. A portion definition is optional; arbitrary positive grams are architecturally allowed. Cost is not a dependency for nutrition calculation. Future cost displays must consume exact FOOD-003D projections and retain the ingredient-formulation-cost-only limitation.

## Supplied targets and optional planning profiles

Future targets distinguish **specified finite nonnegative value** from **not specified** for daily kcal/protein/carbohydrate/fat. Specified zero remains distinct from missing. A user can provide only the targets they choose. Supplied intent labels—deficit, maintenance, surplus, custom or unspecified—do not calculate a deficit, prescribe intake or promise weight change.

The future profile has a stable planning identity and controlled immutable versions, with an exact target snapshot, supplied intent and only necessary preference/restriction references. No identifier prefix or schema is selected here. It is distinct from canonical `PrincipalId` in the [identity model](../../src/lib/identity/model.ts): account authentication does not define nutrition needs. A future optional account association must be explicit and authorized; a profile does not require a legal name or a separate account for each person.

No BMR/TDEE, age/sex/height/weight/activity-derived target, pregnancy/medical targeting or body-data collection is implemented. This defers the long-term energy-estimation vision without replacing it.

## Allocations, meals, days and weeks

A future planned allocation holds exact recipe/version, exact nutrition snapshot/provenance, positive grams and its derived projection/completeness. It is neither an order line nor an inventory reservation.

Ordered allocations form a meal. Breakfast/lunch/dinner/snack/custom labels organize selections without medical meaning. Ordered meals form a day; ordered dated days may form a week. Caller order is explicit. Repeated allocations represent separate selected amounts and count independently; do not silently deduplicate them.

Per-nutrient totals sum the selected projections in deterministic order. Any required unknown contribution makes that aggregate nutrient unknown. An empty selection may total known zero, meaning only that no food has been selected. It says nothing about adequate intake or a complete day of eating.

For a specified target and known planned total:

`remaining = supplied target − planned total`

Negative remaining is permitted. Missing target or unknown total produces an explicit unavailable comparison, not zero. Comparisons carry no good/bad/healthy/unhealthy judgment. Plans may include only some meals; neither totals nor comparisons imply actual consumption or automatically generate advice.

## Household and privacy boundaries

Architecture permits multiple planning profiles in a household context, with separate supplied targets and portions using shared exact recipes. A household is not an account; a household-member profile is not a legal or personal identity. Every member need not have an account. Persistence, invitations, sharing and access rules remain future work.

Child/youth planning stays separate from adult deficit/surplus logic; no pediatric, pregnancy or medical recommendation engine is defined. Do not apply adult weight-loss prescriptions to minors. This document adds no sensitive records or real family data.

Minimize future collection: do not require legal names, birth dates, diagnoses, medications, medical history, pregnancy status or body-fat measurements merely to plan chosen food. Before later account/household persistence, define explicit consent, access, sharing, retention and deletion policies under a separate authorization.

## Commercial and allergen boundaries

A future explicit order bridge must map chosen food to independently supported exact serving-offer versions, then freshly validate publication, availability, approved pricing, safety/legal readiness and fulfillment. Unsupported gram amounts remain planning-only; do not silently substitute a package, recipe or format. A plan never places an order, charges a payment or reserves inventory automatically.

FOOD-003C explicit allergen declarations, review evidence and unresolved state remain intact. A preference, target or plan cannot establish allergen safety; nutrition completeness cannot resolve an incomplete allergen review. No allergen-free or cross-contact claims are introduced.

## Now and later

Now: define opt-in planning, unchanged simple ordering, exact nutrition snapshots, gram projection, supplied targets, meal/day/week/household concepts, version stability and data minimization. These are architecture contracts only.

Later: separately authorize a small pure calculator, account association, household/plan persistence, customer UI, commercial order bridge, optimizer/recommendations and adaptive observations/recalibration. No API, UI, calendar persistence, subscriptions, billing, delivery scheduling or package model is added here.

Adaptive architecture may eventually link deliberately supplied dated observations to exact prior target/plan versions. It must remain opt-in, versioned, explainable and separately reviewed. This slice selects no measurement collection, weight-trend algorithm, observation window, calorie adjustment, medical threshold or autonomous recalibration rule. The [long-term vision](food-restaurant-product-vision.md) remains future direction.

## Validation and handoff

Review JSON/document agreement, repository-relative links, cited existing symbols, complete new-file content and whitespace. Only this document and its standalone specification are added. Existing FOOD source behavior stays unchanged, so architecture-only validation does not require new tests, lint or TypeScript checks. No deployment, remote action, staging, commit or push is authorized by this implementation task. Owner review and separate commit authorization follow.
