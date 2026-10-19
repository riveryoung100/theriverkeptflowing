import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createInitialFoodCartVersion, createInitialFoodMerchandiseQuoteVersion } from "./cart-quote-domain";
import { createInitialFoodFulfillmentIntentVersion, createInitialFoodReservationRequestVersion } from "./fulfillment-capacity-reservation-domain";
import { createInitialFoodPhysicalOrderVersion } from "./physical-order-domain";
import { deriveFoodReservationCapacitySourceSelectionRequest } from "./reservation-capacity-source-selection-request";
import { deriveFoodReservationHoldCommand as derive, FOOD_RESERVATION_HOLD_COMMAND_KIND as KIND } from "./reservation-hold-command";

function baseFixture(count = 3, method = "personal-delivery") {
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

function fixture(count = 3, method = "personal-delivery") {
  const selection = baseFixture(count, method);
  const order = createInitialFoodPhysicalOrderVersion({ id: "food-physical-order:007n", version: 1 },
    selection.quote, selection.fulfillmentIntent, selection.request);
  return { reservationId: "opaque:caller-id", ...selection,
    order: { ...order, quote: { ...order.quote }, fulfillmentIntent: { ...order.fulfillmentIntent },
      reservationRequest: { ...order.reservationRequest,
        capacityRequirements: order.reservationRequest.capacityRequirements.map(line => ({ ...line, sku: { ...line.sku } })) },
      lines: order.lines.map(line => ({ ...line, sku: { ...line.sku }, approvedPrice: { ...line.approvedPrice },
        unitPrice: { ...line.unitPrice }, merchandiseSubtotal: { ...line.merchandiseSubtotal } })),
      merchandiseSubtotal: { ...order.merchandiseSubtotal } },
  };
}
type Input = ReturnType<typeof fixture>;
function record(input: unknown): Record<PropertyKey, unknown> { return input as Record<PropertyKey, unknown>; }
function frozen(input: unknown): void {
  if (input !== null && typeof input === "object") {
    assert.ok(Object.isFrozen(input)); Object.values(input).forEach(frozen);
  }
}
function candidate(input: unknown) {
  const result = derive(input); assert.equal(result.outcome, "candidate");
  if (result.outcome !== "candidate") throw new Error("Expected candidate");
  frozen(result); return result.value;
}
function invalid(input: unknown) {
  const result = derive(input); assert.deepEqual(result, { outcome: "invalid" }); frozen(result);
}

for (const count of [1, 3]) for (const method of ["personal-delivery", "meetup"]) {
  test(`007N ${count} SKU ${method} exact context yields minimal canonical command`, () => {
    const input = fixture(count, method); const before = structuredClone(input);
    const value = candidate(input);
    const selection = deriveFoodReservationCapacitySourceSelectionRequest(baseFixture(count, method));
    assert.equal(selection.outcome, "candidate");
    if (selection.outcome !== "candidate") throw new Error("Expected selection");
    assert.deepEqual(value, { kind: KIND, reservationId: input.reservationId,
      order: { id: input.order.id, version: input.order.version }, selection: selection.value });
    assert.deepEqual(input, before);
    assert.ok(!Object.isFrozen(input)); assert.ok(!Object.isFrozen(input.order));
    assert.deepEqual(Object.keys(value).sort(), ["kind", "reservationId", "order", "selection"].sort());
  });
}
test("007N reversed caller selections canonicalize to original demand order", () => {
  const input = fixture(); const expected = candidate(input);
  input.skuSelections.reverse(); assert.deepEqual(candidate(input), expected);
  assert.deepEqual(expected.selection.skuSelections.map(s => s.sku), input.request.capacityRequirements.map(l => l.sku));
});
for (const revision of [1, Number.MAX_SAFE_INTEGER]) test(`007N exact historical revision ${revision} is proposal only`, () => {
  const input = fixture(); input.skuSelections.forEach(s => { s.revision = revision; }); input.slotSelection.revision = revision;
  const value = candidate(input); assert.equal(value.selection.slotSelection.revision, revision);
  value.selection.skuSelections.forEach(s => assert.equal(s.revision, revision));
});
for (const id of ["x", " ", " padded ", "x".repeat(512), "😀".repeat(512), "x\0opaque"] ) {
  test(`007N opaque identity length ${Array.from(id).length} preserves exact caller string`, () => {
    const input = fixture(); input.reservationId = id; assert.equal(candidate(input).reservationId, id);
  });
}
for (const id of ["", "x".repeat(513), "😀".repeat(513), "\0opaque", null, undefined, 1, {}, [], true]) {
  test(`007N invalid opaque identity ${typeof id} length ${String(id).length}`, () => {
    const input = fixture(); record(input).reservationId = id; invalid(input);
  });
}
const defects: Record<string, (i: Input) => void> = {
  "missing selection": i => { i.skuSelections.pop(); },
  "extra selection": i => { i.skuSelections.push(structuredClone(i.skuSelections[0]!)); },
  "duplicate selection": i => { i.skuSelections[1] = structuredClone(i.skuSelections[0]!); },
  "wrong SKU id": i => { record(i.skuSelections[0]!.sku).id = "food-sku:other"; },
  "wrong SKU version": i => { i.skuSelections[0]!.sku.version++; },
  "request quote id": i => { record(i.request.quote).id = "food-merchandise-quote:other"; },
  "request quote version": i => { i.request.quote.version++; },
  "request intent": i => { i.request.fulfillmentIntent.version++; },
  "intent quote": i => { i.fulfillmentIntent.quote.version++; },
  "request demand quantity": i => { i.request.capacityRequirements[0]!.quantity++; },
  "duplicate demand": i => { i.request.capacityRequirements[1] = structuredClone(i.request.capacityRequirements[0]!); },
  "reversed demand": i => { i.request.capacityRequirements.reverse(); },
  "order quote": i => { i.order.quote.version++; },
  "order request": i => { i.order.reservationRequest.version++; },
  "order intent": i => { i.order.fulfillmentIntent.version++; },
  "order method": i => { i.order.fulfillmentIntent.method = "meetup"; },
  "order location": i => { i.order.fulfillmentIntent.locationReference = "other"; },
  "order window": i => { i.order.fulfillmentIntent.windowReference = "other"; },
  "order demand": i => { i.order.reservationRequest.capacityRequirements[0]!.quantity++; },
  "order merchandise": i => { i.order.lines[0]!.quantity++; },
  "order subtotal": i => { i.order.merchandiseSubtotal.minorUnits++; },
  "order identity": i => { record(i.order).id = "wrong"; },
  "order version": i => { i.order.version = 0; },
  "quote amount": i => { i.quote.merchandiseSubtotal.minorUnits++; },
  "slot method": i => { i.slotSelection.method = "meetup"; },
  "slot location": i => { i.slotSelection.locationReference = "other"; },
  "slot window": i => { i.slotSelection.windowReference = "other"; },
};
for (const [name, mutate] of Object.entries(defects)) test(`007N rejects ${name}`, () => {
  const input = fixture(); mutate(input); invalid(input);
});
for (const revision of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, "1", null, undefined]) {
  for (const scope of ["sku", "slot"]) test(`007N rejects ${scope} revision ${String(revision)}`, () => {
    const input = fixture(); record(scope === "sku" ? input.skuSelections[0] : input.slotSelection).revision = revision; invalid(input);
  });
}
for (const root of [null, undefined, [], true, 1, "command", {}]) test(`007N malformed root ${String(root)}`, () => invalid(root));
const levels = {
  root: (i: Input) => record(i), order: (i: Input) => record(i.order),
  request: (i: Input) => record(i.request), quote: (i: Input) => record(i.quote),
  intent: (i: Input) => record(i.fulfillmentIntent), selection: (i: Input) => record(i.skuSelections[0]),
  sku: (i: Input) => record(i.skuSelections[0]!.sku), slot: (i: Input) => record(i.slotSelection),
  orderLine: (i: Input) => record(i.order.lines[0]), orderReference: (i: Input) => record(i.order.quote),
};
for (const [level, get] of Object.entries(levels)) for (const defect of ["missing", "extra", "accessor", "prototype", "symbol"]) {
  test(`007N strict ${level} ${defect} never invokes getters`, () => {
    const input = fixture(); const target = get(input); const key = Object.keys(target)[0]!; let calls = 0;
    if (defect === "missing") delete target[key];
    if (defect === "extra") Object.defineProperty(target, "extra", { value: true });
    if (defect === "accessor") Object.defineProperty(target, key, { get() { calls++; throw new Error("hostile"); } });
    if (defect === "prototype") { const value = target[key]; delete target[key]; Object.setPrototypeOf(target, { [key]: value }); }
    if (defect === "symbol") Object.defineProperty(target, Symbol("bad"), { value: true });
    invalid(input); assert.equal(calls, 0);
  });
}
for (const get of [(i: Input) => i.skuSelections, (i: Input) => i.request.capacityRequirements, (i: Input) => i.order.lines, (i: Input) => i.quote.lines]) {
  for (const defect of ["sparse", "extra", "symbol", "accessor"]) {
    test(`007N malformed array ${defect} ${get.toString()}`, () => {
      const input = fixture(); const array = get(input); let calls = 0;
      if (defect === "sparse") Reflect.deleteProperty(array, "0");
      if (defect === "extra") Object.defineProperty(array, "extra", { value: true });
      if (defect === "symbol") Object.defineProperty(array, Symbol("bad"), { value: true });
      if (defect === "accessor") Object.defineProperty(array, "0", { get() { calls++; return null; } });
      invalid(input); assert.equal(calls, 0);
    });
  }
}
for (const field of ["sufficient", "insufficient", "available", "remaining", "reservable", "ATP", "accepted", "rejected", "persisted", "success", "governing", "held", "recordedCapacityDelta", "recordedDemandAdjustedCapacityDelta"]) {
  for (const get of [levels.root, levels.order, levels.selection, levels.slot]) test(`007N rejects injected ${field} ${get.toString()}`, () => {
    const input = fixture(); get(input)[field] = true; invalid(input);
  });
}
test("007N cycles unsupported values and nonplain objects fail closed", () => {
  const input = fixture(); record(input).order = input; invalid(input);
  for (const value of [() => null, Symbol("bad"), 1n, new Date(), new Map()]) {
    const input = fixture(); record(input).order = value; invalid(input);
  }
});
test("007N detached command survives mutations to all caller context", () => {
  const input = fixture(); const value = candidate(input); const expected = structuredClone(value);
  input.reservationId = "changed"; input.order.version = 99; input.order.lines[0]!.quantity = 999;
  input.request.capacityRequirements[0]!.quantity = 99; input.request.version = 99;
  input.fulfillmentIntent.windowReference = "changed"; input.quote.lines[0]!.quantity = 99;
  input.skuSelections[0]!.revision = 99; record(input.skuSelections[0]!.sku).id = "food-sku:changed";
  input.skuSelections.reverse(); input.slotSelection.revision = 99;
  assert.deepEqual(value, expected); frozen(value);
  assert.ok(!Object.isFrozen(input.order.lines[0])); assert.ok(!Object.isFrozen(input.request));
});
test("007N purity guards target SQL syntax and exclude cached arithmetic and acceptance", () => {
  const source = readFileSync(new URL("./reservation-hold-command.ts", import.meta.url), "utf8");
  assert.match(source, /deriveFoodReservationCapacitySourceSelectionRequest\(/);
  assert.match(source, /validateFoodPhysicalOrderAgainstSources\(/);
  assert.doesNotMatch(source, /SELECT\s+[\s\S]*?\sFROM\s|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|\bUPSERT\b|\.prepare\(|\.bind\(|\.batch\(|D1Database|process\.env|fetch\s*\(|Date\.now|new Date|Math\.random|randomUUID|node:fs/);
  assert.doesNotMatch(source, /reservation-demand-recorded-capacity-arithmetic|deriveFoodReservationDemandRecordedCapacityArithmetic|recordedCapacityDelta|recordedDemandAdjustedCapacityDelta|createInitialFoodReservationAcceptanceVersion|FoodReservationAcceptanceVersion|reservation-acceptance-domain|"held"/);
});
test("007N specification locks structural-only identity and all authority exclusions", () => {
  const spec = JSON.parse(readFileSync(new URL("../../../.river-dev/specifications/food-007n-reservation-hold-command.json", import.meta.url), "utf8"));
  assert.equal(spec.id, "FOOD-007N"); assert.equal(spec.startingHead, "e685c3cca362d53390ce8c169bf038ae2a16e75e");
  assert.deepEqual(spec.output.outcomes, ["candidate", "invalid"]);
  for (const key of ["reservationIdentityBoundary", "physicalOrderBinding", "selectionBinding", "demandOrderPreservation", "sourceRevisionBinding", "slotBinding", "safeClaim", "authorityBoundary", "concurrencyBoundary", "atomicityBoundary", "idempotencyBoundary", "acceptanceBoundary", "lifecycleBoundary", "physicalInventoryBoundary", "sideEffects"]) assert.equal(typeof spec[key], "string");
  for (const claim of ["permission to reserve", "capacity sufficiency", "capacity insufficiency", "remaining capacity", "available capacity", "reservable capacity", "reservable quantity", "ATP / available-to-promise", "current active reservations", "current active commitments", "governing source revision", "source eligibility", "latest source at mutation time", "physical currentness", "physical QOH", "physical truth", "availability", "orderability", "checkout readiness", "payment readiness", "acceptance", "rejection", "durable reservation", "persisted hold", "reservation success", "oversell prevention", "slot-overbooking prevention", "all-or-nothing mutation", "idempotent replay", "divergent-replay policy", "release", "expiration", "cancellation", "replacement", "consumption", "rescheduling", "fulfillment authority", "accounting authority", "rewards authority", "authenticated caller provenance"]) assert.ok(spec.nonClaims.includes(claim));
  assert.equal(spec.migrationImpact, "none"); assert.equal(spec.production, "untouched");
});
