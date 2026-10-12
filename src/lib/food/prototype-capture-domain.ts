/** FOOD-003A: observed cooking runs, never canonical updates or sale authority. */
import { parseFoodRecipeId, parseFoodProductId, validateFoodVersion, validateFoodReviewDate, validateFoodRecipeDraft, validateFoodProductDraft, type FoodRecipeId, type FoodProductId } from "./draft-domain";

export type FoodPrototypeCaptureId = string & { readonly __brand: "FoodPrototypeCaptureId" };
export interface FoodMeasuredInput {
    readonly key: string; readonly ingredientName: string; readonly grams: number;
    readonly recipeIngredientIndex?: number;
}
export type FoodPrototypeAdjustment = Readonly<{ kind: "process"; text: string }> |
    Readonly<{ kind: "mass"; action: "add" | "remove"; grams: number; text: string } &
    ({ inputKey: string } | { ingredientName: string })>;
export interface FoodPrototypeCapture {
    readonly id: FoodPrototypeCaptureId;
    readonly recipe?: Readonly<{ id: FoodRecipeId; version: number }>;
    readonly product?: Readonly<{ id: FoodProductId; version: number }>;
    readonly inputs: readonly FoodMeasuredInput[];
    readonly method: readonly string[];
    readonly adjustments: readonly FoodPrototypeAdjustment[];
    readonly finishedYieldGrams: number;
    readonly observations: readonly Readonly<{ category: string; text: string }>[];
    readonly provenance: Readonly<{ kind: "founder-measured"; sourceReference: string; occurredOn?: string }>;
}
function record(value: unknown, allowed: readonly string[]): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Expected record");
    if (Reflect.ownKeys(value).some(key => typeof key !== "string" || !allowed.includes(key))) throw new TypeError("Unsupported field");
    return value as Record<string, unknown>;
}
function text(value: unknown, maximum = 2000): string {
    if (typeof value !== "string" || !value.length || value.trim() !== value || value.length > maximum) throw new TypeError("Expected bounded canonical text");
    return value;
}
function local(value: unknown): string {
    const result = text(value, 128);
    if (result.includes(":")) throw new TypeError("Expected local key");
    return result;
}
export function createFoodPrototypeCaptureId(value: unknown): FoodPrototypeCaptureId {
    return `food-prototype-capture:${local(value)}` as FoodPrototypeCaptureId;
}
export function parseFoodPrototypeCaptureId(value: unknown): FoodPrototypeCaptureId {
    const result = text(value, 160);
    if (!result.startsWith("food-prototype-capture:")) throw new TypeError("Wrong capture identity prefix");
    return createFoodPrototypeCaptureId(result.slice("food-prototype-capture:".length));
}
function grams(value: unknown): number {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > Number.MAX_SAFE_INTEGER) throw new TypeError("Expected positive finite grams");
    return value;
}
/** Shared FOOD mass boundary; export preserves existing capture behavior. */
export { grams as validateFoodGrams };
function list<T>(value: unknown, build: (item: unknown) => T, required = false): T[] {
    if (!Array.isArray(value) || value.length > 128 || (required && !value.length)) throw new TypeError("Expected bounded ordered list");
    return Array.from(value, build);
}
function freeze<T>(value: T): T {
    if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
}
/** Supplied snapshots prove local reference equality, not remote existence. */
export function validateFoodPrototypeCapture(input: unknown, recipeInput?: unknown, productInput?: unknown): FoodPrototypeCapture {
    const r = record(input, ["id", "recipe", "product", "inputs", "method", "adjustments", "finishedYieldGrams", "observations", "provenance"]);
    const recipe = r.recipe === undefined ? undefined : validateFoodRecipeDraft(recipeInput);
    if (r.recipe === undefined && recipeInput !== undefined) throw new TypeError("Unused recipe snapshot");
    let recipeReference: FoodPrototypeCapture["recipe"];
    if (recipe) {
        const ref = record(r.recipe, ["id", "version"]);
        if (parseFoodRecipeId(ref.id) !== recipe.id || validateFoodVersion(ref.version) !== recipe.version) throw new TypeError("Recipe reference mismatch");
        recipeReference = { id: recipe.id, version: recipe.version };
    }
    let productReference: FoodPrototypeCapture["product"];
    if (r.product !== undefined) {
        if (!recipe) throw new TypeError("Product context requires recipe context");
        const product = validateFoodProductDraft(productInput, recipe);
        const ref = record(r.product, ["id", "version"]);
        if (parseFoodProductId(ref.id) !== product.id || validateFoodVersion(ref.version) !== product.version) throw new TypeError("Product reference mismatch");
        productReference = { id: product.id, version: product.version };
    } else if (productInput !== undefined) throw new TypeError("Unused product snapshot");
    const keys = new Set<string>();
    const inputs = list(r.inputs, item => {
        const v = record(item, ["key", "ingredientName", "grams", "recipeIngredientIndex"]);
        const key = local(v.key); const ingredientName = text(v.ingredientName, 256);
        if (keys.has(key)) throw new TypeError("Duplicate input key");
        keys.add(key);
        let index: number | undefined;
        if (v.recipeIngredientIndex !== undefined) {
            const n = v.recipeIngredientIndex;
            if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 0 || !recipe?.ingredients || recipe.ingredients[n]?.name !== ingredientName) throw new TypeError("Recipe ingredient mismatch");
            index = n;
        }
        return { key, ingredientName, grams: grams(v.grams), ...(index === undefined ? {} : { recipeIngredientIndex: index }) };
    }, true);
    const adjustments = list<FoodPrototypeAdjustment>(r.adjustments, item => {
        const v = record(item, ["kind", "text", "action", "grams", "inputKey", "ingredientName"]);
        if (v.kind === "process") { record(item, ["kind", "text"]); return { kind: "process", text: text(v.text) }; }
        if (v.kind !== "mass" || (v.action !== "add" && v.action !== "remove")) throw new TypeError("Invalid adjustment");
        if ((v.inputKey === undefined) === (v.ingredientName === undefined)) throw new TypeError("Exactly one ingredient reference required");
        const reference = v.inputKey === undefined ? { ingredientName: text(v.ingredientName, 256) } : { inputKey: local(v.inputKey) };
        if (reference.inputKey !== undefined && !keys.has(reference.inputKey)) throw new TypeError("Unknown input key");
        return { kind: "mass", action: v.action, grams: grams(v.grams), text: text(v.text), ...reference };
    });
    const provenance = record(r.provenance, ["kind", "sourceReference", "occurredOn"]);
    if (provenance.kind !== "founder-measured") throw new TypeError("Expected observed measurement provenance");
    return freeze({ id: parseFoodPrototypeCaptureId(r.id), ...(recipeReference ? { recipe: recipeReference } : {}), ...(productReference ? { product: productReference } : {}), inputs,
        method: list(r.method, item => text(item), true), adjustments, finishedYieldGrams: grams(r.finishedYieldGrams),
        observations: list(r.observations, item => { const v = record(item, ["category", "text"]); return { category: text(v.category, 128), text: text(v.text) }; }),
        provenance: { kind: "founder-measured" as const, sourceReference: text(provenance.sourceReference, 512), ...(provenance.occurredOn === undefined ? {} : { occurredOn: validateFoodReviewDate(provenance.occurredOn) }) } });
}
