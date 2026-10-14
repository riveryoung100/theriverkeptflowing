import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  createFoodPhysicalInventoryMovementId,
  parseFoodPhysicalInventoryMovementId,
  validateFoodPhysicalInventoryMovement,
} from "./physical-inventory-movement-domain";
import { createFoodProductionBatchId } from "./production-batch-domain";
import { createFoodSkuId } from "./package-sku-domain";

function fixture() {
  return {
    kind: "food-physical-inventory-movement",
    id: createFoodPhysicalInventoryMovementId("synthetic-001"),
    batch: { id: createFoodProductionBatchId("synthetic-001"), version: 1 },
    sku: { id: createFoodSkuId("synthetic-001"), version: 2 },
    movementType: "adjustment-in",
    packageCount: 3,
    occurredOn: "2026-10-14",
    attribution: "synthetic:operator",
    sourceReference: "synthetic:correction",
  };
}

test("movement identity is caller supplied canonical bounded and unpadded", () => {
  const id = createFoodPhysicalInventoryMovementId("synthetic-001");
  assert.equal(id, "food-physical-inventory-movement:synthetic-001");
  assert.equal(parseFoodPhysicalInventoryMovementId(id), id);
  assert.equal(parseFoodPhysicalInventoryMovementId(createFoodPhysicalInventoryMovementId("x".repeat(128))), `food-physical-inventory-movement:${"x".repeat(128)}`);
  for (const input of ["", " x", "x ", "bad:id", "x".repeat(129), null, {}]) {
    assert.throws(() => createFoodPhysicalInventoryMovementId(input));
  }
  for (const input of ["wrong:001", "food-physical-inventory-movement:", "food-physical-inventory-movement:x:y"]) {
    assert.throws(() => parseFoodPhysicalInventoryMovementId(input));
  }
});

for (const movementType of ["adjustment-in", "adjustment-out", "waste"]) {
  test(`${movementType} preserves exact references and detaches and freezes`, () => {
    const input = { ...fixture(), movementType };
    const canonical = validateFoodPhysicalInventoryMovement(input);
    assert.deepEqual(canonical, input);
    assert(Object.isFrozen(canonical));
    assert(Object.isFrozen(canonical.batch));
    assert(Object.isFrozen(canonical.sku));
    assert.notEqual(canonical.batch, input.batch);
    assert.notEqual(canonical.sku, input.sku);
    input.batch.version = 8;
    input.sku.version = 9;
    input.packageCount = 99;
    assert.equal(canonical.batch.version, 1);
    assert.equal(canonical.sku.version, 2);
    assert.equal(canonical.packageCount, 3);
    assert.deepEqual(validateFoodPhysicalInventoryMovement(JSON.parse(JSON.stringify(canonical))), canonical);
  });
}

for (const field of ["packageCount", "batch", "sku"] as const) {
  test(`${field} requires positive safe integer`, () => {
    for (const invalid of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, "1", null]) {
      const input = fixture();
      assert.throws(() => validateFoodPhysicalInventoryMovement({
        ...input,
        [field]: field === "packageCount" ? invalid : { ...input[field], version: invalid },
      }));
    }
    const input = fixture();
    assert.doesNotThrow(() => validateFoodPhysicalInventoryMovement({
      ...input,
      [field]: field === "packageCount" ? Number.MAX_SAFE_INTEGER : { ...input[field], version: Number.MAX_SAFE_INTEGER },
    }));
  });
}

test("occurredOn validates calendar dates without a clock", () => {
  for (const occurredOn of ["2026-02-30", "2026-13-01", "2026-00-10", "2026-1-01", " 2026-10-14", "2026-04-31", "1900-02-29", "0000-01-01"]) {
    assert.throws(() => validateFoodPhysicalInventoryMovement({ ...fixture(), occurredOn }));
  }
  for (const occurredOn of ["2024-02-29", "2000-02-29", "2026-02-28", "0001-01-01"]) {
    assert.doesNotThrow(() => validateFoodPhysicalInventoryMovement({ ...fixture(), occurredOn }));
  }
});

test("metadata is required bounded and unpadded", () => {
  for (const field of ["attribution", "sourceReference"]) {
    for (const value of ["", " padded", "padded ", "x".repeat(513), null]) {
      assert.throws(() => validateFoodPhysicalInventoryMovement({ ...fixture(), [field]: value }));
    }
    assert.doesNotThrow(() => validateFoodPhysicalInventoryMovement({ ...fixture(), [field]: "x".repeat(512) }));
  }
});

test("strict outer and nested fields reject missing unknown and symbol keys", () => {
  for (const input of [null, [], {}, { ...fixture(), unexpected: true }, { ...fixture(), [Symbol("extra")]: true }]) {
    assert.throws(() => validateFoodPhysicalInventoryMovement(input));
  }
  for (const key of Object.keys(fixture())) {
    const input: Record<string, unknown> = { ...fixture() };
    delete input[key];
    assert.throws(() => validateFoodPhysicalInventoryMovement(input));
  }
  for (const field of ["batch", "sku"] as const) {
    for (const extra of [{ extra: true }, { [Symbol("extra")]: true }]) {
      const input = fixture();
      assert.throws(() => validateFoodPhysicalInventoryMovement({ ...input, [field]: { ...input[field], ...extra } }));
    }
  }
});

test("exact branded references and kind are mandatory", () => {
  assert.throws(() => validateFoodPhysicalInventoryMovement({ ...fixture(), kind: "wrong" }));
  for (const field of ["batch", "sku"] as const) {
    const input = fixture();
    assert.throws(() => validateFoodPhysicalInventoryMovement({ ...input, [field]: { ...input[field], id: "wrong:001" } }));
  }
});

test("only narrow physical correction types are allowed", () => {
  for (const movementType of ["production", "reservation-hold", "reservation-release", "sale", "sold", "handoff", "fulfilled", "completed", "payment", "refund", "checkout", "cancellation", "fulfillment-complete"]) {
    assert.throws(() => validateFoodPhysicalInventoryMovement({ ...fixture(), movementType }));
  }
});

test("movement source is pure and grants no downstream authority", async () => {
  const source = await readFile(new URL("./physical-inventory-movement-domain.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /D1Database|repository|\bSQL\b|INSERT|UPDATE|DELETE|food_sku_capacity_sources|food_capacity_reservations|quantityOnHand|reservedQuantity|soldQuantity|checkoutReady|paymentReady|Stripe|Square|PayPal|fetch\s*\(|process\.env|Date\.now|new Date/);
});
