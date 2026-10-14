import assert from "node:assert/strict";
import test from "node:test";

import {
  exhaustFoodInventoryEvidenceByExactSkuThroughCutoff,
} from "./inventory-evidence-cutoff-exhaustion-service";

import type {
  FoodInventoryEvidenceLedgerD1Database,
  FoodInventoryEvidenceLedgerD1Result,
  FoodInventoryEvidenceLedgerD1Statement,
} from "./d1-inventory-evidence-cutoff-bounded-read-persistence";

interface Call {
  readonly sql: string;
  readonly values: readonly unknown[];
}

function database(
  responder: (
    call: Call,
  ) =>
    | FoodInventoryEvidenceLedgerD1Result
    | Promise<FoodInventoryEvidenceLedgerD1Result>,
): Readonly<{
  database: FoodInventoryEvidenceLedgerD1Database;
  calls: Call[];
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

test("006J acquires one cutoff and exhausts all pages through that same cutoff", async () => {
  let page =
    0;

  const h =
    database(
      (call) => {
        if (
          call.sql.includes(
            "MAX(evidence_sequence)",
          )
        ) {
          return {
            success:
              true,
            results: [
              {
                evidence_cutoff:
                  205,
              },
            ],
          };
        }

        page +=
          1;

        if (
          page ===
            1
        ) {
          assert.deepEqual(
            call.values,
            [
              sku.id,
              sku.version,
              0,
              205,
              101,
            ],
          );

          return {
            success:
              true,
            results:
              Array.from(
                {
                  length:
                    101,
                },
                (
                  _,
                  index,
                ) =>
                  batchRow(
                    index +
                      1,
                  ),
              ),
          };
        }

        if (
          page ===
            2
        ) {
          assert.deepEqual(
            call.values,
            [
              sku.id,
              sku.version,
              100,
              205,
              101,
            ],
          );

          return {
            success:
              true,
            results:
              Array.from(
                {
                  length:
                    101,
                },
                (
                  _,
                  index,
                ) =>
                  movementRow(
                    index +
                      101,
                  ),
              ),
          };
        }

        assert.deepEqual(
          call.values,
          [
            sku.id,
            sku.version,
            200,
            205,
            101,
          ],
        );

        return {
          success:
            true,
          results:
            Array.from(
              {
                length:
                  5,
              },
              (
                _,
                index,
              ) =>
                batchRow(
                  index +
                    201,
                ),
            ),
        };
      },
    );

  const result =
    await exhaustFoodInventoryEvidenceByExactSkuThroughCutoff(
      h.database,
      sku,
    );

  assert.equal(
    result.outcome,
    "exhausted",
  );

  if (
    result.outcome !==
      "exhausted"
  ) {
    return;
  }

  assert.equal(
    result.value.cutoff,
    205,
  );

  assert.equal(
    result.value.entries.length,
    205,
  );

  assert.equal(
    result.value.entries[0]?.evidenceSequence,
    1,
  );

  assert.equal(
    result.value.entries[204]?.evidenceSequence,
    205,
  );

  assert.equal(
    h.calls.filter(
      (call) =>
        call.sql.includes(
          "MAX(evidence_sequence)",
        ),
    ).length,
    1,
  );
});

test("006J zero cutoff yields exhausted empty set without ledger page storage read", async () => {
  const h =
    database(
      (call) => {
        assert.match(
          call.sql,
          /MAX\(evidence_sequence\)/,
        );

        return {
          success:
            true,
          results: [
            {
              evidence_cutoff:
                null,
            },
          ],
        };
      },
    );

  const result =
    await exhaustFoodInventoryEvidenceByExactSkuThroughCutoff(
      h.database,
      sku,
    );

  assert.deepEqual(
    result,
    {
      outcome:
        "exhausted",
      value: {
        sku,
        cutoff:
          0,
        entries:
          [],
      },
    },
  );

  assert.equal(
    h.calls.length,
    1,
  );
});

test("006J positive cutoff with no exact-SKU entries is a valid exhausted set", async () => {
  const h =
    database(
      (call) => {
        if (
          call.sql.includes(
            "MAX(evidence_sequence)",
          )
        ) {
          return {
            success:
              true,
            results: [
              {
                evidence_cutoff:
                  50,
              },
            ],
          };
        }

        return {
          success:
            true,
          results:
            [],
        };
      },
    );

  const result =
    await exhaustFoodInventoryEvidenceByExactSkuThroughCutoff(
      h.database,
      sku,
    );

  assert.deepEqual(
    result,
    {
      outcome:
        "exhausted",
      value: {
        sku,
        cutoff:
          50,
        entries:
          [],
      },
    },
  );
});

test("006J invalid exact SKU fails before durable storage access", async () => {
  const h =
    database(
      () => {
        throw new Error(
          "storage must not be touched",
        );
      },
    );

  const result =
    await exhaustFoodInventoryEvidenceByExactSkuThroughCutoff(
      h.database,
      {
        id:
          "wrong:x",
        version:
          1,
      },
    );

  assert.deepEqual(
    result,
    {
      outcome:
        "invalid",
    },
  );

  assert.equal(
    h.calls.length,
    0,
  );
});

test("006J storage failure while acquiring cutoff fails whole operation", async () => {
  const h =
    database(
      () => ({
        success:
          false,
        results:
          [],
      }),
    );

  assert.deepEqual(
    await exhaustFoodInventoryEvidenceByExactSkuThroughCutoff(
      h.database,
      sku,
    ),
    {
      outcome:
        "storage-failure",
    },
  );
});

test("006J storage failure on any later page returns no partial exhausted value", async () => {
  let page =
    0;

  const h =
    database(
      (call) => {
        if (
          call.sql.includes(
            "MAX(evidence_sequence)",
          )
        ) {
          return {
            success:
              true,
            results: [
              {
                evidence_cutoff:
                  150,
              },
            ],
          };
        }

        page +=
          1;

        if (
          page ===
            1
        ) {
          return {
            success:
              true,
            results:
              Array.from(
                {
                  length:
                    101,
                },
                (
                  _,
                  index,
                ) =>
                  batchRow(
                    index +
                      1,
                  ),
              ),
          };
        }

        return {
          success:
            false,
          results:
            [],
        };
      },
    );

  assert.deepEqual(
    await exhaustFoodInventoryEvidenceByExactSkuThroughCutoff(
      h.database,
      sku,
    ),
    {
      outcome:
        "storage-failure",
    },
  );
});

test("006J returned evidence is detached deeply frozen and preserves sequence order", async () => {
  const h =
    database(
      (call) => {
        if (
          call.sql.includes(
            "MAX(evidence_sequence)",
          )
        ) {
          return {
            success:
              true,
            results: [
              {
                evidence_cutoff:
                  2,
              },
            ],
          };
        }

        return {
          success:
            true,
          results: [
            batchRow(
              1,
            ),
            movementRow(
              2,
            ),
          ],
        };
      },
    );

  const result =
    await exhaustFoodInventoryEvidenceByExactSkuThroughCutoff(
      h.database,
      sku,
    );

  assert.equal(
    result.outcome,
    "exhausted",
  );

  if (
    result.outcome !==
      "exhausted"
  ) {
    return;
  }

  assert.deepEqual(
    result.value.entries.map(
      (entry) =>
        entry.evidenceSequence,
    ),
    [
      1,
      2,
    ],
  );

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
      result.value.sku,
    ),
  );

  assert.ok(
    Object.isFrozen(
      result.value.entries,
    ),
  );

  for (
    const entry of
      result.value.entries
  ) {
    assert.ok(
      Object.isFrozen(
        entry,
      ),
    );

    assert.ok(
      Object.isFrozen(
        entry.sku,
      ),
    );

    assert.ok(
      Object.isFrozen(
        entry.batch,
      ),
    );
  }
});

