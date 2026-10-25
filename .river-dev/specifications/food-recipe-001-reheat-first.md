# FOOD-RECIPE-001 — Southwest Harvest Bowl, reheat-first lab

Private product-development specification, 2026-10-21. The Table / The River
Kept Flowing. Experimental prototypes only: no recipe, shelf life, reheating
label, regulatory approval or commercial release has been established.
The financial objective remains the owner-defined target weekly operating profit before personal
taxes. No orders, payments or public recipe changes are authorized here.

## Design backward from the reheated bite

Aim for distinct sweet roasted potato, precisely salted rice and intact beans,
roasted pepper/onion/garlic with cumin and smoked paprika, and browned mushroom
and tomato-paste umami folded into the beans. Explore subtle bitter notes from
controlled browning, tender greens or toasted seeds; avoid burnt bitterness.
Keep acid in a separate cilantro-lime finish and crispness in a dry pepita pack.
Microwaving is not expected to preserve roast crispness. All methods below are
hypotheses for testing, not proven production instructions.

### Three physically separate components

These are proposed **cooked serving weights**, not measured yields or raw
shopping quantities. Seasonings/oils incorporated into a component count inside
its final serving weight. Record every raw input separately; do not add an
unweighed seasoning allowance to an allegedly precise recipe.

| Component | A: original concept | B: reheat-optimized hypothesis | C: simpler hypothesis |
| --- | ---: | ---: | ---: |
| Cooked rice | 110 g | 110 g | 110 g |
| Roasted sweet potato | 125 g | 125 g | 125 g |
| Seasoned black beans | 95 g | 95 g | 95 g |
| Browned mushroom mixture | 50 g, standard sliced mushrooms | 50 g, finely minced mushrooms | omitted |
| Roasted peppers/onions | 50 g | 50 g | 50 g |
| Other vegetable | 70 g broccoli | 70 g tender kale, ribs removed | omitted |
| **A: hot-base total** | **500 g** | **500 g** | **380 g** |
| **B: separate cilantro-lime dressing** | **25 g** | **25 g** | **25 g** |
| **C: separate dry chili-lime pepitas** | **12 g** | **12 g** | **12 g** |
| Total assembled target | 537 g | 537 g | 417 g |

A is a reference with bite-sized sliced mushrooms; B tests whether a browned,
fine mince integrated with tomato paste and beans avoids rubbery mushroom bites
and whether tender kale survives reheating better than broccoli. C removes
mushrooms and greens to test fewer preparation steps and simpler purchasing.
C may lose umami/vegetable balance; it is not automatically cheaper or better.
The three variants differ in several ways, so initial screening is exploratory,
not a causal experiment. Follow up with single-variable matched tests.

Do not silently increase C's rice or potatoes to fill a 500 g bowl. Record its
380 g hot base and changed fill depth. If equal-weight comparison is needed,
create a new recipe version with explicit revised gram targets and new costing.

### Proposed weighed bench preparation

1. Before cooking, confirm the kitchen safety plan, calibrated thermometer,
   clean equipment and cooling/storage capacity. Choose a very small batch that
   can be cooled and logged safely. Scaling is by observed capacity, not demand.
2. Record supplier/lot, ingredient and subingredient lists, raw edible grams,
   trim/discard grams, oil/salt/spice grams and cooking water for each component.
   For rice record dry weight, rinsing method, water ratio, resting procedure,
   cooked yield and portion grams. No assumed dry-to-cooked conversion.
3. Compare potato cubes at proposed 15 mm versus 20 mm, with identical seasoning
   and measured oil. Roast separately from wetter vegetables; record actual
   oven setting, loading, tray position, duration, mass loss and doneness. Test
   less versus more browning, seeking a creamy center that stays intact. Do not
   label an undercooked or burned sample as the intended quality target.
4. Drain and weigh cooked beans; document canned versus cooked-from-dry source
   and cooking method. Brown mushrooms with measured oil before adding weighed
   tomato paste, garlic, cumin and smoked paprika; record pan load, time and
   final yield. Fold gently with beans to limit splitting. Compare a lightly
   coating mixture against a slightly wetter one using measured added water.
   Allocate the mushroom mixture and beans once each when portioning/costing.
5. Roast pepper/onion separately; record slice dimensions, yield and drainage.
   Test broccoli versus tender chopped kale with measured cooking losses.
   Avoid stacking unmeasured wet vegetables on the rice.
