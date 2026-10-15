import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  allocateFoodExactBatchPhysicalInventoryCorrection,
} from "./exact-batch-physical-inventory-correction-allocation";
import {
  FOOD_EXACT_SKU_PHYSICAL_COUNT_OBSERVATION_KIND,
  FOOD_EXACT_SKU_PHYSICAL_COUNT_SCOPE,
  createFoodExactSkuPhysicalCountObservationId,
} from "./exact-sku-physical-count-observation-domain";
import {
  reconcileFoodExactSkuPhysicalInventory,
} from "./exact-sku-physical-inventory-reconciliation-domain";
import { createFoodSkuId } from "./package-sku-domain";
import {
  deriveFoodPhysicalInventoryCorrectionMovementCandidates,
} from "./physical-inventory-correction-movement-candidates";
import {
  createFoodPhysicalInventoryMovementId,
} from "./physical-inventory-movement-domain";
import { createFoodProductionBatchId } from "./production-batch-domain";
import {
  verifyFoodCorrectionMovementEvidenceInclusion,
} from "./correction-movement-evidence-inclusion-verification";
import {
  classifyFoodPostCorrectionRecordedBalanceConvergence,
} from "./post-correction-recorded-balance-convergence";

function sku() {
  return {
    id: createFoodSkuId("006z-synthetic-sku"),
    version: 2,
  };
}

function batch(local: string, version = 1) {
  return {
    id: createFoodProductionBatchId(local),
    version,
  };
}

const batches = [
  batch("006z-batch-a"),
  batch("006z-batch-b"),
  batch("006z-batch-c"),
] as const;

function countObservation(countedPackageCount: number) {
  return {
    kind: FOOD_EXACT_SKU_PHYSICAL_COUNT_OBSERVATION_KIND,
    id: createFoodExactSkuPhysicalCountObservationId("006z-count"),
    sku: sku(),
    countScope: FOOD_EXACT_SKU_PHYSICAL_COUNT_SCOPE,
    countedPackageCount,
    observedAt: "2026-10-15T18:00:00Z",
    attribution: "synthetic:test-counter",
    sourceReference: "synthetic:006z-count",
  };
}

function recordedValidation(
  recordedPackageBalance: number,
  head: number,
  movementIds: readonly string[][] = [[], [], []],
  evidence: readonly Readonly<{
    evidenceSequence: number;
    movementId: string;
  }>[][] = [[], [], []],
) {
  const exactSku = sku();
  const first = 4;
  const second = 5;
  const third = recordedPackageBalance - first - second;
  const balances = [first, second, third];

  return {
    outcome: "validated" as const,
    value: {
      composition: {
        acquisition: {
          sku: exactSku,
          exactSkuEvidenceHead: head,
          bookmark: `synthetic:006z-b1:${head}`,
        },
        recordedBalance: {
          kind: "food-lossless-grouped-inventory-recorded-balance",
          sku: exactSku,
          cutoff: head,
          batches: batches.map((exactBatch, index) => ({
            productionBatchEvidenceSequence: index + 1,
            batch: exactBatch,
            movements: evidence[index] ?? [],
            recordedBalance: {
              kind: "food-production-batch-recorded-physical-balance",
              batch: exactBatch,
              sku: exactSku,
              recordedPackageBalance: balances[index]!,
              movementIds: movementIds[index] ?? [],
            },
          })),
          skuBalance: {
            kind: "food-sku-recorded-physical-balance",
            sku: exactSku,
            recordedPackageBalance,
            batchReferences: [...batches],
          },
        },
      },
      readPoint: {
        kind: "food-authoritative-inventory-read-point",
        sku: exactSku,
        composedCutoff: head,
        exactSkuEvidenceHead: head,
        consistencyToken: {
          sku: exactSku,
          composedCutoff: head,
          exactSkuEvidenceHead: head,
          bookmark: `synthetic:006z-b2:${head}`,
        },
      },
    },
  };
}

function originalReconciliation() {
  return reconcileFoodExactSkuPhysicalInventory(
    recordedValidation(10, 41),
    countObservation(16),
  );
}

