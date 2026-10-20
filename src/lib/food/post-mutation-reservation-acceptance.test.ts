import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createInitialFoodCartVersion, createInitialFoodMerchandiseQuoteVersion } from "./cart-quote-domain";
import { createInitialFoodFulfillmentIntentVersion, createInitialFoodReservationRequestVersion } from "./fulfillment-capacity-reservation-domain";
import { cancelFoodPhysicalOrderVersion, createInitialFoodPhysicalOrderVersion } from "./physical-order-domain";
import { deriveFoodReservationHoldCommand } from "./reservation-hold-command";
import {
  createFoodReservationAcceptanceId, createInitialFoodReservationAcceptanceVersion,
  validateFoodReservationAcceptanceAgainstSources,
} from "./reservation-acceptance-domain";
import type {
  FoodAuthoritativeCapacityReservationMutationReceipt,
  FoodAuthoritativeCapacityReservationMutationResult,
} from "./d1-authoritative-capacity-reservation-mutation";
import { deriveFoodPostMutationReservationAcceptance as derive, FOOD_POST_MUTATION_RESERVATION_ACCEPTANCE_KIND as KIND } from "./post-mutation-reservation-acceptance";

type Primitive = string | number | boolean | bigint | symbol | null | undefined;
type Mutable<T> = T extends Primitive ? T : T extends readonly (infer Item)[] ? Mutable<Item>[] :
  T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T;
function clone<T>(input: T): Mutable<T> { return structuredClone(input) as Mutable<T>; }
function record(input: object): Record<PropertyKey, unknown> { return input as Record<PropertyKey, unknown>; }
function frozen(input: unknown): void {
  if (input !== null && typeof input === "object") {
    assert.ok(Object.isFrozen(input));
    Object.values(input).forEach(frozen);
  }
}

function fixture(cancelled = false, method = "meetup") {
  const skus = Array.from({ length: 3 }, (_, index) => ({
    id: `food-sku:007w-${index}`, version: 1,
    servingOffer: { offerId: `food-serving-offer:007w-${index}`, version: 1 },
    package: { id: `food-package-definition:007w-${index}`, version: 1 },
  }));
  const cart = createInitialFoodCartVersion({ id: "food-cart:007w", version: 1,
    lines: skus.map((sku, index) => ({ sku: { id: sku.id, version: sku.version }, quantity: index + 2 })) });
  const prices = skus.map((sku, index) => ({
    id: `food-approved-commercial-price:007w-${index}`, version: 1,
    sku: { id: sku.id, version: sku.version }, money: { currency: "USD", minorUnits: 100 },
    approval: { attribution: "fixture:owner", sourceReference: "fixture:price", approvedOn: "2026-10-20" },
  }));
  const quote = createInitialFoodMerchandiseQuoteVersion({ id: "food-merchandise-quote:007w", version: 1 }, cart, skus, prices);
  const fulfillmentIntent = createInitialFoodFulfillmentIntentVersion({ id: "food-fulfillment-intent:007w", version: 1 },
    quote, { method, locationReference: "fixture:location", windowReference: "fixture:window" });
  const request = createInitialFoodReservationRequestVersion({ id: "food-reservation-request:007w", version: 1 }, quote, fulfillmentIntent);
  const initial = createInitialFoodPhysicalOrderVersion({ id: "food-physical-order:007w", version: 1 }, quote, fulfillmentIntent, request);
  const order = cancelled ? cancelFoodPhysicalOrderVersion(initial, { id: initial.id, version: 2 }) : initial;
  const candidate = deriveFoodReservationHoldCommand({ reservationId: "opaque:007w", order, quote, request, fulfillmentIntent,
    skuSelections: request.capacityRequirements.map((line, index) => ({ sku: line.sku, revision: index + 4 })),
    slotSelection: { method: fulfillmentIntent.method, locationReference: fulfillmentIntent.locationReference,
      windowReference: fulfillmentIntent.windowReference, revision: 8 },
  });
  assert.equal(candidate.outcome, "candidate");
  if (candidate.outcome !== "candidate") throw new Error("Expected canonical command");
  const command = clone(candidate.value);
  const receipt: FoodAuthoritativeCapacityReservationMutationReceipt = {
    kind: "authoritative-capacity-reservation-mutation-receipt", reservationId: command.reservationId,
    order: { ...command.order }, reservationRequest: { id: request.id, version: request.version },
    fulfillmentIntent: { id: fulfillmentIntent.id, version: fulfillmentIntent.version },
    skuClaims: request.capacityRequirements.map((line, index) => ({ sku: { ...line.sku }, quantity: line.quantity,
      capacityRevision: command.selection.skuSelections[index]!.revision })),
    slotClaim: { method: fulfillmentIntent.method, locationReference: fulfillmentIntent.locationReference,
      windowReference: fulfillmentIntent.windowReference, capacityRevision: command.selection.slotSelection.revision, quantity: 1 },
  };
  return { command, mutation: { outcome: "created" as const, value: clone(receipt) }, order: clone(order),
    identity: { id: createFoodReservationAcceptanceId("caller-007w"), version: 1 },
    metadata: { attribution: "fixture:caller", sourceReference: "fixture:reservation", acceptedOn: "2026-10-20" } };
}
type Input = ReturnType<typeof fixture>;
function run(i: Input, mutation: FoodAuthoritativeCapacityReservationMutationResult = i.mutation) {
  return derive(i.command, mutation, i.order, i.identity, i.metadata);
}
function invalid(i: Input) {
  const result = run(i);
  assert.deepEqual(result, { outcome: "invalid" }); frozen(result);
}

