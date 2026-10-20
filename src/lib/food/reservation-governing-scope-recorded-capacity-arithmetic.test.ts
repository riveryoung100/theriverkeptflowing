import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createInitialFoodCartVersion, createInitialFoodMerchandiseQuoteVersion } from "./cart-quote-domain";
import { createInitialFoodFulfillmentIntentVersion, createInitialFoodReservationRequestVersion } from "./fulfillment-capacity-reservation-domain";
import { createInitialFoodPhysicalOrderVersion } from "./physical-order-domain";
import { deriveFoodReservationCapacityCommitmentScope, type FoodReservationCapacityCommitmentScope } from "./reservation-capacity-commitment-scope";
import type { FoodReservationCapacitySourceSelectionResolution } from "./reservation-capacity-source-selection-resolution";
import { FOOD_RESERVATION_GOVERNING_SCOPE_RECORDED_HELD_COMMITMENT_RESOLUTION_KIND, type FoodReservationGoverningScopeRecordedHeldCommitmentResolution } from "./reservation-governing-scope-recorded-held-commitment-resolution";
import { validateFoodExactSkuStockedCapacitySourceRevision } from "./exact-sku-stocked-capacity-source-domain";
import { validateFoodFulfillmentSlotCapacitySourceRevision } from "./fulfillment-slot-capacity-source-domain";
import { FOOD_RESERVATION_GOVERNING_SCOPE_RECORDED_CAPACITY_ARITHMETIC_KIND as KIND, deriveFoodReservationGoverningScopeRecordedCapacityArithmetic as derive } from "./reservation-governing-scope-recorded-capacity-arithmetic";

const SKU_A = "food-sku:a";
const SKU_B = "food-sku:b";
const LOCATION = "food-location:main";
const WINDOW = "food-window:dinner";

function scope(
  method:
    | "personal-delivery"
    | "meetup" =
      "personal-delivery",
) {
  const streams = {
    kind:
      "reservation-capacity-commitment-scope",
    skuScopes: [
      {
        sku: {
          id:
            SKU_B,
          version:
            1,
        },
        governingRevision:
          2,
      },
      {
        sku: {
          id:
            SKU_A,
          version:
            1,
        },
        governingRevision:
          3,
      },
    ],
    slotScope: {
      method,
      locationReference:
        LOCATION,
      windowReference:
        WINDOW,
      governingRevision:
        4,
    },
  };
  const skus = streams.skuScopes.map(({ sku }, index) => ({
    ...sku,
    servingOffer: { offerId: `food-serving-offer:007s-${index}`, version: 1 },
    package: { id: `food-package-definition:007s-${index}`, version: 1 },
  }));
  const cart = createInitialFoodCartVersion({
    id: "food-cart:007s", version: 1,
    lines: skus.map(sku => ({ sku: { id: sku.id, version: sku.version }, quantity: 2 })),
  });
  const prices = skus.map((sku, index) => ({
    id: `food-approved-commercial-price:007s-${index}`, version: 1,
    sku: { id: sku.id, version: sku.version }, money: { currency: "USD", minorUnits: 100 },
    approval: { attribution: "synthetic:owner", sourceReference: "synthetic:price", approvedOn: "2026-10-13" },
  }));
  const quote = createInitialFoodMerchandiseQuoteVersion({ id: "food-merchandise-quote:007s", version: 1 }, cart, skus, prices);
  const fulfillmentIntent = createInitialFoodFulfillmentIntentVersion(
    { id: "food-fulfillment-intent:007s", version: 1 }, quote,
    { method, locationReference: LOCATION, windowReference: WINDOW },
  );
  const request = createInitialFoodReservationRequestVersion({ id: "food-reservation-request:007s", version: 1 }, quote, fulfillmentIntent);
  const order = createInitialFoodPhysicalOrderVersion({ id: "food-physical-order:007s", version: 1 }, quote, fulfillmentIntent, request);
  const result = deriveFoodReservationCapacityCommitmentScope({
    commandInput: {
      reservationId: "opaque:007s", order, quote, request, fulfillmentIntent,
      skuSelections: streams.skuScopes.map(({ sku, governingRevision }) => ({ sku, revision: governingRevision })),
      slotSelection: { method, locationReference: LOCATION, windowReference: WINDOW, revision: 4 },
    },
    observations: {
      skuObservations: streams.skuScopes.map(({ sku, governingRevision }) => ({ sku, observedHighestRecordedRevision: governingRevision })),
      slotObservation: { method, locationReference: LOCATION, windowReference: WINDOW, observedHighestRecordedRevision: 4 },
    },
  });
  assert.equal(result.outcome, "scoped");
  if (result.outcome !== "scoped") throw new Error("Expected canonical FOOD-007P scope");
  // Mutable detached input permits the existing hostile-input and detachment tests.
  const canonical = structuredClone(result.value);
  return {
    ...canonical,
    skuScopes: canonical.skuScopes.map(entry => ({ ...entry, sku: { ...entry.sku } })),
    slotScope: { ...canonical.slotScope },
  } satisfies FoodReservationCapacityCommitmentScope;
}


