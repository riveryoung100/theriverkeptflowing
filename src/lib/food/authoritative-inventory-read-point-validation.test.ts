import {
  describe,
  it,
} from "node:test";

import {
  deepStrictEqual,
  equal,
  ok,
} from "node:assert/strict";

import {
  FOOD_AUTHORITATIVE_INVENTORY_READ_POINT_KIND,
  validateFoodInventoryAtAuthoritativeReadPoint,
  type FoodAuthoritativeInventoryReadPointD1Database,
  type FoodAuthoritativeInventoryReadPointD1Result,
  type FoodAuthoritativeInventoryReadPointD1Session,
  type FoodAuthoritativeInventoryReadPointD1Statement,
} from "./authoritative-inventory-read-point-validation";

interface FixtureOptions {
  readonly rows?: readonly Record<string, unknown>[];
  readonly resultSuccess?: boolean;
  readonly bookmark?: string | null;
  readonly sessionError?: boolean;
  readonly prepareError?: boolean;
  readonly queryError?: boolean;
  readonly bookmarkError?: boolean;
}

function fixture(
  options: FixtureOptions = {},
): {
  readonly database:
    FoodAuthoritativeInventoryReadPointD1Database;

  readonly calls: string[];

  readonly getSql:
    () => string;

  readonly getBound:
    () => readonly unknown[];
} {
  const calls: string[] = [];

  let sql = "";

  let bound:
    readonly unknown[] = [];

  const rows =
    options.rows ??
    [
      {
        evidence_head: 7,
      },
    ];

  const statement:
    FoodAuthoritativeInventoryReadPointD1Statement = {
    bind(
      ...values: readonly unknown[]
    ):
      FoodAuthoritativeInventoryReadPointD1Statement {
      calls.push("bind");
      bound = values;
      return statement;
    },

    async all<
      T = Record<string, unknown>,
    >():
      Promise<
        FoodAuthoritativeInventoryReadPointD1Result<T>
      > {
      calls.push("all");

      if (options.queryError) {
        throw new Error(
          "query failed",
        );
      }

      return {
        success:
          options.resultSuccess ??
          true,

        results:
          rows as readonly T[],
      };
    },
  };

  const session:
    FoodAuthoritativeInventoryReadPointD1Session = {
    prepare(
      query: string,
    ):
      FoodAuthoritativeInventoryReadPointD1Statement {
      calls.push("prepare");

      if (options.prepareError) {
        throw new Error(
          "prepare failed",
        );
      }

      sql = query;

      return statement;
    },

    getBookmark():
      string | null {
      calls.push("bookmark");

      if (options.bookmarkError) {
        throw new Error(
          "bookmark failed",
        );
      }

      return options.bookmark ===
        undefined
        ? "bookmark:authoritative-head"
        : options.bookmark;
    },
  };

  const database:
    FoodAuthoritativeInventoryReadPointD1Database = {
    withSession(
      constraintOrBookmark?: string,
    ):
      FoodAuthoritativeInventoryReadPointD1Session {
      calls.push(
        `session:${constraintOrBookmark ?? ""}`,
      );

      if (options.sessionError) {
        throw new Error(
          "session failed",
        );
      }

      return session;
    },
  };

  return {
    database,
    calls,

    getSql:
      () =>
        sql,

    getBound:
      () =>
        bound,
  };
}

function request(
  cutoff = 7,
): {
  sku: {
    id: string;
    version: number;
  };

  composedCutoff: number;
} {
  return {
    sku: {
      id:
        "food-sku:fixture",

      version:
        1,
    },

    composedCutoff:
      cutoff,
  };
}

