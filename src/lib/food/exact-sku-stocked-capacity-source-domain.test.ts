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

import {
  deriveFoodPhysicalInventoryCorrectionMovementCandidates,
} from "./physical-inventory-correction-movement-candidates";

import {
  createFoodPhysicalInventoryMovementId,
} from "./physical-inventory-movement-domain";

import {
  createFoodProductionBatchId,
} from "./production-batch-domain";

import {
  verifyFoodCorrectionMovementEvidenceInclusion,
} from "./correction-movement-evidence-inclusion-verification";

import {
  classifyFoodPostCorrectionRecordedBalanceConvergence,
} from "./post-correction-recorded-balance-convergence";

import {
  deriveFoodExactSkuStockedCapacitySourceCandidate,
} from "./exact-sku-stocked-capacity-source-candidate";

import { createFoodSkuId } from "./package-sku-domain";

import {
  FOOD_EXACT_SKU_STOCKED_CAPACITY_SOURCE_KIND,
  deriveFoodExactSkuStockedCapacitySourceRevisionFromCandidate,
  serializeFoodExactSkuStockedCapacitySourceRevision,
  validateFoodExactSkuStockedCapacitySourceRevision,
} from "./exact-sku-stocked-capacity-source-domain";

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

function durableFixture(
  revision = 1,
  capacityUnits = 12,
) {
  return {
    kind:
      FOOD_EXACT_SKU_STOCKED_CAPACITY_SOURCE_KIND,

    sku: {
      id: createFoodSkuId(
        "007b-domain-synthetic-sku",
      ),
      version: 2,
    },

    revision,
    capacityUnits,
    attribution: "synthetic:007b-test",
    sourceReference:
      `synthetic:007b-source:${revision}`,
  };
}

test(
  "007B durable source accepts zero and maximum safe capacity",
  () => {
    assert.equal(
      validateFoodExactSkuStockedCapacitySourceRevision(
        durableFixture(1, 0),
      ).capacityUnits,
      0,
    );

    assert.equal(
      validateFoodExactSkuStockedCapacitySourceRevision(
        durableFixture(
          1,
          Number.MAX_SAFE_INTEGER,
        ),
      ).capacityUnits,
      Number.MAX_SAFE_INTEGER,
    );
  },
);

test(
  "007B rejects negative noninteger unsafe or coerced capacity",
  () => {
    for (const capacityUnits of [
      -1,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
      NaN,
      Infinity,
      "12",
      null,
      undefined,
    ]) {
      assert.throws(() =>
        validateFoodExactSkuStockedCapacitySourceRevision({
          ...durableFixture(),
          capacityUnits,
        }),
      );
    }
  },
);

test(
  "007B durable source revision is a positive safe integer",
  () => {
    for (const revision of [
      0,
      -1,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
      NaN,
      Infinity,
      "1",
      null,
    ]) {
      assert.throws(() =>
        validateFoodExactSkuStockedCapacitySourceRevision({
          ...durableFixture(),
          revision,
        }),
      );
    }

    assert.equal(
      validateFoodExactSkuStockedCapacitySourceRevision(
        durableFixture(
          Number.MAX_SAFE_INTEGER,
        ),
      ).revision,
      Number.MAX_SAFE_INTEGER,
    );
  },
);

test(
  "007B attribution and source reference are explicit bounded unpadded text",
  () => {
    for (const field of [
      "attribution",
      "sourceReference",
    ] as const) {
      for (const bad of [
        "",
        " padded",
        "padded ",
        "x".repeat(513),
        7,
        null,
        undefined,
      ]) {
        assert.throws(() =>
          validateFoodExactSkuStockedCapacitySourceRevision({
            ...durableFixture(),
            [field]: bad,
          }),
        );
      }

      assert.doesNotThrow(() =>
        validateFoodExactSkuStockedCapacitySourceRevision({
          ...durableFixture(),
          [field]: "x".repeat(512),
        }),
      );
    }
  },
);

test(
  "007B rejects hidden and additional fields",
  () => {
    assert.throws(() =>
      validateFoodExactSkuStockedCapacitySourceRevision({
        ...durableFixture(),
        extra: true,
      }),
    );

    assert.throws(() =>
      validateFoodExactSkuStockedCapacitySourceRevision({
        ...durableFixture(),
        sku: {
          ...durableFixture().sku,
          extra: true,
        },
      }),
    );
  },
);

