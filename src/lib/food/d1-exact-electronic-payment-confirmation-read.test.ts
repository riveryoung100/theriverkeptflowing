import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  validateFoodElectronicPaymentConfirmationVersion,
} from "./electronic-payment-confirmation-domain";

import {
  readFoodElectronicPaymentConfirmationByExactIdentity as read,
  type FoodExactElectronicPaymentConfirmationReadD1Database,
} from "./d1-exact-electronic-payment-confirmation-read";

type Row =
  Record<string, unknown>;

function candidate() {
  return {
    id:
      "food-electronic-payment-confirmation:008d",
    version: 1,
    order: {
      id:
        "food-physical-order:008d",
      version: 1,
      merchandiseSubtotal: {
        currency: "USD",
        minorUnits: 2450,
      },
    },
    evidence: {
      channel:
        "electronic-processor",
      processor:
        "test-processor",
      processorPaymentReference:
        "payment-reference-008d",
      confirmationSourceReference:
        "confirmation-source-008d",
      confirmedAmount: {
        currency: "USD",
        minorUnits: 2450,
      },
    },
  };
}

function row(): Row {
  const value =
    candidate();

  return {
    confirmation_id:
      value.id,
    confirmation_version:
      value.version,
    order_id:
      value.order.id,
    order_version:
      value.order.version,
    merchandise_subtotal_currency:
      value.order
        .merchandiseSubtotal
        .currency,
    merchandise_subtotal_minor_units:
      value.order
        .merchandiseSubtotal
        .minorUnits,
    channel:
      value.evidence.channel,
    processor:
      value.evidence.processor,
    processor_payment_reference:
      value.evidence
        .processorPaymentReference,
    confirmation_source_reference:
      value.evidence
        .confirmationSourceReference,
    confirmed_amount_currency:
      value.evidence
        .confirmedAmount
        .currency,
    confirmed_amount_minor_units:
      value.evidence
        .confirmedAmount
        .minorUnits,
  };
}

class Database
implements FoodExactElectronicPaymentConfirmationReadD1Database {
  readonly rows:
    unknown[];

  sql =
    "";

  values:
    unknown[] = [];

  throwAt:
    | "prepare"
    | "bind"
    | "all"
    | null =
      null;

  override:
    (() => unknown) |
    null =
      null;

  constructor(
    rows:
      unknown[] = [],
  ) {
    this.rows =
      rows;
  }

  prepare(
    sql: string,
  ) {
    if (
      this.throwAt ===
      "prepare"
    ) {
      throw new Error(
        "prepare failure",
      );
    }

    this.sql =
      sql;

    return {
      bind: (
        ...values: unknown[]
      ) => {
        if (
          this.throwAt ===
          "bind"
        ) {
          throw new Error(
            "bind failure",
          );
        }

        this.values =
          [...values];

        return {
          all: async <T>() => {
            if (
              this.throwAt ===
              "all"
            ) {
              throw new Error(
                "all failure",
              );
            }

            if (this.override) {
              return (
                this.override()
              ) as {
                success: boolean;
                results?: T[];
              };
            }

            return {
              success: true,
              results:
                this.rows as T[],
            };
          },
        };
      },
    };
  }
}

test(
  "reads one exact durable electronic payment confirmation",
  async () => {
    const database =
      new Database([
        row(),
      ]);

    const result =
      await read(
        database,
        candidate().id,
        1,
      );

    assert.equal(
      result.outcome,
      "found",
    );

    if (
      result.outcome !==
      "found"
    ) {
      return;
    }

    assert.deepEqual(
      result.value,
      validateFoodElectronicPaymentConfirmationVersion(
        candidate(),
      ),
    );

    assert.deepEqual(
      database.values,
      [
        candidate().id,
        1,
      ],
    );
  },
);

test(
  "zero rows returns not-found",
  async () => {
    const result =
      await read(
        new Database(),
        candidate().id,
        1,
      );

    assert.deepEqual(
      result,
      {
        outcome:
          "not-found",
      },
    );

    assert.ok(
      Object.isFrozen(result),
    );
  },
);

test(
  "duplicate rows return invalid",
  async () => {
    const result =
      await read(
        new Database([
          row(),
          row(),
        ]),
        candidate().id,
        1,
      );

    assert.deepEqual(
      result,
      {
        outcome: "invalid",
      },
    );
  },
);

test(
  "three rows return invalid",
  async () => {
    const result =
      await read(
        new Database([
          row(),
          row(),
          row(),
        ]),
        candidate().id,
        1,
      );

    assert.equal(
      result.outcome,
      "invalid",
    );
  },
);

