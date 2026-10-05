import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { createFoodProductId, createFoodRecipeId, parseFoodProductId, parseFoodRecipeId, validateFoodVersion, validateFoodReviewDate, validateFoodRecipeDraft, validateFoodProductDraft, reviseFoodRecipeDraft, reviseFoodProductDraft, assessFoodDraftEvidenceCompleteness, FOOD_MAJOR_ALLERGENS, FOOD_DRAFT_EVIDENCE_REQUIREMENTS, FOOD_EVIDENCE_SUBJECT_MAPPING } from "./draft-domain";
const recipe = () => ({ id: "food-recipe:meal", version: 1, ingredients: [{ kind: "simple", name: "Vegetable" }], allergenReview: { state: "unknown", declarations: [] }, process: { classification: "unknown" }, evidence: [] as unknown[] });
const product = () => ({ id: "food-product:meal", version: 1, recipe: { id: "food-recipe:meal", version: 1 }, temperatureControl: "unknown", cottageReview: { state: "pending" }, salesTaxReview: { state: "unknown" }, evidence: [] as unknown[] });
const ev = (requirement: string, version = 1) => ({ requirement, sourceReference: "source:document", subject: { type: FOOD_EVIDENCE_SUBJECT_MAPPING[requirement as keyof typeof FOOD_EVIDENCE_SUBJECT_MAPPING], id: requirement === "allergen-review" || requirement === "preservation-process-classification" || requirement === "ingredient-composition-disclosure-status" ? "food-recipe:meal" : "food-product:meal", version }, reviewDate: "2024-02-29", reviewer: "reviewer:river" });
function immutable(v: unknown): void { if (v && typeof v === "object") { Object.values(v).forEach(immutable); Object.freeze(v); } }

