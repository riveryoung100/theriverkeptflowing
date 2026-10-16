import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  FOOD_FULFILLMENT_SLOT_CAPACITY_SOURCE_KIND,
} from "./fulfillment-slot-capacity-source-domain";
import {
  readFoodExactFulfillmentSlotCapacitySourceRevision as read,
  type FoodExactFulfillmentSlotCapacitySourceReadD1Database,
  type FoodExactFulfillmentSlotCapacitySourceReadD1Statement,
  type FoodExactFulfillmentSlotCapacitySourceReadD1Result,
} from "./d1-exact-fulfillment-slot-capacity-source-read";

function selector() {
  return { method: "personal-delivery", locationReference: "synthetic:location",
    windowReference: "synthetic:window", revision: 3 };
}

function row() {
  return { method: selector().method, location_reference: selector().locationReference,
    window_reference: selector().windowReference, revision: 3, capacity_units: 16,
    attribution: "synthetic:007d", source_reference: "synthetic:evidence" };
}

class Database implements FoodExactFulfillmentSlotCapacitySourceReadD1Database {
  prepares = 0;
  binds = 0;
  reads = 0;
  sql = "";
  bound: readonly (string | number)[] = [];
  response: unknown = { success: true, results: [row()] };
  fail: "prepare" | "bind" | "all" | undefined;
  onPrepare?: () => void;
  onRead?: () => Promise<void>;

  prepare(sql: string): FoodExactFulfillmentSlotCapacitySourceReadD1Statement {
    this.prepares++;
    this.sql = sql;
    this.onPrepare?.();
    if (this.fail === "prepare") throw new Error("synthetic prepare failure");
    const statement: FoodExactFulfillmentSlotCapacitySourceReadD1Statement = {
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
        return this.response as FoodExactFulfillmentSlotCapacitySourceReadD1Result<T>;
      },
    };
    return statement;
  }
}

test("007D exact found is canonical detached frozen evidence", async () => {
  const database = new Database();
  const stored = row();
  database.response = { success: true, results: [stored] };
  const result = await read(database, selector());
  assert.deepEqual(result, { outcome: "found", value: {
    kind: FOOD_FULFILLMENT_SLOT_CAPACITY_SOURCE_KIND, ...selector(), capacityUnits: 16,
    attribution: stored.attribution, sourceReference: stored.source_reference,
  } });
  assert.ok(Object.isFrozen(result));
  if (result.outcome !== "found") throw new Error("expected found");
  assert.ok(Object.isFrozen(result.value));
  stored.capacity_units = 90;
  stored.attribution = "changed";
  assert.equal(result.value.capacityUnits, 16);
  assert.equal(result.value.attribution, "synthetic:007d");
  assert.deepEqual(Object.keys(result).sort(), ["outcome", "value"]);
  assert.deepEqual(Object.keys(result.value).sort(),
    ["kind", "method", "locationReference", "windowReference", "revision", "capacityUnits", "attribution", "sourceReference"].sort());
});

for (const method of ["personal-delivery", "meetup"]) {
  test(`007D supports exact method ${method}`, async () => {
    const database = new Database();
    database.response = { success: true, results: [{ ...row(), method }] };
    assert.equal((await read(database, { ...selector(), method })).outcome, "found");
  });
}

for (const capacity of [0, Number.MAX_SAFE_INTEGER]) {
  test(`007D preserves capacity ${capacity}`, async () => {
    const database = new Database();
    database.response = { success: true, results: [{ ...row(), capacity_units: capacity }] };
    const result = await read(database, selector());
    assert.equal(result.outcome, "found");
    if (result.outcome === "found") assert.equal(result.value.capacityUnits, capacity);
  });
}

test("007D maximum revision and reference lengths need no continuity lookup", async () => {
  const database = new Database();
  const input = { ...selector(), revision: Number.MAX_SAFE_INTEGER,
    locationReference: "x".repeat(512), windowReference: "y".repeat(512) };
  database.response = { success: true, results: [{ ...row(), revision: input.revision,
    location_reference: input.locationReference, window_reference: input.windowReference }] };
  assert.equal((await read(database, input)).outcome, "found");
  assert.equal(database.reads, 1);
});

