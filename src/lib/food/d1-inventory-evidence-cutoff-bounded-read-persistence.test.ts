import assert from "node:assert/strict";
import test from "node:test";
import { parseFoodSkuId } from "./package-sku-domain";
import { parseFoodProductionBatchId } from "./production-batch-domain";
import { parseFoodPhysicalInventoryMovementId } from "./physical-inventory-movement-domain";
import { validateFoodVersion } from "./draft-domain";

import {
  acquireFoodInventoryEvidenceCutoff,
  listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff,
  type FoodInventoryEvidenceLedgerD1Database,
  type FoodInventoryEvidenceLedgerD1Result,
  type FoodInventoryEvidenceLedgerD1Statement,
} from "./d1-inventory-evidence-cutoff-bounded-read-persistence";

function identityCases(prefix: string): unknown[] {
  return [
    `${prefix}synthetic`, `${prefix}a b`, `${prefix}a\tb`,
    `${prefix}${"x".repeat(128)}`, `${prefix}${"x".repeat(129)}`,
    "", " ", ` ${prefix}x`, `${prefix}x `, `${prefix} x`,
    "wrong:x", `${prefix.toUpperCase()}x`, `${prefix}X`,
    prefix, `${prefix}a:b`, `${prefix}\ud800`, null, undefined,
    1, new String(`${prefix}x`),
  ];
}

function canonicalValue(parser: (value: unknown) => string | number, input: unknown) {
  try { return parser(input); } catch { return undefined; }
}

test("006I1 API SKU validity delegates to the canonical parser with invalid classification", async () => {
  for (const input of identityCases("food-sku:")) {
    const expected = canonicalValue(parseFoodSkuId, input);
    const h = database(() => ({ success: true, results: [] }));
    const result = await listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff(h.database, { id: input, version: 1 }, { cutoff: 1 });
    assert.equal(result.outcome, expected === undefined ? "invalid" : "page");
    assert.equal(h.calls.length, expected === undefined ? 0 : 1);
    if (expected !== undefined) assert.equal(h.calls[0]!.values[0], expected);
  }
});

for (const [label, prefix, parser, column] of [
  ["SKU", "food-sku:", parseFoodSkuId, "sku_id"],
  ["batch", "food-production-batch:", parseFoodProductionBatchId, "batch_id"],
  ["movement", "food-physical-inventory-movement:", parseFoodPhysicalInventoryMovementId, "movement_id"],
] as const) {
  test(`006I1 durable ${label} identifiers match canonical parsing and preserve failure classification`, async () => {
    for (const input of identityCases(prefix)) {
      const expected = canonicalValue(parser, input);
      const requestedSku = column === "sku_id" && expected !== undefined ? { id: expected, version: sku.version } : sku;
      const row = { ...movementRow(1), [column]: input };
      const h = database(() => ({ success: true, results: [row] }));
      const result = await listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff(h.database, requestedSku, { cutoff: 1 });
      assert.equal(result.outcome, expected === undefined ? "storage-failure" : "page");
      assert.equal(h.calls.length, 1);
      if (expected !== undefined) {
        if (result.outcome !== "page") assert.fail("Expected canonical page");
        const item = result.value.items[0]!;
        assert.equal(column === "sku_id" ? item.sku.id : column === "batch_id" ? item.batch.id : item.evidenceKind === "physical-inventory-movement" ? item.movementId : undefined, expected);
        assert(Object.isFrozen(item));
      }
    }
  });
}

test("006I1 durable production-batch row also uses canonical batch parsing", async () => {
  for (const input of identityCases("food-production-batch:")) {
    const expected = canonicalValue(parseFoodProductionBatchId, input);
    const h = database(() => ({ success: true, results: [{ ...batchRow(1), batch_id: input }] }));
    const result = await listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff(h.database, sku, { cutoff: 1 });
    assert.equal(result.outcome, expected === undefined ? "storage-failure" : "page");
  }
});

