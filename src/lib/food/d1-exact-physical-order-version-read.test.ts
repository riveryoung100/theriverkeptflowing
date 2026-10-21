import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { validateFoodPhysicalOrderVersion, type FoodPhysicalOrderVersion } from "./physical-order-domain";
import {
  readFoodPhysicalOrderVersionByExactIdentity as read,
  type FoodExactPhysicalOrderVersionReadD1Database,
} from "./d1-exact-physical-order-version-read";

function requested(
  windowReference =
    "window:008a",
): FoodPhysicalOrderVersion {
  return validateFoodPhysicalOrderVersion({
    id:
      "food-physical-order:008a",
    version:
      1,
    state:
      "requested",
    quote: {
      id:
        "food-merchandise-quote:008a",
      version:
        1,
    },
    fulfillmentIntent: {
      id:
        "food-fulfillment-intent:008a",
      version:
        1,
      method:
        "personal-delivery",
      locationReference:
        "location:008a",
      windowReference,
    },
    reservationRequest: {
      id:
        "food-reservation-request:008a",
      version:
        1,
      capacityRequirements: [
        {
          sku: {
            id:
              "food-sku:008a",
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
            "food-sku:008a",
          version:
            1,
        },
        approvedPrice: {
          id:
            "food-approved-commercial-price:008a",
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


function snapshot() {
  const value = requested();
  return {
    quote: value.quote,
    fulfillmentIntent: value.fulfillmentIntent,
    reservationRequest: value.reservationRequest,
    lines: value.lines,
    merchandiseSubtotal: value.merchandiseSubtotal,
  };
}
function row(version = 1): Record<string, unknown> {
  return {
    order_id: requested().id,
    order_version: version,
    state: version === 1 ? "requested" : "cancelled",
    snapshot_format_version: 1,
    snapshot_json: JSON.stringify(snapshot()),
  };
}
class Database implements FoodExactPhysicalOrderVersionReadD1Database {
  calls: { sql: string; values: unknown[] }[] = [];
  reads = 0;
  constructor(public response: unknown = { success: true, results: [row()] }, public throws = false) {}
  prepare(sql: string) {
    const call = { sql, values: [] as unknown[] };
    this.calls.push(call);
    return {
      bind: (...values: unknown[]) => {
        call.values = values;
        return {
          all: async <T>() => {
            this.reads++;
            if (this.throws) throw new Error("read failure");
            return this.response as { success: boolean; results?: T[] };
          },
        };
      },
    };
  }
}
const id = requested().id;
for (const version of [1, 2]) {
  test(`found canonical historical version ${version}`, async () => {
    const db = new Database({ success: true, results: [row(version)] });
    const result = await read(db, id, version);
    assert.equal(result.outcome, "found");
    if (result.outcome !== "found") return;
    assert.equal(result.value.version, version);
    assert.equal(result.value.state, version === 1 ? "requested" : "cancelled");
    assert.deepEqual(result.value, validateFoodPhysicalOrderVersion({ ...requested(), version, state: version === 1 ? "requested" : "cancelled" }));
  });
}
test("exact absence terminates after one read", async () => {
  const db = new Database({ success: true, results: [] });
  assert.deepEqual(await read(db, id, 2), { outcome: "not-found" });
  assert.equal(db.calls.length, 1);
  assert.equal(db.reads, 1);
  assert.deepEqual(db.calls[0]?.values, [id, 2]);
});
const invalidIds: [string, unknown][] = [
  ["malformed", "wrong:008a"], ["noncanonical", ` ${id}`],
  ["missing", undefined], ["empty local", "food-physical-order:"],
  ["colon local", "food-physical-order:a:b"],
  ["hostile", { toString() { throw new Error("must not coerce"); } }],
];
for (const [name, value] of invalidIds) {
  test(`invalid ID ${name} has zero D1 calls`, async () => {
    const db = new Database();
    assert.deepEqual(await read(db, value, 1), { outcome: "invalid" });
    assert.equal(db.calls.length, 0);
  });
}
for (const [name, value] of [
  ["zero", 0], ["unsupported", 3], ["fraction", 1.5], ["NaN", NaN],
  ["infinity", Infinity], ["unsafe", Number.MAX_SAFE_INTEGER + 1],
  ["string", "1"], ["object", {}], ["missing", undefined],
  ["boxed", new Number(1)], ["symbol", Symbol("version")],
] as [string, unknown][]) {
  test(`invalid version ${name} has zero D1 calls`, async () => {
    const db = new Database();
    assert.deepEqual(await read(db, id, value), { outcome: "invalid" });
    assert.equal(db.calls.length, 0);
  });
}
test("read exception is storage-failure", async () => {
  assert.deepEqual(await read(new Database(undefined, true), id, 1), { outcome: "storage-failure" });
});
for (const [name, response] of [
  ["false success", { success: false, results: [] }],
  ["missing success", { results: [] }],
  ["missing results", { success: true }],
  ["non-array results", { success: true, results: {} }],
  ["null envelope", null],
  ["inherited success", Object.assign(Object.create({ success: true }), { results: [] })],
  ["accessor success", { get success() { throw new Error("getter"); }, results: [] }],
  ["multiple rows", { success: true, results: [row(), row()] }],
  ["sparse array", { success: true, results: new Array(1) }],
] as [string, unknown][]) {
  test(`malformed response ${name}`, async () => {
    assert.deepEqual(await read(new Database(response), id, 1), { outcome: "storage-failure" });
  });
}
function failure(name: string, makeRow: () => unknown, version = 1) {
  test(name, async () => {
    const db = new Database({ success: true, results: [makeRow()] });
    assert.deepEqual(await read(db, id, version), { outcome: "storage-failure" });
    assert.equal(db.calls.length, 1);
    assert.equal(db.reads, 1);
  });
}
failure("null row", () => null);
failure("array row", () => []);
failure("missing row field", () => { const r = row(); delete r.state; return r; });
failure("extra row field", () => ({ ...row(), extra: true }));
failure("symbol row field", () => ({ ...row(), [Symbol("extra")]: true }));
failure("accessor row never invoked", () => Object.defineProperty(row(), "state", { get() { assert.fail("accessor invoked"); } }));
failure("custom prototype row", () => Object.assign(Object.create({ inherited: true }), row()));
failure("inherited row field", () => { const r = row(); delete r.state; return Object.assign(Object.create({ state: "requested" }), r); });
failure("throwing proxy row", () => new Proxy(row(), { ownKeys() { throw new Error("hostile"); } }));
failure("wrong durable ID", () => ({ ...row(), order_id: "food-physical-order:other" }));
failure("wrong durable version", () => ({ ...row(), order_version: 2 }));
failure("unsupported snapshot format", () => ({ ...row(), snapshot_format_version: 2 }));
failure("string snapshot format", () => ({ ...row(), snapshot_format_version: "1" }));
failure("non-string JSON", () => ({ ...row(), snapshot_json: {} }));
failure("malformed JSON", () => ({ ...row(), snapshot_json: "{" }));
failure("array snapshot root", () => ({ ...row(), snapshot_json: "[]" }));
failure("null snapshot root", () => ({ ...row(), snapshot_json: "null" }));
failure("missing snapshot key", () => {
  const s: Record<string, unknown> = snapshot(); delete s.quote;
  return { ...row(), snapshot_json: JSON.stringify(s) };
});
failure("extra snapshot key", () => ({ ...row(), snapshot_json: JSON.stringify({ ...snapshot(), extra: true }) }));
for (const key of ["quote", "fulfillmentIntent", "reservationRequest", "lines", "merchandiseSubtotal"]) {
  failure(`invalid reconstructed ${key}`, () => ({ ...row(), snapshot_json: JSON.stringify({ ...snapshot(), [key]: null }) }));
}
failure("version 1 cannot be cancelled", () => ({ ...row(), state: "cancelled" }));
failure("version 2 cannot be requested", () => ({ ...row(2), state: "requested" }), 2);
failure("pretty printed snapshot", () => ({ ...row(), snapshot_json: JSON.stringify(snapshot(), null, 2) }));
failure("reordered root keys", () => ({ ...row(), snapshot_json: JSON.stringify(Object.fromEntries(Object.entries(snapshot()).reverse())) }));
failure("reordered nested keys", () => ({ ...row(), snapshot_json: JSON.stringify({ ...snapshot(), quote: { version: 1, id: requested().quote.id } }) }));
test("result detached from row and raw snapshot", async () => {
  const raw = snapshot();
  const stored: ReturnType<typeof row> = { ...row(), snapshot_json: JSON.stringify(raw) };
  const result = await read(new Database({ success: true, results: [stored] }), id, 1);
  assert.equal(result.outcome, "found");
  if (result.outcome !== "found") return;
  assert.notStrictEqual(result.value.quote, raw.quote);
  assert.notStrictEqual(result.value.lines, raw.lines);
  assert.notStrictEqual(result.value.lines[0], raw.lines[0]);
  stored.snapshot_json = "{}";
  stored.order_id = "other";
  raw.quote = { ...raw.quote, version: 99 };
  assert.equal(result.value.id, id);
  assert.equal(result.value.quote.version, 1);
});
test("result and every nested value deeply frozen", async () => {
  const result = await read(new Database(), id, 1);
  assert.equal(result.outcome, "found");
  function frozen(value: unknown) {
    if (value === null || typeof value !== "object") return;
    assert.ok(Object.isFrozen(value));
    for (const nested of Object.values(value)) frozen(nested);
  }
  frozen(result);
  if (result.outcome === "found") {
    assert.equal(Reflect.defineProperty(result.value.quote, "version", { value: 99 }), false);
  }
});
const source = readFileSync(new URL("./d1-exact-physical-order-version-read.ts", import.meta.url), "utf8");
test("one exact SELECT with exact bindings and LIMIT 2", async () => {
  const db = new Database();
  await read(db, id, 1);
  assert.equal(db.calls.length, 1);
  assert.equal(db.reads, 1);
  assert.deepEqual(db.calls[0]?.values, [id, 1]);
  assert.match(db.calls[0]!.sql, /FROM food_physical_order_versions\s+WHERE order_id = \?\s+AND order_version = \?\s+LIMIT 2$/);
});
for (const token of ["ORDER BY", "INSERT", "UPDATE", "DELETE", "UPSERT", "MAX("]) {
  test(`SQL excludes ${token}`, async () => {
    const db = new Database(); await read(db, id, 1);
    assert.ok(!db.calls[0]!.sql.includes(token));
  });
}
test("exact public surfaces only", () => {
  assert.deepEqual([...source.matchAll(/export (?:async )?(?:interface|type|function) (\w+)/g)].map(m => m[1]), [
    "FoodExactPhysicalOrderVersionReadD1Database", "FoodExactPhysicalOrderVersionReadResult", "readFoodPhysicalOrderVersionByExactIdentity",
  ]);
  assert.doesNotMatch(source, /\b(?:latest|current|active|effective)\b/i);
});
test("found exposes historical truth with no payment/readiness authority", async () => {
  const result = await read(new Database(), id, 1);
  assert.deepEqual(Object.keys(result), ["outcome", "value"]);
  assert.match(source, /grants no reservation acceptance/);
  assert.match(source, /payment readiness/);
});
test("no migration 0009", () => {
  assert.ok(!readdirSync(new URL("../../../migrations/food/", import.meta.url)).some(name => /^0009.*\.sql$/.test(name)));
});
test("no migration execution or runtime side effects", () => {
  assert.doesNotMatch(source, /\b(?:exec|batch|transaction)\s*\(|wrangler|migrate|fetch\s*\(|Date\.now|new Date|Math\.random|randomUUID/);
});