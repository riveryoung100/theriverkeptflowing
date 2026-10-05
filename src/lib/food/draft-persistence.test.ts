import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { InMemoryFoodDraftRepository, serializeFoodRecipeDraft, serializeFoodProductDraft, deserializeFoodRecipeDraft, deserializeFoodProductDraft, FoodDraftValidationError, FOOD_DRAFT_DEFAULT_LIMIT, FOOD_DRAFT_MAXIMUM_LIMIT } from "./draft-persistence";
import { assessFoodDraftEvidenceCompleteness } from "./draft-domain";
const recipe = (id = "meal", version = 1) => ({ id: `food-recipe:${id}`, version, ingredients: [{ kind: "purchased-component", name: "Seasoning", composition: "undisclosed" }], allergenReview: { state: "unknown", declarations: [] }, process: { classification: "unknown" }, evidence: [] as unknown[] });
const product = (id = "meal", version = 1, recipeVersion = 1) => ({ id: `food-product:${id}`, version, recipe: { id: "food-recipe:meal", version: recipeVersion }, temperatureControl: "unknown", cottageReview: { state: "pending" }, salesTaxReview: { state: "unknown" }, evidence: [] as unknown[] });
function reverse(v: unknown): unknown { if (Array.isArray(v)) return v.map(reverse); if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).reverse().map(([k,value]) => [k,reverse(value)])); return v; }
function frozen(v: unknown): void { if (v && typeof v === "object") { assert(Object.isFrozen(v)); Object.values(v).forEach(frozen); } }
const evidence = (requirement: string, type: "recipe" | "product", version = 1) => ({ requirement, subject: { type, id: `food-${type}:meal`, version }, sourceReference: "source:review", reviewDate: "2026-10-05", issuer: "issuer:reviewer" });

test("canonical serialization ignores object insertion order but preserves ordered arrays", () => {
    const r = recipe(); const p = product();
    assert.equal(serializeFoodRecipeDraft(r), serializeFoodRecipeDraft(reverse(r)));
    assert.equal(serializeFoodProductDraft(p,r), serializeFoodProductDraft(reverse(p),reverse(r)));
    assert.deepEqual(Object.keys(JSON.parse(serializeFoodRecipeDraft(r))), ["formatVersion","recordType","recordId","recordVersion","snapshot"]);
    const ordered = { ...r, ingredients: [{ kind: "simple", name: "A" }, { kind: "simple", name: "B" }] };
    assert.notEqual(serializeFoodRecipeDraft(ordered), serializeFoodRecipeDraft({ ...ordered, ingredients: [...ordered.ingredients].reverse() }));
    assert.equal(serializeFoodRecipeDraft(deserializeFoodRecipeDraft(serializeFoodRecipeDraft(r))), serializeFoodRecipeDraft(r));
    assert.deepEqual(deserializeFoodProductDraft(serializeFoodProductDraft(p,r),r), p);
    frozen(deserializeFoodRecipeDraft(serializeFoodRecipeDraft(r)));
});

test("corrupt JSON, unsupported format, metadata mismatch and stale evidence fail closed", () => {
    const base = JSON.parse(serializeFoodRecipeDraft(recipe()));
    for (const value of ["{", "null", "[]", JSON.stringify({ ...base, formatVersion: 2 }), JSON.stringify({ ...base, recordType: "product" }), JSON.stringify({ ...base, recordId: "food-recipe:other" }), JSON.stringify({ ...base, recordVersion: 2 }), JSON.stringify({ ...base, unexpected: true })]) assert.throws(() => deserializeFoodRecipeDraft(value), FoodDraftValidationError);
    assert.throws(() => deserializeFoodProductDraft(serializeFoodProductDraft(product(),recipe()),recipe("meal",2)), FoodDraftValidationError);
    assert.throws(() => serializeFoodRecipeDraft({ ...recipe(), version: 2, evidence: [evidence("allergen-review","recipe")] }), FoodDraftValidationError);
    assert.throws(() => serializeFoodRecipeDraft({ ...recipe(), ready: true }), FoodDraftValidationError);
});

