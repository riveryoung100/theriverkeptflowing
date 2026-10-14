import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  FOOD_PRODUCTION_BATCH_RECORDED_PHYSICAL_BALANCE_KIND,
  projectFoodProductionBatchRecordedPhysicalBalance,
} from "./physical-inventory-balance-domain";
import {
  FOOD_SKU_RECORDED_PHYSICAL_BALANCE_KIND,
  projectFoodSkuRecordedPhysicalBalance,
} from "./sku-physical-inventory-balance-domain";
import {
  createFoodProductionBatchId,
} from "./production-batch-domain";
import {
  createFoodPhysicalInventoryMovementId,
} from "./physical-inventory-movement-domain";
import {
  createFoodSkuId,
} from "./package-sku-domain";

const sku = (
  local = "synthetic-sku",
  version = 2,
) => ({
  id: createFoodSkuId(local),
  version,
});

const batch = (
  local: string,
  producedPackageCount: number,
  skuValue = sku(),
) => ({
  kind: "food-production-batch",
  id: createFoodProductionBatchId(local),
  version: 1,
  sku: { ...skuValue },
  batchCode: local,
  storageMode: "frozen",
  producedPackageCount,
  preparedOn: "2026-10-01",
  frozenOn: "2026-10-01",
  attribution: "synthetic-test",
  sourceReference: `synthetic:${local}`,
});

const movement = (
  batchValue: ReturnType<typeof batch>,
  local: string,
  movementType:
    | "adjustment-in"
    | "adjustment-out"
    | "waste",
  packageCount: number,
) => ({
  kind: "food-physical-inventory-movement",
  id: createFoodPhysicalInventoryMovementId(local),
  batch: {
    id: batchValue.id,
    version: batchValue.version,
  },
  sku: { ...batchValue.sku },
  movementType,
  packageCount,
  occurredOn: "2026-10-02",
  attribution: "synthetic-test",
  sourceReference: `synthetic:${local}`,
});

function recorded(
  local: string,
  producedPackageCount: number,
  movements: readonly ReturnType<typeof movement>[] = [],
  skuValue = sku(),
) {
  const production =
    batch(
      local,
      producedPackageCount,
      skuValue,
    );

  return projectFoodProductionBatchRecordedPhysicalBalance(
    production,
    movements,
  );
}

test("empty exact-SKU evidence set returns zero", () => {
  const result =
    projectFoodSkuRecordedPhysicalBalance(
      sku(),
      [],
    );

  assert.equal(
    result.kind,
    FOOD_SKU_RECORDED_PHYSICAL_BALANCE_KIND,
  );

  assert.deepEqual(result.sku, sku());
  assert.equal(result.recordedPackageBalance, 0);
  assert.deepEqual(result.batchReferences, []);
});

test("one batch forwards its recorded balance", () => {
  const first =
    recorded(
      "synthetic-batch-a",
      10,
    );

  const result =
    projectFoodSkuRecordedPhysicalBalance(
      sku(),
      [first],
    );

  assert.equal(
    result.recordedPackageBalance,
    10,
  );

  assert.deepEqual(
    result.batchReferences,
    [first.batch],
  );
});

test("distinct exact batches sharing one SKU aggregate", () => {
  const first =
    recorded(
      "synthetic-batch-a",
      10,
    );

  const secondProduction =
    batch(
      "synthetic-batch-b",
      8,
    );

  const second =
    projectFoodProductionBatchRecordedPhysicalBalance(
      secondProduction,
      [
        movement(
          secondProduction,
          "synthetic-waste-b",
          "waste",
          3,
        ),
      ],
    );

  const result =
    projectFoodSkuRecordedPhysicalBalance(
      sku(),
      [first, second],
    );

  assert.equal(
    result.recordedPackageBalance,
    15,
  );
});

test("negative aggregate recorded balance remains valid", () => {
  const production =
    batch(
      "synthetic-negative",
      2,
    );

  const negative =
    projectFoodProductionBatchRecordedPhysicalBalance(
      production,
      [
        movement(
          production,
          "synthetic-negative-waste",
          "waste",
          5,
        ),
      ],
    );

  const result =
    projectFoodSkuRecordedPhysicalBalance(
      sku(),
      [negative],
    );

  assert.equal(
    result.recordedPackageBalance,
    -3,
  );
});

test("positive and negative batch balances combine exactly", () => {
  const positive =
    recorded(
      "synthetic-positive",
      8,
    );

  const negativeProduction =
    batch(
      "synthetic-negative-two",
      1,
    );

  const negative =
    projectFoodProductionBatchRecordedPhysicalBalance(
      negativeProduction,
      [
        movement(
          negativeProduction,
          "synthetic-out-two",
          "adjustment-out",
          4,
        ),
      ],
    );

  assert.equal(
    projectFoodSkuRecordedPhysicalBalance(
      sku(),
      [positive, negative],
    ).recordedPackageBalance,
    5,
  );
});

