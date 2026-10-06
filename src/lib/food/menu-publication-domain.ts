/** FOOD-002C: explicit publication selections and independent supplied observations. */
import { validateFoodVersion, type FoodProductDraft, type FoodRecipeDraft } from "./draft-domain";
import { parseFoodDishId, parseFoodServingOfferId, validateFoodDishPresentation, validateFoodServingOffer, validateFoodServingFormat, validateFoodServingEstimate, validateFoodUnresolvedText, type FoodDishId, type FoodServingOfferId, type FoodDishPresentation, type FoodServingOffer, type FoodServingFormat, type FoodServingEstimate, type FoodUnresolvedText } from "./dish-offer-domain";

export type FoodMenuPublicationId = string & { readonly __brand: "FoodMenuPublicationId" };
type DishReference = Readonly<{ dishId: FoodDishId; version: number }>;
type OfferReference = Readonly<{ offerId: FoodServingOfferId; version: number }>;
export interface FoodDishPublicSelection { readonly shortDescription: boolean; readonly longDescription: boolean; readonly mediaReferences: readonly string[] }
export interface FoodOfferPublicSelection { readonly packagingDescription: boolean; readonly storageSummary: boolean; readonly reheatingSummary: boolean; readonly availability: boolean }
export interface FoodMenuOfferSelection { readonly offer: OfferReference; readonly intent: "informational" | "inquiry-only"; readonly selection: FoodOfferPublicSelection }
export interface FoodMenuEntry { readonly presentation: DishReference; readonly selection: FoodDishPublicSelection; readonly offers: readonly FoodMenuOfferSelection[] }
export interface FoodMenuSection { readonly key: string; readonly title: string; readonly entries: readonly FoodMenuEntry[] }
export interface FoodMenuPublication { readonly publicationId: FoodMenuPublicationId; readonly version: number; readonly state: "unpublished" | "published"; readonly title: string; readonly sections: readonly FoodMenuSection[] }
export interface FoodServingOfferAvailability { readonly offer: OfferReference; readonly revision: number; readonly state: "available" | "sold-out" | "temporarily-paused" | "outside-ordering-window" | "unavailable" | "retired" }
export interface FoodDishPresentationContext { readonly presentation: FoodDishPresentation; readonly product: FoodProductDraft; readonly recipe: FoodRecipeDraft }
export interface FoodPublicMenuOffer { readonly offerId: FoodServingOfferId; readonly version: number; readonly presentation: DishReference; readonly intent: "informational" | "inquiry-only"; readonly format: FoodServingFormat; readonly servingEstimate: FoodServingEstimate; readonly packagingDescription?: FoodUnresolvedText; readonly storageSummary?: FoodUnresolvedText; readonly reheatingSummary?: FoodUnresolvedText; readonly availability?: FoodServingOfferAvailability }
export interface FoodPublicMenuEntry { readonly dishId: FoodDishId; readonly presentationVersion: number; readonly name: string; readonly shortDescription?: string; readonly longDescription?: string; readonly mediaReferences: readonly Readonly<{ reference: string }>[]; readonly offers: readonly FoodPublicMenuOffer[] }
export interface FoodPublicMenuSection { readonly key: string; readonly title: string; readonly entries: readonly FoodPublicMenuEntry[] }
export interface FoodPublicMenuProjection { readonly publicationId: FoodMenuPublicationId; readonly version: number; readonly title: string; readonly sections: readonly FoodPublicMenuSection[] }
type Failure = Readonly<{ ok: false; error: Readonly<{ code: "invalid-input"; message: "Food menu input could not be validated." }> }>;
export type FoodMenuValidationResult<T> = Readonly<{ ok: true; value: T }> | Failure;
export type FoodPublicMenuResult = FoodMenuValidationResult<Readonly<{ state: "unpublished" }> | Readonly<{ state: "published"; menu: FoodPublicMenuProjection }>>;
const descriptorKeys = ["packagingDescription", "storageSummary", "reheatingSummary"] as const;
function fail(): never { throw new TypeError("Invalid food menu input"); }
function record(v: unknown, keys: readonly string[]): Record<string, unknown> {
    if (!v || typeof v !== "object" || Array.isArray(v)) return fail();
    if (Reflect.ownKeys(v).some(k => typeof k !== "string" || !keys.includes(k))) return fail();
    return v as Record<string, unknown>;
}
function text(v: unknown, max = Infinity): string { if (typeof v !== "string" || !v.length || v.trim() !== v || v.length > max) return fail(); return v; }
function local(v: unknown, max = Infinity): string { const s = text(v, max); if (s.includes(":")) return fail(); return s; }
function identity(v: unknown, parse: boolean): FoodMenuPublicationId {
    try { const s = text(v); const prefix = "food-menu-publication:"; if (!parse) return `${prefix}${local(s)}` as FoodMenuPublicationId; if (!s.startsWith(prefix)) return fail(); local(s.slice(prefix.length)); return s as FoodMenuPublicationId; }
    catch { throw new TypeError("Invalid food menu publication identity."); }
}
export function createFoodMenuPublicationId(v: unknown): FoodMenuPublicationId { return identity(v, false); }
export function parseFoodMenuPublicationId(v: unknown): FoodMenuPublicationId { return identity(v, true); }
function array(v: unknown, max: number): unknown[] { if (!Array.isArray(v) || v.length > max) return fail(); return Array.from(v); }
function bool(v: unknown): boolean { if (typeof v !== "boolean") return fail(); return v; }
function freeze<T>(v: T): T { if (v && typeof v === "object") { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }
function result<T>(operation: () => T): FoodMenuValidationResult<T> {
    try { return freeze({ ok: true, value: operation() }); }
    catch { return freeze({ ok: false, error: { code: "invalid-input", message: "Food menu input could not be validated." } }); }
}
function key(id: string, version: number): string { return JSON.stringify([id, version]); }
function dishReference(v: unknown): DishReference { const r = record(v, ["dishId", "version"]); return { dishId: parseFoodDishId(r.dishId), version: validateFoodVersion(r.version) }; }
function offerReference(v: unknown): OfferReference { const r = record(v, ["offerId", "version"]); return { offerId: parseFoodServingOfferId(r.offerId), version: validateFoodVersion(r.version) }; }
function availability(v: unknown): FoodServingOfferAvailability {
    const r = record(v, ["offer", "revision", "state"]); const state = r.state;
    if (state !== "available" && state !== "sold-out" && state !== "temporarily-paused" && state !== "outside-ordering-window" && state !== "unavailable" && state !== "retired") return fail();
    return { offer: offerReference(r.offer), revision: validateFoodVersion(r.revision), state };
}
export function validateFoodServingOfferAvailability(input: unknown): FoodMenuValidationResult<FoodServingOfferAvailability> { return result(() => availability(input)); }
function contexts(presentations: unknown, offers: unknown) {
    const dishes = new Map<string, FoodDishPresentation>();
    const sourceContexts = new Map<string, Record<string, unknown>>();
    for (const item of array(presentations, 2000)) {
        const c = record(item, ["presentation", "product", "recipe"]);
        const d = validateFoodDishPresentation(c.presentation, c.product, c.recipe); const k = key(d.dishId, d.version);
        if (dishes.has(k)) return fail(); dishes.set(k, d); sourceContexts.set(k, c);
    }
    const serving = new Map<string, FoodServingOffer>();
    for (const item of array(offers, 40000)) {
        const o = record(item, ["offerId", "version", "presentation", "format", "servingEstimate", ...descriptorKeys]);
        const ref = dishReference(o.presentation); const k = key(ref.dishId, ref.version); const c = sourceContexts.get(k);
        if (!c) return fail();
        const validated = validateFoodServingOffer(item, dishes.get(k), c.product, c.recipe); const offerKey = key(validated.offerId, validated.version);
        if (serving.has(offerKey)) return fail(); serving.set(offerKey, validated);
    }
    return { dishes, serving };
}
type Contexts = ReturnType<typeof contexts>;
function publication(input: unknown, context: Contexts): FoodMenuPublication {
    const r = record(input, ["publicationId", "version", "state", "title", "sections"]);
    const state = r.state; if (state !== "unpublished" && state !== "published") return fail();
    const sectionKeys = new Set<string>(); const dishVersions = new Map<string, number>();
    const sections = array(r.sections, 20).map(item => {
        const s = record(item, ["key", "title", "entries"]); const sectionKey = local(s.key, 128);
        if (sectionKeys.has(sectionKey)) return fail(); sectionKeys.add(sectionKey);
        const seenDishes = new Set<string>();
        const entries = array(s.entries, 100).map(item => {
            const e = record(item, ["presentation", "selection", "offers"]); const ref = dishReference(e.presentation);
            const d = context.dishes.get(key(ref.dishId, ref.version)); if (!d || seenDishes.has(ref.dishId)) return fail(); seenDishes.add(ref.dishId);
            const previous = dishVersions.get(ref.dishId); if (previous !== undefined && previous !== ref.version) return fail(); dishVersions.set(ref.dishId, ref.version);
            const sel = record(e.selection, ["shortDescription", "longDescription", "mediaReferences"]);
            const shortDescription = bool(sel.shortDescription); const longDescription = bool(sel.longDescription);
            if ((shortDescription && d.shortDescription === undefined) || (longDescription && d.longDescription === undefined)) return fail();
            const seenMedia = new Set<string>();
            const mediaReferences = array(sel.mediaReferences, 20).map(item => { const reference = text(item, 512); if (seenMedia.has(reference) || !d.mediaReferences?.some(m => m.reference === reference)) return fail(); seenMedia.add(reference); return reference; });
            const seenOffers = new Set<string>();
            const selectedOffers = array(e.offers, 20).map((item): FoodMenuOfferSelection => {
                const o = record(item, ["offer", "intent", "selection"]); const offer = offerReference(o.offer); const source = context.serving.get(key(offer.offerId, offer.version));
                if (!source || source.presentation.dishId !== ref.dishId || source.presentation.version !== ref.version || seenOffers.has(offer.offerId)) return fail(); seenOffers.add(offer.offerId);
                const intent = o.intent; if (intent !== "informational" && intent !== "inquiry-only") return fail();
                const selection = record(o.selection, [...descriptorKeys, "availability"]);
                const parsed = { packagingDescription: bool(selection.packagingDescription), storageSummary: bool(selection.storageSummary), reheatingSummary: bool(selection.reheatingSummary), availability: bool(selection.availability) };
                for (const field of descriptorKeys) if (parsed[field] && source[field] === undefined) return fail();
                return { offer, intent, selection: parsed };
            });
            return { presentation: ref, selection: { shortDescription, longDescription, mediaReferences }, offers: selectedOffers };
        });
        return { key: sectionKey, title: text(s.title, 160), entries };
    });
    return { publicationId: parseFoodMenuPublicationId(r.publicationId), version: validateFoodVersion(r.version), state, title: text(r.title, 160), sections };
}
export function validateFoodMenuPublication(input: unknown, presentations: unknown, offers: unknown): FoodMenuValidationResult<FoodMenuPublication> { return result(() => publication(input, contexts(presentations, offers))); }
export function reviseFoodMenuPublication(previous: unknown, next: unknown, previousPresentations: unknown, previousOffers: unknown, nextPresentations: unknown, nextOffers: unknown): FoodMenuValidationResult<FoodMenuPublication> {
    return result(() => { const p = publication(previous, contexts(previousPresentations, previousOffers)); const n = publication(next, contexts(nextPresentations, nextOffers)); if (p.publicationId !== n.publicationId || p.version === Number.MAX_SAFE_INTEGER || n.version !== p.version + 1) return fail(); return n; });
}
export function projectFoodPublicMenu(input: unknown, presentations: unknown, offers: unknown, availabilities: unknown): FoodPublicMenuResult {
    return result(() => {
        const context = contexts(presentations, offers); const p = publication(input, context); const observations = new Map<string, FoodServingOfferAvailability>();
        for (const item of array(availabilities, 40000)) { const a = availability(item); const k = key(a.offer.offerId, a.offer.version); if (!context.serving.has(k) || observations.has(k)) return fail(); observations.set(k, a); }
        if (p.state === "unpublished") return { state: "unpublished" } as const;
        const sections: FoodPublicMenuSection[] = p.sections.map(s => ({ key: s.key, title: s.title, entries: s.entries.map(e => {
            const d = context.dishes.get(key(e.presentation.dishId, e.presentation.version))!;
            const projectedOffers: FoodPublicMenuOffer[] = e.offers.map(selected => {
                const o = context.serving.get(key(selected.offer.offerId, selected.offer.version))!;
                const descriptors: { packagingDescription?: FoodUnresolvedText; storageSummary?: FoodUnresolvedText; reheatingSummary?: FoodUnresolvedText } = {};
                for (const field of descriptorKeys) if (selected.selection[field]) descriptors[field] = validateFoodUnresolvedText(o[field]);
                const a = selected.selection.availability ? observations.get(key(o.offerId, o.version)) : undefined;
                return { offerId: o.offerId, version: o.version, presentation: { dishId: o.presentation.dishId, version: o.presentation.version }, intent: selected.intent, format: validateFoodServingFormat(o.format), servingEstimate: validateFoodServingEstimate(o.servingEstimate), ...descriptors, ...(a === undefined ? {} : { availability: availability(a) }) };
            });
            return { dishId: d.dishId, presentationVersion: d.version, name: d.name, ...(e.selection.shortDescription ? { shortDescription: d.shortDescription! } : {}), ...(e.selection.longDescription ? { longDescription: d.longDescription! } : {}), mediaReferences: e.selection.mediaReferences.map(reference => ({ reference })), offers: projectedOffers };
        }) }));
        return { state: "published", menu: { publicationId: p.publicationId, version: p.version, title: p.title, sections } } as const;
    });
}