test("initial versions, missing predecessors, skipped versions and overflow conflict", async () => {
    const repo = new InMemoryFoodDraftRepository();
    assert.equal((await repo.createInitialRecipe(recipe("meal",2))).outcome,"conflict");
    assert.equal((await repo.appendRecipeRevision(recipe("meal",2),1)).outcome,"conflict");
    await repo.createInitialRecipe(recipe());
    assert.equal((await repo.appendRecipeRevision(recipe("meal",3),1)).outcome,"conflict");
    assert.equal((await repo.appendRecipeRevision(recipe(),1)).outcome,"conflict");
    assert.equal((await repo.appendRecipeRevision(recipe("other",2),1)).outcome,"conflict");
    assert.equal((await repo.appendRecipeRevision(recipe("meal",Number.MAX_SAFE_INTEGER),Number.MAX_SAFE_INTEGER)).outcome,"conflict");
    await assert.rejects(repo.appendRecipeRevision(recipe("meal",2),0),FoodDraftValidationError);
    await assert.rejects(repo.createInitialRecipe({ ...recipe(), version: "1" }),FoodDraftValidationError);
    assert.equal((await repo.createInitialProduct(product("meal",2))).outcome,"conflict");
    assert.equal((await repo.appendProductRevision(product("meal",2),1)).outcome,"conflict");
    assert.deepEqual(await repo.getRecipe("food-recipe:missing",1),{ outcome: "not-found" });
    assert.deepEqual(await repo.getProduct("food-product:missing",1),{ outcome: "not-found" });
});

test("same canonical key retries differ from conflicts including historical retries", async () => {
    const repo = new InMemoryFoodDraftRepository(); const r = recipe();
    assert.equal((await repo.createInitialRecipe(r)).outcome,"created");
    assert.equal((await repo.createInitialRecipe(reverse(r))).outcome,"already-present");
    assert.equal((await repo.createInitialRecipe({ ...r, ingredients: [] })).outcome,"conflict");
    assert.equal((await repo.appendRecipeRevision(recipe("meal",2),1)).outcome,"created");
    assert.equal((await repo.appendRecipeRevision(recipe("meal",3),2)).outcome,"created");
    assert.equal((await repo.appendRecipeRevision(recipe("meal",2),1)).outcome,"already-present");
    assert.equal((await repo.appendRecipeRevision({ ...recipe("meal",2), ingredients: [] },1)).outcome,"conflict");
    assert.equal((await repo.createInitialRecipe(r)).outcome,"already-present");
    assert.deepEqual((await repo.listRecipeVersions(r.id)).items.map(s => s.version),[1,2,3]);
});

test("exact stored recipe is required and product history never adopts latest implicitly", async () => {
    const repo = new InMemoryFoodDraftRepository();
    await assert.rejects(repo.createInitialProduct(product()), /Exact referenced recipe missing/);
    await repo.createInitialRecipe(recipe()); await repo.createInitialProduct(product());
    await repo.appendRecipeRevision(recipe("meal",2),1);
    const old = await repo.getProduct("food-product:meal",1); assert.equal(old.outcome,"found"); if(old.outcome === "found") assert.equal(old.snapshot.recipe.version,1);
    assert.equal((await repo.appendProductRevision(product("meal",2,2),1)).outcome,"created");
    assert.equal((await repo.appendProductRevision(product("meal",3,2),2)).outcome,"created");
    assert.equal((await repo.appendProductRevision(product("meal",2,2),1)).outcome,"already-present");
    assert.equal((await repo.appendProductRevision({ ...product("meal",2,2), temperatureControl: "frozen" },1)).outcome,"conflict");
    assert.equal((await repo.createInitialProduct(product())).outcome,"already-present");
    await assert.rejects(repo.createInitialProduct(product("other",1,3)),FoodDraftValidationError);
    assert.deepEqual((await repo.listProductVersions("food-product:meal")).items.map(s => s.recipe.version),[1,2,2]);
});

