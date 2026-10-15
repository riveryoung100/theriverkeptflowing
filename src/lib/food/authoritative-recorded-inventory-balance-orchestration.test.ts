import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { composeFoodAuthoritativeRecordedInventoryBalance as compose } from "./authoritative-recorded-inventory-balance-orchestration";
import * as acquisitionModule from "./authoritative-inventory-evidence-head-acquisition";
import * as pageModule from "./d1-inventory-evidence-cutoff-bounded-read-persistence";
import * as groupModule from "./lossless-inventory-evidence-grouping";
import * as resolveModule from "./grouped-inventory-evidence-durable-resolution";
import * as balanceModule from "./lossless-inventory-recorded-balance-composition";
import type {
  FoodAuthoritativeInventoryReadPointD1Database,
  FoodAuthoritativeInventoryReadPointD1Session,
  FoodAuthoritativeInventoryReadPointD1Statement,
  FoodAuthoritativeInventoryReadPointD1Result,
} from "./authoritative-inventory-read-point-validation";

const sku = { id: "food-sku:synthetic", version: 2 };
const bookmark = " opaque:original-B ";
type Row = Record<string, unknown>;
function batchRow(local = "a", count = 10): Row {
  return {
    batch_id: `food-production-batch:${local}`, version: 1, sku_id: sku.id, sku_version: sku.version,
    batch_code: "SYN", storage_mode: "refrigerated", produced_package_count: count,
    prepared_on: "2026-10-14", frozen_on: null, attribution: "synthetic:test", source_reference: "synthetic:batch",
  };
}
function movementRow(local: string, batch = "a", count = 1, type = "adjustment-in"): Row {
  return {
    movement_id: `food-physical-inventory-movement:${local}`, batch_id: `food-production-batch:${batch}`,
    batch_version: 1, sku_id: sku.id, sku_version: sku.version, movement_type: type, package_count: count,
    occurred_on: "2026-10-14", attribution: "synthetic:test", source_reference: "synthetic:movement",
  };
}
function batchEvidence(sequence: number, local = "a"): Row {
  return {
    evidence_sequence: sequence, evidence_kind: "production-batch", sku_id: sku.id, sku_version: sku.version,
    batch_id: `food-production-batch:${local}`, batch_version: 1, movement_id: null,
  };
}
function movementEvidence(sequence: number, local: string, batch = "a"): Row {
  return { ...batchEvidence(sequence, batch), evidence_kind: "physical-inventory-movement", movement_id: `food-physical-inventory-movement:${local}` };
}
interface Options {
  head?: unknown;
  ledger?: Row[];
  batches?: Row[];
  movements?: Row[];
  fail?: "primary" | "head" | "bookmark" | "anchor";
  failPage?: number;
  failDurable?: number;
  pageRows?: (page: number, rows: Row[]) => Row[];
}
function fixture(options: Options = {}) {
  const ledger = options.ledger ?? [batchEvidence(10), movementEvidence(14, "m")];
  const batches = options.batches ?? [batchRow()];
  const movements = options.movements ?? [movementRow("m")];
  const calls: { reader: string; sql: string; values: readonly unknown[] }[] = [];
  const modes: (string | undefined)[] = [];
  const events: string[] = [];
  let pageCount = 0, durableCount = 0, rawReads = 0;
  const headRow = { evidence_head: Object.hasOwn(options, "head") ? options.head : 14 };
  function reader(name: "primary" | "anchored"): FoodAuthoritativeInventoryReadPointD1Session {
    return {
      prepare(sql) {
        let values: readonly unknown[] = [];
        const statement: FoodAuthoritativeInventoryReadPointD1Statement = {
          bind(...bound: readonly unknown[]) { values = bound; return statement; },
          async all<T = Record<string, unknown>>(): Promise<FoodAuthoritativeInventoryReadPointD1Result<T>> {
            calls.push({ reader: name, sql, values });
            if (name === "primary") {
              events.push("head");
              assert.match(sql, /MAX\(evidence_sequence\).*WHERE sku_id COLLATE BINARY = \? AND sku_version = \?/);
              assert.deepEqual(values, [sku.id, sku.version]);
              if (options.fail === "head") throw new Error("synthetic head failure");
              return { success: true, results: [headRow] as T[] };
            }
            if (sql.includes("FROM food_inventory_evidence_sequence")) {
              events.push("page"); pageCount++;
              if (options.failPage === pageCount) throw new Error("synthetic page failure");
              const [id, version, after, cutoff, limit] = values as [string, number, number, number, number];
              assert.deepEqual([id, version], [sku.id, sku.version]);
              assert.equal(limit, 101);
              const rows = ledger.filter(row => row.sku_id === id && row.sku_version === version &&
                Number(row.evidence_sequence) > after && Number(row.evidence_sequence) <= cutoff)
                .sort((a, b) => Number(a.evidence_sequence) - Number(b.evidence_sequence)).slice(0, limit);
              return { success: true, results: (options.pageRows?.(pageCount, rows) ?? rows) as T[] };
            }
            durableCount++; events.push("durable");
            if (options.failDurable === durableCount) throw new Error("synthetic durable failure");
            if (sql.includes("FROM food_production_batches")) {
              return { success: true, results: batches.filter(row => row.batch_id === values[0] && row.version === values[1]) as T[] };
            }
            assert.match(sql, /FROM food_physical_inventory_movements/);
            return { success: true, results: movements.filter(row => row.movement_id === values[0]) as T[] };
          },
        };
        return statement;
      },
      getBookmark() {
        events.push(`${name}:bookmark`);
        if (options.fail === "bookmark") throw new Error("synthetic bookmark failure");
        return name === "primary" ? bookmark : "advanced-B";
      },
    };
  }
  const primary = reader("primary"), anchored = reader("anchored");
  const database = {
    withSession(mode?: string) {
      modes.push(mode);
      if (mode === "first-primary") {
        if (options.fail === "primary") throw new Error("synthetic primary failure");
        return primary;
      }
      assert.equal(mode, bookmark);
      if (options.fail === "anchor") throw new Error("synthetic anchor failure");
      return anchored;
    },
    prepare() { rawReads++; throw new Error("raw reader lags at sequence 100 and must never be used"); },
  } satisfies FoodAuthoritativeInventoryReadPointD1Database & { prepare(): never };
  return { database, anchored, calls, modes, events, ledger, batches, movements, headRow,
    counts: () => ({ pageCount, durableCount, rawReads }) };
}
function history(movementCount: number) {
  return fixture({
    head: movementCount + 1,
    ledger: [batchEvidence(1), ...Array.from({ length: movementCount }, (_, i) => movementEvidence(i + 2, `m${i}`))],
    movements: Array.from({ length: movementCount }, (_, i) => movementRow(`m${i}`)),
  });
}
function deepFrozen(value: unknown): void {
  if (value !== null && typeof value === "object") {
    assert.ok(Object.isFrozen(value));
    for (const child of Object.values(value)) deepFrozen(child);
  }
}

