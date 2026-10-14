import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  appendFoodPhysicalInventoryMovement,
  type FoodPhysicalInventoryMovementD1Database,
  type FoodPhysicalInventoryMovementD1Statement,
  type FoodPhysicalInventoryMovementD1Result,
} from "./d1-physical-inventory-movement-persistence";
import { createFoodPhysicalInventoryMovementId, validateFoodPhysicalInventoryMovement } from "./physical-inventory-movement-domain";
import { createFoodProductionBatchId, type FoodProductionStorageMode } from "./production-batch-domain";
import { createFoodSkuId } from "./package-sku-domain";

type Primitive = string | number | null;
const movementColumns = ["movement_id", "batch_id", "batch_version", "sku_id", "sku_version", "movement_type", "package_count", "occurred_on", "attribution", "source_reference"];
function fixture() {
  return validateFoodPhysicalInventoryMovement({
    kind: "food-physical-inventory-movement",
    id: createFoodPhysicalInventoryMovementId("synthetic-movement-001"),
    batch: { id: createFoodProductionBatchId("synthetic-batch-001"), version: 1 },
    sku: { id: createFoodSkuId("synthetic-sku-001"), version: 2 },
    movementType: "adjustment-in",
    packageCount: 3,
    occurredOn: "2026-10-14",
    attribution: "synthetic:operator",
    sourceReference: "synthetic:movement",
  });
}
function movementRow(): Record<string, unknown> {
  const value = fixture();
  return {
    movement_id: value.id, batch_id: value.batch.id, batch_version: value.batch.version,
    sku_id: value.sku.id, sku_version: value.sku.version, movement_type: value.movementType,
    package_count: value.packageCount, occurred_on: value.occurredOn,
    attribution: value.attribution, source_reference: value.sourceReference,
  };
}
function batchRow(mode: FoodProductionStorageMode = "frozen"): Record<string, unknown> {
  const value = fixture();
  return {
    batch_id: value.batch.id, version: value.batch.version,
    sku_id: value.sku.id, sku_version: value.sku.version, batch_code: "SYN-BATCH-001",
    storage_mode: mode, produced_package_count: 1, prepared_on: "2026-10-14",
    frozen_on: mode === "frozen" ? "2026-10-14" : null,
    attribution: "synthetic:producer", source_reference: "synthetic:production",
  };
}

class MemoryDatabase implements FoodPhysicalInventoryMovementD1Database {
  readonly calls: { sql: string; values: Primitive[] }[] = [];
  readonly movements: Record<string, unknown>[] = [];
  readonly batches: Record<string, unknown>[] = [batchRow()];
  movementReadResult?: FoodPhysicalInventoryMovementD1Result;
  batchReadResult?: FoodPhysicalInventoryMovementD1Result;
  insertResult?: FoodPhysicalInventoryMovementD1Result;
  movementReadError = false;
  batchReadError = false;
  insertError = false;
  raceRow?: Record<string, unknown>;
  raceReadError = false;
  raceReadResult?: FoodPhysicalInventoryMovementD1Result;
  prepare(sql: string): FoodPhysicalInventoryMovementD1Statement {
    let values: Primitive[] = [];
    const statement: FoodPhysicalInventoryMovementD1Statement = {
      bind: (...bound) => { values = bound; return statement; },
      all: async () => {
        this.calls.push({ sql, values });
        if (sql.startsWith("SELECT") && sql.includes("FROM food_physical_inventory_movements")) {
          if (this.movementReadError) throw new Error("synthetic movement read");
          return this.movementReadResult ?? { success: true, results: this.movements.filter(row => row.movement_id === values[0]) };
        }
        if (sql.startsWith("SELECT") && sql.includes("FROM food_production_batches")) {
          if (this.batchReadError) throw new Error("synthetic batch read");
          return this.batchReadResult ?? { success: true, results: this.batches.filter(row => row.batch_id === values[0] && row.version === values[1]) };
        }
        assert(sql.startsWith("INSERT INTO food_physical_inventory_movements"));
        if (this.insertError) {
          if (this.raceRow) this.movements.push(this.raceRow);
          this.movementReadError = this.raceReadError;
          this.movementReadResult = this.raceReadResult;
          this.batchReadError = true;
          throw new Error("synthetic insert race");
        }
        if (this.insertResult) return this.insertResult;
        if (this.movements.some(row => row.movement_id === values[0])) throw new Error("synthetic unique conflict");
        const row = Object.fromEntries(movementColumns.map((column, index) => [column, values[index]]));
        this.movements.push(row);
        return { success: true, results: [row] };
      },
    };
    return statement;
  }
}