test("caller inputs and returned frozen snapshots cannot alter repository history", async () => {
    const repo = new InMemoryFoodDraftRepository(); const r = recipe(); const result = await repo.createInitialRecipe(r);
    assert.notEqual(result.outcome === "created" && result.snapshot.ingredients,r.ingredients);
    r.ingredients[0].name = "Changed"; r.evidence.push(evidence("allergen-review","recipe"));
    const first = await repo.getRecipe(r.id,1); const second = await repo.getRecipe(r.id,1);
    if(first.outcome !== "found" || second.outcome !== "found") assert.fail("Missing history");
    frozen(first.snapshot); assert.notEqual(first.snapshot,second.snapshot); assert.notEqual(first.snapshot.ingredients,second.snapshot.ingredients);
    assert.equal(first.snapshot.ingredients?.[0].name,"Seasoning");
    assert.throws(() => { (first.snapshot.ingredients as unknown[]).push({}); });
    assert.deepEqual(first.snapshot,second.snapshot);
    const p = product(); await repo.createInitialProduct(p); p.recipe.version = 8;
    const read = await repo.getProduct(p.id,1); if(read.outcome !== "found") assert.fail(); frozen(read.snapshot); assert.equal(read.snapshot.recipe.version,1);
    assert.deepEqual(await new InMemoryFoodDraftRepository().getRecipe(r.id,1),{ outcome: "not-found" });
});

test("history and latest pages use bounded version/ordinal identity ordering", async () => {
    const repo = new InMemoryFoodDraftRepository();
    await repo.createInitialRecipe(recipe());
    for(let v=2;v<=4;v++) await repo.appendRecipeRevision(recipe("meal",v),v-1);
    const one = await repo.listRecipeVersions("food-recipe:meal",{ limit:2 }); assert.deepEqual(one.items.map(s=>s.version),[1,2]); assert.equal(one.nextCursor,2);
    const two = await repo.listRecipeVersions("food-recipe:meal",{ limit:2,afterVersion:one.nextCursor }); assert.deepEqual(two.items.map(s=>s.version),[3,4]); assert.equal(two.nextCursor,undefined);
    assert.deepEqual(await repo.listRecipeVersions("food-recipe:none"),{items:[]});
    for(const id of ["z","a","A"]) { await repo.createInitialRecipe(recipe(id)); await repo.createInitialProduct(product(id)); }
    const rp = await repo.listLatestRecipes({limit:2}); assert.deepEqual(rp.items.map(s=>s.id),["food-recipe:A","food-recipe:a"]); assert.equal(rp.nextCursor,"food-recipe:a");
    assert.deepEqual((await repo.listLatestRecipes({afterId:rp.nextCursor})).items.map(s=>s.id),["food-recipe:meal","food-recipe:z"]);
    assert.equal((await repo.listLatestRecipes()).items.find(s=>s.id==="food-recipe:meal")?.version,4);
    assert.deepEqual((await repo.listLatestProducts()).items.map(s=>s.id),["food-product:A","food-product:a","food-product:z"]);
    assert.deepEqual(await repo.listLatestProducts({afterId:"food-product:z"}),{items:[]});
    frozen(rp);
});

test("default/max limits and transparent cursor validation", async () => {
    const repo = new InMemoryFoodDraftRepository();
    assert.equal(FOOD_DRAFT_DEFAULT_LIMIT,20); assert.equal(FOOD_DRAFT_MAXIMUM_LIMIT,100);
    for(let i=104;i>=0;i--) await repo.createInitialRecipe(recipe(String(i).padStart(3,"0")));
    assert.equal((await repo.listLatestRecipes()).items.length,20);
    assert.equal((await repo.listLatestRecipes({limit:100})).items.length,100);
    for(const limit of [0,-1,101,1.5,NaN,Infinity,"20",null]) {
        await assert.rejects(repo.listLatestRecipes({limit} as never),FoodDraftValidationError);
        await assert.rejects(repo.listLatestProducts({limit} as never),FoodDraftValidationError);
        await assert.rejects(repo.listRecipeVersions("food-recipe:000",{limit} as never),FoodDraftValidationError);
        await assert.rejects(repo.listProductVersions("food-product:000",{limit} as never),FoodDraftValidationError);
    }
    await assert.rejects(repo.listLatestRecipes({afterId:"food-product:x"}),FoodDraftValidationError);
    await assert.rejects(repo.listLatestProducts({afterId:"food-recipe:x"}),FoodDraftValidationError);
    await assert.rejects(repo.listRecipeVersions("food-recipe:000",{afterVersion:0}),FoodDraftValidationError);
    await assert.rejects(repo.listLatestRecipes({offset:2} as never),FoodDraftValidationError);
});

