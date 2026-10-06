/** FOOD-002B: supplied descriptive snapshots, with exact historical references. */
import { parseFoodProductId, parseFoodRecipeId, validateFoodProductDraft, validateFoodRecipeDraft, validateFoodVersion, type FoodProductId, type FoodRecipeId } from "./draft-domain";

export type FoodDishId = string & { readonly __brand: "FoodDishId" };
export type FoodServingOfferId = string & { readonly __brand: "FoodServingOfferId" };
export type FoodServingFormat = Readonly<{ kind: "individual" }> | Readonly<{ kind: "family" }> | Readonly<{ kind: "catering"; panSize: "unknown" | "half-pan" | "full-pan" | "other"; panDescription?: string }> | Readonly<{ kind: "custom"; code: string; label: string }>;
export type FoodServingEstimate = Readonly<{ state: "unknown" }> | Readonly<{ state: "specified"; minimum: number; maximum: number; explanation?: string }>;
export type FoodUnresolvedText = Readonly<{ state: "unknown" }> | Readonly<{ state: "specified"; text: string }>;
export interface FoodDishPresentation {
    readonly dishId: FoodDishId; readonly version: number;
    readonly product: Readonly<{ id: FoodProductId; version: number }>;
    readonly recipe: Readonly<{ id: FoodRecipeId; version: number }>;
    readonly name: string; readonly shortDescription?: string; readonly longDescription?: string;
    readonly mediaReferences?: readonly Readonly<{ reference: string }>[];
}
export interface FoodServingOffer {
    readonly offerId: FoodServingOfferId; readonly version: number;
    readonly presentation: Readonly<{ dishId: FoodDishId; version: number }>;
    readonly format: FoodServingFormat; readonly servingEstimate: FoodServingEstimate;
    readonly packagingDescription?: FoodUnresolvedText; readonly storageSummary?: FoodUnresolvedText; readonly reheatingSummary?: FoodUnresolvedText;
}
function record(v: unknown, allowed: readonly string[]): Record<string, unknown> {
    if (!v || typeof v !== "object" || Array.isArray(v)) throw new TypeError("Expected object");
    if (Reflect.ownKeys(v).some(k => typeof k !== "string" || !allowed.includes(k))) throw new TypeError("Unsupported field");
    return v as Record<string, unknown>;
}
function text(v: unknown, maximum = Infinity): string {
    if (typeof v !== "string" || !v.length || v.trim() !== v || v.length > maximum) throw new TypeError("Expected canonical bounded text");
    return v;
}
function local(v: unknown, maximum = Infinity): string { const s = text(v, maximum); if (s.includes(":")) throw new TypeError("Local identity contains colon"); return s; }
function identity(v: unknown, prefix: string): string { const s = text(v); if (!s.startsWith(prefix + ":")) throw new TypeError("Wrong identity prefix"); local(s.slice(prefix.length + 1)); return s; }
export function createFoodDishId(v: unknown): FoodDishId { return `food-dish:${local(v)}` as FoodDishId; }
export function parseFoodDishId(v: unknown): FoodDishId { return identity(v, "food-dish") as FoodDishId; }
export function createFoodServingOfferId(v: unknown): FoodServingOfferId { return `food-serving-offer:${local(v)}` as FoodServingOfferId; }
export function parseFoodServingOfferId(v: unknown): FoodServingOfferId { return identity(v, "food-serving-offer") as FoodServingOfferId; }
function freeze<T>(v: T): T { if (v && typeof v === "object") { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }
function optionalText(r: Record<string, unknown>, key: string, maximum: number): Record<string, string> { return r[key] === undefined ? {} : { [key]: text(r[key], maximum) }; }
export function validateFoodDishPresentation(input: unknown, productInput: unknown, recipeInput: unknown): FoodDishPresentation {
    const recipe = validateFoodRecipeDraft(recipeInput); const product = validateFoodProductDraft(productInput, recipe);
    const r = record(input, ["dishId", "version", "product", "recipe", "name", "shortDescription", "longDescription", "mediaReferences"]);
    const p = record(r.product, ["id", "version"]); const q = record(r.recipe, ["id", "version"]);
    if (parseFoodProductId(p.id) !== product.id || validateFoodVersion(p.version) !== product.version || parseFoodRecipeId(q.id) !== recipe.id || validateFoodVersion(q.version) !== recipe.version) throw new TypeError("Snapshot reference mismatch");
    let mediaReferences: { reference: string }[] | undefined;
    if (r.mediaReferences !== undefined) {
        if (!Array.isArray(r.mediaReferences)) throw new TypeError("Expected media array");
        const seen = new Set<string>();
        mediaReferences = Array.from(r.mediaReferences, item => {
            const m = record(item, ["reference"]); const reference = text(m.reference, 512);
            if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(reference) || reference.startsWith("//") || seen.has(reference)) throw new TypeError("Invalid opaque media reference");
            seen.add(reference); return { reference };
        });
    }
    return freeze({ dishId: parseFoodDishId(r.dishId), version: validateFoodVersion(r.version), product: { id: product.id, version: product.version }, recipe: { id: recipe.id, version: recipe.version }, name: text(r.name, 160), ...optionalText(r, "shortDescription", 500), ...optionalText(r, "longDescription", 4000), ...(mediaReferences === undefined ? {} : { mediaReferences }) });
}
export function validateFoodServingFormat(input: unknown): FoodServingFormat {
    const r = record(input, ["kind", "panSize", "panDescription", "code", "label"]);
    if (r.kind === "individual" || r.kind === "family") { record(input, ["kind"]); return freeze({ kind: r.kind }); }
    if (r.kind === "custom") { record(input, ["kind", "code", "label"]); return freeze({ kind: "custom", code: local(r.code, 128), label: text(r.label, 160) }); }
    if (r.kind !== "catering") throw new TypeError("Unsupported serving format");
    if (r.panSize === "other") { record(input, ["kind", "panSize", "panDescription"]); return freeze({ kind: "catering", panSize: "other", panDescription: text(r.panDescription, 500) }); }
    record(input, ["kind", "panSize"]);
    if (r.panSize !== "unknown" && r.panSize !== "half-pan" && r.panSize !== "full-pan") throw new TypeError("Unsupported pan size");
    return freeze({ kind: "catering", panSize: r.panSize });
}
export function validateFoodServingEstimate(input: unknown): FoodServingEstimate {
    const r = record(input, ["state", "minimum", "maximum", "explanation"]);
    if (r.state === "unknown") { record(input, ["state"]); return freeze({ state: "unknown" }); }
    if (r.state !== "specified") throw new TypeError("Explicit estimate state required");
    const minimum = validateFoodVersion(r.minimum); const maximum = validateFoodVersion(r.maximum);
    if (minimum > maximum) throw new TypeError("Reversed serving range");
    return freeze({ state: "specified", minimum, maximum, ...optionalText(r, "explanation", 500) });
}
export function validateFoodUnresolvedText(input: unknown): FoodUnresolvedText {
    const r = record(input, ["state", "text"]);
    if (r.state === "unknown") { record(input, ["state"]); return freeze({ state: "unknown" }); }
    if (r.state !== "specified") throw new TypeError("Explicit descriptor state required");
    return freeze({ state: "specified", text: text(r.text, 2000) });
}
export function validateFoodServingOffer(input: unknown, presentationInput: unknown, product: unknown, recipe: unknown): FoodServingOffer {
    const presentation = validateFoodDishPresentation(presentationInput, product, recipe);
    const r = record(input, ["offerId", "version", "presentation", "format", "servingEstimate", "packagingDescription", "storageSummary", "reheatingSummary"]);
    const p = record(r.presentation, ["dishId", "version"]);
    if (parseFoodDishId(p.dishId) !== presentation.dishId || validateFoodVersion(p.version) !== presentation.version) throw new TypeError("Presentation reference mismatch");
    const descriptors: { packagingDescription?: FoodUnresolvedText; storageSummary?: FoodUnresolvedText; reheatingSummary?: FoodUnresolvedText } = {};
    for (const key of ["packagingDescription", "storageSummary", "reheatingSummary"] as const) if (r[key] !== undefined) descriptors[key] = validateFoodUnresolvedText(r[key]);
    return freeze({ offerId: parseFoodServingOfferId(r.offerId), version: validateFoodVersion(r.version), presentation: { dishId: presentation.dishId, version: presentation.version }, format: validateFoodServingFormat(r.format), servingEstimate: validateFoodServingEstimate(r.servingEstimate), ...descriptors });
}
function consecutive(previous: number, next: number): void { if (previous === Number.MAX_SAFE_INTEGER || next !== previous + 1) throw new TypeError("Revision must be consecutive"); }
export function reviseFoodDishPresentation(previousInput: unknown, nextInput: unknown, previousProduct: unknown, previousRecipe: unknown, nextProduct: unknown, nextRecipe: unknown): FoodDishPresentation {
    const previous = validateFoodDishPresentation(previousInput, previousProduct, previousRecipe); const next = validateFoodDishPresentation(nextInput, nextProduct, nextRecipe);
    if (previous.dishId !== next.dishId) throw new TypeError("Dish identity drift"); consecutive(previous.version, next.version); return next;
}
export function reviseFoodServingOffer(previousInput: unknown, nextInput: unknown, previousPresentation: unknown, nextPresentation: unknown, previousProduct: unknown, previousRecipe: unknown, nextProduct: unknown, nextRecipe: unknown): FoodServingOffer {
    const previous = validateFoodServingOffer(previousInput, previousPresentation, previousProduct, previousRecipe); const next = validateFoodServingOffer(nextInput, nextPresentation, nextProduct, nextRecipe);
    if (previous.offerId !== next.offerId || previous.presentation.dishId !== next.presentation.dishId) throw new TypeError("Offer identity or dish drift"); consecutive(previous.version, next.version); return next;
}
