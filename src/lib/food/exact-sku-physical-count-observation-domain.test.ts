import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createFoodSkuId } from "./package-sku-domain";
import {
  FOOD_EXACT_SKU_PHYSICAL_COUNT_OBSERVATION_KIND,
  FOOD_EXACT_SKU_PHYSICAL_COUNT_SCOPE,
  createFoodExactSkuPhysicalCountObservationId,
  parseFoodExactSkuPhysicalCountObservationId,
  validateFoodExactSkuPhysicalCountObservation,
} from "./exact-sku-physical-count-observation-domain";

function fixture() {
  return {
    kind: FOOD_EXACT_SKU_PHYSICAL_COUNT_OBSERVATION_KIND,
    id: createFoodExactSkuPhysicalCountObservationId("006q-synthetic-001"),
    sku: { id: createFoodSkuId("006q-synthetic-sku"), version: 2 },
    countScope: FOOD_EXACT_SKU_PHYSICAL_COUNT_SCOPE,
    countedPackageCount: 12,
    observedAt: "2026-10-15T17:30:00Z",
    attribution: "synthetic:test-counter",
    sourceReference: "synthetic:physical-count:001",
  };
}

test("006Q count identity is canonical and bounded", () => {
  const id = createFoodExactSkuPhysicalCountObservationId("count-001");
  assert.equal(id, "food-exact-sku-physical-count-observation:count-001");
  assert.equal(parseFoodExactSkuPhysicalCountObservationId(id), id);
  assert.throws(() => createFoodExactSkuPhysicalCountObservationId("bad:identity"));
  assert.throws(() => parseFoodExactSkuPhysicalCountObservationId("wrong:count-001"));
  assert.doesNotThrow(() => createFoodExactSkuPhysicalCountObservationId("x".repeat(128)));
  assert.throws(() => createFoodExactSkuPhysicalCountObservationId("x".repeat(129)));
});

test("006Q accepts zero and maximum-safe exact-SKU total package counts", () => {
  assert.equal(validateFoodExactSkuPhysicalCountObservation({ ...fixture(), countedPackageCount: 0 }).countedPackageCount, 0);
  assert.equal(validateFoodExactSkuPhysicalCountObservation({ ...fixture(), countedPackageCount: Number.MAX_SAFE_INTEGER }).countedPackageCount, Number.MAX_SAFE_INTEGER);
});

test("006Q rejects negative noninteger unsafe and coerced counts", () => {
  for (const countedPackageCount of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, "12", null, undefined]) {
    assert.throws(() => validateFoodExactSkuPhysicalCountObservation({ ...fixture(), countedPackageCount }));
  }
});

test("006Q requires exact-SKU-total scope and canonical exact SKU coordinates", () => {
  assert.throws(() => validateFoodExactSkuPhysicalCountObservation({ ...fixture(), countScope: "partial" }));
  assert.throws(() => validateFoodExactSkuPhysicalCountObservation({ ...fixture(), sku: { ...fixture().sku, id: "wrong:sku" } }));
  for (const version of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "2"]) {
    assert.throws(() => validateFoodExactSkuPhysicalCountObservation({ ...fixture(), sku: { ...fixture().sku, version } }));
  }
});

test("006Q observedAt is an exact UTC calendar instant without normalization", () => {
  for (const observedAt of ["2026-02-29T12:00:00Z", "2026-13-01T00:00:00Z", "2026-04-31T00:00:00Z", "2026-10-15T24:00:00Z", "2026-10-15T17:30:00.000Z", "2026-10-15T17:30:00-05:00", " 2026-10-15T17:30:00Z"]) {
    assert.throws(() => validateFoodExactSkuPhysicalCountObservation({ ...fixture(), observedAt }));
  }
  assert.equal(validateFoodExactSkuPhysicalCountObservation({ ...fixture(), observedAt: "2024-02-29T23:59:59Z" }).observedAt, "2024-02-29T23:59:59Z");
});

test("006Q shape is strict and cannot smuggle batch reconciliation or operational authority", () => {
  for (const extra of [
    { batch: { id: "food-production-batch:synthetic", version: 1 } },
    { recordedBalance: 12 },
    { variance: 0 },
    { currentQoh: 12 },
    { availableToPromise: 12 },
    { reservationAuthority: true },
  ]) {
    assert.throws(() => validateFoodExactSkuPhysicalCountObservation({ ...fixture(), ...extra }));
  }
  assert.throws(() => validateFoodExactSkuPhysicalCountObservation({ ...fixture(), sku: { ...fixture().sku, extra: true } }));
  const symbol = Symbol("private");
  const value = fixture() as Record<PropertyKey, unknown>;
  value[symbol] = true;
  assert.throws(() => validateFoodExactSkuPhysicalCountObservation(value));
});

test("006Q canonical observation is detached deeply frozen and JSON-revalidatable", () => {
  const input = fixture();
  const value = validateFoodExactSkuPhysicalCountObservation(input);
  assert(Object.isFrozen(value));
  assert(Object.isFrozen(value.sku));
  const originalId = value.sku.id;
  input.sku.id = createFoodSkuId("mutated");
  input.countedPackageCount = 99;
  assert.equal(value.sku.id, originalId);
  assert.equal(value.countedPackageCount, 12);
  assert.deepEqual(validateFoodExactSkuPhysicalCountObservation(JSON.parse(JSON.stringify(value))), value);
});

test("006Q provenance is required canonical bounded text", () => {
  for (const field of ["attribution", "sourceReference"] as const) {
    for (const bad of ["", " padded", "padded ", "x".repeat(513), 12, null]) {
      assert.throws(() => validateFoodExactSkuPhysicalCountObservation({ ...fixture(), [field]: bad }));
    }
    assert.doesNotThrow(() => validateFoodExactSkuPhysicalCountObservation({ ...fixture(), [field]: "x".repeat(512) }));
  }
});

test("006Q source is pure observation evidence and does not perform reconciliation or persistence", async () => {
  const source = await readFile(new URL("./exact-sku-physical-count-observation-domain.ts", import.meta.url), "utf8");
  assert.match(source, /parseFoodSkuId/);
  assert.match(source, /exact-sku-total/);
  assert.doesNotMatch(source, /authoritative-recorded-inventory-balance-read-point-validation|authoritative-recorded-inventory-balance-orchestration/);
  assert.doesNotMatch(source, /\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bSELECT\b|\bfetch\s*\(|Date\.now\s*\(/);
  assert.doesNotMatch(source, /\bcurrentQoh\s*:|\bavailableToPromise\s*:|\breservationAuthority\s*:/);
});