test("competing appends have one winner and no renumbering", async () => {
    const repo = new InMemoryFoodDraftRepository(); await repo.createInitialRecipe(recipe());
    const outcomes = await Promise.all([repo.appendRecipeRevision(recipe("meal",2),1),repo.appendRecipeRevision({ ...recipe("meal",2),ingredients:[] },1),repo.appendRecipeRevision(recipe("meal",2),1)]);
    assert.deepEqual(outcomes.map(r=>r.outcome),["created","conflict","already-present"]);
    assert.deepEqual((await repo.listRecipeVersions("food-recipe:meal")).items.map(s=>s.version),[1,2]);
    await repo.createInitialProduct(product());
    const products = await Promise.all([repo.appendProductRevision(product("meal",2,2),1),repo.appendProductRevision({ ...product("meal",2,2),temperatureControl:"frozen" },1),repo.appendProductRevision(product("meal",2,2),1)]);
    assert.deepEqual(products.map(r=>r.outcome),["created","conflict","already-present"]);
});

test("unresolved and adverse review data preserve completeness without storing authority", async () => {
    const repo = new InMemoryFoodDraftRepository(); const r = recipe(); const p = product(); await repo.createInitialRecipe(r); await repo.createInitialProduct(p);
    const gotR = await repo.getRecipe(r.id,1); const gotP = await repo.getProduct(p.id,1); if(gotR.outcome!=="found"||gotP.outcome!=="found")assert.fail();
    assert.deepEqual(assessFoodDraftEvidenceCompleteness(gotP.snapshot,gotR.snapshot),assessFoodDraftEvidenceCompleteness(p,r));
    assert.equal(assessFoodDraftEvidenceCompleteness(gotP.snapshot,gotR.snapshot).requiredEvidencePresent,true);
    assert(assessFoodDraftEvidenceCompleteness(gotP.snapshot,gotR.snapshot).unresolvedReviews.length>0);
    const adverse = { ...product("meal",2),cottageReview:{state:"reviewed",conclusion:"ineligible"},salesTaxReview:{state:"reviewed",conclusion:"inconclusive"},evidence:[evidence("cottage-eligibility-review","product",2),evidence("sales-tax-review","product",2)] };
    await repo.appendProductRevision(adverse,1); const got = await repo.getProduct(p.id,2); if(got.outcome!=="found")assert.fail();
    assert.deepEqual(got.snapshot,adverse);
    assert(assessFoodDraftEvidenceCompleteness(got.snapshot,r).unresolvedReviews.some(v=>v.condition==="inconclusive"));
    assert.throws(()=>serializeFoodProductDraft({...adverse,requiredEvidencePresent:true},r));
    await assert.rejects(repo.appendProductRevision({...adverse,version:3},2),FoodDraftValidationError);
});

test("source isolation imports only domain authority and contains no external runtime operations", async () => {
    const source = await readFile(new URL("./draft-persistence.ts",import.meta.url),"utf8");
    const file = ts.createSourceFile("draft-persistence.ts",source,ts.ScriptTarget.Latest,true);
    const imports=file.statements.filter(ts.isImportDeclaration);assert.equal(imports.length,1);assert.equal((imports[0].moduleSpecifier as ts.StringLiteral).text,"./draft-domain");
    assert.doesNotMatch(source,/\b(?:fetch|Date|globalThis|randomUUID|requestContact)\b|process\.env|Math\.random|import\s*\(/);
    let awaits=0; const visit=(node:ts.Node):void=>{if(ts.isAwaitExpression(node))awaits++;ts.forEachChild(node,visit);};visit(file);assert.equal(awaits,0);
});
