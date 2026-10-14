import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { projectFoodProductionBatchRecordedPhysicalBalance as project, FOOD_PRODUCTION_BATCH_RECORDED_PHYSICAL_BALANCE_KIND } from "./physical-inventory-balance-domain";
import { createFoodProductionBatchId, type FoodProductionStorageMode } from "./production-batch-domain";
import { createFoodSkuId } from "./package-sku-domain";
import { createFoodPhysicalInventoryMovementId, type FoodPhysicalInventoryMovementType } from "./physical-inventory-movement-domain";

function batch(count = 5, storageMode: FoodProductionStorageMode = "frozen") {
  return {
    kind: "food-production-batch", id: createFoodProductionBatchId("synthetic-batch"), version: 1,
    sku: { id: createFoodSkuId("synthetic-sku"), version: 2 },
    batchCode: "SYN-BATCH", storageMode, producedPackageCount: count,
    preparedOn: "2026-10-14", ...(storageMode === "frozen" ? { frozenOn: "2026-10-14" } : {}),
    attribution: "synthetic:producer", sourceReference: "synthetic:production",
  };
}
function movement(local = "synthetic-movement", movementType: FoodPhysicalInventoryMovementType = "adjustment-in", packageCount = 3) {
  const production = batch();
  return {
    kind: "food-physical-inventory-movement", id: createFoodPhysicalInventoryMovementId(local),
    batch: { id: production.id, version: production.version }, sku: { ...production.sku },
    movementType, packageCount, occurredOn: "2026-10-14",
    attribution: "synthetic:operator", sourceReference: "synthetic:movement",
  };
}

