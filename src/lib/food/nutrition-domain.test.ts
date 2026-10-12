import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { FOOD_CORE_NUTRIENTS, validateFoodIngredientNutritionProfile, deriveFoodComponentNutrition, deriveFoodRecipeNutrition } from "./nutrition-domain";
import { validateFoodComponentVersion, validateFoodRecipeVersion } from "./recipe-component-domain";
import { validateFoodRecipeDraft, assessFoodDraftEvidenceCompleteness } from "./draft-domain";
import { validateFoodPrototypeCapture } from "./prototype-capture-domain";

// Invented synthetic nutrition only; no production recipe or real dataset.
const known = (value: number) => ({ state: "known", value });
const values = () => ({ energyKcal: known(200), proteinGrams: known(10), carbohydrateGrams: known(20), fatGrams: known(5) });
const component = (version = 1) => ({ id: "food-component:test", version, name: "Synthetic test material", composition: [{ kind: "ingredient", ingredient: { kind: "simple", name: "Synthetic flour" }, grams: 200 }, { kind: "ingredient", ingredient: { kind: "simple", name: "Synthetic water" }, grams: 100 }], method: ["Synthetic process"], yieldGrams: 250 });
const draft = (version = 1) => ({ id: "food-recipe:test", version, ingredients: [{ kind: "simple", name: "Synthetic milk" }], evidence: [] });
const recipe = () => ({ id: draft().id, version: 1, composition: [{ kind: "ingredient", ingredientIndex: 0, grams: 50 }, { kind: "component", component: { id: component().id, version: 1 }, grams: 125 }], method: ["Synthetic finish"], yieldGrams: 100 });
const review = (state = "reviewed", declarations: unknown[] = []) => ({ review: { state, declarations }, evidence: { source: { sourceReference: "fixture:synthetic-allergen", version: 1 }, reviewDate: "2026-10-12", reviewer: "fixture:reviewer" } });
const profile = (kind = "component", ingredientIndex = 0, version = 1) => ({ ingredient: { kind, id: kind === "component" ? component().id : draft().id, version, ingredientIndex }, basisGrams: 100, source: { sourceReference: "fixture:synthetic-nutrients", version: 1 }, nutrients: values(), allergens: review() });
const componentProfiles = () => [profile(), { ...profile("component", 1), nutrients: { energyKcal: known(0), proteinGrams: known(0), carbohydrateGrams: known(0), fatGrams: known(0) } }];
const derived = () => deriveFoodComponentNutrition(component(), componentProfiles());
const buildRecipe = (ps: unknown = [profile("recipe")], cs: unknown = [derived()], r: unknown = recipe(), comps: unknown = [component()]) => deriveFoodRecipeNutrition(r, draft(), comps, ps, cs);

