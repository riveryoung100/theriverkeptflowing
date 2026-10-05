import { parseFoodProductId, parseFoodRecipeId, validateFoodVersion, validateFoodRecipeDraft, validateFoodProductDraft, reviseFoodRecipeDraft, reviseFoodProductDraft, type FoodRecipeDraft, type FoodProductDraft } from "./draft-domain";
import { serializeFoodRecipeDraft, serializeFoodProductDraft, deserializeFoodRecipeDraft, deserializeFoodProductDraft, FOOD_DRAFT_SERIALIZATION_VERSION, FOOD_DRAFT_DEFAULT_LIMIT, FOOD_DRAFT_MAXIMUM_LIMIT, FoodDraftValidationError, FoodDraftStorageError, type FoodDraftRepository, type FoodDraftAppendResult, type FoodDraftReadResult, type FoodDraftPage, type FoodHistoryOptions, type FoodLatestOptions } from "./draft-persistence";

export interface FoodD1Result { readonly success: boolean; readonly meta?: { readonly changes?: number }; readonly results: readonly unknown[] }
export interface FoodD1Statement { bind(...values: (string | number | null)[]): FoodD1Statement; all(): Promise<FoodD1Result> }
/** Inject primary-consistent access. This adapter does not select bindings or authorize callers. */
export interface FoodD1Database { prepare(sql: string): FoodD1Statement; batch(statements: FoodD1Statement[]): Promise<readonly FoodD1Result[]> }
type Kind = "recipe" | "product";
type Snapshot = FoodRecipeDraft | FoodProductDraft;
const table = (kind: Kind) => `food_${kind}_draft_snapshots`;
const idColumn = (kind: Kind) => `${kind}_id`;
const columns = (kind: Kind) => `${idColumn(kind)}, version, identity_order_key, serialization_format_version, payload_json${kind === "product" ? ", recipe_id, recipe_version" : ""}`;
function input<T>(fn: () => T): T { try { return fn(); } catch (e) { throw new FoodDraftValidationError(e instanceof Error ? e.message : "Invalid food draft"); } }
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Expected object"); return value as Record<string, unknown>; }
function id(kind: Kind, value: unknown): string { return input(() => kind === "recipe" ? parseFoodRecipeId(value) : parseFoodProductId(value)); }
function version(value: unknown): number { return input(() => validateFoodVersion(value)); }
export function foodDraftIdentityOrderKey(identity: string): string {
    let key = "";
    for (let i = 0; i < identity.length; i++) key += identity.charCodeAt(i).toString(16).padStart(4, "0");
    return key;
}
function conflict(reason: string): FoodDraftAppendResult<never> { return Object.freeze({ outcome: "conflict", reason }); }
function rows(result: FoodD1Result): readonly unknown[] {
    if (!result || result.success !== true || !Array.isArray(result.results)) throw new FoodDraftStorageError("Invalid D1 result");
    return result.results;
}
function options(value: unknown, latest: boolean, kind: Kind): { limit: number; after?: string | number } {
    return input(() => {
        const r = object(value); const cursor = latest ? "afterId" : "afterVersion";
        if (Object.keys(r).some(k => k !== "limit" && k !== cursor)) throw new TypeError("Unsupported listing option");
        const limit = r.limit === undefined ? FOOD_DRAFT_DEFAULT_LIMIT : validateFoodVersion(r.limit);
        if (limit > FOOD_DRAFT_MAXIMUM_LIMIT) throw new TypeError("Limit exceeds maximum");
        return { limit, ...(r[cursor] === undefined ? {} : { after: latest ? id(kind, r[cursor]) : validateFoodVersion(r[cursor]) }) };
    });
}