for (const mode of ["frozen", "refrigerated", "room-temperature"] as const) {
  test(`${mode} empty evidence retains exact baseline and references`, () => {
    const input = batch(5, mode);
    assert.deepEqual(project(input, []), {
      kind: FOOD_PRODUCTION_BATCH_RECORDED_PHYSICAL_BALANCE_KIND,
      batch: { id: input.id, version: 1 }, sku: input.sku,
      recordedPackageBalance: 5, movementIds: [],
    });
  });
}
for (const type of ["adjustment-in", "adjustment-out", "waste"] as const) {
  test(`${type} applies its canonical direction`, () => {
    assert.equal(project(batch(), [movement("synthetic", type)]).recordedPackageBalance, type === "adjustment-in" ? 8 : 2);
  });
}
test("mixed movements derive exact balance and sorted identities independently of order", () => {
  const entries = [movement("z", "waste", 2), movement("A", "adjustment-in", 8), movement("a", "adjustment-out", 3)];
  const result = project(batch(), entries);
  assert.equal(result.recordedPackageBalance, 8);
  assert.deepEqual(result.movementIds, [entries[1].id, entries[2].id, entries[0].id]);
  for (const permutation of [[...entries].reverse(), [entries[1], entries[0], entries[2]], [entries[2], entries[1], entries[0]]]) {
    assert.deepEqual(project(batch(), permutation), result);
  }
  assert.equal(entries[0].id, createFoodPhysicalInventoryMovementId("z"));
});
test("negative and zero balances are valid and are never clamped", () => {
  assert.equal(project(batch(), [movement("waste", "waste", 6)]).recordedPackageBalance, -1);
  assert.equal(project(batch(), [movement("out", "adjustment-out", 5)]).recordedPackageBalance, 0);
});
for (const divergent of [false, true]) {
  test(`${divergent ? "divergent" : "identical"} duplicate IDs reject`, () => {
    const entry = movement();
    assert.throws(() => project(batch(), [entry, { ...entry, packageCount: divergent ? 4 : entry.packageCount }]), /Duplicate/);
  });
}
for (const [label, change] of [
  ["batch ID", { batch: { ...movement().batch, id: createFoodProductionBatchId("synthetic-other") } }],
  ["batch version", { batch: { ...movement().batch, version: 2 } }],
  ["SKU ID", { sku: { ...movement().sku, id: createFoodSkuId("synthetic-other") } }],
  ["SKU version", { sku: { ...movement().sku, version: 3 } }],
] as const) {
  test(`mismatched ${label} rejects without filtering`, () => {
    assert.throws(() => project(batch(), [{ ...movement(), ...change }]));
  });
}
test("canonical batch validator rejects malformed evidence", () => {
  for (const input of [null, [], {}, { ...batch(), producedPackageCount: 0 }, { ...batch(), extra: true }, { ...batch(), [Symbol("extra")]: true }]) {
    assert.throws(() => project(input, []));
  }
});
test("canonical movement validator rejects malformed entries", () => {
  for (const input of [null, {}, { ...movement(), packageCount: 0 }, { ...movement(), movementType: "handoff" }, { ...movement(), occurredOn: "2026-02-30" }, { ...movement(), extra: true }, { ...movement(), [Symbol("extra")]: true }]) {
    assert.throws(() => project(batch(), [input]));
  }
  assert.throws(() => project(batch(), new Array(1)));
});
test("movement input must be an actual array", () => {
  for (const input of [null, undefined, "", new Set(), { 0: movement(), length: 1 }, { *[Symbol.iterator]() { yield movement(); } }]) {
    assert.throws(() => project(batch(), input));
  }
});
test("positive final overflow rejects canonical safe individual inputs", () => {
  assert.throws(() => project(batch(Number.MAX_SAFE_INTEGER), [movement("in", "adjustment-in", 1)]), /safe integer/);
});
test("negative final overflow rejects canonical safe individual inputs", () => {
  assert.throws(() => project(batch(1), [movement("out", "adjustment-out", Number.MAX_SAFE_INTEGER), movement("waste", "waste", 2)]), /safe integer/);
});
test("both signed safe boundaries are accepted", () => {
  assert.equal(project(batch(Number.MAX_SAFE_INTEGER), []).recordedPackageBalance, Number.MAX_SAFE_INTEGER);
  assert.equal(project(batch(1), [movement("out", "adjustment-out", Number.MAX_SAFE_INTEGER), movement("waste", "waste", 1)]).recordedPackageBalance, -Number.MAX_SAFE_INTEGER);
});
test("BigInt avoids transient number overflow and preserves exactness across permutations", () => {
  const entries = [movement("in", "adjustment-in", Number.MAX_SAFE_INTEGER), movement("out", "adjustment-out", Number.MAX_SAFE_INTEGER), movement("waste", "waste", 1)];
  const expected = project(batch(Number.MAX_SAFE_INTEGER), entries);
  assert.equal(expected.recordedPackageBalance, Number.MAX_SAFE_INTEGER - 1);
  for (const order of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) {
    assert.deepEqual(project(batch(Number.MAX_SAFE_INTEGER), order.map(index => entries[index])), expected);
  }
});
test("result is detached frozen and isolated from caller mutations", () => {
  const production = batch(); const entry = movement(); const entries = [entry];
  const before = structuredClone({ production, entries });
  const result = project(production, entries);
  assert.deepEqual({ production, entries }, before);
  for (const value of [result, result.batch, result.sku, result.movementIds]) assert(Object.isFrozen(value));
  assert.notEqual(result.sku, production.sku);
  assert.notEqual(result.batch, entry.batch);
  production.id = createFoodProductionBatchId("synthetic-changed"); production.sku.version = 99;
  entry.batch.version = 99; entry.sku.version = 99; entry.packageCount = 99;
  entries.push(movement("synthetic-other"));
  assert.equal(result.recordedPackageBalance, 8);
  assert.equal(result.batch.id, before.production.id);
  assert.equal(result.batch.version, 1); assert.equal(result.sku.version, 2);
  assert.deepEqual(result.movementIds, [before.entries[0].id]);
});
test("dates do not filter the explicit evidence set", () => {
  const past = { ...movement("past"), occurredOn: "2020-01-01" };
  const future = { ...movement("future"), occurredOn: "2099-12-31" };
  assert.equal(project(batch(), [past, future]).recordedPackageBalance, 11);
});
test("projection source is synchronous pure and grants no downstream authority", async () => {
  const source = await readFile(new URL("./physical-inventory-balance-domain.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /D1Database|repository|prepare\s*\(|\bSQL\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bSELECT\b|process\.env|fetch\s*\(|Cloudflare|Stripe|Square|PayPal|administrator|principal|authorization|session|Date\.now|new Date|\basync\b|quantityOnHand|QuantityOnHand|CurrentInventory|AvailableInventory|food_production_batches|food_physical_inventory_movements|food_sku_capacity_sources|food_capacity_reservations|checkoutReady|paymentReady|capacityUnits|reservableUnits|availableUnits/);
});
