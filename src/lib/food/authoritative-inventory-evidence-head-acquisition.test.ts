import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { acquireFoodAuthoritativeInventoryEvidenceHead as acquire } from "./authoritative-inventory-evidence-head-acquisition";
import {
  validateFoodInventoryAtAuthoritativeReadPoint as validate,
  type FoodAuthoritativeInventoryReadPointD1Database,
  type FoodAuthoritativeInventoryReadPointD1Result,
  type FoodAuthoritativeInventoryReadPointD1Statement,
} from "./authoritative-inventory-read-point-validation";

const sku = { id: "food-sku:fixture", version: 2 };
const sql = "SELECT MAX(evidence_sequence) AS evidence_head FROM food_inventory_evidence_sequence WHERE sku_id COLLATE BINARY = ? AND sku_version = ?";
type Stage = "session" | "prepare" | "bind" | "all" | "bookmark";
interface Options {
  result?: unknown;
  bookmark?: unknown;
  fail?: Stage;
  query?: (query: string, bound: readonly unknown[]) => unknown;
}

function fixture(options: Options = {}) {
  const calls: string[] = [];
  const queries: string[] = [];
  let bound: readonly unknown[] = [];
  function step(stage: Stage) {
    calls.push(stage);
    if (options.fail === stage) throw new Error(`synthetic ${stage} failure`);
  }
  const statement: FoodAuthoritativeInventoryReadPointD1Statement = {
    bind(...values: readonly unknown[]) {
      step("bind");
      bound = values;
      return statement;
    },
    async all<T = Record<string, unknown>>(): Promise<FoodAuthoritativeInventoryReadPointD1Result<T>> {
      step("all");
      const result = options.query
        ? options.query(queries[queries.length - 1]!, bound)
        : Object.hasOwn(options, "result") ? options.result : { results: [{ evidence_head: 7 }] };
      // Deliberately exercise malformed runtime storage beyond the static contract.
      return result as FoodAuthoritativeInventoryReadPointD1Result<T>;
    },
  };
  const database: FoodAuthoritativeInventoryReadPointD1Database = {
    withSession(mode) {
      step("session");
      calls.push(`mode:${mode}`);
      return {
        prepare(query) {
          step("prepare");
          queries.push(query);
          return statement;
        },
        getBookmark() {
          step("bookmark");
          return (Object.hasOwn(options, "bookmark") ? options.bookmark : "bookmark:head") as string | null;
        },
      };
    },
  };
  return { database, calls, queries, getBound: () => bound };
}

test("006N1 acquires exact head without an earlier composition and exposes only the narrow frozen shape", async () => {
  const f = fixture();
  const result = await acquire(f.database, { sku });
  assert.deepEqual(result, {
    outcome: "acquired",
    value: { sku, exactSkuEvidenceHead: 7, bookmark: "bookmark:head" },
  });
  assert.deepEqual(f.calls, ["session", "mode:first-primary", "prepare", "bind", "all", "bookmark"]);
  assert.deepEqual(f.queries, [sql]);
  assert.deepEqual(f.getBound(), [sku.id, sku.version]);
  assert.ok(Object.isFrozen(result));
  assert.equal(result.outcome, "acquired");
  if (result.outcome !== "acquired") throw new Error("Expected acquired");
  assert.ok(Object.isFrozen(result.value));
  assert.ok(Object.isFrozen(result.value.sku));
  assert.notEqual(result.value.sku, sku);
  assert.deepEqual(Object.keys(result.value).sort(), ["bookmark", "exactSkuEvidenceHead", "sku"]);
});

const invalidRequests: readonly [string, unknown][] = [
  ["null", null], ["array", []], ["primitive", "sku"], ["empty", {}],
  ["null SKU", { sku: null }], ["array SKU", { sku: [] }], ["missing id", { sku: { version: 1 } }],
  ["missing version", { sku: { id: sku.id } }], ["bad prefix", { sku: { ...sku, id: "bad" } }],
  ["empty local id", { sku: { ...sku, id: "food-sku:" } }],
  ["padded id", { sku: { ...sku, id: " food-sku:x" } }],
  ["overlong id", { sku: { ...sku, id: `food-sku:${"a".repeat(129)}` } }],
  ["nonstring id", { sku: { ...sku, id: 7 } }],
  ...[0, -1, 1.5, "2", NaN, Infinity, Number.MAX_SAFE_INTEGER + 1].map(
    (version): [string, unknown] => [`version ${String(version)}`, { sku: { ...sku, version } }],
  ),
  ...["composedCutoff", "balance", "exactSkuEvidenceHead", "bookmark", "availability"].map(
    (key): [string, unknown] => [`extra ${key}`, { sku, [key]: 0 }],
  ),
  ["extra SKU field", { sku: { ...sku, extra: true } }],
  ["symbol key", { sku, [Symbol("extra")]: true }],
  ["nonenumerable key", Object.defineProperty({ sku }, "extra", { value: true })],
  ["inherited SKU", Object.create({ sku })],
];
for (const [name, input] of invalidRequests) {
  test(`006N1 invalid ${name} fails before session access`, async () => {
    const f = fixture();
    const result = await acquire(f.database, input);
    assert.deepEqual(result, { outcome: "invalid" });
    assert.ok(Object.isFrozen(result));
    assert.deepEqual(f.calls, []);
  });
}