test("006I1 unchanged version checks agree with canonical positive-safe validation", async () => {
  for (const version of [1, 0, -1, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1, "1", new Number(1), null, undefined]) {
    const expected = canonicalValue(validateFoodVersion, version);
    const inputDb = database(() => ({ success: true, results: [] }));
    assert.equal((await listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff(inputDb.database, { id: sku.id, version }, { cutoff: 1 })).outcome, expected === undefined ? "invalid" : "page");
    for (const column of ["sku_version", "batch_version"]) {
      const h = database(() => ({ success: true, results: [{ ...batchRow(1), [column]: version }] }));
      const requested = column === "sku_version" && expected !== undefined ? { id: sku.id, version: expected } : sku;
      assert.equal((await listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff(h.database, requested, { cutoff: 1 })).outcome, expected === undefined ? "storage-failure" : "page");
    }
  }
});

interface Call {
  sql: string;
  values: readonly unknown[];
}

function database(
  responder: (
    call: Call,
  ) =>
    | FoodInventoryEvidenceLedgerD1Result
    | Promise<FoodInventoryEvidenceLedgerD1Result>,
): Readonly<{
  database: FoodInventoryEvidenceLedgerD1Database;
  calls: readonly Call[];
}> {
  const calls:
    Call[] =
      [];

  const db:
    FoodInventoryEvidenceLedgerD1Database = {
      prepare(
        sql: string,
      ): FoodInventoryEvidenceLedgerD1Statement {
        let values:
          readonly unknown[] =
            [];

        const statement:
          FoodInventoryEvidenceLedgerD1Statement = {
            bind(
              ...input: readonly unknown[]
            ) {
              values =
                input;

              return statement;
            },

            async all<T = Record<string, unknown>>() {
              const call =
                Object.freeze({
                  sql,
                  values:
                    Object.freeze([
                      ...values,
                    ]),
                });

              calls.push(
                call,
              );

              return await responder(
                call,
              ) as FoodInventoryEvidenceLedgerD1Result<T>;
            },
          };

        return statement;
      },
    };

  return Object.freeze({
    database:
      db,
    calls,
  });
}

const sku =
  Object.freeze({
    id:
      "food-sku:meal-a",
    version:
      3,
  });

function batchRow(
  sequence: number,
) {
  return {
    evidence_sequence:
      sequence,
    evidence_kind:
      "production-batch",
    sku_id:
      sku.id,
    sku_version:
      sku.version,
    batch_id:
      `food-production-batch:b${sequence}`,
    batch_version:
      1,
    movement_id:
      null,
  };
}

function movementRow(
  sequence: number,
) {
  return {
    evidence_sequence:
      sequence,
    evidence_kind:
      "physical-inventory-movement",
    sku_id:
      sku.id,
    sku_version:
      sku.version,
    batch_id:
      "food-production-batch:b1",
    batch_version:
      1,
    movement_id:
      `food-physical-inventory-movement:m${sequence}`,
  };
}

test("006I acquires global ledger high-water cutoff and maps empty ledger to zero", async () => {
  {
    const h =
      database(
        () => ({
          success:
            true,
          results: [
            {
              evidence_cutoff:
                17,
            },
          ],
        }),
      );

    assert.deepEqual(
      await acquireFoodInventoryEvidenceCutoff(
        h.database,
      ),
      {
        outcome:
          "acquired",
        cutoff:
          17,
      },
    );

    assert.equal(
      h.calls.length,
      1,
    );

    assert.match(
      h.calls[0]!.sql,
      /MAX\(evidence_sequence\)/,
    );
  }

  {
    const h =
      database(
        () => ({
          success:
            true,
          results: [
            {
              evidence_cutoff:
                null,
            },
          ],
        }),
      );

    assert.deepEqual(
      await acquireFoodInventoryEvidenceCutoff(
        h.database,
      ),
      {
        outcome:
          "acquired",
        cutoff:
          0,
      },
    );
  }
});

