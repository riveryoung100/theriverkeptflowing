import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createFoodSkuId } from "./package-sku-domain";
import {
  FOOD_EXACT_SKU_STOCKED_CAPACITY_SOURCE_KIND,
} from "./exact-sku-stocked-capacity-source-domain";
import {
  readFoodExactSkuStockedCapacitySourceRevision as read,
  type FoodExactSkuStockedCapacitySourceReadD1Database,
  type FoodExactSkuStockedCapacitySourceReadD1Statement,
  type FoodExactSkuStockedCapacitySourceReadD1Result,
} from "./d1-exact-sku-stocked-capacity-source-read";

function selector() {
  return { sku: { id: createFoodSkuId("007c-test"), version: 2 }, revision: 3 };
}

function row() {
  return { sku_id: selector().sku.id, sku_version: 2, revision: 3,
    capacity_units: 16, attribution: "synthetic:007c", source_reference: "synthetic:evidence" };
}

class Database implements FoodExactSkuStockedCapacitySourceReadD1Database {
  prepares = 0;
  binds = 0;
  reads = 0;
  sql = "";
  bound: readonly (string | number)[] = [];
  response: unknown = { success: true, results: [row()] };
  fail: "prepare" | "bind" | "all" | undefined;
  onPrepare?: () => void;
  onRead?: () => Promise<void>;

  prepare(sql: string): FoodExactSkuStockedCapacitySourceReadD1Statement {
    this.prepares++;
    this.sql = sql;
    this.onPrepare?.();
    if (this.fail === "prepare") throw new Error("synthetic prepare failure");
    const statement: FoodExactSkuStockedCapacitySourceReadD1Statement = {
      bind: (...values) => {
        this.binds++;
        this.bound = values;
        if (this.fail === "bind") throw new Error("synthetic bind failure");
        return statement;
      },
      all: async <T>() => {
        this.reads++;
        if (this.fail === "all") throw new Error("synthetic read failure");
        await this.onRead?.();
        return this.response as FoodExactSkuStockedCapacitySourceReadD1Result<T>;
      },
    };
    return statement;
  }
}

test("007C exact found returns detached frozen historical evidence", async () => {
  const database = new Database();
  const stored = row();
  database.response = { success: true, results: [stored] };
  const result = await read(database, selector());
  assert.deepEqual(result, { outcome: "found", value: {
    kind: FOOD_EXACT_SKU_STOCKED_CAPACITY_SOURCE_KIND,
    sku: selector().sku, revision: 3, capacityUnits: 16,
    attribution: stored.attribution, sourceReference: stored.source_reference,
  } });
  assert.ok(Object.isFrozen(result));
  if (result.outcome !== "found") throw new Error("expected found");
  assert.ok(Object.isFrozen(result.value));
  assert.ok(Object.isFrozen(result.value.sku));
  stored.capacity_units = 90;
  stored.attribution = "changed";
  assert.equal(result.value.capacityUnits, 16);
  assert.equal(result.value.attribution, "synthetic:007c");
  assert.deepEqual(Object.keys(result).sort(), ["outcome", "value"]);
  assert.deepEqual(Object.keys(result.value).sort(),
    ["kind", "sku", "revision", "capacityUnits", "attribution", "sourceReference"].sort());
});

for (const capacity of [0, Number.MAX_SAFE_INTEGER]) {
  test(`007C preserves capacity ${capacity}`, async () => {
    const database = new Database();
    database.response = { success: true, results: [{ ...row(), capacity_units: capacity }] };
    const result = await read(database, selector());
    assert.equal(result.outcome, "found");
    if (result.outcome === "found") assert.equal(result.value.capacityUnits, capacity);
  });
}

test("007C maximum safe version and revision need no continuity lookup", async () => {
  const database = new Database();
  const maximum = Number.MAX_SAFE_INTEGER;
  database.response = { success: true, results: [{ ...row(), sku_version: maximum, revision: maximum }] };
  const result = await read(database, { sku: { ...selector().sku, version: maximum }, revision: maximum });
  assert.equal(result.outcome, "found");
  assert.equal(database.reads, 1);
  assert.deepEqual(database.bound, [selector().sku.id, maximum, maximum]);
});

