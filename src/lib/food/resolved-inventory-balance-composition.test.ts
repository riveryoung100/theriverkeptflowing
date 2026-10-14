import assert from "node:assert/strict";
import test from "node:test";

import {
  FOOD_INVENTORY_EVIDENCE_MANIFEST_KIND,
} from "./inventory-evidence-provenance-domain";
import {
  FOOD_RESOLVED_INVENTORY_EVIDENCE_KIND,
} from "./inventory-evidence-manifest-resolution";
import {
  FOOD_RESOLVED_INVENTORY_RECORDED_BALANCE_COMPOSITION_KIND,
  projectFoodResolvedInventoryEvidenceRecordedBalance,
} from "./resolved-inventory-balance-composition";
import {
  createFoodSkuId,
} from "./package-sku-domain";
import {
  createFoodProductionBatchId,
  FOOD_PRODUCTION_BATCH_KIND,
} from "./production-batch-domain";
import {
  createFoodPhysicalInventoryMovementId,
} from "./physical-inventory-movement-domain";

const skuId =
  createFoodSkuId(
    "synthetic-006f-sku",
  );

const otherSkuId =
  createFoodSkuId(
    "synthetic-006f-other-sku",
  );

const batchA =
  createFoodProductionBatchId(
    "synthetic-006f-batch-a",
  );

const batchB =
  createFoodProductionBatchId(
    "synthetic-006f-batch-b",
  );

const movementA =
  createFoodPhysicalInventoryMovementId(
    "synthetic-006f-movement-a",
  );

const movementB =
  createFoodPhysicalInventoryMovementId(
    "synthetic-006f-movement-b",
  );

function productionBatch(
  id:
    typeof batchA,
  version:
    number,
  producedPackageCount:
    number,
  sku:
    typeof skuId =
      skuId,
) {
  return {
    kind:
      FOOD_PRODUCTION_BATCH_KIND,
    id,
    version,
    sku: {
      id:
        sku,
      version:
        2,
    },
    batchCode:
      `SYN-${version}`,
    storageMode:
      "refrigerated",
    producedPackageCount,
    preparedOn:
      "2026-10-14",
    attribution:
      "synthetic:test",
    sourceReference:
      `synthetic:${id}:${version}`,
  };
}

function movement(
  id:
    typeof movementA,
  batch:
    Readonly<{
      id:
        typeof batchA;
      version:
        number;
    }>,
  movementType:
    "adjustment-in" |
    "adjustment-out" |
    "waste",
  packageCount:
    number,
  sku:
    typeof skuId =
      skuId,
) {
  return {
    kind:
      "food-physical-inventory-movement",
    id,
    batch: {
      id:
        batch.id,
      version:
        batch.version,
    },
    sku: {
      id:
        sku,
      version:
        2,
    },
    movementType,
    packageCount,
    occurredOn:
      "2026-10-14",
    attribution:
      "synthetic:test",
    sourceReference:
      `synthetic:${id}`,
  };
}

function input() {
  return {
    kind:
      FOOD_RESOLVED_INVENTORY_EVIDENCE_KIND,

    manifest: {
      kind:
        FOOD_INVENTORY_EVIDENCE_MANIFEST_KIND,

      sku: {
        id:
          skuId,
        version:
          2,
      },

      batches: [
        {
          batch: {
            id:
              batchA,
            version:
              1,
          },
          movementIds: [
            movementA,
          ],
        },
        {
          batch: {
            id:
              batchB,
            version:
              3,
          },
          movementIds: [
            movementB,
          ],
        },
      ],

      provenance: {
        attribution:
          "synthetic:test",
        sourceReference:
          "synthetic:006f-manifest",
      },
    },

    batches: [
      {
        batch:
          productionBatch(
            batchA,
            1,
            10,
          ),

        movements: [
          movement(
            movementA,
            {
              id:
                batchA,
              version:
                1,
            },
            "adjustment-out",
            3,
          ),
        ],
      },
      {
        batch:
          productionBatch(
            batchB,
            3,
            4,
          ),

        movements: [
          movement(
            movementB,
            {
              id:
                batchB,
              version:
                3,
            },
            "adjustment-in",
            2,
          ),
        ],
      },
    ],
  };
}

