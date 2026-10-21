import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateFoodPhysicalOrderVersion, type FoodPhysicalOrderVersion } from "./physical-order-domain";
import {
  validateFoodCashPaymentEvidenceVersion,
} from "./cash-payment-evidence-domain";
import {
  appendFoodCashPaymentEvidence as append,
  type FoodCashPaymentEvidencePersistenceD1Database,
} from "./d1-cash-payment-evidence-persistence";

function requested(
  windowReference =
    "window:008c",
): FoodPhysicalOrderVersion {
  return validateFoodPhysicalOrderVersion({
    id:
      "food-physical-order:008c",
    version:
      1,
    state:
      "requested",
    quote: {
      id:
        "food-merchandise-quote:008c",
      version:
        1,
    },
    fulfillmentIntent: {
      id:
        "food-fulfillment-intent:008c",
      version:
        1,
      method:
        "personal-delivery",
      locationReference:
        "location:008c",
      windowReference,
    },
    reservationRequest: {
      id:
        "food-reservation-request:008c",
      version:
        1,
      capacityRequirements: [
        {
          sku: {
            id:
              "food-sku:008c",
            version:
              1,
          },
          quantity:
            2,
        },
      ],
    },
    lines: [
      {
        sku: {
          id:
            "food-sku:008c",
          version:
            1,
        },
        approvedPrice: {
          id:
            "food-approved-commercial-price:008c",
          version:
            1,
        },
        quantity:
          2,
        unitPrice: {
          currency:
            "USD",
          minorUnits:
            500,
        },
        merchandiseSubtotal: {
          currency:
            "USD",
          minorUnits:
            1000,
        },
      },
    ],
    merchandiseSubtotal: {
      currency:
        "USD",
      minorUnits:
        1000,
    },
  });
}



const columns = [
  "cash_evidence_id", "cash_evidence_version", "order_id", "order_version",
  "merchandise_subtotal_currency", "merchandise_subtotal_minor_units", "channel",
  "cash_receipt_reference", "confirmation_source_reference",
  "received_amount_currency", "received_amount_minor_units",
] as const;
type Row = Record<string, unknown>;
function order(version = 1) {
  return validateFoodPhysicalOrderVersion({ ...requested(), version, state: version === 1 ? "requested" : "cancelled" });
}
function orderRow(version = 1): Row {
  const value = order(version);
  return {
    order_id: value.id, order_version: value.version, state: value.state,
    snapshot_format_version: 1,
    snapshot_json: JSON.stringify({
      quote: value.quote, fulfillmentIntent: value.fulfillmentIntent,
      reservationRequest: value.reservationRequest, lines: value.lines,
      merchandiseSubtotal: value.merchandiseSubtotal,
    }),
  };
}
function raw(version = 1) {
  const value = order(version);
  return {
    id: "food-cash-payment-evidence:008c",
    version: 1,
    order: { id: String(value.id), version: value.version, merchandiseSubtotal: { currency: "USD", minorUnits: 1000 } },
    evidence: {
      channel: "cash",
      cashReceiptReference: "payment:008c", confirmationSourceReference: "source:008c",
      receivedAmount: { currency: "USD", minorUnits: 725 },
    },
  };
}
function row(input = raw()): Row {
  return {
    cash_evidence_id: input.id, cash_evidence_version: input.version,
    order_id: input.order.id, order_version: input.order.version,
    merchandise_subtotal_currency: input.order.merchandiseSubtotal.currency,
    merchandise_subtotal_minor_units: input.order.merchandiseSubtotal.minorUnits,
    channel: input.evidence.channel,
    cash_receipt_reference: input.evidence.cashReceiptReference,
    confirmation_source_reference: input.evidence.confirmationSourceReference,
    received_amount_currency: input.evidence.receivedAmount.currency,
    received_amount_minor_units: input.evidence.receivedAmount.minorUnits,
  };
}
function ok(results: unknown[]) { return { success: true, results }; }
type Kind = "order" | "exact" | "insert";
class Database implements FoodCashPaymentEvidencePersistenceD1Database {
  calls: { kind: Kind; sql: string; values: unknown[] }[] = [];
  rows: Row[] = [];
  orderResponse: unknown = ok([orderRow()]);
  exactResponses: (() => unknown)[] = [];
  insertAction?: (stored: Row) => unknown;
  beforeOrder?: () => void;
  failure?: { kind: Kind; method: "prepare" | "bind" | "all" };
  inserts = 0;
  prepare(sql: string) {
    const kind: Kind = sql.startsWith("INSERT") ? "insert" : sql.includes("FROM food_physical_order_versions") ? "order" : "exact";
    const call = { kind, sql, values: [] as unknown[] };
    this.calls.push(call);
    const fail = (method: "prepare" | "bind" | "all") => {
      if (this.failure?.kind === kind && this.failure.method === method) throw new Error(`synthetic ${kind} ${method}`);
    };
    fail("prepare");
    return {
      bind: (...values: unknown[]) => {
        fail("bind"); call.values = [...values];
        return {
          all: async <T>() => {
            fail("all");
            let response: unknown;
            if (kind === "order") {
              this.beforeOrder?.();
              response = this.orderResponse;
            }
            else if (kind === "exact") {
              const override = this.exactResponses.shift();
              response = override ? override() : ok(this.rows.filter(r => r.cash_evidence_id === values[0] && r.cash_evidence_version === values[1]));
            }
            else {
              this.inserts++;
              const stored = Object.fromEntries(columns.map((key, index) => [key, values[index]]));
              if (this.insertAction) response = this.insertAction(stored);
              else { this.rows.push(stored); response = ok([stored]); }
            }
            return response as { success: boolean; results?: T[] };
          },
        };
      },
    };
  }
}
function changed(path: string, value: unknown): unknown {
  const input: unknown = raw();
  const keys = path.split(".");
  let target = input as Row;
  for (const key of keys.slice(0, -1)) target = target[key] as Row;
  target[keys[keys.length - 1]!] = value;
  return input;
}
function count(db: Database, kind: Kind) { return db.calls.filter(call => call.kind === kind).length; }

