import { parsePrincipalId, type PrincipalId } from "../identity/identifiers";
import type { SessionPrincipalResolver } from "../identity/session/principal-resolver";
import type { FoodMenuRepository } from "./menu-persistence";
import { parseFoodDishId, parseFoodServingOfferId } from "./dish-offer-domain";
import { parseFoodMenuPublicationId } from "./menu-publication-domain";

export type FoodMenuServiceErrorCode = "unauthenticated" | "forbidden" | "access-unavailable" | "invalid-input" | "storage";
export type FoodMenuServiceResult<T> = Readonly<{ ok: true; value: T } | { ok: false; error: Readonly<{ code: FoodMenuServiceErrorCode; message: string }> }>;
type Value<R> = R extends { readonly ok: true; readonly value: infer T } ? T : never;
export type FoodPrivateMenuService = { [K in keyof FoodMenuRepository]: (...args: Parameters<FoodMenuRepository[K]>) => Promise<FoodMenuServiceResult<Value<Awaited<ReturnType<FoodMenuRepository[K]>>>>> };
export interface FoodPrivateMenuServiceDependencies { readonly repository: FoodMenuRepository; readonly callerResolver: SessionPrincipalResolver; readonly administratorPrincipalId: PrincipalId }
const messages = Object.freeze({ unauthenticated: "Authentication is required.", forbidden: "Food menu access is forbidden.", "access-unavailable": "Food menu access is unavailable.", "invalid-input": "Invalid food menu operation input.", storage: "Food menu storage is unavailable." });
function failure(code: FoodMenuServiceErrorCode): FoodMenuServiceResult<never> { return Object.freeze({ ok: false, error: Object.freeze({ code, message: messages[code] }) }); }
function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(); return value as Record<string, unknown>; }
function keys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): void { const own = Reflect.ownKeys(value); if (required.some(k => !own.includes(k)) || own.some(k => typeof k !== "string" || ![...required, ...optional].includes(k))) throw new TypeError(); }
type Shape = "append" | "read" | "history" | "dish" | "offer" | "publication";
function validateValue(value: unknown, shape: Shape): void {
    const r = record(value);
    if (shape === "append" || shape === "read") {
        if ((shape === "append" && (r.outcome === "created" || r.outcome === "already-present")) || (shape === "read" && r.outcome === "found")) { keys(r, ["outcome", "snapshot"]); record(r.snapshot); }
        else if (shape === "append" && r.outcome === "conflict") { keys(r, ["outcome", "reason"]); if (r.reason !== "different-content") throw new TypeError(); }
        else if (shape === "read" && r.outcome === "not-found") keys(r, ["outcome"]);
        else throw new TypeError();
    } else {
        keys(r, ["items"], ["nextCursor"]); if (!Array.isArray(r.items)) throw new TypeError();
        if (r.nextCursor !== undefined) {
            if (shape === "history") { if (typeof r.nextCursor !== "number" || !Number.isSafeInteger(r.nextCursor) || r.nextCursor < 1) throw new TypeError(); }
            else if (shape === "dish") parseFoodDishId(r.nextCursor);
            else if (shape === "offer") parseFoodServingOfferId(r.nextCursor);
            else parseFoodMenuPublicationId(r.nextCursor);
        }
    }
}
export class SingleAdminFoodMenuService implements FoodPrivateMenuService {
    readonly #repository: FoodMenuRepository;
    readonly #resolver: SessionPrincipalResolver;
    readonly #administrator: PrincipalId;
    constructor(dependencies: FoodPrivateMenuServiceDependencies) {
        try {
            const input = record(dependencies); const repository = record(input.repository); const resolver = record(input.callerResolver);
            for (const method of methods) if (typeof repository[method] !== "function") throw new TypeError();
            if (typeof resolver.resolve !== "function") throw new TypeError();
            this.#administrator = parsePrincipalId(input.administratorPrincipalId);
            this.#repository = repository as unknown as FoodMenuRepository; this.#resolver = resolver as unknown as SessionPrincipalResolver;
        } catch { throw new TypeError("Private food menu service configuration is unavailable."); }
    }
    async #authorize(): Promise<"unauthenticated" | "forbidden" | "access-unavailable" | undefined> {
        try {
            const r = record(await this.#resolver.resolve());
            if (r.ok === false) { keys(r, ["ok", "error"]); const e = record(r.error); keys(e, ["code", "message"]); if (typeof e.message !== "string") return "access-unavailable"; return e.code === "unauthenticated" ? "unauthenticated" : "access-unavailable"; }
            if (r.ok !== true) return "access-unavailable";
            keys(r, ["ok", "value"]); const caller = record(r.value); keys(caller, ["principalId"]);
            return parsePrincipalId(caller.principalId) === this.#administrator ? undefined : "forbidden";
        } catch { return "access-unavailable"; }
    }
    async #run<T>(operation: () => Promise<unknown>, shape: Shape): Promise<FoodMenuServiceResult<T>> {
        const denied = await this.#authorize(); if (denied) return failure(denied);
        try {
            const r = record(await operation());
            if (r.ok === false) { keys(r, ["ok", "error"]); const e = record(r.error); keys(e, ["code", "message"]); if (typeof e.message !== "string" || (e.code !== "invalid-input" && e.code !== "storage")) return failure("storage"); return failure(e.code); }
            if (r.ok !== true) return failure("storage"); keys(r, ["ok", "value"]); validateValue(r.value, shape);
            return Object.freeze({ ok: true, value: r.value as T });
        } catch { return failure("storage"); }
    }
    createInitialPresentation(...args: Parameters<FoodMenuRepository["createInitialPresentation"]>): ReturnType<FoodPrivateMenuService["createInitialPresentation"]> { return this.#run(() => this.#repository.createInitialPresentation(...args), "append"); }
    appendPresentationRevision(...args: Parameters<FoodMenuRepository["appendPresentationRevision"]>): ReturnType<FoodPrivateMenuService["appendPresentationRevision"]> { return this.#run(() => this.#repository.appendPresentationRevision(...args), "append"); }
    getPresentation(...args: Parameters<FoodMenuRepository["getPresentation"]>): ReturnType<FoodPrivateMenuService["getPresentation"]> { return this.#run(() => this.#repository.getPresentation(...args), "read"); }
    getLatestPresentation(...args: Parameters<FoodMenuRepository["getLatestPresentation"]>): ReturnType<FoodPrivateMenuService["getLatestPresentation"]> { return this.#run(() => this.#repository.getLatestPresentation(...args), "read"); }
    listPresentationVersions(...args: Parameters<FoodMenuRepository["listPresentationVersions"]>): ReturnType<FoodPrivateMenuService["listPresentationVersions"]> { return this.#run(() => this.#repository.listPresentationVersions(...args), "history"); }
    listLatestPresentations(...args: Parameters<FoodMenuRepository["listLatestPresentations"]>): ReturnType<FoodPrivateMenuService["listLatestPresentations"]> { return this.#run(() => this.#repository.listLatestPresentations(...args), "dish"); }
    createInitialOffer(...args: Parameters<FoodMenuRepository["createInitialOffer"]>): ReturnType<FoodPrivateMenuService["createInitialOffer"]> { return this.#run(() => this.#repository.createInitialOffer(...args), "append"); }
    appendOfferRevision(...args: Parameters<FoodMenuRepository["appendOfferRevision"]>): ReturnType<FoodPrivateMenuService["appendOfferRevision"]> { return this.#run(() => this.#repository.appendOfferRevision(...args), "append"); }
    getOffer(...args: Parameters<FoodMenuRepository["getOffer"]>): ReturnType<FoodPrivateMenuService["getOffer"]> { return this.#run(() => this.#repository.getOffer(...args), "read"); }
    getLatestOffer(...args: Parameters<FoodMenuRepository["getLatestOffer"]>): ReturnType<FoodPrivateMenuService["getLatestOffer"]> { return this.#run(() => this.#repository.getLatestOffer(...args), "read"); }
    listOfferVersions(...args: Parameters<FoodMenuRepository["listOfferVersions"]>): ReturnType<FoodPrivateMenuService["listOfferVersions"]> { return this.#run(() => this.#repository.listOfferVersions(...args), "history"); }
    listLatestOffers(...args: Parameters<FoodMenuRepository["listLatestOffers"]>): ReturnType<FoodPrivateMenuService["listLatestOffers"]> { return this.#run(() => this.#repository.listLatestOffers(...args), "offer"); }
    createInitialPublication(...args: Parameters<FoodMenuRepository["createInitialPublication"]>): ReturnType<FoodPrivateMenuService["createInitialPublication"]> { return this.#run(() => this.#repository.createInitialPublication(...args), "append"); }
    appendPublicationRevision(...args: Parameters<FoodMenuRepository["appendPublicationRevision"]>): ReturnType<FoodPrivateMenuService["appendPublicationRevision"]> { return this.#run(() => this.#repository.appendPublicationRevision(...args), "append"); }
    getPublication(...args: Parameters<FoodMenuRepository["getPublication"]>): ReturnType<FoodPrivateMenuService["getPublication"]> { return this.#run(() => this.#repository.getPublication(...args), "read"); }
    getLatestPublication(...args: Parameters<FoodMenuRepository["getLatestPublication"]>): ReturnType<FoodPrivateMenuService["getLatestPublication"]> { return this.#run(() => this.#repository.getLatestPublication(...args), "read"); }
    listPublicationVersions(...args: Parameters<FoodMenuRepository["listPublicationVersions"]>): ReturnType<FoodPrivateMenuService["listPublicationVersions"]> { return this.#run(() => this.#repository.listPublicationVersions(...args), "history"); }
    listLatestPublications(...args: Parameters<FoodMenuRepository["listLatestPublications"]>): ReturnType<FoodPrivateMenuService["listLatestPublications"]> { return this.#run(() => this.#repository.listLatestPublications(...args), "publication"); }
    createInitialAvailability(...args: Parameters<FoodMenuRepository["createInitialAvailability"]>): ReturnType<FoodPrivateMenuService["createInitialAvailability"]> { return this.#run(() => this.#repository.createInitialAvailability(...args), "append"); }
    appendAvailabilityRevision(...args: Parameters<FoodMenuRepository["appendAvailabilityRevision"]>): ReturnType<FoodPrivateMenuService["appendAvailabilityRevision"]> { return this.#run(() => this.#repository.appendAvailabilityRevision(...args), "append"); }
    getAvailability(...args: Parameters<FoodMenuRepository["getAvailability"]>): ReturnType<FoodPrivateMenuService["getAvailability"]> { return this.#run(() => this.#repository.getAvailability(...args), "read"); }
    listAvailabilityRevisions(...args: Parameters<FoodMenuRepository["listAvailabilityRevisions"]>): ReturnType<FoodPrivateMenuService["listAvailabilityRevisions"]> { return this.#run(() => this.#repository.listAvailabilityRevisions(...args), "history"); }
    getCurrentAvailability(...args: Parameters<FoodMenuRepository["getCurrentAvailability"]>): ReturnType<FoodPrivateMenuService["getCurrentAvailability"]> { return this.#run(() => this.#repository.getCurrentAvailability(...args), "read"); }
}
const methods = ["createInitialPresentation", "appendPresentationRevision", "getPresentation", "getLatestPresentation", "listPresentationVersions", "listLatestPresentations", "createInitialOffer", "appendOfferRevision", "getOffer", "getLatestOffer", "listOfferVersions", "listLatestOffers", "createInitialPublication", "appendPublicationRevision", "getPublication", "getLatestPublication", "listPublicationVersions", "listLatestPublications", "createInitialAvailability", "appendAvailabilityRevision", "getAvailability", "listAvailabilityRevisions", "getCurrentAvailability"] as const;
