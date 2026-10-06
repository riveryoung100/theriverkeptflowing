/** FOOD-002D: instance-local immutable histories; no exposure or access authority. */
import { parseFoodProductId, parseFoodRecipeId, validateFoodVersion, validateFoodRecipeDraft, validateFoodProductDraft, type FoodProductDraft, type FoodRecipeDraft } from "./draft-domain";
import type { FoodDraftRepository } from "./draft-persistence";
import { parseFoodDishId, parseFoodServingOfferId, validateFoodDishPresentation, validateFoodServingOffer, reviseFoodDishPresentation, reviseFoodServingOffer, type FoodDishId, type FoodServingOfferId, type FoodDishPresentation, type FoodServingOffer } from "./dish-offer-domain";
import { parseFoodMenuPublicationId, validateFoodMenuPublication, reviseFoodMenuPublication, validateFoodServingOfferAvailability, type FoodMenuPublicationId, type FoodMenuPublication, type FoodServingOfferAvailability, type FoodDishPresentationContext } from "./menu-publication-domain";

export const FOOD_MENU_SERIALIZATION_VERSION = 1 as const;
export type FoodMenuReadDependencies = Pick<FoodDraftRepository, "getProduct" | "getRecipe">;
export type FoodMenuRepositoryResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: Readonly<{ code: "invalid-input" | "storage"; message: string }> }>;
export type FoodMenuAppendOutcome<T> = Readonly<{ outcome: "created" | "already-present"; snapshot: T }> | Readonly<{ outcome: "conflict"; reason: "different-content" }>;
export type FoodMenuReadOutcome<T> = Readonly<{ outcome: "found"; snapshot: T }> | Readonly<{ outcome: "not-found" }>;
export interface FoodMenuPage<T, C> { readonly items: readonly T[]; readonly nextCursor?: C }
export interface FoodMenuHistoryOptions { readonly limit?: number; readonly afterVersion?: number }
export interface FoodAvailabilityHistoryOptions { readonly limit?: number; readonly afterRevision?: number }
export interface FoodMenuLatestOptions<Id> { readonly limit?: number; readonly afterId?: Id }
export interface FoodMenuRepository {
    createInitialPresentation(snapshot: FoodDishPresentation): Promise<FoodMenuRepositoryResult<FoodMenuAppendOutcome<FoodDishPresentation>>>;
    appendPresentationRevision(snapshot: FoodDishPresentation, expectedPreviousVersion: number): Promise<FoodMenuRepositoryResult<FoodMenuAppendOutcome<FoodDishPresentation>>>;
    getPresentation(id: FoodDishId, version: number): Promise<FoodMenuRepositoryResult<FoodMenuReadOutcome<FoodDishPresentation>>>;
    getLatestPresentation(id: FoodDishId): Promise<FoodMenuRepositoryResult<FoodMenuReadOutcome<FoodDishPresentation>>>;
    listPresentationVersions(id: FoodDishId, options?: FoodMenuHistoryOptions): Promise<FoodMenuRepositoryResult<FoodMenuPage<FoodDishPresentation, number>>>;
    listLatestPresentations(options?: FoodMenuLatestOptions<FoodDishId>): Promise<FoodMenuRepositoryResult<FoodMenuPage<FoodDishPresentation, FoodDishId>>>;
    createInitialOffer(snapshot: FoodServingOffer): Promise<FoodMenuRepositoryResult<FoodMenuAppendOutcome<FoodServingOffer>>>;
    appendOfferRevision(snapshot: FoodServingOffer, expectedPreviousVersion: number): Promise<FoodMenuRepositoryResult<FoodMenuAppendOutcome<FoodServingOffer>>>;
    getOffer(id: FoodServingOfferId, version: number): Promise<FoodMenuRepositoryResult<FoodMenuReadOutcome<FoodServingOffer>>>;
    getLatestOffer(id: FoodServingOfferId): Promise<FoodMenuRepositoryResult<FoodMenuReadOutcome<FoodServingOffer>>>;
    listOfferVersions(id: FoodServingOfferId, options?: FoodMenuHistoryOptions): Promise<FoodMenuRepositoryResult<FoodMenuPage<FoodServingOffer, number>>>;
    listLatestOffers(options?: FoodMenuLatestOptions<FoodServingOfferId>): Promise<FoodMenuRepositoryResult<FoodMenuPage<FoodServingOffer, FoodServingOfferId>>>;
    createInitialPublication(snapshot: FoodMenuPublication): Promise<FoodMenuRepositoryResult<FoodMenuAppendOutcome<FoodMenuPublication>>>;
    appendPublicationRevision(snapshot: FoodMenuPublication, expectedPreviousVersion: number): Promise<FoodMenuRepositoryResult<FoodMenuAppendOutcome<FoodMenuPublication>>>;
    getPublication(id: FoodMenuPublicationId, version: number): Promise<FoodMenuRepositoryResult<FoodMenuReadOutcome<FoodMenuPublication>>>;
    getLatestPublication(id: FoodMenuPublicationId): Promise<FoodMenuRepositoryResult<FoodMenuReadOutcome<FoodMenuPublication>>>;
    listPublicationVersions(id: FoodMenuPublicationId, options?: FoodMenuHistoryOptions): Promise<FoodMenuRepositoryResult<FoodMenuPage<FoodMenuPublication, number>>>;
    listLatestPublications(options?: FoodMenuLatestOptions<FoodMenuPublicationId>): Promise<FoodMenuRepositoryResult<FoodMenuPage<FoodMenuPublication, FoodMenuPublicationId>>>;
    createInitialAvailability(snapshot: FoodServingOfferAvailability): Promise<FoodMenuRepositoryResult<FoodMenuAppendOutcome<FoodServingOfferAvailability>>>;
    appendAvailabilityRevision(snapshot: FoodServingOfferAvailability, expectedPreviousRevision: number): Promise<FoodMenuRepositoryResult<FoodMenuAppendOutcome<FoodServingOfferAvailability>>>;
    getAvailability(offerId: FoodServingOfferId, offerVersion: number, revision: number): Promise<FoodMenuRepositoryResult<FoodMenuReadOutcome<FoodServingOfferAvailability>>>;
    listAvailabilityRevisions(offerId: FoodServingOfferId, offerVersion: number, options?: FoodAvailabilityHistoryOptions): Promise<FoodMenuRepositoryResult<FoodMenuPage<FoodServingOfferAvailability, number>>>;
    getCurrentAvailability(offerId: FoodServingOfferId, offerVersion: number): Promise<FoodMenuRepositoryResult<FoodMenuReadOutcome<FoodServingOfferAvailability>>>;
}
type Kind = "presentation" | "offer" | "publication" | "availability";
type Snapshot = FoodDishPresentation | FoodServingOffer | FoodMenuPublication | FoodServingOfferAvailability;
type ByKind = { presentation: FoodDishPresentation; offer: FoodServingOffer; publication: FoodMenuPublication; availability: FoodServingOfferAvailability };
class StorageFailure extends Error {}
function invalid(): never { throw new TypeError("Invalid menu input"); }
function storage(): never { throw new StorageFailure(); }
function object(value: unknown, keys?: readonly string[]): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
    if (keys && Reflect.ownKeys(value).some(k => typeof k !== "string" || !keys.includes(k))) return invalid();
    return value as Record<string, unknown>;
}
function array(value: unknown, max: number): unknown[] { if (!Array.isArray(value) || value.length > max) return invalid(); return Array.from(value); }
function freeze<T>(value: T): T { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
function success<T>(value: T): FoodMenuRepositoryResult<T> { return freeze({ ok: true, value }); }
function failure(error: unknown): FoodMenuRepositoryResult<never> {
    const code = error instanceof StorageFailure ? "storage" : "invalid-input";
    return freeze({ ok: false, error: { code, message: code === "storage" ? "Food menu repository storage is unavailable." : "Food menu repository input could not be validated." } });
}
function sync<T>(fn: () => T): FoodMenuRepositoryResult<T> { try { return success(fn()); } catch (e) { return failure(e); } }
function unwrap<T>(value: { readonly ok: true; readonly value: T } | { readonly ok: false }): T { if (!value.ok) return invalid(); return value.value; }
/** Capture before the first await, without dropping unsupported properties or undefined. */
function capture(value: unknown, ancestors = new Set<object>()): unknown {
    if (!value || typeof value !== "object") { if (typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") return invalid(); return value; }
    if (ancestors.has(value)) return invalid(); ancestors.add(value);
    try {
        if (Array.isArray(value)) {
            if (Reflect.ownKeys(value).some(k => typeof k !== "string" || (k !== "length" && !/^(0|[1-9][0-9]*)$/.test(k)))) return invalid();
            return Array.from(value, item => capture(item, ancestors));
        }
        const result: Record<string, unknown> = Object.create(null);
        for (const k of Reflect.ownKeys(value)) { if (typeof k !== "string") return invalid(); result[k] = capture((value as Record<string, unknown>)[k], ancestors); }
        return result;
    } finally { ancestors.delete(value); }
}
function canonical(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical((value as Record<string, unknown>)[k])]));
    return value;
}
function coordinates(kind: Kind, value: unknown): { id: string; version: number; sequence: number; stream: string } {
    const r = object(value);
    const id = kind === "presentation" ? parseFoodDishId(r.dishId) : kind === "publication" ? parseFoodMenuPublicationId(r.publicationId) : kind === "offer" ? parseFoodServingOfferId(r.offerId) : parseFoodServingOfferId(object(r.offer).offerId);
    const version = validateFoodVersion(kind === "availability" ? object(r.offer).version : r.version);
    const sequence = kind === "availability" ? validateFoodVersion(r.revision) : version;
    return { id, version, sequence, stream: kind === "availability" ? JSON.stringify([id, version]) : id };
}
function envelope(kind: Kind, snapshot: Snapshot): string {
    const c = coordinates(kind, snapshot);
    return JSON.stringify({ formatVersion: FOOD_MENU_SERIALIZATION_VERSION, recordType: kind, recordId: c.id, recordVersion: c.version, ...(kind === "availability" ? { observationRevision: c.sequence } : {}), snapshot: canonical(snapshot) });
}
function decode(serialized: unknown, kind: Kind): unknown {
    if (typeof serialized !== "string") return invalid();
    const r = object(JSON.parse(serialized), ["formatVersion", "recordType", "recordId", "recordVersion", ...(kind === "availability" ? ["observationRevision"] : []), "snapshot"]);
    if (r.formatVersion !== FOOD_MENU_SERIALIZATION_VERSION || r.recordType !== kind) return invalid();
    const c = coordinates(kind, r.snapshot);
    if (r.recordId !== c.id || r.recordVersion !== c.version || (kind === "availability" && r.observationRevision !== c.sequence)) return invalid();
    return r.snapshot;
}
function decoded<T extends Snapshot>(serialized: unknown, kind: Kind, validate: (input: unknown) => T): T {
    const snapshot = validate(decode(serialized, kind));
    if (envelope(kind, snapshot) !== serialized) return invalid();
    return snapshot;
}
export function serializeFoodDishPresentation(input: unknown, product: unknown, recipe: unknown): FoodMenuRepositoryResult<string> { return sync(() => envelope("presentation", validateFoodDishPresentation(input, product, recipe))); }
export function deserializeFoodDishPresentation(serialized: unknown, product: unknown, recipe: unknown): FoodMenuRepositoryResult<FoodDishPresentation> { return sync(() => decoded(serialized, "presentation", v => validateFoodDishPresentation(v, product, recipe))); }
export function serializeFoodServingOffer(input: unknown, presentation: unknown, product: unknown, recipe: unknown): FoodMenuRepositoryResult<string> { return sync(() => envelope("offer", validateFoodServingOffer(input, presentation, product, recipe))); }
export function deserializeFoodServingOffer(serialized: unknown, presentation: unknown, product: unknown, recipe: unknown): FoodMenuRepositoryResult<FoodServingOffer> { return sync(() => decoded(serialized, "offer", v => validateFoodServingOffer(v, presentation, product, recipe))); }
export function serializeFoodMenuPublication(input: unknown, presentations: unknown, offers: unknown): FoodMenuRepositoryResult<string> { return sync(() => envelope("publication", unwrap(validateFoodMenuPublication(input, presentations, offers)))); }
export function deserializeFoodMenuPublication(serialized: unknown, presentations: unknown, offers: unknown): FoodMenuRepositoryResult<FoodMenuPublication> { return sync(() => decoded(serialized, "publication", v => unwrap(validateFoodMenuPublication(v, presentations, offers)))); }
export function serializeFoodServingOfferAvailability(input: unknown): FoodMenuRepositoryResult<string> { return sync(() => envelope("availability", unwrap(validateFoodServingOfferAvailability(input)))); }
export function deserializeFoodServingOfferAvailability(serialized: unknown): FoodMenuRepositoryResult<FoodServingOfferAvailability> { return sync(() => decoded(serialized, "availability", v => unwrap(validateFoodServingOfferAvailability(v)))); }
type Validation<K extends Kind> = { snapshot: ByKind[K]; presentations: FoodDishPresentationContext[]; offers: FoodServingOffer[] };
function parseId(kind: Exclude<Kind, "availability">, id: unknown): string { return kind === "presentation" ? parseFoodDishId(id) : kind === "offer" ? parseFoodServingOfferId(id) : parseFoodMenuPublicationId(id); }
function maximum(rows?: Map<number, string>): number { let highest = 0; for (const n of rows?.keys() ?? []) highest = Math.max(highest, n); return highest; }
function options(value: unknown, cursor: "afterVersion" | "afterRevision" | "afterId", kind?: Exclude<Kind, "availability">) {
    const r = object(value, ["limit", cursor]); const limit = r.limit === undefined ? 20 : validateFoodVersion(r.limit); if (limit > 100) return invalid();
    const after = r[cursor] === undefined ? undefined : cursor === "afterId" ? parseId(kind!, r[cursor]) : validateFoodVersion(r[cursor]);
    return { limit, after };
}