test("created retains all canonical evidence and exact order facts", async () => {
  const db = new Database(); const input = raw();
  const result = await append(db, input);
  assert.equal(result.outcome, "created");
  if (result.outcome !== "created") return;
  assert.deepEqual(result.value, validateFoodCashPaymentEvidenceVersion(input));
  assert.deepEqual(db.rows, [row(input)]);
  assert.equal(count(db, "order"), 1); assert.equal(count(db, "exact"), 1); assert.equal(count(db, "insert"), 1);
  assert.deepEqual(db.calls[0]?.values, [input.order.id, input.order.version]);
  assert.deepEqual(db.calls[1]?.values, [input.id, 1]);
  assert.deepEqual(db.calls[2]?.values, columns.map(key => row(input)[key]));
});
test("identical replay authenticates order first and performs no second write", async () => {
  const db = new Database();
  assert.equal((await append(db, raw())).outcome, "created");
  const replay = await append(db, raw());
  assert.equal(replay.outcome, "already-present"); assert.equal(db.inserts, 1);
  assert.deepEqual(db.calls.map(call => call.kind), ["order", "exact", "insert", "order", "exact"]);
});
test("cancelled exact order version 2 remains historical evidence", async () => {
  const db = new Database(); db.orderResponse = ok([orderRow(2)]);
  const result = await append(db, raw(2));
  assert.equal(result.outcome, "created");
  if (result.outcome !== "created") return;
  assert.equal(result.value.order.version, 2);
  assert.equal("state" in result.value, false);
  assert.equal((db.orderResponse as { results: Row[] }).results[0]?.state, "cancelled");
});
test("confirmed amount and currency are independent from subtotal", async () => {
  const db = new Database(); const input = raw();
  input.evidence.receivedAmount = { currency: "EUR", minorUnits: 0 };
  const result = await append(db, input);
  assert.equal(result.outcome, "created");
  if (result.outcome === "created") assert.deepEqual(result.value.evidence.receivedAmount, input.evidence.receivedAmount);
});