test("006I cutoff acquisition fails closed on malformed uncertain or throwing storage", async () => {
  for (
    const result of [
      {
        success:
          false,
        results: [
          {
            evidence_cutoff:
              1,
          },
        ],
      },
      {
        success:
          true,
        results:
          [],
      },
      {
        success:
          true,
        results: [
          {
            evidence_cutoff:
              -1,
          },
        ],
      },
      {
        success:
          true,
        results: [
          {
            evidence_cutoff:
              Number.MAX_SAFE_INTEGER +
              1,
          },
        ],
      },
    ]
  ) {
    const h =
      database(
        () =>
          result,
      );

    assert.deepEqual(
      await acquireFoodInventoryEvidenceCutoff(
        h.database,
      ),
      {
        outcome:
          "storage-failure",
      },
    );
  }

  const throwing:
    FoodInventoryEvidenceLedgerD1Database = {
      prepare() {
        throw new Error(
          "secret",
        );
      },
    };

  assert.deepEqual(
    await acquireFoodInventoryEvidenceCutoff(
      throwing,
    ),
    {
      outcome:
        "storage-failure",
    },
  );
});

test("006I invalid exact SKU cutoff cursor and limit perform zero storage reads", async () => {
  const h =
    database(
      () => ({
        success:
          true,
        results:
          [],
      }),
    );

  for (
    const [
      candidateSku,
      options,
    ] of [
      [
        {
          id:
            "wrong:x",
          version:
            1,
        },
        {
          cutoff:
            7,
        },
      ],
      [
        sku,
        {
          cutoff:
            -1,
        },
      ],
      [
        sku,
        {
          cutoff:
            7,
          after:
            8,
        },
      ],
      [
        sku,
        {
          cutoff:
            7,
          limit:
            101,
        },
      ],
    ] as const
  ) {
    assert.deepEqual(
      await listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff(
        h.database,
        candidateSku,
        options,
      ),
      {
        outcome:
          "invalid",
      },
    );
  }

  assert.equal(
    h.calls.length,
    0,
  );
});

test("006I cutoff zero returns an empty bounded page without storage access", async () => {
  const h =
    database(
      () => {
        throw new Error(
          "must not read",
        );
      },
    );

  const result =
    await listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff(
      h.database,
      sku,
      {
        cutoff:
          0,
      },
    );

  assert.deepEqual(
    result,
    {
      outcome:
        "page",
      value: {
        items:
          [],
      },
    },
  );

  assert.equal(
    h.calls.length,
    0,
  );
});

test("006I enumerates exact-SKU evidence strictly by sequence through cutoff", async () => {
  const h =
    database(
      (call) => {
        assert.deepEqual(
          call.values,
          [
            sku.id,
            sku.version,
            3,
            9,
            4,
          ],
        );

        return {
          success:
            true,
          results: [
            batchRow(
              4,
            ),
            movementRow(
              6,
            ),
            batchRow(
              8,
            ),
          ],
        };
      },
    );

  const result =
    await listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff(
      h.database,
      sku,
      {
        cutoff:
          9,
        after:
          3,
        limit:
          3,
      },
    );

  assert.equal(
    result.outcome,
    "page",
  );

  if (
    result.outcome !==
      "page"
  ) {
    return;
  }

  assert.deepEqual(
    result.value.items.map(
      (item) =>
        item.evidenceSequence,
    ),
    [
      4,
      6,
      8,
    ],
  );

  assert.equal(
    result.value.nextCursor,
    undefined,
  );

  assert.match(
    h.calls[0]!.sql,
    /evidence_sequence > \?/,
  );

  assert.match(
    h.calls[0]!.sql,
    /evidence_sequence <= \?/,
  );

  assert.match(
    h.calls[0]!.sql,
    /ORDER BY evidence_sequence ASC/,
  );
});

test("006I limit-plus-one pagination exposes only bounded items and sequence cursor", async () => {
  const h =
    database(
      () => ({
        success:
          true,
        results: [
          batchRow(
            1,
          ),
          batchRow(
            2,
          ),
          movementRow(
            3,
          ),
        ],
      }),
    );

  const result =
    await listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff(
      h.database,
      sku,
      {
        cutoff:
          10,
        limit:
          2,
      },
    );

  assert.equal(
    result.outcome,
    "page",
  );

  if (
    result.outcome !==
      "page"
  ) {
    return;
  }

  assert.deepEqual(
    result.value.items.map(
      (item) =>
        item.evidenceSequence,
    ),
    [
      1,
      2,
    ],
  );

  assert.equal(
    result.value.nextCursor,
    2,
  );

  assert.deepEqual(
    h.calls[0]!.values,
    [
      sku.id,
      sku.version,
      0,
      10,
      3,
    ],
  );
});

