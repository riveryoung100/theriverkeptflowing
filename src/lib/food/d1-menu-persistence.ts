import { parseFoodProductId, parseFoodRecipeId, validateFoodVersion, validateFoodRecipeDraft, validateFoodProductDraft, type FoodProductDraft, type FoodRecipeDraft } from "./draft-domain";
import { parseFoodDishId, parseFoodServingOfferId, validateFoodDishPresentation, validateFoodServingOffer, reviseFoodDishPresentation, reviseFoodServingOffer, type FoodDishId, type FoodServingOfferId, type FoodDishPresentation, type FoodServingOffer } from "./dish-offer-domain";
import { parseFoodMenuPublicationId, validateFoodMenuPublication, reviseFoodMenuPublication, validateFoodServingOfferAvailability, type FoodMenuPublicationId, type FoodMenuPublication, type FoodServingOfferAvailability, type FoodDishPresentationContext } from "./menu-publication-domain";
import * as persistence from "./menu-persistence";
import type { FoodMenuRepository, FoodMenuReadDependencies, FoodMenuRepositoryResult, FoodMenuAppendOutcome, FoodMenuHistoryOptions, FoodMenuLatestOptions, FoodAvailabilityHistoryOptions } from "./menu-persistence";
import { foodDraftIdentityOrderKey, type FoodD1Database, type FoodD1Result } from "./d1-draft-persistence";
type Kind = "presentation" | "offer" | "publication" | "availability";
type Snapshot = FoodDishPresentation | FoodServingOffer | FoodMenuPublication | FoodServingOfferAvailability;
type ByKind = { presentation: FoodDishPresentation; offer: FoodServingOffer; publication: FoodMenuPublication; availability: FoodServingOfferAvailability };
type Validation<K extends Kind> = { snapshot: ByKind[K]; presentations: FoodDishPresentationContext[]; offers: FoodServingOffer[] };
class StorageFailure extends Error {}
class InvalidInput extends Error {}
function invalid(): never { throw new InvalidInput(); }
function storage(): never { throw new StorageFailure(); }
function object(value: unknown, allowed?: readonly string[]): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) return invalid(); if (allowed && Reflect.ownKeys(value).some(k => typeof k !== "string" || !allowed.includes(k))) return invalid(); return value as Record<string, unknown>; }
function array(value: unknown, max: number): unknown[] { if (!Array.isArray(value) || value.length > max) return invalid(); return Array.from(value); }
function freeze<T>(value: T): T { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
function success<T>(value: T): FoodMenuRepositoryResult<T> { return freeze({ ok: true, value }); }
function failure(error: unknown): FoodMenuRepositoryResult<never> { const code = error instanceof StorageFailure ? "storage" : "invalid-input"; return freeze({ ok: false, error: { code, message: code === "storage" ? "Food menu repository storage is unavailable." : "Food menu repository input could not be validated." } }); }
function unwrap<T>(result: FoodMenuRepositoryResult<T>): T { if (!result.ok) return invalid(); return result.value; }
const tables = { presentation: "food_dish_presentation_snapshots", offer: "food_serving_offer_snapshots", publication: "food_menu_publication_snapshots", availability: "food_offer_availability_observations" } as const;
const identityColumn = (kind: Kind) => kind === "presentation" ? "dish_id" : kind === "publication" ? "publication_id" : "offer_id";
const sequenceColumn = (kind: Kind) => kind === "availability" ? "revision" : "version";
function rows(result: FoodD1Result): readonly unknown[] { if (!result || result.success !== true || !Array.isArray(result.results)) return storage(); return result.results; }
function refs(snapshot: FoodMenuPublication) {
    const presentations = new Map<string, { dish_id: string; presentation_version: number }>();
    const offers = new Map<string, { offer_id: string; offer_version: number; dish_id: string; presentation_version: number }>();
    for (const section of snapshot.sections) for (const entry of section.entries) {
        const p = { dish_id: entry.presentation.dishId, presentation_version: entry.presentation.version }; presentations.set(JSON.stringify([p.dish_id,p.presentation_version]), p);
        for (const selected of entry.offers) { const o = { offer_id: selected.offer.offerId, offer_version: selected.offer.version, ...p }; offers.set(JSON.stringify([o.offer_id,o.offer_version]), o); }
    }
    return { presentations: [...presentations.values()], offers: [...offers.values()] };
}
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

function coordinates(kind: Kind, value: unknown): { id: string; version: number; sequence: number; stream: string } {
    const r = object(value);
    const id = kind === "presentation" ? parseFoodDishId(r.dishId) : kind === "publication" ? parseFoodMenuPublicationId(r.publicationId) : kind === "offer" ? parseFoodServingOfferId(r.offerId) : parseFoodServingOfferId(object(r.offer).offerId);
    const version = validateFoodVersion(kind === "availability" ? object(r.offer).version : r.version);
    const sequence = kind === "availability" ? validateFoodVersion(r.revision) : version;
    return { id, version, sequence, stream: kind === "availability" ? JSON.stringify([id, version]) : id };
}

function parseId(kind: Exclude<Kind, "availability">, id: unknown): string { return kind === "presentation" ? parseFoodDishId(id) : kind === "offer" ? parseFoodServingOfferId(id) : parseFoodMenuPublicationId(id); }
function options(value: unknown, cursor: "afterVersion" | "afterRevision" | "afterId", kind?: Exclude<Kind, "availability">) {
    const r = object(value, ["limit", cursor]); const limit = r.limit === undefined ? 20 : validateFoodVersion(r.limit); if (limit > 100) return invalid();
    const after = r[cursor] === undefined ? undefined : cursor === "afterId" ? parseId(kind!, r[cursor]) : validateFoodVersion(r[cursor]);
    return { limit, after };
}


/** Inject primary-consistent database access. No runtime selection or authorization occurs here. */
export class D1FoodMenuRepository implements FoodMenuRepository {
    readonly #database: FoodD1Database;
    readonly #dependencies: FoodMenuReadDependencies;
    constructor(database: FoodD1Database, dependencies: FoodMenuReadDependencies) {
        try {
            const db = object(database); const d = object(dependencies);
            if (typeof db.prepare !== "function" || typeof db.batch !== "function" || typeof d.getProduct !== "function" || typeof d.getRecipe !== "function") invalid();
            this.#database = database; this.#dependencies = { getProduct: dependencies.getProduct.bind(dependencies), getRecipe: dependencies.getRecipe.bind(dependencies) };
        } catch { throw new TypeError("Food menu repository dependencies are unavailable."); }
    }
    async #operation<T>(fn: () => Promise<T>): Promise<FoodMenuRepositoryResult<T>> { try { return success(await fn()); } catch (error) { return failure(error); } }
    async #query(sql: string, values: (string | number | null)[]): Promise<readonly unknown[]> { try { return rows(await this.#database.prepare(sql).bind(...values).all()); } catch { return storage(); } }
    #where(kind: Kind, stream: string): { sql: string; values: (string | number)[] } {
        if (kind !== "availability") return { sql: `${identityColumn(kind)} = ?`, values: [stream] };
        const [id, version] = JSON.parse(stream) as [string,number]; return { sql: "offer_id = ? AND offer_version = ?", values: [id, version] };
    }
    #encode<K extends Kind>(kind: K, v: Validation<K>): string {
        const p = v.presentations[0];
        if (kind === "presentation") return unwrap(persistence.serializeFoodDishPresentation(v.snapshot, p.product, p.recipe));
        if (kind === "offer") return unwrap(persistence.serializeFoodServingOffer(v.snapshot, p.presentation, p.product, p.recipe));
        if (kind === "publication") return unwrap(persistence.serializeFoodMenuPublication(v.snapshot, v.presentations, v.offers));
        return unwrap(persistence.serializeFoodServingOfferAvailability(v.snapshot));
    }
    #deserialize<K extends Kind>(kind: K, payload: string, v: Validation<K>): ByKind[K] {
        const p = v.presentations[0];
        if (kind === "presentation") return unwrap(persistence.deserializeFoodDishPresentation(payload, p.product, p.recipe)) as ByKind[K];
        if (kind === "offer") return unwrap(persistence.deserializeFoodServingOffer(payload, p.presentation, p.product, p.recipe)) as ByKind[K];
        if (kind === "publication") return unwrap(persistence.deserializeFoodMenuPublication(payload, v.presentations, v.offers)) as ByKind[K];
        return unwrap(persistence.deserializeFoodServingOfferAvailability(payload)) as ByKind[K];
    }
    async #decode<K extends Kind>(kind: K, value: unknown, stream?: string, sequence?: number): Promise<Validation<K>> {
        try {
            const row = object(value); if (typeof row.payload_json !== "string" || row.serialization_format_version !== persistence.FOOD_MENU_SERIALIZATION_VERSION) storage();
            const raw = object(JSON.parse(row.payload_json as string)); const c = coordinates(kind, raw.snapshot);
            if (row[identityColumn(kind)] !== c.id || row[sequenceColumn(kind)] !== c.sequence || (kind === "availability" ? row.offer_version !== c.version : row.identity_order_key !== foodDraftIdentityOrderKey(c.id)) || (stream !== undefined && stream !== c.stream) || (sequence !== undefined && sequence !== c.sequence)) storage();
            const validated = await this.#validate(kind, raw.snapshot, true);
            if (kind === "presentation") { const p = validated.snapshot as FoodDishPresentation; if (row.product_id !== p.product.id || row.product_version !== p.product.version || row.recipe_id !== p.recipe.id || row.recipe_version !== p.recipe.version) storage(); }
            if (kind === "offer") { const o = validated.snapshot as FoodServingOffer; if (row.dish_id !== o.presentation.dishId || row.presentation_version !== o.presentation.version) storage(); }
            if (this.#encode(kind, validated) !== row.payload_json) storage();
            validated.snapshot = this.#deserialize(kind, row.payload_json as string, validated);
            if (kind === "publication") await this.#membership(validated.snapshot as FoodMenuPublication);
            return validated;
        } catch { return storage(); }
    }
    async #membership(snapshot: FoodMenuPublication): Promise<void> {
        const expected = refs(snapshot);
        for (const family of ["presentations", "offers"] as const) {
            const columns = family === "presentations" ? ["dish_id", "presentation_version"] : ["offer_id", "offer_version", "dish_id", "presentation_version"];
            const table = family === "presentations" ? "food_menu_publication_presentation_memberships" : "food_menu_publication_offer_memberships";
            const found = await this.#query(`SELECT ${columns.join(",")} FROM ${table} WHERE publication_id=? AND publication_version=?`, [snapshot.publicationId,snapshot.version]);
            const expectedSet = new Set(expected[family].map(r => JSON.stringify(columns.map(k => (r as unknown as Record<string,unknown>)[k]))));
            const seen = new Set<string>();
            for (const item of found) { const r = object(item, columns); if (Reflect.ownKeys(r).length !== columns.length) storage(); const key = JSON.stringify(columns.map(k=>r[k])); if (!expectedSet.has(key) || seen.has(key)) storage(); seen.add(key); }
            if (seen.size !== expectedSet.size) storage();
        }
    }
    async #read<K extends Kind>(kind: K, stream: string, sequence: number): Promise<Validation<K> | undefined> {
        const where = this.#where(kind, stream); const found = await this.#query(`SELECT * FROM ${tables[kind]} WHERE ${where.sql} AND ${sequenceColumn(kind)}=? LIMIT 1`, [...where.values,sequence]);
        if (found.length > 1) storage(); return found.length ? this.#decode(kind, found[0], stream, sequence) : undefined;
    }
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

            const existing = await this.#read(kind, c.stream, c.sequence);
            if (existing && kind === "offer" && (existing.snapshot as FoodServingOffer).presentation.dishId !== (next.snapshot as FoodServingOffer).presentation.dishId) invalid();
            return this.#store(kind, next, expected);
        });
    }
    async #store<K extends Kind>(kind: K, validated: Validation<K>, expected?: number): Promise<FoodMenuAppendOutcome<ByKind[K]>> {
        const c = coordinates(kind, validated.snapshot); const where = this.#where(kind,c.stream); const table = tables[kind]; const sequence = sequenceColumn(kind); const payload = this.#encode(kind, validated);
        const columns = [identityColumn(kind), ...(kind === "availability" ? ["offer_version", "revision"] : ["version", "identity_order_key"]), "serialization_format_version", "payload_json"];
        const values: (string | number | null)[] = [c.id, ...(kind === "availability" ? [c.version,c.sequence] : [c.sequence,foodDraftIdentityOrderKey(c.id)]), persistence.FOOD_MENU_SERIALIZATION_VERSION,payload];
        if (kind === "presentation") { const p = validated.snapshot as FoodDishPresentation; columns.push("product_id","product_version","recipe_id","recipe_version"); values.push(p.product.id,p.product.version,p.recipe.id,p.recipe.version); }
        if (kind === "offer") { const o = validated.snapshot as FoodServingOffer; columns.push("dish_id","presentation_version"); values.push(o.presentation.dishId,o.presentation.version); }
        const placeholders = columns.map(()=>"?").join(",");
        // Retry target selection wins before current-predecessor checks; ON CONFLICT yields no witness.
        let gate = `EXISTS(SELECT 1 FROM ${table} WHERE ${where.sql} AND ${sequence}=?) OR (?=0 AND ?=1 AND NOT EXISTS(SELECT 1 FROM ${table} WHERE ${where.sql})) OR (? > 0 AND ? < 9007199254740991 AND ?=?+1 AND EXISTS(SELECT 1 FROM ${table} WHERE ${where.sql} AND ${sequence}=?) AND (SELECT MAX(${sequence}) FROM ${table} WHERE ${where.sql})=?)`;
        values.push(...where.values,c.sequence,expected ?? 0,c.sequence,...where.values,expected ?? 0,expected ?? 0,c.sequence,expected ?? 0,...where.values,expected ?? 0,...where.values,expected ?? 0);
        if (kind === "offer") { gate = `(${gate}) AND NOT EXISTS(SELECT 1 FROM ${table} WHERE offer_id=? AND dish_id<>?)`; values.push(c.id,(validated.snapshot as FoodServingOffer).presentation.dishId); }
        const key = kind === "availability" ? "offer_id,offer_version,revision" : `${identityColumn(kind)},version`;
        const insert = `INSERT INTO ${table} (${columns.join(",")}) SELECT ${placeholders} WHERE ${gate} ON CONFLICT(${key}) DO NOTHING RETURNING *`;
        try {
            const result = await this.#database.batch([this.#database.prepare(insert).bind(...values), this.#database.prepare(`SELECT * FROM ${table} WHERE ${where.sql} AND ${sequence}=? LIMIT 1`).bind(...where.values,c.sequence)]);
            if (!Array.isArray(result) || result.length !== 2) storage();
            const witness = rows(result[0]); const found = rows(result[1]); if (witness.length > 1 || found.length > 1) storage();
            const expectedChanges = witness.length ? (kind === "publication" ? 1 + refs(validated.snapshot as FoodMenuPublication).presentations.length + refs(validated.snapshot as FoodMenuPublication).offers.length : 1) : 0;
            if (result[0].meta?.changes !== expectedChanges || result[1].meta?.changes !== 0) storage();
            if (!found.length) { if (witness.length) storage(); return invalid(); }
            const stored = await this.#decode(kind,found[0],c.stream,c.sequence); const storedPayload = object(found[0]).payload_json;
            if (witness.length) {
                await this.#decode(kind,witness[0],c.stream,c.sequence);
                if (object(witness[0]).payload_json !== payload || storedPayload !== payload) storage();
                return { outcome: "created", snapshot: stored.snapshot };
            }
            if (kind === "offer" && (stored.snapshot as FoodServingOffer).presentation.dishId !== (validated.snapshot as FoodServingOffer).presentation.dishId) return invalid();
            return storedPayload === payload ? { outcome: "already-present", snapshot: stored.snapshot } : { outcome: "conflict", reason: "different-content" };
        } catch (error) { if (error instanceof InvalidInput) throw error; return storage(); }
    }
    #exact<K extends Kind>(kind: K, id: unknown, version: unknown, revision?: unknown) {
        return this.#operation(async () => {
            const stream = kind === "availability" ? JSON.stringify([parseFoodServingOfferId(id),validateFoodVersion(version)]) : parseId(kind,id);
            const n = validateFoodVersion(kind === "availability" ? revision : version); const found = await this.#read(kind,stream,n);
            return found ? { outcome: "found" as const, snapshot: found.snapshot } : { outcome: "not-found" as const };
        });
    }
    #latest<K extends Kind>(kind: K, id: unknown, offerVersion?: unknown) {
        return this.#operation(async () => {
            const stream = kind === "availability" ? JSON.stringify([parseFoodServingOfferId(id),validateFoodVersion(offerVersion)]) : parseId(kind,id); const where = this.#where(kind,stream);
            const found = await this.#query(`SELECT * FROM ${tables[kind]} WHERE ${where.sql} ORDER BY ${sequenceColumn(kind)} DESC LIMIT 1`,where.values);
            if (found.length > 1) storage(); return found.length ? { outcome: "found" as const, snapshot: (await this.#decode(kind,found[0],stream)).snapshot } : { outcome: "not-found" as const };
        });
    }
    #history<K extends Kind>(kind: K, id: unknown, opts: unknown, offerVersion?: unknown) {
        return this.#operation(async () => {
            const stream = kind === "availability" ? JSON.stringify([parseFoodServingOfferId(id),validateFoodVersion(offerVersion)]) : parseId(kind,id); const where = this.#where(kind,stream); const seq = sequenceColumn(kind);
            const o = options(capture(opts),kind === "availability" ? "afterRevision" : "afterVersion");
            const found = await this.#query(`SELECT * FROM ${tables[kind]} WHERE ${where.sql} AND ${seq}>? ORDER BY ${seq} ASC LIMIT ?`,[...where.values,o.after as number ?? 0,o.limit+1]);
            try { if (found.length > o.limit+1) storage(); let last = o.after as number ?? 0;
            // Only returned items are reconstructed; the lookahead establishes continuation, as in FOOD-002D.
            const items: ByKind[K][] = [];
            for (let i=0;i<found.length;i++) { const n = object(found[i])[seq]; if (typeof n !== "number" || !Number.isSafeInteger(n) || n <= last) storage(); last = n as number; if (i<o.limit) items.push((await this.#decode(kind,found[i],stream,last)).snapshot); }
            return { items, ...(found.length>o.limit ? { nextCursor: object(found[o.limit-1])[seq] as number } : {}) }; } catch { return storage(); }
        });
    }
    #list<K extends Exclude<Kind,"availability">, Id extends string>(kind: K, opts: unknown) {
        return this.#operation(async () => {
            const o = options(capture(opts),"afterId",kind); const key = identityColumn(kind); const table = tables[kind];
            const found = await this.#query(`SELECT * FROM ${table} s WHERE identity_order_key COLLATE BINARY > ? AND version=(SELECT MAX(version) FROM ${table} h WHERE h.${key}=s.${key}) ORDER BY identity_order_key COLLATE BINARY LIMIT ?`,[o.after === undefined ? "" : foodDraftIdentityOrderKey(o.after as string),o.limit+1]);
            try { if (found.length>o.limit+1) storage(); let last = o.after as string | undefined; const items: ByKind[K][]=[];
            for (let i=0;i<found.length;i++) { const row = object(found[i]); const id = parseId(kind,row[key]); if ((last !== undefined && id<=last) || row.identity_order_key !== foodDraftIdentityOrderKey(id)) storage(); last=id; if (i<o.limit) items.push((await this.#decode(kind,row,id)).snapshot); }
            return { items, ...(found.length>o.limit ? { nextCursor: object(found[o.limit-1])[key] as Id } : {}) }; } catch { return storage(); }
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