for (const outcome of ["created", "already-present"] as const) for (const method of ["meetup", "personal-delivery"]) {
  test(`007W ${outcome} ${method} retains exact receipt and canonical acceptance`, () => {
    const i = fixture(false, method);
    const result = run(i, { outcome, value: i.mutation.value });
    assert.equal(result.outcome, "accepted");
    if (result.outcome !== "accepted") throw new Error("Expected acceptance");
    assert.equal(result.value.kind, KIND);
    assert.equal(result.value.reservationOutcome, outcome);
    assert.deepEqual(result.value.reservation, i.mutation.value);
    const acceptance = createInitialFoodReservationAcceptanceVersion(i.identity, i.order,
      i.command.selection.request, i.command.selection.fulfillmentIntent, i.metadata);
    assert.deepEqual(result.value.acceptance, acceptance);
    assert.deepEqual(validateFoodReservationAcceptanceAgainstSources(result.value.acceptance, i.order,
      i.command.selection.request, i.command.selection.fulfillmentIntent), acceptance);
    assert.deepEqual(acceptance.order, i.command.order);
    assert.deepEqual(acceptance.reservationRequest, { id: i.command.selection.request.id, version: i.command.selection.request.version });
    assert.deepEqual(acceptance.fulfillmentIntent, i.order.fulfillmentIntent);
    assert.deepEqual(acceptance.capacityRequirements, i.command.selection.request.capacityRequirements);
    assert.deepEqual(acceptance.acceptance, i.metadata);
    assert.equal(acceptance.id, i.identity.id);
    frozen(result);
  });
}

for (const outcome of ["governing-source-mismatch", "insufficient-capacity", "conflict", "storage-failure", "invalid"] as const) {
  test(`007W ${outcome} never returns acceptance or consumes semantic 005L inputs`, () => {
    const i = fixture(); i.identity.version = 99; i.metadata.acceptedOn = "bad";
    const result = run(i, { outcome });
    assert.deepEqual(result, outcome === "invalid" ? { outcome } : { outcome: "reservation-not-established", reservationOutcome: outcome });
    assert.ok(!Object.hasOwn(result, "value")); frozen(result);
  });
}