6. Develop a weighed cilantro/lime/water/oil/garlic/salt formula; record exact
   ingredient grams and blend method under a new recipe version. Portion 25 g
   separately. Acid taste is not proof of safe acidity, preservation or shelf
   stability. Test refrigerated and separately frozen/thawed sauce specimens
   with the same formula: separation, re-emulsification, color, aroma, flavor,
   mouthfeel and leakage. Photograph before/after and document sauce conditions
   independently from the base in `sauceStorage` and the evidence log.
7. Develop a weighed pepita/chili/salt/dry-lime-seasoning formula; portion 12 g.
   Compare dry lime seasoning or zest handling without adding wet lime juice
   to the sealed topping. Verify ingredient suitability, allergens and safe
   handling. Cool prepared topping under the verified procedure before sealing;
   test moisture-resistant food-contact packets outside the hot-base cavity.
   Check seal integrity, condensation and crunch after assembly. Do not assume
   a packet is moisture-resistant or shelf-stable because it looks dry.
8. Weigh final cooked yields and actual portion counts. Photograph arrangement,
   depth and packaging. Preserve weighed leftovers/waste in the batch record;
   never infer yield from the proposed portion targets.

## Test sequence and matrix

Start with fresh controls for A/B/C from safe small batches. Establish handling
and temperature verification before sensory work. Allocate separately identified
specimens for each destructive reheating test; do not repeatedly thaw/refreeze
the same bowl for different checkpoints.

| Condition | Quality checkpoint | Microwaves | Required comparison |
| --- | --- | --- | --- |
| Freshly cooked control | same preparation session | not applicable | taste/texture reference; verified cooking/handling still required |
| Refrigerated control | record actual elapsed hours/days under verified storage plan | 700 W and 1100 W | same recipe, portion, container and arrangement |
| Frozen | initial fully frozen trial; record actual elapsed days | 700 W and 1100 W | direct-from-frozen versus separately planned refrigerator-thaw route |
| Frozen | day 7, 14, 30 | 700 W and 1100 W | independently stored matched portions and sauce specimens |

These are **quality research checkpoints, not shelf-life permissions**. Do not
hold a refrigerated control for the frozen schedule or extend sauce storage to
match it without separate verification. Record real elapsed storage duration,
not a planned label; `storageDays` supports fractions. The tool's initial-frozen
matrix slot uses day 0 as a planning marker; if full freezing takes longer, enter
the actual duration, explain it in notes and treat the day-0 gap as a planning
reminder, never falsify a measurement to satisfy the matrix.

Use at least two independent preparation batches for promising variants, then
repeat microwave tests. Plan the small screening batch from the number of
distinct specimens, food-safe cooling space and available equipment. If the
full matrix exceeds capacity, stage it; missing trials remain untested.

For follow-ups change one factor at a time, keep all other details matched and
write a new recipe/configuration identifier:

- Rice water ratio or a weighed added-water dose at reheating.
- Potato cube size, roasting endpoint and component position.
- Bean coating consistency and mushroom mince versus slices.
- Broccoli, tender kale or omitted vegetable (record changed portion weight).
- Shallow versus deeper fill; compartmented versus layered arrangement.
- Manufacturer-permitted vented covering, steam retention, mid-cycle stirring
  and rearrangement. Record exactly which lid/film and vent were used.
- Sauce refrigerated versus independently frozen/thawed; topping kept dry
  versus any accidental condensation exposure (do not taste unsafe samples).

### Microwave trial procedure — internal research, not customer directions

Use the real microwave-safe container, actual portion and measured starting
temperature. Record rated wattage, power setting and every heating stage in
seconds, covering/venting and stirring/rearrangement. Remove sauce and topping
packs before heating. Select and adjust an experimental heating sequence under
the verified safety procedure; this document supplies **no validated heating
time**. Do not infer one by wattage ratio alone.

Keep a detailed time/temperature log, including checks during development and
after the recorded covered standing period. For this research screen use a
minimum 120-second covered stand, followed by calibrated probe measurements at
center, edge and bottom, targeting **at least 165 F throughout**. Also probe
suspected cold spots and dense potato/bean areas; enter these additional readings,
locations and timestamps in `measurementNotes` or the linked batch log. Three
points alone cannot prove every part of a bowl reached temperature. Record probe
sanitation, calibration check and measurement order. If a point is low, record
the failure and subsequent stages/readings in the log; retain the failed trial
and create a separate corrected trial rather than erasing the failure.

