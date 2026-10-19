import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createInitialFoodCartVersion, createInitialFoodMerchandiseQuoteVersion } from "./cart-quote-domain";
import { createInitialFoodFulfillmentIntentVersion, createInitialFoodReservationRequestVersion } from "./fulfillment-capacity-reservation-domain";
import * as proposalModule from "./reservation-capacity-source-selection-request";
import { resolveFoodReservationCapacitySourceSelection as resolve } from "./reservation-capacity-source-selection-resolution";
import type { FoodExactSkuStockedCapacitySourceReadD1Database, FoodExactSkuStockedCapacitySourceReadD1Statement, FoodExactSkuStockedCapacitySourceReadD1Result } from "./d1-exact-sku-stocked-capacity-source-read";

function fixture(count = 3, method = "personal-delivery") {
  const skus = Array.from({ length: count }, (_, index) => ({
    id: `food-sku:test-${index}`, version: 2,
    servingOffer: { offerId: `food-serving-offer:test-${index}`, version: 1 },
    package: { id: `food-package-definition:test-${index}`, version: 1 },
  }));
  const cart = createInitialFoodCartVersion({ id: "food-cart:007f", version: 1,
    lines: skus.map(sku => ({ sku: { id: sku.id, version: sku.version }, quantity: 2 })) });
  const prices = skus.map((sku, index) => ({ id: `food-approved-commercial-price:test-${index}`, version: 1,
    sku: { id: sku.id, version: sku.version }, money: { currency: "USD", minorUnits: 100 },
    approval: { attribution: "synthetic:owner", sourceReference: "synthetic:price", approvedOn: "2026-10-13" } }));
  const quote = createInitialFoodMerchandiseQuoteVersion({ id: "food-merchandise-quote:007f", version: 1 }, cart, skus, prices);
  const fulfillmentIntent = createInitialFoodFulfillmentIntentVersion({ id: "food-fulfillment-intent:007f", version: 1 }, quote,
    { method, locationReference: "synthetic:location", windowReference: "synthetic:window" });
  const request = createInitialFoodReservationRequestVersion({ id: "food-reservation-request:007f", version: 1 }, quote, fulfillmentIntent);
  // Construct caller-owned mutable data explicitly; preserve branded scalar IDs
  // without recursively mapping their string members or casting readonly data.
  return {
    request: { ...request, quote: { ...request.quote }, fulfillmentIntent: { ...request.fulfillmentIntent },
      capacityRequirements: request.capacityRequirements.map(line => ({ ...line, sku: { ...line.sku } })) },
    quote: { ...quote, cart: { ...quote.cart }, merchandiseSubtotal: { ...quote.merchandiseSubtotal },
      lines: quote.lines.map(line => ({ ...line, sku: { ...line.sku }, approvedPrice: { ...line.approvedPrice },
        unitPrice: { ...line.unitPrice }, merchandiseSubtotal: { ...line.merchandiseSubtotal } })) },
    fulfillmentIntent: { ...fulfillmentIntent, quote: { ...fulfillmentIntent.quote } },
    skuSelections: request.capacityRequirements.map((line, index) => ({ sku: { ...line.sku }, revision: index + 1 })),
    slotSelection: { method: fulfillmentIntent.method, locationReference: fulfillmentIntent.locationReference,
      windowReference: fulfillmentIntent.windowReference, revision: 1 } };
}
type Input = ReturnType<typeof fixture>;
type Row = Record<string, unknown>;
function rows(input: Input): Row[] {
  return [...input.skuSelections.map(s => ({ sku_id: s.sku.id, sku_version: s.sku.version, revision: s.revision,
    capacity_units: 0, attribution: "synthetic:writer", source_reference: "opaque:unverified" })),
  { method: input.slotSelection.method, location_reference: input.slotSelection.locationReference,
    window_reference: input.slotSelection.windowReference, revision: input.slotSelection.revision,
    capacity_units: 0, attribution: "synthetic:writer", source_reference: "opaque:unverified" }];
}
class Database implements FoodExactSkuStockedCapacitySourceReadD1Database {
  calls: { sql: string; bound: readonly (string | number)[] }[] = [];
  responses: unknown[];
  failAt = -1;
  failStage: "prepare" | "bind" | "all" = "all";
  beforeRead?: (index: number) => Promise<void>;
  constructor(readonly stored: Row[]) {
    this.responses = stored.map(row => ({ success: true, results: [row] }));
  }
  prepare(sql: string): FoodExactSkuStockedCapacitySourceReadD1Statement {
    const index = this.calls.length;
    this.calls.push({ sql, bound: [] });
    if (index === this.failAt && this.failStage === "prepare") throw new Error("synthetic prepare");
    const statement: FoodExactSkuStockedCapacitySourceReadD1Statement = {
      bind: (...bound) => {
        this.calls[index]!.bound = bound;
        if (index === this.failAt && this.failStage === "bind") throw new Error("synthetic bind");
        return statement;
      },
      all: async <T>() => {
        if (index === this.failAt && this.failStage === "all") throw new Error("synthetic all");
        await this.beforeRead?.(index);
        return this.responses[index] as FoodExactSkuStockedCapacitySourceReadD1Result<T>;
      },
    };
    return statement;
  }
}
function record(value: unknown): Record<string, unknown> { return value as Record<string, unknown>; }
function deepFrozen(value: unknown): void {
  if (value !== null && typeof value === "object") {
    assert.ok(Object.isFrozen(value));
    for (const nested of Object.values(value)) deepFrozen(nested);
  }
}
function success(result: Awaited<ReturnType<typeof resolve>>) {
  assert.equal(result.outcome, "resolved");
  if (result.outcome !== "resolved") throw new Error("Expected complete resolution");
  deepFrozen(result);
  return result.resolution;
}
async function invalid(input: unknown) {
  const db = new Database([]);
  const result = await resolve(db, input);
  assert.deepEqual(result, { outcome: "invalid" });
  deepFrozen(result);
  assert.equal(db.calls.length, 0);
}

