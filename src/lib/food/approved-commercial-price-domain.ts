/** FOOD-005B: supplied price approval assertions, never sale readiness. */
import { validateFoodVersion, validateFoodReviewDate } from "./draft-domain";
import { validateFoodMoney, type FoodMoney } from "./cost-pricing-domain";
import { parseFoodSkuId, validateFoodSkuVersion, type FoodSkuId } from "./package-sku-domain";

export type FoodApprovedCommercialPriceId = string & { readonly __brand: "FoodApprovedCommercialPriceId" };
export interface FoodApprovedCommercialPriceVersion {
    readonly id: FoodApprovedCommercialPriceId; readonly version: number;
    readonly sku: Readonly<{ id: FoodSkuId; version: number }>;
    readonly money: FoodMoney;
    readonly approval: Readonly<{ attribution: string; sourceReference: string; approvedOn: string }>;
    readonly candidateProvenance?: Readonly<{ sourceReference: string }>;
}
function record(v: unknown, allowed: readonly string[]): Record<string, unknown> {
    if (!v || typeof v !== "object" || Array.isArray(v) || Reflect.ownKeys(v).some(k => typeof k !== "string" || !allowed.includes(k))) throw new TypeError("Invalid approved price record");
    return v as Record<string, unknown>;
}
function text(v: unknown, maximum: number): string {
    if (typeof v !== "string" || !v.length || v.trim() !== v || v.length > maximum) throw new TypeError("Invalid bounded approval text"); return v;
}
export function createFoodApprovedCommercialPriceId(v: unknown): FoodApprovedCommercialPriceId {
    const s = text(v, 128); if (s.includes(":")) throw new TypeError("Invalid local price identity");
    return `food-approved-commercial-price:${s}` as FoodApprovedCommercialPriceId;
}
export function parseFoodApprovedCommercialPriceId(v: unknown): FoodApprovedCommercialPriceId {
    const prefix = "food-approved-commercial-price:"; const s = text(v, prefix.length + 128);
    if (!s.startsWith(prefix)) throw new TypeError("Wrong approved price identity prefix"); return createFoodApprovedCommercialPriceId(s.slice(prefix.length));
}
/** Supplied SKU proves local exact match only, not persistence or authenticated approval. */
export function validateFoodApprovedCommercialPriceVersion(input: unknown, skuInput: unknown): FoodApprovedCommercialPriceVersion {
    const r = record(input, ["id", "version", "sku", "money", "approval", "candidateProvenance"]);
    const supplied = validateFoodSkuVersion(skuInput); const ref = record(r.sku, ["id", "version"]);
    const id = parseFoodSkuId(ref.id); const version = validateFoodVersion(ref.version);
    if (id !== supplied.id || version !== supplied.version) throw new TypeError("Exact SKU mismatch");
    const a = record(r.approval, ["attribution", "sourceReference", "approvedOn"]);
    let candidateProvenance: FoodApprovedCommercialPriceVersion["candidateProvenance"];
    if (r.candidateProvenance !== undefined) {
        const p = record(r.candidateProvenance, ["sourceReference"]);
        candidateProvenance = Object.freeze({ sourceReference: text(p.sourceReference, 512) });
    }
    return Object.freeze({ id: parseFoodApprovedCommercialPriceId(r.id), version: validateFoodVersion(r.version),
        sku: Object.freeze({ id, version }), money: validateFoodMoney(r.money),
        approval: Object.freeze({ attribution: text(a.attribution, 512), sourceReference: text(a.sourceReference, 512), approvedOn: validateFoodReviewDate(a.approvedOn) }),
        ...(candidateProvenance === undefined ? {} : { candidateProvenance }) });
}
export function createInitialFoodApprovedCommercialPrice(input: unknown, skuInput: unknown): FoodApprovedCommercialPriceVersion {
    const value = validateFoodApprovedCommercialPriceVersion(input, skuInput);
    if (value.version !== 1) throw new TypeError("Initial price version must be one"); return value;
}
export function reviseFoodApprovedCommercialPriceVersion(previousInput: unknown, nextInput: unknown, skuInput: unknown): FoodApprovedCommercialPriceVersion {
    const previous = validateFoodApprovedCommercialPriceVersion(previousInput, skuInput);
    const next = validateFoodApprovedCommercialPriceVersion(nextInput, skuInput);
    if (previous.id !== next.id || previous.sku.id !== next.sku.id || previous.sku.version !== next.sku.version) throw new TypeError("Price authority binding drift");
    if (previous.version === Number.MAX_SAFE_INTEGER || next.version !== previous.version + 1) throw new TypeError("Price revision must be consecutive");
    return next;
}
