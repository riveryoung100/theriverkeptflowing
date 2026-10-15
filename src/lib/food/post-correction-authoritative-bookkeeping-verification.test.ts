import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type {
  FoodAuthoritativeInventoryReadPointD1Database,
  FoodAuthoritativeInventoryReadPointD1Result,
  FoodAuthoritativeInventoryReadPointD1Session,
  FoodAuthoritativeInventoryReadPointD1Statement,
} from "./authoritative-inventory-read-point-validation";
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
import {
  verifyFoodPostCorrectionAuthoritativeBookkeeping,
} from "./post-correction-authoritative-bookkeeping-verification";
import { createFoodProductionBatchId } from "./production-batch-domain";

function sku() {
  return {
    id: createFoodSkuId("006v-synthetic-sku"),
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
  batch("006v-batch-a"),
  batch("006v-batch-b"),
  batch("006v-batch-c"),
] as const;

function countObservation(countedPackageCount: number) {
  return {
    kind: FOOD_EXACT_SKU_PHYSICAL_COUNT_OBSERVATION_KIND,
    id: createFoodExactSkuPhysicalCountObservationId("006v-count"),
    sku: sku(),
    countScope: FOOD_EXACT_SKU_PHYSICAL_COUNT_SCOPE,
    countedPackageCount,
    observedAt: "2026-10-15T18:00:00Z",
    attribution: "synthetic:test-counter",
    sourceReference: "synthetic:006v-count",
  };
}

function recordedValidation(recordedPackageBalance: number) {
  const exactSku = sku();
  const head = 41;
  const firstBalance = Math.trunc(recordedPackageBalance / 3);
  const secondBalance = Math.trunc(recordedPackageBalance / 3);
  const thirdBalance =
    recordedPackageBalance - firstBalance - secondBalance;

  const balances = [
    firstBalance,
    secondBalance,
    thirdBalance,
  ];

  const perBatch = batches.map((exactBatch, index) => ({
    productionBatchEvidenceSequence: index + 1,
    batch: exactBatch,
    movements: [],
    recordedBalance: {
      kind: "food-production-batch-recorded-physical-balance",
      batch: exactBatch,
      sku: exactSku,
      recordedPackageBalance: balances[index]!,
      movementReferences: [],
    },
  }));

  return {
    outcome: "validated" as const,
    value: {
      composition: {
        acquisition: {
          sku: exactSku,
          exactSkuEvidenceHead: head,
          bookmark: "synthetic:006v-old-b1",
        },
        recordedBalance: {
          kind: "food-lossless-grouped-inventory-recorded-balance",
          sku: exactSku,
          cutoff: head,
          batches: perBatch,
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
          bookmark: "synthetic:006v-old-b2",
        },
      },
    },
  };
}

function reconciliation(
  recordedPackageBalance: number,
  countedPackageCount: number,
) {
  return reconcileFoodExactSkuPhysicalInventory(
    recordedValidation(recordedPackageBalance),
    countObservation(countedPackageCount),
  );
}

function candidateResult() {
  const allocation =
    allocateFoodExactBatchPhysicalInventoryCorrection(
      reconciliation(10, 16),
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
        movementId: createFoodPhysicalInventoryMovementId("006v-movement-a"),
        occurredOn: "2026-10-15",
        attribution: "synthetic:operator",
        sourceReference: "synthetic:006v:a",
      },
      {
        batch: batches[1],
        movementId: createFoodPhysicalInventoryMovementId("006v-movement-b"),
        occurredOn: "2026-10-15",
        attribution: "synthetic:operator",
        sourceReference: "synthetic:006v:b",
      },
      {
        batch: batches[2],
        movementId: createFoodPhysicalInventoryMovementId("006v-movement-c"),
        occurredOn: "2026-10-15",
        attribution: "synthetic:operator",
        sourceReference: "synthetic:006v:c",
      },
    ],
  );
}

function completedPersistence(
  resultOutcome: "created" | "already-present" = "created",
) {
  const candidate = candidateResult();

  assert.equal(candidate.outcome, "candidates");
  if (candidate.outcome !== "candidates") {
    throw new Error("expected candidates");
  }

  return Object.freeze({
    outcome: "completed" as const,
    candidateBundle: candidate.value,
    attempts: Object.freeze(
      candidate.value.movements.map((movement, index) =>
        Object.freeze({
          index,
          movement,
          result: Object.freeze({
            outcome: resultOutcome,
            value: movement,
          }),
        }),
      ),
    ),
  });
}

function noCorrectionPersistence() {
  const allocation =
    allocateFoodExactBatchPhysicalInventoryCorrection(
      reconciliation(10, 10),
      [],
    );

  const candidateResult =
    deriveFoodPhysicalInventoryCorrectionMovementCandidates(
      allocation,
      [],
    );

  assert.equal(candidateResult.outcome, "no-correction-required");

  return Object.freeze({
    outcome: "no-correction-required" as const,
    candidateResult,
  });
}

