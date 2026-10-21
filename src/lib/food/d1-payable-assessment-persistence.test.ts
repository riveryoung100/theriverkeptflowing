import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as api from "./d1-payable-assessment-persistence";
import {
  appendFoodPayableAssessment as append,
  type FoodPayableAssessmentPersistenceD1Database,
  type FoodPayableAssessmentPersistenceResult,
} from "./d1-payable-assessment-persistence";
import {
  validateFoodPayableAssessmentVersion,
  validateFoodPayableAssessmentAgainstOrder,
  createInitialFoodPayableAssessmentVersion,
  createFoodPayableAssessmentId,
  reviseFoodPayableAssessmentVersion,
} from "./payable-assessment-domain";
import { parseFoodPhysicalOrderId, validateFoodPhysicalOrderVersion } from "./physical-order-domain";
import { parseFoodPayableAssessmentId } from "./payable-assessment-domain";

type Row = Record<string, unknown>;
type Kind = "order" | "exact" | "insert" | "unexpected";
type Call = { kind: Kind; sql: string; values: unknown[]; bound?: boolean };
type Step = unknown | ((call: Call) => unknown);
const columns = ["assessment_id", "assessment_version", "order_id", "order_version", "snapshot_format_version", "snapshot_json"];
// Independent expectations from FOOD-008G privateSql/migration 0011 and the
// FOOD-008B exact reader contract. Never extract SQL from the runtime adapter.
const expectedSql = {
  order: "SELECT order_id, order_version, state, snapshot_format_version, snapshot_json FROM food_physical_order_versions WHERE order_id = ? AND order_version = ? LIMIT 2",
  exact: "SELECT assessment_id, assessment_version, order_id, order_version, snapshot_format_version, snapshot_json FROM food_payable_assessment_versions WHERE assessment_id = ? AND assessment_version = ? LIMIT 2",
  insert: "INSERT INTO food_payable_assessment_versions (assessment_id, assessment_version, order_id, order_version, snapshot_format_version, snapshot_json) VALUES (?, ?, ?, ?, ?, ?) RETURNING assessment_id, assessment_version, order_id, order_version, snapshot_format_version, snapshot_json",
} as const;
const normalizeSql = (sql: string) => sql.trim().replace(/\s+/g, " ");
function sqlKind(sql: string): Kind {
  const normalized = normalizeSql(sql);
  for (const kind of ["order", "exact", "insert"] as const) {
    if (normalized === expectedSql[kind]) return kind;
  }
  return "unexpected";
}
function verifyCall(call: Call): void {
  assert.notEqual(call.kind, "unexpected", `Unexpected SQL: ${call.sql}`);
  assert.equal(sqlKind(call.sql), call.kind, "SQL must match its entire independent role contract");
  if (!call.bound) {
    assert.deepEqual(call.values, []); // prepare failed before bind
    return;
  }
  const values = call.values;
  assert.equal(values.length, call.kind === "insert" ? 6 : 2, "Exact bind arity");
  assert.ok(values.every(value => typeof value === "string" || typeof value === "number"), "Primitive binds only");
  const version = values[1];
  assert.equal(typeof version, "number");
  assert.ok(Number.isSafeInteger(version) && (version as number) > 0);
  if (call.kind === "order") {
    assert.equal(parseFoodPhysicalOrderId(values[0]), values[0]);
    assert.ok(version === 1 || version === 2);
  }
  else {
    assert.equal(parseFoodPayableAssessmentId(values[0]), values[0]);
    if (call.kind === "insert") {
      assert.equal(parseFoodPhysicalOrderId(values[2]), values[2]);
      assert.ok(values[3] === 1 || values[3] === 2);
      assert.equal(values[4], 1);
      assert.equal(typeof values[5], "string");
      const value = validateFoodPayableAssessmentVersion(JSON.parse(values[5] as string));
      const canonical = JSON.stringify(value);
      assert.equal(values[5], canonical, "Canonical complete snapshot bind");
      assert.deepEqual(values, [value.id, value.version, value.order.id, value.order.version, 1, canonical], "Exact INSERT binding order");
    }
  }
}
function verifySequence(calls: readonly Call[], expected: readonly { kind: Kind; values: readonly unknown[] }[]) {
  calls.forEach(verifyCall);
  assert.deepEqual(calls.map(({ kind, values }) => ({ kind, values })), expected);
}
// Top-level tests run sequentially; schedules within a test may use multiple
// concurrent appends. Audit all their databases in the runner's own hook, after
// the public calls finish and outside every adapter catch boundary.
const databases = new Set<Database>();
afterEach(() => {
  try {
    for (const db of databases) {
      assert.deepEqual(db.unexpectedSql, [], "Recorded SQL mismatches cannot be swallowed");
      db.calls.forEach(verifyCall);
    }
  }
  finally { databases.clear(); }
});
const specification = JSON.parse(readFileSync(new URL("../../../.river-dev/specifications/food-008g-durable-payable-assessment-persistence.json", import.meta.url), "utf8")) as {
  testPlan: { adversarialMatrix: { cases: string[] }[] };
};
const coverage = new Map<string, number>();
function planned(group: number, name: string, body: () => void | Promise<void>) {
  assert.ok(specification.testPlan.adversarialMatrix[group - 1].cases.includes(name), name);
  assert.ok(!coverage.has(name), `duplicate coverage: ${name}`);
  coverage.set(name, group);
  test(`matrix G${group}: ${name}`, body);
}
const m = (minorUnits = 1000, currency = "USD") => ({ currency, minorUnits });
const adjustment = (reference = "charge", minorUnits = 100, direction: "charge" | "credit" = "charge") => ({
  direction, reference, money: m(minorUnits), sourceReference: "policy:assertion",
});
function order(version = 1, id = "food-physical-order:008g", subtotal = 1000) {
  return validateFoodPhysicalOrderVersion({
    id, version, state: version === 1 ? "requested" : "cancelled",
    quote: { id: "food-merchandise-quote:008g", version: 1 },
    fulfillmentIntent: {
      id: "food-fulfillment-intent:008g", version: 1, method: "personal-delivery",
      locationReference: "location:008g", windowReference: "window:008g",
    },
    reservationRequest: {
      id: "food-reservation-request:008g", version: 1,
      capacityRequirements: [{ sku: { id: "food-sku:008g", version: 1 }, quantity: 1 }],
    },
    lines: [{
      sku: { id: "food-sku:008g", version: 1 },
      approvedPrice: { id: "food-approved-commercial-price:008g", version: 1 },
      quantity: 1, unitPrice: m(subtotal), merchandiseSubtotal: m(subtotal),
    }],
    merchandiseSubtotal: m(subtotal),
  });
}
function orderRow(version = 1, id = "food-physical-order:008g", subtotal = 1000): Row {
  const v = order(version, id, subtotal);
  return {
    order_id: v.id, order_version: v.version, state: v.state, snapshot_format_version: 1,
    snapshot_json: JSON.stringify({
      quote: v.quote, fulfillmentIntent: v.fulfillmentIntent, reservationRequest: v.reservationRequest,
      lines: v.lines, merchandiseSubtotal: v.merchandiseSubtotal,
    }),
  };
}
function raw(version = 1, orderVersion = 1) {
  return {
    id: "food-payable-assessment:008g", version,
    order: { id: "food-physical-order:008g", version: orderVersion, merchandiseSubtotal: m() },
    adjustments: [adjustment()], amountDue: m(1100),
    assessment: { attribution: "assessor:assertion", sourceReference: "source:008g", assessedOn: "2026-10-21" },
  };
}
type Raw = ReturnType<typeof raw>;
function row(input: unknown = raw()): Row {
  const v = validateFoodPayableAssessmentVersion(input);
  // Independent fixture serialization relies on the source domain's field order,
  // not on any exported implementation helper.
  return {
    assessment_id: v.id, assessment_version: v.version, order_id: v.order.id, order_version: v.order.version,
    snapshot_format_version: 1, snapshot_json: JSON.stringify(v),
  };
}
const ok = (results: unknown[]) => ({ success: true, results });
const key = (id: unknown, version: unknown) => JSON.stringify([id, version]);