for (
  const [
    label,
    id,
  ] of [
    [
      "empty ID",
      "",
    ],
    [
      "wrong prefix",
      "food-physical-order:008d",
    ],
    [
      "leading whitespace",
      " food-electronic-payment-confirmation:008d",
    ],
    [
      "trailing whitespace",
      "food-electronic-payment-confirmation:008d ",
    ],
  ] as const
) {
  test(
    `invalid lookup: ${label}`,
    async () => {
      const result =
        await read(
          new Database([
            row(),
          ]),
          id,
          1,
        );

      assert.equal(
        result.outcome,
        "invalid",
      );
    },
  );
}

for (
  const [
    label,
    version,
  ] of [
    [
      "zero",
      0,
    ],
    [
      "negative",
      -1,
    ],
    [
      "future version",
      2,
    ],
    [
      "fraction",
      1.5,
    ],
    [
      "NaN",
      Number.NaN,
    ],
    [
      "infinity",
      Number.POSITIVE_INFINITY,
    ],
    [
      "string",
      "1",
    ],
    [
      "null",
      null,
    ],
    [
      "unsafe integer",
      Number.MAX_SAFE_INTEGER + 1,
    ],
  ] as const
) {
  test(
    `invalid version: ${label}`,
    async () => {
      const result =
        await read(
          new Database([
            row(),
          ]),
          candidate().id,
          version,
        );

      assert.equal(
        result.outcome,
        "invalid",
      );
    },
  );
}

for (
  const failure of [
    "prepare",
    "bind",
    "all",
  ] as const
) {
  test(
    `${failure} failure maps to storage-failure`,
    async () => {
      const database =
        new Database([
          row(),
        ]);

      database.throwAt =
        failure;

      const result =
        await read(
          database,
          candidate().id,
          1,
        );

      assert.deepEqual(
        result,
        {
          outcome:
            "storage-failure",
        },
      );
    },
  );
}

test(
  "success false envelope maps to storage-failure",
  async () => {
    const database =
      new Database();

    database.override =
      () => ({
        success: false,
        results: [],
      });

    const result =
      await read(
        database,
        candidate().id,
        1,
      );

    assert.equal(
      result.outcome,
      "storage-failure",
    );
  },
);

test(
  "missing results envelope maps to storage-failure",
  async () => {
    const database =
      new Database();

    database.override =
      () => ({
        success: true,
      });

    const result =
      await read(
        database,
        candidate().id,
        1,
      );

    assert.equal(
      result.outcome,
      "storage-failure",
    );
  },
);

test(
  "non-array results envelope maps to storage-failure",
  async () => {
    const database =
      new Database();

    database.override =
      () => ({
        success: true,
        results: {},
      });

    const result =
      await read(
        database,
        candidate().id,
        1,
      );

    assert.equal(
      result.outcome,
      "storage-failure",
    );
  },
);

const malformedRows:
  readonly [
    string,
    () => unknown,
  ][] =
    [
      [
        "null row",
        () => null,
      ],
      [
        "array row",
        () => [],
      ],
      [
        "wrong confirmation id",
        () => ({
          ...row(),
          confirmation_id:
            "food-electronic-payment-confirmation:wrong",
        }),
      ],
      [
        "wrong confirmation version",
        () => ({
          ...row(),
          confirmation_version:
            2,
        }),
      ],
      [
        "malformed order id",
        () => ({
          ...row(),
          order_id:
            "bad-order",
        }),
      ],
      [
        "malformed order version",
        () => ({
          ...row(),
          order_version:
            0,
        }),
      ],
      [
        "malformed subtotal currency",
        () => ({
          ...row(),
          merchandise_subtotal_currency:
            "usd",
        }),
      ],
      [
        "malformed subtotal units",
        () => ({
          ...row(),
          merchandise_subtotal_minor_units:
            -1,
        }),
      ],
      [
        "wrong channel",
        () => ({
          ...row(),
          channel:
            "cash",
        }),
      ],
      [
        "empty processor",
        () => ({
          ...row(),
          processor:
            "",
        }),
      ],
      [
        "empty processor payment reference",
        () => ({
          ...row(),
          processor_payment_reference:
            "",
        }),
      ],
      [
        "empty source reference",
        () => ({
          ...row(),
          confirmation_source_reference:
            "",
        }),
      ],
      [
        "malformed confirmed currency",
        () => ({
          ...row(),
          confirmed_amount_currency:
            "usd",
        }),
      ],
      [
        "malformed confirmed units",
        () => ({
          ...row(),
          confirmed_amount_minor_units:
            -1,
        }),
      ],
      [
        "extra durable field",
        () => ({
          ...row(),
          paid_in_full:
            true,
        }),
      ],
    ];

