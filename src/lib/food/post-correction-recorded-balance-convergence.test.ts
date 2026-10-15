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
    id: createFoodSkuId("006x-synthetic-sku"),
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
  batch("006x-batch-a"),
  batch("006x-batch-b"),
  batch("006x-batch-c"),
] as const;

function countObservation(countedPackageCount: number) {
  return {
    kind: FOOD_EXACT_SKU_PHYSICAL_COUNT_OBSERVATION_KIND,
    id: createFoodExactSkuPhysicalCountObservationId("006x-count"),
    sku: sku(),
    countScope: FOOD_EXACT_SKU_PHYSICAL_COUNT_SCOPE,
    countedPackageCount,
    observedAt: "2026-10-15T18:00:00Z",
    attribution: "synthetic:test-counter",
    sourceReference: "synthetic:006x-count",
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
          bookmark: `synthetic:006x-b1:${head}`,
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
          bookmark: `synthetic:006x-b2:${head}`,
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
        movementId: createFoodPhysicalInventoryMovementId("006x-movement-a"),
        occurredOn: "2026-10-15",
        attribution: "synthetic:operator",
        sourceReference: "synthetic:006x:a",
      },
      {
        batch: batches[1],
        movementId: createFoodPhysicalInventoryMovementId("006x-movement-b"),
        occurredOn: "2026-10-15",
        attribution: "synthetic:operator",
        sourceReference: "synthetic:006x:b",
      },
      {
        batch: batches[2],
        movementId: createFoodPhysicalInventoryMovementId("006x-movement-c"),
        occurredOn: "2026-10-15",
        attribution: "synthetic:operator",
        sourceReference: "synthetic:006x:c",
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

test("006X classifies verified inclusion plus bookkeeping agreement as converged", () => {
  const result =
    classifyFoodPostCorrectionRecordedBalanceConvergence(
      verified006W(16),
    );

  assert.equal(result.outcome, "converged");

  if (result.outcome !== "converged") {
    throw new Error("expected converged");
  }

  assert.equal(result.cutoff, 50);
  assert.equal(result.countedPackageCount, 16);
  assert.equal(result.recordedPackageBalance, 16);
  assert.equal(result.variancePackageCount, 0);
  assert.equal(result.inclusions.length, 3);
});

test("006X classifies count-over-recorded bookkeeping as not-converged", () => {
  const result =
    classifyFoodPostCorrectionRecordedBalanceConvergence(
      verified006W(15),
    );

  assert.equal(result.outcome, "not-converged");

  if (result.outcome !== "not-converged") {
    throw new Error("expected not-converged");
  }

  assert.equal(result.countedPackageCount, 16);
  assert.equal(result.recordedPackageBalance, 15);
  assert.equal(result.variancePackageCount, 1);
});

test("006X classifies count-under-recorded bookkeeping as not-converged", () => {
  const result =
    classifyFoodPostCorrectionRecordedBalanceConvergence(
      verified006W(17),
    );

  assert.equal(result.outcome, "not-converged");

  if (result.outcome !== "not-converged") {
    throw new Error("expected not-converged");
  }

  assert.equal(result.countedPackageCount, 16);
  assert.equal(result.recordedPackageBalance, 17);
  assert.equal(result.variancePackageCount, -1);
});

test("006X requires full 006W movement inclusion before convergence certification", () => {
  const missing = verifyFoodCorrectionMovementEvidenceInclusion(
    verified006V(16, 1),
  );

  assert.equal(missing.outcome, "missing-evidence");

  const result =
    classifyFoodPostCorrectionRecordedBalanceConvergence(missing);

  assert.deepEqual(result, {
    outcome: "ineligible",
    upstreamOutcome: "missing-evidence",
  });
});

test("006X preserves canonical no-correction-required without inventing convergence", () => {
  const result =
    classifyFoodPostCorrectionRecordedBalanceConvergence(
      noCorrection006W(),
    );

  assert.equal(result.outcome, "no-correction-required");

  if (result.outcome !== "no-correction-required") {
    throw new Error("expected no-correction-required");
  }

  assert.equal(result.reconciliation.status, "agreement");
  assert.equal(result.reconciliation.variancePackageCount, 0);
});

test("006X maps canonical 006W invalid and ineligible outcomes to ineligible", () => {
  assert.deepEqual(
    classifyFoodPostCorrectionRecordedBalanceConvergence({
      outcome: "invalid",
    }),
    {
      outcome: "ineligible",
      upstreamOutcome: "invalid",
    },
  );

  const upstream = verifyFoodCorrectionMovementEvidenceInclusion({
    outcome: "stale",
    exactSkuEvidenceHead: 51,
  });

  assert.deepEqual(
    classifyFoodPostCorrectionRecordedBalanceConvergence(upstream),
    {
      outcome: "ineligible",
      upstreamOutcome: "ineligible",
    },
  );
});

test("006X rejects tampered 006W cutoff before classification", () => {
  const verified = verified006W();

  const result =
    classifyFoodPostCorrectionRecordedBalanceConvergence({
      ...verified,
      cutoff: verified.cutoff + 1,
    });

  assert.deepEqual(result, { outcome: "invalid" });
});

test("006X rejects tampered 006W inclusion evidence before classification", () => {
  const verified = verified006W();
  const first = verified.inclusions[0];

  assert(first);

  const result =
    classifyFoodPostCorrectionRecordedBalanceConvergence({
      ...verified,
      inclusions: [
        {
          ...first,
          evidenceSequence: first.evidenceSequence - 1,
        },
        ...verified.inclusions.slice(1),
      ],
    });

  assert.deepEqual(result, { outcome: "invalid" });
});

test("006X rejects malformed result vocabulary instead of broadening authority", () => {
  assert.deepEqual(
    classifyFoodPostCorrectionRecordedBalanceConvergence({
      outcome: "invalid",
      extra: true,
    }),
    { outcome: "invalid" },
  );

  assert.deepEqual(
    classifyFoodPostCorrectionRecordedBalanceConvergence({
      outcome: "current-qoh",
    }),
    { outcome: "invalid" },
  );
});

test("006X output is frozen and preserves exact canonical 006W inclusion provenance", () => {
  const verified = verified006W();
  const result =
    classifyFoodPostCorrectionRecordedBalanceConvergence(verified);

  assert.equal(result.outcome, "converged");

  if (result.outcome !== "converged") {
    throw new Error("expected converged");
  }

  assert(Object.isFrozen(result));
  assert(Object.isFrozen(result.sku));
  assert(Object.isFrozen(result.inclusions));
  assert.deepEqual(
    result.correctionInclusionVerification,
    verified,
  );
  assert.deepEqual(result.inclusions, verified.inclusions);
  assert(Object.isFrozen(result.correctionInclusionVerification));
});

test("006X source is pure and adds no persistence, fresh read, physical-truth or operational authority", async () => {
  const source = await readFile(
    new URL(
      "./post-correction-recorded-balance-convergence.ts",
      import.meta.url,
    ),
    "utf8",
  );

  for (const required of [
    "verifyFoodCorrectionMovementEvidenceInclusion",
    "bookkeepingReconciliation",
    "countedPackageCount",
    "recordedPackageBalance",
    "variancePackageCount",
    "converged",
    "not-converged",
  ]) {
    assert.equal(source.includes(required), true);
  }

  for (const forbidden of [
    "withSession(",
    "prepare(",
    "database.",
    "appendFoodPhysicalInventoryMovement",
    "SELECT ",
    "INSERT ",
    "UPDATE ",
    "DELETE ",
    "Date.now",
    "new Date",
    "crypto.randomUUID",
    "currentQoh:",
    "availableToPromise:",
    "reservationAuthority:",
    "checkoutReady:",
    "paymentReady:",
  ]) {
    assert.equal(source.includes(forbidden), false);
  }
});