/** Deterministic operation double, NOT an executed SQLite/D1 schema proof. */
class Database implements FoodPayableAssessmentPersistenceD1Database {
  calls: Call[] = [];
  unexpectedSql: string[] = [];
  durable = new Map<string, Row>();
  orderResponse: unknown = ok([orderRow()]);
  exactSteps: Step[] = [];
  insertStep?: (call: Call, proposed: Row) => unknown;
  beforeOrder?: () => void;
  failure?: { kind: Kind; method: "prepare" | "bind" | "all" };
  constructor() { databases.add(this); }
  prepare(sql: string) {
    const kind = sqlKind(sql);
    const call: Call = { kind, sql, values: [] };
    this.calls.push(call);
    if (kind === "unexpected") {
      this.unexpectedSql.push(sql);
      throw new TypeError("Unrecognized statement; recorded for external audit");
    }
    const fail = (method: "prepare" | "bind" | "all") => {
      if (this.failure?.kind === kind && this.failure.method === method) {
        this.failure = undefined;
        throw new Error("synthetic database failure");
      }
    };
    fail("prepare");
    return {
      bind: (...values: unknown[]) => {
        call.values = [...values]; call.bound = true;
        fail("bind");
        return {
          all: async <T>() => {
            fail("all");
            let result: unknown;
            if (kind === "order") {
              this.beforeOrder?.();
              result = this.orderResponse;
            }
            else if (kind === "exact") {
              if (this.exactSteps.length) {
                const step = this.exactSteps.shift();
                result = typeof step === "function" ? await step(call) : step;
              }
              else {
                const found = this.durable.get(key(values[0], values[1]));
                result = ok(found ? [found] : []);
              }
            }
            else {
              const proposed = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
              result = this.insertStep ? await this.insertStep(call, proposed) : this.insert(proposed);
            }
            return result as { readonly success: boolean; readonly results?: T[] };
          },
        };
      },
    };
  }
  insert(proposed: Row) {
    // Model the specified guard outcomes only. Real guard operation is deferred.
    const k = key(proposed.assessment_id, proposed.assessment_version);
    if (this.durable.has(k)) throw new Error("simulated uniqueness rejection");
    const version = proposed.assessment_version as number;
    if (version === 1 && [...this.durable.values()].some(v => v.assessment_id === proposed.assessment_id)) {
      throw new Error("simulated initial guard");
    }
    if (version > 1) {
      const previous = this.durable.get(key(proposed.assessment_id, version - 1));
      if (!previous || previous.order_id !== proposed.order_id || previous.order_version !== proposed.order_version) {
        throw new Error("simulated predecessor guard");
      }
    }
    this.durable.set(k, proposed);
    return ok([proposed]);
  }
  seed(value: Row) { this.durable.set(key(value.assessment_id, value.assessment_version), value); }
  kinds() { return this.calls.map(call => call.kind); }
  inserts() { return this.calls.filter(call => call.kind === "insert").length; }
}

function outcome(result: FoodPayableAssessmentPersistenceResult, expected: string) {
  assert.equal(result.outcome, expected);
  assert.ok(Object.isFrozen(result));
  assert.deepEqual(Object.keys(result), expected === "created" || expected === "already-present" ? ["outcome", "value"] : ["outcome"]);
}
async function invalid(input: unknown) {
  const db = new Database();
  outcome(await append(db, input), "invalid");
  assert.deepEqual(db.calls, []);
}
function change(path: string, value: unknown): Raw {
  const input = raw();
  const parts = path.split(".");
  let parent: unknown = input;
  for (const part of parts.slice(0, -1)) parent = (parent as Row)[part];
  (parent as Row)[parts[parts.length - 1]] = value;
  return input;
}
function invalidCases(group: number, cases: Record<string, () => unknown>) {
  for (const [name, fixture] of Object.entries(cases)) planned(group, name, () => invalid(fixture()));
}

invalidCases(1, {
  "null candidate": () => null, "undefined candidate": () => undefined,
  "incorrect primitive type": () => "assessment", "array root": () => [],
  "malformed assessment identity": () => change("id", "food-payable-assessment:a:b"),
  "whitespace identity": () => change("id", "food-payable-assessment: x"),
  "wrong identity prefix": () => change("id", "food-cash-payment-evidence:008g"),
  "overlong identity": () => change("id", `food-payable-assessment:${"x".repeat(201)}`),
});
invalidCases(2, Object.fromEntries([
  ["version zero", 0], ["negative version", -1], ["fractional version", 1.5], ["numeric string version", "1"],
  ["NaN version", NaN], ["Infinity version", Infinity], ["unsafe version", Number.MAX_SAFE_INTEGER + 1],
  ["boxed version", Object(1)],
].map(([name, value]) => [String(name), () => change("version", value)])));
invalidCases(3, {
  "negative money": () => change("adjustments.0.money.minorUnits", -1),
  "fractional money": () => change("adjustments.0.money.minorUnits", 0.1),
  "unsafe monetary integer": () => change("adjustments.0.money.minorUnits", Number.MAX_SAFE_INTEGER + 1),
  "stringified money": () => change("adjustments.0.money.minorUnits", "100"),
  "non-finite money": () => change("amountDue.minorUnits", Infinity),
  "lowercase/malformed currency": () => change("order.merchandiseSubtotal.currency", "usd"),
  "cross-currency adjustment": () => change("adjustments.0.money.currency", "EUR"),
  "amountDue currency substitution": () => change("amountDue.currency", "EUR"),
});
invalidCases(4, {
  "gross charge sum overflow": () => change("adjustments.0.money.minorUnits", Number.MAX_SAFE_INTEGER),
  "credit sum overflow": () => {
    const v = raw(); v.adjustments = [adjustment("a", Number.MAX_SAFE_INTEGER, "credit"), adjustment("b", 1, "credit")]; return v;
  },
  "net safe but intermediate unsafe": () => {
    const v = raw(); v.adjustments = [adjustment("a", Number.MAX_SAFE_INTEGER), adjustment("b", Number.MAX_SAFE_INTEGER, "credit")]; v.amountDue = m(); return v;
  },
  "credits exceed gross": () => change("adjustments", [adjustment("credit", 1001, "credit")]),
  "forged amountDue": () => change("amountDue.minorUnits", 1101),
  "subtotal substituted for adjusted amountDue": () => change("amountDue.minorUnits", 1000),
});
invalidCases(5, {
  "unexpected property": () => ({ ...raw(), paid: true }),
  "symbol key": () => ({ ...raw(), [Symbol("authority")]: true }),
  "inherited field": () => { const v = raw(); const { id, ...rest } = v; return Object.assign(Object.create({ id }), rest); },
  "throwing proxy trap": () => new Proxy(raw(), { ownKeys() { throw new Error("trap"); } }),
  "custom prototype": () => Object.assign(Object.create({ custom: true }), raw()),
  "cyclic graph": () => { const v = raw(); return change("order.merchandiseSubtotal", v); },
});
planned(5, "accessor property", async () => {
  const input = raw(); let calls = 0;
  const getter = () => { calls++; return "food-payable-assessment:008g"; };
  Object.defineProperty(input, "id", { get: getter });
  await invalid(input);
  assert.equal(calls, 0, "Root getter was never executed");
  assert.equal(Object.getOwnPropertyDescriptor(input, "id")?.get, getter);
  assert.equal(Object.isFrozen(input), false);
});
invalidCases(6, {
  "sparse adjustments": () => change("adjustments", Array(1)),
  "inherited array index": () => {
    const a = Array(1); Object.setPrototypeOf(a, Object.assign(Object.create(Array.prototype), { 0: adjustment() })); return change("adjustments", a);
  },
  "extra array property": () => change("adjustments", Object.assign([adjustment()], { extra: true })),
  "more than 32 adjustments": () => change("adjustments", Array.from({ length: 33 }, (_, i) => adjustment(String(i), 0))),
  "excessively long reference": () => change("adjustments.0.reference", "x".repeat(513)),
  "missing adjustment field": () => { const v = raw(); Reflect.deleteProperty(v.adjustments[0], "sourceReference"); return v; },
  "duplicate charge reference": () => change("adjustments", [adjustment(), adjustment()]),
  "charge/credit same reference": () => change("adjustments", [adjustment(), adjustment("charge", 100, "credit")]),
  "unsupported adjustment direction": () => change("adjustments.0.direction", "refund"),
});
planned(6, "accessor array slot", async () => {
  const adjustments = [adjustment()]; let calls = 0;
  const getter = () => { calls++; return adjustment(); };
  Object.defineProperty(adjustments, "0", { get: getter });
  await invalid(change("adjustments", adjustments));
  assert.equal(calls, 0, "Adjustment slot getter was never executed");
  assert.equal(Object.getOwnPropertyDescriptor(adjustments, "0")?.get, getter);
  assert.equal(Object.isFrozen(adjustments), false);
});
invalidCases(7, {
  "missing assessment metadata": () => { const v = raw(); Reflect.deleteProperty(v, "assessment"); return v; },
  "null metadata": () => change("assessment", null),
  "invalid assessedOn date": () => change("assessment.assessedOn", "2026-13-01"),
  "leap-date error": () => change("assessment.assessedOn", "2025-02-29"),
  "empty attribution": () => change("assessment.attribution", ""),
  "overlong source reference": () => change("assessment.sourceReference", "x".repeat(513)),
});

