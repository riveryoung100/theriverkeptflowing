import {
  FOOD_RESERVATION_CAPACITY_GOVERNING_SOURCE_POLICY_KIND as KIND007O,
  evaluateFoodReservationCapacityGoverningSourcePolicy as evaluate007O,
} from "./reservation-capacity-governing-source-policy";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createInitialFoodCartVersion, createInitialFoodMerchandiseQuoteVersion } from "./cart-quote-domain";
import { createInitialFoodFulfillmentIntentVersion, createInitialFoodReservationRequestVersion } from "./fulfillment-capacity-reservation-domain";
import { createInitialFoodPhysicalOrderVersion } from "./physical-order-domain";
import { FOOD_RESERVATION_HOLD_COMMAND_KIND as KIND } from "./reservation-hold-command";

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
type PolicyInput = ReturnType<typeof policyInput>;

function record007O(input: unknown): Record<PropertyKey, unknown> {
  return input as Record<PropertyKey, unknown>;
}

function frozen007O(input: unknown): void {
  if (input !== null && typeof input === "object") {
    assert.ok(Object.isFrozen(input));
    Object.values(input).forEach(frozen007O);
  }
}

function policyInput(count = 3, method = "personal-delivery") {
  const commandInput = fixture(count, method);
  return {
    commandInput,
    observations: {
      skuObservations: commandInput.skuSelections.map(selection => ({
        sku: { ...selection.sku },
        observedHighestRecordedRevision: selection.revision,
      })),
      slotObservation: {
        method: commandInput.slotSelection.method,
        locationReference: commandInput.slotSelection.locationReference,
        windowReference: commandInput.slotSelection.windowReference,
        observedHighestRecordedRevision: commandInput.slotSelection.revision,
      },
    },
  };
}

function valueFor(
  input: unknown,
  outcome: "matches-policy" | "does-not-match-policy",
) {
  const result = evaluate007O(input);
  assert.equal(result.outcome, outcome);
  if (result.outcome !== outcome) throw new Error(`Expected ${outcome}`);
  frozen007O(result);
  return result.value;
}

function invalid007O(input: unknown): void {
  const result = evaluate007O(input);
  assert.deepEqual(result, { outcome: "invalid" });
  frozen007O(result);
}

for (const count of [1, 3]) {
  for (const method of ["personal-delivery", "meetup"]) {
    test(`007O ${count} SKU ${method} complete equality matches v1`, () => {
      const input = policyInput(count, method);
      const before = structuredClone(input);
      const value = valueFor(input, "matches-policy");

      assert.equal(value.kind, KIND007O);
      assert.equal(value.policyVersion, 1);
      assert.equal(value.command.kind, KIND);
      assert.equal(value.command.reservationId, input.commandInput.reservationId);
      assert.equal(value.command.order.id, input.commandInput.order.id);
      assert.equal(value.command.order.version, input.commandInput.order.version);

      assert.deepEqual(
        value.observations.skuObservations.map(observation => observation.sku),
        value.command.selection.skuSelections.map(selection => selection.sku),
      );

      assert.deepEqual(input, before);
      assert.ok(!Object.isFrozen(input));
      assert.ok(!Object.isFrozen(input.commandInput));
      assert.ok(!Object.isFrozen(input.observations));

      assert.deepEqual(
        Object.keys(value).sort(),
        ["kind", "policyVersion", "command", "observations"].sort(),
      );

      assert.deepEqual(
        Object.keys(value.observations).sort(),
        ["skuObservations", "slotObservation"].sort(),
      );
    });
  }
}

test("007O arbitrary SKU observation order normalizes to canonical command order", () => {
  const input = policyInput(3);
  input.observations.skuObservations.reverse();

  const value = valueFor(input, "matches-policy");

  assert.deepEqual(
    value.observations.skuObservations.map(observation => observation.sku),
    value.command.selection.skuSelections.map(selection => selection.sku),
  );
});

test("007O valid selected-lower-than-observed SKU inequality does not match policy", () => {
  const input = policyInput();
  input.observations.skuObservations[0]!.observedHighestRecordedRevision++;

  valueFor(input, "does-not-match-policy");
});

test("007O valid selected-greater-than-observed SKU inequality does not match policy", () => {
  const input = policyInput();
  input.commandInput.skuSelections[0]!.revision++;

  valueFor(input, "does-not-match-policy");
});

test("007O valid selected-lower-than-observed slot inequality does not match policy", () => {
  const input = policyInput();
  input.observations.slotObservation.observedHighestRecordedRevision++;

  valueFor(input, "does-not-match-policy");
});

test("007O valid selected-greater-than-observed slot inequality does not match policy", () => {
  const input = policyInput();
  input.commandInput.slotSelection.revision++;

  valueFor(input, "does-not-match-policy");
});

test("007O multiple complete valid inequalities remain does-not-match-policy", () => {
  const input = policyInput();
  input.observations.skuObservations[0]!.observedHighestRecordedRevision++;
  input.observations.skuObservations[1]!.observedHighestRecordedRevision++;
  input.observations.slotObservation.observedHighestRecordedRevision++;

  valueFor(input, "does-not-match-policy");
});

