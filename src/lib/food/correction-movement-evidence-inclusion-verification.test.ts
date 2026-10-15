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

function sku() {
  return {
    id: createFoodSkuId("006w-synthetic-sku"),
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
  batch("006w-batch-a"),
  batch("006w-batch-b"),
  batch("006w-batch-c"),
] as const;

function countObservation(countedPackageCount: number) {
  return {
    kind: FOOD_EXACT_SKU_PHYSICAL_COUNT_OBSERVATION_KIND,
    id: createFoodExactSkuPhysicalCountObservationId("006w-count"),
    sku: sku(),
    countScope: FOOD_EXACT_SKU_PHYSICAL_COUNT_SCOPE,
    countedPackageCount,
    observedAt: "2026-10-15T18:00:00Z",
    attribution: "synthetic:test-counter",
    sourceReference: "synthetic:006w-count",
  };
}

function oldRecordedValidation(recordedPackageBalance: number) {
  const exactSku = sku();
  const head = 41;
  const balances = [3, 3, recordedPackageBalance - 6];

  return {
    outcome: "validated" as const,
    value: {
      composition: {
        acquisition: {
          sku: exactSku,
          exactSkuEvidenceHead: head,
          bookmark: "synthetic:006w-old-b1",
        },
        recordedBalance: {
          kind: "food-lossless-grouped-inventory-recorded-balance",
          sku: exactSku,
          cutoff: head,
          batches: batches.map((exactBatch, index) => ({
            productionBatchEvidenceSequence: index + 1,
            batch: exactBatch,
            movements: [],
            recordedBalance: {
              kind: "food-production-batch-recorded-physical-balance",
              batch: exactBatch,
              sku: exactSku,
              recordedPackageBalance: balances[index]!,
              movementIds: [],
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
          bookmark: "synthetic:006w-old-b2",
        },
      },
    },
  };
}

function originalReconciliation() {
  return reconcileFoodExactSkuPhysicalInventory(
    oldRecordedValidation(10),
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
        movementId: createFoodPhysicalInventoryMovementId("006w-movement-a"),
        occurredOn: "2026-10-15",
        attribution: "synthetic:operator",
        sourceReference: "synthetic:006w:a",
      },
      {
        batch: batches[1],
        movementId: createFoodPhysicalInventoryMovementId("006w-movement-b"),
        occurredOn: "2026-10-15",
        attribution: "synthetic:operator",
        sourceReference: "synthetic:006w:b",
      },
      {
        batch: batches[2],
        movementId: createFoodPhysicalInventoryMovementId("006w-movement-c"),
        occurredOn: "2026-10-15",
        attribution: "synthetic:operator",
        sourceReference: "synthetic:006w:c",
      },
    ],
  );
}

type FreshOptions = Readonly<{
  omitIndex?: number;
  wrongBatchIndex?: number;
  sequenceBeyondCutoffIndex?: number;
  reverseBatchOrder?: boolean;
  includeUnrelated?: boolean;
}>;

function freshRecordedValidation(options: FreshOptions = {}) {
  const candidate = candidateResult();
  assert.equal(candidate.outcome, "candidates");

  if (candidate.outcome !== "candidates") {
    throw new Error("expected candidates");
  }

  const exactSku = sku();
  const cutoff = 50;
  const freshBalances = [4, 5, 7];
  const sequences = [42, 44, 49];

  let compositions = batches.map((exactBatch, index) => {
    const movement = candidate.value.movements[index]!;
    const movementIds = [movement.id];
    const provenance: Array<{
      evidenceSequence: number;
      movementId: typeof movement.id;
    }> = [];

    if (options.omitIndex !== index) {
      provenance.push({
        evidenceSequence:
          options.sequenceBeyondCutoffIndex === index
            ? cutoff + 1
            : sequences[index]!,
        movementId: movement.id,
      });
    }

    if (options.includeUnrelated && index === 0) {
      provenance.push({
        evidenceSequence: 43,
        movementId:
          createFoodPhysicalInventoryMovementId("006w-unrelated"),
      });
      movementIds.push(
        createFoodPhysicalInventoryMovementId("006w-unrelated"),
      );
    }

    return {
      productionBatchEvidenceSequence: index + 1,
      batch: exactBatch,
      movements: provenance,
      recordedBalance: {
        kind: "food-production-batch-recorded-physical-balance",
        batch: exactBatch,
        sku: exactSku,
        recordedPackageBalance: freshBalances[index]!,
        movementIds,
      },
    };
  });

  if (options.wrongBatchIndex !== undefined) {
    const index = options.wrongBatchIndex;
    const source = compositions[index]!;
    const destination = compositions[(index + 1) % compositions.length]!;
    const moved = source.movements[0];

    source.movements = source.movements.slice(1);

    if (moved !== undefined) {
      destination.movements = [
        ...destination.movements,
        moved,
      ];
    }
  }

  if (options.reverseBatchOrder) {
    compositions = [...compositions].reverse();
  }

  return {
    composition: {
      acquisition: {
        sku: exactSku,
        exactSkuEvidenceHead: cutoff,
        bookmark: "synthetic:006w-fresh-b1",
      },
      recordedBalance: {
        kind: "food-lossless-grouped-inventory-recorded-balance",
        sku: exactSku,
        cutoff,
        batches: compositions,
        skuBalance: {
          kind: "food-sku-recorded-physical-balance",
          sku: exactSku,
          recordedPackageBalance: 16,
          batchReferences: [...batches],
        },
      },
    },
    readPoint: {
      kind: "food-authoritative-inventory-read-point",
      sku: exactSku,
      composedCutoff: cutoff,
      exactSkuEvidenceHead: cutoff,
      consistencyToken: {
        sku: exactSku,
        composedCutoff: cutoff,
        exactSkuEvidenceHead: cutoff,
        bookmark: "synthetic:006w-fresh-b2",
      },
    },
  };
}

function verified006V(options: FreshOptions = {}) {
  const candidate = candidateResult();
  assert.equal(candidate.outcome, "candidates");

  if (candidate.outcome !== "candidates") {
    throw new Error("expected candidates");
  }

  const fresh = freshRecordedValidation(options);
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

function noCorrection006V() {
  const reconciliation = reconcileFoodExactSkuPhysicalInventory(
    oldRecordedValidation(10),
    countObservation(10),
  );

  return {
    outcome: "no-correction-required" as const,
    reconciliation,
  };
}

test("006W verifies every canonical correction movement from bounded 006P provenance", () => {
  const result =
    verifyFoodCorrectionMovementEvidenceInclusion(verified006V());

  assert.equal(result.outcome, "verified");

  if (result.outcome !== "verified") {
    throw new Error("expected verified");
  }

  assert.equal(result.cutoff, 50);
  assert.equal(result.inclusions.length, 3);
  assert.deepEqual(
    result.inclusions.map((item) => item.evidenceSequence),
    [42, 44, 49],
  );
  assert.deepEqual(
    result.inclusions.map((item) => item.movementId),
    result.postCorrectionVerification.candidateBundle.movements.map(
      (movement) => movement.id,
    ),
  );
});

test("006W reports missing evidence without claiming full inclusion", () => {
  const result =
    verifyFoodCorrectionMovementEvidenceInclusion(
      verified006V({ omitIndex: 1 }),
    );

  assert.equal(result.outcome, "missing-evidence");

  if (result.outcome !== "missing-evidence") {
    throw new Error("expected missing-evidence");
  }

  assert.equal(result.inclusions.length, 2);
  assert.equal(result.missing.length, 1);
  assert.equal(result.missing[0]?.index, 1);
});

test("006W requires movement evidence on the exact candidate batch", () => {
  const result =
    verifyFoodCorrectionMovementEvidenceInclusion(
      verified006V({ wrongBatchIndex: 0 }),
    );

  assert.deepEqual(result, { outcome: "invalid" });
});

test("006W rejects movement provenance beyond the validated cutoff", () => {
  const result =
    verifyFoodCorrectionMovementEvidenceInclusion(
      verified006V({ sequenceBeyondCutoffIndex: 2 }),
    );

  assert.deepEqual(result, { outcome: "invalid" });
});

test("006W tolerates nonconsecutive correction evidence sequences and unrelated interleaving", () => {
  const result =
    verifyFoodCorrectionMovementEvidenceInclusion(
      verified006V({ includeUnrelated: true }),
    );

  assert.equal(result.outcome, "verified");

  if (result.outcome !== "verified") {
    throw new Error("expected verified");
  }

  assert.deepEqual(
    result.inclusions.map((item) => item.evidenceSequence),
    [42, 44, 49],
  );
});

test("006W inclusion is independent of fresh composition batch ordering", () => {
  const result =
    verifyFoodCorrectionMovementEvidenceInclusion(
      verified006V({ reverseBatchOrder: true }),
    );

  assert.equal(result.outcome, "verified");

  if (result.outcome !== "verified") {
    throw new Error("expected verified");
  }

  assert.deepEqual(
    result.inclusions.map((item) => item.index),
    [0, 1, 2],
  );
});

test("006W no-correction preserves agreement and requires no inclusion proof", () => {
  const result =
    verifyFoodCorrectionMovementEvidenceInclusion(
      noCorrection006V(),
    );

  assert.equal(result.outcome, "no-correction-required");

  if (result.outcome !== "no-correction-required") {
    throw new Error("expected no-correction-required");
  }

  assert.equal(result.reconciliation.status, "agreement");
  assert.equal(result.reconciliation.variancePackageCount, 0);
});

test("006W non-verified 006V outcomes are ineligible", () => {
  assert.deepEqual(
    verifyFoodCorrectionMovementEvidenceInclusion({
      outcome: "stale",
      exactSkuEvidenceHead: 51,
    }),
    {
      outcome: "ineligible",
      upstreamOutcome: "stale",
    },
  );

  assert.deepEqual(
    verifyFoodCorrectionMovementEvidenceInclusion({
      outcome: "storage-failure",
    }),
    {
      outcome: "ineligible",
      upstreamOutcome: "storage-failure",
    },
  );
});

test("006W rejects tampered candidate bundle before inclusion projection", () => {
  const source = verified006V();
  const movements = [
    source.candidateBundle.movements[1],
    source.candidateBundle.movements[0],
    source.candidateBundle.movements[2],
  ];

  const result =
    verifyFoodCorrectionMovementEvidenceInclusion({
      ...source,
      candidateBundle: {
        ...source.candidateBundle,
        movements,
      },
    });

  assert.deepEqual(result, { outcome: "invalid" });
});

test("006W rejects tampered bookkeeping reconciliation", () => {
  const source = verified006V();

  const result =
    verifyFoodCorrectionMovementEvidenceInclusion({
      ...source,
      bookkeepingReconciliation: {
        ...source.bookkeepingReconciliation,
        variancePackageCount: 999,
      },
    });

  assert.deepEqual(result, { outcome: "invalid" });
});

test("006W output is frozen and retains canonical 006V provenance", () => {
  const result =
    verifyFoodCorrectionMovementEvidenceInclusion(verified006V());

  assert.equal(result.outcome, "verified");

  if (result.outcome !== "verified") {
    throw new Error("expected verified");
  }

  assert(Object.isFrozen(result));
  assert(Object.isFrozen(result.sku));
  assert(Object.isFrozen(result.inclusions));
  assert(Object.isFrozen(result.inclusions[0]));
  assert(Object.isFrozen(result.postCorrectionVerification));
});

test("006W source is a pure projection over 006V and performs no database or operational action", async () => {
  const source = await readFile(
    new URL(
      "./correction-movement-evidence-inclusion-verification.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /recordedBalance\.batches/);
  assert.match(source, /movement\.evidenceSequence/);
  assert.match(source, /movement\.movementId/);
  assert.match(source, /candidateBundle\.movements/);
  assert.match(source, /sequence > cutoff/);

  assert.doesNotMatch(
    source,
    /withSession\s*\(|prepare\s*\(|database\.|appendFoodPhysicalInventoryMovement|fetch\s*\(/,
  );

  assert.doesNotMatch(
    source,
    /\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bSELECT\b/,
  );

  assert.doesNotMatch(
    source,
    /Date\.now|new Date|crypto\.randomUUID|Math\.random/,
  );

  assert.doesNotMatch(
    source,
    /\bcurrentQoh\s*:|\bavailableToPromise\s*:|\breservationAuthority\s*:|\bcheckoutReady\s*:|\bpaymentReady\s*:/,
  );
});