test("input ordering does not change canonical result", () => {
  const a =
    recorded(
      "synthetic-z",
      2,
    );

  const b =
    recorded(
      "synthetic-a",
      3,
    );

  const one =
    projectFoodSkuRecordedPhysicalBalance(
      sku(),
      [a, b],
    );

  const two =
    projectFoodSkuRecordedPhysicalBalance(
      sku(),
      [b, a],
    );

  assert.deepEqual(one, two);
});

test("batch references sort by ID then version", () => {
  const z =
    recorded(
      "synthetic-z",
      2,
    );

  const a =
    recorded(
      "synthetic-a",
      3,
    );

  const result =
    projectFoodSkuRecordedPhysicalBalance(
      sku(),
      [z, a],
    );

  assert.equal(
    result.batchReferences[0]?.id,
    a.batch.id,
  );

  assert.equal(
    result.batchReferences[1]?.id,
    z.batch.id,
  );
});

test("duplicate identical exact batch identity rejects", () => {
  const value =
    recorded(
      "synthetic-duplicate",
      3,
    );

  assert.throws(
    () =>
      projectFoodSkuRecordedPhysicalBalance(
        sku(),
        [value, value],
      ),
    /Duplicate exact batch identity/,
  );
});

test("duplicate exact batch identity with divergent balance rejects", () => {
  const value =
    recorded(
      "synthetic-divergent",
      3,
    );

  const altered = {
    ...value,
    recordedPackageBalance:
      value.recordedPackageBalance + 1,
  };

  assert.throws(
    () =>
      projectFoodSkuRecordedPhysicalBalance(
        sku(),
        [value, altered],
      ),
    /Duplicate exact batch identity/,
  );
});

test("same batch ID with a different exact version is distinct", () => {
  const value =
    recorded(
      "synthetic-versioned",
      3,
    );

  const second = {
    ...value,
    batch: {
      id: value.batch.id,
      version: 2,
    },
  };

  assert.doesNotThrow(() =>
    projectFoodSkuRecordedPhysicalBalance(
      sku(),
      [value, second],
    ),
  );
});

test("SKU ID mismatch rejects", () => {
  const value =
    recorded(
      "synthetic-sku-mismatch",
      3,
      [],
      sku("other-sku"),
    );

  assert.throws(
    () =>
      projectFoodSkuRecordedPhysicalBalance(
        sku(),
        [value],
      ),
    /exact SKU/,
  );
});

test("SKU version mismatch rejects", () => {
  const value =
    recorded(
      "synthetic-version-mismatch",
      3,
      [],
      sku("synthetic-sku", 3),
    );

  assert.throws(
    () =>
      projectFoodSkuRecordedPhysicalBalance(
        sku(),
        [value],
      ),
    /exact SKU/,
  );
});

test("malformed requested SKU identity rejects", () => {
  assert.throws(() =>
    projectFoodSkuRecordedPhysicalBalance(
      {
        id: "wrong-sku",
        version: 2,
      },
      [],
    ),
  );
});

test("malformed requested SKU version rejects", () => {
  assert.throws(() =>
    projectFoodSkuRecordedPhysicalBalance(
      {
        id: createFoodSkuId("synthetic-sku"),
        version: 0,
      },
      [],
    ),
  );
});

test("extra requested SKU fields reject", () => {
  assert.throws(() =>
    projectFoodSkuRecordedPhysicalBalance(
      {
        ...sku(),
        extra: true,
      },
      [],
    ),
  );
});

test("batchBalances input must be an array", () => {
  for (
    const input of [
      null,
      undefined,
      {},
      new Set(),
      "not-an-array",
    ]
  ) {
    assert.throws(() =>
      projectFoodSkuRecordedPhysicalBalance(
        sku(),
        input,
      ),
    );
  }
});

test("wrong batch-balance kind rejects", () => {
  const value =
    recorded(
      "synthetic-kind",
      3,
    );

  assert.throws(() =>
    projectFoodSkuRecordedPhysicalBalance(
      sku(),
      [
        {
          ...value,
          kind: "wrong",
        },
      ],
    ),
  );
});

test("extra batch-balance field rejects", () => {
  const value =
    recorded(
      "synthetic-extra",
      3,
    );

  assert.throws(() =>
    projectFoodSkuRecordedPhysicalBalance(
      sku(),
      [
        {
          ...value,
          extra: true,
        },
      ],
    ),
  );
});

test("unsafe batch recorded balance rejects", () => {
  const value =
    recorded(
      "synthetic-unsafe",
      3,
    );

  assert.throws(() =>
    projectFoodSkuRecordedPhysicalBalance(
      sku(),
      [
        {
          ...value,
          recordedPackageBalance:
            Number.MAX_SAFE_INTEGER + 1,
        },
      ],
    ),
  );
});