type Evidence = {
  f: FoodReservationCapacitySourceSelectionResolution;
  p: FoodReservationCapacityCommitmentScope;
  r: FoodReservationGoverningScopeRecordedHeldCommitmentResolution;
};
type Mutable<T> = T extends string | number | boolean | null | undefined
  ? T
  : { -readonly [K in keyof T]: Mutable<T[K]> };
function fixture(method: "personal-delivery" | "meetup" = "personal-delivery"): Mutable<Evidence> {
  const p = scope(method);
  const f: FoodReservationCapacitySourceSelectionResolution = {
    kind: "reservation-capacity-source-selection-resolution",
    selection: structuredClone(p.governing.command.selection),
    skuSources: p.skuScopes.map(entry => validateFoodExactSkuStockedCapacitySourceRevision({
      kind: "exact-sku-stocked-capacity-source", sku: entry.sku, revision: entry.governingRevision,
      capacityUnits: 10, attribution: "synthetic:owner", sourceReference: "synthetic:source",
    })),
    slotSource: validateFoodFulfillmentSlotCapacitySourceRevision({
      kind: "fulfillment-slot-capacity-source", method, locationReference: LOCATION, windowReference: WINDOW,
      revision: p.slotScope.governingRevision, capacityUnits: 10, attribution: "synthetic:owner", sourceReference: "synthetic:source",
    }),
  };
  const r: FoodReservationGoverningScopeRecordedHeldCommitmentResolution = {
    kind: FOOD_RESERVATION_GOVERNING_SCOPE_RECORDED_HELD_COMMITMENT_RESOLUTION_KIND,
    skuCommitments: p.skuScopes.map((entry, index) => ({ ...entry, recordedHeldQuantity: index === 0 ? 4 : 7 })),
    slotCommitment: { ...p.slotScope, recordedHeldQuantity: 2 },
  };
  // Only remove readonly typing from a detached clone of valid canonical evidence.
  return structuredClone({ f, p, r }) as Mutable<Evidence>;
}
function run(e: Evidence) { return derive(e.f, e.p, e.r); }
function success(e: Evidence) {
  const result = run(e);
  assert.equal(result.outcome, "derived");
  if (result.outcome !== "derived") throw new Error("Expected derived arithmetic");
  return result;
}
function at(root: unknown, path: string): unknown {
  let value = root;
  for (const key of path.split(".")) value = (value as Record<string, unknown>)[key];
  return value;
}
function put(root: unknown, path: string, value: unknown): void {
  const parts = path.split(".");
  const key = parts.pop()!;
  const parent = parts.length ? at(root, parts.join(".")) : root;
  Object.defineProperty(parent, key, { value, enumerable: true, configurable: true, writable: true });
}
// Malformed-input tests deliberately cross the typed boundary; valid fixtures above
// are checked against the actual exported F/P/R types without an invalid-input cast.
function reject(e: unknown): void {
  const value = e as Evidence;
  assert.deepEqual(derive(value.f, value.p, value.r), { outcome: "invalid" });
}