function freshReadDatabase(
  head2 = 0,
  bookmark2: string | null = "bookmark:006v-fresh-b2",
) {
  const calls: string[] = [];
  let primary = 0;

  const primarySession = (
    head: number,
    bookmark: string,
    label: string,
  ): FoodAuthoritativeInventoryReadPointD1Session => {
    const statement: FoodAuthoritativeInventoryReadPointD1Statement = {
      bind(...values: readonly unknown[]) {
        calls.push(`${label}:bind:${values.join("|")}`);
        return statement;
      },
      async all<T = Record<string, unknown>>()
        : Promise<FoodAuthoritativeInventoryReadPointD1Result<T>> {
        calls.push(`${label}:all`);
        return {
          success: true,
          results: [
            {
              evidence_head: head === 0 ? null : head,
            } as unknown as T,
          ],
        };
      },
    };

    return {
      prepare(sql: string) {
        calls.push(`${label}:prepare:${sql}`);
        return statement;
      },
      getBookmark() {
        calls.push(`${label}:bookmark`);
        return bookmark;
      },
    };
  };

  const database: FoodAuthoritativeInventoryReadPointD1Database = {
    withSession(selector?: string) {
      calls.push(`session:${selector ?? ""}`);

      if (selector === "first-primary") {
        primary += 1;

        if (primary === 1) {
          return primarySession(
            0,
            "bookmark:006v-fresh-b1",
            "006o",
          );
        }

        if (primary === 2) {
          return primarySession(
            head2,
            bookmark2 ?? "",
            "006p",
          );
        }

        throw new Error("unexpected primary session");
      }

      if (selector === "bookmark:006v-fresh-b1") {
        return {
          prepare() {
            throw new Error(
              "H=0 reconstruction must not query storage",
            );
          },
          getBookmark() {
            return "bookmark:006v-fresh-b1";
          },
        };
      }

      throw new Error(`unexpected session:${selector ?? ""}`);
    },
  };

  return { database, calls };
}

test("006V no-correction preserves upstream reconciliation with zero database access", async () => {
  const source = noCorrectionPersistence();
  let calls = 0;

  const database: FoodAuthoritativeInventoryReadPointD1Database = {
    withSession() {
      calls += 1;
      throw new Error("database must not be touched");
    },
  };

  const result =
    await verifyFoodPostCorrectionAuthoritativeBookkeeping(
      database,
      source,
    );

  assert.equal(result.outcome, "no-correction-required");
  assert.equal(calls, 0);

  if (result.outcome !== "no-correction-required") {
    throw new Error("expected no-correction-required");
  }

  assert.equal(result.reconciliation.status, "agreement");
  assert.equal(result.reconciliation.variancePackageCount, 0);
});

test("006V completed correction performs fresh 006P and mechanical 006R against historical count", async () => {
  const source = completedPersistence();
  const fresh = freshReadDatabase();

  const result =
    await verifyFoodPostCorrectionAuthoritativeBookkeeping(
      fresh.database,
      source,
    );

  assert.equal(result.outcome, "verified");

  if (result.outcome !== "verified") {
    throw new Error("expected verified");
  }

  assert.equal(
    fresh.calls.filter((call) => call === "session:first-primary").length,
    2,
  );
  assert.equal(
    result.originalReconciliation.countedPackageCount,
    16,
  );
  assert.equal(
    result.bookkeepingReconciliation.countedPackageCount,
    16,
  );
  assert.equal(
    result.bookkeepingReconciliation.recordedPackageBalance,
    0,
  );
  assert.equal(
    result.bookkeepingReconciliation.variancePackageCount,
    16,
  );
  assert.equal(
    result.bookkeepingReconciliation.status,
    "count-over-recorded",
  );
  assert.equal(
    result.bookkeepingReconciliation.countObservation.observedAt,
    result.originalReconciliation.countObservation.observedAt,
  );
  assert.equal(
    result.bookkeepingReconciliation.countObservation.id,
    result.originalReconciliation.countObservation.id,
  );
});

test("006V accepts idempotent already-present completion without requiring head advance", async () => {
  const source = completedPersistence("already-present");
  const fresh = freshReadDatabase();

  const result =
    await verifyFoodPostCorrectionAuthoritativeBookkeeping(
      fresh.database,
      source,
    );

  assert.equal(result.outcome, "verified");
});

test("006V propagates fresh 006P stale without bookkeeping reconciliation", async () => {
  const source = completedPersistence();
  const fresh = freshReadDatabase(1);

  const result =
    await verifyFoodPostCorrectionAuthoritativeBookkeeping(
      fresh.database,
      source,
    );

  assert.deepEqual(result, {
    outcome: "stale",
    exactSkuEvidenceHead: 1,
  });
});

