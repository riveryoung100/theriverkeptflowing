/** FOOD-004A: exact informational reads; canonical projector is public authority. */
import { parseFoodProductId, parseFoodRecipeId, validateFoodVersion } from "./draft-domain";
import { parseFoodDishId, parseFoodServingOfferId } from "./dish-offer-domain";
import { parseFoodMenuPublicationId, projectFoodPublicMenu, type FoodPublicMenuProjection, type FoodMenuPublicationId } from "./menu-publication-domain";
import type { FoodMenuRepository, FoodMenuReadDependencies } from "./menu-persistence";

export const MAX_PUBLIC_MENU_REFERENCES = 100;
export type FoodPublicMenuReadResult = Readonly<{ status: "found"; menu: FoodPublicMenuProjection }> |
    Readonly<{ status: "invalid-input" | "not-found" | "not-published" | "unavailable" }>;
export interface FoodPublicMenuReadService { readPublicMenu(reference: unknown): Promise<FoodPublicMenuReadResult> }
export type FoodPublicMenuReadRepository = Pick<FoodMenuRepository, "getPublication" | "getPresentation" | "getOffer">;
export interface FoodPublicMenuReadServiceDependencies { readonly repository: FoodPublicMenuReadRepository; readonly readDependencies: FoodMenuReadDependencies }
function record(v: unknown, allowed: readonly string[]): Record<string, unknown> {
    if (!v || typeof v !== "object" || Array.isArray(v) || Reflect.ownKeys(v).some(k => typeof k !== "string" || !allowed.includes(k))) throw new TypeError();
    return v as Record<string, unknown>;
}
function array(v: unknown, max: number): unknown[] { if (!Array.isArray(v) || v.length > max) throw new TypeError(); return Array.from(v); }
function status(value: "invalid-input" | "not-found" | "not-published" | "unavailable"): FoodPublicMenuReadResult { return Object.freeze({ status: value }); }
/** Capture untrusted repository snapshots before any later asynchronous read. */
function snapshot(v: unknown): unknown {
    let nodes = 0; const ancestors = new Set<object>();
    function copy(value: unknown, depth: number): unknown {
        if (++nodes > 100000 || depth > 20) throw new TypeError();
        if (value === null || value === undefined || typeof value === "string" || typeof value === "boolean" || typeof value === "number") return value;
        if (typeof value !== "object" || ancestors.has(value)) throw new TypeError();
        ancestors.add(value);
        let result: unknown;
        if (Array.isArray(value)) result = Object.freeze(array(value, 40000).map(item => copy(item, depth + 1)));
        else {
            const entries = Reflect.ownKeys(value).map(key => { if (typeof key !== "string") throw new TypeError(); return [key, copy((value as Record<string, unknown>)[key], depth + 1)] as const; });
            result = Object.freeze(Object.fromEntries(entries));
        }
        ancestors.delete(value); return result;
    }
    return copy(v, 0);
}
function readOutcome(v: unknown): unknown | undefined {
    const r = record(v, ["outcome", "snapshot"]);
    if (r.outcome === "not-found") { record(v, ["outcome"]); return undefined; }
    if (r.outcome !== "found" || r.snapshot === undefined) throw new TypeError();
    return snapshot(r.snapshot);
}
function menuOutcome(v: unknown): unknown | undefined {
    const r = record(v, ["ok", "value", "error"]);
    if (r.ok !== true) throw new TypeError();
    record(v, ["ok", "value"]); return readOutcome(r.value);
}
function exact(v: unknown, idField: string, id: string, version: number): Record<string, unknown> {
    if (!v || typeof v !== "object" || Array.isArray(v)) throw new TypeError();
    const r = v as Record<string, unknown>;
    if (r[idField] !== id || r.version !== version) throw new TypeError(); return r;
}
function key(id: string, version: number): string { return JSON.stringify([id, version]); }
export function createFoodPublicMenuReadService(dependencies: FoodPublicMenuReadServiceDependencies): FoodPublicMenuReadService {
    let repository: FoodPublicMenuReadRepository; let drafts: FoodMenuReadDependencies;
    let getPublication: FoodPublicMenuReadRepository["getPublication"]; let getPresentation: FoodPublicMenuReadRepository["getPresentation"]; let getOffer: FoodPublicMenuReadRepository["getOffer"];
    let getProduct: FoodMenuReadDependencies["getProduct"]; let getRecipe: FoodMenuReadDependencies["getRecipe"];
    try {
        repository = dependencies.repository; drafts = dependencies.readDependencies;
        getPublication = repository.getPublication; getPresentation = repository.getPresentation; getOffer = repository.getOffer;
        getProduct = drafts.getProduct; getRecipe = drafts.getRecipe;
        if ([getPublication, getPresentation, getOffer, getProduct, getRecipe].some(fn => typeof fn !== "function")) throw new TypeError();
    } catch { throw new TypeError("Public food menu read configuration is unavailable."); }
    return Object.freeze({ async readPublicMenu(input: unknown): Promise<FoodPublicMenuReadResult> {
        let publicationId: FoodMenuPublicationId; let version: number;
        try { const ref = record(input, ["publicationId", "version"]); publicationId = parseFoodMenuPublicationId(ref.publicationId); version = validateFoodVersion(ref.version); }
        catch { return status("invalid-input"); }
        try {
            const value = menuOutcome(await getPublication.call(repository, publicationId, version));
            if (value === undefined) return status("not-found");
            const publication = exact(value, "publicationId", publicationId, version);
            record(publication, ["publicationId", "version", "state", "title", "sections"]);
            if (publication.state === "unpublished") return status("not-published");
            if (publication.state !== "published") throw new TypeError();
            const presentations = new Map<string, { id: ReturnType<typeof parseFoodDishId>; version: number }>();
            const offers = new Map<string, { id: ReturnType<typeof parseFoodServingOfferId>; version: number }>();
            for (const section of array(publication.sections, 20)) {
                const s = record(section, ["key", "title", "entries"]);
                for (const entry of array(s.entries, 100)) {
                    const e = record(entry, ["presentation", "selection", "offers"]); const p = record(e.presentation, ["dishId", "version"]);
                    const id = parseFoodDishId(p.dishId); const v = validateFoodVersion(p.version); presentations.set(key(id, v), { id, version: v });
                    for (const selected of array(e.offers, 20)) {
                        const o = record(selected, ["offer", "intent", "selection"]); const ref = record(o.offer, ["offerId", "version"]);
                        const id = parseFoodServingOfferId(ref.offerId); const v = validateFoodVersion(ref.version); offers.set(key(id, v), { id, version: v });
                    }
                    if (presentations.size + offers.size > MAX_PUBLIC_MENU_REFERENCES) throw new TypeError();
                }
            }
            const contexts: unknown[] = []; const productCache = new Map<string, unknown>(); const recipeCache = new Map<string, unknown>();
            for (const ref of presentations.values()) {
                const p = exact(menuOutcome(await getPresentation.call(repository, ref.id, ref.version)), "dishId", ref.id, ref.version);
                const productRef = record(p.product, ["id", "version"]); const productId = parseFoodProductId(productRef.id); const productVersion = validateFoodVersion(productRef.version);
                const recipeRef = record(p.recipe, ["id", "version"]); const recipeId = parseFoodRecipeId(recipeRef.id); const recipeVersion = validateFoodVersion(recipeRef.version);
                const pk = key(productId, productVersion); const rk = key(recipeId, recipeVersion);
                if (!productCache.has(pk)) productCache.set(pk, exact(readOutcome(await getProduct.call(drafts, productId, productVersion)), "id", productId, productVersion));
                if (!recipeCache.has(rk)) recipeCache.set(rk, exact(readOutcome(await getRecipe.call(drafts, recipeId, recipeVersion)), "id", recipeId, recipeVersion));
                contexts.push({ presentation: p, product: productCache.get(pk), recipe: recipeCache.get(rk) });
            }
            const resolvedOffers: unknown[] = [];
            for (const ref of offers.values()) resolvedOffers.push(exact(menuOutcome(await getOffer.call(repository, ref.id, ref.version)), "offerId", ref.id, ref.version));
            const projection = projectFoodPublicMenu(publication, contexts, resolvedOffers, []);
            if (!projection.ok || projection.value.state !== "published") return status("unavailable");
            return Object.freeze({ status: "found", menu: projection.value.menu });
        } catch { return status("unavailable"); }
    } });
}
