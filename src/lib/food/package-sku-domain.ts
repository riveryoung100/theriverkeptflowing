/** FOOD-005A: exact commercial-unit identities, never commercial readiness. */
import { validateFoodVersion } from "./draft-domain";
import { parseFoodServingOfferId, type FoodServingOfferId } from "./dish-offer-domain";
import { validateFoodGrams } from "./prototype-capture-domain";

export type FoodPackageDefinitionId = string & { readonly __brand: "FoodPackageDefinitionId" };
export type FoodSkuId = string & { readonly __brand: "FoodSkuId" };
export interface FoodPackageDefinitionVersion {
    readonly id: FoodPackageDefinitionId; readonly version: number;
    readonly descriptor?: string;
    readonly netQuantity?: Readonly<{ basis: "grams"; grams: number }>;
}
export interface FoodSkuVersion {
    readonly id: FoodSkuId; readonly version: number;
    readonly servingOffer: Readonly<{ offerId: FoodServingOfferId; version: number }>;
    readonly package: Readonly<{ id: FoodPackageDefinitionId; version: number }>;
}
function record(value: unknown, allowed: readonly string[]): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Expected package/SKU record");
    if (Reflect.ownKeys(value).some(key => typeof key !== "string" || !allowed.includes(key))) throw new TypeError("Unsupported package/SKU field");
    return value as Record<string, unknown>;
}
function text(value: unknown, maximum: number): string {
    if (typeof value !== "string" || !value.length || value.trim() !== value || value.length > maximum) throw new TypeError("Expected bounded canonical text");
    return value;
}
function local(value: unknown): string {
    const s = text(value, 128); if (s.includes(":")) throw new TypeError("Expected local identity"); return s;
}
export function createFoodPackageDefinitionId(value: unknown): FoodPackageDefinitionId { return `food-package-definition:${local(value)}` as FoodPackageDefinitionId; }
export function parseFoodPackageDefinitionId(value: unknown): FoodPackageDefinitionId {
    const s = text(value, 152); const prefix = "food-package-definition:";
    if (!s.startsWith(prefix)) throw new TypeError("Wrong package identity prefix");
    return createFoodPackageDefinitionId(s.slice(prefix.length));
}
export function createFoodSkuId(value: unknown): FoodSkuId { return `food-sku:${local(value)}` as FoodSkuId; }
export function parseFoodSkuId(value: unknown): FoodSkuId {
    const s = text(value, 137); const prefix = "food-sku:";
    if (!s.startsWith(prefix)) throw new TypeError("Wrong SKU identity prefix");
    return createFoodSkuId(s.slice(prefix.length));
}
export function validateFoodPackageDefinitionVersion(input: unknown): FoodPackageDefinitionVersion {
    const r = record(input, ["id", "version", "descriptor", "netQuantity"]);
    let quantity: FoodPackageDefinitionVersion["netQuantity"];
    if (r.netQuantity !== undefined) {
        const q = record(r.netQuantity, ["basis", "grams"]);
        if (q.basis !== "grams") throw new TypeError("Unsupported net quantity basis");
        quantity = Object.freeze({ basis: "grams", grams: validateFoodGrams(q.grams) });
    }
    return Object.freeze({ id: parseFoodPackageDefinitionId(r.id), version: validateFoodVersion(r.version),
        ...(r.descriptor === undefined ? {} : { descriptor: text(r.descriptor, 500) }),
        ...(quantity === undefined ? {} : { netQuantity: quantity }) });
}
export function validateFoodSkuVersion(input: unknown): FoodSkuVersion {
    const r = record(input, ["id", "version", "servingOffer", "package"]);
    const o = record(r.servingOffer, ["offerId", "version"]); const p = record(r.package, ["id", "version"]);
    return Object.freeze({ id: parseFoodSkuId(r.id), version: validateFoodVersion(r.version),
        servingOffer: Object.freeze({ offerId: parseFoodServingOfferId(o.offerId), version: validateFoodVersion(o.version) }),
        package: Object.freeze({ id: parseFoodPackageDefinitionId(p.id), version: validateFoodVersion(p.version) }) });
}
function consecutive(previous: number, next: number): void {
    if (previous === Number.MAX_SAFE_INTEGER || next !== previous + 1) throw new TypeError("Revision must be consecutive");
}
export function reviseFoodPackageDefinitionVersion(previousInput: unknown, nextInput: unknown): FoodPackageDefinitionVersion {
    const previous = validateFoodPackageDefinitionVersion(previousInput); const next = validateFoodPackageDefinitionVersion(nextInput);
    if (previous.id !== next.id) throw new TypeError("Package identity drift"); consecutive(previous.version, next.version); return next;
}
export function reviseFoodSkuVersion(previousInput: unknown, nextInput: unknown): FoodSkuVersion {
    const previous = validateFoodSkuVersion(previousInput); const next = validateFoodSkuVersion(nextInput);
    if (previous.id !== next.id) throw new TypeError("SKU identity drift"); consecutive(previous.version, next.version); return next;
}