The two-minute research minimum is informed by the Texas DSHS microwave
**hot-holding** guidance; this is not a determination that those provisions are
the complete rules for customer reheating. A qualified review must establish
the applicable process and final customer instructions. A container vendor's
heating limit always matters. Do not use an unverified container for a test.

Only conduct tasting when the responsible tester has verified all applicable
safety controls. Assemble with separately handled sauce and dry pepitas after
heating and checks. Score at a consistent recorded interval after assembly;
record whether sauce cooled the meal or seeds softened. Keep unsafe specimens
out of sensory testing regardless of smell or appearance.

## Scorecard and batch evidence

Create a new blank private file with the command in the README. Fill measured
fields only; `null` or omitted measurements remain UNTESTED, not zero. Record an
explicit zero only when observed (for example no added reheating water). For
omitted mushrooms in C, leave `mushroomTexture` null and note
`not applicable — omitted by design` in `measurementNotes`; the tool conservatively
keeps that score gap visible rather than fabricating a score. Score
`vegetableTexture` on the peppers/onions that remain, noting that greens are
absent. Fresh controls do
not require microwave fields but still require handling evidence.

Use all sensory keys in `recipe-lab.template.json`. Apply the same anchors:

| Score | Texture / appearance / aroma / enjoyment | Flavor balance / sauce |
| --- | --- | --- |
| 1 | Unacceptable defect; breaks intended experience | Strongly unbalanced or unpleasant |
| 2 | Poor; clear structural/moisture/crunch defect | Noticeably unbalanced; substantial revision |
| 3 | Acceptable prototype; improvement needed | Acceptable but one note needs adjustment |
| 4 | Good; minor defects only | Balanced, enjoyable; small refinements |
| 5 | Excellent intended reheated experience | Excellent integration and finish |

For `liquidControl`, 5 means no unwanted pooling, 1 means severe watery pooling.
For `sauceStability`, 5 means intended smooth consistency, 1 means objectionable
separation. Flavor balance rates appropriateness, not intensity: bitter=5 does
not mean very bitter. `riceMoisture` rates suitability, not water quantity.
Texture scores 1–2 flag follow-up tests. Missing scores never count as passes.
Do not taste to decide whether handling was safe.

Record defects specifically: dry/gluey rice, mashed potato, split/pasty beans,
rubbery mushrooms, wet vegetables, pooling, separated sauce, damp pepitas or
uneven heating. Include photos, actual preparation labor, portion/fill depth,
timing, ingredient deviations and recommended single-factor retest in notes.

For each batch keep a local evidence log under `.river-dev/state/`, with rows:

`component | batch/lot | event | actual date/time | probe location | F | equipment |
operator | action | follow-up reading/time | evidence file`

Log cooking, cooling of **each** component, refrigerator/freezer temperatures,
freezing completion, sauce handling, portioning and transport. Each `safety`
entry in JSON is `status: null/pass/fail` plus an evidence path or specific log
reference. A self-reported pass without evidence is UNVERIFIED; even complete
entries are only recorded checks and require independent review. The utility
does not inspect or certify linked evidence. It cannot validate cooling curves,
shelf life, microbiology, legal compliance or thermometer accuracy automatically.

## Safety-critical hold points