const invalidCases: [string, unknown][] = [
  ["null", null], ["array", []], ["missing root keys", {}],
  ["confirmation ID", changed("id", "bad:id")],
  ["noncanonical ID", changed("id", " food-cash-payment-evidence:008c")],
  ...[0, 2, 1.5, "1", NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, {}, undefined].map(value => [`confirmation version ${String(value)}`, changed("version", value)] as [string, unknown]),
  ["order ID", changed("order.id", "bad:order")],
  ["order version zero", changed("order.version", 0)],
  ["order version string", changed("order.version", "1")],
  ["order version fraction", changed("order.version", 1.5)],
  ["subtotal currency", changed("order.merchandiseSubtotal.currency", "usd")],
  ["subtotal amount", changed("order.merchandiseSubtotal.minorUnits", -1)],
  ["channel", changed("evidence.channel", "electronic-processor")],
  ["payment reference", changed("evidence.cashReceiptReference", "")],
  ["source reference", changed("evidence.confirmationSourceReference", "")],
  ["amount currency", changed("evidence.receivedAmount.currency", "usd")],
  ["amount string", changed("evidence.receivedAmount.minorUnits", "725")],
  ["amount unsafe", changed("evidence.receivedAmount.minorUnits", Number.MAX_SAFE_INTEGER + 1)],
  ["amount negative", changed("evidence.receivedAmount.minorUnits", -1)],
  ["extra field", { ...raw(), paidInFull: true }],
  ["symbol", { ...raw(), [Symbol("extra")]: true }],
  ["custom prototype", Object.assign(Object.create({ inherited: true }), raw())],
  ["accessor", Object.defineProperty(raw(), "id", { get() { assert.fail("getter invoked"); } })],
  ["proxy", new Proxy(raw(), { ownKeys() { throw new Error("hostile proxy"); } })],
];
for (const [name, input] of invalidCases) {
  test(`invalid candidate ${name} before D1`, async () => {
    const db = new Database();
    assert.deepEqual(await append(db, input), { outcome: "invalid" });
    assert.equal(db.calls.length, 0);
  });
}
for (const path of ["order", "order.merchandiseSubtotal", "evidence", "evidence.receivedAmount"]) {
  test(`nested accessor rejected without invocation: ${path}`, async () => {
    const hostile = Object.defineProperty({}, "currency", { get() { assert.fail("nested getter invoked"); } });
    const db = new Database();
    assert.equal((await append(db, changed(path, hostile))).outcome, "invalid");
    assert.equal(db.calls.length, 0);
  });
}
test("inherited candidate field rejected", async () => {
  const input: Row = raw(); delete input.id;
  const db = new Database();
  assert.equal((await append(db, Object.assign(Object.create({ id: raw().id }), input))).outcome, "invalid");
  assert.equal(db.calls.length, 0);
});
test("unsupported exact order version returns FOOD-008B invalid with zero D1", async () => {
  const input = raw(); input.order.version = 3;
  const db = new Database();
  assert.deepEqual(await append(db, input), { outcome: "invalid" }); assert.equal(db.calls.length, 0);
});
test("missing exact order is invalid and no fallback or write", async () => {
  const db = new Database(); db.orderResponse = ok([]);
  assert.deepEqual(await append(db, raw()), { outcome: "invalid" });
  assert.deepEqual(db.calls.map(c => c.kind), ["order"]);
});
for (const [name, change] of [
  ["ID", { order_id: "food-physical-order:wrong" }],
  ["version", { order_version: 2 }],
] as [string, Row][]) {
  test(`wrong durable order ${name} is storage-failure`, async () => {
    const db = new Database(); db.orderResponse = ok([{ ...orderRow(), ...change }]);
    assert.deepEqual(await append(db, raw()), { outcome: "storage-failure" }); assert.equal(count(db, "insert"), 0);
  });
}
for (const [name, value] of [["amount", 999], ["currency", "EUR"]] as const) {
  test(`candidate subtotal ${name} mismatch is invalid`, async () => {
    const db = new Database();
    const input = changed(`order.merchandiseSubtotal.${name === "amount" ? "minorUnits" : "currency"}`, value);
    assert.deepEqual(await append(db, input), { outcome: "invalid" }); assert.equal(count(db, "exact"), 0);
  });
}
for (const response of [null, { success: false, results: [] }, { success: true }, { success: true, results: {} }]) {
  test(`untrustworthy order response ${JSON.stringify(response)}`, async () => {
    const db = new Database(); db.orderResponse = response;
    assert.equal((await append(db, raw())).outcome, "storage-failure"); assert.equal(count(db, "insert"), 0);
  });
}
for (const [field, divergent] of [
  ["order_id", "food-physical-order:other"], ["order_version", 2],
  ["merchandise_subtotal_currency", "EUR"], ["merchandise_subtotal_minor_units", 999],
["cash_receipt_reference", "other-payment"],
  ["confirmation_source_reference", "other-source"], ["received_amount_currency", "EUR"],
  ["received_amount_minor_units", 100],
] as [string, unknown][]) {
  test(`canonical existing divergence ${field} is conflict without write`, async () => {
    const db = new Database(); db.rows.push({ ...row(), [field]: divergent });
    assert.deepEqual(await append(db, raw()), { outcome: "conflict" }); assert.equal(count(db, "insert"), 0);
  });
}
test("distinct identities may repeat processor/payment/source references", async () => {
  const db = new Database(); const first = raw(); const second = raw(); second.id += "-other";
  assert.equal((await append(db, first)).outcome, "created");
  assert.equal((await append(db, second)).outcome, "created"); assert.equal(db.rows.length, 2);
});

