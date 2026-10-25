import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  appendFoodProductionBatchVersion,
  type FoodProductionBatchD1Database,
  type FoodProductionBatchD1Result,
  type FoodProductionBatchD1Statement,
} from "./d1-production-batch-persistence";
import { createFoodProductionBatchId, validateFoodProductionBatchVersion, type FoodProductionStorageMode } from "./production-batch-domain";
import { createFoodSkuId } from "./package-sku-domain";

type Primitive = string | number | null;
const columns = ["batch_id", "version", "sku_id", "sku_version", "batch_code", "storage_mode", "produced_package_count", "prepared_on", "frozen_on", "attribution", "source_reference"];
function fixture(storageMode: FoodProductionStorageMode = "frozen") {
  return validateFoodProductionBatchVersion({
    kind: "food-production-batch",
    id: createFoodProductionBatchId("synthetic-batch-001"),
    version: 1,
    sku: { id: createFoodSkuId("synthetic-sku-001"), version: 2 },
    batchCode: "SYN-001",
    storageMode,
    producedPackageCount: 12,
    preparedOn: "2026-10-14",
    ...(storageMode === "frozen" ? { frozenOn: "2026-10-14" } : {}),
    attribution: "synthetic:operator",
    sourceReference: "synthetic:production",
  });
}
function row(storageMode: FoodProductionStorageMode = "frozen"): Record<string, unknown> {
  const value = fixture(storageMode);
  return {
    batch_id: value.id, version: value.version, sku_id: value.sku.id, sku_version: value.sku.version,
    batch_code: value.batchCode, storage_mode: value.storageMode, produced_package_count: value.producedPackageCount,
    prepared_on: value.preparedOn, frozen_on: value.frozenOn ?? null,
    attribution: value.attribution, source_reference: value.sourceReference,
  };
}

class MemoryDatabase implements FoodProductionBatchD1Database {
  rows: Record<string, unknown>[] = [];
  calls: { sql: string; values: Primitive[] }[] = [];
  readError = false;
  readResult?: FoodProductionBatchD1Result;
  insertResult?: FoodProductionBatchD1Result;
  raceRow?: Record<string, unknown>;
  insertError = false;
  raceReadError = false;
  prepare(sql: string): FoodProductionBatchD1Statement {
    let bound: Primitive[] = [];
    const statement: FoodProductionBatchD1Statement = {
      bind: (...values) => { bound = values; return statement; },
      all: async () => {
        this.calls.push({ sql, values: bound });
        if (sql.startsWith("SELECT")) {
          if (this.readError) throw new Error("synthetic read failure");
          return this.readResult ?? { success: true, results: this.rows.filter(item => item.batch_id === bound[0] && item.version === bound[1]) };
        }
        assert(sql.startsWith("INSERT INTO food_production_batches"));
        if (this.insertError) {
          if (this.raceRow) this.rows.push(this.raceRow);
          if (this.raceReadError) this.readError = true;
          throw new Error("synthetic insert race");
        }
        if (this.insertResult) return this.insertResult;
        const inserted = Object.fromEntries(columns.map((column, index) => [column, bound[index]]));
        this.rows.push(inserted);
        return { success: true, results: [inserted] };
      },
    };
    return statement;
  }
}

for (const mode of ["frozen", "refrigerated", "room-temperature"] as const) {
  test(`${mode} initial batch creates and exact retry preserves W1 shape`, async () => {
    const db = new MemoryDatabase();
    const first = await appendFoodProductionBatchVersion(db, fixture(mode));
    assert.equal(first.outcome, "created");
    if (first.outcome !== "created") assert.fail("Expected created");
    assert.deepEqual(first.value, fixture(mode));
    assert(Object.isFrozen(first.value));
    assert(Object.isFrozen(first.value.sku));
    assert.equal(Object.hasOwn(first.value, "frozenOn"), mode === "frozen");
    assert.deepEqual(validateFoodProductionBatchVersion(JSON.parse(JSON.stringify(first.value))), first.value);
    assert.equal((await appendFoodProductionBatchVersion(db, fixture(mode))).outcome, "already-present");
    assert.equal(db.rows.length, 1);
    assert.equal(db.calls.filter(call => call.sql.startsWith("INSERT")).length, 1);
  });
}

