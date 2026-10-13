/** FOOD-005H: exact semantic label references, never disclosure or public authority. */
import { parseFoodProductId, parseFoodRecipeId, validateFoodVersion, type FoodProductId, type FoodRecipeId } from "./draft-domain";
import { parseFoodDishId, parseFoodServingOfferId, validateFoodDishPresentation, validateFoodServingOffer, type FoodDishId, type FoodServingOfferId } from "./dish-offer-domain";
import { parseFoodSkuId, parseFoodPackageDefinitionId, validateFoodSkuVersion, type FoodSkuId, type FoodPackageDefinitionId } from "./package-sku-domain";

export type FoodPackageLabelId = string & { readonly __brand: "FoodPackageLabelId" };
export interface FoodPublicInformationReference { readonly reference: string }
export interface FoodPackageLabelVersion {
    readonly id: FoodPackageLabelId; readonly version: number;
    readonly sku: Readonly<{ id: FoodSkuId; version: number }>;
    readonly package: Readonly<{ id: FoodPackageDefinitionId; version: number }>;
    readonly servingOffer: Readonly<{ offerId: FoodServingOfferId; version: number }>;
    readonly presentation: Readonly<{ dishId: FoodDishId; version: number }>;
    readonly product: Readonly<{ id: FoodProductId; version: number }>;
    readonly recipe: Readonly<{ id: FoodRecipeId; version: number }>;
    readonly displayTitle?: string;
    readonly publicInformation?: FoodPublicInformationReference;
}
export interface FoodPackageLabelSources {
    readonly sku: unknown; readonly servingOffer: unknown; readonly presentation: unknown; readonly product: unknown; readonly recipe: unknown;
}
function record(v: unknown, keys: readonly string[]): Record<string, unknown> {
    if (!v || typeof v !== "object" || Array.isArray(v) || Reflect.ownKeys(v).some(k => typeof k !== "string" || !keys.includes(k))) throw new TypeError("Invalid label record"); return v as Record<string, unknown>;
}
function text(v: unknown, max: number): string {
    if (typeof v !== "string" || !v.length || v.trim() !== v || v.length > max) throw new TypeError("Invalid label text"); return v;
}
export function createFoodPackageLabelId(v: unknown): FoodPackageLabelId {
    const s = text(v, 128); if (s.includes(":")) throw new TypeError("Invalid local label identity"); return `food-package-label:${s}` as FoodPackageLabelId;
}
export function parseFoodPackageLabelId(v: unknown): FoodPackageLabelId {
    const prefix = "food-package-label:"; const s = text(v, prefix.length + 128);
    if (!s.startsWith(prefix)) throw new TypeError("Wrong label identity prefix"); return createFoodPackageLabelId(s.slice(prefix.length));
}
export function validateFoodPublicInformationReference(input: unknown): FoodPublicInformationReference {
    const r = record(input, ["reference"]); const reference = text(r.reference, 128);
    // A deliberately restricted public alias, not a URI or namespaced private ID.
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(reference)) throw new TypeError("Invalid public information alias");
    return Object.freeze({ reference });
}
function ref(input: unknown, field: string, parse: (v: unknown) => string) {
    const r = record(input, [field, "version"]); return { id: parse(r[field]), version: validateFoodVersion(r.version) };
}
export function validateFoodPackageLabelVersion(input: unknown): FoodPackageLabelVersion {
    const r = record(input, ["id", "version", "sku", "package", "servingOffer", "presentation", "product", "recipe", "displayTitle", "publicInformation"]);
    const sku = ref(r.sku, "id", parseFoodSkuId); const pkg = ref(r.package, "id", parseFoodPackageDefinitionId);
    const offer = ref(r.servingOffer, "offerId", parseFoodServingOfferId); const dish = ref(r.presentation, "dishId", parseFoodDishId);
    const product = ref(r.product, "id", parseFoodProductId); const recipe = ref(r.recipe, "id", parseFoodRecipeId);
    return Object.freeze({ id: parseFoodPackageLabelId(r.id), version: validateFoodVersion(r.version),
        sku: Object.freeze({ id: sku.id as FoodSkuId, version: sku.version }), package: Object.freeze({ id: pkg.id as FoodPackageDefinitionId, version: pkg.version }),
        servingOffer: Object.freeze({ offerId: offer.id as FoodServingOfferId, version: offer.version }), presentation: Object.freeze({ dishId: dish.id as FoodDishId, version: dish.version }),
        product: Object.freeze({ id: product.id as FoodProductId, version: product.version }), recipe: Object.freeze({ id: recipe.id as FoodRecipeId, version: recipe.version }),
        ...(r.displayTitle === undefined ? {} : { displayTitle: text(r.displayTitle, 160) }),
        ...(r.publicInformation === undefined ? {} : { publicInformation: validateFoodPublicInformationReference(r.publicInformation) }) });
}
function bindings(v: FoodPackageLabelVersion): string { return JSON.stringify([v.sku, v.package, v.servingOffer, v.presentation, v.product, v.recipe]); }
export function validateFoodPackageLabelAgainstSources(input: unknown, sourcesInput: FoodPackageLabelSources): FoodPackageLabelVersion {
    const v = validateFoodPackageLabelVersion(input); const s = record(sourcesInput, ["sku", "servingOffer", "presentation", "product", "recipe"]);
    const sku = validateFoodSkuVersion(s.sku); const presentation = validateFoodDishPresentation(s.presentation, s.product, s.recipe);
    const offer = validateFoodServingOffer(s.servingOffer, presentation, s.product, s.recipe);
    const expected = { ...v, sku: { id: sku.id, version: sku.version }, package: sku.package, servingOffer: { offerId: offer.offerId, version: offer.version },
        presentation: { dishId: presentation.dishId, version: presentation.version }, product: presentation.product, recipe: presentation.recipe };
    if (bindings(v) !== bindings(expected) || sku.servingOffer.offerId !== offer.offerId || sku.servingOffer.version !== offer.version) throw new TypeError("Exact label source mismatch");
    if (v.displayTitle !== undefined && v.displayTitle !== presentation.name) throw new TypeError("Label title mismatch"); return v;
}
export function createInitialFoodPackageLabelVersion(input: unknown, sources: FoodPackageLabelSources): FoodPackageLabelVersion {
    const v = validateFoodPackageLabelAgainstSources(input, sources); if (v.version !== 1) throw new TypeError("Initial label version must be one"); return v;
}
export function reviseFoodPackageLabelVersion(previousInput: unknown, nextInput: unknown, sources: FoodPackageLabelSources): FoodPackageLabelVersion {
    const p = validateFoodPackageLabelAgainstSources(previousInput, sources); const n = validateFoodPackageLabelAgainstSources(nextInput, sources);
    if (p.id !== n.id || bindings(p) !== bindings(n) || p.version === Number.MAX_SAFE_INTEGER || n.version !== p.version + 1) throw new TypeError("Invalid label revision"); return n;
}
