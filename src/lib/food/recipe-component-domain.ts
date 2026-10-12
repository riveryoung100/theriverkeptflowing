/** FOOD-003B: deliberate immutable formulations, never automatic capture promotion. */
import { parseFoodRecipeId, validateFoodVersion, validateFoodIngredient, validateFoodRecipeDraft, reviseFoodRecipeDraft, type FoodIngredient, type FoodRecipeId } from "./draft-domain";
import { validateFoodGrams, parseFoodPrototypeCaptureId, type FoodPrototypeCaptureId } from "./prototype-capture-domain";

export type FoodComponentId = string & { readonly __brand: "FoodComponentId" };
export interface FoodComponentVersion {
    readonly id: FoodComponentId; readonly version: number; readonly name: string;
    readonly composition: readonly Readonly<{ kind: "ingredient"; ingredient: FoodIngredient; grams: number }>[];
    readonly method: readonly string[]; readonly yieldGrams: number;
    readonly captureSources?: readonly FoodPrototypeCaptureId[];
}
export type FoodRecipeCompositionLine = Readonly<{ kind: "ingredient"; ingredientIndex: number; grams: number }> |
    Readonly<{ kind: "component"; component: Readonly<{ id: FoodComponentId; version: number }>; grams: number }>;
export interface FoodRecipeVersion {
    readonly id: FoodRecipeId; readonly version: number;
    readonly composition: readonly FoodRecipeCompositionLine[];
    readonly method: readonly string[]; readonly yieldGrams: number;
    readonly captureSources?: readonly FoodPrototypeCaptureId[];
}
function record(value: unknown, allowed: readonly string[]): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Expected record");
    if (Reflect.ownKeys(value).some(k => typeof k !== "string" || !allowed.includes(k))) throw new TypeError("Unsupported field");
    return value as Record<string, unknown>;
}
function text(value: unknown, maximum: number): string {
    if (typeof value !== "string" || !value.length || value.trim() !== value || value.length > maximum) throw new TypeError("Expected canonical bounded text");
    return value;
}
export function createFoodComponentId(value: unknown): FoodComponentId {
    const local = text(value, 128);
    if (local.includes(":")) throw new TypeError("Invalid local identity");
    return `food-component:${local}` as FoodComponentId;
}
export function parseFoodComponentId(value: unknown): FoodComponentId {
    const id = text(value, 143);
    if (!id.startsWith("food-component:")) throw new TypeError("Wrong component prefix");
    return createFoodComponentId(id.slice("food-component:".length));
}
function list<T>(value: unknown, build: (v: unknown) => T, required = false): T[] {
    if (!Array.isArray(value) || value.length > 128 || (required && !value.length)) throw new TypeError("Invalid bounded list");
    return Array.from(value, build);
}
function freeze<T>(value: T): T {
    if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
}
function common(r: Record<string, unknown>) {
    const seen = new Set<string>();
    const captureSources = r.captureSources === undefined ? undefined : list(r.captureSources, v => {
        const id = parseFoodPrototypeCaptureId(v);
        if (seen.has(id)) throw new TypeError("Duplicate capture source");
        seen.add(id); return id;
    });
    return { method: list(r.method, v => text(v, 2000), true), yieldGrams: validateFoodGrams(r.yieldGrams),
        ...(captureSources === undefined ? {} : { captureSources }) };
}
export function validateFoodComponentVersion(input: unknown): FoodComponentVersion {
    const r = record(input, ["id", "version", "name", "composition", "method", "yieldGrams", "captureSources"]);
    const seen = new Set<string>();
    const composition = list(r.composition, v => {
        const line = record(v, ["kind", "ingredient", "grams"]);
        if (line.kind !== "ingredient") throw new TypeError("Component nesting is deferred");
        const ingredient = validateFoodIngredient(line.ingredient);
        if (seen.has(ingredient.name)) throw new TypeError("Duplicate ingredient name");
        seen.add(ingredient.name);
        return { kind: "ingredient" as const, ingredient, grams: validateFoodGrams(line.grams) };
    }, true);
    return freeze({ id: parseFoodComponentId(r.id), version: validateFoodVersion(r.version), name: text(r.name, 256), composition, ...common(r) });
}
/** Exact supplied context is required; no IO or latest-version substitution. */
export function validateFoodRecipeVersion(input: unknown, recipeInput: unknown, componentInputs: unknown = []): FoodRecipeVersion {
    const r = record(input, ["id", "version", "composition", "method", "yieldGrams", "captureSources"]);
    const recipe = validateFoodRecipeDraft(recipeInput);
    if (parseFoodRecipeId(r.id) !== recipe.id || validateFoodVersion(r.version) !== recipe.version) throw new TypeError("Recipe context mismatch");
    const components = new Map<string, FoodComponentVersion>();
    list(componentInputs, v => {
        const component = validateFoodComponentVersion(v); const key = JSON.stringify([component.id, component.version]);
        if (components.has(key)) throw new TypeError("Duplicate component context");
        components.set(key, component); return component;
    });
    const seen = new Set<string>();
    const composition = list<FoodRecipeCompositionLine>(r.composition, v => {
        const line = record(v, ["kind", "ingredientIndex", "component", "grams"]);
        let result: FoodRecipeCompositionLine; let key: string;
        if (line.kind === "ingredient") {
            record(v, ["kind", "ingredientIndex", "grams"]);
            const index = line.ingredientIndex;
            if (typeof index !== "number" || !Number.isSafeInteger(index) || index < 0 || !recipe.ingredients?.[index]) throw new TypeError("Invalid exact recipe ingredient index");
            key = `ingredient:${index}`;
            result = { kind: "ingredient", ingredientIndex: index, grams: validateFoodGrams(line.grams) };
        } else if (line.kind === "component") {
            record(v, ["kind", "component", "grams"]);
            const ref = record(line.component, ["id", "version"]);
            const id = parseFoodComponentId(ref.id); const version = validateFoodVersion(ref.version);
            if (!components.has(JSON.stringify([id, version]))) throw new TypeError("Missing exact component version");
            key = id;
            result = { kind: "component", component: { id, version }, grams: validateFoodGrams(line.grams) };
        } else throw new TypeError("Invalid composition kind");
        if (seen.has(key)) throw new TypeError("Duplicate formulation input");
        seen.add(key); return result;
    }, true);
    return freeze({ id: recipe.id, version: recipe.version, composition, ...common(r) });
}
function consecutive(previous: { id: string; version: number }, next: { id: string; version: number }): void {
    if (previous.id !== next.id || previous.version === Number.MAX_SAFE_INTEGER || next.version !== previous.version + 1) throw new TypeError("Invalid formulation revision");
}
export function reviseFoodComponentVersion(previousInput: unknown, nextInput: unknown): FoodComponentVersion {
    const previous = validateFoodComponentVersion(previousInput); const next = validateFoodComponentVersion(nextInput);
    consecutive(previous, next); return next;
}
export function reviseFoodRecipeVersion(previousInput: unknown, nextInput: unknown, previousRecipe: unknown, nextRecipe: unknown, previousComponents: unknown = [], nextComponents: unknown = []): FoodRecipeVersion {
    const previous = validateFoodRecipeVersion(previousInput, previousRecipe, previousComponents);
    const next = validateFoodRecipeVersion(nextInput, nextRecipe, nextComponents);
    reviseFoodRecipeDraft(previousRecipe, nextRecipe);
    consecutive(previous, next); return next;
}
