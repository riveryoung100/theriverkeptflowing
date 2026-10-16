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

import { deriveFoodExactSkuStockedCapacitySourceRevisionFromCandidate } from "./exact-sku-stocked-capacity-source-domain";

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

import {
  appendFoodExactSkuStockedCapacitySourceRevision,
  type FoodExactSkuStockedCapacityD1Database,
  type FoodExactSkuStockedCapacityD1Result,
  type FoodExactSkuStockedCapacityD1Statement,
} from "./d1-exact-sku-stocked-capacity-source-persistence";

type Row = {
  sku_id: string;
  sku_version: number;
  revision: number;
  capacity_units: number;
  attribution: string;
  source_reference: string;
};

async function writeRequest(revision = 1, overrides: Partial<{ attribution: string; sourceReference: string }> = {}) {
  const f = await evidence();
  const z = validate(request(f.y));
  assert.equal(z.outcome, "fresh");
  const candidate = deriveFoodExactSkuStockedCapacitySourceCandidate(z);
  assert.equal(candidate.outcome, "candidate");
  if (candidate.outcome !== "candidate") throw new Error("expected canonical candidate");
  return { candidate: candidate.value, revision, attribution: "synthetic:persistence",
    sourceReference: `synthetic:persistence:${revision}`, ...overrides };
}

class Statement
implements FoodExactSkuStockedCapacityD1Statement {
  readonly #database: Database;
  readonly #sql: string;
  #values: readonly (string | number)[] = [];

  constructor(
    database: Database,
    sql: string,
  ) {
    this.#database = database;
    this.#sql = sql;
  }

  bind(
    ...values: readonly (string | number)[]
  ): FoodExactSkuStockedCapacityD1Statement {
    this.#values = values;
    return this;
  }

  async all<T>():
    Promise<FoodExactSkuStockedCapacityD1Result<T>> {
    const result =
      this.#database.execute(
        this.#sql,
        this.#values,
      );

    return result as
      FoodExactSkuStockedCapacityD1Result<T>;
  }
}

class Database
implements FoodExactSkuStockedCapacityD1Database {
  rows: Row[] = [];
  reads = 0;
  inserts = 0;

  failExact = false;
  failLatest = false;
  failInsert = false;
  raceSame = false;
  raceDivergent = false;
  raceMalformed = false;
  raceReadFailure = false;

  prepare(
    sql: string,
  ): FoodExactSkuStockedCapacityD1Statement {
    return new Statement(
      this,
      sql,
    );
  }

  execute(
    sql: string,
    values: readonly (string | number)[],
  ): FoodExactSkuStockedCapacityD1Result<Row> {
    const normalized =
      sql.replace(/\s+/g, " ").trim();

    if (
      normalized.startsWith("SELECT") &&
      normalized.includes("revision = ?")
    ) {
      this.reads++;

      if (this.failExact) {
        throw new Error(
          "synthetic exact read failure",
        );
      }

      const [
        skuId,
        skuVersion,
        revision,
      ] = values;

      return {
        success: true,
        results:
          this.rows.filter(
            (candidate) =>
              candidate.sku_id === skuId &&
              candidate.sku_version === skuVersion &&
              candidate.revision === revision,
          ),
      };
    }

    if (
      normalized.startsWith("SELECT") &&
      normalized.includes("ORDER BY revision DESC")
    ) {
      this.reads++;

      if (this.failLatest) {
        throw new Error(
          "synthetic latest read failure",
        );
      }

      const [
        skuId,
        skuVersion,
      ] = values;

      const matches =
        this.rows
          .filter(
            (candidate) =>
              candidate.sku_id === skuId &&
              candidate.sku_version === skuVersion,
          )
          .sort(
            (left, right) =>
              right.revision -
              left.revision,
          );

      return {
        success: true,
        results:
          matches.length === 0
            ? []
            : [matches[0]],
      };
    }

    if (
      normalized.startsWith(
        "INSERT INTO food_sku_capacity_sources",
      )
    ) {
      this.inserts++;

      const proposed: Row = {
        sku_id: String(values[0]),
        sku_version: Number(values[1]),
        revision: Number(values[2]),
        capacity_units: Number(values[3]),
        attribution: String(values[4]),
        source_reference: String(values[5]),
      };

      if (this.raceSame || this.raceDivergent || this.raceMalformed || this.raceReadFailure) {
        this.raceSame = false;

        this.rows.push({
          ...proposed,
          attribution: this.raceDivergent ? "synthetic:race-other" : proposed.attribution,
          capacity_units: this.raceMalformed ? -1 : proposed.capacity_units,
        });
        if (this.raceReadFailure) this.failExact = true;

        throw new Error(
          "synthetic unique race",
        );
      }

      if (this.failInsert) {
        throw new Error(
          "synthetic insert failure",
        );
      }

      const conflict =
        this.rows.some(
          (candidate) =>
            candidate.sku_id ===
              proposed.sku_id &&
            candidate.sku_version ===
              proposed.sku_version &&
            candidate.revision ===
              proposed.revision,
        );

      if (conflict) {
        throw new Error(
          "synthetic unique conflict",
        );
      }

      this.rows.push({
        ...proposed,
      });

      return {
        success: true,
        results: [
          {
            ...proposed,
          },
        ],
      };
    }

    throw new Error(
      `unexpected SQL: ${normalized}`,
    );
  }
}