for (const method of ["personal-delivery", "meetup"] as const) {
  for (const [label, capacity, held, delta] of [
    ["positive", 10, 4, 6], ["zero", 4, 4, 0], ["negative", 2, 4, -2],
    ["maximum positive", Number.MAX_SAFE_INTEGER, 0, Number.MAX_SAFE_INTEGER],
    ["maximum negative", 0, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER],
  ] as const) {
    test("007S " + method + " preserves " + label + " SKU and slot deltas", () => {
      const e = fixture(method);
      for (const source of e.f.skuSources) source.capacityUnits = capacity;
      for (const commitment of e.r.skuCommitments) commitment.recordedHeldQuantity = held;
      e.f.slotSource.capacityUnits = capacity;
      e.r.slotCommitment.recordedHeldQuantity = held;
      const result = success(e);
      assert.deepEqual(result.value.skuArithmetic.map(x => x.recordedCapacityDelta), [delta, delta]);
      assert.equal(result.value.slotArithmetic.recordedCapacityDelta, delta);
      assert.equal(result.value.kind, KIND);
      for (const entry of [...result.value.skuArithmetic, result.value.slotArithmetic]) {
        assert.equal(entry.capacityUnits - entry.recordedHeldQuantity, entry.recordedCapacityDelta);
      }
    });
  }
}

test("007S three-way correlation preserves P order and exact governingRevision output", () => {
  const e = fixture();
  const value = success(e).value;
  assert.deepEqual(value, {
    kind: KIND,
    skuArithmetic: [
      { sku: { id: SKU_B, version: 1 }, governingRevision: 2, capacityUnits: 10, recordedHeldQuantity: 4, recordedCapacityDelta: 6 },
      { sku: { id: SKU_A, version: 1 }, governingRevision: 3, capacityUnits: 10, recordedHeldQuantity: 7, recordedCapacityDelta: 3 },
    ],
    slotArithmetic: { method: "personal-delivery", locationReference: LOCATION, windowReference: WINDOW,
      governingRevision: 4, capacityUnits: 10, recordedHeldQuantity: 2, recordedCapacityDelta: 8 },
  });
});