export class D1FoodDraftRepository implements FoodDraftRepository {
    constructor(private readonly database: FoodD1Database) {}
    private async query(sql: string, values: (string | number | null)[]): Promise<readonly unknown[]> {
        try { return rows(await this.database.prepare(sql).bind(...values).all()); }
        catch (e) { throw new FoodDraftStorageError(e instanceof Error ? e.message : "D1 read failed"); }
    }
    private async decode(kind: Kind, value: unknown, expectedId?: string, expectedVersion?: number): Promise<Snapshot> {
        try {
            const r = object(value); const key = idColumn(kind);
            const recordId = kind === "recipe" ? parseFoodRecipeId(r[key]) : parseFoodProductId(r[key]);
            const v = validateFoodVersion(r.version);
            if ((expectedId !== undefined && recordId !== expectedId) || (expectedVersion !== undefined && v !== expectedVersion) || r.identity_order_key !== foodDraftIdentityOrderKey(recordId) || r.serialization_format_version !== FOOD_DRAFT_SERIALIZATION_VERSION || typeof r.payload_json !== "string") throw new Error("Stored metadata mismatch");
            let snapshot: Snapshot; let canonical: string;
            if (kind === "recipe") { snapshot = deserializeFoodRecipeDraft(r.payload_json); canonical = serializeFoodRecipeDraft(snapshot); }
            else {
                const recipe = await this.read("recipe", parseFoodRecipeId(r.recipe_id), validateFoodVersion(r.recipe_version)) as FoodRecipeDraft | undefined;
                if (!recipe) throw new Error("Stored exact recipe missing");
                snapshot = deserializeFoodProductDraft(r.payload_json, recipe); canonical = serializeFoodProductDraft(snapshot, recipe);
            }
            if (snapshot.id !== recordId || snapshot.version !== v || canonical !== r.payload_json) throw new Error("Noncanonical or disagreeing stored payload");
            return snapshot;
        } catch (e) { throw new FoodDraftStorageError(e instanceof Error ? e.message : "Corrupt food row"); }
    }
    private async read(kind: Kind, recordId: string, v: number): Promise<Snapshot | undefined> {
        const result = await this.query(`SELECT ${columns(kind)} FROM ${table(kind)} WHERE ${idColumn(kind)} = ? AND version = ? LIMIT 1`, [recordId, v]);
        if (result.length > 1) throw new FoodDraftStorageError("Unexpected exact-read row count");
        return result.length ? this.decode(kind, result[0], recordId, v) : undefined;
    }
    private async productInput(value: unknown): Promise<{ snapshot: FoodProductDraft; recipe: FoodRecipeDraft }> {
        const reference = input(() => object(object(value).recipe));
        const recipe = await this.read("recipe", id("recipe", reference.id), version(reference.version)) as FoodRecipeDraft | undefined;
        if (!recipe) throw new FoodDraftValidationError("Exact referenced recipe missing");
        return { snapshot: input(() => validateFoodProductDraft(value, recipe)), recipe };
    }
    private async store(kind: Kind, snapshot: Snapshot, payload: string, expected?: number): Promise<FoodDraftAppendResult<Snapshot>> {
        const t = table(kind); const key = idColumn(kind);
        const values: (string | number | null)[] = [snapshot.id, snapshot.version, foodDraftIdentityOrderKey(snapshot.id), FOOD_DRAFT_SERIALIZATION_VERSION, payload];
        if (kind === "product") { const p = snapshot as FoodProductDraft; values.push(p.recipe.id, p.recipe.version); }
        const count = values.length;
        values.push(expected ?? null, snapshot.id, snapshot.version, expected ?? null);
        const e = `?${count + 1}`, identity = `?${count + 2}`, next = `?${count + 3}`, predecessor = `?${count + 4}`;
        const sql = `INSERT INTO ${t} (${columns(kind)}) SELECT ${Array.from({length: count}, (_, i) => `?${i + 1}`).join(", ")}
            WHERE (${e} IS NULL AND ${next} = 1 AND NOT EXISTS (SELECT 1 FROM ${t} WHERE ${key} = ${identity}))
               OR (${e} IS NOT NULL AND ${e} < 9007199254740991 AND ${next} = ${e} + 1
                   AND EXISTS (SELECT 1 FROM ${t} WHERE ${key} = ${identity} AND version = ${predecessor})
                   AND (SELECT MAX(version) FROM ${t} WHERE ${key} = ${identity}) = ${e})
            ON CONFLICT(${key}, version) DO NOTHING`;
        try {
            const result = await this.database.batch([this.database.prepare(sql).bind(...values), this.database.prepare(`SELECT ${columns(kind)} FROM ${t} WHERE ${key} = ? AND version = ? LIMIT 1`).bind(snapshot.id, snapshot.version)]);
            if (!Array.isArray(result) || result.length !== 2) throw new Error("Unexpected batch result count");
            rows(result[0]); const found = rows(result[1]); const changes = result[0].meta?.changes;
            if ((changes !== 0 && changes !== 1) || found.length > 1) throw new Error("Missing/unexpected affected-row metadata");
            if (!found.length) { if (changes === 1) throw new Error("Created row missing"); return conflict("Predecessor/version conflict"); }
            const stored = await this.decode(kind, found[0], snapshot.id, snapshot.version);
            if (object(found[0]).payload_json !== payload) { if (changes === 1) throw new Error("Created payload disagreement"); return conflict("Same identity/version has different content"); }
            return Object.freeze({ outcome: changes === 1 ? "created" : "already-present", snapshot: stored });
        } catch (e) { throw new FoodDraftStorageError(e instanceof Error ? e.message : "Uncertain D1 append"); }
    }
    async createInitialRecipe(value: unknown): Promise<FoodDraftAppendResult<FoodRecipeDraft>> {
        const snapshot = input(() => validateFoodRecipeDraft(value));
        if (snapshot.version !== 1) return conflict("Initial version must be 1");
        return this.store("recipe", snapshot, serializeFoodRecipeDraft(snapshot)) as Promise<FoodDraftAppendResult<FoodRecipeDraft>>;
    }
    async appendRecipeRevision(value: unknown, expectedPreviousVersion: number): Promise<FoodDraftAppendResult<FoodRecipeDraft>> {
        const next = input(() => validateFoodRecipeDraft(value)); const expected = version(expectedPreviousVersion);
        if (expected === Number.MAX_SAFE_INTEGER || next.version !== expected + 1) return conflict("Revision must be consecutive");
        const previous = await this.read("recipe", next.id, expected);
        if (!previous) return conflict("Missing predecessor");
        const snapshot = input(() => reviseFoodRecipeDraft(previous, next));
        return this.store("recipe", snapshot, serializeFoodRecipeDraft(snapshot), expected) as Promise<FoodDraftAppendResult<FoodRecipeDraft>>;
    }
    async createInitialProduct(value: unknown): Promise<FoodDraftAppendResult<FoodProductDraft>> {
        const { snapshot, recipe } = await this.productInput(value);
        if (snapshot.version !== 1) return conflict("Initial version must be 1");
        return this.store("product", snapshot, serializeFoodProductDraft(snapshot, recipe)) as Promise<FoodDraftAppendResult<FoodProductDraft>>;
    }
    async appendProductRevision(value: unknown, expectedPreviousVersion: number): Promise<FoodDraftAppendResult<FoodProductDraft>> {
        const { snapshot: next, recipe } = await this.productInput(value); const expected = version(expectedPreviousVersion);
        if (expected === Number.MAX_SAFE_INTEGER || next.version !== expected + 1) return conflict("Revision must be consecutive");
        const previous = await this.read("product", next.id, expected) as FoodProductDraft | undefined;
        if (!previous) return conflict("Missing predecessor");
        const previousRecipe = await this.read("recipe", previous.recipe.id, previous.recipe.version);
        const snapshot = input(() => reviseFoodProductDraft(previous, previousRecipe, next, recipe));
        return this.store("product", snapshot, serializeFoodProductDraft(snapshot, recipe), expected) as Promise<FoodDraftAppendResult<FoodProductDraft>>;
    }
    async getRecipe(identity: unknown, v: unknown): Promise<FoodDraftReadResult<FoodRecipeDraft>> {
        const snapshot = await this.read("recipe", id("recipe", identity), version(v)) as FoodRecipeDraft | undefined;
        return Object.freeze(snapshot ? { outcome: "found", snapshot } : { outcome: "not-found" });
    }
    async getProduct(identity: unknown, v: unknown): Promise<FoodDraftReadResult<FoodProductDraft>> {
        const snapshot = await this.read("product", id("product", identity), version(v)) as FoodProductDraft | undefined;
        return Object.freeze(snapshot ? { outcome: "found", snapshot } : { outcome: "not-found" });
    }
    private async list(kind: Kind, identity: string | undefined, value: unknown): Promise<FoodDraftPage<Snapshot, string | number>> {
        const latest = identity === undefined; const o = options(value, latest, kind); const t = table(kind); const key = idColumn(kind);
        let sql: string; let values: (string | number | null)[];
        if (latest) {
            const after = o.after === undefined ? "" : foodDraftIdentityOrderKey(o.after as string);
            sql = `SELECT ${columns(kind)} FROM ${t} AS s WHERE identity_order_key COLLATE BINARY > ? AND version = (SELECT MAX(version) FROM ${t} AS h WHERE h.${key} = s.${key}) ORDER BY identity_order_key COLLATE BINARY, ${key} COLLATE BINARY LIMIT ?`;
            values = [after, o.limit + 1];
        } else { sql = `SELECT ${columns(kind)} FROM ${t} WHERE ${key} = ? AND version > ? ORDER BY version ASC LIMIT ?`; values = [identity, o.after as number ?? 0, o.limit + 1]; }
        const found = await this.query(sql, values);
        if (found.length > o.limit + 1) throw new FoodDraftStorageError("Unbounded listing result");
        const snapshots = await Promise.all(found.map(r => this.decode(kind, r, identity)));
        for (let i = 0; i < snapshots.length; i++) {
            const cursor = latest ? snapshots[i].id : snapshots[i].version;
            const previous = i ? (latest ? snapshots[i - 1].id : snapshots[i - 1].version) : o.after;
            if (previous !== undefined && !(latest ? (cursor as string) > (previous as string) : (cursor as number) > (previous as number))) throw new FoodDraftStorageError("Listing order/cursor disagreement");
        }
        const items = Object.freeze(snapshots.slice(0, o.limit)); const last = items[items.length - 1];
        return Object.freeze({ items, ...(snapshots.length > o.limit ? { nextCursor: latest ? last.id : last.version } : {}) });
    }
    listRecipeVersions(identity: unknown, o: FoodHistoryOptions = {}): Promise<FoodDraftPage<FoodRecipeDraft, number>> { return this.list("recipe", id("recipe", identity), o) as Promise<FoodDraftPage<FoodRecipeDraft, number>>; }
    listProductVersions(identity: unknown, o: FoodHistoryOptions = {}): Promise<FoodDraftPage<FoodProductDraft, number>> { return this.list("product", id("product", identity), o) as Promise<FoodDraftPage<FoodProductDraft, number>>; }
    listLatestRecipes(o: FoodLatestOptions = {}): Promise<FoodDraftPage<FoodRecipeDraft, string>> { return this.list("recipe", undefined, o) as Promise<FoodDraftPage<FoodRecipeDraft, string>>; }
    listLatestProducts(o: FoodLatestOptions = {}): Promise<FoodDraftPage<FoodProductDraft, string>> { return this.list("product", undefined, o) as Promise<FoodDraftPage<FoodProductDraft, string>>; }
}