for (const name of specification.testPlan.adversarialMatrix[7].cases) planned(8, name, async () => {
  const db = new Database(); const v = raw();
  let calls = 1;
  let expected = "invalid";
  if (name === "missing exact physical order") db.orderResponse = ok([]);
  if (name === "invalid exact order selector") { v.order.version = 3; calls = 0; }
  // Existing different order has a different authenticated subtotal. A returned
  // row at the wrong SELECT coordinate is a separate G9 storage-failure fixture.
  if (name === "candidate wrong exact order") {
    assert.throws(() => validateFoodPayableAssessmentAgainstOrder({ ...v, order: { ...v.order, id: "food-physical-order:other" } }, order()));
    v.order.id = "food-physical-order:other"; db.orderResponse = ok([orderRow(1, v.order.id, 1200)]);
  }
  if (name === "candidate/order version mismatch") {
    v.order.version = 2;
    assert.throws(() => validateFoodPayableAssessmentAgainstOrder(v, order(1)));
    // With the real exact reader, returning version 1 for SELECT version 2 is
    // rejected before against-order validation. N1: storage corruption takes
    // precedence over the matrix group's shorthand candidate-invalid outcome.
    db.orderResponse = ok([orderRow(1)]); expected = "storage-failure";
  }
  if (name === "candidate/subtotal mismatch") { v.order.merchandiseSubtotal = m(999); v.amountDue = m(1099); }
  if (name === "candidate/order currency mismatch") {
    v.order.merchandiseSubtotal = m(1000, "EUR"); v.adjustments[0].money = m(100, "EUR"); v.amountDue = m(1100, "EUR");
  }
  outcome(await append(db, v), expected); assert.equal(db.calls.length, calls); assert.equal(db.inserts(), 0);
});
for (const name of specification.testPlan.adversarialMatrix[8].cases) planned(9, name, async () => {
  const db = new Database(); const r = orderRow();
  if (name === "wrong returned durable order ID") r.order_id = "food-physical-order:wrong";
  if (name === "wrong returned durable order version") r.order_version = 2;
  if (name === "malformed durable order snapshot") r.snapshot_json = "{";
  db.orderResponse = ok([r]);
  if (name === "order connection/query failure") db.failure = { kind: "order", method: "all" };
  outcome(await append(db, raw()), "storage-failure"); assert.deepEqual(db.kinds(), ["order"]);
});
for (const name of specification.testPlan.adversarialMatrix[9].cases) planned(10, name, async () => {
  const db = new Database(); const existing = raw(); const requested = raw();
  if (name === "same assessment key with changed payload") existing.adjustments[0].sourceReference = "other";
  if (name === "same key with different metadata") existing.assessment.attribution = "other";
  if (name === "same key with another order") existing.order.id = "food-physical-order:other";
  if (name === "same key with reordered adjustments") {
    existing.adjustments.push(adjustment("b", 0)); requested.adjustments = [...existing.adjustments].reverse();
  }
  if (name === "duplicate version with different due") { existing.adjustments[0].money = m(200); existing.amountDue = m(1200); }
  db.seed(row(existing)); outcome(await append(db, requested), "conflict");
  assert.deepEqual(db.kinds(), ["order", "exact"]);
});
for (const name of specification.testPlan.adversarialMatrix[10].cases) planned(11, name, async () => {
  const db = new Database(); const v = raw(2); const previous = raw();
  if (name === "new version gap") { v.version = 3; db.seed(row(previous)); }
  if (name === "retargeted revision") { previous.order.id = "food-physical-order:other"; db.seed(row(previous)); }
  if (name === "new order version under old assessment ID") {
    v.order.version = 2; db.orderResponse = ok([orderRow(2)]); db.seed(row(previous));
  }
  if (name === "revision after maximum safe version") { v.version = Number.MAX_SAFE_INTEGER + 1; previous.version = Number.MAX_SAFE_INTEGER; db.seed(row(previous)); }
  outcome(await append(db, v), name === "revision after maximum safe version" ? "invalid" : "conflict");
  assert.equal(db.inserts(), 0);
  assert.equal(db.calls.length, name === "revision after maximum safe version" ? 0 : 3);
});
for (const name of specification.testPlan.adversarialMatrix[11].cases) planned(12, name, async () => {
  const db = new Database(); let r = row();
  let getterCalls = 0;
  if (name === "stored wrong ID") r.assessment_id = "food-payable-assessment:wrong";
  if (name === "stored wrong version") r.assessment_version = 2;
  if (name === "stored/payload order mismatch") r.order_id = "food-physical-order:other";
  if (name === "stored missing field") delete r.snapshot_json;
  if (name === "stored extra field") r.paid = true;
  if (name === "stored row accessor") {
    const text = r.snapshot_json;
    Object.defineProperty(r, "snapshot_json", { get() { getterCalls++; return text; } });
  }
  if (name === "stored custom prototype") r = Object.assign(Object.create({ custom: true }), r);
  db.exactSteps = [ok(name === "duplicate exact rows" ? [r, r] : [r])];
  outcome(await append(db, raw()), "storage-failure"); assert.deepEqual(db.kinds(), ["order", "exact"]);
  assert.equal(getterCalls, 0);
});
for (const name of specification.testPlan.adversarialMatrix[12].cases) planned(13, name, async () => {
  const db = new Database(); const r = row(); const text = String(r.snapshot_json);
  if (name === "unsupported snapshot format") r.snapshot_format_version = 2;
  if (name === "corrupted JSON") r.snapshot_json = "{";
  if (name === "array/null snapshot root") r.snapshot_json = "null";
  if (name === "missing JSON field") { const v = raw(); Reflect.deleteProperty(v.assessment, "sourceReference"); r.snapshot_json = JSON.stringify(v); }
  if (name === "extra JSON field") r.snapshot_json = JSON.stringify({ ...raw(), paid: true });
  if (name === "duplicate JSON member names") r.snapshot_json = text.replace('"version":1', '"version":1,"version":1');
  if (name === "noncanonical text") r.snapshot_json = JSON.stringify(raw(), null, 2);
  if (name === "alternate numeric spelling") r.snapshot_json = text.replace('"version":1', '"version":1e0');
  if (name === "numeric precision loss") r.snapshot_json = text.replace('"minorUnits":1100', '"minorUnits":9007199254740993');
  if (name === "changed derived amountDue") r.snapshot_json = text.replace('"minorUnits":1100', '"minorUnits":1101');
  db.exactSteps = [ok([r])]; outcome(await append(db, raw()), "storage-failure"); assert.equal(db.inserts(), 0);
});
for (const name of specification.testPlan.adversarialMatrix[13].cases) planned(14, name, async () => {
  const db = new Database(); const v = raw();
  if (name === "predecessor same order but wrong subtotal") { v.order.merchandiseSubtotal = m(900); v.amountDue = m(1000); }
  const r = row(v);
  if (name === "predecessor malformed JSON") r.snapshot_json = "{";
  db.exactSteps = [ok([]), name === "predecessor read failure" ? () => { throw new Error("read"); } : ok(name === "predecessor duplicate rows" ? [r, r] : [r])];
  outcome(await append(db, raw(2)), "storage-failure"); assert.deepEqual(db.kinds(), ["order", "exact", "exact"]);
  assert.deepEqual(db.calls[2].values, [raw().id, 1]);
});
for (const name of specification.testPlan.adversarialMatrix[14].cases) planned(15, name, async () => {
  const db = new Database();
  if (name.startsWith("prepare ") || name.startsWith("bind ") || name.startsWith("all ")) {
    db.failure = { kind: "exact", method: name.split(" ")[0] as "prepare" | "bind" | "all" };
  }
  else {
    const fixtures: Record<string, unknown> = {
      "malformed envelope": null, "unexpected success marker": { success: 1, results: [] },
      "missing results": { success: true }, "non-array results": { success: true, results: {} },
      "sparse/accessor results": ok(Array(1)),
    };
    db.exactSteps = [fixtures[name]];
  }
  outcome(await append(db, raw()), "storage-failure"); assert.equal(db.inserts(), 0); assert.equal(db.calls.length, 2);
});
for (const name of specification.testPlan.adversarialMatrix[15].cases) planned(16, name, async () => {
  const db = new Database();
  if (name === "INSERT prepare/bind/all failure") db.failure = { kind: "insert", method: "prepare" };
  else db.insertStep = (_call, proposed) => {
    if (name === "empty INSERT results") { db.seed(proposed); return ok([]); }
    if (name === "duplicate INSERT returned rows") { db.seed(proposed); return ok([proposed, proposed]); }
    if (name === "partial/malformed returned row") { db.seed(proposed); return ok([{ ...proposed, snapshot_json: "{" }]); }
    if (name === "read-after-write mismatch") {
      db.seed(proposed); return ok([{ ...proposed, assessment_version: 2 }]);
    }
    if (name === "uniqueness race") { db.seed(row(change("assessment.attribution", "other"))); throw new Error("unique"); }
    db.seed(proposed); throw new Error("lost success response");
  };
  outcome(await append(db, raw()), name === "INSERT prepare/bind/all failure" ? "storage-failure" : name === "uniqueness race" ? "conflict" : "already-present");
  assert.deepEqual(db.kinds(), ["order", "exact", "insert", "exact"]); assert.equal(db.inserts(), 1);
});