for (const id of ["food-sku:internal space", "food-sku:internal\ttab", "food-sku:é", `food-sku:${"a".repeat(128)}`]) {
  test(`006N1 canonical identifier is preserved: ${JSON.stringify(id)}`, async () => {
    const f = fixture();
    const result = await acquire(f.database, { sku: { id, version: Number.MAX_SAFE_INTEGER } });
    assert.equal(result.outcome, "acquired");
    if (result.outcome !== "acquired") throw new Error("Expected acquired");
    assert.deepEqual(result.value.sku, { id, version: Number.MAX_SAFE_INTEGER });
    assert.deepEqual(f.getBound(), [id, Number.MAX_SAFE_INTEGER]);
  });
}

const heads: readonly [string, unknown, number | undefined][] = [
  ["positive", 7, 7], ["minimum", 1, 1], ["maximum", Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  ["null empty", null, 0], ["own undefined empty", undefined, 0],
  ...[0, -0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "7", true, false, NaN, Infinity, -Infinity, {}, []].map(
    (head, index): [string, unknown, undefined] => [`invalid ${index}`, head, undefined],
  ),
];
for (const [name, head, expected] of heads) {
  test(`006N1 head ${name} matches existing 006N parsing`, async () => {
    const options = { result: { results: [{ evidence_head: head }] } };
    const f = fixture(options);
    const result = await acquire(f.database, { sku });
    const old = await validate(fixture(options).database, { sku, composedCutoff: Number.MAX_SAFE_INTEGER });
    if (expected === undefined) {
      assert.deepEqual(result, { outcome: "storage-failure" });
      assert.deepEqual(old, result);
      assert.ok(!f.calls.includes("bookmark"));
    }
    else {
      assert.equal(result.outcome, "acquired");
      assert.equal(old.outcome, "success");
      if (result.outcome !== "acquired" || old.outcome !== "success") throw new Error("Expected success");
      assert.equal(result.value.exactSkuEvidenceHead, expected);
      assert.deepEqual(result.value.sku, old.value.sku);
      assert.equal(result.value.exactSkuEvidenceHead, old.value.exactSkuEvidenceHead);
      assert.equal(result.value.bookmark, old.value.consistencyToken.bookmark);
    }
  });
}

const malformedResults: readonly [string, unknown][] = [
  ["null", null], ["undefined", undefined], ["missing rows", {}], ["nonarray rows", { results: {} }],
  ["empty rows", { results: [] }], ["two rows", { results: [{ evidence_head: 1 }, { evidence_head: 2 }] }],
  ["null row", { results: [null] }], ["undefined row", { results: [undefined] }],
  ["array row", { results: [[]] }], ["primitive row", { results: [1] }],
  ["missing head", { results: [{}] }], ["inherited head", { results: [Object.create({ evidence_head: 7 })] }],
  ["explicit failure", { success: false, results: [{ evidence_head: 7 }] }],
];
for (const [name, result] of malformedResults) {
  test(`006N1 malformed result ${name} fails closed compatibly without bookmark access`, async () => {
    const f = fixture({ result });
    const actual = await acquire(f.database, { sku });
    assert.deepEqual(actual, { outcome: "storage-failure" });
    assert.ok(Object.isFrozen(actual));
    assert.ok(!f.calls.includes("bookmark"));
    assert.deepEqual(await validate(fixture({ result }).database, { sku, composedCutoff: 7 }), actual);
  });
}

for (const bookmark of [null, undefined, "", 7, {}, Promise.resolve("bookmark")]) {
  test(`006N1 malformed bookmark ${String(bookmark)} returns no partial value`, async () => {
    const f = fixture({ bookmark });
    const result = await acquire(f.database, { sku });
    assert.deepEqual(result, { outcome: "storage-failure" });
    assert.ok(Object.isFrozen(result));
    assert.deepEqual(f.calls.slice(-2), ["all", "bookmark"]);
  });
}
for (const bookmark of [" opaque:é\tanchor ", " "]) {
  test(`006N1 opaque bookmark ${JSON.stringify(bookmark)} is not normalized`, async () => {
    const result = await acquire(fixture({ bookmark }).database, { sku });
    assert.equal(result.outcome, "acquired");
    if (result.outcome !== "acquired") throw new Error("Expected acquired");
    assert.equal(result.value.bookmark, bookmark);
  });
}
for (const fail of ["session", "prepare", "bind", "all", "bookmark"] as const) {
  test(`006N1 ${fail} exception fails closed`, async () => {
    const f = fixture({ fail });
    const result = await acquire(f.database, { sku });
    assert.deepEqual(result, { outcome: "storage-failure" });
    assert.ok(Object.isFrozen(result));
    if (fail !== "bookmark") assert.ok(!f.calls.includes("bookmark"));
  });
}

test("006N1 detaches from caller mutation during await and fixture mutation after return", async () => {
  const input = { sku: { ...sku } };
  const row = { evidence_head: 7 };
  const options = { result: { results: [row] }, bookmark: "original" };
  const f = fixture(options);
  const pending = acquire(f.database, input);
  input.sku.id = "food-sku:changed";
  input.sku.version = 9;
  const result = await pending;
  row.evidence_head = 99;
  options.bookmark = "changed";
  assert.deepEqual(result, { outcome: "acquired", value: { sku, exactSkuEvidenceHead: 7, bookmark: "original" } });
  assert.deepEqual(f.getBound(), [sku.id, sku.version]);
});

test("006N1 exact selector excludes other SKUs/versions and accepts global gaps", async () => {
  const rows = [
    { ...sku, sequence: 10 }, { ...sku, sequence: 14 }, { ...sku, sequence: 97 },
    { id: "food-sku:other", version: sku.version, sequence: 999 },
    { id: sku.id, version: 3, sequence: 1000 },
  ];
  for (const [target, expected] of [[sku, 97], [{ ...sku, version: 3 }, 1000], [{ ...sku, version: 4 }, 0]] as const) {
    const f = fixture({ query(query, bound) {
      assert.equal(query, sql);
      const matching = rows.filter((row) => row.id === bound[0] && row.version === bound[1]);
      return { results: [{ evidence_head: matching.length ? Math.max(...matching.map((row) => row.sequence)) : null }] };
    } });
    const result = await acquire(f.database, { sku: target });
    assert.equal(result.outcome, "acquired");
    if (result.outcome !== "acquired") throw new Error("Expected acquired");
    assert.equal(result.value.exactSkuEvidenceHead, expected);
    assert.deepEqual(result.value.sku, target);
  }
});

for (const [head, cutoff] of [[7, 7], [4, 9], [null, 0], [undefined, 10]] as const) {
  test(`006N regression H=${String(head)} C=${cutoff} remains successful`, async () => {
    const f = fixture({ result: { results: [{ evidence_head: head }] } });
    const result = await validate(f.database, { sku, composedCutoff: cutoff });
    assert.equal(result.outcome, "success");
    assert.equal(f.calls[f.calls.length - 1], "bookmark");
  });
}
test("006N regression H>C stays stale even when bookmark access would throw", async () => {
  const f = fixture({ fail: "bookmark" });
  assert.deepEqual(await validate(f.database, { sku, composedCutoff: 6 }), { outcome: "stale", exactSkuEvidenceHead: 7 });
  assert.ok(!f.calls.includes("bookmark"));
});

test("006N1 source reuses only type dependencies and contains no orchestration or operational behavior", async () => {
  const source = await readFile(new URL("./authoritative-inventory-evidence-head-acquisition.ts", import.meta.url), "utf8");
  assert.match(source, /import type\s*\{[^}]*FoodAuthoritativeInventoryReadPointD1Database[^}]*\}\s*from "\.\/authoritative-inventory-read-point-validation"/);
  assert.doesNotMatch(source, /composedCutoff|\bstale\b|validateFoodInventoryAtAuthoritativeReadPoint|006[IJKLM]|\b(?:INSERT|UPDATE|DELETE|UPSERT|CREATE|ALTER|DROP)\b/);
  assert.doesNotMatch(source, /currentQoh|currentQuantityOnHand|physicalStock|availableToPromise|checkoutReady|paymentReady|Date\b|setTimeout|fetch\(|wrangler|\.exec\(|\.run\(/);
  const imports = [...source.matchAll(/from "([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(imports, ["./package-sku-domain", "./draft-domain", "./authoritative-inventory-read-point-validation"]);
});