test("006O real one-page pipeline retains canonical balance and exact acquisition", async () => {
  const f = fixture();
  const result = await compose(f.database, { sku });
  assert.equal(result.outcome, "composed");
  if (result.outcome !== "composed") assert.fail("Expected composed");
  assert.deepEqual(result.value.acquisition, { sku, exactSkuEvidenceHead: 14, bookmark });
  const expected = balanceModule.projectFoodLosslessGroupedInventoryRecordedBalance({
    outcome: "success", sku, cutoff: 14,
    batches: [{ productionBatchEvidenceSequence: 10,
      batch: { kind: "food-production-batch", id: "food-production-batch:a", version: 1, sku,
        batchCode: "SYN", storageMode: "refrigerated", producedPackageCount: 10, preparedOn: "2026-10-14",
        attribution: "synthetic:test", sourceReference: "synthetic:batch" },
      movements: [{ evidenceSequence: 14, movement: { kind: "food-physical-inventory-movement",
        id: "food-physical-inventory-movement:m", batch: { id: "food-production-batch:a", version: 1 }, sku,
        movementType: "adjustment-in", packageCount: 1, occurredOn: "2026-10-14",
        attribution: "synthetic:test", sourceReference: "synthetic:movement" } }],
    }],
  });
  assert.deepEqual(result.value.recordedBalance, expected);
  assert.deepEqual(f.modes, ["first-primary", bookmark]);
  assert.deepEqual(f.events, ["head", "primary:bookmark", "page", "durable", "durable"]);
  assert.deepEqual(f.calls[1]!.values, [sku.id, sku.version, 0, 14, 101]);
  assert.equal(f.counts().rawReads, 0);
  deepFrozen(result);
});

