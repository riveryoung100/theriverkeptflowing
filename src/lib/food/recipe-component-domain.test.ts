import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createFoodComponentId, parseFoodComponentId, validateFoodComponentVersion, validateFoodRecipeVersion, reviseFoodComponentVersion, reviseFoodRecipeVersion } from "./recipe-component-domain";
import { validateFoodRecipeDraft, validateFoodProductDraft, assessFoodDraftEvidenceCompleteness } from "./draft-domain";
import { validateFoodPrototypeCapture } from "./prototype-capture-domain";

// Synthetic formulations only; not production recipes or sale-approved products.
const component = (version = 1) => ({ id: "food-component:synthetic", version, name: "Synthetic preparation", composition: [{ kind: "ingredient", ingredient: { kind: "simple", name: "Test flour" }, grams: 100.25 }], method: ["Synthetic combine", "Synthetic rest"], yieldGrams: 95.5 });
const draft = (version = 1) => ({ id: "food-recipe:synthetic", version, ingredients: [{ kind: "simple", name: "Test potato" }], evidence: [] });
const formulation = (version = 1) => ({ id: draft().id, version, composition: [{ kind: "ingredient", ingredientIndex: 0, grams: 10 }, { kind: "component", component: { id: component().id, version: 1 }, grams: 25.5 }], method: ["Synthetic mix", "Synthetic finish"], yieldGrams: 30 });
const build = (v: unknown = formulation(), d: unknown = draft(), c: unknown = [component()]) => validateFoodRecipeVersion(v, d, c);

