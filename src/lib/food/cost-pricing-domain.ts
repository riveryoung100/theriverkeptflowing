/** FOOD-003D: exact internal formulation-cost planning, never published prices. */
import { validateFoodRecipeDraft, parseFoodRecipeId, validateFoodVersion, type FoodRecipeDraft, type FoodRecipeId } from "./draft-domain";
import { validateFoodGrams } from "./prototype-capture-domain";
import { validateFoodComponentVersion, validateFoodRecipeVersion, type FoodComponentVersion, type FoodRecipeVersion } from "./recipe-component-domain";
import { parseFoodIngredientReference, validateFoodSourceReference, type FoodIngredientReference, type FoodNutritionSource } from "./nutrition-domain";

export interface FoodMoney { readonly currency: string; readonly minorUnits: number }
export interface FoodCostRatio { readonly numerator: string; readonly denominator: string }
export type FoodCostValue = Readonly<{ state: "unknown" }> | Readonly<{ state: "known"; minorUnits: FoodCostRatio }>;
export interface FoodIngredientCostProfile { readonly ingredient: FoodIngredientReference; readonly source: FoodNutritionSource; readonly purchase: FoodMoney; readonly purchasedGrams: number }
export interface FoodComponentCostProfile {
    readonly formulation: FoodComponentVersion; readonly currency: string;
    readonly ingredientCosts: readonly FoodIngredientCostProfile[];
    readonly total: FoodCostValue; readonly per100Grams: FoodCostValue; readonly completeness: "complete" | "incomplete";
}
export interface FoodRecipeCostProfile {
    readonly formulation: FoodRecipeVersion; readonly draft: FoodRecipeDraft; readonly components: readonly FoodComponentVersion[];
    readonly currency: string; readonly ingredientCosts: readonly FoodIngredientCostProfile[]; readonly componentCosts: readonly FoodComponentCostProfile[];
    readonly total: FoodCostValue; readonly per100Grams: FoodCostValue; readonly completeness: "complete" | "incomplete";
}
export interface FoodPortionDefinition { readonly recipe: Readonly<{ id: FoodRecipeId; version: number }>; readonly targetGrams: number }
type Fraction = readonly [bigint, bigint];
function record(v: unknown, keys: readonly string[]): Record<string, unknown> {
    if (!v || typeof v !== "object" || Array.isArray(v) || Reflect.ownKeys(v).some(k => typeof k !== "string" || !keys.includes(k))) throw new TypeError("Invalid record");
    return v as Record<string, unknown>;
}
function list<T>(v: unknown, build: (v: unknown) => T): T[] { if (!Array.isArray(v) || v.length > 128) throw new TypeError("Invalid bounded list"); return Array.from(v, build); }
function freeze<T>(v: T): T { if (v && typeof v === "object") { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }
function currency(v: unknown): string { if (typeof v !== "string" || !/^[A-Z]{3}$/.test(v)) throw new TypeError("Invalid currency"); return v; }
export function validateFoodMoney(v: unknown): FoodMoney {
    const r = record(v, ["currency", "minorUnits"]);
    if (typeof r.minorUnits !== "number" || !Number.isSafeInteger(r.minorUnits) || r.minorUnits < 0) throw new TypeError("Invalid minor units");
    return freeze({ currency: currency(r.currency), minorUnits: r.minorUnits });
}
function rational(n: bigint, d: bigint): Fraction {
    if (d <= 0n) throw new TypeError("Invalid denominator");
    let a = n < 0n ? -n : n; let b = d;
    while (b !== 0n) { const next = a % b; a = b; b = next; }
    const result: Fraction = [n / a, d / a];
    if (result.some(v => v.toString().length > 2048)) throw new TypeError("Cost precision limit exceeded");
    return result;
}
function mass(v: unknown): Fraction {
    const value = validateFoodGrams(v);
    const [mantissa, exponent = "0"] = value.toString().split("e");
    const [whole, decimal = ""] = mantissa.split("."); const scale = decimal.length - Number(exponent);
    const n = BigInt(whole + decimal);
    return scale >= 0 ? rational(n, 10n ** BigInt(scale)) : rational(n * 10n ** BigInt(-scale), 1n);
}
function add(a: Fraction, b: Fraction): Fraction { return rational(a[0] * b[1] + b[0] * a[1], a[1] * b[1]); }
function multiply(a: Fraction, b: Fraction): Fraction { return rational(a[0] * b[0], a[1] * b[1]); }
function divide(a: Fraction, b: Fraction): Fraction { if (b[0] <= 0n) throw new TypeError("Invalid divisor"); return rational(a[0] * b[1], a[1] * b[0]); }
function ratio(v: Fraction): FoodCostRatio { return { numerator: v[0].toString(), denominator: v[1].toString() }; }
function known(v: Fraction): FoodCostValue { return { state: "known", minorUnits: ratio(v) }; }
function fraction(v: FoodCostValue): Fraction { if (v.state !== "known") throw new TypeError("Unknown cost"); return [BigInt(v.minorUnits.numerator), BigInt(v.minorUnits.denominator)]; }
function same(a: unknown, b: unknown): boolean {
    const canonical = (_key: string, value: unknown): unknown => value && typeof value === "object" && !Array.isArray(value)
        ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)) : value;
    return JSON.stringify(a, canonical) === JSON.stringify(b, canonical);
}
function ingredientKey(v: FoodIngredientReference): string { return JSON.stringify([v.kind, v.id, v.version, v.ingredientIndex]); }
export function validateFoodIngredientCostProfile(v: unknown, context: unknown): FoodIngredientCostProfile {
    const r = record(v, ["ingredient", "source", "purchase", "purchasedGrams"]); const ref = parseFoodIngredientReference(r.ingredient);
    if (ref.kind === "recipe") { const draft = validateFoodRecipeDraft(context); if (draft.id !== ref.id || draft.version !== ref.version || !draft.ingredients?.[ref.ingredientIndex]) throw new TypeError("Ingredient mismatch"); }
    else { const c = validateFoodComponentVersion(context); if (c.id !== ref.id || c.version !== ref.version || !c.composition[ref.ingredientIndex]) throw new TypeError("Ingredient mismatch"); }
    return freeze({ ingredient: ref, source: validateFoodSourceReference(r.source), purchase: validateFoodMoney(r.purchase), purchasedGrams: validateFoodGrams(r.purchasedGrams) });
}
export function deriveFoodIngredientCostPerGram(v: unknown, context: unknown) {
    const profile = validateFoodIngredientCostProfile(v, context);
    return freeze({ profile, currency: profile.purchase.currency, minorUnits: ratio(divide([BigInt(profile.purchase.minorUnits), 1n], mass(profile.purchasedGrams))) });
}
function profiles(v: unknown, context: unknown, expectedCurrency: string): FoodIngredientCostProfile[] {
    const seen = new Set<string>();
    return list(v, item => { const p = validateFoodIngredientCostProfile(item, context); const key = ingredientKey(p.ingredient); if (seen.has(key) || p.purchase.currency !== expectedCurrency) throw new TypeError("Duplicate profile or incompatible currency"); seen.add(key); return p; });
}
function summary(total: Fraction | undefined, yieldGrams: number) {
    return { total: total === undefined ? { state: "unknown" as const } : known(total), per100Grams: total === undefined ? { state: "unknown" as const } : known(multiply(divide(total, mass(yieldGrams)), [100n, 1n])), completeness: total === undefined ? "incomplete" as const : "complete" as const };
}
function contribution(p: FoodIngredientCostProfile, grams: number): Fraction { return multiply(divide([BigInt(p.purchase.minorUnits), 1n], mass(p.purchasedGrams)), mass(grams)); }
export function deriveFoodComponentCost(componentInput: unknown, ingredientInputs: unknown, currencyInput: unknown): FoodComponentCostProfile {
    const formulation = validateFoodComponentVersion(componentInput); const code = currency(currencyInput); const ingredientCosts = profiles(ingredientInputs, formulation, code);
    let total: Fraction = [0n, 1n]; let complete = true;
    formulation.composition.forEach((line, index) => { const p = ingredientCosts.find(p => p.ingredient.ingredientIndex === index); if (!p) complete = false; else total = add(total, contribution(p, line.grams)); });
    return freeze({ formulation, currency: code, ingredientCosts, ...summary(complete ? total : undefined, formulation.yieldGrams) });
}
function componentCost(v: unknown): FoodComponentCostProfile {
    const r = record(v, ["formulation", "currency", "ingredientCosts", "total", "per100Grams", "completeness"]);
    const result = deriveFoodComponentCost(r.formulation, r.ingredientCosts, r.currency);
    if (!same(result, r)) throw new TypeError("Component cost summary mismatch"); return result;
}
export function deriveFoodRecipeCost(recipeInput: unknown, draftInput: unknown, componentInputs: unknown, ingredientInputs: unknown, componentCostInputs: unknown, currencyInput: unknown): FoodRecipeCostProfile {
    const formulation = validateFoodRecipeVersion(recipeInput, draftInput, componentInputs); const draft = validateFoodRecipeDraft(draftInput);
    const components = list(componentInputs, validateFoodComponentVersion); const code = currency(currencyInput);
    const ingredientCosts = profiles(ingredientInputs, draft, code); const seen = new Set<string>();
    const componentCosts = list(componentCostInputs, v => { const p = componentCost(v); if (p.currency !== code || seen.has(p.formulation.id)) throw new TypeError("Duplicate component cost or incompatible currency"); seen.add(p.formulation.id); return p; });
    let total: Fraction = [0n, 1n]; let complete = true; const usedIngredients = new Set<number>(); const usedComponents = new Set<string>();
    for (const line of formulation.composition) {
        if (line.kind === "ingredient") {
            usedIngredients.add(line.ingredientIndex); const p = ingredientCosts.find(p => p.ingredient.ingredientIndex === line.ingredientIndex);
            if (!p) complete = false; else total = add(total, contribution(p, line.grams));
        } else {
            usedComponents.add(line.component.id); const p = componentCosts.find(p => p.formulation.id === line.component.id);
            if (!p) { complete = false; continue; }
            const exact = components.find(c => c.id === line.component.id && c.version === line.component.version);
            if (p.formulation.version !== line.component.version || !same(p.formulation, exact)) throw new TypeError("Exact component cost mismatch");
            if (p.total.state === "unknown") complete = false; else total = add(total, multiply(divide(fraction(p.total), mass(p.formulation.yieldGrams)), mass(line.grams)));
        }
    }
    if (ingredientCosts.some(p => !usedIngredients.has(p.ingredient.ingredientIndex)) || componentCosts.some(p => !usedComponents.has(p.formulation.id))) throw new TypeError("Unused cost profile");
    return freeze({ formulation, draft, components, currency: code, ingredientCosts, componentCosts, ...summary(complete ? total : undefined, formulation.yieldGrams) });
}
function recipeCost(v: unknown): FoodRecipeCostProfile {
    const r = record(v, ["formulation", "draft", "components", "currency", "ingredientCosts", "componentCosts", "total", "per100Grams", "completeness"]);
    const result = deriveFoodRecipeCost(r.formulation, r.draft, r.components, r.ingredientCosts, r.componentCosts, r.currency);
    if (!same(result, r)) throw new TypeError("Recipe cost summary mismatch"); return result;
}
export function validateFoodPortionDefinition(v: unknown, recipeInput: unknown, draftInput: unknown, componentInputs: unknown = []): FoodPortionDefinition {
    const r = record(v, ["recipe", "targetGrams"]); const ref = record(r.recipe, ["id", "version"]);
    const recipe = validateFoodRecipeVersion(recipeInput, draftInput, componentInputs);
    if (parseFoodRecipeId(ref.id) !== recipe.id || validateFoodVersion(ref.version) !== recipe.version) throw new TypeError("Portion recipe mismatch");
    return freeze({ recipe: { id: recipe.id, version: recipe.version }, targetGrams: validateFoodGrams(r.targetGrams) });
}
export function projectFoodYieldToPortions(portionInput: unknown, recipeInput: unknown, draftInput: unknown, componentInputs: unknown = []) {
    const portion = validateFoodPortionDefinition(portionInput, recipeInput, draftInput, componentInputs);
    const recipe = validateFoodRecipeVersion(recipeInput, draftInput, componentInputs); const yieldMass = mass(recipe.yieldGrams); const target = mass(portion.targetGrams);
    const count = divide(yieldMass, target); const full = count[0] / count[1];
    if (full > BigInt(Number.MAX_SAFE_INTEGER)) throw new TypeError("Portion count exceeds safe integer");
    const remainder = add(yieldMass, multiply([-full, 1n], target));
    return freeze({ portion, yieldGrams: recipe.yieldGrams, fullPortionCount: Number(full), fractionalPortionCount: ratio(count), remainderGrams: ratio(remainder) });
}
export function projectFoodTargetPortionCost(portionInput: unknown, costInput: unknown) {
    const cost = recipeCost(costInput); const portion = validateFoodPortionDefinition(portionInput, cost.formulation, cost.draft, cost.components);
    const value: FoodCostValue = cost.total.state === "unknown" ? { state: "unknown" } : known(multiply(divide(fraction(cost.total), mass(cost.formulation.yieldGrams)), mass(portion.targetGrams)));
    return freeze({ portion, costProfile: cost, currency: cost.currency, cost: value, completeness: cost.completeness });
}
export function createFoodPricingScenario(portionInput: unknown, costInput: unknown, priceInput: unknown) {
    const projection = projectFoodTargetPortionCost(portionInput, costInput); const candidatePrice = validateFoodMoney(priceInput);
    if (candidatePrice.currency !== projection.currency) throw new TypeError("Price currency mismatch");
    const price: Fraction = [BigInt(candidatePrice.minorUnits), 1n];
    const grossProfitBeforeOmittedCosts: FoodCostValue = projection.cost.state === "unknown" ? { state: "unknown" } : known(add(price, multiply(fraction(projection.cost), [-1n, 1n])));
    const reason = candidatePrice.minorUnits === 0 ? "zero-price" : projection.cost.state === "unknown" ? "cost-incomplete" : undefined;
    const percentages = reason ? { foodCost: { state: "unavailable" as const, reason }, grossMarginBeforeOmittedCosts: { state: "unavailable" as const, reason } } : {
        foodCost: { state: "known" as const, percentage: ratio(multiply(divide(fraction(projection.cost), price), [100n, 1n])) },
        grossMarginBeforeOmittedCosts: { state: "known" as const, percentage: ratio(multiply(divide(fraction(grossProfitBeforeOmittedCosts), price), [100n, 1n])) }
    };
    return freeze({ planningOnly: true as const, costBasis: "ingredient-formulation-cost-only" as const, projection, candidatePrice, grossProfitBeforeOmittedCosts, percentages });
}