function candidateResult() {
  const allocation =
    allocateFoodExactBatchPhysicalInventoryCorrection(
      originalReconciliation(),
      [
        { batch: batches[0], packageCount: 1 },
        { batch: batches[1], packageCount: 2 },
        { batch: batches[2], packageCount: 3 },
      ],
    );

  return deriveFoodPhysicalInventoryCorrectionMovementCandidates(
    allocation,
    [
      {
        batch: batches[0],
        movementId: createFoodPhysicalInventoryMovementId("006z-movement-a"),
        occurredOn: "2026-10-15",
        attribution: "synthetic:operator",
        sourceReference: "synthetic:006z:a",
      },
      {
        batch: batches[1],
        movementId: createFoodPhysicalInventoryMovementId("006z-movement-b"),
        occurredOn: "2026-10-15",
        attribution: "synthetic:operator",
        sourceReference: "synthetic:006z:b",
      },
      {
        batch: batches[2],
        movementId: createFoodPhysicalInventoryMovementId("006z-movement-c"),
        occurredOn: "2026-10-15",
        attribution: "synthetic:operator",
        sourceReference: "synthetic:006z:c",
      },
    ],
  );
}

function verified006V(
  freshRecordedPackageBalance: number,
  omitEvidenceIndex?: number,
) {
  const candidate = candidateResult();
  assert.equal(candidate.outcome, "candidates");

  if (candidate.outcome !== "candidates") {
    throw new Error("expected candidates");
  }

  const ids = candidate.value.movements.map((movement) => movement.id);
  const sequences = [42, 44, 49];

  const movementIds = ids.map((id) => [id]);
  const evidence = ids.map((id, index) =>
    omitEvidenceIndex === index
      ? []
      : [{ evidenceSequence: sequences[index]!, movementId: id }],
  );

  const fresh = recordedValidation(
    freshRecordedPackageBalance,
    50,
    movementIds,
    evidence,
  ).value;

  const original = candidate.value.allocationPlan.reconciliation;
  const bookkeeping = reconcileFoodExactSkuPhysicalInventory(
    { outcome: "validated", value: fresh },
    original.countObservation,
  );

  return {
    outcome: "verified" as const,
    candidateBundle: candidate.value,
    originalReconciliation: original,
    recordedBalanceValidation: fresh,
    bookkeepingReconciliation: bookkeeping,
  };
}

import { validateFoodContinuedRecordedInventoryEvidenceFreshness } from "./continued-recorded-evidence-freshness-validation";
import type { FoodAuthoritativeInventoryReadPointD1Database, FoodAuthoritativeInventoryReadPointD1Statement } from "./authoritative-inventory-read-point-validation";
import { validateFoodExactSkuPhysicalCountObservationFreshness as validate } from "./exact-sku-physical-count-observation-freshness-validation";

async function evidence(observedAt = "2026-10-15T18:00:00Z", head = 50, negativeBatch = false) {
  const original = verified006V(16);
  if (negativeBatch) {
    original.recordedBalanceValidation.composition.recordedBalance.batches[0]!.recordedBalance.recordedPackageBalance = -1;
    original.recordedBalanceValidation.composition.recordedBalance.batches[1]!.recordedBalance.recordedPackageBalance = 10;
  }
  const v = JSON.parse(JSON.stringify(original), (key, value) => key === "observedAt" ? observedAt : value);
  const convergence = classifyFoodPostCorrectionRecordedBalanceConvergence(verifyFoodCorrectionMovementEvidenceInclusion(v));
  assert.equal(convergence.outcome, "converged");
  let reads = 0;
  const database: FoodAuthoritativeInventoryReadPointD1Database = {
    withSession(mode) {
      assert.equal(mode, "first-primary");
      return {
        prepare() {
          const statement: FoodAuthoritativeInventoryReadPointD1Statement = {
            bind(...bound) { assert.deepEqual(bound, [sku().id, 2]); return statement; },
            async all<T>() { reads += 1; return { results: [{ evidence_head: head } as unknown as T] }; },
          };
          return statement;
        },
        getBookmark() { return "synthetic:later-head"; },
      };
    },
  };
  const y = await validateFoodContinuedRecordedInventoryEvidenceFreshness(database, convergence);
  assert.equal(y.outcome, head === 50 ? "validated" : "stale");
  return { y, reads: () => reads };
}

