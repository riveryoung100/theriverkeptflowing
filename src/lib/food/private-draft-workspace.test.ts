import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { createPrivateFoodDraftWorkspaceController, FOOD_WORKSPACE_FEEDBACK } from "./private-draft-workspace";
import type { FoodPrivateDraftService } from "./private-draft-service";
import { SingleAdminFoodDraftService } from "./private-draft-service";
import { InMemoryFoodDraftRepository } from "./draft-persistence";
import { parsePrincipalId } from "../identity/identifiers";
import { validateFoodRecipeDraft, validateFoodProductDraft, FOOD_EVIDENCE_SUBJECT_MAPPING, type FoodEvidenceRequirement } from "./draft-domain";

const recipe = (version = 1) => validateFoodRecipeDraft({ id: "food-recipe:workspace", version, evidence: [] });
const product = () => validateFoodProductDraft({ id: "food-product:workspace", version: 1, recipe: { id: recipe().id, version: 1 }, evidence: [] }, recipe());
const methods = ["listLatestRecipes", "listLatestProducts", "getRecipe", "getProduct", "listRecipeVersions", "listProductVersions", "createInitialRecipe", "appendRecipeRevision", "createInitialProduct", "appendProductRevision"] as const;
function fixture() {
    const calls: { method: string; args: unknown[] }[] = [];
    const responses: Record<string, unknown> = {};
    const service = Object.fromEntries(methods.map(method => [method, async (...args: unknown[]) => { calls.push({ method, args }); const value = responses[method]; if (value instanceof Error) throw value; return value; }])) as FoodPrivateDraftService;
    return { calls, responses, controller: createPrivateFoodDraftWorkspaceController(service) };
}
function invoke(controller: ReturnType<typeof createPrivateFoodDraftWorkspaceController>, method: typeof methods[number], args: unknown[]) {
    return (controller[method] as (...args: unknown[]) => Promise<unknown>)(...args);
}

test("all ten operations forward exact arguments without constructor I/O or destructive capabilities", async () => {
    const { calls, responses, controller } = fixture(); assert.equal(calls.length, 0); assert.deepEqual(Object.keys(controller), [...methods]); assert(Object.isFrozen(controller));
    for (const method of methods) {
        const args = method.startsWith("append") ? [method.includes("Recipe") ? recipe(2) : product(), 1] : method.startsWith("create") ? [method.includes("Recipe") ? recipe() : product()] : method.startsWith("get") ? ["invalid-unvalidated", 7] : method.includes("Versions") ? ["invalid-unvalidated", { limit: 7, afterVersion: 2 }] : [{ limit: 9, afterId: "exact-cursor" }];
        responses[method] = { ok: false, error: { code: "forbidden", message: "private internals" } };
        await invoke(controller, method, args); assert.equal(calls.at(-1)?.method, method); assert.deepEqual(calls.at(-1)?.args, args);
        args.forEach((arg, index) => assert.equal(calls.at(-1)?.args[index], arg));
    }
    responses.listLatestRecipes = { ok: true, value: { items: [], nextCursor: "cursor" } }; await controller.listLatestRecipes(); assert.deepEqual(calls.at(-1)?.args, []);
});

test("pages, histories and exact recipe outcomes preserve content/order/cursors as detached frozen state", async () => {
    const { controller, responses } = fixture();
    const items = [{ ...recipe(1), evidence: [] }, { ...recipe(2), evidence: [] }];
    for (const method of ["listLatestRecipes", "listLatestProducts", "listRecipeVersions", "listProductVersions"] as const) {
        responses[method] = { ok: true, value: { items, nextCursor: method.includes("Versions") ? 2 : "exact-cursor" } };
        const result = await invoke(controller, method, [recipe().id]) as { ok: true; value: { items: typeof items; nextCursor: unknown } };
        assert.deepEqual(result.value, (responses[method] as { value: unknown }).value); assert.notEqual(result.value.items, items);
        assert(Object.isFrozen(result.value)); assert(Object.isFrozen(result.value.items)); assert(Object.isFrozen(result.value.items[0].evidence));
    }
    responses.getRecipe = { ok: true, value: { outcome: "found", snapshot: recipe() } };
    const found = await controller.getRecipe(recipe().id, 1); assert(found.ok && found.value.outcome === "found"); assert.deepEqual(found.value.snapshot, recipe());
    responses.getRecipe = { ok: true, value: { outcome: "not-found" } }; assert.deepEqual(await controller.getRecipe(recipe().id, 1), responses.getRecipe);
});

