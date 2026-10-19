import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readFoodLatestExactSkuStockedCapacitySourceRevision as read } from "./d1-latest-exact-sku-stocked-capacity-source-read";
import type { FoodExactSkuStockedCapacitySourceReadD1Database, FoodExactSkuStockedCapacitySourceReadD1Statement, FoodExactSkuStockedCapacitySourceReadD1Result } from "./d1-exact-sku-stocked-capacity-source-read";

function selector() { return { sku: { id: "food-sku:007g", version: 2 } }; }
function row(revision = 1) { return { sku_id: selector().sku.id, sku_version: 2, revision,
  capacity_units: 10, attribution: "synthetic:writer", source_reference: "opaque:unverified" }; }
type Row = ReturnType<typeof row>;
class Database implements FoodExactSkuStockedCapacitySourceReadD1Database {
  calls = 0;
  reads = 0;
  sql = "";
  bound: readonly (string | number)[] = [];
  response?: unknown;
  fail?: "prepare" | "bind" | "all";
  onPrepare?: () => void;
  onRead?: () => Promise<void>;
  constructor(readonly rows: Row[] = [row()]) {}
  prepare(sql: string): FoodExactSkuStockedCapacitySourceReadD1Statement {
    this.calls++; this.sql = sql; this.onPrepare?.();
    if (this.fail === "prepare") throw new Error("synthetic prepare");
    const statement: FoodExactSkuStockedCapacitySourceReadD1Statement = {
      bind: (...values) => { this.bound = values; if (this.fail === "bind") throw new Error("synthetic bind"); return statement; },
      all: async <T>() => {
        this.reads++;
        if (this.fail === "all") throw new Error("synthetic all");
        await this.onRead?.();
        if (this.response !== undefined) return this.response as FoodExactSkuStockedCapacitySourceReadD1Result<T>;
        // Model exact WHERE, descending revision order and LIMIT 1, including
        // malformed highest payloads: never filter by domain validity here.
        const matches = this.rows.filter(r => r.sku_id === this.bound[0] && r.sku_version === this.bound[1])
          .sort((a, b) => b.revision - a.revision).slice(0, 1);
        const response: unknown = { success: true, results: matches };
        return response as FoodExactSkuStockedCapacitySourceReadD1Result<T>;
      },
    };
    return statement;
  }
}
function frozen(value: unknown): void {
  if (value && typeof value === "object") { assert.ok(Object.isFrozen(value)); Object.values(value).forEach(frozen); }
}
function record(value: unknown): Record<PropertyKey, unknown> { return value as Record<PropertyKey, unknown>; }
async function invalid(input: unknown) {
  const db = new Database(); const result = await read(db, input);
  assert.deepEqual(result, { outcome: "invalid" }); frozen(result); assert.equal(db.calls, 0);
}
for (const revisions of [[1], [1, 2], [2, 1, 3]]) {
  test(`007G highest of ${revisions} preserves exact metadata and narrow output`, async () => {
    const db = new Database(revisions.map(row)); const input = selector();
    const result = await read(db, input); assert.equal(result.outcome, "found");
    if (result.outcome !== "found") throw new Error("expected found");
    assert.deepEqual(result.value, { kind: "exact-sku-stocked-capacity-source", sku: input.sku,
      revision: Math.max(...revisions), capacityUnits: 10, attribution: "synthetic:writer", sourceReference: "opaque:unverified" });
    frozen(result); assert.equal(db.calls, 1); assert.equal(db.reads, 1);
    assert.ok(!Object.isFrozen(input)); assert.ok(!Object.isFrozen(db.rows[0]));
  });
}
for (const capacity of [0, Number.MAX_SAFE_INTEGER]) test(`007G capacity ${capacity} and maximum revision preserved`, async () => {
  const stored = { ...row(Number.MAX_SAFE_INTEGER), capacity_units: capacity };
  const result = await read(new Database([stored]), selector()); assert.equal(result.outcome, "found");
  if (result.outcome === "found") { assert.equal(result.value.capacityUnits, capacity); assert.equal(result.value.revision, Number.MAX_SAFE_INTEGER); }
});
test("007G isolates exact SKU id/version from unrelated higher revisions", async () => {
  const db = new Database([{ ...row(99), sku_id: "food-sku:other" }, { ...row(100), sku_version: 3 }, row(1), row(2)]);
  const result = await read(db, selector()); assert.equal(result.outcome, "found");
  if (result.outcome === "found") assert.equal(result.value.revision, 2);
});
test("007G absence is only zero rows in valid exact stream", async () => {
  const db = new Database([{ ...row(5), sku_version: 3 }]);
  const result = await read(db, selector()); assert.deepEqual(result, { outcome: "not-found" }); frozen(result);
  assert.equal(db.calls, 1); assert.equal(db.reads, 1);
});
for (const root of [null, undefined, [], true, 5, "selector", {}, { sku: null }, { sku: [] }, { sku: {} }]) {
  test(`007G invalid root ${JSON.stringify(root)} zero DB`, () => invalid(root));
}
for (const field of ["revision", "capacityUnits", "attribution", "sourceReference", "latest", "current", "fresh", "governing", "eligible", "trusted", "available", "remaining", "reservable", "atp", "request", "reservation"]) {
  for (const level of ["root", "sku"]) test(`007G rejects injected ${field} on ${level}`, async () => {
    const input = selector(); record(level === "root" ? input : input.sku)[field] = true; await invalid(input);
  });
}
for (const field of ["id", "version"]) for (const defect of ["missing", "accessor", "inherited"]) {
  test(`007G sku ${field} ${defect} zero DB without getter invocation`, async () => {
    const input = selector(); const target = record(input.sku); let calls = 0;
    if (defect === "missing") delete target[field];
    if (defect === "accessor") Object.defineProperty(target, field, { get() { calls++; return null; } });
    if (defect === "inherited") { const value = target[field]; delete target[field]; Object.setPrototypeOf(target, { [field]: value }); }
    await invalid(input); assert.equal(calls, 0);
  });
}
for (const level of ["root", "sku"]) test(`007G symbol on ${level} zero DB`, async () => {
  const input = selector(); record(level === "root" ? input : input.sku)[Symbol("extra")] = true; await invalid(input);
});
test("007G root inherited/accessor sku rejected without invocation", async () => {
  await invalid(Object.create({ sku: selector().sku }));
  let calls = 0; await invalid(Object.defineProperty({}, "sku", { get() { calls++; return selector().sku; } })); assert.equal(calls, 0);
});
for (const id of ["wrong", " food-sku:007g", "food-sku:007g ", "", null, 4]) test(`007G invalid id ${String(id)}`, async () => {
  const input = selector(); record(input.sku).id = id; await invalid(input);
});
for (const version of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "2", null, undefined, NaN, Infinity]) test(`007G invalid version ${String(version)}`, async () => {
  const input = selector(); record(input.sku).version = version; await invalid(input);
});
const badFields: Record<string, unknown[]> = {
  revision: [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "3", null, undefined, NaN, Infinity],
  capacity_units: [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, "10", null, undefined, NaN, Infinity],
  attribution: ["", " padded", "padded ", "x".repeat(513), null, 5],
  source_reference: ["", " padded", "padded ", "x".repeat(513), null, 5],
  sku_id: ["food-sku:other", "wrong"], sku_version: [3, 0],
};
for (const [field, values] of Object.entries(badFields)) for (const [index, value] of values.entries()) {
  test(`007G malformed highest ${field} case ${index} never falls back`, async () => {
    const malformed = row(3); record(malformed)[field] = value;
    const db = new Database([row(1), row(2)]);
    // Return the selected highest row directly, so malformed identity/numeric
    // fields cannot be hidden by the mock's selector/order implementation.
    db.response = { success: true, results: [malformed] };
    assert.deepEqual(await read(db, selector()), { outcome: "storage-failure" });
    assert.equal(db.calls, 1); assert.equal(db.reads, 1);
  });
}
test("007G real multi-history mock returns malformed highest rather than older valid rows", async () => {
  const db = new Database([row(1), row(2), { ...row(3), attribution: "" }]);
  assert.deepEqual(await read(db, selector()), { outcome: "storage-failure" }); assert.equal(db.reads, 1);
});
for (const response of [null, false, {}, { results: [] }, { success: false, results: [] }, { success: true, results: null }, { success: true, results: [row(), row(2)] }, { success: true, results: [null] }, { success: true, results: [{}] }]) {
  test(`007G bad envelope ${JSON.stringify(response)} never becomes absence`, async () => {
    const db = new Database(); db.response = response;
    assert.deepEqual(await read(db, selector()), { outcome: "storage-failure" }); assert.equal(db.calls, 1);
  });
}
for (const fail of ["prepare", "bind", "all"] as const) test(`007G ${fail} exception fails closed`, async () => {
  const db = new Database(); db.fail = fail;
  assert.deepEqual(await read(db, selector()), { outcome: "storage-failure" }); assert.equal(db.calls, 1);
});
test("007G strict own-data stored row rejects extra symbols inherited fields and getters", async () => {
  for (const defect of ["extra", "symbol", "inherited", "accessor"]) {
    const stored = row(); let calls = 0;
    if (defect === "extra") record(stored).extra = true;
    if (defect === "symbol") record(stored)[Symbol("extra")] = true;
    if (defect === "inherited") { delete record(stored).revision; Object.setPrototypeOf(stored, { revision: 1 }); }
    if (defect === "accessor") Object.defineProperty(stored, "revision", { get() { calls++; return 1; } });
    const db = new Database(); db.response = { success: true, results: [stored] };
    assert.deepEqual(await read(db, selector()), { outcome: "storage-failure" }); assert.equal(calls, 0);
  }
});
test("007G one bound descending LIMIT 1 query with no unrelated resources or writes", async () => {
  const db = new Database(); await read(db, selector());
  assert.equal(db.calls, 1); assert.equal(db.reads, 1); assert.deepEqual(db.bound, [selector().sku.id, 2]);
  assert.match(db.sql, /SELECT sku_id, sku_version, revision, capacity_units, attribution, source_reference/);
  assert.match(db.sql, /FROM food_sku_capacity_sources\s+WHERE sku_id = \? AND sku_version = \?\s+ORDER BY revision DESC\s+LIMIT 1$/);
  assert.doesNotMatch(db.sql, /LIMIT 2|AND revision =|reservation|slot|movement|physical_count|INSERT|UPDATE|DELETE/i);
});
test("007G captures selector before prepare and detaches input/storage through pending read", async () => {
  const input = selector(); const stored = row(); const db = new Database([stored]);
  let release!: () => void; const pending = new Promise<void>(r => { release = r; });
  db.onPrepare = () => { input.sku.id = "food-sku:changed"; input.sku.version = 99; };
  db.onRead = () => pending;
  const operation = read(db, input); input.sku = { id: "food-sku:later", version: 88 }; release();
  const result = await operation; assert.equal(result.outcome, "found");
  assert.deepEqual(db.bound, [selector().sku.id, 2]);
  if (result.outcome === "found") assert.deepEqual(result.value.sku, selector().sku);
  const expected = structuredClone(result); stored.capacity_units = 999; stored.source_reference = "changed";
  assert.deepEqual(result, expected); frozen(result);
  assert.ok(!Object.isFrozen(input)); assert.ok(!Object.isFrozen(input.sku)); assert.ok(!Object.isFrozen(stored));
});
test("007G spec and source preserve read-only non-authority and private-helper separation", () => {
  const source = readFileSync(new URL("./d1-latest-exact-sku-stocked-capacity-source-read.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /persistence|readLatest\(|reservation-acceptance|Date\.now|new Date|fetch\s*\(|process\.env|Math\.random|randomUUID|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\.batch\(/);
  const spec = JSON.parse(readFileSync(new URL("../../../.river-dev/specifications/food-007g-exact-sku-stocked-capacity-source-latest-recorded-read.json", import.meta.url), "utf8"));
  assert.equal(spec.id, "FOOD-007G"); assert.equal(spec.query.limit, 1); assert.equal(spec.database.writes, 0);
});