test(
  "007B initial revision creates and exact retry is already-present",
  async () => {
    const database = new Database();

    const first =
      await appendFoodExactSkuStockedCapacitySourceRevision(
        database,
        await writeRequest(1),
      );

    assert.equal(
      first.outcome,
      "created",
    );

    assert.equal(
      database.rows.length,
      1,
    );

    const retry =
      await appendFoodExactSkuStockedCapacitySourceRevision(
        database,
        await writeRequest(1),
      );

    assert.equal(
      retry.outcome,
      "already-present",
    );

    assert.equal(
      database.rows.length,
      1,
    );
  },
);

test(
  "007B divergent same revision conflicts",
  async () => {
    const database = new Database();

    assert.equal(
      (
        await appendFoodExactSkuStockedCapacitySourceRevision(
          database,
          await writeRequest(1),
        )
      ).outcome,
      "created",
    );

    assert.equal(
      (
        await appendFoodExactSkuStockedCapacitySourceRevision(
          database,
          await writeRequest(1, {
            sourceReference: "different-source",
          }),
        )
      ).outcome,
      "conflict",
    );

    assert.equal(
      (
        await appendFoodExactSkuStockedCapacitySourceRevision(
          database,
          await writeRequest(1, {
            attribution: "different",
          }),
        )
      ).outcome,
      "conflict",
    );

    assert.equal(
      (
        await appendFoodExactSkuStockedCapacitySourceRevision(
          database,
          await writeRequest(1, {
            sourceReference:
              "different",
          }),
        )
      ).outcome,
      "conflict",
    );
  },
);

test(
  "007B revisions must be strictly consecutive",
  async () => {
    const database = new Database();

    assert.equal(
      (
        await appendFoodExactSkuStockedCapacitySourceRevision(
          database,
          await writeRequest(2),
        )
      ).outcome,
      "conflict",
    );

    assert.equal(
      (
        await appendFoodExactSkuStockedCapacitySourceRevision(
          database,
          await writeRequest(1),
        )
      ).outcome,
      "created",
    );

    assert.equal(
      (
        await appendFoodExactSkuStockedCapacitySourceRevision(
          database,
          await writeRequest(3),
        )
      ).outcome,
      "conflict",
    );

    assert.equal(
      (
        await appendFoodExactSkuStockedCapacitySourceRevision(
          database,
          await writeRequest(2),
        )
      ).outcome,
      "created",
    );
  },
);

test(
  "007B same numeric capacity may be asserted in a new consecutive revision",
  async () => {
    const database = new Database();

    assert.equal(
      (
        await appendFoodExactSkuStockedCapacitySourceRevision(
          database,
          await writeRequest(1),
        )
      ).outcome,
      "created",
    );

    assert.equal(
      (
        await appendFoodExactSkuStockedCapacitySourceRevision(
          database,
          await writeRequest(2, {
            attribution: "synthetic:later",
          }),
        )
      ).outcome,
      "created",
    );
  },
);

test("007B forged requests and direct durable bypass perform zero DB access", async () => {
  const canonical = await writeRequest();
  const durable = deriveFoodExactSkuStockedCapacitySourceRevisionFromCandidate(canonical);
  for (const input of [durable, { ...durable, capacityUnits: -1 },
    { ...canonical, candidate: {} },
    { ...canonical, candidate: { ...canonical.candidate, capacityUnits: 17 } },
    { ...canonical, candidate: { ...canonical.candidate, physicalCountObservationFreshnessValidation: { outcome: "stale" } } },
    { ...canonical, sku: durable.sku }, { ...canonical, capacityUnits: durable.capacityUnits },
    { ...canonical, revision: Number.MAX_SAFE_INTEGER + 1 }]) {
    const database = new Database();
    assert.deepEqual(await appendFoodExactSkuStockedCapacitySourceRevision(database, input), { outcome: "invalid" });
    assert.equal(database.reads, 0);
    assert.equal(database.inserts, 0);
  }
});