test("product aggregation uses only the recorded recipe version and fails closed on second reads", async () => {
    const { controller, responses, calls } = fixture();
    responses.getProduct = { ok: true, value: { outcome: "not-found" } }; assert.deepEqual(await controller.getProduct(product().id, 1), responses.getProduct); assert.equal(calls.length, 1);
    responses.getProduct = { ok: true, value: { outcome: "found", snapshot: product() } };
    responses.getRecipe = { ok: true, value: { outcome: "found", snapshot: recipe() } };
    const found = await controller.getProduct(product().id, 1); assert(found.ok && found.value.outcome === "found"); assert.deepEqual(calls.at(-1), { method: "getRecipe", args: [recipe().id, 1] });
    assert.equal(found.value.completeness.requiredEvidencePresent, false); assert.equal(found.value.structuralLabel, "Required draft records present");
    for (const code of Object.keys(FOOD_WORKSPACE_FEEDBACK) as (keyof typeof FOOD_WORKSPACE_FEEDBACK)[]) {
        responses.getRecipe = { ok: false, error: { code, message: "private evidence SQL" } };
        assert.deepEqual(await controller.getProduct(product().id, 1), { ok: false, error: { code, message: FOOD_WORKSPACE_FEEDBACK[code] } });
    }
    for (const value of [{ ok: true, value: { outcome: "not-found" } }, { ok: true, value: { outcome: "found", snapshot: recipe(2) } }, new Error("private SQL")]) {
        responses.getRecipe = value; assert.deepEqual(await controller.getProduct(product().id, 1), { ok: false, error: { code: "storage", message: FOOD_WORKSPACE_FEEDBACK.storage } });
    }
});

test("all service failures and thrown errors are sanitized without submitted-value retention or empty successes", async () => {
    const { controller, responses } = fixture();
    for (const method of methods) for (const code of Object.keys(FOOD_WORKSPACE_FEEDBACK) as (keyof typeof FOOD_WORKSPACE_FEEDBACK)[]) {
        responses[method] = { ok: false, error: { code, message: "SQL private evidence stack" } };
        assert.deepEqual(await invoke(controller, method, [{ secret: "submitted payload" }, 1]), { ok: false, error: { code, message: FOOD_WORKSPACE_FEEDBACK[code] } });
    }
    for (const method of methods) { responses[method] = new Error("private exception"); assert.deepEqual(await invoke(controller, method, []), { ok: false, error: { code: "storage", message: FOOD_WORKSPACE_FEEDBACK.storage } }); }
});

test("mutation outcomes remain distinct, strip conflict reasons, and never retry or renumber", async () => {
    const { controller, responses, calls } = fixture();
    for (const method of ["createInitialRecipe", "appendRecipeRevision", "createInitialProduct", "appendProductRevision"] as const) for (const outcome of ["created", "already-present", "conflict"] as const) {
        responses[method] = { ok: true, value: outcome === "conflict" ? { outcome, reason: "private repository reason" } : { outcome, snapshot: recipe() } };
        const before = calls.length; const result = await invoke(controller, method, [recipe(), 1]) as { ok: true; value: { outcome: string; message: string } };
        assert(result.ok); assert.equal(result.value.outcome, outcome); assert.equal(calls.length, before + 1); assert(!("reason" in result.value));
        if (outcome === "conflict") assert.equal(result.value.message, "A different version already exists. Refresh and reconcile before retrying.");
    }
});