test("resolved evidence projects every batch through 005Z and aggregates through 006A", () => {
  const result =
    projectFoodResolvedInventoryEvidenceRecordedBalance(
      input(),
    );

  assert.equal(
    result.kind,
    FOOD_RESOLVED_INVENTORY_RECORDED_BALANCE_COMPOSITION_KIND,
  );

  assert.deepEqual(
    result.batchBalances.map(
      value => ({
        batch:
          value.batch,
        balance:
          value.recordedPackageBalance,
      }),
    ),
    [
      {
        batch: {
          id:
            batchA,
          version:
            1,
        },
        balance:
          7,
      },
      {
        batch: {
          id:
            batchB,
          version:
            3,
        },
        balance:
          6,
      },
    ],
  );

  assert.equal(
    result.skuBalance.recordedPackageBalance,
    13,
  );

  assert.deepEqual(
    result.skuBalance.sku,
    {
      id:
        skuId,
      version:
        2,
    },
  );
});

test("empty resolved evidence produces exact-SKU recorded balance zero", () => {
  const value =
    input();

  value.manifest.batches =
    [];

  value.batches =
    [];

  const result =
    projectFoodResolvedInventoryEvidenceRecordedBalance(
      value,
    );

  assert.deepEqual(
    result.batchBalances,
    [],
  );

  assert.equal(
    result.skuBalance.recordedPackageBalance,
    0,
  );
});

test("batch without movements retains production baseline through 005Z", () => {
  const value =
    input();

  value.manifest.batches =
    [
      {
        batch: {
          id:
            batchA,
          version:
            1,
        },
        movementIds:
          [],
      },
    ];

  value.batches =
    [
      {
        batch:
          productionBatch(
            batchA,
            1,
            10,
          ),
        movements:
          [],
      },
    ];

  const result =
    projectFoodResolvedInventoryEvidenceRecordedBalance(
      value,
    );

  assert.equal(
    result.batchBalances[0]!
      .recordedPackageBalance,
    10,
  );

  assert.equal(
    result.skuBalance.recordedPackageBalance,
    10,
  );
});

test("negative batch and SKU recorded balances remain valid historical evidence", () => {
  const value =
    input();

  value.manifest.batches =
    [
      {
        batch: {
          id:
            batchA,
          version:
            1,
        },
        movementIds: [
          movementA,
        ],
      },
    ];

  value.batches =
    [
      {
        batch:
          productionBatch(
            batchA,
            1,
            2,
          ),
        movements: [
          movement(
            movementA,
            {
              id:
                batchA,
              version:
                1,
            },
            "waste",
            5,
          ),
        ],
      },
    ];

  const result =
    projectFoodResolvedInventoryEvidenceRecordedBalance(
      value,
    );

  assert.equal(
    result.batchBalances[0]!
      .recordedPackageBalance,
    -3,
  );

  assert.equal(
    result.skuBalance.recordedPackageBalance,
    -3,
  );
});

test("resolved outer shape and kind are strict", () => {
  assert.throws(
    () =>
      projectFoodResolvedInventoryEvidenceRecordedBalance(
        {
          ...input(),
          extra:
            true,
        },
      ),
  );

  assert.throws(
    () =>
      projectFoodResolvedInventoryEvidenceRecordedBalance(
        {
          ...input(),
          kind:
            "wrong",
        },
      ),
  );
});

test("manifest is canonically revalidated before composition", () => {
  const value =
    input();

  value.manifest = {
    ...value.manifest,
    provenance: {
      ...value.manifest.provenance,
      attribution:
        " padded ",
    },
  };

  assert.throws(
    () =>
      projectFoodResolvedInventoryEvidenceRecordedBalance(
        value,
      ),
  );
});