const mismatches: ReadonlyArray<readonly [string, unknown]> = [
  ["f.skuSources.0.sku.id", SKU_A], ["f.skuSources.0.sku.version", 2],
  ["f.skuSources.0.revision", 99], ["f.selection.skuSelections.0.revision", 99],
  ["p.skuScopes.0.governingRevision", 99], ["r.skuCommitments.0.governingRevision", 99],
  ["r.skuCommitments.0.sku.id", SKU_A], ["r.skuCommitments.0.sku.version", 2],
  ["p.governing.observations.skuObservations.0.observedHighestRecordedRevision", 99],
  ["p.governing.observations.skuObservations.0.sku.id", SKU_A],
  ["p.governing.command.selection.skuSelections.0.revision", 99],
  ["p.governing.command.selection.request.capacityRequirements.0.quantity", 99],
  ["f.selection.request.fulfillmentIntent.version", 2],
  ["f.slotSource.method", "meetup"], ["f.slotSource.locationReference", "wrong"],
  ["f.slotSource.windowReference", "wrong"], ["f.slotSource.revision", 99],
  ["p.slotScope.governingRevision", 99], ["r.slotCommitment.governingRevision", 99],
  ["r.slotCommitment.method", "meetup"], ["r.slotCommitment.locationReference", "wrong"],
  ["r.slotCommitment.windowReference", "wrong"],
  ["p.governing.observations.slotObservation.observedHighestRecordedRevision", 99],
  ["p.governing.observations.slotObservation.locationReference", "wrong"],
  ["f.kind", "wrong"], ["p.kind", "wrong"], ["r.kind", "wrong"],
  ["p.policyVersion", 2], ["p.governing.policyVersion", 2],
  ["p.governing.kind", "wrong"], ["p.governing.command.kind", "wrong"],
  ["p.governing.command.selection.kind", "wrong"], ["f.selection.kind", "wrong"],
  ["p.governing.command.order.id", "wrong"], ["p.governing.command.order.version", 0],
  ["p.governing.command.reservationId", ""],
];
for (const [path, value] of mismatches) {
  test("007S rejects identity/revision/governing correspondence mismatch at " + path, () => {
    const e = fixture(); put(e, path, value); reject(e);
  });
}
for (const path of ["f.skuSources", "f.selection.skuSelections", "p.skuScopes", "p.governing.observations.skuObservations", "r.skuCommitments"]) {
  for (const mode of ["count mismatch", "reordered streams", "duplicate identities"]) {
    test("007S rejects " + mode + " at " + path, () => {
      const e = fixture();
      const entries = at(e, path) as unknown[];
      if (mode === "count mismatch") entries.pop();
      else if (mode === "reordered streams") entries.reverse();
      else entries[1] = structuredClone(entries[0]);
      reject(e);
    });
  }
}
for (const path of ["f.skuSources.0.capacityUnits", "f.slotSource.capacityUnits", "r.skuCommitments.0.recordedHeldQuantity", "r.slotCommitment.recordedHeldQuantity"]) {
  for (const invalid of [-1, Number.MAX_SAFE_INTEGER + 1, "4", 1.5, NaN, Infinity]) {
    test("007S rejects invalid numeric quantity " + path + " " + String(invalid), () => {
      const e = fixture(); put(e, path, invalid); reject(e);
    });
  }
}
for (const path of ["p.skuScopes.0.governingRevision", "p.slotScope.governingRevision", "r.skuCommitments.0.governingRevision", "r.slotCommitment.governingRevision", "p.skuScopes.0.sku.version"]) {
  for (const invalid of [0, -1, Number.MAX_SAFE_INTEGER + 1, "1", 1.5]) {
    test("007S rejects invalid positive-safe field " + path + " " + String(invalid), () => {
      const e = fixture(); put(e, path, invalid); reject(e);
    });
  }
}
for (const root of ["f", "p", "r"]) {
  for (const defect of ["missing root key", "extra root key", "accessor", "symbol", "custom object prototype", "null object prototype", "class prototype"]) {
    test("007S rejects " + root + " " + defect + " without hostile getter execution", () => {
      const e = fixture();
      const object = at(e, root) as object;
      let getterCalls = 0;
      if (defect === "missing root key") Reflect.deleteProperty(object, "kind");
      else if (defect === "extra root key") Object.defineProperty(object, "extra", { value: true });
      else if (defect === "accessor") Object.defineProperty(object, "kind", { get() { getterCalls += 1; return "wrong"; } });
      else if (defect === "symbol") Object.defineProperty(object, Symbol("extra"), { value: true });
      else {
        class CustomRecord {}
        Object.setPrototypeOf(object, defect === "null object prototype" ? null : defect === "class prototype" ? CustomRecord.prototype : Object.create(Object.prototype));
      }
      reject(e); assert.equal(getterCalls, 0);
    });
  }
}
for (const path of ["f.skuSources.0.sku", "f.selection.request", "p.governing.command", "p.slotScope", "r.slotCommitment"]) {
  test("007S rejects nested accessor at " + path + " with zero getter calls", () => {
    const e = fixture(); let getterCalls = 0;
    const object = at(e, path) as object;
    const key = Object.keys(object)[0]!;
    Object.defineProperty(object, key, { get() { getterCalls += 1; throw new Error("Must not run"); } });
    reject(e); assert.equal(getterCalls, 0);
  });
}
for (const path of ["f.skuSources", "f.selection.request.capacityRequirements", "p.skuScopes", "p.governing.observations.skuObservations", "r.skuCommitments"]) {
  for (const defect of ["sparse", "extended", "symbol", "index accessor", "custom array prototype", "null array prototype", "subclass array prototype"]) {
    test("007S rejects " + defect + " at " + path + " before inherited Symbol.iterator getter", () => {
      const e = fixture(); const array = at(e, path) as unknown[]; let getterCalls = 0;
      if (defect === "sparse") Reflect.deleteProperty(array, "0");
      else if (defect === "extended") Object.defineProperty(array, "extra", { value: true });
      else if (defect === "symbol") Object.defineProperty(array, Symbol("extra"), { value: true });
      else if (defect === "index accessor") Object.defineProperty(array, "0", { get() { getterCalls += 1; throw new Error("Must not run"); } });
      else {
        class CustomArray extends Array {}
        const prototype = defect === "null array prototype" ? null : defect === "subclass array prototype" ? CustomArray.prototype : Object.create(Array.prototype);
        if (prototype !== null) Object.defineProperty(prototype, Symbol.iterator, { get() { getterCalls += 1; return Array.prototype[Symbol.iterator]; } });
        Object.setPrototypeOf(array, prototype);
      }
      reject(e); assert.equal(getterCalls, 0);
    });
  }
}
for (const invalid of [null, undefined, true, 1, "wrong", () => 1]) {
  for (const root of ["f", "p", "r"]) {
    test("007S rejects malformed root " + root + " " + String(invalid), () => {
      const e = fixture(); put(e, root, invalid); reject(e);
    });
  }
}
test("007S rejects cycles without escaping exceptions", () => {
  const e = fixture(); put(e, "p.governing.command.selection", e.p); reject(e);
});
test("007S detached frozen output and no mutation of caller evidence", () => {
  const e = fixture(); const before = structuredClone(e); const result = success(e);
  assert.deepEqual(e, before);
  assert.ok(Object.isFrozen(result)); assert.ok(Object.isFrozen(result.value));
  assert.ok(Object.isFrozen(result.value.skuArithmetic)); assert.ok(Object.isFrozen(result.value.slotArithmetic));
  for (const entry of result.value.skuArithmetic) { assert.ok(Object.isFrozen(entry)); assert.ok(Object.isFrozen(entry.sku)); }
  const expected = structuredClone(result);
  e.f.skuSources[0]!.capacityUnits = 0; e.p.skuScopes[0]!.governingRevision = 99; e.r.skuCommitments[0]!.recordedHeldQuantity = 99;
  e.f.slotSource.capacityUnits = 0; e.p.slotScope.locationReference = "changed"; e.r.slotCommitment.recordedHeldQuantity = 99;
  assert.deepEqual(result, expected);
  assert.notEqual(result.value.skuArithmetic[0]!.sku, before.p.skuScopes[0]!.sku);
});
test("007S purity and deterministic equivalent canonical inputs independent of property insertion order", () => {
  const e = fixture(); const equivalent = structuredClone(e);
  equivalent.f.selection.request.quote = Object.fromEntries(Object.entries(e.f.selection.request.quote).reverse()) as typeof equivalent.f.selection.request.quote;
  assert.deepEqual(run(e), run(equivalent));
});
test("007S non-authority static contract has no persistence async demand arithmetic or stronger output vocabulary", () => {
  const source = readFileSync(new URL("./reservation-governing-scope-recorded-capacity-arithmetic.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bUPSERT\b/i);
  assert.doesNotMatch(source, /Promise|\basync\b|\bawait\b|D1|database|remainingCapacity|reservableQuantity|availableToPromise|createFoodReservationAcceptance|createInitialFoodReservationAcceptance|demandQuantity|recordedDemandAdjustedCapacityDelta|Date\.now|Math\.random|process\.env|fetch\s*\(/);
  for (const invocation of ["evaluateFoodReservationCapacityGoverningSourcePolicy", "deriveFoodReservationCapacityCommitmentScope", "readFoodGoverningScopeRecordedHeldCapacityCommitment", "resolveFoodReservationGoverningScopeRecordedHeldCommitments"]) assert.equal(source.includes(invocation + "("), false);
  assert.match(source, /BigInt\(capacityUnits\) - BigInt\(recordedHeldQuantity\)/);
  const value = success(fixture()).value;
  assert.deepEqual(Object.keys(value), ["kind", "skuArithmetic", "slotArithmetic"]);
  assert.deepEqual(Object.keys(value.skuArithmetic[0]!), ["sku", "governingRevision", "capacityUnits", "recordedHeldQuantity", "recordedCapacityDelta"]);
  assert.deepEqual(Object.keys(value.slotArithmetic), ["method", "locationReference", "windowReference", "governingRevision", "capacityUnits", "recordedHeldQuantity", "recordedCapacityDelta"]);
});
