import assert from "node:assert/strict";
import test from "node:test";
import { createFoodPackageDefinitionId, parseFoodPackageDefinitionId, createFoodSkuId, parseFoodSkuId, validateFoodPackageDefinitionVersion, validateFoodSkuVersion, reviseFoodPackageDefinitionVersion, reviseFoodSkuVersion } from "./package-sku-domain";

// Synthetic infrastructure fixtures only; no real package or food decisions.
const packageFixture = () => ({ id: createFoodPackageDefinitionId("synthetic-package"), version: 2, descriptor: "Synthetic test configuration", netQuantity: { basis: "grams" as const, grams: 123.25 } });
const skuFixture = () => ({ id: createFoodSkuId("synthetic-unit"), version: 1, servingOffer: { offerId: "food-serving-offer:synthetic-offer", version: 1 }, package: { id: packageFixture().id, version: 2 } });

test("distinct bounded identities reject coercion, wrong prefixes and noncanonical text", () => {
    assert.equal(parseFoodPackageDefinitionId(packageFixture().id), packageFixture().id);
    assert.equal(parseFoodSkuId(skuFixture().id), skuFixture().id);
    for (const bad of [null, 1, "", " leading", "trailing ", "a:b", "x".repeat(129)]) {
        assert.throws(() => createFoodPackageDefinitionId(bad)); assert.throws(() => createFoodSkuId(bad));
    }
    for (const bad of ["food-product:synthetic", "food-sku:", "food-package-definition:", "food-sku:a:b", {}, 1]) {
        assert.throws(() => parseFoodPackageDefinitionId(bad)); assert.throws(() => parseFoodSkuId(bad));
    }
    assert.equal(parseFoodPackageDefinitionId(createFoodPackageDefinitionId("x".repeat(128))).length, 152);
    assert.equal(parseFoodSkuId(createFoodSkuId("x".repeat(128))).length, 137);
});
test("package quantity is optional, gram-first and never count conversion", () => {
    const p = packageFixture(); assert.deepEqual(validateFoodPackageDefinitionVersion(p), p);
    assert.deepEqual(validateFoodPackageDefinitionVersion({ id: p.id, version: 1 }), { id: p.id, version: 1 });
    for (const grams of [0, -1, NaN, Infinity, "123", Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => validateFoodPackageDefinitionVersion({ ...p, netQuantity: { basis: "grams", grams } }));
    for (const q of [null, { basis: "count", count: 2 }, { basis: "ounces", grams: 2 }, { basis: "grams", grams: 2, count: 1 }]) assert.throws(() => validateFoodPackageDefinitionVersion({ ...p, netQuantity: q }));
    for (const descriptor of ["", " padded ", 1, "x".repeat(501)]) assert.throws(() => validateFoodPackageDefinitionVersion({ ...p, descriptor }));
});
test("all snapshot and reference versions require positive safe integers", () => {
    for (const version of [0, -1, 1.5, NaN, Infinity, "latest", "current", "2", Number.MAX_SAFE_INTEGER + 1]) {
        const s = skuFixture(); assert.throws(() => validateFoodPackageDefinitionVersion({ ...packageFixture(), version }));
        assert.throws(() => validateFoodSkuVersion({ ...s, version }));
        assert.throws(() => validateFoodSkuVersion({ ...s, servingOffer: { ...s.servingOffer, version } }));
        assert.throws(() => validateFoodSkuVersion({ ...s, package: { ...s.package, version } }));
    }
});
test("SKU captures exact reference shapes without resolving storage", () => {
    const s = skuFixture(); assert.deepEqual(validateFoodSkuVersion(s), s);
    for (const ref of [null, {}, { offerId: "food-product:synthetic", version: 1 }, { ...s.servingOffer, latest: true }]) assert.throws(() => validateFoodSkuVersion({ ...s, servingOffer: ref }));
    for (const ref of [null, {}, { id: s.id, version: 2 }, { ...s.package, current: true }]) assert.throws(() => validateFoodSkuVersion({ ...s, package: ref }));
    assert.throws(() => validateFoodSkuVersion({ ...s, id: s.package.id }));
    assert.throws(() => validateFoodPackageDefinitionVersion({ ...packageFixture(), id: s.id }));
});
test("snapshots detach and freeze nested values; later versions do not retarget history", () => {
    const p = packageFixture(); const s = skuFixture(); const packageValue = validateFoodPackageDefinitionVersion(p); const skuValue = validateFoodSkuVersion(s);
    p.netQuantity.grams = 1; s.package.version = 3; s.servingOffer.version = 2;
    assert.equal(packageValue.netQuantity?.grams, 123.25); assert.equal(skuValue.package.version, 2); assert.equal(skuValue.servingOffer.version, 1);
    validateFoodPackageDefinitionVersion({ ...packageFixture(), version: 3 }); validateFoodSkuVersion(s);
    assert.equal(skuValue.package.version, 2); assert.equal(skuValue.servingOffer.version, 1);
    for (const v of [packageValue, packageValue.netQuantity, skuValue, skuValue.package, skuValue.servingOffer]) assert(Object.isFrozen(v));
    assert.notEqual(skuValue.package, s.package); assert.notEqual(skuValue.servingOffer, s.servingOffer); assert.notEqual(packageValue.netQuantity, p.netQuantity);
});
test("revision helpers require stable identity and consecutive versions", () => {
    const p = packageFixture(); const s = skuFixture();
    assert.equal(reviseFoodPackageDefinitionVersion(p, { ...p, version: 3 }).version, 3);
    assert.equal(reviseFoodSkuVersion(s, { ...s, version: 2 }).version, 2);
    for (const version of [1, 2, 4]) assert.throws(() => reviseFoodPackageDefinitionVersion(p, { ...p, version }));
    assert.throws(() => reviseFoodSkuVersion(s, { ...s, id: createFoodSkuId("synthetic-other"), version: 2 }));
    assert.throws(() => reviseFoodPackageDefinitionVersion(p, { ...p, id: createFoodPackageDefinitionId("synthetic-other"), version: 3 }));
    assert.throws(() => reviseFoodSkuVersion({ ...s, version: Number.MAX_SAFE_INTEGER }, { ...s, version: Number.MAX_SAFE_INTEGER }));
});
test("strict allowlists reject commercial readiness, price, stock and integration fields", () => {
    for (const field of ["priceCents", "approvedPrice", "isOrderable", "available", "inventory", "stock", "taxCategory", "stripePriceId", "barcode", "skuCode", "published", "latest", "current"]) {
        assert.throws(() => validateFoodPackageDefinitionVersion({ ...packageFixture(), [field]: 1 }));
        assert.throws(() => validateFoodSkuVersion({ ...skuFixture(), [field]: 1 }));
    }
    for (const v of [null, [], "synthetic", { ...skuFixture(), [Symbol("extra")]: 1 }]) assert.throws(() => validateFoodSkuVersion(v));
});