test("every authoritative payload difference conflicts without changing history", async () => {
  const changes = [
    { producedPackageCount: 13 }, { sku: { id: createFoodSkuId("synthetic-other"), version: 2 } },
    { sku: { ...fixture().sku, version: 3 } }, { batchCode: "SYN-002" },
    { storageMode: "refrigerated", frozenOn: undefined }, { frozenOn: "2026-10-15" },
    { preparedOn: "2026-10-13" }, { sourceReference: "synthetic:other" }, { attribution: "synthetic:other" },
  ];
  for (const change of changes) {
    const db = new MemoryDatabase();
    await appendFoodProductionBatchVersion(db, fixture());
    const original = structuredClone(db.rows);
    assert.equal((await appendFoodProductionBatchVersion(db, { ...fixture(), ...change })).outcome, "conflict");
    assert.deepEqual(db.rows, original);
  }
});

test("different caller supplied batch IDs create separate rows", async () => {
  const db = new MemoryDatabase();
  await appendFoodProductionBatchVersion(db, fixture());
  assert.equal((await appendFoodProductionBatchVersion(db, { ...fixture(), id: createFoodProductionBatchId("synthetic-other") })).outcome, "created");
  assert.equal(db.rows.length, 2);
});

test("invalid callers and noninitial versions perform no database access", async () => {
  for (const input of [null, {}, { ...fixture(), version: 2 }, { ...fixture(), producedPackageCount: 0 }, { ...fixture(), extra: true }, { ...fixture(), [Symbol("extra")]: true }]) {
    const db = new MemoryDatabase();
    assert.deepEqual(await appendFoodProductionBatchVersion(db, input), { outcome: "invalid" });
    assert.equal(db.calls.length, 0);
  }
});

test("uncertain reads malformed durable state and wrong identities fail closed", async () => {
  const malformed = [
    {}, { ...row(), produced_package_count: 0 }, { ...row(), frozen_on: null },
    { ...row("refrigerated"), frozen_on: undefined }, { ...row(), batch_id: createFoodProductionBatchId("synthetic-other") },
    { ...row(), prepared_on: "2026-02-30" },
  ];
  for (const readResult of [
    { success: false, results: [] }, { success: true }, { success: true, results: [row(), row()] },
    ...malformed.map(value => ({ success: true, results: [value] })),
  ]) {
    const db = new MemoryDatabase(); db.readResult = readResult;
    assert.deepEqual(await appendFoodProductionBatchVersion(db, fixture()), { outcome: "storage-failure" });
    assert.equal(db.calls.length, 1);
  }
  const db = new MemoryDatabase(); db.readError = true;
  assert.deepEqual(await appendFoodProductionBatchVersion(db, fixture()), { outcome: "storage-failure" });
});

for (const scenario of ["identical", "divergent", "missing", "malformed", "uncertain"] as const) {
  test(`actual insert exception resolves ${scenario} race through reread`, async () => {
    const db = new MemoryDatabase(); db.insertError = true;
    if (scenario === "identical") db.raceRow = row();
    if (scenario === "divergent") db.raceRow = { ...row(), attribution: "synthetic:other" };
    if (scenario === "malformed") db.raceRow = { ...row(), frozen_on: null };
    if (scenario === "uncertain") db.raceReadError = true;
    const expected = scenario === "identical" ? "already-present" : scenario === "divergent" ? "conflict" : "storage-failure";
    assert.equal((await appendFoodProductionBatchVersion(db, fixture())).outcome, expected);
    assert.equal(db.calls.length, 3);
    assert(db.calls[1].sql.startsWith("INSERT"));
    assert(db.calls[2].sql.startsWith("SELECT"));
  });
}

