import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createFoodSkuId,
} from "./package-sku-domain";
import {
  createFoodProductionBatchId,
} from "./production-batch-domain";
import {
  createFoodPhysicalInventoryMovementId,
} from "./physical-inventory-movement-domain";
import {
  FOOD_INVENTORY_EVIDENCE_MANIFEST_KIND,
  validateFoodInventoryEvidenceManifest,
} from "./inventory-evidence-provenance-domain";

const skuId =
  createFoodSkuId(
    "synthetic-sku",
  );

const batchId = (
  local: string,
) =>
  createFoodProductionBatchId(
    local,
  );

const movementId = (
  local: string,
) =>
  createFoodPhysicalInventoryMovementId(
    local,
  );

function fixture() {
  return {
    kind:
      FOOD_INVENTORY_EVIDENCE_MANIFEST_KIND,
    sku: {
      id: skuId,
      version: 2,
    },
    batches: [
      {
        batch: {
          id: batchId("batch-b"),
          version: 1,
        },
        movementIds: [
          movementId("movement-b2"),
          movementId("movement-b1"),
        ],
      },
      {
        batch: {
          id: batchId("batch-a"),
          version: 2,
        },
        movementIds: [],
      },
    ],
    provenance: {
      attribution:
        "synthetic:test",
      sourceReference:
        "synthetic:inventory-evidence-read",
    },
  };
}

test("canonical manifest records exact SKU batches movements and provenance", () => {
  const value =
    validateFoodInventoryEvidenceManifest(
      fixture(),
    );

  assert.equal(
    value.kind,
    FOOD_INVENTORY_EVIDENCE_MANIFEST_KIND,
  );

  assert.deepEqual(
    value.sku,
    {
      id: skuId,
      version: 2,
    },
  );

  assert.deepEqual(
    value.batches.map(
      item => item.batch,
    ),
    [
      {
        id: batchId("batch-a"),
        version: 2,
      },
      {
        id: batchId("batch-b"),
        version: 1,
      },
    ],
  );

  assert.deepEqual(
    value.batches[1]?.movementIds,
    [
      movementId("movement-b1"),
      movementId("movement-b2"),
    ],
  );

  assert.deepEqual(
    value.provenance,
    fixture().provenance,
  );
});

test("empty supplied evidence set is valid", () => {
  const value =
    validateFoodInventoryEvidenceManifest({
      ...fixture(),
      batches: [],
    });

  assert.deepEqual(
    value.batches,
    [],
  );
});

test("batch without supplied movements is valid", () => {
  const value =
    validateFoodInventoryEvidenceManifest({
      ...fixture(),
      batches: [
        {
          batch: {
            id: batchId("batch-a"),
            version: 1,
          },
          movementIds: [],
        },
      ],
    });

  assert.equal(
    value.batches.length,
    1,
  );

  assert.deepEqual(
    value.batches[0]?.movementIds,
    [],
  );
});

test("input permutations canonicalize to one manifest ordering", () => {
  const one =
    validateFoodInventoryEvidenceManifest(
      fixture(),
    );

  const changed =
    fixture();

  changed.batches.reverse();
  changed.batches[0]?.movementIds.reverse();

  const two =
    validateFoodInventoryEvidenceManifest(
      changed,
    );

  assert.deepEqual(one, two);
});

test("duplicate exact production batch identity rejects", () => {
  const value =
    fixture();

  value.batches.push({
    batch: {
      ...value.batches[0]!.batch,
    },
    movementIds: [],
  });

  assert.throws(
    () =>
      validateFoodInventoryEvidenceManifest(
        value,
      ),
    /Duplicate exact production batch identity/,
  );
});

test("same batch ID with a different exact version remains distinct", () => {
  const value =
    fixture();

  value.batches = [
    {
      batch: {
        id: batchId("batch-a"),
        version: 1,
      },
      movementIds: [],
    },
    {
      batch: {
        id: batchId("batch-a"),
        version: 2,
      },
      movementIds: [],
    },
  ];

  assert.doesNotThrow(() =>
    validateFoodInventoryEvidenceManifest(
      value,
    ),
  );
});