test("007C zero rows is explicit frozen not-found", async () => {
  const database = new Database();
  database.response = { success: true, results: [] };
  const result = await read(database, selector());
  assert.deepEqual(result, { outcome: "not-found" });
  assert.ok(Object.isFrozen(result));
  assert.equal(database.reads, 1);
});

for (const field of ["sku_id", "sku_version", "revision"] as const) {
  test(`007C wrong returned ${field} fails closed`, async () => {
    const database = new Database();
    const mismatch = { ...row(), [field]: field === "sku_id" ? createFoodSkuId("other") : 8 };
    database.response = { success: true, results: [mismatch] };
    assert.deepEqual(await read(database, selector()), { outcome: "storage-failure" });
    assert.equal(database.reads, 1);
    assert.deepEqual(database.bound, [selector().sku.id, 2, 3]);
  });
}

test("007C filtered lookup does not substitute other SKU version or revision", async () => {
  for (const other of [
    { ...row(), sku_id: createFoodSkuId("other") },
    { ...row(), sku_version: 1 }, { ...row(), revision: 2 },
  ]) {
    const database = new Database();
    database.onRead = async () => {
      const [id, version, revision] = database.bound;
      database.response = { success: true, results: [other].filter(r =>
        r.sku_id === id && r.sku_version === version && r.revision === revision) };
    };
    assert.deepEqual(await read(database, selector()), { outcome: "not-found" });
    assert.equal(database.reads, 1);
  }
});

const invalidSelectors: unknown[] = [
  null, undefined, [], true, "selector", {}, { sku: selector().sku }, { revision: 3 },
  { ...selector(), extra: true }, { ...selector(), sku: { ...selector().sku, extra: true } },
  { ...selector(), sku: { id: "malformed", version: 2 } },
  { ...selector(), sku: { version: 2 } }, { ...selector(), sku: { id: selector().sku.id } },
  { ...selector(), sku: null }, { ...selector(), sku: [] },
  { ...selector(), [Symbol("hidden")]: true },
  { ...selector(), sku: { ...selector().sku, [Symbol("hidden")]: true } },
  Object.create(selector()), { ...selector(), sku: Object.create(selector().sku) },
  Object.defineProperty(selector(), "hidden", { value: true }),
  { ...selector(), sku: Object.defineProperty(selector().sku, "hidden", { value: true }) },
];
for (const bad of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "2", NaN, Infinity, null, undefined]) {
  invalidSelectors.push({ ...selector(), revision: bad });
  invalidSelectors.push({ ...selector(), sku: { ...selector().sku, version: bad } });
}
for (const [index, input] of invalidSelectors.entries()) {
  test(`007C invalid selector ${index} performs zero DB access`, async () => {
    const database = new Database();
    const result = await read(database, input);
    assert.deepEqual(result, { outcome: "invalid" });
    assert.ok(Object.isFrozen(result));
    assert.equal(database.prepares, 0);
    assert.equal(database.binds, 0);
    assert.equal(database.reads, 0);
  });
}

test("007C rejects selector accessors without invoking them", async () => {
  let calls = 0;
  for (const field of ["sku", "revision", "id", "version"]) {
    const input = selector();
    Object.defineProperty(field === "id" || field === "version" ? input.sku : input,
      field, { get() { calls++; throw new Error("must not run"); } });
    const database = new Database();
    assert.deepEqual(await read(database, input), { outcome: "invalid" });
    assert.equal(database.prepares, 0);
  }
  assert.equal(calls, 0);
});

test("007C captures selector before prepare and preserves caller ownership", async () => {
  const input = selector();
  const database = new Database();
  database.onPrepare = () => {
    input.sku.id = createFoodSkuId("mutated");
    input.sku.version = 9;
    input.revision = 9;
  };
  assert.equal((await read(database, input)).outcome, "found");
  assert.deepEqual(database.bound, [selector().sku.id, 2, 3]);
  assert.ok(!Object.isFrozen(input));
  assert.ok(!Object.isFrozen(input.sku));
});

