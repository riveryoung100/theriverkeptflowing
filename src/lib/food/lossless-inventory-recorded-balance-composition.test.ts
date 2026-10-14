import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { projectFoodLosslessGroupedInventoryRecordedBalance as project } from "./lossless-inventory-recorded-balance-composition";

function batch(local = "a", version = 1, count = 10) {
  return {
    kind: "food-production-batch", id: `food-production-batch:${local}`, version,
    sku: { id: "food-sku:synthetic", version: 1 }, batchCode: "SYN",
    storageMode: "refrigerated", producedPackageCount: count,
    preparedOn: "2026-10-14", attribution: "synthetic:test", sourceReference: "synthetic:batch",
  };
}
function movement(production = batch(), local = "m", movementType = "adjustment-in", packageCount = 2) {
  return {
    kind: "food-physical-inventory-movement", id: `food-physical-inventory-movement:${local}`,
    batch: { id: production.id, version: production.version }, sku: { ...production.sku },
    movementType, packageCount, occurredOn: "2026-10-14",
    attribution: "synthetic:test", sourceReference: "synthetic:movement",
  };
}
function group(production = batch(), sequence = 1, moves = [movement(production)]) {
  return { productionBatchEvidenceSequence: sequence, batch: production,
    movements: moves.map((value, index) => ({ evidenceSequence: sequence + index + 1, movement: value })) };
}
function input(groups = [group()], cutoff = 1000) {
  return { outcome: "success", sku: { id: "food-sku:synthetic", version: 1 }, cutoff, batches: groups };
}

