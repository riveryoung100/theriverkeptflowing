import { assessFoodDraftEvidenceCompleteness, type FoodRecipeDraft, type FoodProductDraft, type FoodDraftEvidenceCompleteness } from "./draft-domain";
import type { FoodPrivateDraftService, FoodDraftServiceErrorCode, FoodDraftServiceResult } from "./private-draft-service";
import type { FoodDraftAppendResult } from "./draft-persistence";

export const FOOD_WORKSPACE_FEEDBACK = Object.freeze({
    unauthenticated: "Authentication is required.",
    forbidden: "Food draft access is denied.",
    "access-unavailable": "Food draft access could not be checked.",
    "invalid-input": "The food draft submission is invalid.",
    storage: "Food draft storage is unavailable. Reconcile the result before retrying.",
});
export type FoodWorkspaceMutation<T> = Readonly<
    { outcome: "created" | "already-present"; snapshot: T; message: string } |
    { outcome: "conflict"; message: string }
>;
export type FoodWorkspaceProductDetail = Readonly<
    { outcome: "not-found" } |
    { outcome: "found"; snapshot: FoodProductDraft; recipe: FoodRecipeDraft; completeness: FoodDraftEvidenceCompleteness; structuralLabel: "Required draft records present" }
>;

function failure(code: FoodDraftServiceErrorCode): FoodDraftServiceResult<never> {
    return Object.freeze({ ok: false, error: Object.freeze({ code, message: FOOD_WORKSPACE_FEEDBACK[code] }) });
}
function detached<T>(value: T): T {
    if (Array.isArray(value)) return Object.freeze(value.map(item => detached(item))) as T;
    if (value !== null && typeof value === "object") {
        const copy: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(value)) Object.defineProperty(copy, key, { value: detached(child), enumerable: true });
        return Object.freeze(copy) as T;
    }
    return value;
}
function mutation<T>(value: FoodDraftAppendResult<T>): FoodWorkspaceMutation<T> {
    if (value.outcome === "conflict") return { outcome: "conflict", message: "A different version already exists. Refresh and reconcile before retrying." };
    return { outcome: value.outcome, snapshot: value.snapshot, message: value.outcome === "created" ? "Draft version created." : "Identical draft version already recorded." };
}

/** Inject an authorized service; construction performs no operation and presentation never validates submissions ahead of it. */
export function createPrivateFoodDraftWorkspaceController(service: FoodPrivateDraftService) {
    async function run<T, U>(operation: () => Promise<FoodDraftServiceResult<T>>, present: (value: T) => U): Promise<FoodDraftServiceResult<U>> {
        try {
            const result = await operation();
            if (!result.ok) return failure(result.error.code);
            return Object.freeze({ ok: true, value: detached(present(result.value)) });
        } catch { return failure("storage"); }
    }
    const identity = <T>(value: T): T => value;
    return Object.freeze({
        listLatestRecipes(...args: Parameters<FoodPrivateDraftService["listLatestRecipes"]>) { return run(() => service.listLatestRecipes(...args), identity); },
        listLatestProducts(...args: Parameters<FoodPrivateDraftService["listLatestProducts"]>) { return run(() => service.listLatestProducts(...args), identity); },
        getRecipe(...args: Parameters<FoodPrivateDraftService["getRecipe"]>) { return run(() => service.getRecipe(...args), identity); },
        async getProduct(...args: Parameters<FoodPrivateDraftService["getProduct"]>): Promise<FoodDraftServiceResult<FoodWorkspaceProductDetail>> {
            try {
                const product = await service.getProduct(...args);
                if (!product.ok) return failure(product.error.code);
                if (product.value.outcome === "not-found") return Object.freeze({ ok: true, value: Object.freeze({ outcome: "not-found" }) });
                const snapshot = product.value.snapshot;
                const recipe = await service.getRecipe(snapshot.recipe.id, snapshot.recipe.version);
                if (!recipe.ok) return failure(recipe.error.code);
                if (recipe.value.outcome === "not-found") return failure("storage");
                const completeness = assessFoodDraftEvidenceCompleteness(snapshot, recipe.value.snapshot);
                return Object.freeze({ ok: true, value: detached({ outcome: "found" as const, snapshot, recipe: recipe.value.snapshot, completeness, structuralLabel: "Required draft records present" as const }) });
            } catch { return failure("storage"); }
        },
        listRecipeVersions(...args: Parameters<FoodPrivateDraftService["listRecipeVersions"]>) { return run(() => service.listRecipeVersions(...args), identity); },
        listProductVersions(...args: Parameters<FoodPrivateDraftService["listProductVersions"]>) { return run(() => service.listProductVersions(...args), identity); },
        createInitialRecipe(snapshot: FoodRecipeDraft) { return run(() => service.createInitialRecipe(snapshot), mutation); },
        appendRecipeRevision(snapshot: FoodRecipeDraft, expectedPreviousVersion: number) { return run(() => service.appendRecipeRevision(snapshot, expectedPreviousVersion), mutation); },
        createInitialProduct(snapshot: FoodProductDraft) { return run(() => service.createInitialProduct(snapshot), mutation); },
        appendProductRevision(snapshot: FoodProductDraft, expectedPreviousVersion: number) { return run(() => service.appendProductRevision(snapshot, expectedPreviousVersion), mutation); },
    });
}
export type FoodPrivateDraftWorkspaceController = ReturnType<typeof createPrivateFoodDraftWorkspaceController>;