test("007D zero rows is explicit frozen not-found", async () => {
  const database = new Database();
  database.response = { success: true, results: [] };
  const result = await read(database, selector());
  assert.deepEqual(result, { outcome: "not-found" });
  assert.ok(Object.isFrozen(result));
  assert.equal(database.reads, 1);
});

const mismatches = [
  { method: "meetup" }, { location_reference: "other" },
  { window_reference: "other" }, { revision: 4 },
];
for (const [index, mismatch] of mismatches.entries()) {
  test(`007D wrong returned identity ${index} fails closed`, async () => {
    const database = new Database();
    database.response = { success: true, results: [{ ...row(), ...mismatch }] };
    assert.deepEqual(await read(database, selector()), { outcome: "storage-failure" });
    assert.equal(database.reads, 1);
  });
}
test("007D meetup cannot accept returned personal-delivery", async () => {
  assert.deepEqual(await read(new Database(), { ...selector(), method: "meetup" }), { outcome: "storage-failure" });
});

test("007D filtered lookup isolates all four identity fields", async () => {
  for (const mismatch of mismatches) {
    const database = new Database();
    const other = { ...row(), ...mismatch };
    database.onRead = async () => {
      const [method, location, window, revision] = database.bound;
      database.response = { success: true, results: [other].filter(r =>
        r.method === method && r.location_reference === location && r.window_reference === window && r.revision === revision) };
    };
    assert.deepEqual(await read(database, selector()), { outcome: "not-found" });
    assert.equal(database.reads, 1);
  }
});

const invalidSelectors: unknown[] = [null, undefined, [], true, "selector", {},
  { ...selector(), extra: true }, { ...selector(), [Symbol("hidden")]: true },
  Object.create(selector()), Object.defineProperty(selector(), "hidden", { value: true })];
for (const field of Object.keys(selector())) {
  const input: Record<string, unknown> = selector();
  delete input[field];
  invalidSelectors.push(input);
}
for (const method of ["pickup", "shipping", "", " meetup", null, undefined, 5]) invalidSelectors.push({ ...selector(), method });
for (const field of ["locationReference", "windowReference"]) {
  for (const value of ["", " padded", "padded ", "x".repeat(513), 5, null, undefined]) {
    invalidSelectors.push({ ...selector(), [field]: value });
  }
}
for (const revision of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "3", NaN, Infinity, null, undefined]) {
  invalidSelectors.push({ ...selector(), revision });
}
for (const [index, input] of invalidSelectors.entries()) {
  test(`007D invalid selector ${index} performs zero DB access`, async () => {
    const database = new Database();
    const result = await read(database, input);
    assert.deepEqual(result, { outcome: "invalid" });
    assert.ok(Object.isFrozen(result));
    assert.equal(database.prepares, 0);
    assert.equal(database.binds, 0);
    assert.equal(database.reads, 0);
  });
}

test("007D rejects selector accessors without invoking them", async () => {
  let calls = 0;
  for (const field of Object.keys(selector())) {
    const input = selector();
    Object.defineProperty(input, field, { get() { calls++; throw new Error("must not run"); } });
    const database = new Database();
    assert.deepEqual(await read(database, input), { outcome: "invalid" });
    assert.equal(database.prepares, 0);
  }
  assert.equal(calls, 0);
});

test("007D captures selector before prepare without freezing caller", async () => {
  const input = selector();
  const database = new Database();
  database.onPrepare = () => {
    input.method = "meetup"; input.locationReference = "changed";
    input.windowReference = "changed"; input.revision = 9;
  };
  assert.equal((await read(database, input)).outcome, "found");
  assert.deepEqual(database.bound, Object.values(selector()));
  assert.ok(!Object.isFrozen(input));
});

test("007D selector remains detached during pending read", async () => {
  const database = new Database();
  let finish!: () => void;
  database.onRead = () => new Promise<void>(resolve => { finish = resolve; });
  const input = selector();
  const pending = read(database, input);
  input.method = "meetup"; input.locationReference = "changed";
  input.windowReference = "changed"; input.revision = 99;
  finish();
  assert.equal((await pending).outcome, "found");
  assert.deepEqual(database.bound, Object.values(selector()));
});

