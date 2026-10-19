import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createInitialFoodCartVersion, createInitialFoodMerchandiseQuoteVersion } from "./cart-quote-domain";
import { createInitialFoodFulfillmentIntentVersion, createInitialFoodReservationRequestVersion } from "./fulfillment-capacity-reservation-domain";
import { deriveFoodReservationCapacitySourceSelectionRequest as derive, FOOD_RESERVATION_CAPACITY_SOURCE_SELECTION_REQUEST_KIND as KIND } from "./reservation-capacity-source-selection-request";

function sku(
    name: string,
    version = 1,
) {
    return {
        id: `food-sku:${name}`,
        version,
        servingOffer: {
            offerId: `food-serving-offer:${name}`,
            version: 1,
        },
        package: {
            id: `food-package-definition:${name}`,
            version: 1,
        },
    };
}

function approvedPrice(
    name: string,
    skuInput: ReturnType<typeof sku>,
    minorUnits: number,
) {
    return {
        id: `food-approved-commercial-price:${name}`,
        version: 1,
        sku: {
            id: skuInput.id,
            version: skuInput.version,
        },
        money: {
            currency: "USD",
            minorUnits,
        },
        approval: {
            attribution: "fixture:owner",
            sourceReference:
                `fixture:price:${name}`,
            approvedOn: "2026-10-13",
        },
    };
}

function quoteFixture() {
    const a = sku("a");
    const b = sku("b");

    const cart =
        createInitialFoodCartVersion({
            id: "food-cart:005d-fixture",
            version: 1,
            lines: [
                {
                    sku: {
                        id: a.id,
                        version: a.version,
                    },
                    quantity: 2,
                },
                {
                    sku: {
                        id: b.id,
                        version: b.version,
                    },
                    quantity: 3,
                },
            ],
        });

    const quote =
        createInitialFoodMerchandiseQuoteVersion(
            {
                id: "food-merchandise-quote:005d-fixture",
                version: 1,
            },
            cart,
            [a, b],
            [
                approvedPrice("a", a, 1000),
                approvedPrice("b", b, 500),
            ],
        );

    return {
        a,
        b,
        quote,
    };
}


type Mutable<T> = T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T;
function mutableClone<T>(input: T): Mutable<T> { return structuredClone(input) as Mutable<T>; }

function inputFixture(single = false, method = "personal-delivery") {
  let { quote } = quoteFixture();
  if (single) {
    const a = sku("a");
    const cart = createInitialFoodCartVersion({ id: "food-cart:single", version: 1, lines: [{ sku: { id: a.id, version: 1 }, quantity: 2 }] });
    quote = createInitialFoodMerchandiseQuoteVersion({ id: "food-merchandise-quote:single", version: 1 }, cart, [a], [approvedPrice("a", a, 1000)]);
  }
  const fulfillmentIntent = createInitialFoodFulfillmentIntentVersion(
    { id: "food-fulfillment-intent:007e", version: 1 }, quote,
    { method, locationReference: "synthetic:location", windowReference: "synthetic:window" });
  const request = createInitialFoodReservationRequestVersion(
    { id: "food-reservation-request:007e", version: 1 }, quote, fulfillmentIntent);
  return mutableClone({ request, quote, fulfillmentIntent,
    skuSelections: request.capacityRequirements.map((line, index) => ({ sku: line.sku, revision: index + 2 })),
    slotSelection: { method: fulfillmentIntent.method, locationReference: fulfillmentIntent.locationReference,
      windowReference: fulfillmentIntent.windowReference, revision: 8 } });
}

function candidate(input: unknown) {
  const result = derive(input);
  assert.equal(result.outcome, "candidate");
  if (result.outcome !== "candidate") throw new Error("expected candidate");
  return result;
}
function invalid(input: unknown) {
  const result = derive(input);
  assert.deepEqual(result, { outcome: "invalid" });
  assert.ok(Object.isFrozen(result));
}
function record(input: unknown): Record<string, unknown> { return input as Record<string, unknown>; }
function frozen(input: unknown): void {
  if (input && typeof input === "object") {
    assert.ok(Object.isFrozen(input));
    for (const value of Object.values(input)) frozen(value);
  }
}