test("invalid insert results never invent created", async () => {
  for (const insertResult of [
    { success: true, results: [{}] },
    { success: true, results: [{ ...row(), attribution: "synthetic:other" }] },
    { success: true, results: [row(), row()] },
    { success: true, results: [] }, { success: false, results: [] }, { success: true },
  ]) {
    const db = new MemoryDatabase(); db.insertResult = insertResult;
    assert.deepEqual(await appendFoodProductionBatchVersion(db, fixture()), { outcome: "storage-failure" });
  }
});

test("persistence has only exact batch reads and append SQL", async () => {
  const db = new MemoryDatabase(); await appendFoodProductionBatchVersion(db, fixture());
  for (const call of db.calls) {
    assert.match(call.sql, /food_production_batches/);
    assert.doesNotMatch(call.sql, /\bUPDATE\b|\bDELETE\b|\bUPSERT\b|ORDER BY/i);
    const tables = [...call.sql.matchAll(/(?:FROM|INTO)\s+(\w+)/g)].map(match => match[1]);
    assert.deepEqual(tables, ["food_production_batches"]);
  }
  const source = await readFile(new URL("./d1-production-batch-persistence.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /food_sku_capacity_sources|food_capacity_reservations|food_capacity_reservation_lines|food_fulfillment_slot_reservations|checkoutReady|paymentReady|Stripe|Square|PayPal|fetch\s*\(|process\.env|\bUPDATE\b|\bDELETE\b/);
});

test("migration 0004 defines immutable physical schema only; never executed", async () => {
  const sql = (await readFile(new URL("../../../migrations/food/0004_food_physical_inventory.sql", import.meta.url), "utf8")).replace(/\r\n/g, "\n");
  assert.match(sql, /^PRAGMA foreign_keys = ON;/);
  assert.deepEqual([...sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map(match => match[1]), ["food_production_batches", "food_physical_inventory_movements"]);
  assert.match(sql, /PRIMARY KEY\s*\(batch_id, version\)/);
  assert.match(sql, /FOREIGN KEY\s*\(batch_id, batch_version\)\s*REFERENCES food_production_batches\s*\(batch_id, version\)/);
  for (const table of ["food_production_batches", "food_physical_inventory_movements"]) {
    for (const action of ["UPDATE", "DELETE"]) {
      assert(sql.includes(`CREATE TRIGGER IF NOT EXISTS ${table}_no_${action.toLowerCase()}\nBEFORE ${action} ON ${table}`));
    }
  }
  assert.equal((sql.match(/SELECT RAISE\(ABORT,/g) ?? []).length, 4);
  assert(sql.includes("food production batches are immutable"));
  assert(sql.includes("food physical inventory movements are immutable"));
  for (const column of ["version", "sku_version", "produced_package_count", "batch_version", "package_count"]) {
    assert(sql.includes(`typeof(${column}) = 'integer' AND ${column} >= 1 AND ${column} <= 9007199254740991`));
  }
  assert.match(sql, /storage_mode IN \('refrigerated', 'frozen', 'room-temperature'\)/);
  assert.match(sql, /movement_type IN \('adjustment-in', 'adjustment-out', 'waste'\)/);
  assert.match(sql, /storage_mode = 'frozen' AND frozen_on IS NOT NULL/);
  assert.match(sql, /storage_mode != 'frozen' AND frozen_on IS NULL/);
  for (const column of ["prepared_on", "frozen_on", "occurred_on"]) {
    assert(sql.includes(`length(${column}) = 10 AND ${column} GLOB`));
  }
  for (const column of ["movement_id", "batch_id", "sku_id", "batch_code", "attribution", "source_reference"]) {
    assert(sql.includes(`length(${column}) >= 1 AND length(${column}) <= 512`));
  }
  assert.doesNotMatch(sql, /quantity_on_hand|available_quantity|available_units|reserved_quantity|sold_quantity|current_quantity|food_sku_capacity_sources|food_capacity_reservations|food_capacity_reservation_lines|food_fulfillment_slot_reservations|INSERT INTO/);
});