function request(y: unknown, referenceTime = "2026-10-15T18:01:00Z", maxObservationAgeSeconds: unknown = 60) {
  return { freshnessValidationInput: y, referenceTime, maxObservationAgeSeconds };
}

function assertFrozen(value: unknown): void {
  if (value !== null && typeof value === "object") {
    assert(Object.isFrozen(value));
    Object.values(value).forEach(assertFrozen);
  }
}

for (const [age, max, expected] of [[59, 60, "fresh"], [60, 60, "fresh"], [61, 60, "stale"], [0, 0, "fresh"], [1, 0, "stale"]] as const) {
  test(`006Z explicit age ${age}, allowance ${max}: ${expected}`, async () => {
    const f = await evidence();
    const reference = age === 61 ? "2026-10-15T18:01:01Z" : age === 60 ? "2026-10-15T18:01:00Z" : `2026-10-15T18:00:${String(age).padStart(2, "0")}Z`;
    const result = validate(request(f.y, reference, max));
    assert.equal(result.outcome, expected);
    if (result.outcome !== "fresh" && result.outcome !== "stale") throw new Error("expected timing result");
    assert.deepEqual(result.sku, sku());
    assert.equal(result.referenceTime, reference);
    assert.equal(result.maxObservationAgeSeconds, max);
    assert.equal(result.observationAgeSeconds, age);
    assert.equal(result.physicalCountObservation.observedAt, "2026-10-15T18:00:00Z");
    assert.equal(result.physicalCountObservation.countedPackageCount, 16);
    assert.equal(result.physicalCountObservation.attribution, "synthetic:test-counter");
    assert.equal(result.physicalCountObservation.sourceReference, "synthetic:006z-count");
    assert.deepEqual(result.upstreamEvidenceFreshnessValidation, f.y);
    assertFrozen(result);
    assert.equal(f.reads(), 1, "Z adds no reads to the earlier Y acquisition");
  });
}

test("006Z observation after reference time is invalid, never clamped fresh", async () => {
  assert.deepEqual(validate(request((await evidence()).y, "2026-10-15T17:59:59Z", Number.MAX_SAFE_INTEGER)), { outcome: "invalid" });
});

for (const time of ["2026-02-29T12:00:00Z", "2026-04-31T12:00:00Z", "0000-01-01T00:00:00Z", "2026-10-15T24:00:00Z", "2026-10-15T18:01:00.000Z", "2026-10-15T18:01:00-05:00", "2026-10-15", " 2026-10-15T18:01:00Z", "2026-10-15T18:01:60Z"]) {
  test(`006Z rejects noncanonical reference ${time}`, async () => {
    assert.deepEqual(validate(request((await evidence()).y, time)), { outcome: "invalid" });
  });
}

for (const max of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "60", null]) {
  test(`006Z rejects allowance ${String(max)}`, async () => {
    assert.deepEqual(validate(request((await evidence()).y, undefined, max)), { outcome: "invalid" });
  });
}

test("006Z maximum safe allowance is exact and does not mean unlimited zero", async () => {
  const result = validate(request((await evidence()).y, undefined, Number.MAX_SAFE_INTEGER));
  assert.equal(result.outcome, "fresh");
  if (result.outcome !== "fresh") throw new Error("expected fresh");
  assert.equal(result.maxObservationAgeSeconds, Number.MAX_SAFE_INTEGER);
});

