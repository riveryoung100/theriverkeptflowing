import assert from "node:assert/strict";
import test from "node:test";

import {
  groupFoodInventoryEvidenceCompleteThroughCutoff,
} from "./lossless-inventory-evidence-grouping";

import type {
  FoodInventoryEvidenceCutoffExhaustion,
} from "./inventory-evidence-cutoff-exhaustion-service";

const sku =
  Object.freeze({
    id:
      "food-sku:meal-a",
    version:
      3,
  });

function batch(
  sequence: number,
  id = `food-production-batch:b${sequence}`,
) {
  return Object.freeze({
    evidenceSequence:
      sequence,
    evidenceKind:
      "production-batch" as const,
    sku,
    batch:
      Object.freeze({
        id,
        version:
          1,
      }),
  });
}

function movement(
  sequence: number,
  movementId = `food-physical-inventory-movement:m${sequence}`,
  batchId = "food-production-batch:b1",
) {
  return Object.freeze({
    evidenceSequence:
      sequence,
    evidenceKind:
      "physical-inventory-movement" as const,
    sku,
    batch:
      Object.freeze({
        id:
          batchId,
        version:
          1,
      }),
    movementId,
  });
}

function exhausted(
  entries: FoodInventoryEvidenceCutoffExhaustion["entries"],
  cutoff =
    entries.length === 0
      ? 0
      : entries[
          entries.length -
            1
        ]!.evidenceSequence,
): FoodInventoryEvidenceCutoffExhaustion {
  return Object.freeze({
    sku,
    cutoff,
    entries:
      Object.freeze([
        ...entries,
      ]),
  });
}

test("006K groups one exact production batch with every movement exactly once", () => {
  const value =
    groupFoodInventoryEvidenceCompleteThroughCutoff(
      exhausted([
        batch(
          1,
          "food-production-batch:b1",
        ),
        movement(
          2,
          "food-physical-inventory-movement:m2",
        ),
        movement(
          3,
          "food-physical-inventory-movement:m3",
        ),
      ]),
    );

  assert.equal(
    value.batches.length,
    1,
  );

  assert.equal(
    value.batches[0]
      ?.productionBatchEvidenceSequence,
    1,
  );

  assert.deepEqual(
    value.batches[0]
      ?.movements
      .map(
        (item) =>
          item.evidenceSequence,
      ),
    [
      2,
      3,
    ],
  );
});

test("006K groups multiple batches deterministically without pagination boundaries", () => {
  const value =
    groupFoodInventoryEvidenceCompleteThroughCutoff(
      exhausted([
        batch(
          1,
          "food-production-batch:z",
        ),
        batch(
          2,
          "food-production-batch:a",
        ),
        movement(
          3,
          "food-physical-inventory-movement:m3",
          "food-production-batch:z",
        ),
        movement(
          4,
          "food-physical-inventory-movement:m4",
          "food-production-batch:a",
        ),
      ]),
    );

  assert.deepEqual(
    value.batches.map(
      (item) =>
        item.batch.id,
    ),
    [
      "food-production-batch:a",
      "food-production-batch:z",
    ],
  );

  assert.deepEqual(
    value.batches.map(
      (item) =>
        item.productionBatchEvidenceSequence,
    ),
    [
      2,
      1,
    ],
  );
});

test("006K accepts more than FOOD-006C 128 batches without truncation", () => {
  const entries =
    Array.from(
      {
        length:
          129,
      },
      (
        _,
        index,
      ) =>
        batch(
          index +
            1,
        ),
    );

  const value =
    groupFoodInventoryEvidenceCompleteThroughCutoff(
      exhausted(
        entries,
        129,
      ),
    );

  assert.equal(
    value.batches.length,
    129,
  );
});

test("006K accepts more than FOOD-006C 128 movements for one batch without truncation", () => {
  const entries = [
    batch(
      1,
      "food-production-batch:b1",
    ),
    ...Array.from(
      {
        length:
          129,
      },
      (
        _,
        index,
      ) =>
        movement(
          index +
            2,
          `food-physical-inventory-movement:m${index + 1}`,
          "food-production-batch:b1",
        ),
    ),
  ];

  const value =
    groupFoodInventoryEvidenceCompleteThroughCutoff(
      exhausted(
        entries,
        130,
      ),
    );

  assert.equal(
    value.batches.length,
    1,
  );

  assert.equal(
    value.batches[0]
      ?.movements.length,
    129,
  );
});

test("006K movement without corresponding production-batch ledger evidence fails closed", () => {
  assert.throws(
    () =>
      groupFoodInventoryEvidenceCompleteThroughCutoff(
        exhausted([
          movement(
            1,
          ),
        ]),
      ),
    /lacks production batch ledger evidence/,
  );
});