for (const count of [1, 3]) for (const method of ["personal-delivery", "meetup"]) {
  test(`007F resolves ${count} SKU ${method} with exact ordered reads and complete shape`, async () => {
    const input = fixture(count, method);
    const expected = structuredClone(input);
    const db = new Database(rows(input));
    input.skuSelections.reverse();
    const value = success(await resolve(db, input));
    assert.equal(value.kind, "reservation-capacity-source-selection-resolution");
    assert.deepEqual(Object.keys(value).sort(), ["kind", "selection", "skuSources", "slotSource"].sort());
    assert.deepEqual(value.selection.skuSelections, expected.skuSelections);
    assert.equal(value.skuSources.length, count);
    assert.equal(db.calls.length, count + 1);
    expected.skuSelections.forEach((s, index) => {
      assert.deepEqual(db.calls[index]!.bound, [s.sku.id, s.sku.version, s.revision]);
      assert.deepEqual(value.skuSources[index]!.sku, s.sku);
      assert.equal(value.skuSources[index]!.revision, s.revision);
      assert.match(db.calls[index]!.sql, /FROM food_sku_capacity_sources/);
    });
    assert.deepEqual(db.calls[count]!.bound, [method, expected.slotSelection.locationReference, expected.slotSelection.windowReference, 1]);
    for (const call of db.calls) {
      assert.match(call.sql, /revision = \?/);
      assert.doesNotMatch(call.sql, /ORDER BY|MAX\(|reservation|physical_inventory|INSERT|UPDATE|DELETE|batch/i);
    }
    assert.deepEqual(input.quote, expected.quote);
    assert.ok(!Object.isFrozen(input));
    assert.ok(!Object.isFrozen(input.request));
  });
}
for (const revision of [1, 8, Number.MAX_SAFE_INTEGER]) for (const capacity of [0, Number.MAX_SAFE_INTEGER]) {
  test(`007F preserves historical revision ${revision} and capacity ${capacity} without sufficiency arithmetic`, async () => {
    const input = fixture(1);
    input.skuSelections[0]!.revision = revision;
    input.slotSelection.revision = revision;
    const stored = rows(input);
    stored.forEach(row => { row.capacity_units = capacity; });
    const value = success(await resolve(new Database(stored), input));
    assert.equal(value.skuSources[0]!.capacityUnits, capacity);
    assert.equal(value.slotSource.capacityUnits, capacity);
    assert.equal(value.skuSources[0]!.revision, revision);
    assert.equal(value.slotSource.revision, revision);
    assert.equal(value.skuSources[0]!.sourceReference, "opaque:unverified");
    assert.deepEqual(Object.keys(value.skuSources[0]!).sort(), ["kind", "sku", "revision", "capacityUnits", "attribution", "sourceReference"].sort());
  });
}
for (const root of [null, undefined, true, 1, "input", [], {}]) {
  test(`007F malformed root ${String(root)} has zero DB access`, () => invalid(root));
}
const defects: Record<string, (input: Input) => void> = {
  "missing selection": i => { i.skuSelections.pop(); },
  "extra selection": i => { i.skuSelections.push(structuredClone(i.skuSelections[0]!)); },
  duplicate: i => { i.skuSelections[1] = structuredClone(i.skuSelections[0]!); },
  "wrong SKU": i => { record(i.skuSelections[0]!.sku).id = "food-sku:other"; },
  "wrong version": i => { i.skuSelections[0]!.sku.version++; },
  "request quote": i => { i.request.quote.version++; },
  "intent quote": i => { i.fulfillmentIntent.quote.version++; },
  "request intent": i => { i.request.fulfillmentIntent.version++; },
  "demand quantity": i => { i.request.capacityRequirements[0]!.quantity++; },
  "duplicate demand": i => { i.request.capacityRequirements[1] = structuredClone(i.request.capacityRequirements[0]!); },
  "bad request": i => { record(i.request).id = "wrong"; },
  "bad quote": i => { i.quote.merchandiseSubtotal.minorUnits++; },
};
for (const field of ["method", "locationReference", "windowReference"]) {
  defects[`slot mismatch ${field}`] = i => { record(i.slotSelection)[field] = field === "method" ? "meetup" : "wrong"; };
}
for (const [name, mutate] of Object.entries(defects)) {
  test(`007F rejects ${name} before DB`, async () => { const input = fixture(); mutate(input); await invalid(input); });
}
for (const revision of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "1", null, undefined, NaN, Infinity]) {
  for (const target of ["sku", "slot"]) {
    test(`007F rejects ${target} revision ${String(revision)} before DB`, async () => {
      const input = fixture(); record(target === "sku" ? input.skuSelections[0] : input.slotSelection).revision = revision;
      await invalid(input);
    });
  }
}
const levels = {
  root: (i: Input) => record(i), selection: (i: Input) => record(i.skuSelections[0]),
  sku: (i: Input) => record(i.skuSelections[0]!.sku), slot: (i: Input) => record(i.slotSelection),
  request: (i: Input) => record(i.request), quote: (i: Input) => record(i.quote), intent: (i: Input) => record(i.fulfillmentIntent),
};
for (const field of ["eligible", "governing", "latest", "current", "fresh", "trusted", "available", "remaining", "reservable", "atp", "accepted", "held", "orderable", "acceptedOn", "active"]) {
  for (const [level, get] of Object.entries(levels)) {
    test(`007F authority ${field} on ${level} rejected before DB`, async () => {
      const input = fixture(); get(input)[field] = true; await invalid(input);
    });
  }
}
for (const [level, get] of Object.entries(levels)) for (const defect of ["missing", "accessor", "symbol", "inherited"]) {
  test(`007F strict ${level} ${defect} before DB`, async () => {
    const input = fixture(); const target = get(input); const key = Object.keys(target)[0]!;
    let getterCalls = 0;
    if (defect === "missing") delete target[key];
    if (defect === "accessor") Object.defineProperty(target, key, { get() { getterCalls++; return null; } });
    if (defect === "symbol") Object.defineProperty(target, Symbol("bad"), { value: true });
    if (defect === "inherited") { const value = target[key]; delete target[key]; Object.setPrototypeOf(target, { [key]: value }); }
    await invalid(input); assert.equal(getterCalls, 0);
  });
}
for (const path of ["selections", "demand", "quote"]) for (const defect of ["sparse", "extra", "symbol", "accessor"]) {
  test(`007F strict array ${path} ${defect} before DB`, async () => {
    const input = fixture(); const array = path === "selections" ? input.skuSelections : path === "demand" ? input.request.capacityRequirements : input.quote.lines;
    let getterCalls = 0;
    if (defect === "sparse") Reflect.deleteProperty(array, "0");
    if (defect === "extra") Object.defineProperty(array, "extra", { value: true });
    if (defect === "symbol") Object.defineProperty(array, Symbol("bad"), { value: true });
    if (defect === "accessor") Object.defineProperty(array, "0", { get() { getterCalls++; return null; } });
    await invalid(input); assert.equal(getterCalls, 0);
  });
}
test("007F does not trust purported candidate output lacking original quote", async () => {
  const proposal = proposalModule.deriveFoodReservationCapacitySourceSelectionRequest(fixture());
  assert.equal(proposal.outcome, "candidate");
  if (proposal.outcome === "candidate") await invalid(proposal.value);
});
for (const index of [0, 1, 2, 3]) {
  test(`007F missing source ${index} stops immediately without partial bundle`, async () => {
    const input = fixture(); const db = new Database(rows(input));
    db.responses[index] = { success: true, results: [] };
    const result = await resolve(db, input);
    assert.deepEqual(result, { outcome: "not-found" }); deepFrozen(result);
    assert.equal(db.calls.length, index + 1);
  });
  for (const stage of ["prepare", "bind", "all"] as const) {
    test(`007F storage ${stage} failure at ${index} stops without partial bundle`, async () => {
      const input = fixture(); const db = new Database(rows(input)); db.failAt = index; db.failStage = stage;
      const result = await resolve(db, input);
      assert.deepEqual(result, { outcome: "storage-failure" }); deepFrozen(result);
      assert.equal(db.calls.length, index + 1);
    });
  }
  for (const response of [null, { success: false, results: [] }, { success: true, results: [{}, {}] }, { success: true, results: [{}] }]) {
    test(`007F malformed envelope/row at ${index}: ${JSON.stringify(response)}`, async () => {
      const input = fixture(); const db = new Database(rows(input)); db.responses[index] = response;
      assert.deepEqual(await resolve(db, input), { outcome: "storage-failure" });
      assert.equal(db.calls.length, index + 1);
    });
  }
}
for (const field of ["sku_id", "sku_version", "revision"]) {
  test(`007F canonical SKU reader rejects wrong ${field}`, async () => {
    const input = fixture(); const stored = rows(input);
    stored[0]![field] = field === "sku_id" ? "food-sku:other" : 99;
    const db = new Database(stored);
    assert.deepEqual(await resolve(db, input), { outcome: "storage-failure" });
    assert.equal(db.calls.length, 1);
  });
}
for (const field of ["method", "location_reference", "window_reference", "revision"]) {
  test(`007F canonical slot reader rejects wrong ${field}`, async () => {
    const input = fixture(); const stored = rows(input);
    stored[3]![field] = field === "method" ? "meetup" : field === "revision" ? 99 : "other";
    const db = new Database(stored);
    assert.deepEqual(await resolve(db, input), { outcome: "storage-failure" });
    assert.equal(db.calls.length, 4);
  });
}
test("007F captures all input before asynchronous reads and detaches storage rows", async () => {
  const input = fixture(); const expected = structuredClone(input); const stored = rows(input);
  const db = new Database(stored);
  let release!: () => void;
  const pending = new Promise<void>(r => { release = r; });
  db.beforeRead = async index => { if (index === 0) await pending; };
  const operation = resolve(db, input);
  input.skuSelections.reverse(); input.skuSelections[0]!.revision = 999;
  input.slotSelection.windowReference = "changed"; input.slotSelection.revision = 999;
  input.request.capacityRequirements[0]!.quantity = 99;
  input.fulfillmentIntent.locationReference = "changed";
  input.quote.lines[0]!.quantity = 99;
  release();
  const value = success(await operation); const completed = structuredClone(value);
  assert.deepEqual(value.selection.skuSelections, expected.skuSelections);
  assert.deepEqual(value.selection.request, expected.request);
  assert.deepEqual(value.selection.fulfillmentIntent, expected.fulfillmentIntent);
  assert.deepEqual(db.calls.map(c => c.bound), [
    ...expected.skuSelections.map(s => [s.sku.id, s.sku.version, s.revision]),
    [expected.slotSelection.method, expected.slotSelection.locationReference, expected.slotSelection.windowReference, expected.slotSelection.revision],
  ]);
  stored.forEach(row => { row.capacity_units = 999; row.source_reference = "changed"; });
  input.skuSelections.length = 0; input.request.version = 99;
  assert.deepEqual(value, completed);
  assert.ok(!Object.isFrozen(input)); assert.ok(!Object.isFrozen(stored[0]));
});