test("duplicate movement identity inside one batch rejects", () => {
  const id =
    movementId("duplicate");

  assert.throws(
    () =>
      validateFoodInventoryEvidenceManifest({
        ...fixture(),
        batches: [
          {
            batch: {
              id: batchId("batch-a"),
              version: 1,
            },
            movementIds: [
              id,
              id,
            ],
          },
        ],
      }),
    /Duplicate physical inventory movement identity/,
  );
});

test("movement identity cannot appear under two different batches", () => {
  const id =
    movementId("global-duplicate");

  assert.throws(
    () =>
      validateFoodInventoryEvidenceManifest({
        ...fixture(),
        batches: [
          {
            batch: {
              id: batchId("batch-a"),
              version: 1,
            },
            movementIds: [id],
          },
          {
            batch: {
              id: batchId("batch-b"),
              version: 1,
            },
            movementIds: [id],
          },
        ],
      }),
    /Duplicate physical inventory movement identity/,
  );
});

test("strict manifest shape rejects unsupported authority and cutoff fields", () => {
  for (
    const change of [
      {
        complete: true,
      },
      {
        cutoff: "synthetic",
      },
      {
        asOf: "2026-10-14",
      },
      {
        quantityOnHand: 10,
      },
      {
        availableToPromise: 10,
      },
      {
        capacity: 10,
      },
    ]
  ) {
    assert.throws(() =>
      validateFoodInventoryEvidenceManifest({
        ...fixture(),
        ...change,
      }),
    );
  }
});

test("strict nested shapes reject extra fields", () => {
  assert.throws(() =>
    validateFoodInventoryEvidenceManifest({
      ...fixture(),
      sku: {
        ...fixture().sku,
        extra: true,
      },
    }),
  );

  assert.throws(() =>
    validateFoodInventoryEvidenceManifest({
      ...fixture(),
      batches: [
        {
          ...fixture().batches[0],
          extra: true,
        },
      ],
    }),
  );

  assert.throws(() =>
    validateFoodInventoryEvidenceManifest({
      ...fixture(),
      provenance: {
        ...fixture().provenance,
        complete: true,
      },
    }),
  );
});

test("canonical identity and version validation rejects malformed references", () => {
  assert.throws(() =>
    validateFoodInventoryEvidenceManifest({
      ...fixture(),
      sku: {
        id: "wrong",
        version: 2,
      },
    }),
  );

  assert.throws(() =>
    validateFoodInventoryEvidenceManifest({
      ...fixture(),
      sku: {
        id: skuId,
        version: 0,
      },
    }),
  );

  assert.throws(() =>
    validateFoodInventoryEvidenceManifest({
      ...fixture(),
      batches: [
        {
          batch: {
            id: "wrong",
            version: 1,
          },
          movementIds: [],
        },
      ],
    }),
  );

  assert.throws(() =>
    validateFoodInventoryEvidenceManifest({
      ...fixture(),
      batches: [
        {
          batch: {
            id: batchId("batch-a"),
            version: 0,
          },
          movementIds: [],
        },
      ],
    }),
  );

  assert.throws(() =>
    validateFoodInventoryEvidenceManifest({
      ...fixture(),
      batches: [
        {
          batch: {
            id: batchId("batch-a"),
            version: 1,
          },
          movementIds: [
            "wrong",
          ],
        },
      ],
    }),
  );
});