/** Dependency-injected reference semantics only; no durability or access decision. */
export class InMemoryFoodMenuRepository implements FoodMenuRepository {
    #dependencies: FoodMenuReadDependencies;
    #rows: Record<Kind, Map<string, Map<number, string>>> = { presentation: new Map(), offer: new Map(), publication: new Map(), availability: new Map() };
    constructor(dependencies: FoodMenuReadDependencies) {
        try { const r = object(dependencies); if (typeof r.getProduct !== "function" || typeof r.getRecipe !== "function") invalid(); this.#dependencies = { getProduct: dependencies.getProduct.bind(dependencies), getRecipe: dependencies.getRecipe.bind(dependencies) }; }
        catch { throw new TypeError("Food menu repository dependencies are unavailable."); }
    }
    async #operation<T>(fn: () => Promise<T>): Promise<FoodMenuRepositoryResult<T>> { try { return success(await fn()); } catch (e) { return failure(e); } }
    async #draftContext(input: unknown, stored: boolean): Promise<{ product: FoodProductDraft; recipe: FoodRecipeDraft }> {
        const r = object(input); const p = object(r.product); const q = object(r.recipe);
        const productId = parseFoodProductId(p.id); const productVersion = validateFoodVersion(p.version); const recipeId = parseFoodRecipeId(q.id); const recipeVersion = validateFoodVersion(q.version);
        let productResult: unknown; let recipeResult: unknown;
        try { productResult = await this.#dependencies.getProduct(productId, productVersion); recipeResult = await this.#dependencies.getRecipe(recipeId, recipeVersion); } catch { return storage(); }
        const extract = (response: unknown): unknown => {
            let rr: Record<string, unknown>;
            try {
                rr = object(capture(response), ["outcome", "snapshot"]);
                if (rr.outcome === "not-found") object(rr, ["outcome"]);
                else if (rr.outcome !== "found" || rr.snapshot === undefined) return storage();
            } catch { return storage(); }
            if (rr.outcome === "not-found") { if (stored) return storage(); return invalid(); }
            try { return capture(rr.snapshot); } catch { return storage(); }
        };
        const productRaw = extract(productResult); const recipeRaw = extract(recipeResult);
        let productRecipeId: string; let productRecipeVersion: number;
        try { const ref = object(object(productRaw).recipe); productRecipeId = parseFoodRecipeId(ref.id); productRecipeVersion = validateFoodVersion(ref.version); } catch { return storage(); }
        if (productRecipeId !== recipeId || productRecipeVersion !== recipeVersion) { if (stored) return storage(); return invalid(); }
        try {
            const recipe = validateFoodRecipeDraft(recipeRaw); const product = validateFoodProductDraft(productRaw, recipe);
            if (product.id !== productId || product.version !== productVersion || recipe.id !== recipeId || recipe.version !== recipeVersion) return storage();
            return { product, recipe };
        } catch { return storage(); }
    }
    async #read<K extends Kind>(kind: K, stream: string, sequence: number): Promise<Validation<K> | undefined> {
        const payload = this.#rows[kind].get(stream)?.get(sequence); if (payload === undefined) return undefined;
        try {
            const raw = decode(payload, kind); const c = coordinates(kind, raw); if (c.stream !== stream || c.sequence !== sequence) return storage();
            const validated = await this.#validate(kind, raw, true);
            if (envelope(kind, validated.snapshot) !== payload) return storage();
            return validated;
        } catch { return storage(); }
    }
    async #required<K extends Kind>(kind: K, stream: string, sequence: number, stored: boolean): Promise<Validation<K>> {
        const found = await this.#read(kind, stream, sequence); if (!found) { if (stored) return storage(); return invalid(); } return found;
    }
    async #validate<K extends Kind>(kind: K, input: unknown, stored: boolean): Promise<Validation<K>> {
        let snapshot: Snapshot; const presentations: FoodDishPresentationContext[] = []; const offers: FoodServingOffer[] = [];
        if (kind === "presentation") {
            const c = await this.#draftContext(input, stored); const presentation = validateFoodDishPresentation(input, c.product, c.recipe);
            presentations.push({ presentation, product: c.product, recipe: c.recipe }); snapshot = presentation;
        } else if (kind === "offer") {
            const ref = object(object(input).presentation); const p = await this.#required("presentation", parseFoodDishId(ref.dishId), validateFoodVersion(ref.version), stored);
            presentations.push(...p.presentations); const c = p.presentations[0]; snapshot = validateFoodServingOffer(input, c.presentation, c.product, c.recipe);
        } else if (kind === "publication") {
            const seenP = new Set<string>(); const seenO = new Set<string>();
            for (const section of array(object(input).sections, 20)) for (const entry of array(object(section).entries, 100)) {
                const e = object(entry); const ref = object(e.presentation); const id = parseFoodDishId(ref.dishId); const version = validateFoodVersion(ref.version); const k = JSON.stringify([id, version]);
                if (!seenP.has(k)) { const p = await this.#required("presentation", id, version, stored); presentations.push(...p.presentations); seenP.add(k); }
                for (const selected of array(e.offers, 20)) {
                    const ref = object(object(selected).offer); const id = parseFoodServingOfferId(ref.offerId); const version = validateFoodVersion(ref.version); const k = JSON.stringify([id, version]);
                    if (!seenO.has(k)) { const o = await this.#required("offer", id, version, stored); offers.push(o.snapshot); seenO.add(k); }
                }
            }
            snapshot = unwrap(validateFoodMenuPublication(input, presentations, offers));
        } else {
            const a = unwrap(validateFoodServingOfferAvailability(input)); await this.#required("offer", a.offer.offerId, a.offer.version, stored); snapshot = a;
        }
        return { snapshot: snapshot as ByKind[K], presentations, offers };
    }
    async #append<K extends Kind>(kind: K, input: ByKind[K], expected?: number, revision = false): Promise<FoodMenuRepositoryResult<FoodMenuAppendOutcome<ByKind[K]>>> {
        return this.#operation(async () => {
            const captured = capture(input); const c = coordinates(kind, captured);
            if (!revision) { if (c.sequence !== 1) return invalid(); }
            else { validateFoodVersion(expected); if (expected === Number.MAX_SAFE_INTEGER || c.sequence !== expected! + 1) return invalid(); }
            const next = await this.#validate(kind, captured, false);
            if (expected !== undefined) {
                const previous = await this.#required(kind, c.stream, expected, false);
                if (kind === "presentation") { const p = previous.presentations[0]; const n = next.presentations[0]; reviseFoodDishPresentation(previous.snapshot, next.snapshot, p.product, p.recipe, n.product, n.recipe); }
                else if (kind === "offer") { const p = previous.presentations[0]; const n = next.presentations[0]; reviseFoodServingOffer(previous.snapshot, next.snapshot, p.presentation, n.presentation, p.product, p.recipe, n.product, n.recipe); }
                else if (kind === "publication") unwrap(reviseFoodMenuPublication(previous.snapshot, next.snapshot, previous.presentations, previous.offers, next.presentations, next.offers));
            }
            // Existing persisted records must reconstruct before canonical retry comparison.
            if (this.#rows[kind].get(c.stream)?.has(c.sequence)) {
                const existing = await this.#required(kind, c.stream, c.sequence, true);
                if (kind === "offer" && (existing.snapshot as FoodServingOffer).presentation.dishId !== (next.snapshot as FoodServingOffer).presentation.dishId) return invalid();
            }
            const payload = envelope(kind, next.snapshot);
            // Linearization point: no await between exact-key comparison and insertion.
            const rows = this.#rows[kind].get(c.stream) ?? new Map<number, string>(); const existing = rows.get(c.sequence);
            if (existing !== undefined && kind === "offer") {
                const storedDish = object(object(decode(existing, "offer")).presentation).dishId;
                if (storedDish !== (next.snapshot as FoodServingOffer).presentation.dishId) return invalid();
            }
            if (existing !== undefined) return existing === payload ? { outcome: "already-present", snapshot: next.snapshot } : { outcome: "conflict", reason: "different-content" };
            if (maximum(rows) !== (expected ?? 0)) return invalid();
            rows.set(c.sequence, payload); this.#rows[kind].set(c.stream, rows);
            return { outcome: "created", snapshot: next.snapshot };
        });
    }
    #exact<K extends Kind>(kind: K, id: unknown, version: unknown, revision?: unknown): Promise<FoodMenuRepositoryResult<FoodMenuReadOutcome<ByKind[K]>>> {
        return this.#operation(async () => {
            const stream = kind === "availability" ? JSON.stringify([parseFoodServingOfferId(id), validateFoodVersion(version)]) : parseId(kind, id);
            const n = validateFoodVersion(kind === "availability" ? revision : version); const found = await this.#read(kind, stream, n);
            return found ? { outcome: "found", snapshot: found.snapshot } : { outcome: "not-found" };
        });
    }
    #latest<K extends Kind>(kind: K, id: unknown, offerVersion?: unknown): Promise<FoodMenuRepositoryResult<FoodMenuReadOutcome<ByKind[K]>>> {
        return this.#operation(async () => {
            const stream = kind === "availability" ? JSON.stringify([parseFoodServingOfferId(id), validateFoodVersion(offerVersion)]) : parseId(kind, id);
            const n = maximum(this.#rows[kind].get(stream)); const found = n ? await this.#read(kind, stream, n) : undefined;
            return found ? { outcome: "found", snapshot: found.snapshot } : { outcome: "not-found" };
        });
    }
    #history<K extends Kind>(kind: K, id: unknown, opts: unknown, offerVersion?: unknown): Promise<FoodMenuRepositoryResult<FoodMenuPage<ByKind[K], number>>> {
        return this.#operation(async () => {
            const stream = kind === "availability" ? JSON.stringify([parseFoodServingOfferId(id), validateFoodVersion(offerVersion)]) : parseId(kind, id);
            const o = options(capture(opts), kind === "availability" ? "afterRevision" : "afterVersion");
            const versions = [...this.#rows[kind].get(stream)?.keys() ?? []].filter(v => o.after === undefined || v > (o.after as number)).sort((a, b) => a - b);
            const items: ByKind[K][] = []; for (const n of versions.slice(0, o.limit)) items.push((await this.#required(kind, stream, n, true)).snapshot);
            return { items, ...(versions.length > o.limit ? { nextCursor: versions[o.limit - 1] } : {}) };
        });
    }
    #list<K extends Exclude<Kind, "availability">, Id extends string>(kind: K, opts: unknown): Promise<FoodMenuRepositoryResult<FoodMenuPage<ByKind[K], Id>>> {
        return this.#operation(async () => {
            const o = options(capture(opts), "afterId", kind); const ids = [...this.#rows[kind].keys()].filter(id => o.after === undefined || id > (o.after as string)).sort();
            const items: ByKind[K][] = []; for (const id of ids.slice(0, o.limit)) items.push((await this.#required(kind, id, maximum(this.#rows[kind].get(id)), true)).snapshot);
            return { items, ...(ids.length > o.limit ? { nextCursor: ids[o.limit - 1] as Id } : {}) };
        });
    }
    createInitialPresentation(snapshot: FoodDishPresentation) { return this.#append("presentation", snapshot); }
    appendPresentationRevision(snapshot: FoodDishPresentation, expectedPreviousVersion: number) { return this.#append("presentation", snapshot, expectedPreviousVersion, true); }
    getPresentation(id: FoodDishId, version: number) { return this.#exact("presentation", id, version); }
    getLatestPresentation(id: FoodDishId) { return this.#latest("presentation", id); }
    listPresentationVersions(id: FoodDishId, opts: FoodMenuHistoryOptions = {}) { return this.#history("presentation", id, opts); }
    listLatestPresentations(opts: FoodMenuLatestOptions<FoodDishId> = {}) { return this.#list<"presentation", FoodDishId>("presentation", opts); }
    createInitialOffer(snapshot: FoodServingOffer) { return this.#append("offer", snapshot); }
    appendOfferRevision(snapshot: FoodServingOffer, expectedPreviousVersion: number) { return this.#append("offer", snapshot, expectedPreviousVersion, true); }
    getOffer(id: FoodServingOfferId, version: number) { return this.#exact("offer", id, version); }
    getLatestOffer(id: FoodServingOfferId) { return this.#latest("offer", id); }
    listOfferVersions(id: FoodServingOfferId, opts: FoodMenuHistoryOptions = {}) { return this.#history("offer", id, opts); }
    listLatestOffers(opts: FoodMenuLatestOptions<FoodServingOfferId> = {}) { return this.#list<"offer", FoodServingOfferId>("offer", opts); }
    createInitialPublication(snapshot: FoodMenuPublication) { return this.#append("publication", snapshot); }
    appendPublicationRevision(snapshot: FoodMenuPublication, expectedPreviousVersion: number) { return this.#append("publication", snapshot, expectedPreviousVersion, true); }
    getPublication(id: FoodMenuPublicationId, version: number) { return this.#exact("publication", id, version); }
    getLatestPublication(id: FoodMenuPublicationId) { return this.#latest("publication", id); }
    listPublicationVersions(id: FoodMenuPublicationId, opts: FoodMenuHistoryOptions = {}) { return this.#history("publication", id, opts); }
    listLatestPublications(opts: FoodMenuLatestOptions<FoodMenuPublicationId> = {}) { return this.#list<"publication", FoodMenuPublicationId>("publication", opts); }
    createInitialAvailability(snapshot: FoodServingOfferAvailability) { return this.#append("availability", snapshot); }
    appendAvailabilityRevision(snapshot: FoodServingOfferAvailability, expectedPreviousRevision: number) { return this.#append("availability", snapshot, expectedPreviousRevision, true); }
    getAvailability(id: FoodServingOfferId, offerVersion: number, revision: number) { return this.#exact("availability", id, offerVersion, revision); }
    listAvailabilityRevisions(id: FoodServingOfferId, offerVersion: number, opts: FoodAvailabilityHistoryOptions = {}) { return this.#history("availability", id, opts, offerVersion); }
    getCurrentAvailability(id: FoodServingOfferId, offerVersion: number) { return this.#latest("availability", id, offerVersion); }
}