for (const movementType of ["adjustment-in", "adjustment-out", "waste"] as const) {
  test(`${movementType} creates exact frozen evidence without balance enforcement`, async () => {
    const db = new MemoryDatabase();
    const input = { ...fixture(), movementType };
    const result = await appendFoodPhysicalInventoryMovement(db, input);
    assert.equal(result.outcome, "created");
    if (result.outcome !== "created") assert.fail("Expected created");
    assert.deepEqual(result.value, input);
    assert.notEqual(result.value, input);
    assert(Object.isFrozen(result.value));
    assert(Object.isFrozen(result.value.batch));
    assert(Object.isFrozen(result.value.sku));
    assert.deepEqual(validateFoodPhysicalInventoryMovement(JSON.parse(JSON.stringify(result.value))), result.value);
    assert.equal(db.movements.length, 1);
    assert.deepEqual(db.batches, [batchRow()]);
    assert.equal(db.calls.length, 3);
  });
}

for (const mode of ["refrigerated", "room-temperature"] as const) {
  test(`${mode} durable batch reconstructs canonical W1 omission`, async () => {
    const db = new MemoryDatabase(); db.batches[0] = batchRow(mode);
    assert.equal((await appendFoodPhysicalInventoryMovement(db, fixture())).outcome, "created");
  });
}

test("exact retry needs only movement lookup even when batch reads are unavailable", async () => {
  const db = new MemoryDatabase();
  await appendFoodPhysicalInventoryMovement(db, fixture());
  db.batchReadError = true; db.calls.length = 0;
  const retry = await appendFoodPhysicalInventoryMovement(db, fixture());
  assert.equal(retry.outcome, "already-present");
  if (retry.outcome !== "already-present") assert.fail("Expected retry");
  assert.deepEqual(retry.value, fixture());
  assert.equal(db.calls.length, 1);
  assert.equal(db.movements.length, 1);
});

const divergentChanges = [
  ["packageCount", { packageCount: 4 }],
  ["movementType", { movementType: "waste" }],
  ["batch ID", { batch: { ...fixture().batch, id: createFoodProductionBatchId("synthetic-other") } }],
  ["batch version", { batch: { ...fixture().batch, version: 2 } }],
  ["SKU ID", { sku: { ...fixture().sku, id: createFoodSkuId("synthetic-other") } }],
  ["SKU version", { sku: { ...fixture().sku, version: 3 } }],
  ["occurredOn", { occurredOn: "2026-10-15" }],
  ["attribution", { attribution: "synthetic:other" }],
  ["sourceReference", { sourceReference: "synthetic:other" }],
] as const;
for (const [label, change] of divergentChanges) {
  test(`same movement ID with changed ${label} conflicts before batch lookup`, async () => {
    const db = new MemoryDatabase(); db.movements.push(movementRow()); db.batchReadError = true;
    assert.deepEqual(await appendFoodPhysicalInventoryMovement(db, { ...fixture(), ...change }), { outcome: "conflict" });
    assert.equal(db.calls.length, 1);
    assert.deepEqual(db.movements, [movementRow()]);
  });
}

test("different movement ID appends separate evidence", async () => {
  const db = new MemoryDatabase(); db.movements.push(movementRow());
  assert.equal((await appendFoodPhysicalInventoryMovement(db, { ...fixture(), id: createFoodPhysicalInventoryMovementId("synthetic-other") })).outcome, "created");
  assert.equal(db.movements.length, 2);
});