test(
  "007B serialization is deterministic canonical durable-row equality",
  () => {
    const value =
      validateFoodExactSkuStockedCapacitySourceRevision(
        durableFixture(),
      );

    assert.equal(
      serializeFoodExactSkuStockedCapacitySourceRevision(
        value,
      ),
      JSON.stringify({
        kind:
          FOOD_EXACT_SKU_STOCKED_CAPACITY_SOURCE_KIND,
        sku: {
          id: value.sku.id,
          version: value.sku.version,
        },
        revision: value.revision,
        capacityUnits: value.capacityUnits,
        attribution: value.attribution,
        sourceReference: value.sourceReference,
      }),
    );

    assert.ok(Object.isFrozen(value));
    assert.ok(Object.isFrozen(value.sku));
  },
);

test(
  "007B derives a durable revision through canonical fresh 006Z and canonical 007A",
  async () => {
    const f = await evidence();
    const y = f.y;

    assert.equal(
      y.outcome,
      "validated",
    );

    if (y.outcome !== "validated") {
      throw new Error(
        "expected canonical FOOD-006Y validated evidence",
      );
    }

    const z =
      validate(
        request(y),
      );

    assert.equal(
      z.outcome,
      "fresh",
    );

    if (z.outcome !== "fresh") {
      throw new Error(
        "expected canonical FOOD-006Z fresh result",
      );
    }

    assert.equal(
      z.observationAgeSeconds,
      60,
    );

    const candidate =
      deriveFoodExactSkuStockedCapacitySourceCandidate(
        z,
      );

    assert.equal(
      candidate.outcome,
      "candidate",
    );

    if (candidate.outcome !== "candidate") {
      throw new Error(
        "expected canonical FOOD-007A candidate",
      );
    }

    assert.deepEqual(
      candidate.value.sku,
      sku(),
    );

    assert.equal(
      candidate.value.capacityUnits,
      16,
    );

    assert.deepEqual(
      candidate.value
        .physicalCountObservationFreshnessValidation,
      z,
    );

    const revision =
      deriveFoodExactSkuStockedCapacitySourceRevisionFromCandidate(
        {
          candidate:
            candidate.value,
          revision: 1,
          attribution:
            "synthetic:007b-positive",
          sourceReference:
            "synthetic:007b-positive",
        },
      );

    assert.deepEqual(
      revision.sku,
      sku(),
    );

    assert.equal(
      revision.revision,
      1,
    );

    assert.equal(
      revision.capacityUnits,
      16,
    );

    assert.equal(
      revision.attribution,
      "synthetic:007b-positive",
    );

    assert.equal(
      revision.sourceReference,
      "synthetic:007b-positive",
    );

    assert.ok(
      Object.isFrozen(revision),
    );

    assert.ok(
      Object.isFrozen(revision.sku),
    );
  },
);

test(
  "007B candidate derivation fails closed on forged candidate input",
  () => {
    assert.throws(() =>
      deriveFoodExactSkuStockedCapacitySourceRevisionFromCandidate({
        candidate: {
          kind:
            "exact-sku-stocked-capacity-source-candidate",
          sku: durableFixture().sku,
          capacityUnits: 12,
          physicalCountObservationFreshnessValidation: {
            outcome: "invalid",
          },
        },
        revision: 1,
        attribution: "synthetic:test",
        sourceReference: "synthetic:test",
      }),
    );
  },
);

test(
  "007B source replays FOOD-007A and adds no runtime operational authority",
  async () => {
    const source = await readFile(
      new URL(
        "./exact-sku-stocked-capacity-source-domain.ts",
        import.meta.url,
      ),
      "utf8",
    );

    assert.match(
      source,
      /deriveFoodExactSkuStockedCapacitySourceCandidate/,
    );

    assert.match(
      source,
      /physicalCountObservationFreshnessValidation/,
    );

    assert.doesNotMatch(
      source,
      /D1Database|database\.prepare|fetch\s*\(|process\.env|Date\.now|new Date|Math\.random|crypto\.randomUUID/,
    );

    assert.doesNotMatch(
      source,
      /\bquantityOnHand\s*:|\bcurrentQoh\s*:|\bavailableStock\s*:|\breservableQuantity\s*:|\bavailableToPromise\s*:|\borderable\s*:|\bcheckoutReady\s*:|\bpaymentReady\s*:/,
    );
  },
);