test("resolved batch count must exactly equal manifest batch count", () => {
  const value =
    input();

  value.batches =
    value.batches.slice(
      0,
      1,
    );

  assert.throws(
    () =>
      projectFoodResolvedInventoryEvidenceRecordedBalance(
        value,
      ),
  );
});

test("resolved batch identity must equal same-position manifest identity", () => {
  const value =
    input();

  value.batches[0] = {
    ...value.batches[0]!,
    batch:
      productionBatch(
        batchB,
        1,
        10,
      ),
  };

  assert.throws(
    () =>
      projectFoodResolvedInventoryEvidenceRecordedBalance(
        value,
      ),
  );
});

test("resolved batch SKU must equal manifest SKU", () => {
  const value =
    input();

  value.batches[0] = {
    ...value.batches[0]!,
    batch:
      productionBatch(
        batchA,
        1,
        10,
        otherSkuId,
      ),
  };

  assert.throws(
    () =>
      projectFoodResolvedInventoryEvidenceRecordedBalance(
        value,
      ),
  );
});

test("resolved movement identity set must exactly equal manifest movement IDs", () => {
  const value =
    input();

  value.manifest.batches[0] = {
    ...value.manifest.batches[0]!,
    movementIds:
      [],
  };

  assert.throws(
    () =>
      projectFoodResolvedInventoryEvidenceRecordedBalance(
        value,
      ),
  );
});

test("resolved movement binding remains enforced by 005Z", () => {
  const value =
    input();

  value.batches[0] = {
    ...value.batches[0]!,
    movements: [
      movement(
        movementA,
        {
          id:
            batchB,
          version:
            3,
        },
        "adjustment-out",
        3,
      ),
    ],
  };

  assert.throws(
    () =>
      projectFoodResolvedInventoryEvidenceRecordedBalance(
        value,
      ),
  );
});

test("noncanonical resolved batch ordering rejects rather than rebinding manifest identities", () => {
  const value =
    input();

  value.manifest.batches.reverse();
  value.batches.reverse();

  assert.throws(
    () =>
      projectFoodResolvedInventoryEvidenceRecordedBalance(
        value,
      ),
    /Resolved batch differs from manifest/,
  );
});

test("result is deeply immutable across retained manifest and projected balances", () => {
  const result =
    projectFoodResolvedInventoryEvidenceRecordedBalance(
      input(),
    );

  assert(
    Object.isFrozen(
      result,
    ),
  );

  assert(
    Object.isFrozen(
      result.manifest,
    ),
  );

  assert(
    Object.isFrozen(
      result.manifest.batches,
    ),
  );

  assert(
    Object.isFrozen(
      result.batchBalances,
    ),
  );

  assert(
    Object.isFrozen(
      result.skuBalance,
    ),
  );
});

test("caller mutation cannot alter composed canonical result", () => {
  const value =
    input();

  const result =
    projectFoodResolvedInventoryEvidenceRecordedBalance(
      value,
    );

  value.manifest.provenance.attribution =
    "synthetic:changed";

  value.batches[0]!.movements =
    [];

  assert.equal(
    result.manifest.provenance.attribution,
    "synthetic:test",
  );

  assert.equal(
    result.batchBalances[0]!
      .movementIds[0],
    movementA,
  );
});

test("source is pure resolved-evidence composition with no persistence or operational authority", async () => {
  const source =
    await import(
      "node:fs/promises"
    ).then(
      fs =>
        fs.readFile(
          new URL(
            "./resolved-inventory-balance-composition.ts",
            import.meta.url,
          ),
          "utf8",
        ),
    );

  assert.match(
    source,
    /projectFoodProductionBatchRecordedPhysicalBalance/,
  );

  assert.match(
    source,
    /projectFoodSkuRecordedPhysicalBalance/,
  );

  assert.doesNotMatch(
    source,
    /resolveFoodInventoryEvidenceManifest|d1-|D1Database|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|fetch\(|process\.env|Date\.now|quantityOnHand|availableToPromise|checkoutReady|paymentReady/i,
  );
});