test("provenance is required bounded unpadded caller-supplied text", () => {
  for (
    const provenance of [
      null,
      {},
      {
        attribution: "",
        sourceReference:
          "synthetic",
      },
      {
        attribution:
          " synthetic",
        sourceReference:
          "synthetic",
      },
      {
        attribution:
          "synthetic",
        sourceReference: "",
      },
      {
        attribution:
          "synthetic",
        sourceReference:
          "synthetic ",
      },
      {
        attribution:
          "x".repeat(513),
        sourceReference:
          "synthetic",
      },
      {
        attribution:
          "synthetic",
        sourceReference:
          "x".repeat(513),
      },
    ]
  ) {
    assert.throws(() =>
      validateFoodInventoryEvidenceManifest({
        ...fixture(),
        provenance,
      }),
    );
  }
});

test("batch collection bound is inclusive", () => {
  const batches =
    Array.from(
      {
        length: 128,
      },
      (_, index) => ({
        batch: {
          id:
            batchId(
              `batch-${index}`,
            ),
          version: 1,
        },
        movementIds: [],
      }),
    );

  assert.doesNotThrow(() =>
    validateFoodInventoryEvidenceManifest({
      ...fixture(),
      batches,
    }),
  );

  assert.throws(() =>
    validateFoodInventoryEvidenceManifest({
      ...fixture(),
      batches: [
        ...batches,
        {
          batch: {
            id:
              batchId(
                "batch-overflow",
              ),
            version: 1,
          },
          movementIds: [],
        },
      ],
    }),
  );
});

test("movement collection bound is inclusive", () => {
  const movementIds =
    Array.from(
      {
        length: 128,
      },
      (_, index) =>
        movementId(
          `movement-${index}`,
        ),
    );

  assert.doesNotThrow(() =>
    validateFoodInventoryEvidenceManifest({
      ...fixture(),
      batches: [
        {
          batch: {
            id: batchId("batch-a"),
            version: 1,
          },
          movementIds,
        },
      ],
    }),
  );

  assert.throws(() =>
    validateFoodInventoryEvidenceManifest({
      ...fixture(),
      batches: [
        {
          batch: {
            id: batchId("batch-a"),
            version: 1,
          },
          movementIds: [
            ...movementIds,
            movementId(
              "movement-overflow",
            ),
          ],
        },
      ],
    }),
  );
});

test("result is deeply frozen and detached from caller input", () => {
  const input =
    fixture();

  const value =
    validateFoodInventoryEvidenceManifest(
      input,
    );

  assert(Object.isFrozen(value));
  assert(Object.isFrozen(value.sku));
  assert(Object.isFrozen(value.batches));
  assert(
    Object.isFrozen(
      value.batches[0],
    ),
  );
  assert(
    Object.isFrozen(
      value.batches[0]?.batch,
    ),
  );
  assert(
    Object.isFrozen(
      value.batches[0]?.movementIds,
    ),
  );
  assert(Object.isFrozen(value.provenance));

  input.sku.version = 99;
  input.batches[0]!.batch.version = 99;
  input.batches[0]!.movementIds.length = 0;
  input.provenance.attribution =
    "changed";

  assert.equal(
    value.sku.version,
    2,
  );

  assert.notEqual(
    value.batches[0]?.batch.version,
    99,
  );

  assert.notEqual(
    value.provenance.attribution,
    "changed",
  );
});

test("manifest source is pure and grants no completeness or operational authority", async () => {
  const source =
    await readFile(
      new URL(
        "./inventory-evidence-provenance-domain.ts",
        import.meta.url,
      ),
      "utf8",
    );

  assert.doesNotMatch(
    source,
    /D1Database|repository|SELECT|INSERT|UPDATE|DELETE|transaction|BEGIN|COMMIT|ROLLBACK|Date\.now|process\.env|fetch\s*\(/i,
  );

  assert.doesNotMatch(
    source,
    /quantityOnHand|availableToPromise|checkoutReady|paymentReady|reservationAccepted|capacityUnits/i,
  );

  assert.doesNotMatch(
    source,
    /projectFoodProductionBatchRecordedPhysicalBalance|projectFoodSkuRecordedPhysicalBalance/,
  );
});
