import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as domain from "./dish-offer-domain";
import { createFoodProductId, createFoodRecipeId } from "./draft-domain";

const recipe = { id: createFoodRecipeId("rice"), version: 3, evidence: [] };
const product = { id: createFoodProductId("rice"), version: 7, recipe: { id: recipe.id, version: 3 }, evidence: [] };
const dish = { dishId: domain.createFoodDishId("Rice 日本"), version: 4, product: { id: product.id, version: 7 }, recipe: { id: recipe.id, version: 3 }, name: "Rice" };
const offer = { offerId: domain.createFoodServingOfferId("family"), version: 8, presentation: { dishId: dish.dishId, version: 4 }, format: { kind: "family" }, servingEstimate: { state: "unknown" } };
const presentation = (input: unknown = dish, p: unknown = product, r: unknown = recipe) => domain.validateFoodDishPresentation(input, p, r);
const serving = (input: unknown = offer, d: unknown = dish, p: unknown = product, r: unknown = recipe) => domain.validateFoodServingOffer(input, d, p, r);
function frozen(value: unknown): void { if (value && typeof value === "object") { assert.ok(Object.isFrozen(value)); Object.values(value).forEach(frozen); } }

test("canonical identities preserve supplied text without new length restrictions", () => {
    for (const [create, parse, prefix] of [[domain.createFoodDishId, domain.parseFoodDishId, "food-dish"], [domain.createFoodServingOfferId, domain.parseFoodServingOfferId, "food-serving-offer"]] as const) {
        for (const local of ["A B", "日本🍚", "x".repeat(10000)]) assert.equal(parse(create(local)), `${prefix}:${local}`);
        for (const bad of [null, undefined, 1, {}, "", " x", "x ", "a:b"]) assert.throws(() => create(bad));
        for (const bad of [null, 1, "food-product:x", `${prefix}:`, `${prefix}: x`, `${prefix}:x:y`, ` ${prefix}:x`]) assert.throws(() => parse(bad));
    }
});
test("historical versions and exact contextual product/recipe references", () => {
    assert.deepEqual(presentation(), dish); assert.deepEqual(serving(), offer);
    for (const v of [0, -1, 1.5, "4", NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, null]) {
        assert.throws(() => presentation({ ...dish, version: v })); assert.throws(() => serving({ ...offer, version: v }));
    }
    assert.equal(presentation({ ...dish, version: Number.MAX_SAFE_INTEGER }).version, Number.MAX_SAFE_INTEGER);
    for (const ref of [{ id: product.id, version: 8 }, { id: createFoodProductId("other"), version: 7 }, { id: product.id, version: "latest" }]) assert.throws(() => presentation({ ...dish, product: ref }));
    assert.throws(() => presentation({ ...dish, recipe: { ...dish.recipe, version: 4 } }));
    assert.throws(() => presentation(dish, { ...product, recipe: { ...product.recipe, version: 4 } }));
    assert.throws(() => presentation(dish, product, { ...recipe, evidence: [{ requirement: "allergen-review" }] }));
    assert.throws(() => serving({ ...offer, presentation: { ...offer.presentation, version: 5 } }));
    assert.throws(() => serving({ ...offer, presentation: { dishId: domain.createFoodDishId("other"), version: 4 } }));
    assert.deepEqual(Object.keys(presentation()).sort(), ["dishId", "name", "product", "recipe", "version"]);
});
test("format variants strictly distinguish catering pans and supplied custom formats", () => {
    for (const input of [{ kind: "individual" }, { kind: "family" }, ...["unknown", "half-pan", "full-pan"].map(panSize => ({ kind: "catering", panSize })), { kind: "catering", panSize: "other", panDescription: "Round pan" }, { kind: "custom", code: "Tray A", label: "Tray" }]) {
        assert.deepEqual(domain.validateFoodServingFormat(input), input); frozen(domain.validateFoodServingFormat(input));
    }
    for (const input of [null, [], { kind: "bundle" }, { kind: "half-pan" }, { kind: "catering" }, { kind: "catering", panSize: "other" }, { kind: "catering", panSize: "half-pan", panDescription: undefined }, { kind: "individual", code: "x" }, { kind: "custom", code: "x:y", label: "Tray" }, { kind: "custom", code: "x", label: "" }, { kind: "custom", code: "x", label: "Tray", extensions: {} }]) assert.throws(() => domain.validateFoodServingFormat(input));
});
test("estimates and descriptors retain unknown, specified and omitted distinctions", () => {
    for (const input of [{ state: "unknown" }, { state: "specified", minimum: 1, maximum: 1 }, { state: "specified", minimum: 2, maximum: 5, explanation: "Supplied range" }]) assert.deepEqual(domain.validateFoodServingEstimate(input), input);
    for (const input of [{ state: "unknown", minimum: 1 }, { state: "specified", minimum: 3, maximum: 2 }, ...[0, -1, 1.5, "1", Number.MAX_SAFE_INTEGER + 1].map(minimum => ({ state: "specified", minimum, maximum: 5 })), { state: "reviewed" }, null]) assert.throws(() => domain.validateFoodServingEstimate(input));
    assert.ok(!("storageSummary" in serving()));
    for (const key of ["packagingDescription", "storageSummary", "reheatingSummary"]) {
        for (const value of [{ state: "unknown" }, { state: "specified", text: "Supplied description" }]) assert.deepEqual((serving({ ...offer, [key]: value }) as unknown as Record<string, unknown>)[key], value);
        assert.ok(!(key in serving({ ...offer, [key]: undefined })));
        for (const value of [null, "", { state: "unknown", text: "x" }, { state: "specified", text: "" }, { state: "specified", text: " x" }, { state: "reviewed", text: "x" }]) assert.throws(() => serving({ ...offer, [key]: value }));
    }
});
test("all text maxima are inclusive UTF-16 bounds without normalization", () => {
    const checks: [number, (value: string) => unknown][] = [
        [160, name => presentation({ ...dish, name })], [500, shortDescription => presentation({ ...dish, shortDescription })], [4000, longDescription => presentation({ ...dish, longDescription })],
        [512, reference => presentation({ ...dish, mediaReferences: [{ reference }] })], [128, code => domain.validateFoodServingFormat({ kind: "custom", code, label: "Tray" })],
        [160, label => domain.validateFoodServingFormat({ kind: "custom", code: "tray", label })], [500, panDescription => domain.validateFoodServingFormat({ kind: "catering", panSize: "other", panDescription })],
        [500, explanation => domain.validateFoodServingEstimate({ state: "specified", minimum: 1, maximum: 2, explanation })], [2000, text => domain.validateFoodUnresolvedText({ state: "specified", text })]
    ];
    for (const [limit, check] of checks) { check("x".repeat(limit)); check("🍚".repeat(limit / 2)); for (const bad of ["x".repeat(limit + 1), "", " x", "x "]) assert.throws(() => check(bad)); }
    assert.equal(presentation({ ...dish, name: "e\u0301" }).name, "e\u0301");
    assert.equal(presentation({ ...dish, name: "Candidate claim text" }).name, "Candidate claim text");
});
test("ordered opaque media reject duplicates, URL-like references and malformed shapes", () => {
    const mediaReferences = [{ reference: "shared/second" }, { reference: "shared/first" }];
    assert.deepEqual(presentation({ ...dish, mediaReferences }).mediaReferences, mediaReferences);
    assert.deepEqual(presentation({ ...dish, mediaReferences: [] }).mediaReferences, []);
    assert.ok(!("mediaReferences" in presentation({ ...dish, mediaReferences: undefined })));
    for (const reference of ["https://example.test", "data:text", "URN:thing", "//example.test"]) assert.throws(() => presentation({ ...dish, mediaReferences: [{ reference }] }));
    for (const mediaReferences of [null, {}, [{ reference: "same" }, { reference: "same" }], [{ reference: "x", url: "x" }], [null], new Array(1)]) assert.throws(() => presentation({ ...dish, mediaReferences }));
});
test("unknown fields reject throughout nested shapes and deferred semantics", () => {
    for (const field of ["approved", "public", "available", "soldOut", "price", "currency", "ready", "rating", "customerId", "qrAlias", "tags", "bundle", "extensions", "timestamp"]) { assert.throws(() => presentation({ ...dish, [field]: true })); assert.throws(() => serving({ ...offer, [field]: true })); }
    for (const key of ["product", "recipe"] as const) assert.throws(() => presentation({ ...dish, [key]: { ...dish[key], latest: true } }));
    assert.throws(() => serving({ ...offer, presentation: { ...offer.presentation, extra: true } }));
    assert.throws(() => domain.validateFoodServingEstimate({ state: "specified", minimum: 1, maximum: 2, extra: true }));
    assert.throws(() => domain.validateFoodUnresolvedText({ state: "specified", text: "x", extra: true }));
    assert.throws(() => presentation({ ...dish, [Symbol("extra")]: true }));
    for (const input of [null, [], 1, "dish"]) assert.throws(() => presentation(input));
});
test("revisions require consecutive identities and fully replace optional content", () => {
    const previous = { ...dish, shortDescription: "Earlier", mediaReferences: [{ reference: "old" }] };
    const next = { ...dish, version: 5 };
    const revise = (n: unknown = next, p: unknown = previous) => domain.reviseFoodDishPresentation(p, n, product, recipe, product, recipe);
    assert.deepEqual(revise(), next); assert.equal(previous.shortDescription, "Earlier");
    for (const n of [{ ...next, dishId: domain.createFoodDishId("other") }, { ...next, version: 4 }, { ...next, version: 6 }]) assert.throws(() => revise(n));
    assert.throws(() => revise({ ...dish, version: Number.MAX_SAFE_INTEGER }, { ...dish, version: Number.MAX_SAFE_INTEGER }));
    assert.throws(() => revise(next, { ...previous, name: "" }));
    const newRecipe = { ...recipe, version: 4 }; const newProduct = { ...product, version: 8, recipe: { id: recipe.id, version: 4 } };
    const adopted = { ...next, product: { id: product.id, version: 8 }, recipe: { id: recipe.id, version: 4 } };
    assert.deepEqual(domain.reviseFoodDishPresentation(dish, adopted, product, recipe, newProduct, newRecipe), adopted);
    const reviseOffer = (n: unknown, nextDish: unknown = dish, p: unknown = offer) => domain.reviseFoodServingOffer(p, n, dish, nextDish, product, recipe, product, recipe);
    const nextOffer = { ...offer, version: 9 };
    assert.deepEqual(reviseOffer(nextOffer), nextOffer);
    assert.deepEqual(reviseOffer({ ...nextOffer, presentation: { dishId: dish.dishId, version: 5 } }, next), { ...nextOffer, presentation: { dishId: dish.dishId, version: 5 } });
    const other = { ...dish, dishId: domain.createFoodDishId("other") };
    assert.throws(() => reviseOffer({ ...nextOffer, presentation: { dishId: other.dishId, version: 4 } }, other));
    for (const n of [{ ...nextOffer, offerId: domain.createFoodServingOfferId("other") }, { ...nextOffer, version: 10 }]) assert.throws(() => reviseOffer(n));
    assert.throws(() => reviseOffer({ ...offer, version: Number.MAX_SAFE_INTEGER }, dish, { ...offer, version: Number.MAX_SAFE_INTEGER }));
    const earlier = { ...offer, packagingDescription: { state: "unknown" } };
    assert.ok(!("packagingDescription" in reviseOffer(nextOffer, dish, earlier)));
});
test("outputs are recursively frozen, detached, deterministic and accept frozen inputs", () => {
    const input = { ...dish, mediaReferences: [{ reference: "shared/a" }] };
    const output = presentation(input); frozen(output);
    assert.notEqual(output.product, input.product); assert.notEqual(output.mediaReferences, input.mediaReferences);
    input.mediaReferences[0].reference = "changed"; assert.equal(output.mediaReferences?.[0].reference, "shared/a");
    const offerInput = { ...offer, format: { kind: "custom", code: "tray", label: "Tray" }, storageSummary: { state: "specified", text: "Recorded" } };
    const result = serving(offerInput); frozen(result); assert.notEqual(result.format, offerInput.format);
    offerInput.storageSummary.text = "changed"; assert.deepEqual(result.storageSummary, { state: "specified", text: "Recorded" });
    assert.deepEqual(presentation(output), output); assert.deepEqual(serving(result), result);
    assert.deepEqual(presentation(), presentation()); assert.deepEqual(serving(), serving());
    assert.throws(() => { (output.product as { version: number }).version = 99; });
});
test("source isolation uses only FOOD-001A authority", () => {
    const source = readFileSync(new URL("./dish-offer-domain.ts", import.meta.url), "utf8");
    assert.deepEqual([...source.matchAll(/from\s+"([^"]+)"/g)].map(m => m[1]), ["./draft-domain"]);
    assert.doesNotMatch(source, /cloudflare:workers|node:|fetch\(|Date\.|Math\.random|process\.|D1|FormData|wrangler|checkout|Stripe|session|insurance|sesh/i);
});