test("real service preserves authorization-first and immutable history/retry semantics", async () => {
    let allowed = false; const repository = new InMemoryFoodDraftRepository(); const admin = parsePrincipalId("principal:workspace");
    const controller = createPrivateFoodDraftWorkspaceController(new SingleAdminFoodDraftService({ repository, administratorPrincipalId: admin, callerResolver: { async resolve() { return { ok: true, value: { principalId: allowed ? admin : parsePrincipalId("principal:other") } }; } } }));
    assert.deepEqual(await controller.createInitialRecipe(null as never), { ok: false, error: { code: "forbidden", message: FOOD_WORKSPACE_FEEDBACK.forbidden } });
    allowed = true;
    const first = await controller.createInitialRecipe(recipe()); assert(first.ok); assert.equal(first.value.outcome, "created");
    const retry = await controller.createInitialRecipe(recipe()); assert(retry.ok); assert.equal(retry.value.outcome, "already-present");
    const conflict = await controller.createInitialRecipe(validateFoodRecipeDraft({ ...recipe(), ingredients: [] })); assert(conflict.ok); assert.equal(conflict.value.outcome, "conflict");
    assert((await controller.createInitialProduct(product())).ok); assert((await controller.appendRecipeRevision(recipe(2), 1)).ok);
    const detail = await controller.getProduct(product().id, 1); assert(detail.ok && detail.value.outcome === "found"); assert.equal(detail.value.recipe.version, 1);
    const history = await controller.listRecipeVersions(recipe().id); assert(history.ok); assert.deepEqual(history.value.items.map(r => r.version), [1, 2]);
    assert.throws(() => { (history.value.items as unknown as unknown[]).push(recipe(3)); });
    assert((await controller.appendProductRevision(validateFoodProductDraft({ ...product(), version: 2, recipe: { id: recipe().id, version: 2 } }, recipe(2)), 1)).ok);
    assert.equal(detail.value.snapshot.recipe.version, 1);
});

test("domain completeness remains separate from unresolved, unfavorable and inconclusive records", async () => {
    const { controller, responses } = fixture();
    const evidence = (requirement: FoodEvidenceRequirement) => ({ requirement, sourceReference: "source:document", subject: { type: FOOD_EVIDENCE_SUBJECT_MAPPING[requirement], id: FOOD_EVIDENCE_SUBJECT_MAPPING[requirement] === "recipe" ? recipe().id : product().id, version: 1 }, reviewDate: "2026-10-06", issuer: "issuer:review" });
    const r = validateFoodRecipeDraft({ ...recipe(), ingredients: [{ kind: "purchased-component", name: "Sauce", composition: "undisclosed" }, { kind: "purchased-component", name: "Base", composition: "disclosed", subingredients: [{ name: "Salt" }] }], allergenReview: { state: "reviewed", declarations: [] }, process: { classification: "unknown" }, evidence: [evidence("ingredient-composition-disclosure-status"), evidence("allergen-review"), evidence("preservation-process-classification")] });
    for (const conclusion of ["ineligible", "inconclusive"] as const) {
        const p = validateFoodProductDraft({ ...product(), temperatureControl: "unknown", cottageReview: { state: "reviewed", conclusion }, salesTaxReview: { state: "pending" }, historicalLabelReference: { id: "label:historical", version: 1 }, evidence: [evidence("temperature-control-classification"), evidence("cottage-eligibility-review"), evidence("sales-tax-review")] }, r);
        responses.getProduct = { ok: true, value: { outcome: "found", snapshot: p } }; responses.getRecipe = { ok: true, value: { outcome: "found", snapshot: r } };
        const detail = await controller.getProduct(p.id, 1); assert(detail.ok && detail.value.outcome === "found");
        assert(detail.value.completeness.requiredEvidencePresent); assert(detail.value.completeness.unresolvedReviews.length > 0); assert.deepEqual(detail.value.completeness.missingEvidenceRequirements, []);
        assert.deepEqual(detail.value.snapshot.historicalLabelReference, p.historicalLabelReference); assert.deepEqual(detail.value.recipe, r); assert.deepEqual(detail.value.snapshot, p);
        assert.notEqual(detail.value.recipe, r); assert(Object.isFrozen(detail.value.recipe.ingredients?.[1]));
        assert.doesNotMatch(JSON.stringify(detail.value), /allergen-free|ready to sell|sellable|approved|launch ready/);
    }
});

test("source isolates workspace from runtime, transport and sale authority", async () => {
    const source = await readFile(new URL("./private-draft-workspace.ts", import.meta.url), "utf8"); const ast = ts.createSourceFile("workspace.ts", source, ts.ScriptTarget.Latest, true);
    const imports = ast.statements.filter(ts.isImportDeclaration); assert.deepEqual(imports.map(i => (i.moduleSpecifier as ts.StringLiteral).text), ["./draft-domain", "./private-draft-service", "./draft-persistence"]);
    assert(imports[1].importClause?.isTypeOnly); assert(imports[2].importClause?.isTypeOnly);
    assert.doesNotMatch(source, /Astro|FormData|JSON\.|cloudflare:|globalThis|process\.|wrangler|RIVER_FOOD_DB|migration|commerce|stripe|fulfillment|accounting|community|deploy|insurance|sesh|fetch\(|Date\b|randomUUID|approved|sellable|allergen.free|launchReady|saleReady/);
});