for (const single of [true, false]) {
  for (const method of ["personal-delivery", "meetup"]) {
    test(`007E canonical ${single ? "single" : "multi"} SKU ${method} candidate`, () => {
      const input = inputFixture(single, method);
      const result = candidate(input);
      assert.deepEqual(result.value, { kind: KIND, request: input.request,
        fulfillmentIntent: input.fulfillmentIntent, skuSelections: input.skuSelections,
        slotSelection: input.slotSelection });
      assert.deepEqual(Object.keys(result.value).sort(),
        ["kind", "request", "fulfillmentIntent", "skuSelections", "slotSelection"].sort());
      frozen(result);
      assert.ok(!Object.isFrozen(input));
      assert.notEqual(result.value.request, input.request);
      assert.notEqual(result.value.fulfillmentIntent, input.fulfillmentIntent);
    });
  }
}

test("007E arbitrary selection order canonicalizes by exact request demand", () => {
  const input = inputFixture();
  const expected = candidate(input);
  input.skuSelections.reverse();
  assert.deepEqual(candidate(input), expected);
  assert.deepEqual(candidate(input).value.skuSelections.map(s => s.sku), input.request.capacityRequirements.map(l => l.sku));
});

test("007E historical and maximum safe revisions are proposals without continuity", () => {
  const input = inputFixture();
  input.skuSelections[0]!.revision = Number.MAX_SAFE_INTEGER;
  input.skuSelections[1]!.revision = 1;
  input.slotSelection.revision = Number.MAX_SAFE_INTEGER;
  const result = candidate(input);
  assert.equal(result.value.skuSelections[0]!.revision, Number.MAX_SAFE_INTEGER);
  assert.equal(result.value.skuSelections[1]!.revision, 1);
  assert.equal(result.value.slotSelection.revision, Number.MAX_SAFE_INTEGER);
});

for (const revision of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "3", NaN, Infinity, null, undefined]) {
  for (const target of ["sku", "slot"]) {
    test(`007E invalid ${target} revision ${String(revision)}`, () => {
      const input = inputFixture();
      record(target === "sku" ? input.skuSelections[0] : input.slotSelection).revision = revision;
      invalid(input);
    });
  }
}

const mappingDefects: Record<string, (input: ReturnType<typeof inputFixture>) => void> = {
  missing: input => { input.skuSelections.pop(); },
  extra: input => { input.skuSelections.push(structuredClone(input.skuSelections[0]!)); },
  duplicate: input => { input.skuSelections[1] = structuredClone(input.skuSelections[0]!); },
  "wrong id": input => { record(input.skuSelections[0]!.sku).id = "food-sku:other"; },
  "malformed id": input => { record(input.skuSelections[0]!.sku).id = "wrong"; },
  "wrong version": input => { input.skuSelections[0]!.sku.version = 8; },
  "invalid version": input => { input.skuSelections[0]!.sku.version = 0; },
};
for (const [name, mutate] of Object.entries(mappingDefects)) {
  test(`007E mapping rejects ${name}`, () => { const input = inputFixture(); mutate(input); invalid(input); });
}

for (const field of ["method", "locationReference", "windowReference"]) {
  test(`007E slot mismatch ${field}`, () => {
    const input = inputFixture(); record(input.slotSelection)[field] = field === "method" ? "meetup" : "other";
    invalid(input);
  });
}

const bindingDefects: Record<string, (input: ReturnType<typeof inputFixture>) => void> = {
  "request quote id": input => { record(input.request.quote).id = "food-merchandise-quote:other"; },
  "request quote version": input => { input.request.quote.version++; },
  "request intent id": input => { record(input.request.fulfillmentIntent).id = "food-fulfillment-intent:other"; },
  "request intent version": input => { input.request.fulfillmentIntent.version++; },
  "intent quote id": input => { record(input.fulfillmentIntent.quote).id = "food-merchandise-quote:other"; },
  "intent quote version": input => { input.fulfillmentIntent.quote.version++; },
  "demand quantity": input => { input.request.capacityRequirements[0]!.quantity++; },
  "demand zero": input => { input.request.capacityRequirements[0]!.quantity = 0; },
  "demand SKU": input => { record(input.request.capacityRequirements[0]!.sku).id = "food-sku:other"; },
  "demand duplicate": input => { input.request.capacityRequirements[1] = structuredClone(input.request.capacityRequirements[0]!); },
  "demand order": input => { input.request.capacityRequirements.reverse(); },
  "quote total": input => { input.quote.merchandiseSubtotal.minorUnits++; },
  "invalid request id": input => { record(input.request).id = "wrong"; },
  "invalid intent method": input => { record(input.fulfillmentIntent).method = "shipping"; },
};
for (const [name, mutate] of Object.entries(bindingDefects)) {
  test(`007E canonical upstream rejects ${name}`, () => { const input = inputFixture(); mutate(input); invalid(input); });
}