test("007O missing SKU observation is invalid", () => {
  const input = policyInput();
  input.observations.skuObservations.pop();
  invalid007O(input);
});

test("007O duplicate exact SKU observation is invalid", () => {
  const input = policyInput();
  input.observations.skuObservations[1] =
    structuredClone(input.observations.skuObservations[0]!);
  invalid007O(input);
});

test("007O unknown extra SKU observation is invalid", () => {
  const input = policyInput();
  const extra = structuredClone(input.observations.skuObservations[0]!);
  record007O(extra.sku).id = "food-sku:007o-extra";
  input.observations.skuObservations.push(extra);
  invalid007O(input);
});

test("007O wrong SKU id is invalid", () => {
  const input = policyInput();
  record007O(input.observations.skuObservations[0]!.sku).id = "food-sku:wrong";
  invalid007O(input);
});

test("007O wrong SKU version is invalid", () => {
  const input = policyInput();
  input.observations.skuObservations[0]!.sku.version++;
  invalid007O(input);
});

test("007O wrong slot method is invalid", () => {
  const input = policyInput();
  input.observations.slotObservation.method =
    input.observations.slotObservation.method === "personal-delivery"
      ? "meetup"
      : "personal-delivery";
  invalid007O(input);
});

test("007O wrong slot location is invalid", () => {
  const input = policyInput();
  input.observations.slotObservation.locationReference = "food-location:wrong";
  invalid007O(input);
});

test("007O wrong slot window is invalid", () => {
  const input = policyInput();
  input.observations.slotObservation.windowReference = "food-window:wrong";
  invalid007O(input);
});

for (const revision of [
  0,
  -1,
  1.5,
  Number.MAX_SAFE_INTEGER + 1,
  NaN,
  Infinity,
  "1",
  null,
  undefined,
]) {
  test(`007O invalid SKU observed revision ${String(revision)}`, () => {
    const input = policyInput();
    record007O(input.observations.skuObservations[0]!)
      .observedHighestRecordedRevision = revision;
    invalid007O(input);
  });

  test(`007O invalid slot observed revision ${String(revision)}`, () => {
    const input = policyInput();
    record007O(input.observations.slotObservation)
      .observedHighestRecordedRevision = revision;
    invalid007O(input);
  });
}

for (const root of [null, undefined, [], true, 1, "policy", {}]) {
  test(`007O malformed root ${String(root)}`, () => {
    invalid007O(root);
  });
}

const strictLevels007O = {
  root: (input: PolicyInput) => record007O(input),
  observations: (input: PolicyInput) => record007O(input.observations),
  skuObservation: (input: PolicyInput) =>
    record007O(input.observations.skuObservations[0]),
  skuIdentity: (input: PolicyInput) =>
    record007O(input.observations.skuObservations[0]!.sku),
  slotObservation: (input: PolicyInput) =>
    record007O(input.observations.slotObservation),
};

for (const [level, get] of Object.entries(strictLevels007O)) {
  for (const defect of ["missing", "extra", "accessor", "prototype", "symbol"]) {
    test(`007O strict ${level} ${defect} never invokes getters`, () => {
      const input = policyInput();
      const target = get(input);
      const key = Object.keys(target)[0]!;
      let calls = 0;

      if (defect === "missing") delete target[key];
      if (defect === "extra") {
        Object.defineProperty(target, "extra", { value: true });
      }
      if (defect === "accessor") {
        Object.defineProperty(target, key, {
          get() {
            calls++;
            throw new Error("hostile");
          },
        });
      }
      if (defect === "prototype") {
        const value = target[key];
        delete target[key];
        Object.setPrototypeOf(target, { [key]: value });
      }
      if (defect === "symbol") {
        Object.defineProperty(target, Symbol("bad"), { value: true });
      }

      invalid007O(input);
      assert.equal(calls, 0);
    });
  }
}

for (const defect of ["sparse", "extra", "symbol", "accessor"]) {
  test(`007O malformed skuObservations array ${defect}`, () => {
    const input = policyInput();
    const array = input.observations.skuObservations;
    let calls = 0;

    if (defect === "sparse") {
      Reflect.deleteProperty(array, "0");
    }

    if (defect === "extra") {
      Object.defineProperty(array, "extra", { value: true });
    }

    if (defect === "symbol") {
      Object.defineProperty(array, Symbol("bad"), { value: true });
    }

    if (defect === "accessor") {
      Object.defineProperty(array, "0", {
        get() {
          calls++;
          return null;
        },
      });
    }

    invalid007O(input);
    assert.equal(calls, 0);
  });
}

test("007O complete structural validation wins over an earlier valid mismatch", () => {
  const input = policyInput(3);

  input.observations.skuObservations[0]!.observedHighestRecordedRevision++;

  let calls = 0;
  Object.defineProperty(
    input.observations.skuObservations[2]!,
    "observedHighestRecordedRevision",
    {
      get() {
        calls++;
        return 1;
      },
    },
  );

  invalid007O(input);
  assert.equal(calls, 0);
});