for (const count of [100, 129, 249, 12801]) {
  test(`006O ${count + 1} rows exhaust without item or 128-page cap`, async () => {
    const f = history(count);
    const result = await compose(f.database, { sku });
    assert.equal(result.outcome, "composed");
    if (result.outcome !== "composed") assert.fail("Expected composed");
    assert.equal(result.value.recordedBalance.batches[0]!.movements.length, count);
    assert.equal(result.value.recordedBalance.skuBalance.recordedPackageBalance, 10 + count);
    const pages = f.calls.filter(call => call.sql.includes("ORDER BY evidence_sequence"));
    assert.equal(pages.length, Math.ceil((count + 1) / 100));
    assert.deepEqual(pages.map(call => call.values), pages.map((_, i) => [sku.id, sku.version, i * 100, count + 1, 101]));
    assert.ok(f.calls.slice(1).every(call => call.reader === "anchored"));
    assert.deepEqual(f.modes, ["first-primary", bookmark]);
  });
}

test("006O lagging raw reader cannot supply late evidence or durable entities; B anchors both phases", async () => {
  const f = history(149);
  assert.ok(f.ledger.some(row => row.evidence_sequence === 150));
  const result = await compose(f.database, { sku });
  assert.equal(result.outcome, "composed");
  if (result.outcome !== "composed") assert.fail("Expected composed");
  assert.equal(result.value.acquisition.exactSkuEvidenceHead, 150);
  assert.equal(result.value.recordedBalance.batches[0]!.movements.length, 149);
  assert.ok(f.calls.some(call => call.reader === "anchored" && call.values[0] === "food-physical-inventory-movement:m148"));
  assert.equal(f.counts().rawReads, 0);
  assert.equal(f.counts().durableCount, 150);
});

test("006O multiple batches and movements preserve all provenance and deterministic order", async () => {
  const f = fixture({ head: 100, ledger: [batchEvidence(10, "z"), batchEvidence(14), movementEvidence(21, "a"), movementEvidence(100, "z", "z")],
    batches: [batchRow("z", 20), batchRow()], movements: [movementRow("a"), movementRow("z", "z", 3, "waste")] });
  const result = await compose(f.database, { sku });
  assert.equal(result.outcome, "composed");
  if (result.outcome !== "composed") assert.fail("Expected composed");
  const value = result.value.recordedBalance;
  assert.equal(value.skuBalance.recordedPackageBalance, 28);
  assert.deepEqual(value.batches.map(batch => [batch.batch.id, batch.productionBatchEvidenceSequence, batch.movements]), [
    ["food-production-batch:a", 14, [{ evidenceSequence: 21, movementId: "food-physical-inventory-movement:a" }]],
    ["food-production-batch:z", 10, [{ evidenceSequence: 100, movementId: "food-physical-inventory-movement:z" }]],
  ]);
});

test("006O later target rows, unrelated SKU and other versions cannot expand fixed H", async () => {
  const f = fixture({ head: 100, ledger: [batchEvidence(10), movementEvidence(100, "m"), movementEvidence(101, "later"),
    { ...batchEvidence(500), sku_id: "food-sku:other" }, { ...batchEvidence(900), sku_version: 3 }] });
  const result = await compose(f.database, { sku });
  assert.equal(result.outcome, "composed");
  if (result.outcome !== "composed") assert.fail("Expected composed");
  assert.equal(result.value.recordedBalance.cutoff, 100);
  assert.equal(result.value.recordedBalance.skuBalance.recordedPackageBalance, 11);
  assert.deepEqual(result.value.recordedBalance.batches[0]!.movements, [{ evidenceSequence: 100, movementId: "food-physical-inventory-movement:m" }]);
  assert.deepEqual(f.modes, ["first-primary", bookmark]);
});