for (
  const [
    label,
    makeRow,
  ] of malformedRows
) {
  test(
    `${label} maps to invalid`,
    async () => {
      const result =
        await read(
          new Database([
            makeRow(),
          ]),
          candidate().id,
          1,
        );

      assert.equal(
        result.outcome,
        "invalid",
      );
    },
  );
}

test(
  "accessor-backed durable row maps to invalid",
  async () => {
    const hostile =
      row();

    Object.defineProperty(
      hostile,
      "processor",
      {
        enumerable: true,
        configurable: true,
        get() {
          return "test-processor";
        },
      },
    );

    const result =
      await read(
        new Database([
          hostile,
        ]),
        candidate().id,
        1,
      );

    assert.equal(
      result.outcome,
      "invalid",
    );
  },
);

test(
  "found value is detached from database row",
  async () => {
    const durable =
      row();

    const result =
      await read(
        new Database([
          durable,
        ]),
        candidate().id,
        1,
      );

    assert.equal(
      result.outcome,
      "found",
    );

    if (
      result.outcome !==
      "found"
    ) {
      return;
    }

    durable.processor =
      "changed-after-read";

    assert.equal(
      result.value
        .evidence
        .processor,
      "test-processor",
    );
  },
);

test(
  "found value is deeply frozen",
  async () => {
    const result =
      await read(
        new Database([
          row(),
        ]),
        candidate().id,
        1,
      );

    assert.equal(
      result.outcome,
      "found",
    );

    if (
      result.outcome !==
      "found"
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
        result.value.order,
      ),
    );

    assert.ok(
      Object.isFrozen(
        result.value
          .order
          .merchandiseSubtotal,
      ),
    );

    assert.ok(
      Object.isFrozen(
        result.value.evidence,
      ),
    );

    assert.ok(
      Object.isFrozen(
        result.value
          .evidence
          .confirmedAmount,
      ),
    );
  },
);

test(
  "confirmed amount remains independent from merchandise subtotal",
  async () => {
    const durable =
      row();

    durable.confirmed_amount_minor_units =
      1200;

    const result =
      await read(
        new Database([
          durable,
        ]),
        candidate().id,
        1,
      );

    assert.equal(
      result.outcome,
      "found",
    );

    if (
      result.outcome !==
      "found"
    ) {
      return;
    }

    assert.equal(
      result.value
        .order
        .merchandiseSubtotal
        .minorUnits,
      2450,
    );

    assert.equal(
      result.value
        .evidence
        .confirmedAmount
        .minorUnits,
      1200,
    );
  },
);

test(
  "query is exact normalized read with LIMIT 2",
  async () => {
    const database =
      new Database();

    await read(
      database,
      candidate().id,
      1,
    );

    assert.match(
      database.sql,
      /^SELECT\s+confirmation_id,\s+confirmation_version,\s+order_id,\s+order_version,\s+merchandise_subtotal_currency,\s+merchandise_subtotal_minor_units,\s+channel,\s+processor,\s+processor_payment_reference,\s+confirmation_source_reference,\s+confirmed_amount_currency,\s+confirmed_amount_minor_units\s+FROM food_electronic_payment_confirmations\s+WHERE confirmation_id = \? AND confirmation_version = \?\s+LIMIT 2$/,
    );
  },
);

test(
  "source exposes only the locked read authority",
  () => {
    const source =
      readFileSync(
        new URL(
          "./d1-exact-electronic-payment-confirmation-read.ts",
          import.meta.url,
        ),
        "utf8",
      );

    for (
      const token of [
        "FoodExactElectronicPaymentConfirmationReadD1Database",
        "FoodExactElectronicPaymentConfirmationReadResult",
        "readFoodElectronicPaymentConfirmationByExactIdentity",
        "FROM food_electronic_payment_confirmations",
        "WHERE confirmation_id = ? AND confirmation_version = ?",
        "LIMIT 2",
        '"found"',
        '"not-found"',
        '"invalid"',
        '"storage-failure"',
      ]
    ) {
      assert.ok(
        source.includes(
          token,
        ),
        token,
      );
    }

    assert.doesNotMatch(
      source,
      /\bINSERT\s+INTO\b|\bUPDATE\s+\S+\s+SET\b|\bDELETE\s+FROM\b|\bREPLACE\s+INTO\b|\bUPSERT\b/i,
    );

    assert.doesNotMatch(
      source,
      /\bORDER\s+BY\b|\bMAX\s*\(|\bMIN\s*\(/i,
    );

    assert.doesNotMatch(
      source,
      /readFoodPhysicalOrderVersionByExactIdentity|d1-exact-physical-order-version-read/,
    );

    assert.doesNotMatch(
      source,
      /fetch\s*\(|Stripe|Square|PayPal|webhook/i,
    );
  },
);