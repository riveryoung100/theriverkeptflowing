import {
    parseFoodProductId, parseFoodRecipeId, validateFoodVersion,
    validateFoodRecipeDraft, validateFoodProductDraft,
    reviseFoodRecipeDraft, reviseFoodProductDraft,
    type FoodRecipeDraft, type FoodProductDraft,
} from "./draft-domain";

export const FOOD_DRAFT_SERIALIZATION_VERSION = 1 as const;
export const FOOD_DRAFT_DEFAULT_LIMIT = 20;
export const FOOD_DRAFT_MAXIMUM_LIMIT = 100;
export class FoodDraftValidationError extends TypeError {}
export class FoodDraftStorageError extends Error {}
export type FoodDraftAppendResult<T> = Readonly<{ outcome: "created" | "already-present"; snapshot: T } | { outcome: "conflict"; reason: string }>;
export type FoodDraftReadResult<T> = Readonly<{ outcome: "found"; snapshot: T } | { outcome: "not-found" }>;
export interface FoodHistoryOptions { readonly limit?: number; readonly afterVersion?: number }
export interface FoodLatestOptions { readonly limit?: number; readonly afterId?: string }
export interface FoodDraftPage<T, C> { readonly items: readonly T[]; readonly nextCursor?: C }
export interface FoodDraftRepository {
    createInitialRecipe(snapshot: unknown): Promise<FoodDraftAppendResult<FoodRecipeDraft>>;
    appendRecipeRevision(snapshot: unknown, expectedPreviousVersion: number): Promise<FoodDraftAppendResult<FoodRecipeDraft>>;
    createInitialProduct(snapshot: unknown): Promise<FoodDraftAppendResult<FoodProductDraft>>;
    appendProductRevision(snapshot: unknown, expectedPreviousVersion: number): Promise<FoodDraftAppendResult<FoodProductDraft>>;
    getRecipe(id: unknown, version: unknown): Promise<FoodDraftReadResult<FoodRecipeDraft>>;
    getProduct(id: unknown, version: unknown): Promise<FoodDraftReadResult<FoodProductDraft>>;
    listRecipeVersions(id: unknown, options?: FoodHistoryOptions): Promise<FoodDraftPage<FoodRecipeDraft, number>>;
    listProductVersions(id: unknown, options?: FoodHistoryOptions): Promise<FoodDraftPage<FoodProductDraft, number>>;
    listLatestRecipes(options?: FoodLatestOptions): Promise<FoodDraftPage<FoodRecipeDraft, string>>;
    listLatestProducts(options?: FoodLatestOptions): Promise<FoodDraftPage<FoodProductDraft, string>>;
}
function validated<T>(fn: () => T): T {
    try { return fn(); } catch (error) { throw new FoodDraftValidationError(error instanceof Error ? error.message : "Invalid draft input"); }
}
function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new FoodDraftValidationError("Expected object");
    return value as Record<string, unknown>;
}
function fixedKeys(value: Record<string, unknown>, allowed: readonly string[]): void {
    if (Object.keys(value).some(key => !allowed.includes(key))) throw new FoodDraftValidationError("Unsupported field");
}
function canonical(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical((value as Record<string, unknown>)[key])]));
    return value;
}
function envelope(type: "recipe" | "product", snapshot: FoodRecipeDraft | FoodProductDraft): string {
    return JSON.stringify({ formatVersion: FOOD_DRAFT_SERIALIZATION_VERSION, recordType: type, recordId: snapshot.id, recordVersion: snapshot.version, snapshot: canonical(snapshot) });
}
export function serializeFoodRecipeDraft(value: unknown): string { return validated(() => envelope("recipe", validateFoodRecipeDraft(value))); }
export function serializeFoodProductDraft(value: unknown, recipe: unknown): string { return validated(() => envelope("product", validateFoodProductDraft(value, recipe))); }
function decode(value: unknown, type: "recipe" | "product"): Record<string, unknown> {
    if (typeof value !== "string") throw new FoodDraftValidationError("Serialized draft must be text");
    let parsed: unknown;
    try { parsed = JSON.parse(value); } catch { throw new FoodDraftValidationError("Corrupt draft JSON"); }
    const r = object(parsed); fixedKeys(r, ["formatVersion", "recordType", "recordId", "recordVersion", "snapshot"]);
    if (r.formatVersion !== FOOD_DRAFT_SERIALIZATION_VERSION || r.recordType !== type) throw new FoodDraftValidationError("Unsupported draft format/type");
    return r;
}
function agree(r: Record<string, unknown>, snapshot: FoodRecipeDraft | FoodProductDraft): void {
    if (r.recordId !== snapshot.id || r.recordVersion !== snapshot.version) throw new FoodDraftValidationError("Envelope identity/version disagreement");
}
export function deserializeFoodRecipeDraft(value: unknown): FoodRecipeDraft {
    return validated(() => { const r = decode(value, "recipe"); const snapshot = validateFoodRecipeDraft(r.snapshot); agree(r, snapshot); return snapshot; });
}
export function deserializeFoodProductDraft(value: unknown, recipe: unknown): FoodProductDraft {
    return validated(() => { const r = decode(value, "product"); const snapshot = validateFoodProductDraft(r.snapshot, recipe); agree(r, snapshot); return snapshot; });
}
function version(value: unknown): number { return validated(() => validateFoodVersion(value)); }
function limit(value: unknown): number {
    if (value === undefined) return FOOD_DRAFT_DEFAULT_LIMIT;
    const result = version(value); if (result > FOOD_DRAFT_MAXIMUM_LIMIT) throw new FoodDraftValidationError("Limit exceeds maximum"); return result;
}
function historyOptions(value: unknown): { limit: number; after?: number } {
    const r = object(value); fixedKeys(r, ["limit", "afterVersion"]);
    return { limit: limit(r.limit), ...(r.afterVersion === undefined ? {} : { after: version(r.afterVersion) }) };
}
function latestOptions(value: unknown, type: "recipe" | "product"): { limit: number; after?: string } {
    const r = object(value); fixedKeys(r, ["limit", "afterId"]);
    return { limit: limit(r.limit), ...(r.afterId === undefined ? {} : { after: validated(() => type === "recipe" ? parseFoodRecipeId(r.afterId) : parseFoodProductId(r.afterId)) }) };
}
function page<T, C>(values: readonly T[], count: number, cursor: (item: T) => C): FoodDraftPage<T, C> {
    const items = Object.freeze(values.slice(0, count));
    return Object.freeze({ items, ...(values.length > count ? { nextCursor: cursor(items[items.length - 1]) } : {}) });
}
function maximum(rows: Map<number, string>): number { let max = 0; for (const v of rows.keys()) if (v > max) max = v; return max; }
function conflict(reason: string): FoodDraftAppendResult<never> { return Object.freeze({ outcome: "conflict", reason }); }