const malformedRows: [string, () => unknown][] = [
  ["null", () => null], ["array", () => []],
  ["missing", () => { const r = row(); delete r.cash_receipt_reference; return r; }],
  ["extra", () => ({ ...row(), extra: true })],
  ["symbol", () => ({ ...row(), [Symbol("bad")]: true })],
  ["inherited", () => { const r = row(); delete r.cash_receipt_reference; return Object.assign(Object.create({ cash_receipt_reference: "receipt-inherited" }), r); }],
  ["prototype", () => Object.assign(Object.create({}), row())],
  ["accessor", () => Object.defineProperty(row(), "cash_receipt_reference", { get() { assert.fail("row getter invoked"); } })],
  ["wrong ID", () => ({ ...row(), cash_evidence_id: "food-cash-payment-evidence:wrong" })],
  ["wrong version", () => ({ ...row(), cash_evidence_version: 2 })],
  ["wrong numeric type", () => ({ ...row(), received_amount_minor_units: "725" })],
  ["unsafe money", () => ({ ...row(), received_amount_minor_units: Number.MAX_SAFE_INTEGER + 1 })],
  ["invalid channel", () => ({ ...row(), channel: "electronic-processor" })],
  ["unsupported order version", () => ({ ...row(), order_version: 3 })],
  ["noncanonical text", () => ({ ...row(), cash_receipt_reference: " spaced " })],
  ["noncanonical currency", () => ({ ...row(), received_amount_currency: "usd" })],
];
for (const [name, make] of malformedRows) {
  test(`malformed exact stored row ${name}`, async () => {
    const db = new Database(); db.exactResponses.push(() => ok([make()]));
    assert.deepEqual(await append(db, raw()), { outcome: "storage-failure" }); assert.equal(count(db, "insert"), 0);
  });
}
const malformedEnvelopes: [string, () => unknown][] = [
  ["null", () => null], ["array", () => []], ["false success", () => ({ success: false, results: [] })],
  ["missing success", () => ({ results: [] })], ["missing results", () => ({ success: true })],
  ["non-array", () => ({ success: true, results: {} })],
  ["inherited success", () => Object.assign(Object.create({ success: true }), { results: [] })],
  ["getter", () => ({ get success() { return assert.fail("envelope getter invoked"); }, results: [] })],
  ["duplicate", () => ok([row(), row()])], ["sparse", () => ok(new Array(1))],
  ["array accessor", () => ok(Object.defineProperty([row()], "0", { get() { assert.fail("array getter invoked"); } }))],
];
for (const [name, make] of malformedEnvelopes) {
  test(`malformed exact envelope ${name}`, async () => {
    const db = new Database(); db.exactResponses.push(make);
    assert.deepEqual(await append(db, raw()), { outcome: "storage-failure" }); assert.equal(count(db, "insert"), 0);
  });
}
for (const kind of ["order", "exact", "insert"] as const) {
  for (const method of ["prepare", "bind", "all"] as const) {
    test(`storage throws during ${kind} ${method}`, async () => {
      const db = new Database(); db.failure = { kind, method };
      assert.deepEqual(await append(db, raw()), { outcome: "storage-failure" });
      assert.ok(count(db, "insert") <= 1);
      if (kind === "insert") assert.equal(count(db, "exact"), 2);
    });
  }
}
for (const mode of ["throw", "uncertain", "empty", "duplicate", "malformed", "mismatch"] as const) {
  test(`insert ${mode} resolves identical durable row through one reread`, async () => {
    const db = new Database();
    db.insertAction = stored => {
      db.rows.push(stored);
      if (mode === "throw") throw new Error("uniqueness race");
      if (mode === "uncertain") return { success: false };
      if (mode === "empty") return ok([]);
      if (mode === "duplicate") return ok([stored, stored]);
      if (mode === "malformed") return ok([{}]);
      return ok([{ ...stored, cash_receipt_reference: "different" }]);
    };
    const result = await append(db, raw());
    assert.equal(result.outcome, "already-present");
    assert.equal(count(db, "insert"), 1); assert.equal(count(db, "exact"), 2);
  });
}
for (const [name, recovery, expected] of [
  ["divergent", () => ok([{ ...row(), cash_receipt_reference: "raced" }]), "conflict"],
  ["absent", () => ok([]), "storage-failure"],
  ["malformed", () => ok([{}]), "storage-failure"],
  ["multiple", () => ok([row(), row()]), "storage-failure"],
  ["throwing", () => { throw new Error("recovery read failure"); }, "storage-failure"],
] as [string, () => unknown, string][]) {
  test(`uncertain insert with ${name} recovery`, async () => {
    const db = new Database();
    db.exactResponses.push(() => ok([]), recovery);
    db.insertAction = () => { throw new Error("uncertain insert"); };
    assert.equal((await append(db, raw())).outcome, expected);
    assert.equal(count(db, "insert"), 1); assert.equal(count(db, "exact"), 2);
  });
}
test("candidate captured before await and success detached from database", async () => {
  const input = raw(); const expected = validateFoodCashPaymentEvidenceVersion(input);
  const db = new Database();
  db.beforeOrder = () => {
    input.id += "-changed"; input.evidence.cashReceiptReference = "changed";
    input.order.merchandiseSubtotal.minorUnits = 999;
  };
  const result = await append(db, input);
  assert.equal(result.outcome, "created");
  if (result.outcome !== "created") return;
  assert.deepEqual(result.value, expected);
  db.rows[0]!.cash_receipt_reference = "mutated";
  assert.equal(result.value.evidence.cashReceiptReference, "payment:008c");
  assert.notStrictEqual(result.value.order, input.order);
  assert.notStrictEqual(result.value.evidence, input.evidence);
});
test("created and replay results are deeply frozen", async () => {
  const db = new Database();
  function frozen(value: unknown) {
    if (typeof value !== "object" || value === null) return;
    assert.ok(Object.isFrozen(value)); for (const nested of Object.values(value)) frozen(nested);
  }
  frozen(await append(db, raw())); frozen(await append(db, raw()));
});
const source = readFileSync(new URL("./d1-cash-payment-evidence-persistence.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../../../migrations/food/0010_food_cash_payment_evidence.sql", import.meta.url), "utf8");
test("exact public persistence surface only", () => {
  assert.deepEqual([...source.matchAll(/export (?:async )?(?:interface|type|function) (\w+)/g)].map(m => m[1]), [
    "FoodCashPaymentEvidencePersistenceD1Database", "FoodCashPaymentEvidencePersistenceResult", "appendFoodCashPaymentEvidence",
  ]);
});
test("SQL uses one exact order read and normalized insert, no other mutation or inference", async () => {
  const db = new Database(); await append(db, raw());
  const exact = db.calls.find(call => call.kind === "exact")!;
  const insert = db.calls.find(call => call.kind === "insert")!;
  assert.match(exact.sql, /FROM food_cash_payment_evidence\s+WHERE cash_evidence_id = \? AND cash_evidence_version = \?\s+LIMIT 2$/);
  assert.match(insert.sql, /^INSERT INTO food_cash_payment_evidence/);
  assert.equal((insert.sql.match(/\?/g) ?? []).length, 11);
  assert.match(insert.sql, /RETURNING cash_evidence_id/);
  for (const column of columns) assert.ok(insert.sql.includes(column));
  for (const call of db.calls) assert.doesNotMatch(call.sql, /\b(?:UPDATE|DELETE|UPSERT|REPLACE|ORDER BY|MAX)\b|readiness/i);
});
test("results grant recorded evidence only, no operational authority", async () => {
  const db = new Database(); const result = await append(db, raw());
  assert.deepEqual(Object.keys(result), ["outcome", "value"]);
  if (result.outcome !== "created") assert.fail("expected created");
  assert.deepEqual(Object.keys(result.value), ["id", "version", "order", "evidence"]);
  assert.deepEqual(Object.keys(result.value.evidence), ["channel", "cashReceiptReference", "confirmationSourceReference", "receivedAmount"]);
  assert.match(source, /FOOD-008E/);
});
test("declarative normalized schema has all 11 required columns and strict primary identity", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS food_cash_payment_evidence/);
  for (const column of columns) assert.match(migration, new RegExp(`\\b${column} (?:TEXT|INTEGER) NOT NULL`));
  assert.match(migration, /PRIMARY KEY \(cash_evidence_id, cash_evidence_version\)/);
  assert.match(migration, /cash_evidence_version = 1/);
  assert.match(migration, /order_version IN \(1, 2\)/);
  assert.match(migration, /channel = 'cash'/);
  assert.match(migration, /\) STRICT;/);
});
for (const operation of ["UPDATE", "DELETE"]) {
  test(`migration statically prevents ${operation}`, () => {
    assert.match(migration, new RegExp(`BEFORE ${operation} ON food_cash_payment_evidence\\s+BEGIN\\s+SELECT RAISE\\(ABORT,`));
  });
}
test("migration constrains independent money and bounded references", () => {
  for (const prefix of ["merchandise_subtotal", "received_amount"]) {
    assert.match(migration, new RegExp(`${prefix}_minor_units BETWEEN 0 AND 9007199254740991`));
    assert.match(migration, new RegExp(`length\\(${prefix}_currency\\) = 3`));
    assert.ok(migration.includes(`${prefix}_currency GLOB '[A-Z][A-Z][A-Z]'`));
  }
  assert.match(migration, /length\(cash_receipt_reference\) BETWEEN 1 AND 500/);
  assert.match(migration, /length\(confirmation_source_reference\) BETWEEN 1 AND 500/);
  assert.match(migration, /length\('food-cash-payment-evidence:'\) \+ 200/);
});
test("no migration execution, provider requests or unrelated side effects", () => {
  assert.doesNotMatch(source, /\b(?:exec|batch|transaction)\s*\(|PRAGMA|wrangler|fetch\s*\(|Date\.now|new Date|Math\.random|randomUUID|node:fs/);
  assert.match(migration, /declarative only/);
});
test("cash schema does not invent foreign-key, receipt uniqueness or payment authority", () => {
  const sql = migration.replace(/--[^\n]*/g, "");
  assert.doesNotMatch(sql, /\bFOREIGN KEY\b/i);
  assert.doesNotMatch(sql, /\bCASCADE\b/i);
  assert.doesNotMatch(sql, /\bUNIQUE\s*\(/i);
  assert.doesNotMatch(sql, /\bprocessor\b/i);
  assert.doesNotMatch(sql, /\bcollector_id\b/i);
  assert.doesNotMatch(sql, /\bpaid_in_full\b/i);
  assert.doesNotMatch(sql, /\bprovider_event\b/i);
  assert.match(sql, /cash_evidence_version = 1/);
  assert.match(sql, /channel = 'cash'/);
  assert.match(sql, /PRIMARY KEY \(cash_evidence_id, cash_evidence_version\)/);
  assert.match(sql, /length\(cash_receipt_reference\) BETWEEN 1 AND 500/);
  assert.match(sql, /length\(confirmation_source_reference\) BETWEEN 1 AND 500/);
});