test("malformed callers fail before database access", async () => {
  for (const input of [null, [], {}, { ...fixture(), packageCount: 0 }, { ...fixture(), kind: "wrong" }, { ...fixture(), extra: true }, { ...fixture(), [Symbol("extra")]: true }]) {
    const db = new MemoryDatabase();
    assert.deepEqual(await appendFoodPhysicalInventoryMovement(db, input), { outcome: "invalid" });
    assert.equal(db.calls.length, 0);
  }
});

test("missing exact batch is invalid without insert", async () => {
  const db = new MemoryDatabase(); db.batches.length = 0;
  assert.deepEqual(await appendFoodPhysicalInventoryMovement(db, fixture()), { outcome: "invalid" });
  assert.equal(db.calls.length, 2);
  assert.equal(db.movements.length, 0);
});

for (const change of [{ sku: { ...fixture().sku, id: createFoodSkuId("synthetic-other") } }, { sku: { ...fixture().sku, version: 3 } }]) {
  test(`mismatched durable SKU ${change.sku.id === fixture().sku.id ? "version" : "ID"} is invalid without insert`, async () => {
    const db = new MemoryDatabase();
    assert.deepEqual(await appendFoodPhysicalInventoryMovement(db, { ...fixture(), ...change }), { outcome: "invalid" });
    assert.equal(db.calls.length, 2);
    assert.equal(db.movements.length, 0);
  });
}

test("malformed uncertain and wrong-identity batch results fail closed", async () => {
  const missingColumn = { ...batchRow() }; delete missingColumn.frozen_on;
  for (const result of [
    { success: false, results: [] }, { success: true }, { success: true, results: [batchRow(), batchRow()] },
    ...[null, [], {}, missingColumn, { ...batchRow(), frozen_on: null },
      { ...batchRow("refrigerated"), frozen_on: undefined }, { ...batchRow(), sku_version: "2" },
      { ...batchRow(), prepared_on: "2026-02-30" }, { ...batchRow(), version: 2 },
      { ...batchRow(), batch_id: createFoodProductionBatchId("synthetic-other") },
    ].map(row => ({ success: true, results: [row] })),
  ]) {
    const db = new MemoryDatabase(); db.batchReadResult = result;
    assert.deepEqual(await appendFoodPhysicalInventoryMovement(db, fixture()), { outcome: "storage-failure" });
    assert.equal(db.calls.length, 2);
    assert.equal(db.movements.length, 0);
  }
});

test("batch read exception is storage-failure without insert", async () => {
  const db = new MemoryDatabase(); db.batchReadError = true;
  assert.deepEqual(await appendFoodPhysicalInventoryMovement(db, fixture()), { outcome: "storage-failure" });
  assert.equal(db.calls.length, 2);
});

test("malformed uncertain and wrong-identity existing movements fail closed", async () => {
  for (const result of [
    { success: false, results: [] }, { success: true }, { success: true, results: [movementRow(), movementRow()] },
    ...[null, [], {}, { ...movementRow(), package_count: "3" }, { ...movementRow(), movement_type: "sale" },
      { ...movementRow(), occurred_on: "2026-02-30" }, { ...movementRow(), [Symbol("extra")]: true },
      { ...movementRow(), movement_id: createFoodPhysicalInventoryMovementId("synthetic-other") },
    ].map(row => ({ success: true, results: [row] })),
  ]) {
    const db = new MemoryDatabase(); db.movementReadResult = result;
    assert.deepEqual(await appendFoodPhysicalInventoryMovement(db, fixture()), { outcome: "storage-failure" });
    assert.equal(db.calls.length, 1);
  }
});

test("movement read exception is storage-failure without batch lookup", async () => {
  const db = new MemoryDatabase(); db.movementReadError = true;
  assert.deepEqual(await appendFoodPhysicalInventoryMovement(db, fixture()), { outcome: "storage-failure" });
  assert.equal(db.calls.length, 1);
});