test("006K duplicate exact production batch ledger identity fails closed", () => {
  assert.throws(
    () =>
      groupFoodInventoryEvidenceCompleteThroughCutoff(
        exhausted([
          batch(
            1,
            "food-production-batch:b1",
          ),
          batch(
            2,
            "food-production-batch:b1",
          ),
        ]),
      ),
    /Duplicate exact production batch ledger identity/,
  );
});

test("006K duplicate movement identity fails closed globally", () => {
  assert.throws(
    () =>
      groupFoodInventoryEvidenceCompleteThroughCutoff(
        exhausted([
          batch(
            1,
            "food-production-batch:b1",
          ),
          movement(
            2,
            "food-physical-inventory-movement:same",
          ),
          movement(
            3,
            "food-physical-inventory-movement:same",
          ),
        ]),
      ),
    /Duplicate physical inventory movement ledger identity/,
  );
});

test("006K rejects non-increasing sequence mismatched SKU and post-cutoff evidence", () => {
  const valid =
    exhausted([
      batch(
        1,
        "food-production-batch:b1",
      ),
      movement(
        2,
      ),
    ]);

  assert.throws(
    () =>
      groupFoodInventoryEvidenceCompleteThroughCutoff(
        {
          ...valid,
          entries: [
            valid.entries[1]!,
            valid.entries[0]!,
          ],
        },
      ),
    /not strictly increasing/,
  );

  assert.throws(
    () =>
      groupFoodInventoryEvidenceCompleteThroughCutoff(
        {
          ...valid,
          entries: [
            {
              ...valid.entries[0]!,
              sku: {
                id:
                  "food-sku:other",
                version:
                  sku.version,
              },
            },
          ],
        } as FoodInventoryEvidenceCutoffExhaustion,
      ),
    /SKU mismatch/,
  );

  assert.throws(
    () =>
      groupFoodInventoryEvidenceCompleteThroughCutoff(
        {
          ...valid,
          cutoff:
            1,
        },
      ),
    /through cutoff/,
  );
});

test("006K empty exhausted ledger remains exact empty grouping", () => {
  assert.deepEqual(
    groupFoodInventoryEvidenceCompleteThroughCutoff(
      exhausted(
        [],
        0,
      ),
    ),
    {
      sku,
      cutoff:
        0,
      batches:
        [],
    },
  );
});

test("006K output is detached deeply frozen and preserves movement evidence provenance", () => {
  const input =
    exhausted([
      batch(
        1,
        "food-production-batch:b1",
      ),
      movement(
        2,
      ),
    ]);

  const value =
    groupFoodInventoryEvidenceCompleteThroughCutoff(
      input,
    );

  assert.ok(
    Object.isFrozen(
      value,
    ),
  );

  assert.ok(
    Object.isFrozen(
      value.sku,
    ),
  );

  assert.ok(
    Object.isFrozen(
      value.batches,
    ),
  );

  assert.ok(
    Object.isFrozen(
      value.batches[0],
    ),
  );

  assert.ok(
    Object.isFrozen(
      value.batches[0]?.batch,
    ),
  );

  assert.ok(
    Object.isFrozen(
      value.batches[0]?.movements,
    ),
  );

  assert.ok(
    Object.isFrozen(
      value.batches[0]?.movements[0],
    ),
  );

  assert.equal(
    value.batches[0]
      ?.movements[0]
      ?.evidenceSequence,
    2,
  );
});

test("006K source is pure grouping with no persistence manifest balance or operational authority", async () => {
  const source =
    await import(
      "node:fs/promises"
    ).then(
      ({
        readFile,
      }) =>
        readFile(
          new URL(
            "./lossless-inventory-evidence-grouping.ts",
            import.meta.url,
          ),
          "utf8",
        ),
    );

  assert.doesNotMatch(
    source,
    /d1-inventory-evidence-read-persistence/,
  );

  assert.doesNotMatch(
    source,
    /validateFoodInventoryEvidenceManifest/,
  );

  assert.doesNotMatch(
    source,
    /resolveFoodInventoryEvidenceManifest/,
  );

  assert.doesNotMatch(
    source,
    /projectFoodProductionBatchRecordedPhysicalBalance/,
  );

  assert.doesNotMatch(
    source,
    /projectFoodSkuRecordedPhysicalBalance/,
  );

  assert.doesNotMatch(
    source,
    /\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b/,
  );

  assert.doesNotMatch(
    source,
    /quantityOnHand|availableToPromise|checkoutReady|paymentReady/,
  );
});