for (const [observedAt, referenceTime, age] of [
  ["0001-01-01T00:00:00Z", "0001-01-01T00:00:01Z", 1],
  ["0001-01-01T00:00:00Z", "9999-12-31T23:59:59Z", 315537897599],
  ["2024-02-28T23:59:59Z", "2024-03-01T00:00:00Z", 86401],
  ["2000-02-28T23:59:59Z", "2000-03-01T00:00:00Z", 86401],
  ["1900-02-28T23:59:59Z", "1900-03-01T00:00:00Z", 1],
  ["0099-12-31T23:59:59Z", "0100-01-01T00:00:00Z", 1],
] as const) {
  test(`006Z exact UTC-second arithmetic ${observedAt} through ${referenceTime}`, async () => {
    const result = validate(request((await evidence(observedAt)).y, referenceTime, age));
    assert.equal(result.outcome, "fresh");
    if (result.outcome !== "fresh") throw new Error("expected fresh");
    assert.equal(result.observationAgeSeconds, age);
  });
}

test("006Y validated can coexist with 006Z stale months after the physical observation", async () => {
  const f = await evidence("2026-01-01T00:00:00Z");
  assert.equal(f.y.outcome, "validated");
  const result = validate(request(f.y, "2026-10-15T00:00:00Z", 3600));
  assert.equal(result.outcome, "stale");
  if (result.outcome !== "stale") throw new Error("expected stale");
  assert.deepEqual(result.upstreamEvidenceFreshnessValidation, f.y);
  assert.equal(result.physicalCountObservation.observedAt, "2026-01-01T00:00:00Z");
  assert.equal(f.reads(), 1);
});

test("006Z canonical Y stale is ineligible; tampered stale is invalid", async () => {
  const f = await evidence(undefined, 51);
  assert.deepEqual(validate(request(f.y)), { outcome: "ineligible", upstreamOutcome: "stale" });
  if (f.y.outcome !== "stale") throw new Error("expected upstream stale");
  assert.deepEqual(validate(request({ ...f.y, laterExactSkuEvidenceHead: 50 })), { outcome: "invalid" });
  assert.equal(f.reads(), 1);
});

for (const input of [
  { outcome: "invalid" }, { outcome: "storage-failure" },
  ...["invalid", "ineligible", "no-correction-required", "not-converged"].map((upstreamOutcome) => ({ outcome: "ineligible", upstreamOutcome })),
]) {
  test(`006Z canonical Y negative envelope ${JSON.stringify(input)} is ineligible`, () => {
    assert.deepEqual(validate(request(input)), { outcome: "ineligible", upstreamOutcome: input.outcome });
  });
}

test("006Z rejects altered Y outer SKU, cutoff, head and acquisition identity", async () => {
  const f = await evidence();
  if (f.y.outcome !== "validated") throw new Error("expected validated");
  const y = f.y;
  for (const changed of [
    { ...y, sku: { ...y.sku, version: 3 } },
    { ...y, sku: { ...y.sku, id: createFoodSkuId("other") } },
    { ...y, convergenceCutoff: 49 }, { ...y, laterExactSkuEvidenceHead: 51 },
    { ...y, laterHeadAcquisition: { ...y.laterHeadAcquisition, value: { ...y.laterHeadAcquisition.value, sku: { ...y.sku, version: 3 } } } },
    { ...y, laterHeadAcquisition: { ...y.laterHeadAcquisition, value: { ...y.laterHeadAcquisition.value, bookmark: "" } } },
    { ...y, outcome: "stale" },
  ]) assert.deepEqual(validate(request(changed)), { outcome: "invalid" });
  assert.equal(f.reads(), 1);
});

for (const field of ["observedAt", "countedPackageCount", "sourceReference"] as const) {
  test(`006Z rejects tampered nested physical count ${field}`, async () => {
    const y = JSON.parse(JSON.stringify((await evidence()).y));
    const count = y.convergence.correctionInclusionVerification.postCorrectionVerification.bookkeepingReconciliation.countObservation;
    count[field] = field === "countedPackageCount" ? 17 : field === "observedAt" ? "2026-10-15T17:00:00Z" : "altered:source";
    assert.deepEqual(validate(request(y)), { outcome: "invalid" });
  });
}