test("malformed divergent or impossible insert witnesses never report created", async () => {
  for (const insertResult of [
    { success: true, results: [{}] }, { success: true, results: [{ ...movementRow(), package_count: 99 }] },
    { success: true, results: [{ ...movementRow(), movement_id: createFoodPhysicalInventoryMovementId("synthetic-other") }] },
    { success: true, results: [] }, { success: true, results: [movementRow(), movementRow()] },
    { success: false, results: [] }, { success: true },
  ]) {
    const db = new MemoryDatabase(); db.insertResult = insertResult;
    assert.deepEqual(await appendFoodPhysicalInventoryMovement(db, fixture()), { outcome: "storage-failure" });
  }
});

for (const scenario of ["identical", "divergent", "missing", "malformed", "read-error", "uncertain"] as const) {
  test(`insert exception recovers ${scenario} by movement-only durable reread`, async () => {
    const db = new MemoryDatabase(); db.insertError = true;
    if (scenario === "identical") db.raceRow = movementRow();
    if (scenario === "divergent") db.raceRow = { ...movementRow(), attribution: "synthetic:other" };
    if (scenario === "malformed") db.raceRow = { ...movementRow(), package_count: 0 };
    if (scenario === "read-error") db.raceReadError = true;
    if (scenario === "uncertain") db.raceReadResult = { success: false, results: [] };
    assert.equal((await appendFoodPhysicalInventoryMovement(db, fixture())).outcome,
      scenario === "identical" ? "already-present" : scenario === "divergent" ? "conflict" : "storage-failure");
    assert.equal(db.calls.length, 4);
    assert(db.calls[2].sql.startsWith("INSERT"));
    assert(db.calls[3].sql.includes("FROM food_physical_inventory_movements"));
    assert.equal(db.calls.filter(call => call.sql.includes("FROM food_production_batches")).length, 1);
  });
}

test("query scope is exact and only movement rows are written", async () => {
  const db = new MemoryDatabase(); await appendFoodPhysicalInventoryMovement(db, fixture());
  assert.match(db.calls[0].sql, /WHERE movement_id = \? LIMIT 1/);
  assert.deepEqual(db.calls[0].values, [fixture().id]);
  assert.match(db.calls[1].sql, /WHERE batch_id = \? AND version = \? LIMIT 1/);
  assert.deepEqual(db.calls[1].values, [fixture().batch.id, fixture().batch.version]);
  assert.match(db.calls[2].sql, /^INSERT INTO food_physical_inventory_movements/);
  assert.match(db.calls[2].sql, /RETURNING/);
  for (const call of db.calls) assert.doesNotMatch(call.sql, /\bUPDATE\b|\bDELETE\b|\bSUM\b|ORDER BY|revision|ON CONFLICT/i);
  assert.deepEqual(db.batches, [batchRow()]);
});

test("source grants only inert append persistence", async () => {
  const source = await readFile(new URL("./d1-physical-inventory-movement-persistence.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /quantityOnHand|quantity_on_hand|availableQuantity|available_quantity|inventoryBalance|stockBalance|capacityUnits|checkoutReady|paymentReady|administrator|principal|authorization|food_sku_capacity_sources|food_fulfillment_slot_capacity_sources|food_capacity_reservations|food_capacity_reservation_lines|food_fulfillment_slot_reservations|Stripe|Square|PayPal|fetch\s*\(|process\.env|Date\.now|\bUPDATE\b|\bDELETE\b/);
});

test("canonical migration 0004 remains unchanged and sufficient; text only", async () => {
  const sql = (await readFile(new URL("../../../migrations/food/0004_food_physical_inventory.sql", import.meta.url), "utf8")).replace(/\r\n/g, "\n");
  assert.equal(createHash("sha256").update(sql).digest("hex"), "2220c4d91e44a40626260379954287a9936358bf20a862c2e31cbd1ab184ca66");
  for (const column of movementColumns) assert(sql.includes(column));
  assert.match(sql, /movement_id TEXT NOT NULL PRIMARY KEY/);
  assert.match(sql, /FOREIGN KEY \(batch_id, batch_version\)\s*REFERENCES food_production_batches \(batch_id, version\)/);
  assert.match(sql, /food_physical_inventory_movements_no_update/);
  assert.match(sql, /food_physical_inventory_movements_no_delete/);
});
