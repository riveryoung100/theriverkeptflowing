import type { FoodPrivateMenuService, FoodMenuServiceErrorCode } from "./private-menu-service";
import type { FoodServingOfferId, FoodServingOffer } from "./dish-offer-domain";
import type { FoodMenuPublication, FoodServingOfferAvailability } from "./menu-publication-domain";

export type FoodMenuWorkspaceResult<T> = Readonly<{ ok: true; value: T } | { ok: false; error: Readonly<{ code: FoodMenuServiceErrorCode; message: string }> }>;
export type FoodMenuWorkspaceMutation<T> = Readonly<{ outcome: "created" | "already-present"; snapshot: T; message: string; publicationLabel?: string } | { outcome: "conflict"; message: string }>;
export type FoodMenuWorkspaceRead<T> = Readonly<{ outcome: "found"; snapshot: T; message: string; publicationLabel?: string } | { outcome: "not-found"; message: string }>;
export type FoodMenuWorkspacePage<T, C> = Readonly<{ items: readonly T[]; nextCursor?: C; message?: "No snapshots returned." }>;
export type FoodMenuWorkspaceOfferDetail = Readonly<{ outcome: "not-found"; message: "No snapshot recorded." } | { outcome: "found"; snapshot: FoodServingOffer; message: "Snapshot found."; availability: Readonly<{ state: "not-recorded" }> | Readonly<{ state: "recorded"; observation: FoodServingOfferAvailability }> }>;
type Value<R> = R extends { readonly ok: true; readonly value: infer T } ? T : never;
type Snapshot<V> = V extends { readonly snapshot: infer T } ? T : never;
type Page<V> = V extends { readonly items: readonly (infer T)[]; readonly nextCursor?: infer C } ? FoodMenuWorkspacePage<T, C> : never;
type Presentation<K extends keyof FoodPrivateMenuService> = K extends `create${string}` | `append${string}` ? FoodMenuWorkspaceMutation<Snapshot<Value<Awaited<ReturnType<FoodPrivateMenuService[K]>>>>> : K extends `get${string}` ? FoodMenuWorkspaceRead<Snapshot<Value<Awaited<ReturnType<FoodPrivateMenuService[K]>>>>> : Page<Value<Awaited<ReturnType<FoodPrivateMenuService[K]>>>>;
export type FoodPrivateMenuWorkspaceController = Readonly<{ [K in keyof FoodPrivateMenuService]: (...args: Parameters<FoodPrivateMenuService[K]>) => Promise<FoodMenuWorkspaceResult<Presentation<K>>> } & { getOfferWorkspaceDetail(offerId: FoodServingOfferId, offerVersion: number): Promise<FoodMenuWorkspaceResult<FoodMenuWorkspaceOfferDetail>> }>;
export const FOOD_MENU_WORKSPACE_FEEDBACK = Object.freeze({
    unauthenticated: "Authentication is required.", forbidden: "Food menu access is denied.", "access-unavailable": "Food menu access could not be checked.", "invalid-input": "The food menu operation input is invalid.", storage: "Food menu storage is unavailable. Reconcile the result before retrying.",
});
export function getFoodMenuPublicationWorkspaceLabel(state: FoodMenuPublication["state"]): "Publication snapshot: unpublished" | "Publication snapshot: published" {
    if (state === "unpublished") return "Publication snapshot: unpublished";
    if (state === "published") return "Publication snapshot: published";
    throw new TypeError("Invalid publication snapshot state.");
}
function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(); return value as Record<string, unknown>; }
function keys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): void { const own = Reflect.ownKeys(value); if (required.some(k => !own.includes(k)) || own.some(k => typeof k !== "string" || ![...required, ...optional].includes(k))) throw new TypeError(); }
function detached<T>(value: T, ancestors = new Set<object>()): T {
    if (value === null || typeof value !== "object") { if (["function", "symbol", "bigint"].includes(typeof value)) throw new TypeError(); return value; }
    if (ancestors.has(value)) throw new TypeError(); ancestors.add(value);
    try {
        if (Array.isArray(value)) return Object.freeze(value.map(item => detached(item, ancestors))) as T;
        const copy: Record<string, unknown> = {};
        for (const key of Reflect.ownKeys(value)) { if (typeof key !== "string") throw new TypeError(); Object.defineProperty(copy, key, { value: detached((value as Record<string, unknown>)[key], ancestors), enumerable: true }); }
        return Object.freeze(copy) as T;
    } finally { ancestors.delete(value); }
}
function success<T>(value: T): FoodMenuWorkspaceResult<T> { return Object.freeze({ ok: true, value: detached(value) }); }
function failure(code: FoodMenuServiceErrorCode): FoodMenuWorkspaceResult<never> { return Object.freeze({ ok: false, error: Object.freeze({ code, message: FOOD_MENU_WORKSPACE_FEEDBACK[code] }) }); }
type Shape = "append" | "read" | "history" | "latest";
function validateValue(value: unknown, shape: Shape): Record<string, unknown> {
    const r = record(value);
    if (shape === "append" || shape === "read") {
        if ((shape === "append" && (r.outcome === "created" || r.outcome === "already-present")) || (shape === "read" && r.outcome === "found")) { keys(r, ["outcome", "snapshot"]); record(r.snapshot); }
        else if (shape === "append" && r.outcome === "conflict") { keys(r, ["outcome", "reason"]); if (r.reason !== "different-content") throw new TypeError(); }
        else if (shape === "read" && r.outcome === "not-found") keys(r, ["outcome"]);
        else throw new TypeError();
    } else {
        keys(r, ["items"], ["nextCursor"]); if (!Array.isArray(r.items)) throw new TypeError(); r.items.forEach(record);
        if (r.nextCursor !== undefined && (shape === "history" ? typeof r.nextCursor !== "number" || !Number.isSafeInteger(r.nextCursor) || r.nextCursor < 1 : typeof r.nextCursor !== "string")) throw new TypeError();
    }
    return r;
}
function serviceResult(value: unknown, shape: Shape): FoodMenuWorkspaceResult<Record<string, unknown>> {
    const r = record(value);
    if (r.ok === false) { keys(r, ["ok", "error"]); const e = record(r.error); keys(e, ["code", "message"]); if (typeof e.message !== "string" || typeof e.code !== "string" || !Object.prototype.hasOwnProperty.call(FOOD_MENU_WORKSPACE_FEEDBACK, e.code as PropertyKey)) throw new TypeError(); return failure(e.code as FoodMenuServiceErrorCode); }
    if (r.ok !== true) throw new TypeError(); keys(r, ["ok", "value"]); return { ok: true, value: validateValue(r.value, shape) };
}
function present(r: Record<string, unknown>, shape: Shape, publication: boolean): unknown {
    if (shape === "history" || shape === "latest") {
        if (publication) for (const item of r.items as unknown[]) getFoodMenuPublicationWorkspaceLabel(record(item).state as FoodMenuPublication["state"]);
        return { items: r.items, ...(Object.prototype.hasOwnProperty.call(r, "nextCursor") ? { nextCursor: r.nextCursor } : {}), ...((r.items as unknown[]).length === 0 ? { message: "No snapshots returned." } : {}) };
    }
    if (r.outcome === "conflict") return { outcome: "conflict", message: "A different version already exists. Refresh and reconcile before retrying." };
    if (r.outcome === "not-found") return { outcome: "not-found", message: "No snapshot recorded." };
    return { outcome: r.outcome, snapshot: r.snapshot, message: r.outcome === "created" ? "Snapshot recorded." : r.outcome === "already-present" ? "Identical snapshot already recorded." : "Snapshot found.", ...(publication ? { publicationLabel: getFoodMenuPublicationWorkspaceLabel(record(r.snapshot).state as FoodMenuPublication["state"]) } : {}) };
}
/** Presentation delegates access decisions; construction performs structural checks only. */
export function createPrivateFoodMenuWorkspaceController(service: FoodPrivateMenuService): FoodPrivateMenuWorkspaceController {
    try { const input = record(service); for (const method of methods) if (typeof input[method] !== "function") throw new TypeError(); }
    catch { throw new TypeError("Private food menu workspace configuration is unavailable."); }
    async function run<T>(operation: () => Promise<unknown>, shape: Shape, publication = false): Promise<FoodMenuWorkspaceResult<T>> {
        try { const result = serviceResult(await operation(), shape); if (!result.ok) return result; return success(present(result.value, shape, publication) as T); }
        catch { return failure("storage"); }
    }
    return Object.freeze({
        createInitialPresentation(...args: Parameters<FoodPrivateMenuService["createInitialPresentation"]>): ReturnType<FoodPrivateMenuWorkspaceController["createInitialPresentation"]> { return run(() => service.createInitialPresentation(...args), "append", false); },
        appendPresentationRevision(...args: Parameters<FoodPrivateMenuService["appendPresentationRevision"]>): ReturnType<FoodPrivateMenuWorkspaceController["appendPresentationRevision"]> { return run(() => service.appendPresentationRevision(...args), "append", false); },
        getPresentation(...args: Parameters<FoodPrivateMenuService["getPresentation"]>): ReturnType<FoodPrivateMenuWorkspaceController["getPresentation"]> { return run(() => service.getPresentation(...args), "read", false); },
        getLatestPresentation(...args: Parameters<FoodPrivateMenuService["getLatestPresentation"]>): ReturnType<FoodPrivateMenuWorkspaceController["getLatestPresentation"]> { return run(() => service.getLatestPresentation(...args), "read", false); },
        listPresentationVersions(...args: Parameters<FoodPrivateMenuService["listPresentationVersions"]>): ReturnType<FoodPrivateMenuWorkspaceController["listPresentationVersions"]> { return run(() => service.listPresentationVersions(...args), "history", false); },
        listLatestPresentations(...args: Parameters<FoodPrivateMenuService["listLatestPresentations"]>): ReturnType<FoodPrivateMenuWorkspaceController["listLatestPresentations"]> { return run(() => service.listLatestPresentations(...args), "latest", false); },
        createInitialOffer(...args: Parameters<FoodPrivateMenuService["createInitialOffer"]>): ReturnType<FoodPrivateMenuWorkspaceController["createInitialOffer"]> { return run(() => service.createInitialOffer(...args), "append", false); },
        appendOfferRevision(...args: Parameters<FoodPrivateMenuService["appendOfferRevision"]>): ReturnType<FoodPrivateMenuWorkspaceController["appendOfferRevision"]> { return run(() => service.appendOfferRevision(...args), "append", false); },
        getOffer(...args: Parameters<FoodPrivateMenuService["getOffer"]>): ReturnType<FoodPrivateMenuWorkspaceController["getOffer"]> { return run(() => service.getOffer(...args), "read", false); },
        getLatestOffer(...args: Parameters<FoodPrivateMenuService["getLatestOffer"]>): ReturnType<FoodPrivateMenuWorkspaceController["getLatestOffer"]> { return run(() => service.getLatestOffer(...args), "read", false); },
        listOfferVersions(...args: Parameters<FoodPrivateMenuService["listOfferVersions"]>): ReturnType<FoodPrivateMenuWorkspaceController["listOfferVersions"]> { return run(() => service.listOfferVersions(...args), "history", false); },
        listLatestOffers(...args: Parameters<FoodPrivateMenuService["listLatestOffers"]>): ReturnType<FoodPrivateMenuWorkspaceController["listLatestOffers"]> { return run(() => service.listLatestOffers(...args), "latest", false); },
        createInitialPublication(...args: Parameters<FoodPrivateMenuService["createInitialPublication"]>): ReturnType<FoodPrivateMenuWorkspaceController["createInitialPublication"]> { return run(() => service.createInitialPublication(...args), "append", true); },
        appendPublicationRevision(...args: Parameters<FoodPrivateMenuService["appendPublicationRevision"]>): ReturnType<FoodPrivateMenuWorkspaceController["appendPublicationRevision"]> { return run(() => service.appendPublicationRevision(...args), "append", true); },
        getPublication(...args: Parameters<FoodPrivateMenuService["getPublication"]>): ReturnType<FoodPrivateMenuWorkspaceController["getPublication"]> { return run(() => service.getPublication(...args), "read", true); },
        getLatestPublication(...args: Parameters<FoodPrivateMenuService["getLatestPublication"]>): ReturnType<FoodPrivateMenuWorkspaceController["getLatestPublication"]> { return run(() => service.getLatestPublication(...args), "read", true); },
        listPublicationVersions(...args: Parameters<FoodPrivateMenuService["listPublicationVersions"]>): ReturnType<FoodPrivateMenuWorkspaceController["listPublicationVersions"]> { return run(() => service.listPublicationVersions(...args), "history", true); },
        listLatestPublications(...args: Parameters<FoodPrivateMenuService["listLatestPublications"]>): ReturnType<FoodPrivateMenuWorkspaceController["listLatestPublications"]> { return run(() => service.listLatestPublications(...args), "latest", true); },
        createInitialAvailability(...args: Parameters<FoodPrivateMenuService["createInitialAvailability"]>): ReturnType<FoodPrivateMenuWorkspaceController["createInitialAvailability"]> { return run(() => service.createInitialAvailability(...args), "append", false); },
        appendAvailabilityRevision(...args: Parameters<FoodPrivateMenuService["appendAvailabilityRevision"]>): ReturnType<FoodPrivateMenuWorkspaceController["appendAvailabilityRevision"]> { return run(() => service.appendAvailabilityRevision(...args), "append", false); },
        getAvailability(...args: Parameters<FoodPrivateMenuService["getAvailability"]>): ReturnType<FoodPrivateMenuWorkspaceController["getAvailability"]> { return run(() => service.getAvailability(...args), "read", false); },
        listAvailabilityRevisions(...args: Parameters<FoodPrivateMenuService["listAvailabilityRevisions"]>): ReturnType<FoodPrivateMenuWorkspaceController["listAvailabilityRevisions"]> { return run(() => service.listAvailabilityRevisions(...args), "history", false); },
        getCurrentAvailability(...args: Parameters<FoodPrivateMenuService["getCurrentAvailability"]>): ReturnType<FoodPrivateMenuWorkspaceController["getCurrentAvailability"]> { return run(() => service.getCurrentAvailability(...args), "read", false); },
        async getOfferWorkspaceDetail(offerId: FoodServingOfferId, offerVersion: number): Promise<FoodMenuWorkspaceResult<FoodMenuWorkspaceOfferDetail>> {
            try {
                const offer = serviceResult(await service.getOffer(offerId, offerVersion), "read");
                if (!offer.ok) return offer;
                if (offer.value.outcome === "not-found") return success({ outcome: "not-found", message: "No snapshot recorded." });
                const snapshot = record(offer.value.snapshot);
                if (snapshot.offerId !== offerId || snapshot.version !== offerVersion) return failure("storage");
                const availability = serviceResult(await service.getCurrentAvailability(offerId, offerVersion), "read");
                if (!availability.ok) return availability;
                if (availability.value.outcome === "not-found") return success({ outcome: "found", snapshot: snapshot as unknown as FoodServingOffer, message: "Snapshot found.", availability: { state: "not-recorded" } });
                const observation = record(availability.value.snapshot); const reference = record(observation.offer);
                if (reference.offerId !== offerId || reference.version !== offerVersion) return failure("storage");
                return success({ outcome: "found", snapshot: snapshot as unknown as FoodServingOffer, message: "Snapshot found.", availability: { state: "recorded", observation: observation as unknown as FoodServingOfferAvailability } });
            } catch { return failure("storage"); }
        },
    });
}
const methods = ["createInitialPresentation", "appendPresentationRevision", "getPresentation", "getLatestPresentation", "listPresentationVersions", "listLatestPresentations", "createInitialOffer", "appendOfferRevision", "getOffer", "getLatestOffer", "listOfferVersions", "listLatestOffers", "createInitialPublication", "appendPublicationRevision", "getPublication", "getLatestPublication", "listPublicationVersions", "listLatestPublications", "createInitialAvailability", "appendAvailabilityRevision", "getAvailability", "listAvailabilityRevisions", "getCurrentAvailability"] as const;
