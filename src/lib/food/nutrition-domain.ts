/** FOOD-003C: supplied evidence and pure nutrition projections; no sale authority. */
import { parseFoodRecipeId, validateFoodVersion, validateFoodReviewDate, validateFoodRecipeDraft, validateFoodAllergenDeclarations, type FoodIngredient, type FoodAllergenReview, type FoodRecipeId } from "./draft-domain";
import { parseFoodComponentId, validateFoodComponentVersion, validateFoodRecipeVersion, type FoodComponentId, type FoodComponentVersion, type FoodRecipeVersion } from "./recipe-component-domain";

export const FOOD_CORE_NUTRIENTS = Object.freeze(["energyKcal", "proteinGrams", "carbohydrateGrams", "fatGrams"] as const);
export type FoodNutrientValue = Readonly<{ state: "unknown" }> | Readonly<{ state: "known"; value: number }>;
export type FoodCoreNutrients = Readonly<Record<typeof FOOD_CORE_NUTRIENTS[number], FoodNutrientValue>>;
export type FoodIngredientReference = Readonly<({ kind: "recipe"; id: FoodRecipeId } | { kind: "component"; id: FoodComponentId }) & { version: number; ingredientIndex: number }>;
export interface FoodNutritionSource { readonly sourceReference: string; readonly version: number }
export interface FoodIngredientAllergens {
    readonly review: FoodAllergenReview;
    readonly evidence?: Readonly<{ source: FoodNutritionSource; reviewDate: string; reviewer: string }>;
    readonly disclosureComplete: boolean;
}
export interface FoodIngredientNutritionProfile {
    readonly ingredient: FoodIngredientReference; readonly basisGrams: 100; readonly source: FoodNutritionSource;
    readonly nutrients: FoodCoreNutrients; readonly completeness: "complete" | "incomplete";
    readonly allergens: FoodIngredientAllergens;
}
export interface FoodNutritionInput {
    readonly reference: FoodIngredientReference | Readonly<{ kind: "component-profile"; id: FoodComponentId; version: number }>;
    readonly source?: FoodNutritionSource;
    readonly nutrients: FoodCoreNutrients;
    readonly allergens: FoodIngredientAllergens | FoodAggregateAllergens;
    readonly componentInputs?: readonly FoodNutritionInput[];
}
export interface FoodAggregateAllergens {
    readonly complete: boolean;
    readonly declarations: FoodAllergenReview["declarations"];
    readonly inputs: readonly FoodIngredientAllergens[];
}
export interface FoodDerivedNutritionProfile<F> {
    readonly formulation: F; readonly basisGrams: 100;
    readonly total: FoodCoreNutrients; readonly nutrients: FoodCoreNutrients;
    readonly completeness: "complete" | "incomplete";
    readonly inputs: readonly FoodNutritionInput[]; readonly allergens: FoodAggregateAllergens;
}
export type FoodComponentNutritionProfile = FoodDerivedNutritionProfile<FoodComponentVersion>;
export type FoodRecipeNutritionProfile = FoodDerivedNutritionProfile<FoodRecipeVersion>;
function record(v: unknown, keys: readonly string[]): Record<string, unknown> {
    if (!v || typeof v !== "object" || Array.isArray(v) || Reflect.ownKeys(v).some(k => typeof k !== "string" || !keys.includes(k))) throw new TypeError("Invalid record");
    return v as Record<string, unknown>;
}
function list<T>(v: unknown, fn: (v: unknown) => T): T[] {
    if (!Array.isArray(v) || v.length > 128) throw new TypeError("Invalid bounded list");
    return Array.from(v, fn);
}
function text(v: unknown): string {
    if (typeof v !== "string" || !v.length || v.trim() !== v || v.length > 512) throw new TypeError("Invalid source text");
    return v;
}
function freeze<T>(v: T): T { if (v && typeof v === "object") { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }
function number(v: unknown): number { if (typeof v !== "number" || !Number.isFinite(v) || v < 0) throw new TypeError("Invalid nutrient number"); return v; }
function source(v: unknown): FoodNutritionSource { const r = record(v, ["sourceReference", "version"]); return { sourceReference: text(r.sourceReference), version: validateFoodVersion(r.version) }; }
function nutrients(v: unknown): FoodCoreNutrients {
    const r = record(v, FOOD_CORE_NUTRIENTS);
    return Object.fromEntries(FOOD_CORE_NUTRIENTS.map(key => {
        const n = record(r[key], ["state", "value"]);
        if (n.state === "unknown") { record(r[key], ["state"]); return [key, { state: "unknown" }]; }
        if (n.state !== "known") throw new TypeError("Invalid nutrient state");
        return [key, { state: "known", value: number(n.value) }];
    })) as FoodCoreNutrients;
}
function completeness(v: FoodCoreNutrients): "complete" | "incomplete" { return FOOD_CORE_NUTRIENTS.every(k => v[k].state === "known") ? "complete" : "incomplete"; }
function reference(v: unknown): FoodIngredientReference {
    const r = record(v, ["kind", "id", "version", "ingredientIndex"]);
    if (typeof r.ingredientIndex !== "number" || !Number.isSafeInteger(r.ingredientIndex) || r.ingredientIndex < 0) throw new TypeError("Invalid ingredient index");
    const common = { version: validateFoodVersion(r.version), ingredientIndex: r.ingredientIndex };
    if (r.kind === "recipe") return { kind: "recipe", id: parseFoodRecipeId(r.id), ...common };
    if (r.kind === "component") return { kind: "component", id: parseFoodComponentId(r.id), ...common };
    throw new TypeError("Invalid ingredient context");
}
/** Shared exact FOOD reference/source shape validation, without nutrition inference. */
export { reference as parseFoodIngredientReference, source as validateFoodSourceReference };
function facts(v: unknown, ingredient: FoodIngredient): FoodIngredientAllergens {
    const r = record(v, ["review", "evidence", "disclosureComplete"]);
    const review = record(r.review, ["state", "declarations"]);
    if (review.state !== "unknown" && review.state !== "pending" && review.state !== "reviewed") throw new TypeError("Invalid review state");
    const declarations = validateFoodAllergenDeclarations(review.declarations);
    let evidence: FoodIngredientAllergens["evidence"];
    if (r.evidence !== undefined) { const e = record(r.evidence, ["source", "reviewDate", "reviewer"]); evidence = { source: source(e.source), reviewDate: validateFoodReviewDate(e.reviewDate), reviewer: text(e.reviewer) }; }
    if (review.state === "reviewed" && !evidence) throw new TypeError("Reviewed facts require evidence");
    const disclosureComplete = ingredient.kind !== "purchased-component" || ingredient.composition === "disclosed";
    if (r.disclosureComplete !== undefined && r.disclosureComplete !== disclosureComplete) throw new TypeError("Disclosure mismatch");
    return { review: { state: review.state, declarations } as FoodAllergenReview, ...(evidence ? { evidence } : {}), disclosureComplete };
}
export function validateFoodIngredientNutritionProfile(v: unknown, context: unknown): FoodIngredientNutritionProfile {
    const r = record(v, ["ingredient", "basisGrams", "source", "nutrients", "allergens", "completeness"]);
    const ref = reference(r.ingredient);
    const owner = ref.kind === "recipe" ? validateFoodRecipeDraft(context) : validateFoodComponentVersion(context);
    if (owner.id !== ref.id || owner.version !== ref.version) throw new TypeError("Ingredient context mismatch");
    const ingredient = ref.kind === "recipe" ? validateFoodRecipeDraft(context).ingredients?.[ref.ingredientIndex] : validateFoodComponentVersion(context).composition[ref.ingredientIndex]?.ingredient;
    if (!ingredient || r.basisGrams !== 100) throw new TypeError("Missing ingredient or invalid basis");
    const values = nutrients(r.nutrients); const state = completeness(values);
    if (r.completeness !== undefined && r.completeness !== state) throw new TypeError("Completeness mismatch");
    return freeze({ ingredient: ref, basisGrams: 100 as const, source: source(r.source), nutrients: values, completeness: state, allergens: facts(r.allergens, ingredient) });
}
function aggregate(inputs: readonly FoodIngredientAllergens[]): FoodAggregateAllergens {
    const seen = new Set<string>(); const declarations: FoodAllergenReview["declarations"][number][] = [];
    for (const input of inputs) for (const declaration of input.review.declarations) {
        const key = JSON.stringify([declaration.allergen, declaration.detail]);
        if (!seen.has(key)) { seen.add(key); declarations.push({ ...declaration }); }
    }
    return { complete: inputs.every(v => v.review.state === "reviewed" && v.disclosureComplete), declarations, inputs };
}
function derive<F extends { yieldGrams: number }>(formulation: F, inputs: readonly FoodNutritionInput[], masses: readonly number[]): FoodDerivedNutritionProfile<F> {
    const total = Object.fromEntries(FOOD_CORE_NUTRIENTS.map(k => {
        let sum = 0; let unknown = false;
        inputs.forEach((input, i) => { const n = input.nutrients[k]; if (n.state === "unknown") unknown = true; else sum = number(sum + number(masses[i] / 100 * n.value)); });
        return [k, unknown ? { state: "unknown" } : { state: "known", value: sum }];
    })) as FoodCoreNutrients;
    const values = Object.fromEntries(FOOD_CORE_NUTRIENTS.map(k => { const n = total[k]; return [k, n.state === "unknown" ? { state: "unknown" } : { state: "known", value: number(n.value / formulation.yieldGrams * 100) }]; })) as FoodCoreNutrients;
    const allergenInputs = inputs.flatMap(v => "review" in v.allergens ? [v.allergens] : [...v.allergens.inputs]);
    return freeze({ formulation, basisGrams: 100 as const, total, nutrients: values, completeness: completeness(values), inputs, allergens: aggregate(allergenInputs) });
}
function key(ref: FoodIngredientReference): string { return JSON.stringify([ref.kind, ref.id, ref.version, ref.ingredientIndex]); }
function profiles(v: unknown, context: unknown): Map<string, FoodIngredientNutritionProfile> {
    const map = new Map<string, FoodIngredientNutritionProfile>();
    list(v, item => { const p = validateFoodIngredientNutritionProfile(item, context); const k = key(p.ingredient); if (map.has(k)) throw new TypeError("Duplicate ingredient profile"); map.set(k, p); return p; });
    return map;
}
function input(p: FoodIngredientNutritionProfile): FoodNutritionInput { return { reference: p.ingredient, source: p.source, nutrients: p.nutrients, allergens: p.allergens }; }
export function deriveFoodComponentNutrition(componentInput: unknown, ingredientProfiles: unknown): FoodComponentNutritionProfile {
    const component = validateFoodComponentVersion(componentInput); const supplied = profiles(ingredientProfiles, component);
    const inputs = component.composition.map((_, ingredientIndex) => {
        const p = supplied.get(key({ kind: "component", id: component.id, version: component.version, ingredientIndex }));
        if (!p) throw new TypeError("Missing ingredient profile"); return input(p);
    });
    if (supplied.size !== inputs.length) throw new TypeError("Unused ingredient profile");
    return derive(component, inputs, component.composition.map(v => v.grams));
}
/** Revalidate component projections from their retained exact source inputs. */
function componentProfile(v: unknown): FoodComponentNutritionProfile {
    const r = record(v, ["formulation", "basisGrams", "total", "nutrients", "completeness", "inputs", "allergens"]);
    const component = validateFoodComponentVersion(r.formulation);
    const ps = list(r.inputs, item => {
        const i = record(item, ["reference", "source", "nutrients", "allergens"]);
        return { ingredient: i.reference, source: i.source, nutrients: i.nutrients, allergens: i.allergens, basisGrams: 100 };
    });
    const result = deriveFoodComponentNutrition(component, ps);
    // Reject mismatched/forged summaries rather than trusting caller completeness.
    if (r.basisGrams !== 100 || r.completeness !== result.completeness || JSON.stringify(nutrients(r.total)) !== JSON.stringify(result.total) || JSON.stringify(nutrients(r.nutrients)) !== JSON.stringify(result.nutrients)) throw new TypeError("Component nutrition summary mismatch");
    const a = record(r.allergens, ["complete", "declarations", "inputs"]);
    if (a.complete !== result.allergens.complete || JSON.stringify(a.declarations) !== JSON.stringify(result.allergens.declarations) || JSON.stringify(a.inputs) !== JSON.stringify(result.allergens.inputs)) throw new TypeError("Component allergen summary mismatch");
    return result;
}
export function deriveFoodRecipeNutrition(recipeInput: unknown, draftInput: unknown, componentInputs: unknown, ingredientProfiles: unknown, componentProfiles: unknown): FoodRecipeNutritionProfile {
    const recipe = validateFoodRecipeVersion(recipeInput, draftInput, componentInputs);
    const components = list(componentInputs, validateFoodComponentVersion);
    const supplied = profiles(ingredientProfiles, draftInput);
    const suppliedComponents = new Map<string, FoodComponentNutritionProfile>();
    list(componentProfiles, v => { const p = componentProfile(v); const k = JSON.stringify([p.formulation.id, p.formulation.version]); if (suppliedComponents.has(k)) throw new TypeError("Duplicate component nutrition"); suppliedComponents.set(k, p); return p; });
    let directCount = 0; let componentCount = 0;
    const inputs = recipe.composition.map(line => {
        if (line.kind === "ingredient") {
            directCount++;
            const p = supplied.get(key({ kind: "recipe", id: recipe.id, version: recipe.version, ingredientIndex: line.ingredientIndex }));
            if (!p) throw new TypeError("Missing direct ingredient nutrition"); return input(p);
        }
        componentCount++;
        const p = suppliedComponents.get(JSON.stringify([line.component.id, line.component.version]));
        const exact = components.find(c => c.id === line.component.id && c.version === line.component.version);
        if (!p || JSON.stringify(p.formulation) !== JSON.stringify(exact)) throw new TypeError("Exact component profile mismatch");
        return { reference: { kind: "component-profile" as const, ...line.component }, nutrients: p.nutrients, allergens: p.allergens, componentInputs: p.inputs };
    });
    if (directCount !== supplied.size || componentCount !== suppliedComponents.size) throw new TypeError("Unused nutrition profiles");
    return derive(recipe, inputs, recipe.composition.map(v => v.grams));
}