test("006J can exhaust evidence beyond FOOD-006C batch cardinality without truncation", async () => {
  const count =
    129;

  const h =
    database(
      (call) => {
        if (
          call.sql.includes(
            "MAX(evidence_sequence)",
          )
        ) {
          return {
            success:
              true,
            results: [
              {
                evidence_cutoff:
                  count,
              },
            ],
          };
        }

        const after =
          Number(
            call.values[2],
          );

        const remaining =
          count -
          after;

        const pageCount =
          Math.min(
            remaining,
            101,
          );

        return {
          success:
            true,
          results:
            Array.from(
              {
                length:
                  pageCount,
              },
              (
                _,
                index,
              ) =>
                batchRow(
                  after +
                    index +
                    1,
                ),
            ),
        };
      },
    );

  const result =
    await exhaustFoodInventoryEvidenceByExactSkuThroughCutoff(
      h.database,
      sku,
    );

  assert.equal(
    result.outcome,
    "exhausted",
  );

  if (
    result.outcome !==
      "exhausted"
  ) {
    return;
  }

  assert.equal(
    result.value.entries.length,
    129,
  );

  assert.equal(
    result.value.entries[128]?.evidenceSequence,
    129,
  );
});

test("006J source composes only FOOD-006I reads and grants no manifest balance or operational authority", async () => {
  const source =
    await import(
      "node:fs/promises"
    ).then(
      ({
        readFile,
      }) =>
        readFile(
          new URL(
            "./inventory-evidence-cutoff-exhaustion-service.ts",
            import.meta.url,
          ),
          "utf8",
        ),
    );

  assert.match(
    source,
    /acquireFoodInventoryEvidenceCutoff/,
  );

  assert.match(
    source,
    /listFoodInventoryEvidenceLedgerByExactSkuThroughCutoff/,
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
    /projectFoodResolvedInventoryEvidenceRecordedBalance/,
  );

  assert.doesNotMatch(
    source,
    /projectFoodSkuRecordedPhysicalBalance/,
  );

  assert.match(
    source,
    /does NOT construct a FOOD-006C manifest/,
  );

  assert.match(
    source,
    /not current quantity-on-hand/i,
  );
});