test("006O negative recorded balance stays negative", async () => {
  const result = await compose(fixture({ movements: [movementRow("m", "a", 12, "waste")] }).database, { sku });
  assert.equal(result.outcome, "composed");
  if (result.outcome !== "composed") assert.fail("Expected composed");
  assert.equal(result.value.recordedBalance.skuBalance.recordedPackageBalance, -2);
});

for (const input of [null, {}, { sku: { id: "bad", version: 1 } }, { sku, composedCutoff: 14 }]) {
  test(`006O invalid ${JSON.stringify(input)} stops before storage`, async () => {
    const f = fixture();
    const result = await compose(f.database, input);
    assert.deepEqual(result, { outcome: "invalid" });
    assert.ok(Object.isFrozen(result));
    assert.deepEqual(f.modes, []);
  });
}
for (const fail of ["primary", "head", "bookmark", "anchor"] as const) {
  test(`006O ${fail} failure stops reconstruction with no fallback`, async () => {
    const f = fixture({ fail });
    assert.deepEqual(await compose(f.database, { sku }), { outcome: "storage-failure" });
    assert.equal(f.counts().pageCount, 0);
    assert.equal(f.counts().durableCount, 0);
    assert.equal(f.counts().rawReads, 0);
    assert.equal(f.modes.length, fail === "anchor" ? 2 : 1);
  });
}
for (const failPage of [1, 2]) {
  test(`006O page ${failPage} failure returns no partial balance or durable reads`, async () => {
    const f = history(149);
    const failing = fixture({ head: 150, ledger: f.ledger, movements: f.movements, failPage });
    assert.deepEqual(await compose(failing.database, { sku }), { outcome: "storage-failure" });
    assert.equal(failing.counts().pageCount, failPage);
    assert.equal(failing.counts().durableCount, 0);
  });
}
for (const rows of [[], [batchEvidence(10)]]) {
  test(`006O positive H cannot exhaust early with ${rows.length} entries`, async () => {
    const f = fixture({ head: 14, ledger: rows });
    assert.deepEqual(await compose(f.database, { sku }), { outcome: "storage-failure" });
    assert.equal(f.counts().durableCount, 0);
  });
}
test("006O repeated page is rejected by canonical cursor bounds before resolution", async () => {
  const f = history(149);
  const broken = fixture({ head: 150, ledger: f.ledger, movements: f.movements,
    pageRows: (page, rows) => page === 2 ? f.ledger.slice(0, 50) : rows });
  assert.deepEqual(await compose(broken.database, { sku }), { outcome: "storage-failure" });
  assert.equal(broken.counts().durableCount, 0);
});
test("006O grouping duplicate batch rejection prevents resolution", async () => {
  const f = fixture({ ledger: [batchEvidence(10), batchEvidence(14)] });
  assert.deepEqual(await compose(f.database, { sku }), { outcome: "storage-failure" });
  assert.equal(f.counts().durableCount, 0);
});
test("006O grouping orphan movement rejection prevents resolution", async () => {
  const f = fixture({ ledger: [movementEvidence(14, "m")] });
  assert.deepEqual(await compose(f.database, { sku }), { outcome: "storage-failure" });
  assert.equal(f.counts().durableCount, 0);
});
for (const missing of ["batch", "movement"]) {
  test(`006O missing exact ${missing} retains not-found distinction`, async () => {
    const f = fixture(missing === "batch" ? { batches: [] } : { movements: [] });
    assert.deepEqual(await compose(f.database, { sku }), { outcome: "not-found" });
    assert.equal(f.counts().durableCount, missing === "batch" ? 1 : 2);
  });
}
for (const failDurable of [1, 2]) {
  test(`006O durable failure ${failDurable} fails whole composition`, async () => {
    const f = fixture({ failDurable });
    assert.deepEqual(await compose(f.database, { sku }), { outcome: "storage-failure" });
    assert.equal(f.counts().durableCount, failDurable);
  });
}
test("006O durable identity disagreement fails closed", async () => {
  const f = fixture({ movements: [{ ...movementRow("m"), sku_id: "food-sku:other" }] });
  assert.deepEqual(await compose(f.database, { sku }), { outcome: "storage-failure" });
});
test("006O canonical composition overflow fails without partial state", async () => {
  const f = fixture({ batches: [batchRow("a", Number.MAX_SAFE_INTEGER)] });
  assert.deepEqual(await compose(f.database, { sku }), { outcome: "storage-failure" });
  assert.equal(f.counts().durableCount, 2);
});
test("006O caller, head, ledger and durable fixture mutation cannot change frozen success", async () => {
  const f = fixture(), input = { sku: { ...sku } };
  const pending = compose(f.database, input);
  input.sku.id = "food-sku:changed";
  const result = await pending;
  assert.equal(result.outcome, "composed");
  const expected = structuredClone(result);
  input.sku.version = 99;
  f.headRow.evidence_head = 999;
  f.ledger[0]!.evidence_sequence = 999;
  f.batches[0]!.produced_package_count = 999;
  f.movements[0]!.package_count = 999;
  assert.deepEqual(result, expected);
  deepFrozen(result);
});