test("006I malformed mismatched duplicated and nonmonotonic ledger rows fail closed", async () => {
  const cases =
    [
      [
        batchRow(
          3,
        ),
        batchRow(
          3,
        ),
      ],
      [
        batchRow(
          4,
        ),
        batchRow(
          2,
        ),
      ],
      [
        {
          ...batchRow(
            4,
          ),
          sku_id:
            "food-sku:other",
        },
      ],
      [
        {
          ...batchRow(
            4,
          ),
          evidence_sequence:
            99,
        },
      ],
      [
        {
          ...batchRow(
            4,
          ),
          evidence_kind:
            "unknown",
        },
      ],
      [
        {
          ...batchRow(
            4,
          ),
          movement_id:
            "food-physical-inventory-movement:illegal",
        },
      ],
      [
        {
          ...movementRow(
            4,
          ),
          movement_id:
            null,
        },
      ],
    ];

  for (
    const rows of cases
  ) {
    const h =
      database(
        () => ({
          success:
            true,
          results:
            rows,
        }),
      );

    assert.deepEqual(
      await listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff(
        h.database,
        sku,
        {
          cutoff:
            10,
        },
      ),
      {
        outcome:
          "storage-failure",
      },
    );
  }
});

test("006I post-cutoff rows cannot be returned as valid evidence", async () => {
  const h =
    database(
      () => ({
        success:
          true,
        results: [
          batchRow(
            11,
          ),
        ],
      }),
    );

  assert.deepEqual(
    await listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff(
      h.database,
      sku,
      {
        cutoff:
          10,
      },
    ),
    {
      outcome:
        "storage-failure",
    },
  );
});

test("006I successful pages are deeply frozen and detached", async () => {
  const raw = {
    ...batchRow(
      1,
    ),
    sku_id:
      String(
        sku.id,
      ),
  };

  const h =
    database(
      () => ({
        success:
          true,
        results: [
          raw,
        ],
      }),
    );

  const result =
    await listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff(
      h.database,
      sku,
      {
        cutoff:
          1,
      },
    );

  assert.equal(
    result.outcome,
    "page",
  );

  if (
    result.outcome !==
      "page"
  ) {
    return;
  }

  assert.ok(
    Object.isFrozen(
      result,
    ),
  );

  assert.ok(
    Object.isFrozen(
      result.value,
    ),
  );

  assert.ok(
    Object.isFrozen(
      result.value.items,
    ),
  );

  assert.ok(
    Object.isFrozen(
      result.value.items[0],
    ),
  );

  if (
    result.value.items[0]
  ) {
    assert.ok(
      Object.isFrozen(
        result.value.items[0].sku,
      ),
    );

    assert.ok(
      Object.isFrozen(
        result.value.items[0].batch,
      ),
    );
  }

  raw.sku_id =
    "food-sku:mutated";

  assert.equal(
    result.value.items[0]?.sku.id,
    sku.id,
  );
});

test("006I source is SELECT-only and grants no completeness QOH or operational authority", async () => {
  const source =
    await import(
      "node:fs/promises"
    ).then(
      ({
        readFile,
      }) =>
        readFile(
          new URL(
            "./d1-inventory-evidence-cutoff-bounded-read-persistence.ts",
            import.meta.url,
          ),
          "utf8",
        ),
    );

  assert.match(
    source,
    /SELECT MAX\(evidence_sequence\)/,
  );

  assert.match(
    source,
    /evidence_sequence <= \?/,
  );

  assert.doesNotMatch(
    source,
    /\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bUPSERT\b/,
  );

  assert.match(
    source,
    /does NOT establish/i,
  );

  assert.match(
    source,
    /manifest completeness/,
  );

  assert.match(
    source,
    /current quantity-on-hand/,
  );

  assert.doesNotMatch(
    source,
    /resolveFoodInventoryEvidenceManifest|projectFoodResolvedInventoryEvidenceRecordedBalance|projectFoodSkuRecordedPhysicalBalance|projectFoodProductionBatchRecordedPhysicalBalance/,
  );
});