test("006Z rejects malformed root/upstream and non-data input without invoking hooks", async () => {
  const f = await evidence();
  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  let getterCalls = 0;
  const accessor = Object.defineProperty({}, "outcome", { enumerable: true, get() { getterCalls += 1; return "validated"; } });
  for (const input of [null, [], {}, { ...request(f.y), extra: true },
    request({ outcome: "invalid", extra: true }), request({ outcome: "ineligible", upstreamOutcome: "fresh" }),
    request(accessor), request(cycle), request({ ...f.y, [Symbol("hidden")]: true }),
    request(Object.defineProperty({ outcome: "invalid" }, "extra", { value: 1 })),
    request({ ...f.y, toJSON() { throw new Error("must not invoke"); } }),
  ]) assert.deepEqual(validate(input), { outcome: "invalid" });
  assert.equal(getterCalls, 0);
});

test("006Z detached frozen deterministic result preserves deep canonical provenance", async () => {
  const y = JSON.parse(JSON.stringify((await evidence()).y));
  const expected = structuredClone(y);
  const result = validate(request(y));
  assert.deepEqual(validate(request(y)), result);
  assert.equal(result.outcome, "fresh");
  if (result.outcome !== "fresh") throw new Error("expected fresh");
  y.sku.version = 99;
  y.convergence.correctionInclusionVerification.postCorrectionVerification.bookkeepingReconciliation.countObservation.observedAt = "mutated";
  assert.deepEqual(result.upstreamEvidenceFreshnessValidation, expected);
  assert.notEqual(result.upstreamEvidenceFreshnessValidation, y);
  assert.equal(Object.isFrozen(y), false);
  assertFrozen(result);
});

test("006Z nested negative batch balances are preserved without clamping", async () => {
  const f = await evidence(undefined, 50, true);
  const result = validate(request(f.y));
  assert.equal(result.outcome, "fresh");
  if (result.outcome !== "fresh") throw new Error("expected fresh");
  const batchBalance = result.upstreamEvidenceFreshnessValidation.convergence.correctionInclusionVerification.postCorrectionVerification.recordedBalanceValidation.composition.recordedBalance.batches[0]!.recordedBalance.recordedPackageBalance;
  assert.equal(batchBalance, -1);
});

test("006Z explicit timestamps work while the wall clock is unavailable", async () => {
  const y = (await evidence()).y;
  const original = Date.now;
  Date.now = () => { throw new Error("clock must not be read"); };
  try { assert.equal(validate(request(y)).outcome, "fresh"); }
  finally { Date.now = original; }
});

test("006Z source is synchronous zero-read zero-write and grants no operational authority", async () => {
  const source = await readFile(new URL("./exact-sku-physical-count-observation-freshness-validation.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Date\.now\(|new Date\(|performance\.now\(|setTimeout\(|withSession\(|prepare\(|\b(?:SELECT|INSERT|UPDATE|DELETE)\b|Math\.random\(|crypto\.randomUUID\(|\basync\b|validateFoodContinuedRecordedInventoryEvidenceFreshness\(/);
  assert.doesNotMatch(source, /currentQoh:|capacity:|availablePackageCount:|sellablePackageCount:|reservablePackageCount:|availableToPromise:|reservationAuthority:|orderable:|checkoutReady:/);
  assert.deepEqual([...source.matchAll(/from "([^"]+)"/g)].map((match) => match[1]), ["./exact-sku-physical-count-observation-domain", "./post-correction-recorded-balance-convergence", "./continued-recorded-evidence-freshness-validation"]);
  const spec = JSON.parse(await readFile(new URL("../../../.river-dev/specifications/food-006z-exact-sku-physical-count-observation-freshness-validation.json", import.meta.url), "utf8"));
  assert.equal(spec.id, "FOOD-006Z");
  assert.equal(spec.startingHead, "fd16381d5b72b2ffcfc9289a25df07017271e7ea");
  assert.match(spec.outcomes.fresh, /supplied reference time/);
  assert.match(spec.outcomes.stale, /not.*count.*wrong/);
  assert(spec.doesNotEstablish.includes("current QOH"));
});
