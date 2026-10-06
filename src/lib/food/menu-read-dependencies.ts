import type { FoodMenuReadDependencies } from "./menu-persistence";

export interface FoodMenuReadDependenciesCompositionInput {
    readonly repository: FoodMenuReadDependencies;
}

/** Trusted infrastructure projection; user-facing access decisions remain in private services. */
export function createFoodMenuReadDependencies(input: FoodMenuReadDependenciesCompositionInput): Readonly<FoodMenuReadDependencies> {
    let repository: FoodMenuReadDependencies;
    let getProduct: FoodMenuReadDependencies["getProduct"];
    let getRecipe: FoodMenuReadDependencies["getRecipe"];
    try {
        if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError();
        repository = input.repository;
        if (!repository || typeof repository !== "object" || Array.isArray(repository)) throw new TypeError();
        getProduct = repository.getProduct;
        getRecipe = repository.getRecipe;
        if (typeof getProduct !== "function" || typeof getRecipe !== "function") throw new TypeError();
    } catch { throw new TypeError("Food menu exact-read dependency configuration is unavailable."); }
    return Object.freeze({
        getProduct(id: unknown, version: unknown) { return getProduct.call(repository, id, version); },
        getRecipe(id: unknown, version: unknown) { return getRecipe.call(repository, id, version); },
    });
}
