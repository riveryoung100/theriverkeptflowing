import assert from "node:assert/strict";
import test from "node:test";

import {
  createFoodCashPaymentEvidenceId,
} from "./cash-payment-evidence-domain";

import {
  createFoodPhysicalOrderId,
} from "./physical-order-domain";

import {
  readFoodCashPaymentEvidenceByExactIdentity,
  type FoodExactCashPaymentEvidenceReadD1Database,
} from "./d1-exact-cash-payment-evidence-read";

const evidenceId =
  createFoodCashPaymentEvidenceId("cash-read-001");

const orderId =
  createFoodPhysicalOrderId("cash-read-order-001");

function validRow(): Record<string, unknown> {
  return {
    cash_evidence_id: evidenceId,
    cash_evidence_version: 1,
    order_id: orderId,
    order_version: 1,
    merchandise_subtotal_currency: "USD",
    merchandise_subtotal_minor_units: 2400,
    channel: "cash",
    cash_receipt_reference: "cash-receipt-001",
    confirmation_source_reference: "register-note-001",
    received_amount_currency: "USD",
    received_amount_minor_units: 1800,
  };
}

type MockCapture = {
  sql: string;
  binds: unknown[];
  prepares: number;
  reads: number;
};

function databaseFor(
  response: unknown,
): {
  database: FoodExactCashPaymentEvidenceReadD1Database;
  captured: MockCapture;
} {
  const captured: MockCapture = {
    sql: "",
    binds: [],
    prepares: 0,
    reads: 0,
  };

  const database: FoodExactCashPaymentEvidenceReadD1Database = {
    prepare(sql: string) {
      captured.prepares += 1;
      captured.sql = sql;

      return {
        bind(...values: unknown[]) {
          captured.binds = values;

          return {
            async all<T>() {
              captured.reads += 1;
              return response as {
                readonly success: boolean;
                readonly results?: T[];
              };
            },
          };
        },
      };
    },
  };

  return { database, captured };
}

async function readWith(
  response: unknown,
  id: unknown = evidenceId,
  version: unknown = 1,
) {
  const mock = databaseFor(response);

  const result =
    await readFoodCashPaymentEvidenceByExactIdentity(
      mock.database,
      id,
      version,
    );

  return { result, captured: mock.captured };
}

test("FOOD-008F: exact canonical evidence is found and immutable", async () => {
  const { result, captured } = await readWith({
    success: true,
    results: [validRow()],
  });

  assert.equal(result.outcome, "found");

  if (result.outcome !== "found") {
    assert.fail("Expected found outcome");
  }

  assert.equal(result.value.id, evidenceId);
  assert.equal(result.value.version, 1);
  assert.equal(result.value.order.id, orderId);
  assert.equal(result.value.evidence.channel, "cash");

  // Partial cash receipt remains valid; no paid-in-full inference.
  assert.equal(result.value.order.merchandiseSubtotal.minorUnits, 2400);
  assert.equal(result.value.evidence.receivedAmount.minorUnits, 1800);

  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.order), true);
  assert.equal(
    Object.isFrozen(result.value.order.merchandiseSubtotal),
    true,
  );
  assert.equal(Object.isFrozen(result.value.evidence), true);
  assert.equal(
    Object.isFrozen(result.value.evidence.receivedAmount),
    true,
  );

  assert.equal(captured.prepares, 1);
  assert.equal(captured.reads, 1);
  assert.deepEqual(captured.binds, [evidenceId, 1]);

  assert.match(
    captured.sql,
    /WHERE cash_evidence_id = \? AND cash_evidence_version = \?/,
  );
  assert.match(captured.sql, /LIMIT 2/);
  assert.equal((captured.sql.match(/\?/g) ?? []).length, 2);

  assert.doesNotMatch(
    captured.sql,
    /\b(?:INSERT|UPDATE|DELETE|REPLACE|JOIN|ORDER BY|MAX\s*\()\b/i,
  );
});

test("FOOD-008F: exact absence produces not-found", async () => {
  const { result } = await readWith({
    success: true,
    results: [],
  });

  assert.deepEqual(result, { outcome: "not-found" });
  assert.equal(Object.isFrozen(result), true);
});

test("FOOD-008F: invalid identity/version never queries storage", async () => {
  const invalidSelectors: Array<[unknown, unknown]> = [
    [null, 1],
    ["", 1],
    ["cash-read-001", 1],
    [` ${evidenceId}`, 1],
    [`${evidenceId} `, 1],
    [evidenceId, 0],
    [evidenceId, 2],
    [evidenceId, -1],
    [evidenceId, "1"],
    [evidenceId, 1.5],
    [evidenceId, Number.NaN],
    [evidenceId, Number.POSITIVE_INFINITY],
    [evidenceId, Number.MAX_SAFE_INTEGER + 1],
    [evidenceId, null],
  ];

  for (const [id, version] of invalidSelectors) {
    const mock = databaseFor({
      success: true,
      results: [validRow()],
    });

    const result =
      await readFoodCashPaymentEvidenceByExactIdentity(
        mock.database,
        id,
        version,
      );

    assert.equal(result.outcome, "invalid");
    assert.equal(mock.captured.prepares, 0);
    assert.equal(mock.captured.reads, 0);
  }
});

test("FOOD-008F: two rows are storage-failure, never first-row wins", async () => {
  const { result } = await readWith({
    success: true,
    results: [validRow(), validRow()],
  });

  assert.equal(result.outcome, "storage-failure");
});