test("007C selector remains detached during pending read", async () => {
  const database = new Database();
  let finish!: () => void;
  database.onRead = () => new Promise<void>(resolve => { finish = resolve; });
  const input = selector();
  const pending = read(database, input);
  input.sku.version = 99;
  input.revision = 99;
  finish();
  assert.equal((await pending).outcome, "found");
  assert.deepEqual(database.bound, [selector().sku.id, 2, 3]);
});

const invalidResponses: unknown[] = [
  null, undefined, [], "result", {}, { success: true },
  { success: false, results: [] }, { success: false, results: [row()] },
  { results: [row()] }, { success: "true", results: [row()] },
  { success: true, results: null }, { success: true, results: {} },
  { success: true, results: [row(), row()] },
];
for (const [index, response] of invalidResponses.entries()) {
  test(`007C malformed result ${index} fails closed without retry`, async () => {
    const database = new Database();
    database.response = response;
    const result = await read(database, selector());
    assert.deepEqual(result, { outcome: "storage-failure" });
    assert.ok(Object.isFrozen(result));
    assert.equal(database.prepares, 1);
    assert.equal(database.reads, 1);
  });
}

const invalidRows: unknown[] = [null, undefined, [], {},
  { ...row(), sku_id: "malformed" }, { ...row(), sku_version: 0 }, { ...row(), revision: 0 }];
for (const capacity of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, "16", NaN, Infinity, null, undefined]) {
  invalidRows.push({ ...row(), capacity_units: capacity });
}
for (const field of ["attribution", "source_reference"]) {
  for (const text of ["", " padded", "padded ", "x".repeat(513), 5, null, undefined]) {
    invalidRows.push({ ...row(), [field]: text });
  }
}
invalidRows.push(Object.defineProperty(row(), "capacity_units", { get() { throw new Error("bad row"); } }));
for (const [index, stored] of invalidRows.entries()) {
  test(`007C malformed stored row ${index} fails closed`, async () => {
    const database = new Database();
    database.response = { success: true, results: [stored] };
    assert.deepEqual(await read(database, selector()), { outcome: "storage-failure" });
    assert.equal(database.reads, 1);
  });
}

for (const fail of ["prepare", "bind", "all"] as const) {
  test(`007C ${fail} exception is storage-failure without fallback`, async () => {
    const database = new Database();
    database.fail = fail;
    assert.deepEqual(await read(database, selector()), { outcome: "storage-failure" });
    assert.equal(database.prepares, 1);
    assert.equal(database.binds, fail === "prepare" ? 0 : 1);
    assert.equal(database.reads, fail === "all" ? 1 : 0);
  });
}

test("007C executes one bound exact six-column SELECT only", async () => {
  const database = new Database();
  await read(database, selector());
  assert.equal(database.sql.replace(/\s+/g, " ").trim(),
    "SELECT sku_id, sku_version, revision, capacity_units, attribution, source_reference FROM food_sku_capacity_sources WHERE sku_id = ? AND sku_version = ? AND revision = ? LIMIT 2");
  assert.deepEqual(database.bound, [selector().sku.id, 2, 3]);
  assert.equal(database.prepares, 1);
  assert.equal(database.binds, 1);
  assert.equal(database.reads, 1);
});

test("007C source preserves read-only evidence and side-effect boundaries", async () => {
  const source = await readFile(new URL("./d1-exact-sku-stocked-capacity-source-read.ts", import.meta.url), "utf8");
  assert.match(source, /validateFoodExactSkuStockedCapacitySourceRevision/);
  assert.equal((source.match(/\.all</g) ?? []).length, 1);
  assert.doesNotMatch(source, /\bINSERT\s+INTO\b|\bUPDATE\b|\bDELETE\s+FROM\b|ORDER\s+BY|\bMAX\s*\(/i);
  assert.doesNotMatch(source, /food_capacity_reservations|food_capacity_reservation_lines|food_fulfillment_slot_reservations|food_physical_inventory|food_inventory_evidence/);
  assert.doesNotMatch(source, /Date\.now|new Date|Math\.random|crypto\.randomUUID|fetch\s*\(|process\.env|withSession|deriveFoodExactSkuStockedCapacitySourceCandidate/);
  assert.doesNotMatch(source, /\b(?:available|reservable|remaining|atp|orderable|current|active|held)\s*:/i);
});