describe(
  "FOOD-006N authoritative exact-SKU read point",
  () => {
    it(
      "returns authoritative generation token when head equals cutoff",
      async () => {
        const f =
          fixture();

        const result =
          await validateFoodInventoryAtAuthoritativeReadPoint(
            f.database,
            request(7),
          );

        equal(
          result.outcome,
          "success",
        );

        if (
          result.outcome !==
          "success"
        ) {
          throw new Error(
            "Expected success",
          );
        }

        deepStrictEqual(
          result.value,
          {
            kind:
              FOOD_AUTHORITATIVE_INVENTORY_READ_POINT_KIND,

            sku: {
              id:
                "food-sku:fixture",

              version:
                1,
            },

            composedCutoff:
              7,

            exactSkuEvidenceHead:
              7,

            consistencyToken: {
              sku: {
                id:
                  "food-sku:fixture",

                version:
                  1,
              },

              composedCutoff:
                7,

              exactSkuEvidenceHead:
                7,

              bookmark:
                "bookmark:authoritative-head",
            },
          },
        );
      },
    );

    it(
      "accepts target SKU head below global composed cutoff",
      async () => {
        const f =
          fixture({
            rows: [
              {
                evidence_head:
                  4,
              },
            ],
          });

        const result =
          await validateFoodInventoryAtAuthoritativeReadPoint(
            f.database,
            request(9),
          );

        equal(
          result.outcome,
          "success",
        );

        if (
          result.outcome ===
          "success"
        ) {
          equal(
            result.value
              .exactSkuEvidenceHead,
            4,
          );
        }
      },
    );

    it(
      "accepts empty exact SKU at zero cutoff",
      async () => {
        const f =
          fixture({
            rows: [
              {
                evidence_head:
                  null,
              },
            ],
          });

        const result =
          await validateFoodInventoryAtAuthoritativeReadPoint(
            f.database,
            request(0),
          );

        equal(
          result.outcome,
          "success",
        );

        if (
          result.outcome ===
          "success"
        ) {
          equal(
            result.value
              .exactSkuEvidenceHead,
            0,
          );
        }
      },
    );

    it(
      "accepts empty exact SKU below positive global cutoff",
      async () => {
        const f =
          fixture({
            rows: [
              {
                evidence_head:
                  null,
              },
            ],
          });

        const result =
          await validateFoodInventoryAtAuthoritativeReadPoint(
            f.database,
            request(200),
          );

        equal(
          result.outcome,
          "success",
        );
      },
    );

    it(
      "returns stale when exact SKU evidence head exceeds composed cutoff",
      async () => {
        const f =
          fixture({
            rows: [
              {
                evidence_head:
                  8,
              },
            ],
          });

        const result =
          await validateFoodInventoryAtAuthoritativeReadPoint(
            f.database,
            request(7),
          );

        deepStrictEqual(
          result,
          {
            outcome:
              "stale",

            exactSkuEvidenceHead:
              8,
          },
        );

        equal(
          f.calls.includes(
            "bookmark",
          ),
          false,
        );
      },
    );

    it(
      "rejects malformed requests before database access",
      async () => {
        const invalidInputs:
          readonly unknown[] = [
            null,
            {},
            {
              sku: {
                id:
                  "bad",

                version:
                  1,
              },

              composedCutoff:
                1,
            },
            {
              sku: {
                id:
                  "food-sku:x",

                version:
                  0,
              },

              composedCutoff:
                1,
            },
            {
              sku: {
                id:
                  "food-sku:x",

                version:
                  1,
              },

              composedCutoff:
                -1,
            },
            {
              sku: {
                id:
                  "food-sku:x",

                version:
                  1,
              },

              composedCutoff:
                1.5,
            },
            {
              sku: {
                id:
                  "food-sku:x",

                version:
                  1,
              },

              composedCutoff:
                Number.MAX_SAFE_INTEGER +
                1,
            },
          ];

        for (
          const input
          of invalidInputs
        ) {
          const f =
            fixture();

          const result =
            await validateFoodInventoryAtAuthoritativeReadPoint(
              f.database,
              input,
            );

          deepStrictEqual(
            result,
            {
              outcome:
                "invalid",
            },
          );

          deepStrictEqual(
            f.calls,
            [],
          );
        }
      },
    );

    it(
      "uses first-primary and makes exact-SKU head the first query",
      async () => {
        const f =
          fixture();

        const result =
          await validateFoodInventoryAtAuthoritativeReadPoint(
            f.database,
            request(),
          );

        equal(
          result.outcome,
          "success",
        );

        deepStrictEqual(
          f.calls,
          [
            "session:first-primary",
            "prepare",
            "bind",
            "all",
            "bookmark",
          ],
        );
      },
    );

    it(
      "binds only exact SKU coordinates",
      async () => {
        const f =
          fixture();

        await validateFoodInventoryAtAuthoritativeReadPoint(
          f.database,
          request(),
        );

        deepStrictEqual(
          f.getBound(),
          [
            "food-sku:fixture",
            1,
          ],
        );
      },
    );

    it(
      "uses exact-SKU head instead of global-head equality",
      async () => {
        const f =
          fixture();

        await validateFoodInventoryAtAuthoritativeReadPoint(
          f.database,
          request(),
        );

        const sql =
          f.getSql();

        ok(
          sql.includes(
            "SELECT MAX(evidence_sequence) AS evidence_head",
          ),
        );

        ok(
          sql.includes(
            "WHERE sku_id COLLATE BINARY = ?",
          ),
        );

        ok(
          sql.includes(
            "AND sku_version = ?",
          ),
        );
      },
    );

    it(
      "classifies database operation failures as storage-failure",
      async () => {
        const cases:
          readonly FixtureOptions[] = [
            {
              sessionError:
                true,
            },
            {
              prepareError:
                true,
            },
            {
              queryError:
                true,
            },
            {
              resultSuccess:
                false,
            },
            {
              bookmark:
                null,
            },
            {
              bookmarkError:
                true,
            },
          ];

        for (
          const options
          of cases
        ) {
          const f =
            fixture(
              options,
            );

          const result =
            await validateFoodInventoryAtAuthoritativeReadPoint(
              f.database,
              request(),
            );

          deepStrictEqual(
            result,
            {
              outcome:
                "storage-failure",
            },
          );
        }
      },
    );

    it(
      "fails malformed durable head results closed",
      async () => {
        const malformed:
          readonly (
            readonly Record<string, unknown>[]
          )[] = [
            [],
            [
              {
                evidence_head:
                  1,
              },
              {
                evidence_head:
                  1,
              },
            ],
            [
              {},
            ],
            [
              {
                evidence_head:
                  "7",
              },
            ],
            [
              {
                evidence_head:
                  -1,
              },
            ],
            [
              {
                evidence_head:
                  1.5,
              },
            ],
            [
              {
                evidence_head:
                  Number.MAX_SAFE_INTEGER +
                  1,
              },
            ],
          ];

        for (
          const rows
          of malformed
        ) {
          const f =
            fixture({
              rows,
            });

          const result =
            await validateFoodInventoryAtAuthoritativeReadPoint(
              f.database,
              request(
                Number.MAX_SAFE_INTEGER,
              ),
            );

          deepStrictEqual(
            result,
            {
              outcome:
                "storage-failure",
            },
          );
        }
      },
    );

    it(
      "deep freezes successful public state",
      async () => {
        const f =
          fixture();

        const result =
          await validateFoodInventoryAtAuthoritativeReadPoint(
            f.database,
            request(),
          );

        ok(
          Object.isFrozen(
            result,
          ),
        );

        if (
          result.outcome !==
          "success"
        ) {
          throw new Error(
            "Expected success",
          );
        }

        ok(
          Object.isFrozen(
            result.value,
          ),
        );

        ok(
          Object.isFrozen(
            result.value.sku,
          ),
        );

        ok(
          Object.isFrozen(
            result.value
              .consistencyToken,
          ),
        );

        ok(
          Object.isFrozen(
            result.value
              .consistencyToken
              .sku,
          ),
        );
      },
    );

    it(
      "detaches successful output from mutable request",
      async () => {
        const input = {
          sku: {
            id:
              "food-sku:fixture",

            version:
              1,
          },

          composedCutoff:
            7,
        };

        const f =
          fixture();

        const result =
          await validateFoodInventoryAtAuthoritativeReadPoint(
            f.database,
            input,
          );

        input.sku.id =
          "food-sku:mutated";

        input.sku.version =
          2;

        input.composedCutoff =
          99;

        if (
          result.outcome !==
          "success"
        ) {
          throw new Error(
            "Expected success",
          );
        }

        deepStrictEqual(
          result.value.sku,
          {
            id:
              "food-sku:fixture",

            version:
              1,
          },
        );

        equal(
          result.value
            .composedCutoff,
          7,
        );
      },
    );
  },
);