test("007O invalid canonical FOOD-007N command replay is invalid", () => {
  const input = policyInput();
  input.commandInput.reservationId = "";
  invalid007O(input);
});

test("007O caller cannot supply policyVersion as a policy switch", () => {
  const input = policyInput();
  record007O(input).policyVersion = 2;
  invalid007O(input);
});

test("007O output is detached, deeply frozen, and caller input remains mutable", () => {
  const input = policyInput();
  const value = valueFor(input, "matches-policy");
  const expected = structuredClone(value);

  input.commandInput.reservationId = "mutated-after-evaluation";
  input.commandInput.skuSelections[0]!.revision = 99;
  input.observations.skuObservations[0]!.observedHighestRecordedRevision = 99;
  input.observations.skuObservations.reverse();
  input.observations.slotObservation.observedHighestRecordedRevision = 99;

  assert.deepEqual(value, expected);
  frozen007O(value);

  assert.ok(!Object.isFrozen(input));
  assert.ok(!Object.isFrozen(input.commandInput));
  assert.ok(!Object.isFrozen(input.observations));
});

test("007O output observations omit redundant selectedRevision fields", () => {
  const value = valueFor(policyInput(), "matches-policy");

  for (const observation of value.observations.skuObservations) {
    assert.deepEqual(
      Object.keys(observation).sort(),
      ["sku", "observedHighestRecordedRevision"].sort(),
    );
    assert.ok(!Object.hasOwn(observation, "selectedRevision"));
  }

  assert.deepEqual(
    Object.keys(value.observations.slotObservation).sort(),
    [
      "method",
      "locationReference",
      "windowReference",
      "observedHighestRecordedRevision",
    ].sort(),
  );

  assert.ok(
    !Object.hasOwn(value.observations.slotObservation, "selectedRevision"),
  );
});

test("007O purity excludes DB, SQL, arithmetic, acceptance, clocks, randomness, and environment", () => {
  const source = readFileSync(
    new URL("./reservation-capacity-governing-source-policy.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /deriveFoodReservationHoldCommand\(/);
  assert.match(source, /observedHighestRecordedRevision/);

  assert.doesNotMatch(
    source,
    /SELECT\s+[\s\S]*?\sFROM\s|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|\bUPSERT\b|\.prepare\(|\.bind\(|\.batch\(|D1Database|process\.env|fetch\s*\(|Date\.now|new Date|Math\.random|randomUUID/,
  );

  assert.doesNotMatch(
    source,
    /reservation-demand-recorded-capacity-arithmetic|deriveFoodReservationDemandRecordedCapacityArithmetic|FoodReservationDemandRecordedCapacityArithmetic|recordedCapacityDelta|recordedDemandAdjustedCapacityDelta|capacityUnits|recordedHeldQuantity|createInitialFoodReservationAcceptanceVersion|FoodReservationAcceptanceVersion/,
  );
});

test("007O specification locks v1 observation-bound governance and all nonclaims", () => {
  const spec = JSON.parse(
    readFileSync(
      new URL(
        "../../../.river-dev/specifications/food-007o-reservation-capacity-governing-source-policy.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );

  assert.equal(spec.id, "FOOD-007O");
  assert.equal(
    spec.startingHead,
    "77b10cf4a16851b3cf61f1fef6daa00ea34e04b6",
  );

  assert.equal(spec.policyRule.version, 1);
  assert.equal(spec.policyRule.newPolicy, true);
  assert.equal(spec.policyRule.callerConfigurable, false);

  assert.deepEqual(
    spec.result.outcomes,
    ["matches-policy", "does-not-match-policy", "invalid"],
  );

  for (const key of [
    "exactStreamBinding",
    "completeSetRule",
    "observationBoundary",
    "food007iRelationship",
    "mutationTimeRecheck",
    "trustBoundary",
    "physicalTruthBoundary",
    "commitmentScopeBoundary",
    "admissionBoundary",
    "acceptanceBoundary",
    "atomicityBoundary",
    "sideEffects",
  ]) {
    assert.equal(typeof spec[key], "string");
  }

  for (const claim of [
    "authenticated provenance",
    "authenticated caller",
    "database origin",
    "observation age",
    "simultaneous observation snapshot",
    "physical currentness",
    "physical truth",
    "current physical QOH",
    "remaining capacity",
    "available capacity",
    "active commitments",
    "cross-revision commitment scope",
    "capacity sufficiency",
    "capacity insufficiency",
    "reservation permission",
    "reservation admission",
    "reservable quantity",
    "ATP / available-to-promise",
    "acceptance",
    "rejection",
    "durable hold",
    "persisted hold",
    "reservation success",
    "oversell prevention",
    "slot-overbooking prevention",
    "atomicity",
    "perpetual governing validity",
    "mutation-time governing status",
  ]) {
    assert.ok(spec.nonClaims.includes(claim));
  }

  assert.equal(spec.migrationImpact, "none");
  assert.equal(spec.productionImpact, "none");
  assert.equal(spec.production, "untouched");
  assert.equal(spec.nextDependency, "Reservation Capacity Commitment Scope");
});
