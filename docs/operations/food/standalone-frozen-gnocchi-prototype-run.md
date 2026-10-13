# Standalone frozen gnocchi — first real prototype run

Blank kitchen worksheet · FOOD-004K · Record actual events and measurements only.

## Before cooking

- [ ] Digital scale ready; gram mode selected.
- [ ] Weighing containers available; tare before recording ingredient mass.
- [ ] Notes/capture method ready; ingredient measurements can be recorded individually.
- [ ] Batch date/time and founder measurement source recorded below.
- [ ] Record every addition's actual amount before adding it; mark any missed measurement explicitly.

Run note/label (non-canonical): ____________________
Founder measuring: ____________________
Batch date (YYYY-MM-DD): ____________________  Time/time zone: ____________________
Source note/location for this completed worksheet: ____________________

Owner direction: measure standalone frozen gnocchi first. After validation, develop a complete prepared gnocchi meal with sauce and vegetables. Standalone gnocchi may later be a secondary/add-on offer. No recipe, ingredient list, flavor, portion, package, price or public presentation has been approved here.

## Ingredient measurements

Assign each starting input a unique run-local key. Keep the initial reading unchanged. Record each later addition/removal in the adjustment log; summaries below are optional working notes, not canonical computed fields. Leave unknown totals unfilled and explain the gap. Repeat rows as needed.

| Input key | Ingredient name exactly as used | Initial measured grams | Later added grams (log refs) | Removed grams (log refs) | Actual total used grams, only if determinable | Measurement note |
|---|---|---|---|---|---|---|
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |

## Ordered method log

Number actual steps in order. Record time/temperature only when measured; no assumed values. Continue the numbering on extra pages.

| Step | What actually happened | Actual time/duration, if recorded | Actual temperature and unit, if measured | Equipment/process note | Observable result |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |
| 6 | | | | | |

## Live adjustments — preserve event order

For a mass event, identify **either** a known input key **or** the name of an ingredient introduced only during adjustment. Record add/remove and positive measured grams. For a process change, use text; no gram amount is required. Put missed/unmeasured amounts in factual notes rather than guessing a numeric event.

| Event order | Method step/point | Kind: process or mass | Input key OR adjustment-only ingredient name | Add/remove (mass only) | Actual measured grams | What changed; factual reason/observation |
|---|---|---|---|---|---|---|
| | | | | | | |
| | | | | | | |
| | | | | | | |
| | | | | | | |

## Finished usable yield

**Actual measured finished usable gnocchi yield (`finishedYieldGrams`): __________ grams**

State at measurement (describe what “finished” means in this run): ____________________
Measurement time and container/tare note: ____________________
What is included/excluded from this usable-yield measurement: ____________________

Do not calculate yield from starting ingredients. Gram mass is canonical. An optional piece count is an observation, not a serving unit or portion definition.

| Optional observation | Actual measurement/count, only if recorded | When/state; whether included in usable yield |
|---|---|---|
| Unusable/lost mass | | |
| Scraps/waste | | |
| Test pieces consumed/removed before final weighing | | |
| Remaining batch mass at a stated later point | | |
| Piece count at a stated point | | |

These entries map to category/text observations, not a mass-balance system. Do not subtract losses again from an already measured usable yield. Missing measurements remain unknown.

## Fresh quality observations

| Category | Actual owner observation |
|---|---|
| Workability | |
| Shape consistency | |
| Cooking behavior | |
| Texture | |
| Flavor | |
| Appearance | |
| Breakage | |
| Sticking | |
| Other | |

These are observations, with no automatic pass/fail threshold.

## Freezing test — copy this block for each actual sample/test

Sample note/label (non-canonical): ____________________
Exact measured sample mass: __________ grams
State when frozen, if recorded: ____________________
Actual test container/packaging: ____________________
Date/time/time zone frozen: ____________________
Later test date/time/time zone: ____________________
Tested directly from frozen or after thawing (actual event): ____________________
Actual cooking/reheating method, measured times/temperatures if available: ____________________

| Observation | Actual result |
|---|---|
| Breakage | |
| Sticking | |
| Texture | |
| Appearance | |
| Flavor | |
| Storage/freezing behavior | |
| Other | |

