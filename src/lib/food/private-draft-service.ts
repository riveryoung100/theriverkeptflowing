import { parsePrincipalId, type PrincipalId } from "../identity/identifiers";
import type { SessionPrincipalResolver } from "../identity/session/principal-resolver";
import { FoodDraftValidationError, type FoodDraftRepository } from "./draft-persistence";

export type FoodDraftServiceErrorCode = "unauthenticated" | "forbidden" | "access-unavailable" | "invalid-input" | "storage";
export type FoodDraftServiceResult<T> = Readonly<{ ok: true; value: T } | { ok: false; error: Readonly<{ code: FoodDraftServiceErrorCode; message: string }> }>;
export type FoodPrivateDraftService = {
    [K in keyof FoodDraftRepository]: (...args: Parameters<FoodDraftRepository[K]>) => Promise<FoodDraftServiceResult<Awaited<ReturnType<FoodDraftRepository[K]>>>>;
};
export interface FoodPrivateDraftServiceDependencies {
    readonly repository: FoodDraftRepository;
    readonly callerResolver: SessionPrincipalResolver;
    readonly administratorPrincipalId: PrincipalId;
}
const messages: Readonly<Record<FoodDraftServiceErrorCode, string>> = Object.freeze({
    unauthenticated: "Authentication is required.",
    forbidden: "Food draft access is forbidden.",
    "access-unavailable": "Food draft access is unavailable.",
    "invalid-input": "Invalid food draft operation input.",
    storage: "Food draft storage is unavailable.",
});
function failure(code: FoodDraftServiceErrorCode): FoodDraftServiceResult<never> {
    return Object.freeze({ ok: false, error: Object.freeze({ code, message: messages[code] }) });
}
function record(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Malformed caller resolution");
    return value as Record<string, unknown>;
}
function exactKeys(value: Record<string, unknown>, expected: readonly string[]): void {
    const keys = Object.keys(value);
    if (keys.length !== expected.length || keys.some(key => !expected.includes(key))) throw new TypeError("Malformed caller resolution");
}

/** Trusted resolver and policy are injected by a later private composition boundary. */
export class SingleAdminFoodDraftService implements FoodPrivateDraftService {
    readonly #repository: FoodDraftRepository;
    readonly #resolver: SessionPrincipalResolver;
    readonly #administrator: PrincipalId;
    constructor(dependencies: FoodPrivateDraftServiceDependencies) {
        this.#administrator = parsePrincipalId(dependencies.administratorPrincipalId);
        this.#repository = dependencies.repository;
        this.#resolver = dependencies.callerResolver;
    }
    async #authorize(): Promise<FoodDraftServiceErrorCode | undefined> {
        try {
            const resolution = record(await this.#resolver.resolve());
            if (resolution.ok === false) {
                exactKeys(resolution, ["ok", "error"]);
                const error = record(resolution.error); exactKeys(error, ["code", "message"]);
                if (typeof error.message !== "string") return "access-unavailable";
                return error.code === "unauthenticated" ? "unauthenticated" : "access-unavailable";
            }
            if (resolution.ok !== true) return "access-unavailable";
            exactKeys(resolution, ["ok", "value"]);
            const caller = record(resolution.value); exactKeys(caller, ["principalId"]);
            return parsePrincipalId(caller.principalId) === this.#administrator ? undefined : "forbidden";
        } catch { return "access-unavailable"; }
    }
    async #run<T>(operation: () => Promise<T>): Promise<FoodDraftServiceResult<T>> {
        const denied = await this.#authorize();
        if (denied !== undefined) return failure(denied);
        try { return Object.freeze({ ok: true, value: await operation() }); }
        catch (error) { return failure(error instanceof FoodDraftValidationError ? "invalid-input" : "storage"); }
    }
    createInitialRecipe(...args: Parameters<FoodDraftRepository["createInitialRecipe"]>) { return this.#run(() => this.#repository.createInitialRecipe(...args)); }
    appendRecipeRevision(...args: Parameters<FoodDraftRepository["appendRecipeRevision"]>) { return this.#run(() => this.#repository.appendRecipeRevision(...args)); }
    createInitialProduct(...args: Parameters<FoodDraftRepository["createInitialProduct"]>) { return this.#run(() => this.#repository.createInitialProduct(...args)); }
    appendProductRevision(...args: Parameters<FoodDraftRepository["appendProductRevision"]>) { return this.#run(() => this.#repository.appendProductRevision(...args)); }
    getRecipe(...args: Parameters<FoodDraftRepository["getRecipe"]>) { return this.#run(() => this.#repository.getRecipe(...args)); }
    getProduct(...args: Parameters<FoodDraftRepository["getProduct"]>) { return this.#run(() => this.#repository.getProduct(...args)); }
    listRecipeVersions(...args: Parameters<FoodDraftRepository["listRecipeVersions"]>) { return this.#run(() => this.#repository.listRecipeVersions(...args)); }
    listProductVersions(...args: Parameters<FoodDraftRepository["listProductVersions"]>) { return this.#run(() => this.#repository.listProductVersions(...args)); }
    listLatestRecipes(...args: Parameters<FoodDraftRepository["listLatestRecipes"]>) { return this.#run(() => this.#repository.listLatestRecipes(...args)); }
    listLatestProducts(...args: Parameters<FoodDraftRepository["listLatestProducts"]>) { return this.#run(() => this.#repository.listLatestProducts(...args)); }
}
