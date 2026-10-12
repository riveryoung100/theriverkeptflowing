import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createFoodPrototypeCaptureId, parseFoodPrototypeCaptureId, validateFoodPrototypeCapture } from "./prototype-capture-domain";
import { validateFoodRecipeDraft, validateFoodProductDraft, assessFoodDraftEvidenceCompleteness } from "./draft-domain";

// Synthetic fixtures only: no finalized or production recipe.
const recipe = () => ({ id: "food-recipe:synthetic", version: 2, ingredients: [{ kind: "simple", name: "Synthetic flour" }], evidence: [] });
const product = () => ({ id: "food-product:synthetic", version: 3, recipe: { id: "food-recipe:synthetic", version: 2 }, evidence: [] });
const fixture = () => ({
    id: "food-prototype-capture:synthetic-run", recipe: { id: "food-recipe:synthetic", version: 2 }, product: { id: "food-product:synthetic", version: 3 },
    inputs: [{ key: "flour", ingredientName: "Synthetic flour", grams: 100.25, recipeIngredientIndex: 0 }],
    method: ["Combine synthetic inputs", "Shape synthetic batch"],
    adjustments: [{ kind: "mass", action: "add", inputKey: "flour", grams: 2.5, text: "Observed sticky texture" }, { kind: "process", text: "Rested longer" }],
    finishedYieldGrams: 95.5, observations: [{ category: "freezing", text: "Synthetic test observation" }],
    provenance: { kind: "founder-measured", sourceReference: "fixture:synthetic-not-production", occurredOn: "2026-10-12" },
});
const build = (input: unknown = fixture(), r: unknown = recipe(), p: unknown = product()) => validateFoodPrototypeCapture(input, r, p);