const levels = {
  top: (i: ReturnType<typeof inputFixture>) => record(i),
  selection: (i: ReturnType<typeof inputFixture>) => record(i.skuSelections[0]),
  sku: (i: ReturnType<typeof inputFixture>) => record(i.skuSelections[0]!.sku),
  slot: (i: ReturnType<typeof inputFixture>) => record(i.slotSelection),
  request: (i: ReturnType<typeof inputFixture>) => record(i.request),
  quote: (i: ReturnType<typeof inputFixture>) => record(i.quote),
  intent: (i: ReturnType<typeof inputFixture>) => record(i.fulfillmentIntent),
};
for (const [level, get] of Object.entries(levels)) {
  for (const defect of ["missing", "extra", "symbol", "accessor", "inherited"]) {
    test(`007E strict ${level} rejects ${defect}`, () => {
      const input = inputFixture(); const target = get(input); const key = Object.keys(target)[0]!;
      let calls = 0;
      if (defect === "missing") delete target[key];
      if (defect === "extra") Object.defineProperty(target, "extra", { value: true });
      if (defect === "symbol") Object.defineProperty(target, Symbol("extra"), { value: true });
      if (defect === "accessor") Object.defineProperty(target, key, { get() { calls++; throw new Error("must not invoke"); } });
      if (defect === "inherited") {
        const value = target[key]; delete target[key]; Object.setPrototypeOf(target, { [key]: value });
      }
      invalid(input); assert.equal(calls, 0);
    });
  }
}

for (const path of ["selections", "demand", "quote"]) {
  for (const defect of ["sparse", "extra", "symbol", "accessor", "prototype"]) {
    test(`007E strict ${path} array rejects ${defect}`, () => {
      const input = inputFixture();
      const array = path === "selections" ? input.skuSelections : path === "demand" ? input.request.capacityRequirements : input.quote.lines;
      let calls = 0;
      if (defect === "sparse") Reflect.deleteProperty(array, "0");
      if (defect === "extra") Object.defineProperty(array, "extra", { value: true });
      if (defect === "symbol") Object.defineProperty(array, Symbol("extra"), { value: true });
      if (defect === "accessor") Object.defineProperty(array, "0", { get() { calls++; return null; } });
      if (defect === "prototype") Object.setPrototypeOf(array, {});
      invalid(input); assert.equal(calls, 0);
    });
  }
}

for (const field of ["capacityUnits", "available", "remaining", "reservable", "atp", "accepted", "eligible", "trusted", "current", "latest", "active", "held", "orderable", "acceptedOn"]) {
  for (const level of ["top", "selection", "sku", "slot"] as const) {
    test(`007E rejects ${field} authority on ${level}`, () => {
      const input = inputFixture(); levels[level](input)[field] = true; invalid(input);
    });
  }
}

for (const input of [null, undefined, [], true, "input", 5]) {
  test(`007E malformed root ${String(input)}`, () => invalid(input));
}
test("007E cycles unsupported values and malformed selection collection reject", () => {
  const input = inputFixture(); record(input).quote = input;
  invalid(input);
  for (const value of [null, {}, "array", undefined, () => null, Symbol("value"), 1n]) {
    const input = inputFixture(); record(input).skuSelections = value; invalid(input);
  }
});

test("007E deep output detachment covers all caller snapshots and proposals", () => {
  const input = inputFixture(); const result = candidate(input);
  const expected = structuredClone(result);
  input.request.capacityRequirements[0]!.quantity = 99;
  input.request.version = 9;
  input.fulfillmentIntent.windowReference = "changed";
  input.quote.lines[0]!.quantity = 99;
  record(input.skuSelections[0]!.sku).id = "food-sku:changed";
  input.skuSelections[0]!.revision = 99;
  input.slotSelection.locationReference = "changed";
  input.slotSelection.revision = 99;
  assert.deepEqual(result, expected); frozen(result);
});

test("007E source is pure and does not resolve storage or create acceptance", async () => {
  const source = await readFile(new URL("./reservation-capacity-source-selection-request.ts", import.meta.url), "utf8");
  assert.match(source, /validateFoodReservationRequestAgainstSources\(/);
  assert.match(source, /validateFoodFulfillmentIntentVersion\(/);
  assert.doesNotMatch(source, /D1|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bdatabase\b|\.prepare\(|fetch\s*\(|process\.env|Date\.now|new Date|Math\.random|randomUUID/);
  assert.doesNotMatch(source, /readFoodExactSkuStockedCapacitySourceRevision|readFoodExactFulfillmentSlotCapacitySourceRevision|createInitialFoodReservationAcceptanceVersion|acceptedOn|reservation-acceptance-domain/);
});