test("positive aggregate overflow rejects", () => {
  const first =
    recorded(
      "synthetic-overflow-a",
      Number.MAX_SAFE_INTEGER,
    );

  const second =
    recorded(
      "synthetic-overflow-b",
      1,
    );

  assert.throws(
    () =>
      projectFoodSkuRecordedPhysicalBalance(
        sku(),
        [first, second],
      ),
    /signed safe integer range/,
  );
});

test("negative aggregate overflow rejects", () => {
  const firstProduction =
    batch(
      "synthetic-underflow-a",
      1,
    );

  const first =
    projectFoodProductionBatchRecordedPhysicalBalance(
      firstProduction,
      [
        movement(
          firstProduction,
          "synthetic-underflow-out-a",
          "adjustment-out",
          Number.MAX_SAFE_INTEGER,
        ),
      ],
    );

  const secondProduction =
    batch(
      "synthetic-underflow-b",
      1,
    );

  const second =
    projectFoodProductionBatchRecordedPhysicalBalance(
      secondProduction,
      [
        movement(
          secondProduction,
          "synthetic-underflow-out-b",
          "adjustment-out",
          4,
        ),
      ],
    );

  assert.throws(
    () =>
      projectFoodSkuRecordedPhysicalBalance(
        sku(),
        [first, second],
      ),
    /signed safe integer range/,
  );
});

test("BigInt aggregation avoids Number order sensitivity", () => {
  const huge =
    recorded(
      "synthetic-huge",
      Number.MAX_SAFE_INTEGER,
    );

  const negativeProduction =
    batch(
      "synthetic-large-negative",
      1,
    );

  const negative =
    projectFoodProductionBatchRecordedPhysicalBalance(
      negativeProduction,
      [
        movement(
          negativeProduction,
          "synthetic-large-negative-out",
          "adjustment-out",
          Number.MAX_SAFE_INTEGER,
        ),
      ],
    );

  const plusOne =
    recorded(
      "synthetic-plus-one",
      1,
    );

  const a =
    projectFoodSkuRecordedPhysicalBalance(
      sku(),
      [huge, negative, plusOne],
    );

  const b =
    projectFoodSkuRecordedPhysicalBalance(
      sku(),
      [negative, plusOne, huge],
    );

  assert.equal(a.recordedPackageBalance, 2);
  assert.deepEqual(a, b);
});

test("result and nested structures are frozen", () => {
  const value =
    recorded(
      "synthetic-frozen",
      4,
    );

  const result =
    projectFoodSkuRecordedPhysicalBalance(
      sku(),
      [value],
    );

  assert(Object.isFrozen(result));
  assert(Object.isFrozen(result.sku));
  assert(Object.isFrozen(result.batchReferences));
  assert(
    Object.isFrozen(
      result.batchReferences[0],
    ),
  );
});

test("result is detached from caller input", () => {
  const requestedSku = {
    ...sku(),
  };

  const value =
    recorded(
      "synthetic-detached",
      4,
    );

  const input = [
    JSON.parse(JSON.stringify(value)),
  ];

  const result =
    projectFoodSkuRecordedPhysicalBalance(
      requestedSku,
      input,
    );

  requestedSku.version = 99;
  input[0].batch.version = 99;
  input[0].recordedPackageBalance = 999;

  assert.equal(result.sku.version, 2);
  assert.equal(
    result.batchReferences[0]?.version,
    1,
  );
  assert.equal(
    result.recordedPackageBalance,
    4,
  );
});

test("canonical Z kind is required explicitly", () => {
  const value =
    recorded(
      "synthetic-z-kind",
      4,
    );

  assert.equal(
    value.kind,
    FOOD_PRODUCTION_BATCH_RECORDED_PHYSICAL_BALANCE_KIND,
  );
});

test("domain source remains pure and authority-free", async () => {
  const source =
    await readFile(
      new URL(
        "./sku-physical-inventory-balance-domain.ts",
        import.meta.url,
      ),
      "utf8",
    );

  assert.doesNotMatch(
    source,
    /D1Database|database|repository|INSERT|UPDATE|DELETE|SELECT|food_production_batches|food_physical_inventory_movements|food_sku_capacity_sources|food_capacity_reservations|checkoutReady|paymentReady|administrator|principal|Date\.now|process\.env|fetch\s*\(/i,
  );
});

test("domain makes no QOH, reservation, availability or capacity claim", async () => {
  const source =
    await readFile(
      new URL(
        "./sku-physical-inventory-balance-domain.ts",
        import.meta.url,
      ),
      "utf8",
    );

  assert.doesNotMatch(
    source,
    /quantityOnHand|availableToPromise|availableUnits|reservedQuantity|capacityUnits|reservationAccepted|dispatchReady|completedSale/i,
  );
});