Cooked rice deserves explicit controls: *Bacillus cereus* can produce heat-
resistant cereulide. Reheating is not a rescue for an unsafe storage history.
See [FDA's cereulide analytical guidance](https://www.fda.gov/food/laboratory-methods-food/bam-quantitative-analysis-cereulide-food-products).

Before physical trials, verify an applicable cooking, cooling, portioning,
cold-storage, transport and corrective-action plan with the responsible food
safety authority/adviser. Texas DSHS describes cooling cooked TCS foods from
135 F to 70 F within two hours and to 41 F or below within six hours total.
Measure actual component curves and refrigerator/freezer capacity under load;
small shallow containers may help but do not prove performance. These limits
are reference criteria, not observed results for this recipe. See [Texas DSHS
inspection procedures](https://www.dshs.texas.gov/sites/default/files/foodestablishments/pdf/Standardization/DSHS_ProceduresManual_Standardization_2023%20FINAL.pdf).

Use appliance thermometers; verify cold-chain records, including staging and
transport. Freezing does not destroy all harmful germs. Prompt shallow-container
cooling and thermometer-based microwave checks are emphasized in [FoodSafety.gov
guidance](https://www.foodsafety.gov/keep-food-safe/4-steps-to-food-safety).
Separate sauce/topping handling and manufacturer-approved food-contact,
freezer and microwave suitability must be verified individually.

Missing safety history or any failed requirement means HOLD: stop tasting,
isolate affected food and follow the verified corrective/disposal procedure.
Do not infer safety from a good aroma, a software report or a 165 F reading
after an unsafe cooling/storage event. Never substitute freezing for safe
cooking/cooling. Do not publish customer reheating times until real portions,
containers, starting conditions, wattages and cold spots have been validated.
No Texas approval, cottage-food eligibility or storage life is asserted here.

## Variant comparison and costing

No winner is selected. Review observed reheated flavor, texture and moisture
alongside raw-material count, prep steps, separate handling, actual labor and
receipt-based cost inputs. Reports keep recipe/storage/day/wattage groups
separate. An enjoyment mean is descriptive only; use per-trial texture and
safety notes, not a pooled mean, to decide what to retest. Different batches,
container depths or portions confound comparisons.

| Variant | Complexity to measure | Packaging | Cost evidence needed |
| --- | --- | --- | --- |
| A | mushroom slicing/browning, broccoli prep, separate roast steps | bowl/lid + sauce cup/lid + dry packet + labels | all component yields, purchased ingredients, prep/cleanup/pack labor |
| B | fine mincing, bean integration, kale cleaning/tenderizing | same three-part model | mushroom/kale yield and labor; no assumed savings |
| C | fewer ingredient/prep operations; smaller hot portion | same three-part model unless separately revised | omitted inputs removed, actual smaller yield/portion, labor and customer-value test |

Existing costing fields already support this without code changes:

- `ingredientsCents`: rice, beans, all vegetables, mushroom/tomato mixture,
  oil, spices, dressing, pepitas and seasoning allocated per sold bowl.
- `packagingAndLabelsCents`: hot bowl **and lid**, sauce cup **and lid**, dry
  topping packet, every label and other per-order packaging allocated per bowl.
- `ingredientWasteBasisPoints`: additional ingredient-only allowance; enter
  zero if measured yields/cost allocations already include that waste.
- `laborCents`: actual cooking, cooling/monitoring, cleaning, packing three
  components and allocated fulfillment work; do not add the same labor again.
- `cookingConsumablesCents`, `fulfillmentCents`, `paymentProcessingCents` and
  `weeklyFixedExpensesCents`: keep variable costs and weekly overhead separate.
- Set `weeklyProfitTargetCents` privately from the owner-defined planning target.

Retain itemized receipt/yield/packaging worksheets locally, sum each category
once, then run the existing calculator per variant. Do not put placeholders
into actual financial inputs. Actual costs, labor, quality scores and physical
temperature results remain unmeasured until the owner performs the trials.

## Release boundary

This work creates a private research system only. Physical recipe, freeze/thaw,
microwave, safety, labeling, regulatory and commercial approval remain pending.
The public Table recipe, checkout, pricing and availability are unchanged.

## Implementation verification (2026-10-21)

- Recipe lab: 17 focused tests PASS; existing costing: 12 tests PASS (29 total).
  All numerical observation fixtures are synthetic and confined to tests.
- Blank-trial creation and comparison exercised locally: unmeasured report
  contains UNTESTED fields, no generated scores or temperatures. Smoke artifacts
  are ignored under `.river-dev/state/food-recipe-001-unmeasured*`.
- Astro-only build PASS; generated storefront retains product/prelaunch text,
  with no checkout integration or recipe-lab exposure.
- Local preview verification PASS: three storefront HTTP 200 checks with shared
  and scoped CSS delivery; verification process stopped its own server.
- Astro check: 1,808 files; 250 errors, zero warnings, 17 hints. Matches supplied
  global error count; no diagnostics naming scoped food/lab files. Exact prior
  diagnostic comparison unavailable; no global typecheck repair attempted.
- Public source/output scan found no private candidate branding. No public
  storefront source changed in this mission; existing work preserved.
- Physical recipe, freeze/thaw, microwave, cooling, taste, packaging and safety
  results: UNTESTED. Software tests confer no commercial approval.
- No commit, push, deployment, checkout activation or production data operations.
