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

for (const storageMode of [
  "frozen",
  "refrigerated",
  "room-temperature",
] as const) {
  function fixture() {
    const input: Record<string, unknown> = {
      ...frozenFixture(),
      storageMode,
    };

    if (storageMode !== "frozen") {
      delete input.frozenOn;
    }

    return input;
  }

  test(`${storageMode} canonical snapshot revalidates and survives JSON`, () => {
    const canonical = validateFoodProductionBatchVersion(fixture());
    const revalidated = validateFoodProductionBatchVersion(canonical);
    assert.deepEqual(revalidated, canonical);
    assert.notEqual(revalidated, canonical);
    assert.notEqual(revalidated.sku, canonical.sku);
    assert(Object.isFrozen(revalidated));
    assert(Object.isFrozen(revalidated.sku));
    assert.equal(
      Object.prototype.hasOwnProperty.call(canonical, "frozenOn"),
      storageMode === "frozen",
    );
    assert.deepEqual(
      validateFoodProductionBatchVersion(JSON.parse(JSON.stringify(canonical))),
      canonical,
    );
  });

  test(`${storageMode} constructor snapshot revalidates`, () => {
    const input = frozenFixture();
    const canonical = createInitialFoodProductionBatchVersion(
      { id: input.id, version: input.version },
      input.sku,
      {
        batchCode: input.batchCode,
        storageMode,
        producedPackageCount: input.producedPackageCount,
        preparedOn: input.preparedOn,
        frozenOn: storageMode === "frozen" ? input.frozenOn : undefined,
        attribution: input.attribution,
        sourceReference: input.sourceReference,
      },
    );
    assert.deepEqual(validateFoodProductionBatchVersion(canonical), canonical);
    assert.equal(
      Object.prototype.hasOwnProperty.call(canonical, "frozenOn"),
      storageMode === "frozen",
    );
  });

  test(`${storageMode} rejects unknown fields and missing required own keys`, () => {
    const input = fixture();
    for (const invalid of [
      { ...input, unexpected: true },
      { ...input, [Symbol("unexpected")]: true },
      { ...input, sku: { ...sku(), unexpected: true } },
      { ...input, sku: { ...sku(), [Symbol("unexpected")]: true } },
    ]) {
      assert.throws(() => validateFoodProductionBatchVersion(invalid));
    }

    for (const key of Reflect.ownKeys(input)) {
      if (key === "frozenOn") continue;
      const missing = { ...input };
      delete missing[key as string];
      assert.throws(() => validateFoodProductionBatchVersion(missing));
      const inherited = Object.assign(Object.create({ [key]: input[key as string] }), missing);
      assert.throws(() => validateFoodProductionBatchVersion(inherited));
    }
  });

  if (storageMode !== "frozen") {
    test(`${storageMode} accepts undefined but rejects defined frozenOn`, () => {
      const canonical = validateFoodProductionBatchVersion({
        ...fixture(),
        frozenOn: undefined,
      });
      assert.equal(Object.prototype.hasOwnProperty.call(canonical, "frozenOn"), false);
      for (const frozenOn of ["2026-10-14", null, "", 0]) {
        assert.throws(() => validateFoodProductionBatchVersion({ ...fixture(), frozenOn }));
      }
    });
  }
}

test("frozen snapshot rejects absent inherited undefined and invalid frozen dates", () => {
  const missing: Record<string, unknown> = { ...frozenFixture() };
  delete missing.frozenOn;
  assert.throws(() => validateFoodProductionBatchVersion(missing));
  assert.throws(() => validateFoodProductionBatchVersion(
    Object.assign(Object.create({ frozenOn: "2026-10-14" }), missing),
  ));
  for (const frozenOn of [undefined, "2026/10/14", "2026-02-30", "2026-10-13"]) {
    assert.throws(() => validateFoodProductionBatchVersion({ ...missing, frozenOn }));
  }
});

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
