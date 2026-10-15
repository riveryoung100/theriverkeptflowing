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
    id: createFoodSkuId("006y-synthetic-sku"),
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
  batch("006y-batch-a"),
  batch("006y-batch-b"),
  batch("006y-batch-c"),
] as const;

function countObservation(countedPackageCount: number) {
  return {
    kind: FOOD_EXACT_SKU_PHYSICAL_COUNT_OBSERVATION_KIND,
    id: createFoodExactSkuPhysicalCountObservationId("006y-count"),
    sku: sku(),
    countScope: FOOD_EXACT_SKU_PHYSICAL_COUNT_SCOPE,
    countedPackageCount,
    observedAt: "2026-10-15T18:00:00Z",
    attribution: "synthetic:test-counter",
    sourceReference: "synthetic:006y-count",
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
          bookmark: `synthetic:006y-b1:${head}`,
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
          bookmark: `synthetic:006y-b2:${head}`,
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
        movementId: createFoodPhysicalInventoryMovementId("006y-movement-a"),
        occurredOn: "2026-10-15",
        attribution: "synthetic:operator",
        sourceReference: "synthetic:006y:a",
      },
      {
        batch: batches[1],
        movementId: createFoodPhysicalInventoryMovementId("006y-movement-b"),
        occurredOn: "2026-10-15",
        attribution: "synthetic:operator",
        sourceReference: "synthetic:006y:b",
      },
      {
        batch: batches[2],
        movementId: createFoodPhysicalInventoryMovementId("006y-movement-c"),
        occurredOn: "2026-10-15",
        attribution: "synthetic:operator",
        sourceReference: "synthetic:006y:c",
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

function verified006W(freshRecordedPackageBalance = 16) {
  const result = verifyFoodCorrectionMovementEvidenceInclusion(
    verified006V(freshRecordedPackageBalance),
  );

  assert.equal(result.outcome, "verified");

  if (result.outcome !== "verified") {
    throw new Error("expected verified FOOD-006W result");
  }

  return result;
}

function noCorrection006W() {
  const reconciliation = reconcileFoodExactSkuPhysicalInventory(
    recordedValidation(10, 41),
    countObservation(10),
  );

  const result = verifyFoodCorrectionMovementEvidenceInclusion({
    outcome: "no-correction-required",
    reconciliation,
  });

  assert.equal(result.outcome, "no-correction-required");

  if (result.outcome !== "no-correction-required") {
    throw new Error("expected no-correction FOOD-006W result");
  }

  return result;
}

import { validateFoodContinuedRecordedInventoryEvidenceFreshness as validate } from "./continued-recorded-evidence-freshness-validation";
import type { FoodAuthoritativeInventoryReadPointD1Database, FoodAuthoritativeInventoryReadPointD1Statement } from "./authoritative-inventory-read-point-validation";

function convergence(balance = 16) {
  return classifyFoodPostCorrectionRecordedBalanceConvergence(verified006W(balance));
}

function fixture(head: unknown = 50, bookmark: string | null = "later:opaque", fail = false) {
  let reads = 0;
  let sessions = 0;
  let bindings: readonly unknown[] = [];
  const database: FoodAuthoritativeInventoryReadPointD1Database = {
    withSession(mode) {
      sessions += 1;
      assert.equal(mode, "first-primary");
      return {
        prepare(sql) {
          assert.equal(sql, "SELECT MAX(evidence_sequence) AS evidence_head FROM food_inventory_evidence_sequence WHERE sku_id COLLATE BINARY = ? AND sku_version = ?");
          const statement: FoodAuthoritativeInventoryReadPointD1Statement = {
            bind(...values) { bindings = values; return statement; },
            async all<T>() {
              reads += 1;
              if (fail) throw new Error("synthetic failure");
              return { results: [{ evidence_head: head } as unknown as T] };
            },
          };
          return statement;
        },
        getBookmark() { return bookmark; },
      };
    },
  };
  return { database, reads: () => reads, sessions: () => sessions, bindings: () => bindings };
}

function frozen(value: unknown): void {
  if (value !== null && typeof value === "object") {
    assert(Object.isFrozen(value));
    Object.values(value).forEach(frozen);
  }
}

test("006Y unchanged head validates once with exact SKU and complete provenance", async () => {
  const input = convergence();
  const f = fixture();
  const result = await validate(f.database, input);
  assert.equal(result.outcome, "validated");
  if (result.outcome !== "validated") throw new Error("expected validated");
  assert.deepEqual(result.sku, sku());
  assert.equal(result.convergenceCutoff, 50);
  assert.equal(result.laterExactSkuEvidenceHead, 50);
  assert.deepEqual(result.convergence, input);
  assert.deepEqual(result.laterHeadAcquisition, { outcome: "acquired", value: { sku: sku(), exactSkuEvidenceHead: 50, bookmark: "later:opaque" } });
  assert.deepEqual(f.bindings(), [sku().id, sku().version]);
  assert.equal(f.reads(), 1);
  assert.equal(f.sessions(), 1);
  frozen(result);
});

test("006Y advanced evidence is stale while historical convergence remains intact", async () => {
  const input = convergence();
  const f = fixture(57);
  const result = await validate(f.database, input);
  assert.equal(result.outcome, "stale");
  if (result.outcome !== "stale") throw new Error("expected stale");
  assert.equal(result.laterExactSkuEvidenceHead, 57);
  assert.deepEqual(result.convergence, input);
  assert.equal(f.reads(), 1);
});

for (const head of [49, null]) {
  test(`006Y regressed head ${String(head)} is storage-failure`, async () => {
    const f = fixture(head);
    assert.deepEqual(await validate(f.database, convergence()), { outcome: "storage-failure" });
    assert.equal(f.reads(), 1);
  });
}

test("006Y rejects tampered cutoff, SKU, comparison and nested W/V before storage", async () => {
  const base = convergence();
  assert.equal(base.outcome, "converged");
  if (base.outcome !== "converged") throw new Error("expected converged");
  const w = base.correctionInclusionVerification;
  const v = w.postCorrectionVerification;
  const inputs = [
    { ...base, cutoff: 51 },
    { ...base, sku: { ...base.sku, id: createFoodSkuId("other") } },
    { ...base, sku: { ...base.sku, version: 3 } },
    { ...base, countedPackageCount: 17 },
    { ...base, correctionInclusionVerification: { ...w, cutoff: 51 } },
    { ...base, correctionInclusionVerification: { ...w, postCorrectionVerification: { ...v, bookkeepingReconciliation: { ...v.bookkeepingReconciliation, variancePackageCount: 1 } } } },
  ];
  const f = fixture();
  for (const input of inputs) assert.deepEqual(await validate(f.database, input), { outcome: "invalid" });
  assert.equal(f.sessions(), 0);
});

for (const balance of [15, 17, -2]) {
  test(`006Y canonical not-converged ${balance} is ineligible without clamping`, async () => {
    const input = convergence(balance);
    assert.equal(input.outcome, "not-converged");
    if (input.outcome !== "not-converged") throw new Error("expected not-converged");
    assert.equal(input.recordedPackageBalance, balance);
    const f = fixture();
    assert.deepEqual(await validate(f.database, input), { outcome: "ineligible", upstreamOutcome: "not-converged" });
    assert.equal(f.sessions(), 0);
  });
}

test("006Y canonical no-correction is ineligible; tampered agreement is invalid", async () => {
  const input = classifyFoodPostCorrectionRecordedBalanceConvergence(noCorrection006W());
  assert.equal(input.outcome, "no-correction-required");
  if (input.outcome !== "no-correction-required") throw new Error("expected agreement");
  const f = fixture();
  assert.deepEqual(await validate(f.database, input), { outcome: "ineligible", upstreamOutcome: "no-correction-required" });
  assert.deepEqual(await validate(f.database, { ...input, reconciliation: { ...input.reconciliation, countedPackageCount: 11 } }), { outcome: "invalid" });
  assert.equal(f.sessions(), 0);
});

test("006Y canonical negative envelopes are ineligible without storage", async () => {
  const f = fixture();
  for (const input of [{ outcome: "invalid" }, ...["invalid", "ineligible", "missing-evidence"].map((upstreamOutcome) => ({ outcome: "ineligible", upstreamOutcome }))]) {
    assert.deepEqual(await validate(f.database, input), { outcome: "ineligible", upstreamOutcome: input.outcome });
  }
  assert.equal(f.sessions(), 0);
});

test("006Y malformed envelopes, symbols, hidden fields, hooks and cycles are invalid", async () => {
  const cycle: Record<string, unknown> = { outcome: "invalid" };
  cycle.self = cycle;
  const f = fixture();
  for (const input of [null, [], {}, { outcome: "current" }, { outcome: "invalid", extra: true },
    { outcome: "ineligible", upstreamOutcome: "stale" },
    { ...convergence(), [Symbol("extra")]: true },
    Object.defineProperty({ outcome: "invalid" }, "extra", { value: true }),
    Object.defineProperty({}, "outcome", { enumerable: true, get() { throw new Error("must not invoke"); } }),
    { ...convergence(), toJSON() { return convergence(); } }, cycle,
  ]) assert.deepEqual(await validate(f.database, input), { outcome: "invalid" });
  assert.equal(f.sessions(), 0);
});

for (const [name, head, bookmark, fail] of [
  ["query exception", 50, "opaque", true],
  ["invalid numeric zero", 0, "opaque", false],
  ["missing bookmark", 50, null, false],
  ["advanced head missing bookmark", 51, null, false],
] as const) {
  test(`006Y canonical N1 failure: ${name}`, async () => {
    const f = fixture(head, bookmark, fail);
    assert.deepEqual(await validate(f.database, convergence()), { outcome: "storage-failure" });
    assert.equal(f.reads(), 1);
    assert.equal(f.sessions(), 1);
  });
}

test("006Y later exact selector preserves ID and version; N1 originates returned SKU from request", async () => {
  const f = fixture();
  const result = await validate(f.database, convergence());
  assert.deepEqual(f.bindings(), [sku().id, 2]);
  assert.equal(result.outcome, "validated");
  if (result.outcome !== "validated") throw new Error("expected validated");
  assert.deepEqual(result.laterHeadAcquisition.value.sku, sku());
  // N1 never reads a SKU field from storage; no adapter-returned identity can replace this selector.
});

test("006Y bookmark differences have no freshness meaning", async () => {
  for (const bookmark of ["synthetic:006y-b2:50", "different:opaque", " "]) {
    const result = await validate(fixture(50, bookmark).database, convergence());
    assert.equal(result.outcome, "validated");
    if (result.outcome !== "validated") throw new Error("expected validated");
    assert.equal(result.laterHeadAcquisition.value.bookmark, bookmark);
  }
});

test("006Y detaches nested provenance before await and freezes output without freezing caller", async () => {
  const input = JSON.parse(JSON.stringify(convergence()));
  const expected = structuredClone(input);
  const pending = validate(fixture().database, input);
  input.sku.version = 99;
  input.correctionInclusionVerification.postCorrectionVerification.recordedBalanceValidation.composition.acquisition.bookmark = "mutated";
  const result = await pending;
  assert.equal(result.outcome, "validated");
  if (result.outcome !== "validated") throw new Error("expected validated");
  assert.deepEqual(result.convergence, expected);
  assert.notEqual(result.convergence, input);
  frozen(result);
  assert.equal(Object.isFrozen(input), false);
  assert.equal(Object.isFrozen(input.correctionInclusionVerification), false);
});

test("006Y preserves negative batch provenance within canonical converged aggregate", async () => {
  const v = verified006V(16);
  const balances = v.recordedBalanceValidation.composition.recordedBalance.batches;
  balances[0]!.recordedBalance.recordedPackageBalance = -1;
  balances[1]!.recordedBalance.recordedPackageBalance = 10;
  const x = classifyFoodPostCorrectionRecordedBalanceConvergence(verifyFoodCorrectionMovementEvidenceInclusion(v));
  assert.equal(x.outcome, "converged");
  const result = await validate(fixture().database, x);
  assert.equal(result.outcome, "validated");
  if (result.outcome !== "validated") throw new Error("expected validated");
  assert.equal(result.convergence.correctionInclusionVerification.postCorrectionVerification.recordedBalanceValidation.composition.recordedBalance.batches[0]!.recordedBalance.recordedPackageBalance, -1);
});

test("006Y source/spec enforce canonical dependencies and bounded nonphysical authority", async () => {
  const source = await readFile(new URL("./continued-recorded-evidence-freshness-validation.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /withSession\(|prepare\(|\b(?:SELECT|INSERT|UPDATE|DELETE)\b|appendFoodPhysicalInventoryMovement|Date\.now|new Date|crypto\.randomUUID|Math\.random|currentQoh:|availableToPromise:|reservationAuthority:|checkoutReady:|paymentReady:/);
  assert.deepEqual([...source.matchAll(/from "([^"]+)"/g)].map((match) => match[1]), ["./authoritative-inventory-evidence-head-acquisition", "./authoritative-inventory-read-point-validation", "./post-correction-recorded-balance-convergence"]);
  const spec = JSON.parse(await readFile(new URL("../../../.river-dev/specifications/food-006y-continued-recorded-evidence-freshness-validation.json", import.meta.url), "utf8"));
  assert.equal(spec.id, "FOOD-006Y");
  assert.match(spec.safeStatement, /later authoritative head check/);
  assert.match(spec.latestStateMeaning, /bounded check/);
  assert(spec.doesNotEstablish.includes("perpetual currentness"));
  assert.match(spec.outcomes.stale, /not.*balance.*wrong/);
});
