import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createFoodApprovedCommercialPriceId, parseFoodApprovedCommercialPriceId, createInitialFoodApprovedCommercialPrice, validateFoodApprovedCommercialPriceVersion, reviseFoodApprovedCommercialPriceVersion } from "./approved-commercial-price-domain";

// All values are synthetic fixtures, not real approvals or commercial records.
const sku = () => ({ id: "food-sku:synthetic", version: 3, servingOffer: { offerId: "food-serving-offer:synthetic", version: 1 }, package: { id: "food-package-definition:synthetic", version: 2 } });
const fixture = () => ({ id: createFoodApprovedCommercialPriceId("synthetic"), version: 1, sku: { id: sku().id, version: 3 }, money: { currency: "USD", minorUnits: 1234 }, approval: { attribution: "Synthetic approver", sourceReference: "fixture:synthetic-approval", approvedOn: "2026-10-13" }, candidateProvenance: { sourceReference: "fixture:synthetic-planning" } });
const build = (v: unknown = fixture(), s: unknown = sku()) => createInitialFoodApprovedCommercialPrice(v, s);

test("initial creation and historical validation use distinct version rules and branded identities", () => {
    assert.deepEqual(build(), fixture()); assert.equal(parseFoodApprovedCommercialPriceId(fixture().id), fixture().id);
    for (const id of [null, 1, "", "food-sku:synthetic", "food-approved-commercial-price:", "food-approved-commercial-price:a:b", " food-approved-commercial-price:a"]) assert.throws(() => build({ ...fixture(), id }));
    for (const id of ["", " a", "a ", "a:b", "x".repeat(129)]) assert.throws(() => createFoodApprovedCommercialPriceId(id));
    for (const version of [0, -1, 1.5, Infinity, NaN, "1", "latest", Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => validateFoodApprovedCommercialPriceVersion({ ...fixture(), version }, sku()));
    assert.throws(() => build({ ...fixture(), version: 2 })); assert.equal(validateFoodApprovedCommercialPriceVersion({ ...fixture(), version: 2 }, sku()).version, 2);
});
test("canonical money preserves zero and currency, rejects coercion and unsafe amounts", () => {
    assert.equal(build({ ...fixture(), money: { currency: "EUR", minorUnits: 0 } }).money.minorUnits, 0);
    for (const currency of ["usd", "US", " USD", 1, null]) assert.throws(() => build({ ...fixture(), money: { currency, minorUnits: 1 } }));
    for (const minorUnits of [-1, 1.5, Infinity, NaN, "1234", Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => build({ ...fixture(), money: { currency: "USD", minorUnits } }));
});
test("exact canonical SKU context required, no latest/current inference", () => {
    for (const ref of [null, {}, { id: "food-sku:other", version: 3 }, { id: sku().id, version: 4 }, { id: sku().id, version: "latest" }, { ...fixture().sku, current: true }]) assert.throws(() => build({ ...fixture(), sku: ref }));
    for (const s of [null, {}, { ...sku(), package: {} }, { ...sku(), servingOffer: { offerId: "bad", version: 1 } }]) assert.throws(() => build(fixture(), s));
});
test("every version requires bounded attribution/source and supplied valid approval date", () => {
    for (const field of ["attribution", "sourceReference", "approvedOn"]) {
        const a: Record<string, unknown> = { ...fixture().approval }; delete a[field]; assert.throws(() => build({ ...fixture(), approval: a }));
        for (const bad of [null, "", " padded ", 1]) assert.throws(() => build({ ...fixture(), approval: { ...fixture().approval, [field]: bad } }));
    }
    for (const date of ["2026-02-30", "2025-02-29", "2026-10-13T00:00:00Z"]) assert.throws(() => build({ ...fixture(), approval: { ...fixture().approval, approvedOn: date } }));
    assert.throws(() => build({ ...fixture(), approval: { ...fixture().approval, attribution: "x".repeat(513) } }));
    assert.throws(() => reviseFoodApprovedCommercialPriceVersion(fixture(), { ...fixture(), version: 2, approval: undefined }, sku()));
    assert.throws(() => reviseFoodApprovedCommercialPriceVersion(fixture(), { ...fixture(), version: 2, money: undefined }, sku()));
});
test("opaque candidate provenance is optional and cannot supply approved money", () => {
    const { candidateProvenance: _candidate, ...without } = fixture(); assert(_candidate); assert.equal("candidateProvenance" in build(without), false);
    assert.equal(build().candidateProvenance?.sourceReference, fixture().candidateProvenance.sourceReference);
    assert.equal(build({ ...fixture(), money: { currency: "USD", minorUnits: 1500 } }).money.minorUnits, 1500);
    for (const p of [null, {}, { sourceReference: "" }, { sourceReference: "x".repeat(513) }, { ..._candidate, candidatePrice: fixture().money }]) assert.throws(() => build({ ...fixture(), candidateProvenance: p }));
    assert.throws(() => build({ ...fixture(), money: undefined })); assert.throws(() => build({ planningOnly: true, candidatePrice: fixture().money }));
});
test("consecutive full revisions preserve identity and exact SKU, never mutate history", () => {
    const old = build(); const nextInput = { ...fixture(), version: 2, money: { currency: "USD", minorUnits: 1500 }, approval: { ...fixture().approval, sourceReference: "fixture:synthetic-next" } };
    const next = reviseFoodApprovedCommercialPriceVersion(old, nextInput, sku()); assert.equal(next.version, 2); assert.equal(next.money.minorUnits, 1500); assert.deepEqual(old, fixture());
    for (const version of [1, 3]) assert.throws(() => reviseFoodApprovedCommercialPriceVersion(old, { ...nextInput, version }, sku()));
    assert.throws(() => reviseFoodApprovedCommercialPriceVersion(old, { ...nextInput, id: createFoodApprovedCommercialPriceId("other-synthetic") }, sku()));
    for (const s of [{ ...sku(), id: "food-sku:other-synthetic" }, { ...sku(), version: 4 }]) assert.throws(() => reviseFoodApprovedCommercialPriceVersion(old, { ...nextInput, sku: { id: s.id, version: s.version } }, s));
    assert.throws(() => reviseFoodApprovedCommercialPriceVersion({ ...fixture(), approval: null }, nextInput, sku()));
    assert.throws(() => reviseFoodApprovedCommercialPriceVersion({ ...fixture(), version: Number.MAX_SAFE_INTEGER }, { ...nextInput, version: Number.MAX_SAFE_INTEGER }, sku()));
});
test("snapshots detach and freeze money, references, approval and provenance", () => {
    const f = fixture(); const value = build(f); f.money.minorUnits = 9; f.sku.version = 9; f.approval.attribution = "Changed synthetic"; f.candidateProvenance.sourceReference = "changed";
    assert.deepEqual(value, fixture());
    for (const v of [value, value.sku, value.money, value.approval, value.candidateProvenance]) assert(Object.isFrozen(v));
    assert.notEqual(value.money, f.money); assert.notEqual(value.approval, f.approval); assert.notEqual(value.candidateProvenance, f.candidateProvenance);
    assert.throws(() => { (value.money as { minorUnits: number }).minorUnits = 1; });
});
test("strict boundaries exclude readiness and active policy; module has no clock or IO", async () => {
    for (const key of ["published", "available", "inventory", "orderable", "checkoutReady", "paymentReady", "sellable", "tax", "effectiveFrom", "revoked", "current", "latest", "candidatePrice"]) assert.throws(() => build({ ...fixture(), [key]: true }));
    assert.throws(() => build({ ...fixture(), [Symbol("extra")]: true }));
    const source = await readFile(new URL("./approved-commercial-price-domain.ts", import.meta.url), "utf8");
    assert.doesNotMatch(source, /Date\.now|new Date|process\.env|fetch\(|Math\.random|node:fs|projectFoodPublicMenu/);
});
