import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createFoodMenuReadDependencies } from "./menu-read-dependencies";
import { InMemoryFoodDraftRepository, FoodDraftStorageError, FoodDraftValidationError, type FoodDraftReadResult } from "./draft-persistence";
import { createFoodProductId, createFoodRecipeId, type FoodProductDraft, type FoodRecipeDraft } from "./draft-domain";
import { InMemoryFoodMenuRepository, type FoodMenuReadDependencies } from "./menu-persistence";
import { createFoodDishId, type FoodDishPresentation } from "./dish-offer-domain";
import { SingleAdminFoodMenuService } from "./private-menu-service";
import { parsePrincipalId } from "../identity/identifiers";
import type { FoodPrivateMenuRuntimeCompositionInput } from "./private-menu-runtime-composition";
import type { FoodPrivateMenuServerContextInput } from "./private-menu-server-adapter";

const missing = { outcome: "not-found" } as const;
function deepFrozen(value: unknown): void { if (value && typeof value === "object") { assert(Object.isFrozen(value)); Object.values(value).forEach(deepFrozen); } }
async function fixture() {
    const drafts = new InMemoryFoodDraftRepository();
    const recipe = { id: createFoodRecipeId("q"), version: 1, evidence: [] };
    const product = { id: createFoodProductId("q"), version: 1, recipe: { id: recipe.id, version: 1 }, evidence: [] };
    await drafts.createInitialRecipe(recipe); await drafts.createInitialProduct(product);
    const presentation: FoodDishPresentation = { dishId: createFoodDishId("q"), version: 1, product: { id: product.id, version: 1 }, recipe: { id: recipe.id, version: 1 }, name: "Dish", mediaReferences: [] };
    return { drafts, recipe, product, presentation };
}
test("construction captures only required properties once without reads or unrelated capability access", () => {
    const accesses: string[] = []; let calls = 0;
    const repository = {
        get getProduct() { accesses.push("getProduct"); return () => { calls++; return Promise.resolve(missing); }; },
        get getRecipe() { accesses.push("getRecipe"); return () => { calls++; return Promise.resolve(missing); }; },
        get database() { return assert.fail("database inspected"); },
        get resolve() { return assert.fail("authorization inspected"); },
        get environment() { return assert.fail("environment inspected"); },
        get createInitialRecipe() { return assert.fail("mutation inspected"); },
    };
    const result = createFoodMenuReadDependencies({ get repository() { accesses.push("repository"); return repository; } });
    assert.deepEqual(accesses, ["repository", "getProduct", "getRecipe"]); assert.equal(calls, 0);
    assert(Object.isFrozen(result)); assert.deepEqual(Reflect.ownKeys(result), ["getProduct", "getRecipe"]); assert(!Object.isFrozen(repository));
    assert.throws(() => Object.assign(result, { extra: 1 }), TypeError);
});
test("malformed and throwing dependencies have one fixed construction failure", () => {
    const valid = { getProduct: () => Promise.resolve(missing), getRecipe: () => Promise.resolve(missing) };
    const inputs = [undefined, null, [], {}, { repository: null }, { repository: [] }, { repository: {} }, { repository: { ...valid, getProduct: 1 } }, { repository: { ...valid, getRecipe: null } },
        { get repository() { throw new Error("private config"); } },
        { repository: { ...valid, get getProduct() { throw new Error("private"); } } },
        { repository: { ...valid, get getRecipe() { throw new Error("private"); } } }];
    for (const input of inputs) assert.throws(() => createFoodMenuReadDependencies(input as never), { name: "TypeError", message: "Food menu exact-read dependency configuration is unavailable." });
});
test("both exact methods preserve receiver, coordinates, Promise and result identity without retargeting", async () => {
    const calls: unknown[][] = [], id = { opaque: true }, version = { opaque: true };
    const productResult: FoodDraftReadResult<FoodProductDraft> = { outcome: "found", snapshot: { private: true } as never };
    const recipeResult: FoodDraftReadResult<FoodRecipeDraft> = { outcome: "found", snapshot: { private: true } as never };
    const productPromise = Promise.resolve(productResult), recipePromise = Promise.resolve(recipeResult);
    const repository: FoodMenuReadDependencies = {
        getProduct(a, b) { assert.equal(this, repository); calls.push(["product", a, b]); return productPromise; },
        getRecipe(a, b) { assert.equal(this, repository); calls.push(["recipe", a, b]); return recipePromise; },
    };
    const projected = createFoodMenuReadDependencies({ repository });
    repository.getProduct = () => assert.fail("replacement used"); repository.getRecipe = () => assert.fail("replacement used");
    assert.equal(projected.getProduct(id, version), productPromise); assert.equal(projected.getRecipe(id, version), recipePromise);
    assert.equal(await productPromise, productResult); assert.equal(await recipePromise, recipeResult);
    assert.deepEqual(calls, [["product", id, version], ["recipe", id, version]]);
    assert(!Object.isFrozen(productResult)); assert(!Object.isFrozen(productResult.snapshot)); assert(!Object.isFrozen(recipeResult));
    const absent = createFoodMenuReadDependencies({ repository: { getProduct: () => Promise.resolve(missing), getRecipe: () => Promise.resolve(missing) } });
    assert.equal(await absent.getProduct(" food-product:q", "01"), missing); assert.equal(await absent.getRecipe(null, undefined), missing);
});
test("sync throws and async storage/validation rejections propagate unchanged without retries", async () => {
    for (const error of [new FoodDraftStorageError("private SQL"), new FoodDraftValidationError("invalid coordinates")]) {
        let productCalls = 0, recipeCalls = 0;
        const throwing = createFoodMenuReadDependencies({ repository: { getProduct() { productCalls++; throw error; }, getRecipe() { recipeCalls++; throw error; } } });
        assert.throws(() => throwing.getProduct(null, null), caught => caught === error); assert.throws(() => throwing.getRecipe(null, null), caught => caught === error);
        const rejecting = createFoodMenuReadDependencies({ repository: { getProduct() { productCalls++; return Promise.reject(error); }, getRecipe() { recipeCalls++; return Promise.reject(error); } } });
        await assert.rejects(rejecting.getProduct(null, null), caught => caught === error); await assert.rejects(rejecting.getRecipe(null, null), caught => caught === error);
        assert.equal(productCalls, 2); assert.equal(recipeCalls, 2);
    }
});
test("real historical reads remain exact, detached and deeply frozen", async () => {
    const f = await fixture(), projected = createFoodMenuReadDependencies({ repository: f.drafts });
    await f.drafts.appendRecipeRevision({ ...f.recipe, version: 2 }, 1);
    await f.drafts.appendProductRevision({ ...f.product, version: 2, recipe: { id: f.recipe.id, version: 2 } }, 1);
    const first = await projected.getProduct(f.product.id, 1), second = await projected.getProduct(f.product.id, 1), recipe = await projected.getRecipe(f.recipe.id, 1);
    assert(first.outcome === "found" && second.outcome === "found" && recipe.outcome === "found");
    assert.equal(first.snapshot.version, 1); assert.equal(first.snapshot.recipe.version, 1); assert.equal(recipe.snapshot.version, 1);
    assert.notEqual(first.snapshot, second.snapshot); assert.notEqual(first.snapshot.recipe, second.snapshot.recipe); deepFrozen(first); deepFrozen(recipe);
    assert.deepEqual(await projected.getProduct(f.product.id, 99), missing); assert.deepEqual(await projected.getRecipe(f.recipe.id, 99), missing);
    await assert.rejects(projected.getRecipe(" food-recipe:q", 1), FoodDraftValidationError);
});
test("menu consumers retain missing, corrupt and thrown dependency classifications", async () => {
    const f = await fixture(); let mode = "found";
    const malformed = { outcome: "found", snapshot: {} };
    const repository: FoodMenuReadDependencies = {
        getProduct(id, version) { if (mode === "throw") throw new Error("private evidence SQL"); if (mode === "missing") return Promise.resolve(missing); if (mode === "corrupt") return Promise.resolve(malformed as never); return f.drafts.getProduct(id, version); },
        getRecipe(id, version) { return f.drafts.getRecipe(id, version); },
    };
    const projected = createFoodMenuReadDependencies({ repository }), menu = new InMemoryFoodMenuRepository(projected);
    const created = await menu.createInitialPresentation(f.presentation); assert(created.ok);
    for (const state of ["missing", "corrupt", "throw"]) {
        mode = state;
        const fresh = await new InMemoryFoodMenuRepository(projected).createInitialPresentation(f.presentation);
        assert(!fresh.ok); assert.equal(fresh.error.code, state === "missing" ? "invalid-input" : "storage");
        const stored = await menu.getPresentation(f.presentation.dishId, 1); assert(!stored.ok); assert.equal(stored.error.code, "storage"); assert(!JSON.stringify(stored).includes("private evidence"));
    }
    mode = "corrupt"; assert.equal(await projected.getProduct(f.product.id, 1), malformed);
});
test("denied menu operations perform no projected reads and keep authorization in the service", async () => {
    const f = await fixture(); let reads = 0, resolutions = 0;
    const dependencies = createFoodMenuReadDependencies({ repository: { getProduct(...args) { reads++; return f.drafts.getProduct(...args); }, getRecipe(...args) { reads++; return f.drafts.getRecipe(...args); } } });
    const service = new SingleAdminFoodMenuService({ repository: new InMemoryFoodMenuRepository(dependencies), administratorPrincipalId: parsePrincipalId("principal:admin"), callerResolver: { async resolve() { resolutions++; return { ok: false, error: { code: "unauthenticated", message: "private" } }; } } });
    await service.createInitialPresentation(f.presentation); await service.getPresentation(f.presentation.dishId, 1);
    assert.equal(reads, 0); assert.equal(resolutions, 2);
});
test("concurrent reads keep separate coordinates and Promise state", async () => {
    const pending: { id: unknown; version: unknown; resolve: (value: typeof missing) => void }[] = [];
    const repository: FoodMenuReadDependencies = { getProduct(id, version) { return new Promise(resolve => pending.push({ id, version, resolve })); }, getRecipe(id, version) { return new Promise(resolve => pending.push({ id, version, resolve })); } };
    const projected = createFoodMenuReadDependencies({ repository });
    const first = projected.getProduct("food-product:one", 3), second = projected.getRecipe("food-recipe:two", 7);
    const one = { outcome: "not-found" } as const, two = { outcome: "not-found" } as const;
    pending[1].resolve(two); assert.equal(await second, two); pending[0].resolve(one); assert.equal(await first, one);
    assert.deepEqual(pending.map(({ id, version }) => [id, version]), [["food-product:one", 3], ["food-recipe:two", 7]]);
});
test("existing consumer input types accept the projection without casts; source remains isolated", () => {
    const result = createFoodMenuReadDependencies({ repository: new InMemoryFoodDraftRepository() });
    const dependency: FoodMenuReadDependencies = result;
    const h: Pick<FoodPrivateMenuRuntimeCompositionInput, "readDependencies"> = { readDependencies: dependency };
    const j: Pick<FoodPrivateMenuServerContextInput, "readDependencies"> = { readDependencies: dependency };
    assert.equal(h.readDependencies, result); assert.equal(j.readDependencies, result);
    const source = readFileSync(new URL("./menu-read-dependencies.ts", import.meta.url), "utf8");
    assert.deepEqual([...source.matchAll(/from "(.+)"/g)].map(match => match[1]), ["./menu-persistence"]);
    assert.doesNotMatch(source, /as any|as unknown as|new .*Repository|runAuthorized|\.resolve\(|prepare\(|batch\(|process\.|globalThis|cloudflare|wrangler|fetch\(|console\.|getLatest|createInitial|appendRevision|JSON\./);
});