async function concurrent(divergent = false, otherOrder = false) {
  const db = new Database(); const left = raw(); const right = raw();
  if (divergent) right.assessment.sourceReference = "other";
  if (otherOrder) {
    right.order.version = 2;
    // Both order reads authenticate their requested exact coordinates.
    db.beforeOrder = () => {
      const call = db.calls[db.calls.length - 1];
      db.orderResponse = ok([orderRow(call.values[1] as number)]);
    };
  }
  let arrivals = 0;
  let release!: () => void;
  const bothRead = new Promise<void>(resolve => { release = resolve; });
  const absent = async () => { arrivals++; if (arrivals === 2) release(); await bothRead; return ok([]); };
  db.exactSteps = [absent, absent];
  const results = await Promise.all([append(db, left), append(db, right)]);
  assert.deepEqual(results.map(r => r.outcome).sort(), ["created", divergent || otherOrder ? "conflict" : "already-present"].sort());
  assert.equal(db.durable.size, 1); assert.equal(db.inserts(), 2);
  for (const result of results) if (result.outcome === "conflict") assert.deepEqual(result, { outcome: "conflict" });
}
planned(17, "concurrent identical insertion", () => concurrent());
planned(17, "concurrent conflicting insertion", () => concurrent(true));
planned(17, "concurrent order-binding drift", () => concurrent(false, true));
planned(17, "adjacent revision race", async () => {
  const db = new Database(); db.seed(row());
  let reached!: () => void; const waiting = new Promise<void>(resolve => { reached = resolve; });
  let release!: () => void; const resume = new Promise<void>(resolve => { release = resolve; });
  db.insertStep = async (_call, proposed) => { reached(); await resume; return db.insert(proposed); };
  const second = append(db, raw(2)); await waiting;
  outcome(await append(db, raw(3)), "conflict");
  release(); outcome(await second, "created"); assert.equal(db.inserts(), 1);
  assert.equal(db.durable.has(key(raw().id, 3)), false);
});
planned(17, "attempted partial aggregate insertion", async () => {
  const db = new Database(); outcome(await append(db, raw()), "created");
  assert.equal(db.inserts(), 1); assert.equal(db.durable.size, 1);
  const sql = readFileSync(new URL("../../../migrations/food/0011_food_payable_assessment_versions.sql", import.meta.url), "utf8");
  assert.equal((sql.match(/CREATE TABLE/g) ?? []).length, 1);
  assert.equal((sql.match(/CREATE TRIGGER/g) ?? []).length, 5);
  assert.doesNotMatch(sql, /CREATE TABLE[^;]*(?:payment_status|paid_in_full|settlement|checkout|customer|revenue|processor)/i);
  assert.deepEqual(Object.keys([...db.durable.values()][0]), columns);
});
for (const name of specification.testPlan.adversarialMatrix[17].cases) planned(18, name, async () => {
  const db = new Database(); const v = raw();
  if (name === "unauthorized but structurally valid adjustment") v.adjustments[0].sourceReference = "unverified:policy";
  if (name === "two distinct references describing one real charge") { v.adjustments.push(adjustment("same-charge-other-reference")); v.amountDue = m(1200); }
  if (name === "forged assessor provenance") v.assessment.attribution = "forged:assessor";
  if (name === "opaque tax/discount label") v.adjustments[0].reference = "tax:discount:opaque";
  const result = await append(db, v); outcome(result, "created");
  if (result.outcome === "created") assert.deepEqual(result.value, validateFoodPayableAssessmentVersion(v));
  assert.equal(db.inserts(), 1);
});
const authorityKeys = ["refunded", "paid", "paidInFull", "dispatchReady", "revenue", "currentlyPayable"];
for (const [index, name] of specification.testPlan.adversarialMatrix[18].cases.entries()) planned(19, name, async () => {
  await invalid({ ...raw(), [authorityKeys[index]]: true });
  const db = new Database(); const v = raw(1, index === 0 ? 2 : 1);
  db.orderResponse = ok([orderRow(v.order.version)]);
  if (index === 2) { v.adjustments = [adjustment("credit", 1000, "credit")]; v.amountDue = m(0); }
  const result = await append(db, v); outcome(result, "created");
  if (result.outcome === "created") assert.equal(Object.hasOwn(result.value, authorityKeys[index]), false);
});

test("coverage inventory maps each of 125 planned cases once across the actual 19 groups", () => {
  const expected = specification.testPlan.adversarialMatrix.flatMap(group => group.cases);
  assert.equal(expected.length, 125); assert.equal(specification.testPlan.adversarialMatrix.length, 19);
  assert.deepEqual([...coverage.keys()].sort(), [...expected].sort());
});

