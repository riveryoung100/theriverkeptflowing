import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { validateFoodMoney, validateFoodIngredientCostProfile, deriveFoodIngredientCostPerGram, deriveFoodComponentCost, deriveFoodRecipeCost, validateFoodPortionDefinition, projectFoodYieldToPortions, projectFoodTargetPortionCost, createFoodPricingScenario } from "./cost-pricing-domain";
import { validateFoodRecipeVersion, validateFoodComponentVersion } from "./recipe-component-domain";
import { deriveFoodComponentNutrition } from "./nutrition-domain";
import { validateFoodPrototypeCapture } from "./prototype-capture-domain";
// All quantities, prices and portions below are invented synthetic fixtures.
const component = (version = 1) => ({ id: "food-component:synthetic-cost", version, name: "Test component", composition: [{ kind: "ingredient", ingredient: { kind: "simple", name: "Synthetic flour" }, grams: 100 }], method: ["Synthetic process"], yieldGrams: 80 });
const draft = (version = 1) => ({ id: "food-recipe:synthetic-cost", version, ingredients: [{ kind: "simple", name: "Synthetic direct input" }], evidence: [] });
const recipe = (version = 1) => ({ id: draft().id, version, composition: [{ kind: "ingredient", ingredientIndex: 0, grams: 50 }, { kind: "component", component: { id: component().id, version: 1 }, grams: 40 }], method: ["Synthetic finish"], yieldGrams: 75 });
const money = (minorUnits = 100, currency = "USD") => ({ currency, minorUnits });
const profile = (kind = "component", version = 1) => ({ ingredient: { kind, id: kind === "component" ? component().id : draft().id, version, ingredientIndex: 0 }, source: { sourceReference: "fixture:synthetic-cost-evidence", version: 1 }, purchase: money(), purchasedGrams: 300 });
const componentCost = () => deriveFoodComponentCost(component(), [profile()], "USD");
const recipeCost = (ingredients: unknown = [profile("recipe")], components: unknown = [componentCost()]) => deriveFoodRecipeCost(recipe(), draft(), [component()], ingredients, components, "USD");
const portion = () => ({ recipe: { id: draft().id, version: 1 }, targetGrams: 30 });
const ratio = (numerator: string, denominator = "1") => ({ numerator, denominator });