const defects: Record<string, (i: Input) => void> = {
  "receipt reservation ID": i => { record(i.mutation.value).reservationId = "other"; },
  "receipt kind": i => { record(i.mutation.value).kind = "other"; },
  "receipt order ID": i => { record(i.mutation.value.order).id = "food-physical-order:other"; },
  "receipt order version": i => { i.mutation.value.order.version++; },
  "receipt request ID": i => { record(i.mutation.value.reservationRequest).id = "food-reservation-request:other"; },
  "receipt request version": i => { i.mutation.value.reservationRequest.version++; },
  "receipt fulfillment ID": i => { record(i.mutation.value.fulfillmentIntent).id = "food-fulfillment-intent:other"; },
  "receipt fulfillment version": i => { i.mutation.value.fulfillmentIntent.version++; },
  "receipt missing SKU": i => { i.mutation.value.skuClaims.pop(); },
  "receipt extra SKU": i => { i.mutation.value.skuClaims.push(clone(i.mutation.value.skuClaims[0]!)); },
  "receipt reordered SKUs": i => { i.mutation.value.skuClaims.reverse(); },
  "receipt duplicate SKU": i => { i.mutation.value.skuClaims[1] = clone(i.mutation.value.skuClaims[0]!); },
  "receipt SKU ID": i => { record(i.mutation.value.skuClaims[0]!.sku).id = "food-sku:other"; },
  "receipt SKU version": i => { i.mutation.value.skuClaims[0]!.sku.version++; },
  "receipt SKU revision": i => { i.mutation.value.skuClaims[0]!.capacityRevision++; },
  "receipt SKU quantity": i => { i.mutation.value.skuClaims[0]!.quantity++; },
  "receipt slot method": i => { i.mutation.value.slotClaim.method = "personal-delivery"; },
  "receipt slot location": i => { i.mutation.value.slotClaim.locationReference = "other"; },
  "receipt slot window": i => { i.mutation.value.slotClaim.windowReference = "other"; },
  "receipt slot revision": i => { i.mutation.value.slotClaim.capacityRevision++; },
  "receipt slot quantity": i => { record(i.mutation.value.slotClaim).quantity = 2; },
  "order ID": i => { record(i.order).id = "food-physical-order:other"; },
  "order version": i => { i.order.version++; },
  "order request ID": i => { record(i.order.reservationRequest).id = "food-reservation-request:other"; },
  "order request version": i => { i.order.reservationRequest.version++; },
  "order fulfillment ID": i => { record(i.order.fulfillmentIntent).id = "food-fulfillment-intent:other"; },
  "order fulfillment version": i => { i.order.fulfillmentIntent.version++; },
  "order fulfillment method": i => { i.order.fulfillmentIntent.method = "personal-delivery"; },
  "order fulfillment location": i => { i.order.fulfillmentIntent.locationReference = "other"; },
  "order fulfillment window": i => { i.order.fulfillmentIntent.windowReference = "other"; },
  "order quote ID": i => { record(i.order.quote).id = "food-merchandise-quote:other"; },
  "order quote version": i => { i.order.quote.version++; },
  "order demand": i => { i.order.reservationRequest.capacityRequirements[0]!.quantity++; },
  "identity ID": i => { record(i.identity).id = "bad"; },
  "identity version": i => { i.identity.version = 2; },
  "attribution": i => { i.metadata.attribution = ""; },
  "sourceReference": i => { i.metadata.sourceReference = " padded "; },
  "acceptedOn": i => { i.metadata.acceptedOn = "yesterday"; },
  "extra metadata": i => { record(i.metadata).authority = true; },
  "command kind": i => { record(i.command).kind = "other"; },
  "command reservation identity": i => { record(i.command).reservationId = ""; },
  "command order identity": i => { record(i.command.order).id = "bad"; },
  "command selection kind": i => { record(i.command.selection).kind = "other"; },
  "command request intent": i => { i.command.selection.request.fulfillmentIntent.version++; },
  "command request quote": i => { i.command.selection.request.quote.version++; },
  "command reordered selection": i => { i.command.selection.skuSelections.reverse(); },
  "command missing selection": i => { i.command.selection.skuSelections.pop(); },
  "command SKU revision": i => { i.command.selection.skuSelections[0]!.revision = 0; },
  "command slot revision": i => { i.command.selection.slotSelection.revision = Number.MAX_SAFE_INTEGER + 1; },
  "command slot binding": i => { i.command.selection.slotSelection.windowReference = "other"; },
  "mutation unknown outcome": i => { record(i.mutation).outcome = "success"; },
  "mutation missing receipt": i => { Reflect.deleteProperty(i.mutation, "value"); },
  "mutation extra field": i => { record(i.mutation).authority = true; },
};
for (const [name, mutate] of Object.entries(defects)) test(`007W rejects ${name}`, () => {
  const i = fixture(); mutate(i); invalid(i);
});

