import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import * as d from "./package-label-reference-domain";
// Entirely synthetic source chain; no real recipes or package decisions.
function sources() {
    const recipe = { id: "food-recipe:synthetic-h", version: 3, evidence: [] };
    const product = { id: "food-product:synthetic-h", version: 2, recipe: { id: recipe.id, version: 3 }, evidence: [] };
    const presentation = { dishId: "food-dish:synthetic-h", version: 4, product: { id: product.id, version: 2 }, recipe: product.recipe, name: "Synthetic title" };
    const servingOffer = { offerId: "food-serving-offer:synthetic-h", version: 5, presentation: { dishId: presentation.dishId, version: 4 }, format: { kind: "custom", code: "synthetic", label: "Synthetic format" }, servingEstimate: { state: "unknown" } };
    const sku = { id: "food-sku:synthetic-h", version: 6, servingOffer: { offerId: servingOffer.offerId, version: 5 }, package: { id: "food-package-definition:synthetic-h", version: 7 } };
    return { recipe, product, presentation, servingOffer, sku };
}
function fixture() { const s = sources(); return { id: d.createFoodPackageLabelId("synthetic-h"), version: 1, sku: { id: s.sku.id, version: 6 }, package: s.sku.package, servingOffer: s.sku.servingOffer, presentation: s.servingOffer.presentation, product: s.presentation.product, recipe: s.presentation.recipe, displayTitle: s.presentation.name, publicInformation: { reference: "synthetic-info-h" } }; }
test("distinct label identity and initial/historical version rules", () => {
    assert.deepEqual(d.createInitialFoodPackageLabelVersion(fixture(), sources()), fixture()); assert.equal(d.parseFoodPackageLabelId(fixture().id), fixture().id);
    for (const v of ["", " a", "a:b", "x".repeat(129), null]) assert.throws(() => d.createFoodPackageLabelId(v));
    assert.throws(() => d.parseFoodPackageLabelId("food-sku:synthetic"));
    for (const version of [0, -1, 1.5, Infinity, "latest", Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => d.validateFoodPackageLabelVersion({ ...fixture(), version }));
    assert.throws(() => d.createInitialFoodPackageLabelVersion({ ...fixture(), version: 2 }, sources()));
});
test("every exact dependency rejects substituted identity/version; canonical chain required", () => {
    for (const key of ["sku", "servingOffer", "presentation", "product", "recipe"] as const) {
        const s = sources(); assert.throws(() => d.validateFoodPackageLabelAgainstSources(fixture(), { ...s, [key]: { ...s[key], version: 99 } }));
    }
    const s = sources(); assert.throws(() => d.validateFoodPackageLabelAgainstSources(fixture(), { ...s, sku: { ...s.sku, servingOffer: { ...s.sku.servingOffer, version: 99 } } }));
    assert.throws(() => d.validateFoodPackageLabelAgainstSources({ ...fixture(), package: { ...fixture().package, version: 8 } }, sources()));
    assert.throws(() => d.validateFoodPackageLabelAgainstSources({ ...fixture(), displayTitle: "Invented title" }, sources()));
    assert.throws(() => d.validateFoodPackageLabelVersion({ ...fixture(), sku: { id: sources().sku.id, version: "current" } }));
});
test("revisions cannot retarget SKU/context and preserve historical snapshots", () => {
    const old = d.createInitialFoodPackageLabelVersion(fixture(), sources()); const { publicInformation: _p, displayTitle: _t, ...without } = fixture(); assert(_p && _t);
    const next = d.reviseFoodPackageLabelVersion(old, { ...without, version: 2 }, sources()); assert.equal(next.publicInformation, undefined); assert.equal(old.publicInformation?.reference, "synthetic-info-h");
    assert.equal(d.reviseFoodPackageLabelVersion(old, { ...fixture(), version: 2, publicInformation: { reference: "synthetic-replaced" } }, sources()).publicInformation?.reference, "synthetic-replaced");
    for (const n of [{ ...fixture(), version: 3 }, { ...fixture(), version: 1 }, { ...fixture(), version: 2, id: d.createFoodPackageLabelId("other") }]) assert.throws(() => d.reviseFoodPackageLabelVersion(old, n, sources()));
    const s = sources(); const changed = { ...s, sku: { ...s.sku, version: 7 } }; assert.throws(() => d.reviseFoodPackageLabelVersion(old, { ...fixture(), version: 2, sku: { id: s.sku.id, version: 7 } }, changed));
    assert.throws(() => d.reviseFoodPackageLabelVersion(old, { ...fixture(), version: 2, recipe: { ...fixture().recipe, version: 4 } }, sources()));
});
test("snapshots are deeply frozen/detached and preserve exact public alias", () => {
    const f = fixture(); const v = d.createInitialFoodPackageLabelVersion(f, sources()); f.sku.version = 99; f.product.version = 99; f.publicInformation.reference = "changed"; assert.deepEqual(v, fixture());
    for (const o of [v, v.sku, v.package, v.servingOffer, v.presentation, v.product, v.recipe, v.publicInformation]) assert(Object.isFrozen(o));
});
test("public information rejects URLs/namespaced private IDs and authority fields", () => {
    for (const reference of ["https://example.invalid", "//path", "food-customer:synthetic", "principal:synthetic", "food-physical-order:synthetic", "Case@Example.invalid", " padded ", "x".repeat(129)]) assert.throws(() => d.validateFoodPublicInformationReference({ reference }));
    for (const key of ["url", "token", "orderId", "customerId", "email", "secret"]) assert.throws(() => d.validateFoodPublicInformationReference({ reference: "synthetic", [key]: true }));
});
test("no disclosure/barcode/reorder/private/commerce authority or runtime code", async () => {
    for (const key of ["ingredientsText", "allergenText", "nutritionFacts", "calories", "registrationNumber", "legallyCompliant", "complianceApproved", "barcode", "upc", "gtin", "qrUrl", "url", "reorderToken", "orderId", "customerId", "principalId", "email", "phone", "paymentReference", "published", "available", "orderable", "inventory", "price", "paid", "dispatchReady"]) assert.throws(() => d.validateFoodPackageLabelVersion({ ...fixture(), [key]: true }));
    const source = await readFile(new URL("./package-label-reference-domain.ts", import.meta.url), "utf8"); assert.doesNotMatch(source, /Date\.now|new Date|process\.env|fetch\(|Math\.random|node:fs|D1Database|cloudflare|session\//);
});
