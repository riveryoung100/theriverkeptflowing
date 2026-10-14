import assert from "node:assert/strict";
import test from "node:test";

import {
  FOOD_PRODUCTION_BATCH_KIND,
  createFoodProductionBatchId,
  createInitialFoodProductionBatchVersion,
  parseFoodProductionBatchId,
  validateFoodProductionBatchVersion,
} from "./production-batch-domain";

import {
  createFoodSkuId,
} from "./package-sku-domain";

function sku() {
  return {
    id: createFoodSkuId("synthetic-gnocchi-12oz"),
    version: 1,
  };
}

function frozenFixture() {
  return {
    kind: FOOD_PRODUCTION_BATCH_KIND,
    id: createFoodProductionBatchId("synthetic-batch-001"),
    version: 1,
    sku: sku(),
    batchCode: "SYN-BATCH-001",
    storageMode: "frozen" as const,
    producedPackageCount: 24,
    preparedOn: "2026-10-14",
    frozenOn: "2026-10-14",
    attribution: "synthetic:test-admin",
    sourceReference: "synthetic:production-record:001",
  };
}

test(
  "production batch identity is canonical and rejects wrong prefixes or colon-bearing local IDs",
  () => {
    const id =
      createFoodProductionBatchId(
        "synthetic-batch-001",
      );

    assert.equal(
      id,
      "food-production-batch:synthetic-batch-001",
    );

    assert.equal(
      parseFoodProductionBatchId(id),
      id,
    );

    assert.throws(() =>
      createFoodProductionBatchId(
        "bad:identity",
      ),
    );

    assert.throws(() =>
      parseFoodProductionBatchId(
        "wrong-prefix:synthetic-batch-001",
      ),
    );
  },
);

test(
  "frozen packaged production batch binds exact SKU and historical produced count",
  () => {
    const value =
      validateFoodProductionBatchVersion(
        frozenFixture(),
      );

    assert.deepEqual(
      value.sku,
      sku(),
    );

    assert.equal(
      value.producedPackageCount,
      24,
    );

    assert.equal(
      value.storageMode,
      "frozen",
    );

    assert.equal(
      value.preparedOn,
      "2026-10-14",
    );

    assert.equal(
      value.frozenOn,
      "2026-10-14",
    );

    assert(Object.isFrozen(value));
    assert(Object.isFrozen(value.sku));
  },
);

test(
  "initial production batch version must be exactly one",
  () => {
    const fixture =
      frozenFixture();

    assert.equal(
      createInitialFoodProductionBatchVersion(
        {
          id: fixture.id,
          version: 1,
        },
        fixture.sku,
        {
          batchCode: fixture.batchCode,
          storageMode: fixture.storageMode,
          producedPackageCount:
            fixture.producedPackageCount,
          preparedOn: fixture.preparedOn,
          frozenOn: fixture.frozenOn,
          attribution: fixture.attribution,
          sourceReference:
            fixture.sourceReference,
        },
      ).version,
      1,
    );

    assert.throws(() =>
      createInitialFoodProductionBatchVersion(
        {
          id: fixture.id,
          version: 2,
        },
        fixture.sku,
        {
          batchCode: fixture.batchCode,
          storageMode: fixture.storageMode,
          producedPackageCount:
            fixture.producedPackageCount,
          preparedOn: fixture.preparedOn,
          frozenOn: fixture.frozenOn,
          attribution: fixture.attribution,
          sourceReference:
            fixture.sourceReference,
        },
      ),
    );
  },
);

test(
  "SKU reference and batch versions are positive safe integers",
  () => {
    const fixture =
      frozenFixture();

    for (const invalid of [
      {
        ...fixture,
        version: 0,
      },
      {
        ...fixture,
        version: 1.5,
      },
      {
        ...fixture,
        sku: {
          ...fixture.sku,
          version: 0,
        },
      },
      {
        ...fixture,
        sku: {
          ...fixture.sku,
          version: Number.MAX_SAFE_INTEGER + 1,
        },
      },
    ]) {
      assert.throws(() =>
        validateFoodProductionBatchVersion(
          invalid,
        ),
      );
    }
  },
);

test(
  "frozen batches require frozen date and it cannot precede prepared date",
  () => {
    const fixture =
      frozenFixture();

    assert.throws(() =>
      validateFoodProductionBatchVersion({
        ...fixture,
        frozenOn: undefined,
      }),
    );

    assert.throws(() =>
      validateFoodProductionBatchVersion({
        ...fixture,
        frozenOn: "2026-10-13",
      }),
    );
  },
);

test(
  "non-frozen batches forbid frozen date",
  () => {
    const fixture =
      frozenFixture();

    const refrigerated =
      validateFoodProductionBatchVersion({
        ...fixture,
        storageMode: "refrigerated",
        frozenOn: undefined,
      });

    assert.equal(
      refrigerated.storageMode,
      "refrigerated",
    );

    assert.equal(
      refrigerated.frozenOn,
      undefined,
    );

    assert.throws(() =>
      validateFoodProductionBatchVersion({
        ...fixture,
        storageMode: "room-temperature",
        frozenOn: "2026-10-14",
      }),
    );
  },
);

test(
  "strict batch shape rejects invalid storage dates package counts metadata and unknown fields",
  () => {
    const fixture =
      frozenFixture();

    for (const invalid of [
      null,
      [],
      {},
      {
        ...fixture,
        storageMode: "made-to-order",
      },
      {
        ...fixture,
        producedPackageCount: 0,
      },
      {
        ...fixture,
        producedPackageCount: 1.5,
      },
      {
        ...fixture,
        preparedOn: "2026-02-30",
      },
      {
        ...fixture,
        batchCode: "",
      },
      {
        ...fixture,
        attribution: " padded ",
      },
      {
        ...fixture,
        sourceReference: "",
      },
      {
        ...fixture,
        extra: true,
      },
      Object.assign(
        frozenFixture(),
        {
          [Symbol("extra")]: true,
        },
      ),
    ]) {
      assert.throws(() =>
        validateFoodProductionBatchVersion(
          invalid,
        ),
      );
    }
  },
);

test(
  "production batch remains evidence only and grants no inventory reservation checkout or payment authority",
  async () => {
    const {
      readFile,
    } = await import("node:fs/promises");

    const source =
      await readFile(
        new URL(
          "./production-batch-domain.ts",
          import.meta.url,
        ),
        "utf8",
      );

    assert.doesNotMatch(
      source,
      /D1Database|repository|INSERT|UPDATE|DELETE|food_sku_capacity_sources|food_capacity_reservations|quantityOnHand\s*:|reservedQuantity\s*:|soldQuantity\s*:|inventoryMovement\s*:|checkoutReady\s*:|paymentReady\s*:|Stripe|Square|PayPal|fetch\s*\(|process\.env/i,
    );
  },
);