test("FOOD-008F: wrong durable coordinates are rejected", async () => {
  const wrongIdentity = validRow();
  wrongIdentity.cash_evidence_id =
    createFoodCashPaymentEvidenceId("different");

  const wrongVersion = validRow();
  wrongVersion.cash_evidence_version = 2;

  for (const row of [wrongIdentity, wrongVersion]) {
    const { result } = await readWith({
      success: true,
      results: [row],
    });

    assert.equal(result.outcome, "storage-failure");
  }
});

test("FOOD-008F: missing and extra durable fields are rejected", async () => {
  const missing = validRow();
  delete missing.cash_receipt_reference;

  const extra = validRow();
  extra.unexpected_field = true;

  for (const row of [missing, extra]) {
    const { result } = await readWith({
      success: true,
      results: [row],
    });

    assert.equal(result.outcome, "storage-failure");
  }
});

test("FOOD-008F: invalid durable cash and money fields are rejected", async () => {
  const corruptions: Array<[string, unknown]> = [
    ["channel", "electronic"],
    ["order_version", 3],
    ["merchandise_subtotal_currency", "INVALID"],
    ["merchandise_subtotal_minor_units", -1],
    ["received_amount_minor_units", -1],
    ["received_amount_minor_units", 1.25],
    ["received_amount_minor_units", Number.MAX_SAFE_INTEGER + 1],
    ["cash_receipt_reference", ""],
    ["cash_receipt_reference", "x".repeat(501)],
    ["confirmation_source_reference", ""],
    ["confirmation_source_reference", "x".repeat(501)],
  ];

  for (const [field, replacement] of corruptions) {
    const row = validRow();
    row[field] = replacement;

    const { result } = await readWith({
      success: true,
      results: [row],
    });

    assert.equal(
      result.outcome,
      "storage-failure",
      `Expected storage-failure for ${field}`,
    );
  }
});

test("FOOD-008F: accessor row cannot execute its getter", async () => {
  const row = validRow();
  let invoked = false;

  Object.defineProperty(row, "channel", {
    enumerable: true,
    configurable: true,
    get(): string {
      invoked = true;
      throw new Error("Must not invoke row getter");
    },
  });

  const { result } = await readWith({
    success: true,
    results: [row],
  });

  assert.equal(result.outcome, "storage-failure");
  assert.equal(invoked, false);
});

test("FOOD-008F: symbol and hostile row prototype are rejected", async () => {
  const symbolRow = validRow();
  Object.defineProperty(symbolRow, Symbol("extra"), {
    value: true,
  });

  const hostileRow = Object.assign(
    Object.create({ inherited: true }) as Record<string, unknown>,
    validRow(),
  );

  for (const row of [symbolRow, hostileRow]) {
    const { result } = await readWith({
      success: true,
      results: [row],
    });

    assert.equal(result.outcome, "storage-failure");
  }
});

test("FOOD-008F: malformed D1 envelopes fail closed", async () => {
  const malformed: unknown[] = [
    null,
    false,
    {},
    { success: false, results: [] },
    { success: true },
    { success: true, results: null },
    { success: true, results: {} },
    { success: "true", results: [validRow()] },
    { success: true, results: [validRow(), validRow()] },
  ];

  for (const response of malformed) {
    const { result } = await readWith(response);
    assert.equal(result.outcome, "storage-failure");
  }
});

test("FOOD-008F: D1 envelope metadata is allowed", async () => {
  const { result } = await readWith({
    success: true,
    results: [validRow()],
    meta: { duration: 0 },
  });

  assert.equal(result.outcome, "found");
});

test("FOOD-008F: accessor envelope never executes getter", async () => {
  let invoked = false;

  const response = {
    results: [validRow()],
    get success(): boolean {
      invoked = true;
      throw new Error("Must not invoke envelope getter");
    },
  };

  const { result } = await readWith(response);

  assert.equal(result.outcome, "storage-failure");
  assert.equal(invoked, false);
});

test("FOOD-008F: unusual results array shapes fail closed", async () => {
  const sparse = new Array<unknown>(1);

  const decorated: unknown[] = [validRow()];
  Object.defineProperty(decorated, "extra", {
    value: true,
  });

  for (const rows of [sparse, decorated]) {
    const { result } = await readWith({
      success: true,
      results: rows,
    });

    assert.equal(result.outcome, "storage-failure");
  }
});

test("FOOD-008F: prepare, bind, and all failures are storage-failure", async () => {
  const prepareFailure: FoodExactCashPaymentEvidenceReadD1Database = {
    prepare() {
      throw new Error("prepare failed");
    },
  };

  const bindFailure: FoodExactCashPaymentEvidenceReadD1Database = {
    prepare() {
      return {
        bind() {
          throw new Error("bind failed");
        },
      };
    },
  };

  const readFailure: FoodExactCashPaymentEvidenceReadD1Database = {
    prepare() {
      return {
        bind() {
          return {
            async all<T>(): Promise<{
              readonly success: boolean;
              readonly results?: T[];
            }> {
              throw new Error("read failed");
            },
          };
        },
      };
    },
  };

  for (const database of [
    prepareFailure,
    bindFailure,
    readFailure,
  ]) {
    const result =
      await readFoodCashPaymentEvidenceByExactIdentity(
        database,
        evidenceId,
        1,
      );

    assert.equal(result.outcome, "storage-failure");
  }
});

test("FOOD-008F: a historical second order version can be read", async () => {
  const row = validRow();
  row.order_version = 2;

  const { result } = await readWith({
    success: true,
    results: [row],
  });

  assert.equal(result.outcome, "found");

  if (result.outcome !== "found") {
    assert.fail("Expected found");
  }

  assert.equal(result.value.order.version, 2);
});