// Instrument the actual module in memory only for unreachable canonical-result
// anomalies and stage call ordering. Ordinary integration tests above use real
// imports and D1 fixtures; production exports gain no testing injection API.
type Overrides = {
  page?: typeof pageModule.listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff;
  resolve?: typeof resolveModule.resolveFoodGroupedInventoryEvidenceDurably;
};
async function observed(overrides: Overrides = {}) {
  const calls: string[] = [];
  const pageRequests: Parameters<typeof pageModule.listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff>[] = [];
  const resolutionRequests: Parameters<typeof resolveModule.resolveFoodGroupedInventoryEvidenceDurably>[] = [];
  let originalAcquisition: acquisitionModule.FoodAuthoritativeInventoryEvidenceHeadAcquisition | undefined;
  let originalBalance: balanceModule.FoodLosslessGroupedInventoryRecordedBalanceComposition | undefined;
  const modules: Record<string, unknown> = {
    "./authoritative-inventory-evidence-head-acquisition": {
      async acquireFoodAuthoritativeInventoryEvidenceHead(...args: Parameters<typeof acquisitionModule.acquireFoodAuthoritativeInventoryEvidenceHead>) {
        calls.push("acquire");
        const result = await acquisitionModule.acquireFoodAuthoritativeInventoryEvidenceHead(...args);
        if (result.outcome === "acquired") originalAcquisition = result.value;
        return result;
      },
    },
    "./d1-inventory-evidence-cutoff-bounded-read-persistence": {
      async listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff(...args: Parameters<typeof pageModule.listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff>) {
        calls.push("page");
        pageRequests.push(args);
        return (overrides.page ?? pageModule.listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff)(...args);
      },
    },
    "./lossless-inventory-evidence-grouping": {
      groupFoodInventoryEvidenceCompleteThroughCutoff(...args: Parameters<typeof groupModule.groupFoodInventoryEvidenceCompleteThroughCutoff>) {
        calls.push(`group:${args[0].entries.length}`);
        return groupModule.groupFoodInventoryEvidenceCompleteThroughCutoff(...args);
      },
    },
    "./grouped-inventory-evidence-durable-resolution": {
      async resolveFoodGroupedInventoryEvidenceDurably(...args: Parameters<typeof resolveModule.resolveFoodGroupedInventoryEvidenceDurably>) {
        calls.push("resolve");
        resolutionRequests.push(args);
        return (overrides.resolve ?? resolveModule.resolveFoodGroupedInventoryEvidenceDurably)(...args);
      },
    },
    "./lossless-inventory-recorded-balance-composition": {
      projectFoodLosslessGroupedInventoryRecordedBalance(...args: Parameters<typeof balanceModule.projectFoodLosslessGroupedInventoryRecordedBalance>) {
        calls.push("compose");
        originalBalance = balanceModule.projectFoodLosslessGroupedInventoryRecordedBalance(...args);
        return originalBalance;
      },
    },
  };
  const source = await readFile(new URL("./authoritative-recorded-inventory-balance-orchestration.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: { composeFoodAuthoritativeRecordedInventoryBalance?: typeof compose } = {};
  runInNewContext(js, { exports, require(name: string) {
    assert.ok(Object.hasOwn(modules, name), `Unexpected runtime dependency: ${name}`);
    return modules[name];
  } });
  assert.ok(exports.composeFoodAuthoritativeRecordedInventoryBalance);
  return { compose: exports.composeFoodAuthoritativeRecordedInventoryBalance, calls, pageRequests, resolutionRequests,
    originals: () => ({ originalAcquisition, originalBalance }) };
}
test("006O empty pipeline invokes real I K L M once without reconstruction queries", async () => {
  const f = fixture({ head: null, ledger: [], batches: [], movements: [] });
  const watched = await observed();
  const result = await watched.compose(f.database, { sku });
  assert.equal(result.outcome, "composed");
  if (result.outcome !== "composed") assert.fail("Expected composed");
  assert.deepEqual(watched.calls, ["acquire", "page", "group:0", "resolve", "compose"]);
  assert.deepEqual(f.modes, ["first-primary", bookmark]);
  assert.equal(f.calls.length, 1);
  assert.equal(result.value.recordedBalance.skuBalance.recordedPackageBalance, 0);
  assert.deepEqual(result.value.recordedBalance.sku, sku);
  assert.equal(result.value.acquisition, watched.originals().originalAcquisition);
  assert.equal(result.value.recordedBalance, watched.originals().originalBalance);
  assert.equal(watched.pageRequests.length, 1);
  assert.equal(watched.pageRequests[0]![0], f.anchored);
  // Options originate in the instrumented VM realm; compare their own fields.
  assert.deepEqual({ ...watched.pageRequests[0]![2] as object }, { cutoff: 0, after: 0, limit: 100 });
  assert.equal(watched.resolutionRequests[0]![0], f.anchored);
});
test("006O grouping waits for full enumeration and canonical objects are retained by identity", async () => {
  const f = history(149), watched = await observed();
  const result = await watched.compose(f.database, { sku });
  assert.equal(result.outcome, "composed");
  if (result.outcome !== "composed") assert.fail("Expected composed");
  assert.deepEqual(watched.calls, ["acquire", "page", "page", "group:150", "resolve", "compose"]);
  assert.equal(result.value.acquisition, watched.originals().originalAcquisition);
  assert.equal(result.value.recordedBalance, watched.originals().originalBalance);
  assert.ok(watched.pageRequests.every(args => args[0] === f.anchored));
  assert.equal(watched.resolutionRequests[0]![0], f.anchored);
});
for (const [label, items, nextCursor] of [
  ["zero cursor", [], 0], ["negative cursor", [], -1], ["unsafe cursor", [], Number.MAX_SAFE_INTEGER + 1],
  ["fractional cursor", [], 1.5], ["NaN cursor", [], NaN],
  ["cursor beyond H", [], 15], ["empty page cursor", [], 1],
  ["cursor differs from last", [{ evidenceSequence: 10 }], 11],
] as const) {
  test(`006O impossible canonical ${label} stops before grouping`, async () => {
    const watched = await observed({ page: async () => ({ outcome: "page", value: { items, nextCursor } }) as pageModule.FoodInventoryEvidenceLedgerPageResult });
    const result = await watched.compose(fixture().database, { sku });
    assert.equal(result.outcome, "storage-failure");
    assert.deepEqual(Object.keys(result), ["outcome"]);
    assert.deepEqual(watched.calls, ["acquire", "page"]);
  });
}
test("006O repeated present cursor after page one fails before grouping", async () => {
  let count = 0;
  const item = { evidenceSequence: 10, evidenceKind: "production-batch" as const, sku, batch: { id: "food-production-batch:a", version: 1 } };
  const watched = await observed({ page: async () => {
    count++;
    return { outcome: "page", value: { items: [item], nextCursor: 10 } };
  } });
  assert.equal((await watched.compose(fixture().database, { sku })).outcome, "storage-failure");
  assert.equal(count, 2);
  assert.deepEqual(watched.calls, ["acquire", "page", "page"]);
});
for (const outcome of ["invalid", "storage-failure"] as const) {
  test(`006O unexpected page ${outcome} never reaches grouping`, async () => {
    const watched = await observed({ page: async () => ({ outcome }) });
    assert.equal((await watched.compose(fixture().database, { sku })).outcome, "storage-failure");
    assert.deepEqual(watched.calls, ["acquire", "page"]);
  });
  test(`006O resolution ${outcome} never reaches composition`, async () => {
    const watched = await observed({ resolve: async () => ({ outcome }) });
    assert.equal((await watched.compose(fixture().database, { sku })).outcome, "storage-failure");
    assert.deepEqual(watched.calls, ["acquire", "page", "group:2", "resolve"]);
  });
}
test("006O source composes canonical authorities without SQL or competing authority", async () => {
  const source = await readFile(new URL("./authoritative-recorded-inventory-balance-orchestration.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /inventory-evidence-cutoff-exhaustion-service|inventory-evidence-manifest|resolved-inventory-balance-composition|validateFoodInventoryAtAuthoritativeReadPoint|acquireFoodInventoryEvidenceCutoff|projectFoodProductionBatchRecordedPhysicalBalance|projectFoodSkuRecordedPhysicalBalance/);
  assert.doesNotMatch(source, /\b(?:SELECT|INSERT|UPDATE|DELETE|UPSERT)\b|database\.prepare|Date\b|fetch\(|process\.env|wrangler|setTimeout/);
  assert.doesNotMatch(source, /currentQoh|currentQuantityOnHand|physicalStock|currentInventory|stillCurrent|guaranteedCurrent|availableToPromise|checkoutReady|paymentReady/);
  for (const name of ["acquireFoodAuthoritativeInventoryEvidenceHead", "groupFoodInventoryEvidenceCompleteThroughCutoff", "resolveFoodGroupedInventoryEvidenceDurably", "projectFoodLosslessGroupedInventoryRecordedBalance"]) {
    assert.equal([...source.matchAll(new RegExp(`${name}\\(`, "g"))].length, 1);
  }
});

test("006O 129 exact batches preserve every baseline once", async () => {
  const f = fixture({ head: 129,
    ledger: Array.from({ length: 129 }, (_, i) => batchEvidence(i + 1, `b${i}`)),
    batches: Array.from({ length: 129 }, (_, i) => batchRow(`b${i}`)), movements: [] });
  const result = await compose(f.database, { sku });
  assert.equal(result.outcome, "composed");
  if (result.outcome !== "composed") assert.fail("Expected composed");
  assert.equal(result.value.recordedBalance.batches.length, 129);
  assert.equal(result.value.recordedBalance.skuBalance.recordedPackageBalance, 1290);
  assert.equal(f.counts().durableCount, 129);
});
for (const stage of ["invalid", "acquisition", "anchor", "page", "group", "missing", "durable", "composition"] as const) {
  test(`006O observed ${stage} failure prevents downstream stages`, async () => {
    const watched = await observed();
    const options: Options = stage === "acquisition" ? { fail: "head" }
      : stage === "anchor" ? { fail: "anchor" }
      : stage === "page" ? { failPage: 1 }
      : stage === "group" ? { ledger: [batchEvidence(10), batchEvidence(14)] }
      : stage === "missing" ? { movements: [] }
      : stage === "durable" ? { failDurable: 2 }
      : stage === "composition" ? { batches: [batchRow("a", Number.MAX_SAFE_INTEGER)] } : {};
    const result = await watched.compose(fixture(options).database, stage === "invalid" ? null : { sku });
    assert.equal(result.outcome, stage === "invalid" ? "invalid" : stage === "missing" ? "not-found" : "storage-failure");
    assert.deepEqual(Object.keys(result), ["outcome"]);
    const expected = ["acquire"];
    if (!["invalid", "acquisition", "anchor"].includes(stage)) expected.push("page");
    if (["group", "missing", "durable", "composition"].includes(stage)) expected.push("group:2");
    if (["missing", "durable", "composition"].includes(stage)) expected.push("resolve");
    if (stage === "composition") expected.push("compose");
    assert.deepEqual(watched.calls, expected);
  });
}