test("migration static contract: six columns, guarded JSON, FK, atomic guards and immutable triggers; execution deferred", () => {
  const sql = readFileSync(new URL("../../../migrations/food/0011_food_payable_assessment_versions.sql", import.meta.url), "utf8");
  const declarations = [...sql.matchAll(/^ {4}([a-z_]+) (TEXT|INTEGER) NOT NULL/gm)];
  assert.deepEqual(declarations.map(match => match[1]), columns);
  assert.deepEqual(declarations.map(match => match[2]), ["TEXT", "INTEGER", "TEXT", "INTEGER", "INTEGER", "TEXT"]);
  assert.match(sql, /PRIMARY KEY \(assessment_id, assessment_version\)/);
  assert.match(sql, /assessment_version BETWEEN 1 AND 9007199254740991/);
  assert.match(sql, /order_version IN \(1, 2\)/);
  assert.match(sql, /snapshot_format_version = 1/);
  assert.match(sql, /CASE WHEN json_valid\(snapshot_json\)\s+THEN json_type\(snapshot_json\) = 'object' ELSE 0 END/);
  assert.match(sql, /FOREIGN KEY \(order_id, order_version\)\s+REFERENCES food_physical_order_versions \(order_id, order_version\)/);
  assert.match(sql, /\) STRICT;/);
  for (const suffix of ["order_guard", "initial_guard", "revision_guard", "no_update", "no_delete"]) {
    assert.match(sql, new RegExp(`CREATE TRIGGER IF NOT EXISTS food_payable_assessment_versions_${suffix}\\b`));
  }
  assert.match(sql, /parent.order_id = NEW.order_id AND parent.order_version = NEW.order_version/);
  assert.match(sql, /WHEN NEW.assessment_version = 1[\s\S]*existing.assessment_id = NEW.assessment_id/);
  assert.match(sql, /WHEN NEW.assessment_version > 1/);
  for (const predicate of ["predecessor.assessment_id = NEW.assessment_id", "predecessor.assessment_version = NEW.assessment_version - 1", "predecessor.order_id = NEW.order_id", "predecessor.order_version = NEW.order_version"]) assert.ok(sql.includes(predicate));
  assert.match(sql, /BEFORE UPDATE ON food_payable_assessment_versions\s+BEGIN\s+SELECT RAISE\(ABORT/);
  assert.match(sql, /BEFORE DELETE ON food_payable_assessment_versions\s+BEGIN\s+SELECT RAISE\(ABORT/);
  assert.doesNotMatch(sql.replace(/--[^\n]*/g, ""), /\b(?:ALTER|DROP|CASCADE|AFTER)\b|\bON\s+CONFLICT\b|\bINSERT\s+INTO\b|\bREPLACE\s+INTO\b|\bINSERT\s+OR\s+REPLACE\b|\bPRAGMA\b/i);
  // No runtime SQL engine is opened. These assertions do not prove installed
  // triggers, FK enforcement, Unicode binding, atomicity or D1 visibility.
});

test("public runtime surface and imports contain only the contracted append authority", () => {
  assert.deepEqual(Object.keys(api), ["appendFoodPayableAssessment"]);
  const source = readFileSync(new URL("./d1-payable-assessment-persistence.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /fetch\s*\(|process\.env|Date\.now|new Date|Math\.random|\.exec\s*\(|\.batch\s*\(|\.run\s*\(|deriveFoodPaymentReconciliation|Stripe|Square|PayPal|node:fs/);
  assert.doesNotMatch(source, /import[^;]*(?:payment-confirmation|cash-payment|reconciliation|selection|inventory|fulfillment)/);
});

test("initial no-adjustment value created by FOOD-005J round-trips with exact SQL and detached deep freeze", async () => {
  const db = new Database(); const v = createInitialFoodPayableAssessmentVersion(
    { id: createFoodPayableAssessmentId("008g"), version: 1 }, order(), [], raw().assessment,
  );
  const result = await append(db, v); outcome(result, "created");
  if (result.outcome !== "created") assert.fail("expected value");
  assert.deepEqual(result.value, v); assert.notEqual(result.value, v);
  assert.deepEqual(db.kinds(), ["order", "exact", "insert"]);
  assert.deepEqual(db.calls[0].values, [v.order.id, 1]);
  assert.deepEqual(db.calls[1].values, [v.id, 1]);
  assert.match(db.calls[1].sql, /WHERE assessment_id = \? AND assessment_version = \?\s+LIMIT 2$/);
  assert.deepEqual(db.calls[2].values, [v.id, 1, v.order.id, 1, 1, JSON.stringify(v)]);
  assert.match(db.calls[2].sql, /VALUES \(\?, \?, \?, \?, \?, \?\)\s+RETURNING assessment_id, assessment_version, order_id, order_version, snapshot_format_version, snapshot_json$/);
  const frozen = (value: unknown): void => {
    if (value && typeof value === "object") { assert.ok(Object.isFrozen(value)); Object.values(value).forEach(frozen); }
  };
  frozen(result); assert.equal(Reflect.set(result.value.order, "version", 2), false);
  const storedRow = [...db.durable.values()][0]; storedRow.snapshot_json = "{}";
  assert.deepEqual(result.value, v);
});

test("source revision replaces adjustments and provenance; old versions replay without predecessor/latest queries", async () => {
  const db = new Database(); const first = validateFoodPayableAssessmentVersion(raw());
  const second = reviseFoodPayableAssessmentVersion(first, { id: first.id, version: 2 }, order(), [adjustment("credit", 400, "credit")], { ...raw().assessment, sourceReference: "second" });
  const third = reviseFoodPayableAssessmentVersion(second, { id: first.id, version: 3 }, order(), [], { ...raw().assessment, sourceReference: "third" });
  for (const value of [first, second, third]) {
    const start = db.calls.length; const result = await append(db, value); outcome(result, "created");
    if (result.outcome === "created") assert.deepEqual(result.value, value);
    assert.equal(db.calls.length - start, value.version === 1 ? 3 : 4);
  }
  for (const value of [first, second]) {
    const start = db.calls.length; const result = await append(db, value); outcome(result, "already-present");
    if (result.outcome === "already-present") assert.deepEqual(result.value, value);
    assert.equal(db.calls.length - start, 2);
  }
  assert.equal(db.durable.size, 3);
  assert.equal(JSON.parse(String(db.durable.get(key(first.id, 1))?.snapshot_json)).amountDue.minorUnits, 1100);
});

for (const adjustments of [[], [adjustment()], [adjustment("credit", 400, "credit")], [adjustment("a", 500), adjustment("b", 200), adjustment("c", 300, "credit")], [adjustment("zero", 0)], Array.from({ length: 32 }, (_, i) => adjustment(String(i), 0))]) {
  test(`round trip ${adjustments.length} adjustments: ${adjustments.map(a => `${a.direction}:${a.reference}`).join(",")}`, async () => {
    const v = raw(); v.adjustments = adjustments;
    const due = 1000 + adjustments.reduce((sum, a) => sum + (a.direction === "charge" ? a.money.minorUnits : -a.money.minorUnits), 0);
    v.amountDue = m(due); const db = new Database();
    const created = await append(db, v); outcome(created, "created");
    const replay = await append(db, v); outcome(replay, "already-present");
    if (created.outcome === "created" && replay.outcome === "already-present") {
      assert.deepEqual(created.value, validateFoodPayableAssessmentVersion(v));
      assert.deepEqual(created.value, replay.value); assert.notEqual(created.value, replay.value);
    }
  });
}

test("exact mixed arithmetic example is 2800 over 2400, not merchandise subtotal", async () => {
  const v = raw(); v.order.merchandiseSubtotal = m(2400);
  v.adjustments = [adjustment("delivery", 500), adjustment("tax", 200), adjustment("credit", 300, "credit")]; v.amountDue = m(2800);
  const db = new Database(); db.orderResponse = ok([orderRow(1, v.order.id, 2400)]);
  const result = await append(db, v); outcome(result, "created");
  if (result.outcome === "created") { assert.equal(result.value.amountDue.minorUnits, 2800); assert.equal(result.value.order.merchandiseSubtotal.minorUnits, 2400); }
});

test("caller key order and null-prototype records do not change canonical text", async () => {
  const v = raw(); const reversed = Object.fromEntries(Object.entries(v).reverse());
  reversed.order = Object.assign(Object.create(null), v.order);
  const db = new Database(); outcome(await append(db, reversed), "created"); outcome(await append(db, v), "already-present");
  assert.equal([...db.durable.values()][0].snapshot_json, JSON.stringify(validateFoodPayableAssessmentVersion(v)));
});

test("input mutation during order await cannot alter captured nested content or binds", async () => {
  const v = raw(); const before = structuredClone(v); const db = new Database();
  db.beforeOrder = () => { v.id = "food-payable-assessment:changed"; v.adjustments[0].reference = "changed"; v.assessment.attribution = "changed"; v.amountDue.minorUnits = 999; };
  const result = await append(db, v); outcome(result, "created");
  if (result.outcome === "created") assert.deepEqual(result.value, validateFoodPayableAssessmentVersion(before));
  assert.equal(db.calls[2].values[0], before.id); assert.equal(Object.isFrozen(v), false);
});

for (const [label, text] of Object.entries({
  supplementary: "x😀y", combining: "e\u0301", composed: "é", NUL: "x\0y", highSurrogate: "x\ud800y", lowSurrogate: "x\udc00y",
  nearMaximum: "x".repeat(511), maximum: "x".repeat(512), multiCodeUnitMaximum: "😀".repeat(256),
})) test(`Unicode ${label}: preserve JavaScript UTF-16 text exactly; real D1 binding remains deferred`, async () => {
  const v = raw(); v.adjustments[0].reference = text; v.adjustments[0].sourceReference = text; v.assessment.attribution = text; v.assessment.sourceReference = text;
  const db = new Database(); const result = await append(db, v); outcome(result, "created");
  if (result.outcome === "created") assert.deepEqual(result.value, validateFoodPayableAssessmentVersion(v));
  outcome(await append(db, v), "already-present");
});
test("canonically equivalent Unicode stays distinct; UTF-16 over-limit is invalid", async () => {
  const db = new Database(); const v = raw(); v.assessment.attribution = "é";
  outcome(await append(db, v), "created"); v.assessment.attribution = "e\u0301";
  outcome(await append(db, v), "conflict");
  await invalid(change("adjustments.0.reference", "😀".repeat(256) + "x"));
});

test("shared immutable money is allowed; signed zero follows existing monetary equality", async () => {
  const v = raw(); const shared = m(0); v.order.merchandiseSubtotal = shared; v.amountDue = shared;
  v.adjustments = [adjustment("zero", -0)];
  const db = new Database(); db.orderResponse = ok([orderRow(1, v.order.id, 0)]);
  const result = await append(db, v); outcome(result, "created");
  assert.doesNotMatch(String([...db.durable.values()][0].snapshot_json), /-0/);
});

test("positive safe maximum historical assessment version replays without a predecessor scan", async () => {
  const v = raw(Number.MAX_SAFE_INTEGER); const db = new Database(); db.seed(row(v));
  outcome(await append(db, v), "already-present"); assert.deepEqual(db.kinds(), ["order", "exact"]);
});
test("maximum safe money and maximum-minus-one revision coordinates preserve primitive values", async () => {
  const v = raw(Number.MAX_SAFE_INTEGER); v.adjustments = []; v.order.merchandiseSubtotal = m(Number.MAX_SAFE_INTEGER); v.amountDue = m(Number.MAX_SAFE_INTEGER);
  const previous = structuredClone(v); previous.version--;
  const db = new Database(); db.orderResponse = ok([orderRow(1, v.order.id, Number.MAX_SAFE_INTEGER)]); db.seed(row(previous));
  outcome(await append(db, v), "created"); assert.deepEqual(db.calls[2].values, [v.id, Number.MAX_SAFE_INTEGER - 1]);
});

for (const stage of ["prepare", "bind", "all"] as const) for (const kind of ["order", "exact", "insert"] as const) {
  test(`exception at ${kind}.${stage} uses exact failure precedence and bounded recovery`, async () => {
    const db = new Database(); db.failure = { kind, method: stage };
    outcome(await append(db, raw()), "storage-failure");
    assert.deepEqual(db.kinds(), kind === "order" ? ["order"] : kind === "exact" ? ["order", "exact"] : ["order", "exact", "insert", "exact"]);
    assert.equal(db.inserts(), kind === "insert" ? 1 : 0);
  });
}

for (const recovery of ["identical", "divergent", "absent", "corrupt", "throwing"] as const) {
  test(`uncertain revision write recovery ${recovery}: maximum four SELECTs, one mutation`, async () => {
    const db = new Database(); db.seed(row());
    db.insertStep = (_call, proposed) => {
      if (recovery === "identical") db.seed(proposed);
      if (recovery === "divergent") { const v = raw(2); v.assessment.sourceReference = "racer"; db.seed(row(v)); }
      if (recovery === "corrupt") db.seed({ ...proposed, snapshot_json: "{" });
      if (recovery === "throwing") db.exactSteps.push(() => { throw new Error("recovery"); });
      throw new Error("unknown commit outcome");
    };
    outcome(await append(db, raw(2)), recovery === "identical" ? "already-present" : recovery === "divergent" ? "conflict" : "storage-failure");
    assert.deepEqual(db.kinds(), ["order", "exact", "exact", "insert", "exact"]);
    assert.deepEqual(db.calls.map(call => call.values.slice(0, 2)), [[raw().order.id, 1], [raw().id, 2], [raw().id, 1], [raw().id, 2], [raw().id, 2]]);
  });
}

for (const bad of [null, { success: false, results: [] }, { success: true }, { success: true, results: {} }, ok([]), ok([row(), row()]), ok([{ ...row(), assessment_id: "wrong" }]), ok([{ ...row(), assessment_version: 9 }])]) {
  test(`malformed INSERT response ${JSON.stringify(bad)} recovers committed exact content`, async () => {
    const db = new Database(); db.insertStep = (_call, proposed) => { db.seed(proposed); return bad; };
    outcome(await append(db, raw()), "already-present"); assert.equal(db.inserts(), 1); assert.equal(db.calls.length, 4);
  });
}

for (const location of ["envelope", "results", "row", "nested candidate", "nested array"] as const) {
  test(`accessor and proxy defenses at ${location} never invoke getters or leak values`, async () => {
    let count = 0;
    const getter = () => { count++; throw new Error("must not invoke getter"); };
    const db = new Database(); let input: unknown = raw();
    if (location === "envelope") db.exactSteps = [Object.defineProperty(ok([]), "success", { get: getter })];
    if (location === "results") db.exactSteps = [ok(Object.defineProperty([row()], "0", { get: getter }))];
    if (location === "row") db.exactSteps = [ok([Object.defineProperty(row(), "snapshot_json", { get: getter })])];
    if (location === "nested candidate") input = change("amountDue", Object.defineProperty(m(1100), "minorUnits", { get: getter }));
    if (location === "nested array") input = change("adjustments", new Proxy([adjustment()], { getPrototypeOf() { throw new Error("trap"); } }));
    outcome(await append(db, input), location.startsWith("nested") ? "invalid" : "storage-failure"); assert.equal(count, 0);
  });
}

test("a predecessor appearing after an absent read does not cause an implicit retry", async () => {
  const db = new Database(); db.exactSteps = [ok([]), () => { db.seed(row()); return ok([]); }];
  outcome(await append(db, raw(2)), "conflict"); assert.equal(db.inserts(), 0); assert.equal(db.calls.length, 3);
  outcome(await append(db, raw(2)), "created");
});
for (const hostile of ["disappearing", "changing"] as const) test(`hostile mock predecessor ${hostile} after validation cannot induce a second INSERT`, async () => {
  const db = new Database(); db.seed(row());
  db.insertStep = (_call, proposed) => {
    if (hostile === "disappearing") db.durable.delete(key(raw().id, 1));
    else { const v = raw(); v.order.id = "food-physical-order:other"; db.seed(row(v)); }
    return db.insert(proposed);
  };
  outcome(await append(db, raw(2)), "storage-failure"); assert.equal(db.inserts(), 1); assert.equal(db.calls.length, 5);
});

test("distinct assessment IDs on one exact order and new IDs on cancelled order versions remain allowed", async () => {
  const db = new Database(); outcome(await append(db, raw()), "created");
  const another = raw(); another.id = "food-payable-assessment:another"; outcome(await append(db, another), "created");
  another.id = "food-payable-assessment:cancelled"; another.order.version = 2; db.orderResponse = ok([orderRow(2)]);
  outcome(await append(db, another), "created"); assert.equal(db.durable.size, 3);
});

for (const mutate of [
  (r: Row) => { const v = raw(); r.snapshot_json = JSON.stringify({ ...v, assessment: { assessedOn: v.assessment.assessedOn, sourceReference: v.assessment.sourceReference, attribution: v.assessment.attribution } }); },
  (r: Row) => { r.snapshot_json = String(r.snapshot_json).replace('"version":1', '"version":-0'); },
  (r: Row) => { r.snapshot_json = String(r.snapshot_json).replace('"reference":"charge"', '"reference":"\\u0063harge"'); },
  (r: Row) => { r.snapshot_json = String(r.snapshot_json).replace('"minorUnits":1100', '"minorUnits":"1100"'); },
]) test("noncanonical nested ordering, zero, escape or numeric type fails stored authentication", async () => {
  const db = new Database(); const r = row(); mutate(r); db.exactSteps = [ok([r])];
  outcome(await append(db, raw()), "storage-failure"); assert.equal(db.inserts(), 0);
});

test("actual cyclic root and cyclic array substitutions fail without unbounded traversal", async () => {
  const v = raw(); Object.assign(v, { order: v }); await invalid(v);
  const cyclic: unknown[] = []; cyclic.push(cyclic); await invalid(change("adjustments", cyclic));
});

test("scalar objects cannot invoke coercion or toJSON during hostile capture", async () => {
  let invoked = 0;
  const hostile = { valueOf() { invoked++; return 100; }, toString() { invoked++; return "100"; }, toJSON() { invoked++; return 100; } };
  for (const path of ["id", "version", "order.id", "order.version", "adjustments.0.direction", "adjustments.0.reference", "adjustments.0.sourceReference", "adjustments.0.money.currency", "adjustments.0.money.minorUnits", "assessment.attribution", "assessment.sourceReference", "assessment.assessedOn"]) {
    await invalid(change(path, hostile));
  }
  assert.equal(invoked, 0);
});

test("candidate money and metadata require every own field and reject nested symbols/accessors", async () => {
  for (const path of ["order.merchandiseSubtotal", "amountDue", "adjustments.0.money"]) {
    await invalid(change(path, { currency: "USD" }));
    await invalid(change(path, { ...m(), [Symbol("extra")]: 1 }));
  }
  await invalid(change("assessment", Object.create(raw().assessment)));
  await invalid(change("adjustments", Object.assign([adjustment()], { [Symbol("extra")]: 1 })));
});

test("result envelope safely permits inert D1 metadata but rejects inherited success and custom result arrays", async () => {
  const db = new Database(); db.exactSteps = [{ success: true, results: [], meta: { rows_read: 0 } }];
  outcome(await append(db, raw()), "created");
  for (const response of [Object.assign(Object.create({ success: true }), { results: [] }), ok(Object.assign([], { extra: true })), ok(Object.setPrototypeOf([], null)), { success: true, results: [], [Symbol("extra")]: 1 }]) {
    const bad = new Database(); bad.exactSteps = [response]; outcome(await append(bad, raw()), "storage-failure"); assert.equal(bad.inserts(), 0);
  }
});

test("maximum identity length and embedded NUL identities preserve text in binds; real SQLite length/binding proof deferred", async () => {
  for (const local of ["x".repeat(200), "😀".repeat(100), "\0", "a\0b", "x\ud800y"]) {
    const v = raw(); v.id = `food-payable-assessment:${local}`;
    const db = new Database(); outcome(await append(db, v), "created"); outcome(await append(db, v), "already-present");
    assert.equal(db.calls[2].values[0], v.id);
  }
});

test("failed INSERT response with committed content uses one recovery; canonical returned divergence never counts as created", async () => {
  for (const response of ["false success", "canonical divergent"] as const) {
    const db = new Database(); db.insertStep = (_call, proposed) => {
      db.seed(proposed);
      return response === "false success" ? { success: false, results: [proposed] } : ok([row(change("assessment.attribution", "different returned value"))]);
    };
    outcome(await append(db, raw()), "already-present"); assert.deepEqual(db.kinds(), ["order", "exact", "insert", "exact"]);
  }
});

test("predecessor identity and version corruption fails exact authentication, not transition conflict", async () => {
  for (const r of [{ ...row(), assessment_id: "food-payable-assessment:wrong" }, { ...row(), assessment_version: 2 }]) {
    const db = new Database(); db.exactSteps = [ok([]), ok([r])];
    outcome(await append(db, raw(2)), "storage-failure"); assert.equal(db.inserts(), 0);
  }
});

test("initial guard rejection after a stale absence precheck recovers exact durable history", async () => {
  const db = new Database(); db.seed(row()); db.seed(row(raw(2))); db.exactSteps = [ok([])];
  outcome(await append(db, raw()), "already-present"); assert.equal(db.inserts(), 1); assert.equal(db.durable.size, 2);
});

test("revision predecessor becoming visible before its exact read permits one legitimate append", async () => {
  const db = new Database(); db.exactSteps = [() => { db.seed(row()); return ok([]); }];
  outcome(await append(db, raw(2)), "created"); assert.deepEqual(db.kinds(), ["order", "exact", "exact", "insert"]);
});

test("concurrent writes to the same revision preserve predecessor and classify the losing content", async () => {
  const db = new Database(); db.seed(row());
  let count = 0; let release!: () => void; const barrier = new Promise<void>(resolve => { release = resolve; });
  const absent = async () => { count++; if (count === 2) release(); await barrier; return ok([]); };
  db.exactSteps = [absent, absent];
  const other = raw(2); other.assessment.attribution = "competing revision";
  const results = await Promise.all([append(db, raw(2)), append(db, other)]);
  assert.deepEqual(results.map(r => r.outcome).sort(), ["conflict", "created"]);
  assert.equal(db.durable.size, 2); assert.equal(db.inserts(), 2);
  assert.equal(db.durable.get(key(raw().id, 1))?.snapshot_json, row().snapshot_json);
});

for (const path of [
  "version", "order", "order.id", "order.version", "order.merchandiseSubtotal",
  "order.merchandiseSubtotal.currency", "order.merchandiseSubtotal.minorUnits",
  "adjustments", "adjustments.0", "adjustments.0.money", "adjustments.0.money.currency",
  "adjustments.0.money.minorUnits", "adjustments.0.reference", "adjustments.0.sourceReference",
  "amountDue", "amountDue.currency", "amountDue.minorUnits", "assessment",
  "assessment.attribution", "assessment.sourceReference", "assessment.assessedOn",
]) test(`own accessor at ${path} never executes despite returning a valid surrounding value`, async () => {
  const input = raw(); const parts = path.split("."); let parent: unknown = input;
  for (const part of parts.slice(0, -1)) parent = (parent as Row)[part];
  const property = parts[parts.length - 1]; const plausible = (parent as Row)[property];
  let invocations = 0;
  const getter = () => { invocations++; return plausible; };
  Object.defineProperty(parent, property, { get: getter });
  const before = Object.getOwnPropertyDescriptor(parent, property);
  const db = new Database(); const result = await append(db, input);
  outcome(result, "invalid");
  assert.equal(invocations, 0, "Getter counter assertion runs outside the adapter");
  assert.deepEqual(db.calls, []);
  assert.equal(db.inserts(), 0);
  assert.deepEqual(Object.getOwnPropertyDescriptor(parent, property), before);
  assert.equal(Object.isFrozen(input), false);
});

test("getter counter negative controls detect execution even when the consumer catches a thrown error", () => {
  for (const throws of [false, true]) {
    let count = 0;
    const input = Object.defineProperty({}, "id", { get() { count++; if (throws) throw new Error("hostile"); return "plausible"; } });
    const verify = () => assert.equal(count, 0, "Getter must remain uncalled");
    verify();
    try { Reflect.get(input, "id"); } catch { /* simulate a consumer containing the getter exception */ }
    assert.throws(verify, assert.AssertionError);
  }
});

test("valid frozen dense input is accepted and remains detached without invoking coercion hooks", async () => {
  const input = validateFoodPayableAssessmentVersion(raw()); const db = new Database();
  assert.ok(Object.isFrozen(input.adjustments)); assert.ok(Object.isFrozen(input.adjustments[0].money));
  const created = await append(db, input); outcome(created, "created");
  if (created.outcome === "created") {
    assert.deepEqual(created.value, input); assert.notEqual(created.value, input);
    assert.notEqual(created.value.adjustments, input.adjustments);
    assert.notEqual(created.value.adjustments[0].money, input.adjustments[0].money);
  }
});

const wrongSql: [string, "order" | "exact" | "insert", string][] = [
  ["wrong SELECT table", "exact", expectedSql.exact.replace("FROM food_payable_assessment_versions", "FROM food_cash_payment_evidence")],
  ["wrong SELECT column", "exact", expectedSql.exact.replace("SELECT assessment_id", "SELECT invented_id")],
  ["missing version predicate", "exact", expectedSql.exact.replace(" AND assessment_version = ?", "")],
  ["changed predicate operator", "exact", expectedSql.exact.replace("assessment_version = ?", "assessment_version >= ?")],
  ["SELECT star", "exact", "SELECT * FROM food_payable_assessment_versions WHERE assessment_id = ? AND assessment_version = ? LIMIT 2"],
  ["missing LIMIT", "exact", expectedSql.exact.replace(" LIMIT 2", "")],
  ["wrong LIMIT", "order", expectedSql.order.replace("LIMIT 2", "LIMIT 1")],
  ["wrong INSERT table", "insert", expectedSql.insert.replace("INSERT INTO food_payable_assessment_versions", "INSERT INTO food_physical_order_versions")],
  ["reordered INSERT columns", "insert", expectedSql.insert.replace("(assessment_id, assessment_version", "(assessment_version, assessment_id")],
  ["extra INSERT column", "insert", expectedSql.insert.replace("snapshot_json) VALUES", "snapshot_json, paid) VALUES")],
  ["missing placeholder", "insert", expectedSql.insert.replace("VALUES (?, ?, ?, ?, ?, ?)", "VALUES (?, ?, ?, ?, ?)")],
  ["wrong RETURNING", "insert", expectedSql.insert.replace("RETURNING assessment_id", "RETURNING invented_id")],
  ["UPDATE", "insert", "UPDATE food_payable_assessment_versions SET snapshot_json = ? WHERE assessment_id = ?"],
  ["DELETE", "insert", "DELETE FROM food_payable_assessment_versions WHERE assessment_id = ?"],
  ["REPLACE", "insert", expectedSql.insert.replace("INSERT INTO", "REPLACE INTO")],
  ["INSERT OR REPLACE", "insert", expectedSql.insert.replace("INSERT INTO", "INSERT OR REPLACE INTO")],
  ["latest fallback", "exact", "SELECT assessment_id, MAX(assessment_version) FROM food_payable_assessment_versions WHERE assessment_id = ?"],
  ["extra mutation", "exact", `${expectedSql.exact}; DELETE FROM food_payable_assessment_versions`],
  ["unapproved join", "exact", expectedSql.exact.replace(" WHERE", " JOIN food_physical_order_versions USING (order_id) WHERE")],
];
for (const [name, kind, sql] of wrongSql) test(`SQL oracle rejects ${name} outside adapter catches`, () => {
  assert.equal(sqlKind(sql), "unexpected");
  assert.throws(() => verifyCall({ kind, sql, values: [] }), assert.AssertionError);
});
test("SQL oracle accepts independent allowlisted statements with irrelevant line whitespace", () => {
  for (const kind of ["order", "exact", "insert"] as const) {
    const formatted = `\n  ${expectedSql[kind].replace(/ /g, "\n\t")}\n`;
    assert.equal(sqlKind(formatted), kind);
    verifyCall({ kind, sql: formatted, values: [] });
  }
});

const validInsert = (() => {
  const input = raw(3, 2); const value = validateFoodPayableAssessmentVersion(input);
  return [value.id, 3, value.order.id, 2, 1, JSON.stringify(value)];
})();
const wrongBinds: [string, (values: unknown[]) => void][] = [
  ["missing bind", v => { v.pop(); }],
  ["extra bind", v => { v.push(1); }],
  ["undefined bind", v => { v[0] = undefined; }],
  ["object identity", v => { v[0] = { toString: () => raw().id }; }],
  ["wrong identity family", v => { v[0] = raw().order.id; }],
  ["stringified version", v => { v[1] = "3"; }],
  ["unsafe version", v => { v[1] = Number.MAX_SAFE_INTEGER + 1; }],
  ["wrong canonical assessment ID", v => { v[0] = "food-payable-assessment:other"; }],
  ["wrong parent", v => { v[2] = "food-physical-order:other"; }],
  ["reordered version binds", v => { [v[1], v[3]] = [v[3], v[1]]; }],
  ["unsupported format", v => { v[4] = 2; }],
  ["noncanonical JSON", v => { v[5] = JSON.stringify(JSON.parse(v[5] as string), null, 2); }],
  ["fractional money in snapshot", v => { const input = raw(3, 2); input.amountDue.minorUnits = 1100.5; v[5] = JSON.stringify(input); }],
];
for (const [name, mutate] of wrongBinds) test(`bind oracle rejects ${name} independently of returned outcome`, () => {
  const values: unknown[] = [...validInsert]; mutate(values);
  assert.throws(() => verifyCall({ kind: "insert", sql: expectedSql.insert, values, bound: true }));
});
test("bind oracle accepts complete canonical INSERT with distinct assessment and order versions", () => {
  verifyCall({ kind: "insert", sql: expectedSql.insert, values: [...validInsert], bound: true });
});
test("exact read sequence oracle rejects a wrong but otherwise canonical lookup coordinate", () => {
  const call: Call = { kind: "exact", sql: expectedSql.exact, values: [raw().id, 2], bound: true };
  verifyCall(call); // scalar validity alone is not requested-coordinate equality
  assert.throws(() => verifySequence([call], [{ kind: "exact", values: [raw().id, 1] }]), assert.AssertionError);
});

for (const mode of ["initial", "revision", "historical replay", "conflict", "missing predecessor", "corrupt predecessor", "missing order", "lost revision response"] as const) {
  test(`full SQL and independent bind sequence: ${mode}`, async () => {
    const db = new Database(); const input = raw(mode === "initial" || mode === "missing order" ? 1 : 3, 2);
    input.id = "food-payable-assessment:distinct-sql-contract";
    input.order.id = "food-physical-order:distinct-sql-parent";
    db.orderResponse = ok([orderRow(2, input.order.id)]);
    const previous = { ...structuredClone(input), version: 2 };
    if (["revision", "lost revision response"].includes(mode)) db.seed(row(previous));
    if (mode === "historical replay") { db.seed(row(input)); db.seed(row({ ...input, version: 4 })); }
    if (mode === "conflict") { const different = structuredClone(input); different.assessment.attribution = "different"; db.seed(row(different)); }
    if (mode === "corrupt predecessor") db.seed({ ...row(previous), snapshot_json: "{" });
    if (mode === "missing order") db.orderResponse = ok([]);
    if (mode === "lost revision response") db.insertStep = (_call, proposed) => { db.seed(proposed); throw new Error("committed but response lost"); };
    const result = await append(db, input);
    const expectedOutcome = mode === "historical replay" || mode === "lost revision response" ? "already-present"
      : mode === "conflict" || mode === "missing predecessor" ? "conflict"
        : mode === "corrupt predecessor" ? "storage-failure" : mode === "missing order" ? "invalid" : "created";
    outcome(result, expectedOutcome);
    const expected: { kind: Kind; values: unknown[] }[] = [{ kind: "order", values: [input.order.id, 2] }];
    if (mode !== "missing order") expected.push({ kind: "exact", values: [input.id, input.version] });
    if (["revision", "lost revision response", "missing predecessor", "corrupt predecessor"].includes(mode)) expected.push({ kind: "exact", values: [input.id, 2] });
    if (["initial", "revision", "lost revision response"].includes(mode)) expected.push({ kind: "insert", values: [input.id, input.version, input.order.id, 2, 1, JSON.stringify(validateFoodPayableAssessmentVersion(input))] });
    if (mode === "lost revision response") expected.push({ kind: "exact", values: [input.id, 3] });
    verifySequence(db.calls, expected);
    assert.equal(db.inserts(), ["initial", "revision", "lost revision response"].includes(mode) ? 1 : 0);
  });
}