test("006V maps fresh authoritative read failure to storage-failure", async () => {
  const source = completedPersistence();
  const fresh = freshReadDatabase(0, null);

  const result =
    await verifyFoodPostCorrectionAuthoritativeBookkeeping(
      fresh.database,
      source,
    );

  assert.deepEqual(result, { outcome: "storage-failure" });
});

test("006V blocked upstream result is ineligible and performs zero database access", async () => {
  const source = completedPersistence();
  const last = source.attempts[1]!;
  let calls = 0;

  const blocked = {
    outcome: "blocked",
    candidateBundle: source.candidateBundle,
    attempts: source.attempts.slice(0, 2),
    blocking: last,
    remaining: [
      {
        index: 2,
        movementId: source.candidateBundle.movements[2]!.id,
        batch: source.candidateBundle.movements[2]!.batch,
      },
    ],
  };

  const database: FoodAuthoritativeInventoryReadPointD1Database = {
    withSession() {
      calls += 1;
      throw new Error("database must not be touched");
    },
  };

  const result =
    await verifyFoodPostCorrectionAuthoritativeBookkeeping(
      database,
      blocked,
    );

  assert.deepEqual(result, {
    outcome: "ineligible",
    upstreamOutcome: "blocked",
  });
  assert.equal(calls, 0);
});

test("006V upstream invalid result is ineligible with zero database access", async () => {
  let calls = 0;

  const database: FoodAuthoritativeInventoryReadPointD1Database = {
    withSession() {
      calls += 1;
      throw new Error("database must not be touched");
    },
  };

  const result =
    await verifyFoodPostCorrectionAuthoritativeBookkeeping(
      database,
      { outcome: "invalid" },
    );

  assert.deepEqual(result, {
    outcome: "ineligible",
    upstreamOutcome: "invalid",
  });
  assert.equal(calls, 0);
});

test("006V rejects a completed result containing a blocking writer outcome before database access", async () => {
  const source = completedPersistence();
  let calls = 0;

  const tampered = {
    ...source,
    attempts: [
      source.attempts[0],
      {
        ...source.attempts[1],
        result: { outcome: "conflict" },
      },
      source.attempts[2],
    ],
  };

  const database: FoodAuthoritativeInventoryReadPointD1Database = {
    withSession() {
      calls += 1;
      throw new Error("database must not be touched");
    },
  };

  const result =
    await verifyFoodPostCorrectionAuthoritativeBookkeeping(
      database,
      tampered,
    );

  assert.deepEqual(result, { outcome: "invalid" });
  assert.equal(calls, 0);
});

test("006V rejects tampered or reordered candidate bundle before database access", async () => {
  const source = completedPersistence();
  let calls = 0;

  const tampered = {
    ...source,
    candidateBundle: {
      ...source.candidateBundle,
      movements: [
        source.candidateBundle.movements[1],
        source.candidateBundle.movements[0],
        source.candidateBundle.movements[2],
      ],
    },
  };

  const database: FoodAuthoritativeInventoryReadPointD1Database = {
    withSession() {
      calls += 1;
      throw new Error("database must not be touched");
    },
  };

  const result =
    await verifyFoodPostCorrectionAuthoritativeBookkeeping(
      database,
      tampered,
    );

  assert.deepEqual(result, { outcome: "invalid" });
  assert.equal(calls, 0);
});

test("006V verified output is frozen and preserves canonical provenance", async () => {
  const source = completedPersistence();
  const fresh = freshReadDatabase();

  const result =
    await verifyFoodPostCorrectionAuthoritativeBookkeeping(
      fresh.database,
      source,
    );

  assert.equal(result.outcome, "verified");
  if (result.outcome !== "verified") {
    throw new Error("expected verified");
  }

  assert(Object.isFrozen(result));
  assert(Object.isFrozen(result.candidateBundle));
  assert(Object.isFrozen(result.originalReconciliation));
  assert(Object.isFrozen(result.recordedBalanceValidation));
  assert(Object.isFrozen(result.bookkeepingReconciliation));
  assert.deepEqual(
    result.candidateBundle,
    source.candidateBundle,
  );
});

test("006V source uses only canonical 006P plus canonical 006R and grants no new operational authority", async () => {
  const source = await readFile(
    new URL(
      "./post-correction-authoritative-bookkeeping-verification.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    source,
    /validateFoodAuthoritativeRecordedInventoryBalanceAtReadPoint/,
  );
  assert.match(
    source,
    /reconcileFoodExactSkuPhysicalInventory/,
  );
  assert.match(
    source,
    /deriveFoodPhysicalInventoryCorrectionMovementCandidates/,
  );

  assert.doesNotMatch(
    source,
    /appendFoodPhysicalInventoryMovement|database\.batch|\.transaction\s*\(|withSession\s*\(|prepare\s*\(/,
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