Record unfinished tests as pending. This block supplies observations only; it prescribes no freezing duration, bag/portion size, shelf life, storage life, cooking method or thawing recommendation. Test packaging is not an approved commercial package.

## Owner decision after the run

Choose one explicitly:

- [ ] ACCEPT_FOR_SECOND_CONFIRMATION_RUN
- [ ] REVISE_AND_TEST_AGAIN
- [ ] REJECT_THIS_FORMULATION
- [ ] UNDECIDED

Decision date and owner note: ____________________

**WHAT I WOULD CHANGE NEXT TIME:** ____________________

A repeat batch can help confirm formulation reproducibility, yield consistency, preparation repeatability and freezing performance. The owner decides readiness; neither one successful run nor any fixed number of runs automatically makes a recipe canonical.

## Bring back after cooking

- Actual ingredient names and initial grams, with later adjustments retained separately.
- Ordered method, measured time/temperature where available, and ordered adjustments.
- Measured finished usable yield and its measurement state/exclusions.
- Available freezing/storage and fresh-quality observations; identify pending tests.
- Founder measurement attribution, source note/location, batch date and owner run decision.
- Optional supporting photos, notes and test labels; photos are not required.

## Capture mapping and later canonicalization gate

[FOOD-003A](../../../.river-dev/specifications/food-003a-flagship-gnocchi-product-architecture-and-recipe-capture-model.json) supports context-free experiments: no existing recipe/product reference is required. This worksheet assigns no capture, product or recipe ID. A later authorized domain capture needs its own capture identity; omit recipe/product references and ingredient indices until exact validated snapshots exist.

Map starting measurements to `inputs` (`key`, `ingredientName`, `grams`); actual steps to ordered `method` text; events to `adjustments`; usable yield to `finishedYieldGrams`; quality/freezing/loss/count/sample notes to `observations` (`category`, `text`). Method position, measured time/temperature and reasons remain text, not new domain fields. Founder attribution maps to `provenance.kind = founder-measured`, a real `sourceReference`, and optional `occurredOn` date. The owner decision remains a worksheet decision, not automatic domain approval.

Domain limits: up to 128 entries per list; starting inputs and method must be nonempty. Gram values must be positive and finite, at most MAX_SAFE_INTEGER; retain measured fractions. Keys/categories are bounded to 128 characters, ingredient names to 256, method/adjustment/observation text to 2000, and source reference to 512. Blank fields are preparation material, not valid domain records. A missed measurement must be resolved or explicitly remain a gap before later validation.

Prototype evidence is distinct from canonical recipe version, product, dish presentation, serving offer and publication. A separately authorized, owner-reviewed handoff may later establish the exact FOOD-001 recipe draft and [FOOD-003B](../../../.river-dev/specifications/food-003b-recipe-version-component-system.json) formulation companion: deliberate ingredient-index/gram composition, internal ordered method and `yieldGrams`, matching the exact draft identity/version. Starting measurements and adjustments are evidence for that decision, not an automatically summed recipe. No automatic promotion, safety claim, sale authority or publication follows from this worksheet.

## Prepared gnocchi meal follow-on

After foundation validation, the intended next development stage is **PREPARED GNOCCHI MEAL PROTOTYPE**: validated gnocchi + owner-selected sauce + owner-selected vegetables.

Sauce and vegetables are unselected. Sauce recipe, vegetable preparation, complete-meal formulation, meal portion, package/SKU, meal price and serving offer do not exist yet. Public description is not approved. Establish these separately through real prototype evidence and owner decisions.

FOOD-003B permits a future exact direct-ingredient gnocchi component version referenced with grams by a meal recipe. It does not accept a recipe reference as a component or support nested components. Represent reuse deliberately in a later authorized slice; do not recopy or automatically convert this experimental run into meal formulations.

**MARKET TEST HYPOTHESIS — NOT VALIDATED DEMAND:** sample/market the complete prepared meal in its intended context, with standalone frozen gnocchi potentially available later for customers who want it. This records direction only; it creates no survey, price, checkout, public menu, advertising, sampling logistics or permit claim.