test("valid capture preserves exact context, measurements, ordering and separate adjustments", () => {
    const f = fixture(); const result = build(f);
    assert.deepEqual(result, f);
    assert.equal(result.inputs[0].grams, 100.25);
    assert.equal(result.finishedYieldGrams, 95.5);
    assert.deepEqual(result.method, f.method);
    assert.deepEqual(result.adjustments, f.adjustments);
    assert.notEqual(String(result.id), String(result.recipe?.id));
    assert.notEqual(String(result.id), String(result.product?.id));
    assert.equal(createFoodPrototypeCaptureId("synthetic-run"), parseFoodPrototypeCaptureId(f.id));
});
test("identity boundaries reject wrong prefixes and malformed local IDs", () => {
    for (const id of ["food-recipe:synthetic", "food-product:synthetic", "food-prototype-capture:", "food-prototype-capture:a:b", " food-prototype-capture:a", null, 1]) assert.throws(() => build({ ...fixture(), id }));
    for (const id of ["", " a", "a ", "a:b", null]) assert.throws(() => createFoodPrototypeCaptureId(id));
});
test("context-free experiments and recipe-only experiments are supported", () => {
    const { recipe: _r, product: _p, ...f } = fixture();
    assert(_r && _p);
    const inputs = [{ key: "new", ingredientName: "Synthetic experimental input", grams: 1 }];
    const result = validateFoodPrototypeCapture({ ...f, inputs, adjustments: [] });
    assert.equal(result.recipe, undefined); assert.equal(result.product, undefined);
    const { product: _unused, ...withRecipe } = fixture();
    assert(_unused);
    assert.equal(validateFoodPrototypeCapture(withRecipe, recipe()).product, undefined);
});
test("references require exact matching snapshots and ingredient positions", () => {
    for (const ref of [{ id: "food-recipe:other", version: 2 }, { id: recipe().id, version: 3 }, { id: recipe().id, version: "latest" }]) assert.throws(() => build({ ...fixture(), recipe: ref }));
    for (const ref of [{ id: "food-product:other", version: 3 }, { id: product().id, version: 4 }]) assert.throws(() => build({ ...fixture(), product: ref }));
    assert.throws(() => validateFoodPrototypeCapture(fixture()));
    assert.throws(() => build(fixture(), recipe(), { ...product(), recipe: { ...product().recipe, version: 1 } }));
    for (const index of [-1, 1, 0.5, "0"]) assert.throws(() => build({ ...fixture(), inputs: [{ ...fixture().inputs[0], recipeIngredientIndex: index }] }));
    assert.throws(() => build({ ...fixture(), inputs: [{ ...fixture().inputs[0], ingredientName: "Different" }] }));
    const { recipe: _r, ...withoutRecipe } = fixture(); assert(_r); assert.throws(() => validateFoodPrototypeCapture(withoutRecipe, undefined, product()));
    const { product: _p, ...withoutProduct } = fixture(); assert(_p); assert.throws(() => build(withoutProduct));
});
test("grams reject coercion, nonfinite values, zero, negatives and unsafe magnitude", () => {
    for (const grams of [0, -0, -1, NaN, Infinity, -Infinity, "1", null, undefined, Number.MAX_SAFE_INTEGER + 1]) {
        assert.throws(() => build({ ...fixture(), inputs: [{ ...fixture().inputs[0], grams }] }));
        assert.throws(() => build({ ...fixture(), finishedYieldGrams: grams }));
        assert.throws(() => build({ ...fixture(), adjustments: [{ ...fixture().adjustments[0], grams }] }));
    }
});
test("steps and observations enforce bounded nonempty text and dense ordered lists", () => {
    for (const method of [[], [""], [" "], [" leading"], [1], Array(1), Array(129).fill("step")]) assert.throws(() => build({ ...fixture(), method }));
    for (const observation of [{ category: "", text: "note" }, { category: "freezing", text: "" }, { category: "x", text: "x".repeat(2001) }]) assert.throws(() => build({ ...fixture(), observations: [observation] }));
    assert.deepEqual(build({ ...fixture(), observations: [], adjustments: [] }).observations, []);
});
test("duplicate rules permit repeated ingredients with distinct keys and reject ambiguous references", () => {
    const first = fixture().inputs[0];
    assert.throws(() => build({ ...fixture(), inputs: [first, first] }));
    assert.deepEqual(build({ ...fixture(), inputs: [first, { ...first, key: "second" }] }).inputs.map(v => v.key), ["flour", "second"]);
    for (const adjustment of [
        { kind: "mass", action: "add", inputKey: "missing", grams: 1, text: "note" },
        { kind: "mass", action: "add", grams: 1, text: "note" },
        { kind: "mass", action: "add", inputKey: "flour", ingredientName: "Water", grams: 1, text: "note" },
        { kind: "mass", action: "multiply", inputKey: "flour", grams: 1, text: "note" },
        { kind: "process", text: "", grams: 1 },
    ]) assert.throws(() => build({ ...fixture(), adjustments: [adjustment] }));
    const adjustments = [{ kind: "mass", action: "add", ingredientName: "Synthetic water", grams: 1.5, text: "Added during run" }];
    assert.deepEqual(build({ ...fixture(), adjustments }).adjustments, adjustments);
});
test("provenance is observed attribution rather than calculated/reference/review evidence", () => {
    for (const kind of ["inferred", "USDA", "calculated", "canonicalized", undefined]) assert.throws(() => build({ ...fixture(), provenance: { ...fixture().provenance, kind } }));
    for (const occurredOn of ["2025-02-29", "2026-10-12T00:00:00Z"]) assert.throws(() => build({ ...fixture(), provenance: { ...fixture().provenance, occurredOn } }));
    assert.throws(() => build({ ...fixture(), provenance: { kind: "founder-measured", sourceReference: "" } }));
    for (const field of ["nutrition", "cost", "sellable", "evidence", "latest"]) assert.throws(() => build({ ...fixture(), [field]: true }));
});
test("capture detaches and freezes nested collections without changing canonical snapshots/evidence", () => {
    const f = fixture(); const r = recipe(); const p = product();
    const before = structuredClone({ f, r, p });
    const canonicalRecipe = validateFoodRecipeDraft(r); const canonicalProduct = validateFoodProductDraft(p, r);
    const completeness = assessFoodDraftEvidenceCompleteness(p, r);
    const value = build(f, r, p);
    assert.deepEqual({ f, r, p }, before);
    assert.deepEqual(validateFoodRecipeDraft(r), canonicalRecipe); assert.deepEqual(validateFoodProductDraft(p, r), canonicalProduct);
    assert.deepEqual(assessFoodDraftEvidenceCompleteness(p, r), completeness);
    f.inputs[0].grams = 999; f.method[0] = "Changed"; f.adjustments[0].text = "Changed";
    f.observations[0].text = "Changed"; f.provenance.sourceReference = "Changed"; f.recipe.version = 9;
    assert.deepEqual(value, before.f);
    function frozen(v: unknown): void { if (v && typeof v === "object") { assert(Object.isFrozen(v)); Object.values(v).forEach(frozen); } }
    frozen(value);
    assert.throws(() => (value.inputs as unknown[]).push({}));
    assert.throws(() => { (value.inputs[0] as { grams: number }).grams = 5; });
    assert.throws(() => { (value.observations[0] as { text: string }).text = "Changed"; });
});
test("domain has no IO, clocks, generated identities or production recipe fixtures", async () => {
    const source = await readFile(new URL("./prototype-capture-domain.ts", import.meta.url), "utf8");
    assert.doesNotMatch(source, /\b(?:fetch|Date|randomUUID|require)\b|process\.env|Math\.random|import\s*\(/);
    assert.match(fixture().provenance.sourceReference, /synthetic-not-production/);
});
test("existing reviewed evidence remains exact and capture observations do not satisfy reviews", () => {
    const r = { ...recipe(), evidence: [{ requirement: "allergen-review", sourceReference: "fixture:review", subject: { type: "recipe", id: recipe().id, version: 2 }, reviewDate: "2026-10-12", reviewer: "fixture:reviewer" }] };
    const before = structuredClone(r);
    const completeness = assessFoodDraftEvidenceCompleteness(product(), r);
    const result = build(fixture(), r, product());
    assert.deepEqual(r, before);
    assert.deepEqual(assessFoodDraftEvidenceCompleteness(product(), r), completeness);
    assert.equal("evidence" in result, false);
    assert.throws(() => build(fixture(), { ...r, evidence: [{ ...r.evidence[0], subject: { ...r.evidence[0].subject, version: 1 } }] }));
});
test("collection limits, unknown nested fields and omitted required data reject", () => {
    for (const value of [null, [], {}, { ...fixture(), extra: true }]) assert.throws(() => build(value));
    for (const field of ["inputs", "method", "adjustments", "observations", "finishedYieldGrams", "provenance"]) {
        assert.throws(() => build({ ...fixture(), [field]: undefined }));
    }
    assert.throws(() => build({ ...fixture(), inputs: Array.from({ length: 129 }, (_, i) => ({ ...fixture().inputs[0], key: `input-${i}` })) }));
    assert.throws(() => build({ ...fixture(), observations: Array(129).fill(fixture().observations[0]) }));
    assert.throws(() => build({ ...fixture(), adjustments: Array(129).fill(fixture().adjustments[1]) }));
    assert.throws(() => build({ ...fixture(), inputs: [{ ...fixture().inputs[0], units: "kg" }] }));
    assert.throws(() => build({ ...fixture(), provenance: { ...fixture().provenance, verified: true } }));
    assert.equal(build({ ...fixture(), method: Array(128).fill("Synthetic step") }).method.length, 128);
});