test("007W accepts late evidence for an exact cancelled order without reviving it", () => {
  const i = fixture(true); const before = clone(i.order); const result = run(i);
  assert.equal(result.outcome, "accepted");
  if (result.outcome !== "accepted") throw new Error("Expected late acceptance");
  assert.deepEqual(result.value.acceptance.order, { id: i.order.id, version: i.order.version });
  assert.equal(i.order.state, "cancelled"); assert.deepEqual(i.order, before);
});

const levels: Record<string, (i: Input) => object> = {
  command: i => i.command, mutation: i => i.mutation, order: i => i.order,
  identity: i => i.identity, metadata: i => i.metadata, receipt: i => i.mutation.value,
  claim: i => i.mutation.value.skuClaims[0]!, sku: i => i.mutation.value.skuClaims[0]!.sku,
  slot: i => i.mutation.value.slotClaim, selection: i => i.command.selection,
  request: i => i.command.selection.request, fulfillment: i => i.command.selection.fulfillmentIntent,
};
for (const [name, get] of Object.entries(levels)) for (const defect of ["accessor", "symbol", "custom prototype", "null prototype", "extra", "missing"]) {
  test(`007W ${name} ${defect} fails closed without invoking getters`, () => {
    const i = fixture(); const target = get(i); const key = Object.keys(target)[0]!; let calls = 0;
    if (defect === "accessor") Object.defineProperty(target, key, { get() { calls++; throw new Error("hostile"); } });
    if (defect === "symbol") Object.defineProperty(target, Symbol("bad"), { value: true });
    if (defect === "custom prototype") Object.setPrototypeOf(target, { get trap() { calls++; throw new Error("hostile"); } });
    if (defect === "null prototype") Object.setPrototypeOf(target, null);
    if (defect === "extra") Object.defineProperty(target, "extra", { value: true });
    if (defect === "missing") Reflect.deleteProperty(target, key);
    invalid(i); assert.equal(calls, 0);
  });
}
for (const defect of ["sparse", "extra", "symbol", "accessor", "custom prototype", "subclass", "null prototype"]) {
  test(`007W claims array ${defect} fails closed before iterator/getter access`, () => {
    const i = fixture(); const claims = i.mutation.value.skuClaims; let calls = 0;
    if (defect === "sparse") Reflect.deleteProperty(claims, "0");
    if (defect === "extra") Object.defineProperty(claims, "extra", { value: true });
    if (defect === "symbol") Object.defineProperty(claims, Symbol("bad"), { value: true });
    if (defect === "accessor") Object.defineProperty(claims, "0", { get() { calls++; throw new Error("hostile"); } });
    if (defect === "custom prototype") Object.setPrototypeOf(claims, {
      get [Symbol.iterator]() { calls++; throw new Error("hostile"); },
      get 0() { calls++; throw new Error("hostile"); },
    });
    if (defect === "subclass") { class Claims extends Array {} Object.setPrototypeOf(claims, Claims.prototype); }
    if (defect === "null prototype") Object.setPrototypeOf(claims, null);
    invalid(i); assert.equal(calls, 0);
  });
}
for (const value of [NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, -1, 0, 1.5, "4", null, undefined]) {
  test(`007W invalid numeric revision ${String(value)}`, () => {
    const i = fixture(); record(i.command.selection.skuSelections[0]!).revision = value; invalid(i);
  });
}
for (const value of [undefined, () => null, Symbol("bad"), 1n, new Map()]) test(`007W unsupported input ${typeof value}`, () => {
  const i = fixture(); record(i.metadata).attribution = value; invalid(i);
});
test("007W cycles fail closed", () => {
  const i = fixture(); record(i.mutation.value).order = i.mutation; invalid(i);
});
test("007W detached deeply frozen evidence survives mutation of all caller inputs", () => {
  const i = fixture(); const result = run(i); assert.equal(result.outcome, "accepted");
  const expected = clone(result);
  i.mutation.value.skuClaims[0]!.quantity = 99;
  i.mutation.value.skuClaims.reverse(); i.mutation.value.slotClaim.capacityRevision = 99;
  i.mutation.value.order.version = 99; i.mutation.value.reservationRequest.version = 99;
  i.mutation.value.fulfillmentIntent.version = 99;
  i.command.selection.request.capacityRequirements[0]!.quantity = 99;
  i.command.selection.fulfillmentIntent.windowReference = "changed";
  i.order.version = 99; i.identity.version = 99; i.metadata.attribution = "changed";
  i.metadata.sourceReference = "changed"; i.metadata.acceptedOn = "bad";
  assert.deepEqual(result, expected); frozen(result);
  if (result.outcome !== "accepted") throw new Error("Expected acceptance");
  assert.notEqual(result.value.reservation, i.mutation.value);
  assert.notEqual(result.value.reservation.skuClaims, i.mutation.value.skuClaims);
  assert.ok(!Object.isFrozen(i.metadata));
});
test("007W source contains only pure evidence composition dependencies", () => {
  const source = readFileSync(new URL("./post-mutation-reservation-acceptance.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\.prepare\s*\(|\.batch\s*\(|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|CREATE TABLE|ALTER TABLE|DROP TABLE|process\.env|globalThis|fetch\s*\(|Date\.now|new Date|Math\.random|randomUUID|wrangler|cloudflare:workers|D1Database|node:fs/);
  assert.doesNotMatch(source, /executeFoodAuthoritativeCapacityReservationMutation|recorded-held-capacity-commitment-read|reservation-capacity-governing-source-policy|recorded-capacity-arithmetic|capacity-admission-evaluation|payment-provider|migration/);
  assert.match(source, /import type\s*\{[^}]*FoodAuthoritativeCapacityReservationMutationResult[^}]*\}\s*from/);
  const imports = [...source.matchAll(/from "([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(imports, ["./d1-authoritative-capacity-reservation-mutation", "./reservation-hold-command",
    "./reservation-capacity-source-selection-request", "./fulfillment-capacity-reservation-domain",
    "./physical-order-domain", "./package-sku-domain", "./draft-domain", "./reservation-acceptance-domain"]);
});
test("007W locked specification preserves composition and authority boundaries", () => {
  const spec = JSON.parse(readFileSync(new URL("../../../.river-dev/specifications/food-007w-post-mutation-reservation-acceptance.json", import.meta.url), "utf8"));
  assert.equal(spec.id, "FOOD-007W");
  for (const key of ["exactRevisionReadsRequired", "latestRecordedReadsRequired", "heldCommitmentReadsRequired",
    "governingPolicyRequiredAgain", "capacityArithmeticRequiredAgain", "admissionRequiredAgain"]) {
    assert.equal(spec.capacitySourceBoundary[key], false);
  }
  assert.equal(spec.acceptanceAuthority.doesCreateFood005L, true);
  assert.equal(spec.acceptanceAuthority.doesNotPersistAcceptance, true);
  assert.equal(spec.productionAuthority, false);
});