// Load this module's compiled code with dependency doubles only for the otherwise
// unreachable reader-invalid branch. Production API retains canonical readers.
for (const target of ["sku", "slot"]) {
  test(`007F mocked ${target} reader-invalid means internal storage-failure, never absence`, async () => {
    const source = readFileSync(new URL("./reservation-capacity-source-selection-resolution.ts", import.meta.url), "utf8");
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const input = fixture(1); const calls: string[] = [];
    const exported: Record<string, unknown> = {};
    runInNewContext(code, { exports: exported, require: (name: string) => {
      if (name === "./reservation-capacity-source-selection-request") return proposalModule;
      if (name === "./d1-exact-sku-stocked-capacity-source-read") return {
        readFoodExactSkuStockedCapacitySourceRevision: async () => {
          calls.push("sku"); return target === "sku" ? { outcome: "invalid" } : { outcome: "found", value: Object.freeze({}) };
        },
      };
      if (name === "./d1-exact-fulfillment-slot-capacity-source-read") return {
        readFoodExactFulfillmentSlotCapacitySourceRevision: async () => { calls.push("slot"); return { outcome: "invalid" }; },
      };
      throw new Error(`Unexpected dependency ${name}`);
    } });
    const mocked = exported.resolveFoodReservationCapacitySourceSelection as typeof resolve;
    const result = await mocked(new Database([]), input);
    assert.equal(result.outcome, "storage-failure");
    assert.deepEqual(Object.keys(result), ["outcome"]); deepFrozen(result);
    assert.deepEqual(calls, target === "sku" ? ["sku"] : ["sku", "slot"]);
  });
}
test("007F composition has no direct SQL writes acceptance clock network environment or randomness", () => {
  const source = readFileSync(new URL("./reservation-capacity-source-selection-resolution.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\.prepare\(|\.bind\(|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\.batch\(|Date\.now|new Date|process\.env|fetch\s*\(|Math\.random|randomUUID|reservation-acceptance-domain|createInitialFoodReservationAcceptanceVersion/);
  const spec = JSON.parse(readFileSync(new URL("../../../.river-dev/specifications/food-007f-reservation-capacity-source-selection-resolution.json", import.meta.url), "utf8"));
  assert.equal(spec.id, "FOOD-007F");
  assert.equal(spec.readerOutcomeMapping.invalid, "storage-failure: internal inconsistency after canonical selector validation, not absence");
});