test("source money is exact minor units with explicit compatible currency", () => {
    assert.deepEqual(validateFoodMoney(money(0)), money(0)); assert.deepEqual(validateFoodMoney(money(Number.MAX_SAFE_INTEGER)), money(Number.MAX_SAFE_INTEGER));
    for (const currency of ["usd", "US", "USDD", " USD", "123", undefined]) assert.throws(() => validateFoodMoney({ ...money(), currency }));
    for (const minorUnits of [-1, 1.5, NaN, Infinity, "100", Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => validateFoodMoney({ ...money(), minorUnits }));
});
test("acquisition profile preserves exact ingredient and source with rational cost per gram", () => {
    const p = validateFoodIngredientCostProfile(profile(), component()); assert.deepEqual(p, profile());
    assert.deepEqual(deriveFoodIngredientCostPerGram(p, component()).minorUnits, ratio("1", "3"));
    for (const purchasedGrams of [0, -1, Infinity, NaN, "100"]) assert.throws(() => validateFoodIngredientCostProfile({ ...profile(), purchasedGrams }, component()));
    assert.throws(() => validateFoodIngredientCostProfile({ ...profile(), source: { sourceReference: "", version: 1 } }, component()));
});
test("component cost retains fractions exactly and normalizes using canonical yield", () => {
    const c = componentCost(); assert.equal(c.completeness, "complete");
    assert.deepEqual(c.total, { state: "known", minorUnits: ratio("100", "3") });
    assert.deepEqual(c.per100Grams, { state: "known", minorUnits: ratio("125", "3") });
    const missing = deriveFoodComponentCost(component(), [], "USD"); assert.equal(missing.completeness, "incomplete"); assert.deepEqual(missing.total, { state: "unknown" });
    const zero = deriveFoodComponentCost(component(), [{ ...profile(), purchase: money(0) }], "USD"); assert.deepEqual(zero.total, { state: "known", minorUnits: ratio("0") });
});
test("wrong, duplicate and mixed-currency ingredient profiles reject", () => {
    for (const ps of [[profile(), profile()], [profile("recipe")], [profile("component", 2)], [{ ...profile(), purchase: money(1, "EUR") }]]) assert.throws(() => deriveFoodComponentCost(component(), ps, "USD"));
    assert.throws(() => deriveFoodComponentCost(component(), [{ ...profile(), ingredient: { ...profile().ingredient, ingredientIndex: 1 } }], "USD"));
});
test("recipe uses exact direct/component cost with no latest substitution", () => {
    const r = recipeCost(); assert.deepEqual(r.total, { state: "known", minorUnits: ratio("100", "3") }); assert.deepEqual(r.per100Grams, { state: "known", minorUnits: ratio("400", "9") });
    const next = deriveFoodComponentCost(component(2), [profile("component", 2)], "USD"); assert.throws(() => recipeCost(undefined, [next]));
    assert.throws(() => recipeCost(undefined, [componentCost(), componentCost()]));
    const euro = deriveFoodComponentCost(component(), [{ ...profile(), purchase: money(1, "EUR") }], "EUR"); assert.throws(() => recipeCost(undefined, [euro]));
    assert.equal(recipeCost([], []).completeness, "incomplete");
    assert.equal(recipeCost(undefined, [deriveFoodComponentCost(component(), [], "USD")]).completeness, "incomplete");
    const direct = { ...recipe(), composition: [recipe().composition[0]] }; assert.deepEqual(deriveFoodRecipeCost(direct, draft(), [], [profile("recipe")], [], "USD").total, { state: "known", minorUnits: ratio("50", "3") });
});
test("portion definitions bind exact recipes and project theoretical yield without SKU authority", () => {
    assert.deepEqual(validateFoodPortionDefinition(portion(), recipe(), draft(), [component()]), portion());
    for (const targetGrams of [0, -1, Infinity, NaN]) assert.throws(() => validateFoodPortionDefinition({ ...portion(), targetGrams }, recipe(), draft(), [component()]));
    assert.throws(() => validateFoodPortionDefinition({ ...portion(), recipe: { id: draft().id, version: 2 } }, recipe(), draft(), [component()]));
    const result = projectFoodYieldToPortions(portion(), recipe(), draft(), [component()]); assert.equal(result.fullPortionCount, 2); assert.deepEqual(result.remainderGrams, ratio("15")); assert.deepEqual(result.fractionalPortionCount, ratio("5", "2"));
    assert.throws(() => validateFoodPortionDefinition({ ...portion(), sku: "test" }, recipe(), draft(), [component()]));
    const fractionYield = { ...recipe(), yieldGrams: 0.3 }; const fractionPortion = { ...portion(), targetGrams: 0.1 };
    const precise = projectFoodYieldToPortions(fractionPortion, fractionYield, draft(), [component()]); assert.equal(precise.fullPortionCount, 3); assert.deepEqual(precise.remainderGrams, ratio("0"));
    assert.throws(() => projectFoodYieldToPortions({ ...portion(), targetGrams: Number.MIN_VALUE }, recipe(), draft(), [component()]));
});
test("portion cost and pricing keep food-only basis, exact margins and negative profit", () => {
    const p = projectFoodTargetPortionCost(portion(), recipeCost()); assert.deepEqual(p.cost, { state: "known", minorUnits: ratio("40", "3") });
    const s = createFoodPricingScenario(portion(), recipeCost(), money(40));
    assert.equal(s.planningOnly, true); assert.equal(s.costBasis, "ingredient-formulation-cost-only"); assert.deepEqual(s.projection.portion, portion());
    assert.deepEqual(s.grossProfitBeforeOmittedCosts, { state: "known", minorUnits: ratio("80", "3") });
    assert.deepEqual(s.percentages.foodCost, { state: "known", percentage: ratio("100", "3") });
    assert.deepEqual(s.percentages.grossMarginBeforeOmittedCosts, { state: "known", percentage: ratio("200", "3") });
    assert.deepEqual(createFoodPricingScenario(portion(), recipeCost(), money(1)).grossProfitBeforeOmittedCosts, { state: "known", minorUnits: ratio("-37", "3") });
    assert.equal(createFoodPricingScenario(portion(), recipeCost(), money(0)).percentages.foodCost.state, "unavailable");
    assert.deepEqual(projectFoodTargetPortionCost(portion(), recipeCost([], [])).cost, { state: "unknown" });
    assert.equal(createFoodPricingScenario(portion(), recipeCost([], []), money(10)).percentages.foodCost.state, "unavailable");
    assert.throws(() => createFoodPricingScenario(portion(), recipeCost(), money(10, "EUR")));
    assert.equal("publishedPrice" in s, false); assert.equal("orderable" in s, false);
});
test("later cost sources, recipes and components cannot mutate prior snapshots", () => {
    const old = createFoodPricingScenario(portion(), recipeCost(), money(40)); const before = structuredClone(old);
    const newer = { ...profile(), source: { ...profile().source, version: 2 }, purchase: money(900) };
    deriveFoodComponentCost(component(), [newer], "USD"); deriveFoodComponentCost(component(2), [profile("component", 2)], "USD");
    validateFoodRecipeVersion(recipe(2), draft(2), [component()]); assert.deepEqual(old, before); assert.equal(old.projection.costProfile.componentCosts[0].ingredientCosts[0].source.version, 1);
});
test("caller data and returned collections detach and freeze; summaries cannot be forged", () => {
    const ps = [profile()]; const c = deriveFoodComponentCost(component(), ps, "USD"); const before = structuredClone(c); ps[0].purchase.minorUnits = 900; ps[0].source.version = 2; ps.push(profile()); assert.deepEqual(c, before);
    const p = portion(); const price = money(40); const s = createFoodPricingScenario(p, recipeCost(), price); p.targetGrams = 999; price.minorUnits = 999; assert.equal(s.projection.portion.targetGrams, 30); assert.equal(s.candidatePrice.minorUnits, 40);
    function frozen(v: unknown): void { if (v && typeof v === "object") { assert(Object.isFrozen(v)); Object.values(v).forEach(frozen); } } frozen(c); frozen(s);
    assert.throws(() => (c.ingredientCosts as unknown[]).push({})); assert.throws(() => { (s.projection.portion as { targetGrams: number }).targetGrams = 99; });
    assert.throws(() => recipeCost(undefined, [{ ...componentCost(), completeness: "incomplete" }]));
    const original = componentCost();
    const reordered = Object.fromEntries(Object.entries(original).reverse());
    assert.deepEqual(recipeCost(undefined, [reordered]), recipeCost());
});
test("existing formulation, nutrition, serving and capture boundaries stay unchanged", async () => {
    const c = component(); assert.deepEqual(validateFoodComponentVersion(c), c); assert.deepEqual(validateFoodRecipeVersion(recipe(), draft(), [c]), recipe());
    const nutritionProfile = { ingredient: profile().ingredient, basisGrams: 100, source: profile().source, nutrients: { energyKcal: { state: "known", value: 1 }, proteinGrams: { state: "unknown" }, carbohydrateGrams: { state: "unknown" }, fatGrams: { state: "unknown" } }, allergens: { review: { state: "unknown", declarations: [] } } };
    const nutrition = deriveFoodComponentNutrition(c, [nutritionProfile]); const before = structuredClone(nutrition); componentCost(); assert.deepEqual(nutrition, before);
    const capture = validateFoodPrototypeCapture({ id: "food-prototype-capture:test-cost", inputs: [{ key: "test", ingredientName: "Synthetic test", grams: 1 }], method: ["Synthetic run"], adjustments: [], finishedYieldGrams: 1, observations: [], provenance: { kind: "founder-measured", sourceReference: "fixture:synthetic" } });
    assert.throws(() => deriveFoodComponentCost(capture, [profile()], "USD")); assert.equal(componentCost().formulation.yieldGrams, 80);
    const source = await readFile(new URL("./cost-pricing-domain.ts", import.meta.url), "utf8"); assert.doesNotMatch(source, /\b(?:fetch|Date|randomUUID|require)\s*\(|process\.env|Math\.random|import\s*\(/);
});