/** Instance-local reference adapter. No authorization or durability is supplied here. */
export class InMemoryFoodDraftRepository implements FoodDraftRepository {
    #recipes = new Map<string, Map<number, string>>();
    #products = new Map<string, Map<number, string>>();
    #recipe(id: string, v: number): FoodRecipeDraft | undefined {
        const serialized = this.#recipes.get(id)?.get(v); if (serialized === undefined) return undefined;
        try { const snapshot = deserializeFoodRecipeDraft(serialized); if (snapshot.id !== id || snapshot.version !== v) throw new Error("Stored key disagreement"); return snapshot; }
        catch (error) { throw new FoodDraftStorageError(error instanceof Error ? error.message : "Corrupt recipe"); }
    }
    #product(id: string, v: number): FoodProductDraft | undefined {
        const serialized = this.#products.get(id)?.get(v); if (serialized === undefined) return undefined;
        try {
            const r = decode(serialized, "product"); const reference = object(object(r.snapshot).recipe);
            const recipe = this.#recipe(parseFoodRecipeId(reference.id), validateFoodVersion(reference.version));
            if (!recipe) throw new Error("Stored exact recipe missing");
            const snapshot = deserializeFoodProductDraft(serialized, recipe);
            if (snapshot.id !== id || snapshot.version !== v) throw new Error("Stored key disagreement"); return snapshot;
        } catch (error) { throw new FoodDraftStorageError(error instanceof Error ? error.message : "Corrupt product"); }
    }
    #store<T extends FoodRecipeDraft | FoodProductDraft>(map: Map<string, Map<number, string>>, snapshot: T, serialized: string, read: () => T, expected?: number): FoodDraftAppendResult<T> {
        const rows = map.get(snapshot.id) ?? new Map<number, string>(); const existing = rows.get(snapshot.version);
        if (existing !== undefined) return existing === serialized ? Object.freeze({ outcome: "already-present", snapshot: read() }) : conflict("Same identity/version has different content");
        if (expected !== undefined && maximum(rows) !== expected) return conflict("Predecessor is no longer latest");
        rows.set(snapshot.version, serialized); map.set(snapshot.id, rows);
        return Object.freeze({ outcome: "created", snapshot: read() });
    }
    async createInitialRecipe(input: unknown): Promise<FoodDraftAppendResult<FoodRecipeDraft>> {
        const snapshot = validated(() => validateFoodRecipeDraft(input)); if (snapshot.version !== 1) return conflict("Initial version must be 1");
        return this.#store(this.#recipes, snapshot, serializeFoodRecipeDraft(snapshot), () => this.#recipe(snapshot.id, snapshot.version)!);
    }
    async appendRecipeRevision(input: unknown, expectedPreviousVersion: number): Promise<FoodDraftAppendResult<FoodRecipeDraft>> {
        const next = validated(() => validateFoodRecipeDraft(input)); const expected = version(expectedPreviousVersion);
        if (expected === Number.MAX_SAFE_INTEGER || next.version !== expected + 1) return conflict("Revision must be consecutive");
        const previous = this.#recipe(next.id, expected); if (!previous) return conflict("Missing predecessor");
        const snapshot = validated(() => reviseFoodRecipeDraft(previous, next));
        return this.#store(this.#recipes, snapshot, serializeFoodRecipeDraft(snapshot), () => this.#recipe(snapshot.id, snapshot.version)!, expected);
    }
    #validateProduct(input: unknown): FoodProductDraft {
        const r = object(input); const reference = object(r.recipe);
        const recipe = this.#recipe(validated(() => parseFoodRecipeId(reference.id)), version(reference.version));
        if (!recipe) throw new FoodDraftValidationError("Exact referenced recipe missing");
        return validated(() => validateFoodProductDraft(input, recipe));
    }
    async createInitialProduct(input: unknown): Promise<FoodDraftAppendResult<FoodProductDraft>> {
        const snapshot = this.#validateProduct(input); if (snapshot.version !== 1) return conflict("Initial version must be 1");
        const recipe = this.#recipe(snapshot.recipe.id, snapshot.recipe.version)!;
        return this.#store(this.#products, snapshot, serializeFoodProductDraft(snapshot, recipe), () => this.#product(snapshot.id, snapshot.version)!);
    }
    async appendProductRevision(input: unknown, expectedPreviousVersion: number): Promise<FoodDraftAppendResult<FoodProductDraft>> {
        const next = this.#validateProduct(input); const expected = version(expectedPreviousVersion);
        if (expected === Number.MAX_SAFE_INTEGER || next.version !== expected + 1) return conflict("Revision must be consecutive");
        const previous = this.#product(next.id, expected); if (!previous) return conflict("Missing predecessor");
        const recipe = this.#recipe(next.recipe.id, next.recipe.version)!;
        const snapshot = validated(() => reviseFoodProductDraft(previous, this.#recipe(previous.recipe.id, previous.recipe.version)!, next, recipe));
        return this.#store(this.#products, snapshot, serializeFoodProductDraft(snapshot, recipe), () => this.#product(snapshot.id, snapshot.version)!, expected);
    }
    async getRecipe(id: unknown, v: unknown): Promise<FoodDraftReadResult<FoodRecipeDraft>> {
        const snapshot = this.#recipe(validated(() => parseFoodRecipeId(id)), version(v)); return Object.freeze(snapshot ? { outcome: "found", snapshot } : { outcome: "not-found" });
    }
    async getProduct(id: unknown, v: unknown): Promise<FoodDraftReadResult<FoodProductDraft>> {
        const snapshot = this.#product(validated(() => parseFoodProductId(id)), version(v)); return Object.freeze(snapshot ? { outcome: "found", snapshot } : { outcome: "not-found" });
    }
    async listRecipeVersions(id: unknown, options: FoodHistoryOptions = {}): Promise<FoodDraftPage<FoodRecipeDraft, number>> {
        const key = validated(() => parseFoodRecipeId(id)); const o = historyOptions(options);
        return page([...this.#recipes.get(key)?.keys() ?? []].filter(v => o.after === undefined || v > o.after).sort((a,b) => a-b).map(v => this.#recipe(key,v)!), o.limit, s => s.version);
    }
    async listProductVersions(id: unknown, options: FoodHistoryOptions = {}): Promise<FoodDraftPage<FoodProductDraft, number>> {
        const key = validated(() => parseFoodProductId(id)); const o = historyOptions(options);
        return page([...this.#products.get(key)?.keys() ?? []].filter(v => o.after === undefined || v > o.after).sort((a,b) => a-b).map(v => this.#product(key,v)!), o.limit, s => s.version);
    }
    async listLatestRecipes(options: FoodLatestOptions = {}): Promise<FoodDraftPage<FoodRecipeDraft, string>> {
        const o = latestOptions(options, "recipe"); return page([...this.#recipes.keys()].filter(id => o.after === undefined || id > o.after).sort().map(id => this.#recipe(id, maximum(this.#recipes.get(id)!))!), o.limit, s => s.id);
    }
    async listLatestProducts(options: FoodLatestOptions = {}): Promise<FoodDraftPage<FoodProductDraft, string>> {
        const o = latestOptions(options, "product"); return page([...this.#products.keys()].filter(id => o.after === undefined || id > o.after).sort().map(id => this.#product(id, maximum(this.#products.get(id)!))!), o.limit, s => s.id);
    }
}