for (const cutoff of [0, 99]) {
  test(`empty grouping at cutoff ${cutoff} retains zero recorded balance`, () => {
    const result = project(input([], cutoff));
    assert.equal(result.cutoff, cutoff); assert.deepEqual(result.batches, []);
    assert.equal(result.skuBalance.recordedPackageBalance, 0); assert.deepEqual(result.skuBalance.batchReferences, []);
  });
}
test("zero cutoff rejects nonempty grouping", () => assert.throws(() => project(input([group()], 0)), TypeError));
test("zero movements apply production baseline once", () => {
  const result = project(input([group(batch(), 1, [])]));
  assert.equal(result.batches[0]!.recordedBalance.recordedPackageBalance, 10);
  assert.equal(result.skuBalance.recordedPackageBalance, 10);
});
for (const [type, count, expected] of [["adjustment-in", 2, 12], ["adjustment-out", 2, 8], ["waste", 2, 8], ["waste", 12, -2]] as const) {
  test(`${type} ${count} preserves canonical signed balance`, () => {
    const b = batch(); const result = project(input([group(b, 1, [movement(b, "m", type, count)])]));
    assert.equal(result.batches[0]!.recordedBalance.recordedPackageBalance, expected);
    assert.equal(result.skuBalance.recordedPackageBalance, expected);
  });
}
test("multiple batches apply every baseline and movement once", () => {
  const b = batch("b", 1, 20);
  const result = project(input([group(), group(b, 3, [movement(b, "n", "waste", 3)])]));
  assert.deepEqual(result.batches.map(value => value.recordedBalance.recordedPackageBalance), [12, 17]);
  assert.equal(result.skuBalance.recordedPackageBalance, 29);
});
test("129 movements stay in one projection with one baseline", () => {
  const b = batch(); const moves = Array.from({ length: 129 }, (_, i) => movement(b, `m${i}`, "adjustment-in", 1));
  const result = project(input([group(b, 1, moves)]));
  assert.equal(result.batches.length, 1); assert.equal(result.batches[0]!.movements.length, 129);
  assert.equal(result.batches[0]!.recordedBalance.movementIds.length, 129);
  assert.equal(result.skuBalance.recordedPackageBalance, 139);
});
test("129 batches retain every baseline and movement", () => {
  const groups = Array.from({ length: 129 }, (_, i) => {
    const b = batch(`b${i}`, 1, 3); return group(b, i * 2 + 1, [movement(b, `m${i}`, "adjustment-in", 1)]);
  });
  const result = project(input(groups));
  assert.equal(result.batches.length, 129); assert.equal(result.skuBalance.batchReferences.length, 129);
  assert.equal(result.skuBalance.recordedPackageBalance, 516);
  assert.equal(result.batches.reduce((n, value) => n + value.movements.length, 0), 129);
});
test("duplicate exact batch rejects before duplicate baseline arithmetic", () => {
  assert.throws(() => project(input([group(batch("a", 1, Number.MAX_SAFE_INTEGER), 1, []), group(batch("a", 1, Number.MAX_SAFE_INTEGER), 2, [])])), /Duplicate exact batch/);
});
test("duplicate movement within batch rejects through 005Z", () => {
  const b = batch(); assert.throws(() => project(input([group(b, 1, [movement(b), movement(b)])])), /Duplicate movement identity/);
});
test("duplicate movement across batches rejects globally", () => {
  const b = batch("b"); assert.throws(() => project(input([group(), group(b, 3, [movement(b)])])), /Duplicate global movement/);
});
for (const kind of ["movement/movement", "batch/movement", "batch/batch"]) {
  test(`global evidence sequence uniqueness rejects ${kind}`, () => {
    const b = batch("b"); const value = input([group(), group(b, 3, [movement(b, "n")])]);
    if (kind === "movement/movement") value.batches[1]!.movements[0]!.evidenceSequence = 2;
    if (kind === "batch/movement") value.batches[0]!.movements[0]!.evidenceSequence = 1;
    if (kind === "batch/batch") value.batches[1]!.productionBatchEvidenceSequence = 1;
    assert.throws(() => project(value), /duplicate evidence sequence/);
  });
}
for (const value of [0, -1, 1.5, 1001, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "1", new Number(1), null, undefined]) {
  test(`invalid evidence sequence ${String(value)} rejects on both entry types`, () => {
    for (const entry of ["batch", "movement"]) {
      const candidate = input();
      if (entry === "batch") Object.assign(candidate.batches[0]!, { productionBatchEvidenceSequence: value });
      else Object.assign(candidate.batches[0]!.movements[0]!, { evidenceSequence: value });
      assert.throws(() => project(candidate), TypeError);
    }
  });
}
test("malformed cutoffs reject without coercion", () => {
  for (const cutoff of [-1, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, "1", new Number(1), null, undefined]) {
    assert.throws(() => project({ ...input([]), cutoff }), TypeError);
  }
});
test("malformed envelopes and failure union reject", () => {
  for (const value of [null, [], {}, { outcome: "storage-failure" }, { ...input(), outcome: "invalid" }, { ...input(), extra: true }, { ...input(), batches: {} }, { ...input(), sku: { id: "wrong:x", version: 1 } }, { ...input(), sku: { id: "food-sku:synthetic", version: "1" } }]) assert.throws(() => project(value), TypeError);
});
test("malformed group and movement wrappers reject", () => {
  for (const candidate of [null, {}, { ...group(), extra: true }, { ...group(), movements: null }, { ...group(), movements: [null] }, { ...group(), movements: [{ ...group().movements[0], extra: true }] }]) {
    assert.throws(() => project({ ...input(), batches: [candidate] }), TypeError);
  }
});
test("top-level exact SKU mismatch rejects for id and version", () => {
  for (const sku of [{ id: "food-sku:other", version: 1 }, { id: "food-sku:synthetic", version: 2 }]) assert.throws(() => project({ ...input(), sku }), /exact batch and SKU/);
});
test("movement wrong exact batch or SKU rejects canonically", () => {
  for (const changes of [{ batch: { id: "food-production-batch:other", version: 1 } }, { batch: { id: "food-production-batch:a", version: 2 } }, { sku: { id: "food-sku:other", version: 1 } }]) {
    const candidate = input(); Object.assign(candidate.batches[0]!.movements[0]!.movement, changes);
    assert.throws(() => project(candidate), TypeError);
  }
});
test("malformed durable values propagate canonical TypeErrors", () => {
  const candidate = input(); candidate.batches[0]!.batch.producedPackageCount = 0;
  assert.throws(() => project(candidate), TypeError);
  const other = input(); other.batches[0]!.movements[0]!.movement.movementType = "unsupported";
  assert.throws(() => project(other), TypeError);
});
test("per-batch positive and negative overflow propagate", () => {
  const b = batch("a", 1, Number.MAX_SAFE_INTEGER);
  assert.throws(() => project(input([group(b)])), /signed safe integer/);
  const small = batch("a", 1, 1);
  assert.throws(() => project(input([group(small, 1, [movement(small, "m", "waste", Number.MAX_SAFE_INTEGER), movement(small, "n", "waste", 2)])])), /signed safe integer/);
});
test("aggregate positive and negative overflow propagate", () => {
  assert.throws(() => project(input([group(batch("a", 1, Number.MAX_SAFE_INTEGER), 1, []), group(batch("b", 1, 1), 2, [])])), /SKU recorded balance exceeds/);
  const a = batch("a", 1, 1), b = batch("b", 1, 1);
  assert.throws(() => project(input([group(a, 1, [movement(a, "m", "waste", Number.MAX_SAFE_INTEGER)]), group(b, 3, [movement(b, "n", "waste", 4)])])), /SKU recorded balance exceeds/);
});
test("different versions of same batch are distinct and deterministically sorted", () => {
  const result = project(input([group(batch("a", 2), 1, []), group(batch("a", 1), 2, [])]));
  assert.deepEqual(result.batches.map(value => value.batch.version), [1, 2]); assert.equal(result.skuBalance.recordedPackageBalance, 20);
});
test("unordered fabricated input produces identical deterministic output", () => {
  const b = batch("b"), a = batch();
  const value = input([group(b, 1, [movement(b, "b1"), movement(b, "b2", "waste", 1)]), group(a, 4, [])]);
  const expected = project(value); value.batches.reverse(); value.batches[1]!.movements.reverse();
  assert.deepEqual(project(value), expected);
});
test("retains exact SKU cutoff and every batch/movement evidence identity", () => {
  const result = project(input()); const first = result.batches[0]!;
  assert.deepEqual(result.sku, input().sku); assert.equal(result.cutoff, 1000);
  assert.equal(first.productionBatchEvidenceSequence, 1); assert.deepEqual(first.batch, { id: batch().id, version: 1 });
  assert.deepEqual(first.movements, [{ evidenceSequence: 2, movementId: movement().id }]);
});
test("complete output is deeply frozen", () => {
  function frozen(value: unknown): void {
    if (value && typeof value === "object") { assert(Object.isFrozen(value)); Object.values(value).forEach(frozen); }
  }
  frozen(project(input()));
});
test("composition does not mutate input and detaches every retained value", () => {
  const value = input(), original = structuredClone(value); const result = project(value), expected = structuredClone(result);
  assert.deepEqual(value, original);
  value.sku.version = 99; value.cutoff = 99; value.batches[0]!.batch.producedPackageCount = 99;
  value.batches[0]!.batch.version = 99; value.batches[0]!.productionBatchEvidenceSequence = 99;
  value.batches[0]!.movements[0]!.evidenceSequence = 99; value.batches[0]!.movements[0]!.movement.packageCount = 99;
  value.batches.length = 0; assert.deepEqual(result, expected);
});
test("canonical internal whitespace identity remains valid and preserved", () => {
  const b = batch("a b"); b.sku.id = "food-sku:a\tb";
  const value = input([group(b, 1, [movement(b, "m n")])]); value.sku.id = b.sku.id;
  assert.equal(project(value).sku.id, b.sku.id);
});
test("source delegates balance arithmetic without bounded manifests", async () => {
  const source = await readFile(new URL("./lossless-inventory-recorded-balance-composition.ts", import.meta.url), "utf8");
  assert.match(source, /projectFoodProductionBatchRecordedPhysicalBalance/); assert.match(source, /projectFoodSkuRecordedPhysicalBalance/);
  assert.doesNotMatch(source, /projectFoodResolvedInventoryEvidenceRecordedBalance|validateFoodInventoryEvidenceManifest|resolveFoodInventoryEvidenceManifest|inventory-evidence-manifest|\b128\b|BigInt/);
});
test("source performs no persistence or SQL", async () => {
  const source = await readFile(new URL("./lossless-inventory-recorded-balance-composition.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|D1Database|d1-|node:fs|fetch\s*\(|process\.env|Date\.now|\basync\b/);
});
test("output exposes recorded balance without operational authority fields", () => {
  const source = JSON.stringify(project(input()));
  assert.doesNotMatch(source, /quantityOnHand|availableToPromise|sellableQuantity|checkoutReady|paymentReady|capacityUnits/);
});