test(
  "007B storage read failures fail closed",
  async () => {
    const exactDatabase =
      new Database();

    exactDatabase.failExact = true;

    assert.equal(
      (
        await appendFoodExactSkuStockedCapacitySourceRevision(
          exactDatabase,
          await writeRequest(1),
        )
      ).outcome,
      "storage-failure",
    );

    const latestDatabase =
      new Database();

    latestDatabase.failLatest = true;

    assert.equal(
      (
        await appendFoodExactSkuStockedCapacitySourceRevision(
          latestDatabase,
          await writeRequest(1),
        )
      ).outcome,
      "storage-failure",
    );
  },
);

test(
  "007B insert race resolves through exact durable reread",
  async () => {
    const database = new Database();
    database.raceSame = true;

    const result =
      await appendFoodExactSkuStockedCapacitySourceRevision(
        database,
        await writeRequest(1),
      );

    assert.equal(
      result.outcome,
      "already-present",
    );

    assert.equal(
      database.rows.length,
      1,
    );
  },
);

test(
  "007B uncertain failed insert without durable row is storage-failure",
  async () => {
    const database = new Database();
    database.failInsert = true;

    const result =
      await appendFoodExactSkuStockedCapacitySourceRevision(
        database,
        await writeRequest(1),
      );

    assert.equal(
      result.outcome,
      "storage-failure",
    );
  },
);

test(
  "007B persistence is immutable append-only and grants no reservation semantics",
  async () => {
    const source = await readFile(
      new URL(
        "./d1-exact-sku-stocked-capacity-source-persistence.ts",
        import.meta.url,
      ),
      "utf8",
    );

    assert.match(
      source,
      /food_sku_capacity_sources/,
    );
    const publicSource = source.slice(source.indexOf("export async function appendFood"));
    assert.match(source, /import\s*\{[^}]*deriveFoodExactSkuStockedCapacitySourceRevisionFromCandidate/s);
    const gate = publicSource.indexOf("deriveFoodExactSkuStockedCapacitySourceRevisionFromCandidate(");
    assert.ok(gate >= 0 && gate < publicSource.indexOf("await readExact("));
    assert.match(source, /AND revision = \?/);
    assert.equal((source.match(/await attemptInsert\(/g) ?? []).length, 1);


    assert.match(
      source,
      /ORDER BY revision DESC/,
    );

    assert.match(
      source,
      /INSERT INTO food_sku_capacity_sources/,
    );

    assert.doesNotMatch(
      source,
      /\bUPDATE\s+food_sku_capacity_sources\b|\bDELETE\s+FROM\s+food_sku_capacity_sources\b/,
    );

    assert.doesNotMatch(
      source,
      /food_capacity_reservations|food_capacity_reservation_lines|food_fulfillment_slot_reservations/,
    );

    assert.doesNotMatch(
      source,
      /Date\.now|new Date|Math\.random|crypto\.randomUUID|fetch\s*\(|process\.env/,
    );
  },
);

test("007B insert race rejects divergent malformed and unreadable durable rows", async () => {
  for (const mode of ["raceDivergent", "raceMalformed", "raceReadFailure"] as const) {
    const database = new Database();
    database[mode] = true;
    const result = await appendFoodExactSkuStockedCapacitySourceRevision(database, await writeRequest());
    assert.equal(result.outcome, mode === "raceDivergent" ? "conflict" : "storage-failure");
    assert.equal(database.inserts, 1);
    assert.equal(database.reads, 3);
  }
});

test("007B maximum historical revision retries without unsafe successor arithmetic", async () => {
  const database = new Database();
  const input = await writeRequest(Number.MAX_SAFE_INTEGER);
  const durable = deriveFoodExactSkuStockedCapacitySourceRevisionFromCandidate(input);
  database.rows.push({ sku_id: durable.sku.id, sku_version: durable.sku.version,
    revision: durable.revision, capacity_units: durable.capacityUnits,
    attribution: durable.attribution, source_reference: durable.sourceReference });
  assert.equal((await appendFoodExactSkuStockedCapacitySourceRevision(database, input)).outcome, "already-present");
  assert.equal((await appendFoodExactSkuStockedCapacitySourceRevision(database,
    { ...input, revision: Number.MAX_SAFE_INTEGER + 1 })).outcome, "invalid");
  assert.equal(database.inserts, 0);
});