test("distinct component identities and safe numeric versions", () => {
    assert.equal(createFoodComponentId("synthetic"), parseFoodComponentId(component().id));
    for (const id of ["food-recipe:synthetic", "food-product:synthetic", "food-component:", "food-component:a:b", " food-component:a", null]) assert.throws(() => validateFoodComponentVersion({ ...component(), id }));
    for (const version of [0, -1, 1.5, Infinity, NaN, "latest", Number.MAX_SAFE_INTEGER + 1]) {
        assert.throws(() => validateFoodComponentVersion({ ...component(), version }));
        assert.throws(() => build({ ...formulation(), version }));
    }
    assert.equal(validateFoodComponentVersion(component(Number.MAX_SAFE_INTEGER)).version, Number.MAX_SAFE_INTEGER);
});
test("immutable components preserve composition, method and formulation yield", () => {
    const input = component(); const value = validateFoodComponentVersion(input);
    assert.deepEqual(value, input); assert.equal(value.composition[0].grams, 100.25);
    assert.deepEqual(value.method, input.method); assert.equal(value.yieldGrams, 95.5);
    input.composition[0].ingredient.name = "Changed"; input.method[0] = "Changed";
    assert.equal(value.composition[0].ingredient.name, "Test flour"); assert.equal(value.method[0], "Synthetic combine");
    assert.throws(() => { (value.composition[0].ingredient as { name: string }).name = "Changed"; });
    assert.throws(() => (value.method as string[]).push("Changed"));
});
test("recipe direct ingredients use exact draft positions and component references stay exact", () => {
    const recipe = build(); assert.deepEqual(recipe, formulation());
    assert.deepEqual(recipe.composition[1], { kind: "component", component: { id: component().id, version: 1 }, grams: 25.5 });
    assert.equal("ingredient" in recipe.composition[1], false);
    const direct = { ...formulation(), composition: [formulation().composition[0]] };
    assert.deepEqual(validateFoodRecipeVersion(direct, draft()).composition, direct.composition);
    assert.throws(() => build(formulation(), { ...draft(), version: 2 }));
    assert.throws(() => build(formulation(), { ...draft(), id: "food-recipe:other" }));
    assert.throws(() => build(formulation(), draft(), [component(2)]));
    for (const ingredientIndex of [-1, 1, 0.5, "0"]) assert.throws(() => build({ ...direct, composition: [{ kind: "ingredient", ingredientIndex, grams: 10 }] }));
});
test("new component revisions cannot alter old recipe references or replace exact context", () => {
    const oldComponent = validateFoodComponentVersion(component()); const oldRecipe = build();
    const next = reviseFoodComponentVersion(oldComponent, { ...component(2), yieldGrams: 90 });
    assert.equal(oldComponent.yieldGrams, 95.5); assert.equal(next.version, 2);
    assert.deepEqual(build(formulation(), draft(), [oldComponent, next]), oldRecipe);
    assert.throws(() => build(formulation(), draft(), [next]));
    const newer = { ...formulation(2), composition: [{ kind: "component", component: { id: next.id, version: 2 }, grams: 15 }] };
    assert.equal(reviseFoodRecipeVersion(oldRecipe, newer, draft(), draft(2), [oldComponent], [next]).version, 2);
    assert.deepEqual(oldRecipe.composition[1], formulation().composition[1]);
    for (const v of [1, 3]) assert.throws(() => reviseFoodComponentVersion(component(), component(v)));
    assert.throws(() => reviseFoodComponentVersion(component(), { ...component(2), id: "food-component:other" }));
    assert.throws(() => reviseFoodComponentVersion(component(Number.MAX_SAFE_INTEGER), component(Number.MAX_SAFE_INTEGER)));
    assert.throws(() => reviseFoodRecipeVersion(formulation(), formulation(3), draft(), draft(3), [component()], [component()]));
});
test("mass, yield, text and required collections reject malformed input", () => {
    for (const grams of [0, -1, Infinity, NaN, "1", null, Number.MAX_SAFE_INTEGER + 1]) {
        assert.throws(() => validateFoodComponentVersion({ ...component(), yieldGrams: grams }));
        assert.throws(() => validateFoodComponentVersion({ ...component(), composition: [{ ...component().composition[0], grams }] }));
        assert.throws(() => build({ ...formulation(), yieldGrams: grams }));
        assert.throws(() => build({ ...formulation(), composition: [{ ...formulation().composition[1], grams }] }));
    }
    for (const composition of [[], Array(1), Array(129).fill(component().composition[0]), null]) assert.throws(() => validateFoodComponentVersion({ ...component(), composition }));
    assert.throws(() => build({ ...formulation(), composition: [] }));
    for (const method of [[], [""], [" leading"], [3], Array(1), Array(129).fill("step")]) {
        assert.throws(() => validateFoodComponentVersion({ ...component(), method })); assert.throws(() => build({ ...formulation(), method }));
    }
    assert.throws(() => validateFoodComponentVersion({ ...component(), name: "" }));
});
test("duplicates have deterministic rules and nesting is rejected", () => {
    const c = component(); assert.throws(() => validateFoodComponentVersion({ ...c, composition: [c.composition[0], c.composition[0]] }));
    const f = formulation(); assert.throws(() => build({ ...f, composition: [f.composition[0], f.composition[0]] }));
    assert.throws(() => build({ ...f, composition: [f.composition[1], { ...f.composition[1], component: { id: c.id, version: 2 } }] }, draft(), [c, component(2)]));
    assert.throws(() => build(f, draft(), [c, c]));
    assert.throws(() => validateFoodComponentVersion({ ...c, composition: [f.composition[1]] }));
    assert.deepEqual(build({ ...f, composition: [...f.composition].reverse() }).composition, [...f.composition].reverse());
    assert.throws(() => build({ ...f, composition: [{ kind: "component", component: { id: c.id, version: "latest" }, grams: 1 }] }));
});
test("optional deliberate capture links never consume or promote experimental captures", () => {
    const capture = validateFoodPrototypeCapture({ id: "food-prototype-capture:synthetic", inputs: [{ key: "test", ingredientName: "Synthetic input", grams: 1 }], method: ["Synthetic step"], adjustments: [], finishedYieldGrams: 1, observations: [], provenance: { kind: "founder-measured", sourceReference: "fixture:synthetic" } });
    const before = structuredClone(capture);
    const value = validateFoodComponentVersion({ ...component(), captureSources: [capture.id] });
    assert.deepEqual(value.captureSources, [capture.id]); assert.deepEqual(capture, before);
    assert.equal("recipe" in capture, false); assert.equal("component" in capture, false);
    assert.throws(() => validateFoodComponentVersion(capture));
    for (const captureSources of [["food-recipe:synthetic"], [capture.id, capture.id], [""], [capture]]) assert.throws(() => validateFoodComponentVersion({ ...component(), captureSources }));
    assert.deepEqual(build({ ...formulation(), captureSources: [capture.id] }).captureSources, [capture.id]);
});
test("canonical draft, purchased ingredient, product and evidence semantics remain compatible", () => {
    const r = draft(); const p = { id: "food-product:synthetic", version: 1, recipe: { id: r.id, version: 1 }, evidence: [] };
    const before = structuredClone({ r, p }); const evidence = assessFoodDraftEvidenceCompleteness(p, r);
    build(formulation(), r); assert.deepEqual({ r, p }, before);
    assert.deepEqual(validateFoodRecipeDraft(r), r); assert.deepEqual(validateFoodProductDraft(p, r), p);
    assert.deepEqual(assessFoodDraftEvidenceCompleteness(p, r), evidence);
    assert.throws(() => build({ ...formulation(), id: p.id }, r));
    const ingredient = { kind: "purchased-component", name: "Synthetic purchased input", composition: "disclosed", subingredients: [{ name: "Test ingredient" }] };
    const c = validateFoodComponentVersion({ ...component(), composition: [{ kind: "ingredient", ingredient, grams: 2 }] });
    assert.deepEqual(c.composition[0].ingredient, ingredient); ingredient.subingredients[0].name = "Changed";
    assert.notDeepEqual(c.composition[0].ingredient, ingredient);
    assert.throws(() => validateFoodComponentVersion({ ...component(), composition: [{ kind: "ingredient", ingredient: { ...ingredient, composition: "invalid" }, grams: 2 }] }));
});
test("recipe snapshots detach all nested arrays and references and reject deferred fields", () => {
    const input = formulation(); const value = build(input); const before = structuredClone(input);
    input.composition[1].component!.version = 99; input.method[0] = "Changed";
    assert.deepEqual(value, before);
    function frozen(v: unknown): void { if (v && typeof v === "object") { assert(Object.isFrozen(v)); Object.values(v).forEach(frozen); } }
    frozen(value); frozen(validateFoodComponentVersion(component()));
    assert.throws(() => (value.composition as unknown[]).push({}));
    const line = value.composition[1]; if (line.kind !== "component") throw new Error("Expected component fixture");
    assert.throws(() => { (line.component as { version: number }).version = 99; });
    for (const field of ["price", "nutrition", "sku", "approved", "evidence", "customerInstructions"]) {
        assert.throws(() => build({ ...formulation(), [field]: true })); assert.throws(() => validateFoodComponentVersion({ ...component(), [field]: true }));
    }
});
test("pure domain imports canonical validators with no IO or recipe-specific constants", async () => {
    const source = await readFile(new URL("./recipe-component-domain.ts", import.meta.url), "utf8");
    assert.doesNotMatch(source, /\b(?:fetch|Date|randomUUID|require|gnocchi)\b|process\.env|Math\.random|import\s*\(/);
});