const invalidResponses: unknown[] = [null, undefined, [], "result", {}, { success: true },
  { success: false, results: [] }, { success: false, results: [row()] },
  { results: [row()] }, { success: "true", results: [row()] },
  { success: true, results: null }, { success: true, results: {} },
  { success: true, results: [row(), row()] }];
for (const [index, response] of invalidResponses.entries()) {
  test(`007D malformed result ${index} fails closed without retry`, async () => {
    const database = new Database(); database.response = response;
    const result = await read(database, selector());
    assert.deepEqual(result, { outcome: "storage-failure" });
    assert.ok(Object.isFrozen(result));
    assert.equal(database.prepares, 1); assert.equal(database.reads, 1);
  });
}

const invalidRows: unknown[] = [null, undefined, [], {}, { ...row(), method: "pickup" }];
for (const revision of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "3", NaN, Infinity]) invalidRows.push({ ...row(), revision });
for (const capacity of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, "16", NaN, Infinity, null, undefined]) invalidRows.push({ ...row(), capacity_units: capacity });
for (const field of ["location_reference", "window_reference", "attribution", "source_reference"]) {
  for (const text of ["", " padded", "padded ", "x".repeat(513), 5, null, undefined]) invalidRows.push({ ...row(), [field]: text });
}
invalidRows.push(Object.defineProperty(row(), "capacity_units", { get() { throw new Error("bad row"); } }));
for (const [index, stored] of invalidRows.entries()) {
  test(`007D malformed stored row ${index} fails closed`, async () => {
    const database = new Database(); database.response = { success: true, results: [stored] };
    assert.deepEqual(await read(database, selector()), { outcome: "storage-failure" });
    assert.equal(database.reads, 1);
  });
}

for (const fail of ["prepare", "bind", "all"] as const) {
  test(`007D ${fail} exception is storage-failure without fallback`, async () => {
    const database = new Database(); database.fail = fail;
    assert.deepEqual(await read(database, selector()), { outcome: "storage-failure" });
    assert.equal(database.prepares, 1);
    assert.equal(database.binds, fail === "prepare" ? 0 : 1);
    assert.equal(database.reads, fail === "all" ? 1 : 0);
  });
}

test("007D executes one bound exact seven-column SELECT only", async () => {
  const database = new Database(); await read(database, selector());
  assert.equal(database.sql.replace(/\s+/g, " ").trim(),
    "SELECT method, location_reference, window_reference, revision, capacity_units, attribution, source_reference FROM food_fulfillment_slot_capacity_sources WHERE method = ? AND location_reference = ? AND window_reference = ? AND revision = ? LIMIT 2");
  assert.deepEqual(database.bound, Object.values(selector()));
  assert.equal(database.prepares, 1); assert.equal(database.binds, 1); assert.equal(database.reads, 1);
});

test("007D source preserves read-only evidence and side-effect boundaries", async () => {
  const source = await readFile(new URL("./d1-exact-fulfillment-slot-capacity-source-read.ts", import.meta.url), "utf8");
  assert.match(source, /validateFoodFulfillmentSlotCapacitySourceRevision/);
  assert.equal((source.match(/\.all</g) ?? []).length, 1);
  assert.doesNotMatch(source, /\bINSERT\s+INTO\b|\bUPDATE\b|\bDELETE\s+FROM\b|ORDER\s+BY|\bMAX\s*\(/i);
  assert.doesNotMatch(source, /food_capacity_reservations|food_capacity_reservation_lines|food_fulfillment_slot_reservations|food_physical_inventory|food_inventory_evidence|reservation-acceptance-domain/);
  assert.doesNotMatch(source, /Date\.now|new Date|Math\.random|crypto\.randomUUID|fetch\s*\(|process\.env|withSession/);
  assert.doesNotMatch(source, /\b(?:available|reservable|remaining|atp|orderable|current|latest|active|held)\s*:/i);
});
