import assert from "node:assert/strict";
import test from "node:test";

import {
  FOOD_FULFILLMENT_SLOT_CAPACITY_SOURCE_KIND,
  createInitialFoodFulfillmentSlotCapacitySourceRevision,
  reviseFoodFulfillmentSlotCapacitySourceRevision,
  serializeFoodFulfillmentSlotCapacitySourceRevision,
  validateFoodFulfillmentSlotCapacitySourceRevision,
} from "./fulfillment-slot-capacity-source-domain";

function fixture(
  revision = 1,
  capacityUnits = 4,
) {
  return {
    kind: FOOD_FULFILLMENT_SLOT_CAPACITY_SOURCE_KIND,
    method: "personal-delivery" as const,
    locationReference: "service-area:big-spring",
    windowReference: "window:2026-10-15T17:00",
    revision,
    capacityUnits,
    attribution: "synthetic:test-admin",
    sourceReference: `synthetic:slot-policy:${revision}`,
  };
}

test(
  "valid explicit slot capacity source revision is detached frozen and preserves zero capacity",
  () => {
    const input = fixture(1, 0);
    const value =
      validateFoodFulfillmentSlotCapacitySourceRevision(input);

    assert.deepEqual(value, input);
    assert.notEqual(value, input);
    assert(Object.isFrozen(value));
    assert.equal(value.capacityUnits, 0);
  },
);

test(
  "initial revision must be exactly one",
  () => {
    assert.equal(
      createInitialFoodFulfillmentSlotCapacitySourceRevision(
        fixture(),
      ).revision,
      1,
    );

    assert.throws(() =>
      createInitialFoodFulfillmentSlotCapacitySourceRevision(
        fixture(2),
      ),
    );
  },
);

test(
  "revision requires stable slot identity and exact consecutive version",
  () => {
    const previous = fixture(2, 4);
    const next = fixture(3, 6);

    assert.equal(
      reviseFoodFulfillmentSlotCapacitySourceRevision(
        previous,
        next,
      ).revision,
      3,
    );

    assert.throws(() =>
      reviseFoodFulfillmentSlotCapacitySourceRevision(
        previous,
        fixture(4),
      ),
    );

    assert.throws(() =>
      reviseFoodFulfillmentSlotCapacitySourceRevision(
        previous,
        {
          ...next,
          locationReference: "service-area:other",
        },
      ),
    );

    assert.throws(() =>
      reviseFoodFulfillmentSlotCapacitySourceRevision(
        previous,
        {
          ...next,
          windowReference: "window:other",
        },
      ),
    );

    assert.throws(() =>
      reviseFoodFulfillmentSlotCapacitySourceRevision(
        previous,
        {
          ...next,
          method: "meetup",
        },
      ),
    );
  },
);

test(
  "strict shape methods bounds and metadata reject malformed or inferred values",
  () => {
    for (const invalid of [
      undefined,
      null,
      [],
      {},
      { ...fixture(), method: "shipping" },
      { ...fixture(), revision: 0 },
      { ...fixture(), revision: 1.5 },
      { ...fixture(), capacityUnits: -1 },
      { ...fixture(), capacityUnits: 1.5 },
      { ...fixture(), locationReference: "" },
      { ...fixture(), windowReference: " padded " },
      { ...fixture(), attribution: "" },
      { ...fixture(), sourceReference: "x".repeat(513) },
      { ...fixture(), extra: true },
      Object.assign(fixture(), {
        [Symbol("extra")]: true,
      }),
    ]) {
      assert.throws(() =>
        validateFoodFulfillmentSlotCapacitySourceRevision(
          invalid,
        ),
      );
    }
  },
);

test(
  "serialization is deterministic and identity preserving",
  () => {
    const value = fixture(3, 8);

    assert.equal(
      serializeFoodFulfillmentSlotCapacitySourceRevision(
        value,
      ),
      JSON.stringify(value),
    );
  },
);

test(
  "slot capacity domain grants no inventory reservation checkout or payment authority",
  async () => {
    const {
      readFile,
    } = await import("node:fs/promises");

    const source = await readFile(
      new URL(
        "./fulfillment-slot-capacity-source-domain.ts",
        import.meta.url,
      ),
      "utf8",
    );

    assert.doesNotMatch(
      source,
      /quantityOnHand|reservedQuantity|soldQuantity|inventoryMovement|food_capacity_reservations|food_capacity_reservation_lines|checkoutReady|paymentReady|Stripe|Square|PayPal|fetch\s*\(|process\.env|D1Database/i,
    );
  },
);