test("ingredient profile fixes basis and exact references, with mechanically derived completeness", () => {
    const p = validateFoodIngredientNutritionProfile(profile(), component());
    assert.equal(p.basisGrams, 100); assert.deepEqual(p.ingredient, profile().ingredient); assert.deepEqual(p.source, profile().source);
    assert.equal(p.completeness, "complete");
    const zero = validateFoodIngredientNutritionProfile({ ...profile(), nutrients: { ...values(), proteinGrams: known(0) } }, component());
    const unknown = validateFoodIngredientNutritionProfile({ ...profile(), nutrients: { ...values(), proteinGrams: { state: "unknown" } } }, component());
    assert.deepEqual(zero.nutrients.proteinGrams, known(0)); assert.equal(unknown.completeness, "incomplete");
    for (const basisGrams of [undefined, 0, 1, "100"]) assert.throws(() => validateFoodIngredientNutritionProfile({ ...profile(), basisGrams }, component()));
});
test("nutrients and source references reject coercion, missing data, unsafe states and invented nutrients", () => {
    for (const value of [-1, NaN, Infinity, -Infinity, null, "1", undefined]) assert.throws(() => validateFoodIngredientNutritionProfile({ ...profile(), nutrients: { ...values(), energyKcal: { state: "known", value } } }, component()));
    for (const energyKcal of [null, undefined, { state: "unknown", value: 0 }, { state: "guess", value: 1 }]) assert.throws(() => validateFoodIngredientNutritionProfile({ ...profile(), nutrients: { ...values(), energyKcal } }, component()));
    assert.throws(() => validateFoodIngredientNutritionProfile({ ...profile(), nutrients: { ...values(), sodium: known(1) } }, component()));
    for (const source of [{ sourceReference: "", version: 1 }, { sourceReference: "fixture", version: "latest" }, { sourceReference: "fixture", version: 0 }]) assert.throws(() => validateFoodIngredientNutritionProfile({ ...profile(), source }, component()));
    assert.throws(() => validateFoodIngredientNutritionProfile({ ...profile(), completeness: "incomplete" }, component()));
});
test("component contributions and yield normalization preserve explicit energy evidence", () => {
    const result = derived();
    assert.deepEqual(result.total, { energyKcal: known(400), proteinGrams: known(20), carbohydrateGrams: known(40), fatGrams: known(10) });
    assert.deepEqual(result.nutrients, { energyKcal: known(160), proteinGrams: known(8), carbohydrateGrams: known(16), fatGrams: known(4) });
    assert.equal(result.completeness, "complete"); assert.equal(result.inputs[0].source?.version, 1);
});
test("unknown contributions propagate per nutrient without partial totals", () => {
    const ps = componentProfiles(); const partial = { ...ps[1], nutrients: { ...ps[1].nutrients, proteinGrams: { state: "unknown" } } };
    const c = deriveFoodComponentNutrition(component(), [ps[0], partial]);
    assert.equal(c.completeness, "incomplete"); assert.deepEqual(c.total.proteinGrams, { state: "unknown" }); assert.deepEqual(c.nutrients.energyKcal, known(160));
    const r = buildRecipe([profile("recipe")], [c]); assert.deepEqual(r.nutrients.proteinGrams, { state: "unknown" }); assert.equal(r.completeness, "incomplete");
    const directUnknown = { ...profile("recipe"), nutrients: { ...values(), energyKcal: { state: "unknown" } } };
    assert.deepEqual(buildRecipe([directUnknown]).total.energyKcal, { state: "unknown" });
});
test("missing, wrong and duplicate ingredient profiles fail exact local integrity", () => {
    for (const ps of [[], [profile()], [profile(), profile()], [profile("recipe"), profile("component", 1)], [profile("component", 0, 2), profile("component", 1)]]) assert.throws(() => deriveFoodComponentNutrition(component(), ps));
    for (const ingredient of [{ ...profile().ingredient, ingredientIndex: -1 }, { ...profile().ingredient, ingredientIndex: 2 }, { ...profile().ingredient, id: "food-component:wrong" }]) assert.throws(() => validateFoodIngredientNutritionProfile({ ...profile(), ingredient }, component()));
});
test("allergen declarations aggregate first-seen facts without name/nutrition inference", () => {
    const ps = componentProfiles();
    const c = deriveFoodComponentNutrition(component(), ps.map(p => ({ ...p, allergens: review("reviewed", [{ allergen: "milk" }, { allergen: "wheat" }]) })));
    assert.deepEqual(c.allergens.declarations, [{ allergen: "milk" }, { allergen: "wheat" }]); assert.equal(c.allergens.complete, true);
    const r = buildRecipe([{ ...profile("recipe"), allergens: review("reviewed", [{ allergen: "soybeans" }]) }], [c]);
    assert.deepEqual(r.allergens.declarations, [{ allergen: "soybeans" }, { allergen: "milk" }, { allergen: "wheat" }]);
    assert.deepEqual(buildRecipe().allergens.declarations, []); // Synthetic milk name creates no declaration.
    assert.equal("allergenFree" in r.allergens, false);
});
test("unreviewed or undisclosed input cannot become a fully reviewed aggregate", () => {
    for (const state of ["unknown", "pending"]) {
        const ps = componentProfiles(); const c = deriveFoodComponentNutrition(component(), [{ ...ps[0], allergens: review(state, [{ allergen: "wheat" }]) }, ps[1]]);
        assert.equal(c.allergens.complete, false); assert.equal(c.allergens.inputs[0].review.state, state); assert.equal(buildRecipe(undefined, [c]).allergens.complete, false);
    }
    const c = { ...component(), composition: [{ kind: "ingredient", ingredient: { kind: "purchased-component", name: "Undisclosed synthetic material", composition: "undisclosed" }, grams: 100 }] };
    assert.equal(deriveFoodComponentNutrition(c, [profile()]).allergens.complete, false);
    assert.throws(() => validateFoodIngredientNutritionProfile({ ...profile(), allergens: { review: { state: "reviewed", declarations: [] } } }, component()));
    for (const declarations of [[{ allergen: "almond" }], [{ allergen: "milk" }, { allergen: "milk" }], [{ allergen: "milk", detail: "cow" }]]) assert.throws(() => validateFoodIngredientNutritionProfile({ ...profile(), allergens: review("reviewed", declarations) }, component()));
});
test("allergen details retain distinct explicit species without collapsing facts", () => {
    const ps = componentProfiles(); const c = deriveFoodComponentNutrition(component(), ps.map((p, i) => ({ ...p, allergens: review("reviewed", [{ allergen: "fish", detail: i === 0 ? "test-cod" : "test-salmon" }]) })));
    assert.deepEqual(c.allergens.declarations, [{ allergen: "fish", detail: "test-cod" }, { allergen: "fish", detail: "test-salmon" }]);
});
test("recipe direct plus exact component contributions use recipe yield", () => {
    const r = buildRecipe(); assert.deepEqual(r.total.energyKcal, known(300)); assert.deepEqual(r.nutrients.energyKcal, known(300));
    assert.equal(r.inputs[1].reference.kind, "component-profile"); assert.equal(r.inputs[1].componentInputs?.[0].source?.version, 1);
    const direct = { ...recipe(), composition: [recipe().composition[0]], yieldGrams: 25 };
    assert.deepEqual(buildRecipe([profile("recipe")], [], direct, []).nutrients.energyKcal, known(400));
    assert.throws(() => buildRecipe([], [derived()])); assert.throws(() => buildRecipe([profile("recipe"), profile("recipe")], [derived()]));
    assert.throws(() => buildRecipe(undefined, [derived(), derived()]));
});
test("new ingredient sources and component versions never rebind old derived snapshots", () => {
    const old = derived(); const oldRecipe = buildRecipe(); const before = structuredClone({ old, oldRecipe });
    const newer = componentProfiles().map(p => ({ ...p, source: { ...p.source, version: 2 }, nutrients: { ...p.nutrients, energyKcal: known(500) } }));
    const revised = deriveFoodComponentNutrition(component(), newer); assert.notDeepEqual(revised.nutrients, old.nutrients);
    const next = deriveFoodComponentNutrition(component(2), componentProfiles().map(p => ({ ...p, ingredient: { ...p.ingredient, version: 2 } })));
    assert.throws(() => buildRecipe(undefined, [next])); assert.deepEqual({ old, oldRecipe }, before);
    assert.equal(old.inputs[0].source?.version, 1); assert.equal(next.formulation.version, 2);
});
test("component projections reject forged summaries, wrong formulations and numeric overflow", () => {
    const c = derived(); assert.throws(() => buildRecipe(undefined, [{ ...c, nutrients: values() }]));
    assert.throws(() => buildRecipe(undefined, [{ ...c, allergens: { ...c.allergens, complete: false } }]));
    assert.throws(() => buildRecipe(undefined, [c], recipe(), [{ ...component(), yieldGrams: 200 }]));
    assert.throws(() => deriveFoodComponentNutrition(component(), componentProfiles().map(p => ({ ...p, nutrients: { ...p.nutrients, energyKcal: known(Number.MAX_VALUE) } }))));
    assert.throws(() => deriveFoodComponentNutrition({ ...component(), yieldGrams: Number.MIN_VALUE }, componentProfiles()));
});
test("caller objects and returned nested collections cannot mutate profiles", () => {
    const p = profile(); const value = validateFoodIngredientNutritionProfile(p, component()); const before = structuredClone(value);
    p.nutrients.energyKcal.value = 999; p.source.version = 9; p.allergens.evidence.source.version = 9;
    p.allergens.review.declarations.push({ allergen: "milk" });
    assert.deepEqual(value, before);
    const ps = componentProfiles(); const c = deriveFoodComponentNutrition(component(), ps); const old = structuredClone(c);
    ps[0].source.version = 8; ps[0].nutrients.energyKcal.value = 900; ps.push(profile()); assert.deepEqual(c, old);
    function frozen(v: unknown): void { if (v && typeof v === "object") { assert(Object.isFrozen(v)); Object.values(v).forEach(frozen); } }
    frozen(value); frozen(c); frozen(buildRecipe());
    assert.throws(() => (c.inputs as unknown[]).push({})); assert.throws(() => { (value.source as { version: number }).version = 99; });
    assert.throws(() => (value.allergens.review.declarations as unknown[]).push({ allergen: "milk" }));
});
test("FOOD-001A/003A/003B retain evidence and experiment semantics", () => {
    const d = draft(); const f = recipe(); const c = component(); const before = structuredClone({ d, f, c });
    const product = { id: "food-product:test", version: 1, recipe: { id: d.id, version: d.version }, evidence: [] };
    const completeness = assessFoodDraftEvidenceCompleteness(product, d); buildRecipe();
    assert.deepEqual({ d, f, c }, before); assert.deepEqual(validateFoodRecipeDraft(d), d); assert.deepEqual(validateFoodComponentVersion(c), c);
    assert.deepEqual(validateFoodRecipeVersion(f, d, [c]), f); assert.deepEqual(assessFoodDraftEvidenceCompleteness(product, d), completeness);
    const capture = validateFoodPrototypeCapture({ id: "food-prototype-capture:test", inputs: [{ key: "test", ingredientName: "Synthetic ingredient", grams: 1 }], method: ["Synthetic test"], adjustments: [], finishedYieldGrams: 1, observations: [], provenance: { kind: "founder-measured", sourceReference: "fixture:synthetic" } });
    assert.throws(() => validateFoodIngredientNutritionProfile(capture, c)); assert.equal("nutrition" in capture, false);
});
test("pure local source has no fetch, clock, environment or real dataset", async () => {
    const source = await readFile(new URL("./nutrition-domain.ts", import.meta.url), "utf8");
    assert.doesNotMatch(source, /\b(?:fetch|Date|randomUUID|require)\s*\(|process\.env|Math\.random|import\s*\(/);
    assert.match(profile().source.sourceReference, /fixture:synthetic/); assert.equal(FOOD_CORE_NUTRIENTS.length, 4);
});