test("canonical food IDs and safe versions reject coercion and malformed evidence", () => {
    assert.equal(createFoodProductId("meal"), parseFoodProductId("food-product:meal"));
    assert.equal(createFoodRecipeId("meal"), parseFoodRecipeId("food-recipe:meal"));
    for (const v of [undefined, null, {}, 1, "", " meal", "meal ", "a:b"]) { assert.throws(() => createFoodProductId(v)); assert.throws(() => createFoodRecipeId(v)); }
    for (const v of ["food-recipe:meal", "food-product:", "food-product:a:b", "food-product: a"]) assert.throws(() => parseFoodProductId(v));
    for (const v of [0, -1, 1.5, NaN, Infinity, "1", Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => validateFoodVersion(v));
    assert.equal(validateFoodVersion(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
    for (const v of [null, [], {}, false]) assert.throws(() => validateFoodRecipeDraft(v));
});

test("one-level components preserve disclosure distinction and ordering", () => {
    const r = recipe(); r.ingredients = [{ kind: "purchased-component", name: "Sauce", composition: "disclosed", subingredients: [{ name: "Tomato" }, { name: "Salt" }] }, { kind: "purchased-component", name: "Seasoning", composition: "undisclosed" }] as never;
    assert.deepEqual(validateFoodRecipeDraft(r).ingredients, r.ingredients);
    for (const bad of [ { kind: "purchased-component", name: "Sauce" }, { kind: "purchased-component", name: "Sauce", composition: "disclosed", subingredients: [] }, { kind: "purchased-component", name: "Sauce", composition: "undisclosed", subingredients: [] }, { kind: "purchased-component", name: "Sauce", composition: "disclosed", subingredients: [{ name: "Nested", subingredients: [] }] } ]) assert.throws(() => validateFoodRecipeDraft({ ...r, ingredients: [bad] }));
});

test("nine allergens, source details and empty reviewed declarations confer no claim", () => {
    assert.deepEqual(FOOD_MAJOR_ALLERGENS, ["milk", "egg", "fish", "crustacean-shellfish", "tree-nuts", "peanuts", "wheat", "soybeans", "sesame"]);
    const r = { ...recipe(), allergenReview: { state: "reviewed", declarations: [{ allergen: "fish", detail: "cod" }, { allergen: "tree-nuts", detail: "almond" }, { allergen: "crustacean-shellfish", detail: "shrimp" }] }, evidence: [ev("allergen-review")] };
    assert.deepEqual(validateFoodRecipeDraft(r).allergenReview, r.allergenReview);
    assert.deepEqual(validateFoodRecipeDraft({ ...r, allergenReview: { state: "reviewed", declarations: [] } }).allergenReview, { state: "reviewed", declarations: [] });
    for (const declarations of [[{ allergen: "fish" }, { allergen: "fish" }], [{ allergen: "almond" }], [{ allergen: "milk", detail: "cow" }]]) assert.throws(() => validateFoodRecipeDraft({ ...r, allergenReview: { state: "reviewed", declarations } }));
    assert.throws(() => validateFoodRecipeDraft({ ...r, evidence: [] }));
    assert.throws(() => validateFoodRecipeDraft({ ...r, allergenReview: { state: "approved", declarations: [] } }));
});

test("descriptive classifications are explicit and other text is canonical", () => {
    for (const classification of ["unknown", "unprocessed", "cooked", "baked", "dried", "pickled", "fermented", "acidified"]) assert.equal(validateFoodRecipeDraft({ ...recipe(), process: { classification } }).process?.classification, classification);
    assert.deepEqual(validateFoodRecipeDraft({ ...recipe(), process: { classification: "other", description: "Supplied process" } }).process, { classification: "other", description: "Supplied process" });
    for (const process of [{ classification: "other" }, { classification: "other", description: " bad" }, { classification: "cooked", description: "extra" }, { classification: "safe" }]) assert.throws(() => validateFoodRecipeDraft({ ...recipe(), process }));
    for (const temperatureControl of ["unknown", "ambient", "refrigerated", "frozen"]) assert.equal(validateFoodProductDraft({ ...product(), temperatureControl }, recipe()).temperatureControl, temperatureControl);
    assert.throws(() => validateFoodProductDraft({ ...product(), temperatureControl: "safe" }, recipe()));
});

test("evidence requires exact subject, date, attribution and unique requirements", () => {
    for (const date of ["2024-02-29", "2000-02-29", "2026-10-05"]) assert.equal(validateFoodReviewDate(date), date);
    for (const date of ["2023-02-29", "1900-02-29", "2026-04-31", "2026-00-01", "2026-1-01", "2026-10-05T00:00:00Z", " 2026-10-05"]) assert.throws(() => validateFoodReviewDate(date));
    const e = ev("allergen-review");
    for (const bad of [{ ...e, sourceReference: "" }, { ...e, reviewer: undefined }, { ...e, issuer: " " }, { ...e, subject: { ...e.subject, version: 2 } }, { ...e, subject: { ...e.subject, id: "food-recipe:other" } }, { ...e, subject: { type: "product", id: "food-product:meal", version: 1 } }]) assert.throws(() => validateFoodRecipeDraft({ ...recipe(), evidence: [bad] }));
    assert.doesNotThrow(() => validateFoodRecipeDraft({ ...recipe(), evidence: [{ ...e, reviewer: undefined, issuer: "issuer:agency" }] }));
    assert.throws(() => validateFoodRecipeDraft({ ...recipe(), evidence: [e, e] }));
    for (const requirement of FOOD_DRAFT_EVIDENCE_REQUIREMENTS) {
        const evidence = ev(requirement);
        if (evidence.subject.type === "recipe") assert.doesNotThrow(() => validateFoodRecipeDraft({ ...recipe(), evidence: [evidence] }));
        else assert.doesNotThrow(() => validateFoodProductDraft({ ...product(), evidence: [evidence] }, recipe()));
    }
});

test("lifecycle and conclusions stay separate, including unfavorable reviews", () => {
    for (const conclusion of ["eligible", "ineligible", "inconclusive"]) assert.equal(validateFoodProductDraft({ ...product(), cottageReview: { state: "reviewed", conclusion }, evidence: [ev("cottage-eligibility-review")] }, recipe()).cottageReview?.state, "reviewed");
    for (const conclusion of ["exempt", "taxable", "inconclusive"]) assert.equal(validateFoodProductDraft({ ...product(), salesTaxReview: { state: "reviewed", conclusion }, evidence: [ev("sales-tax-review")] }, recipe()).salesTaxReview?.state, "reviewed");
    for (const cottageReview of [{ state: "pending", conclusion: "eligible" }, { state: "reviewed" }, { state: "reviewed", conclusion: "exempt" }, { state: "approved" }]) assert.throws(() => validateFoodProductDraft({ ...product(), cottageReview, evidence: [ev("cottage-eligibility-review")] }, recipe()));
    assert.throws(() => validateFoodProductDraft({ ...product(), cottageReview: { state: "reviewed", conclusion: "eligible" } }, recipe()));
});

test("complete structural unknown and undisclosed facts remain unresolved in deterministic order", () => {
    const r = { ...recipe(), ingredients: [{ kind: "purchased-component", name: "A", composition: "undisclosed" }, { kind: "purchased-component", name: "B", composition: "undisclosed" }] };
    const result = assessFoodDraftEvidenceCompleteness(product(), r);
    assert.equal(result.requiredEvidencePresent, true);
    assert.deepEqual(result.unresolvedReviews, [ { requirement: "ingredient-composition-disclosure-status", condition: "undisclosed", ingredientIndex: 0 }, { requirement: "ingredient-composition-disclosure-status", condition: "undisclosed", ingredientIndex: 1 }, { requirement: "allergen-review", condition: "unknown" }, { requirement: "preservation-process-classification", condition: "unknown" }, { requirement: "temperature-control-classification", condition: "unknown" }, { requirement: "cottage-eligibility-review", condition: "pending" }, { requirement: "sales-tax-review", condition: "unknown" } ]);
    assert.deepEqual(Object.keys(result), ["requiredEvidencePresent", "missingEvidenceRequirements", "unresolvedReviews"]);
    assert.deepEqual(result, assessFoodDraftEvidenceCompleteness(product(), r));
    assert.deepEqual(assessFoodDraftEvidenceCompleteness({ id: "food-product:meal", version: 1, recipe: { id: "food-recipe:meal", version: 1 }, evidence: [] }, { id: "food-recipe:meal", version: 1, evidence: [] }).missingEvidenceRequirements, FOOD_DRAFT_EVIDENCE_REQUIREMENTS);
});

test("reviewed inconclusive is present but unresolved; adverse findings never authorize", () => {
    const r = { ...recipe(), process: { classification: "cooked" }, allergenReview: { state: "reviewed", declarations: [] }, evidence: [ev("allergen-review")] };
    const p = { ...product(), temperatureControl: "frozen", cottageReview: { state: "reviewed", conclusion: "ineligible" }, salesTaxReview: { state: "reviewed", conclusion: "inconclusive" }, evidence: [ev("cottage-eligibility-review"), ev("sales-tax-review")] };
    const result = assessFoodDraftEvidenceCompleteness(p, r);
    assert.equal(result.requiredEvidencePresent, true);
    assert.deepEqual(result.unresolvedReviews, [{ requirement: "sales-tax-review", condition: "inconclusive" }]);
    assert.throws(() => validateFoodProductDraft({ ...p, sellable: true }, r));
});

test("revision constructors detach and freeze history and reject stale evidence and version drift", () => {
    const r = { ...recipe(), allergenReview: { state: "reviewed", declarations: [{ allergen: "wheat" }] }, evidence: [ev("allergen-review")] };
    const p = product(); immutable(r); immutable(p);
    const old = validateFoodRecipeDraft(r);
    const next = reviseFoodRecipeDraft(r, { ...r, version: 2, ingredients: [{ kind: "simple", name: "Changed" }], allergenReview: { state: "pending", declarations: [] }, evidence: [] });
    assert.equal(old.version, 1); assert.equal(next.version, 2); assert.notEqual(next.ingredients, old.ingredients);
    assert(Object.isFrozen(next) && Object.isFrozen(next.ingredients) && Object.isFrozen(next.ingredients?.[0]));
    assert.throws(() => reviseFoodRecipeDraft(r, { ...r, version: 2 }));
    assert.throws(() => reviseFoodRecipeDraft(r, { ...recipe(), version: 3 }));
    assert.throws(() => reviseFoodRecipeDraft(r, { ...recipe(), id: "food-recipe:other", version: 2 }));
    assert.doesNotThrow(() => reviseFoodRecipeDraft(r, { ...r, version: 2, evidence: [ev("allergen-review", 2)] }));
    assert.throws(() => validateFoodProductDraft(p, next));
    const nextP = reviseFoodProductDraft(p, r, { ...p, version: 2, recipe: { ...p.recipe, version: 2 } }, next);
    assert.equal(nextP.recipe.version, 2); assert.equal(p.recipe.version, 1); assert(Object.isFrozen(nextP.recipe));
    const reviewed = { ...p, cottageReview: { state: "reviewed", conclusion: "eligible" }, evidence: [ev("cottage-eligibility-review")] };
    assert.throws(() => reviseFoodProductDraft(reviewed, r, { ...reviewed, version: 2, recipe: { ...p.recipe, version: 2 } }, next));
    assert.throws(() => reviseFoodRecipeDraft({ ...recipe(), version: Number.MAX_SAFE_INTEGER }, { ...recipe(), version: Number.MAX_SAFE_INTEGER }));
    const supplied = recipe(); const detached = validateFoodRecipeDraft(supplied); supplied.ingredients[0].name = "Mutated"; assert.equal(detached.ingredients?.[0].name, "Vegetable");
});

test("production source has no imports, runtime access, IO or generated identities", async () => {
    const source = await readFile(new URL("./draft-domain.ts", import.meta.url), "utf8");
    const file = ts.createSourceFile("draft-domain.ts", source, ts.ScriptTarget.Latest, true);
    assert.equal(file.statements.filter(ts.isImportDeclaration).length, 0);
    assert.doesNotMatch(source, /\b(?:fetch|globalThis|Date|randomUUID|require|requestContact)\b|process\.env|Math\.random|import\s*\(/);
    assert.equal(file.statements.filter(ts.isVariableStatement).every(s => s.declarationList.flags & ts.NodeFlags.Const), true);
});

test("historical label reference is detached and does not satisfy draft evidence", () => {
 const p = { ...product(), historicalLabelReference: { id: "label:historical", version: 1 } };
 const value = validateFoodProductDraft(p, recipe());
 assert.notEqual(value.historicalLabelReference, p.historicalLabelReference);
 assert(Object.isFrozen(value.historicalLabelReference));
 assert.deepEqual(assessFoodDraftEvidenceCompleteness(p, recipe()), assessFoodDraftEvidenceCompleteness(product(), recipe()));
 assert.throws(() => validateFoodProductDraft({ ...p, historicalLabelReference: { id: "label:historical", version: 0 } }, recipe()));
});

test("process revisions reject old process evidence and accept explicitly retargeted evidence", () => {
 const old = { ...recipe(), process: { classification: "cooked" }, evidence: [ev("preservation-process-classification")] };
 assert.throws(() => reviseFoodRecipeDraft(old, { ...old, version: 2, process: { classification: "baked" } }));
 const next = reviseFoodRecipeDraft(old, { ...old, version: 2, process: { classification: "baked" }, evidence: [ev("preservation-process-classification", 2)] });
 assert.equal(next.process?.classification, "baked");
 assert.equal(old.process.classification, "cooked");
});
