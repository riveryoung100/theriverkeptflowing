import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  FOOD_RESERVATION_SELECTION_RECORDED_CAPACITY_ARITHMETIC_KIND,
  deriveFoodReservationSelectionRecordedCapacityArithmetic,
} from "./reservation-selection-recorded-capacity-arithmetic";

const SKU_A =
  "food-sku:007l-a";

const SKU_B =
  "food-sku:007l-b";

const LOCATION =
  "synthetic:location";

const WINDOW =
  "synthetic:window";

function sourceResolution() {
  return {
    kind:
      "reservation-capacity-source-selection-resolution",

    selection: {
      kind:
        "reservation-capacity-source-selection-request",

      request: {},
      fulfillmentIntent: {},

      skuSelections: [
        {
          sku: {
            id: SKU_A,
            version: 1,
          },
          revision: 2,
        },
        {
          sku: {
            id: SKU_B,
            version: 1,
          },
          revision: 3,
        },
      ],

      slotSelection: {
        method:
          "personal-delivery",
        locationReference:
          LOCATION,
        windowReference:
          WINDOW,
        revision: 4,
      },
    },

    skuSources: [
      {
        kind:
          "exact-sku-stocked-capacity-source",
        sku: {
          id: SKU_A,
          version: 1,
        },
        revision: 2,
        capacityUnits: 10,
        attribution:
          "synthetic:writer",
        sourceReference:
          "opaque:sku-a",
      },
      {
        kind:
          "exact-sku-stocked-capacity-source",
        sku: {
          id: SKU_B,
          version: 1,
        },
        revision: 3,
        capacityUnits: 2,
        attribution:
          "synthetic:writer",
        sourceReference:
          "opaque:sku-b",
      },
    ],

    slotSource: {
      kind:
        "fulfillment-slot-capacity-source",
      method:
        "personal-delivery",
      locationReference:
        LOCATION,
      windowReference:
        WINDOW,
      revision: 4,
      capacityUnits: 1,
      attribution:
        "synthetic:writer",
      sourceReference:
        "opaque:slot",
    },
  };
}

function commitmentResolution() {
  return {
    kind:
      "reservation-selection-recorded-held-commitment-resolution",

    validation: {
      kind:
        "reservation-capacity-source-latest-recorded-selection-validation",

      skuObservations: [
        {
          sku: {
            id: SKU_A,
            version: 1,
          },
          selectedRevision: 2,
          observedHighestRecordedRevision: 2,
        },
        {
          sku: {
            id: SKU_B,
            version: 1,
          },
          selectedRevision: 3,
          observedHighestRecordedRevision: 3,
        },
      ],

      slotObservation: {
        method:
          "personal-delivery",
        locationReference:
          LOCATION,
        windowReference:
          WINDOW,
        selectedRevision: 4,
        observedHighestRecordedRevision: 4,
      },
    },

    skuCommitments: [
      {
        sku: {
          id: SKU_A,
          version: 1,
        },
        capacityRevision: 2,
        recordedHeldQuantity: 3,
      },
      {
        sku: {
          id: SKU_B,
          version: 1,
        },
        capacityRevision: 3,
        recordedHeldQuantity: 5,
      },
    ],

    slotCommitment: {
      method:
        "personal-delivery",
      locationReference:
        LOCATION,
      windowReference:
        WINDOW,
      capacityRevision: 4,
      recordedHeldQuantity: 1,
    },
  };
}

function derived(
  input:
    ReturnType<
      typeof deriveFoodReservationSelectionRecordedCapacityArithmetic
    >,
) {
  assert.equal(
    input.outcome,
    "derived",
  );

  if (
    input.outcome !==
    "derived"
  ) {
    throw new Error(
      "Expected derived",
    );
  }

  return input.value;
}

test(
  "007L derives positive negative and zero signed exact-revision arithmetic without clamping",
  () => {
    const value =
      derived(
        deriveFoodReservationSelectionRecordedCapacityArithmetic(
          sourceResolution() as never,
          commitmentResolution() as never,
        ),
      );

    assert.equal(
      value.kind,
      FOOD_RESERVATION_SELECTION_RECORDED_CAPACITY_ARITHMETIC_KIND,
    );

    assert.deepEqual(
      value.skuArithmetic,
      [
        {
          sku: {
            id: SKU_A,
            version: 1,
          },
          capacityRevision: 2,
          capacityUnits: 10,
          recordedHeldQuantity: 3,
          recordedCapacityDelta: 7,
        },
        {
          sku: {
            id: SKU_B,
            version: 1,
          },
          capacityRevision: 3,
          capacityUnits: 2,
          recordedHeldQuantity: 5,
          recordedCapacityDelta: -3,
        },
      ],
    );

    assert.deepEqual(
      value.slotArithmetic,
      {
        method:
          "personal-delivery",
        locationReference:
          LOCATION,
        windowReference:
          WINDOW,
        capacityRevision: 4,
        capacityUnits: 1,
        recordedHeldQuantity: 1,
        recordedCapacityDelta: 0,
      },
    );

    assert.equal(
      value.skuArithmetic[1]!
        .recordedCapacityDelta,
      -3,
    );
  },
);

test(
  "007L rejects SKU revision mismatch instead of rolling commitments across revisions",
  () => {
    const commitments =
      commitmentResolution();

    commitments.skuCommitments[0]!
      .capacityRevision =
      9;

    assert.deepEqual(
      deriveFoodReservationSelectionRecordedCapacityArithmetic(
        sourceResolution() as never,
        commitments as never,
      ),
      {
        outcome:
          "invalid",
      },
    );
  },
);

test(
  "007L rejects SKU identity mismatch",
  () => {
    const commitments =
      commitmentResolution();

    commitments.skuCommitments[0]!
      .sku.id =
      "food-sku:other";

    assert.deepEqual(
      deriveFoodReservationSelectionRecordedCapacityArithmetic(
        sourceResolution() as never,
        commitments as never,
      ),
      {
        outcome:
          "invalid",
      },
    );
  },
);

test(
  "007L rejects slot revision mismatch",
  () => {
    const commitments =
      commitmentResolution();

    commitments.slotCommitment
      .capacityRevision =
      8;

    assert.deepEqual(
      deriveFoodReservationSelectionRecordedCapacityArithmetic(
        sourceResolution() as never,
        commitments as never,
      ),
      {
        outcome:
          "invalid",
      },
    );
  },
);

test(
  "007L rejects inconsistent 007K validation evidence",
  () => {
    const commitments =
      commitmentResolution();

    commitments.validation
      .skuObservations[0]!
      .observedHighestRecordedRevision =
      8;

    assert.deepEqual(
      deriveFoodReservationSelectionRecordedCapacityArithmetic(
        sourceResolution() as never,
        commitments as never,
      ),
      {
        outcome:
          "invalid",
      },
    );
  },
);

test(
  "007L rejects SKU count mismatch",
  () => {
    const commitments =
      commitmentResolution();

    commitments.skuCommitments.pop();

    assert.deepEqual(
      deriveFoodReservationSelectionRecordedCapacityArithmetic(
        sourceResolution() as never,
        commitments as never,
      ),
      {
        outcome:
          "invalid",
      },
    );
  },
);

test(
  "007L rejects extra fields and does not invoke accessor fields",
  () => {
    let invoked =
      false;

    const commitments =
      commitmentResolution();

    const bad =
      {
        ...commitments,
        get extra() {
          invoked =
            true;

          return 1;
        },
      };

    assert.deepEqual(
      deriveFoodReservationSelectionRecordedCapacityArithmetic(
        sourceResolution() as never,
        bad as never,
      ),
      {
        outcome:
          "invalid",
      },
    );

    assert.equal(
      invoked,
      false,
    );
  },
);

test(
  "007L output is detached and deeply frozen",
  () => {
    const sources =
      sourceResolution();

    const commitments =
      commitmentResolution();

    const value =
      derived(
        deriveFoodReservationSelectionRecordedCapacityArithmetic(
          sources as never,
          commitments as never,
        ),
      );

    sources.skuSources[0]!
      .capacityUnits =
      999;

    commitments.skuCommitments[0]!
      .recordedHeldQuantity =
      999;

    assert.equal(
      value.skuArithmetic[0]!
        .capacityUnits,
      10,
    );

    assert.equal(
      value.skuArithmetic[0]!
        .recordedHeldQuantity,
      3,
    );

    assert.equal(
      value.skuArithmetic[0]!
        .recordedCapacityDelta,
      7,
    );

    assert.equal(
      Object.isFrozen(
        value,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        value.skuArithmetic,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        value.skuArithmetic[0],
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        value.skuArithmetic[0]!.sku,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        value.slotArithmetic,
      ),
      true,
    );
  },
);

test(
  "007L result surface grants no operational capacity authority",
  () => {
    const value =
      derived(
        deriveFoodReservationSelectionRecordedCapacityArithmetic(
          sourceResolution() as never,
          commitmentResolution() as never,
        ),
      );

    const serialized =
      JSON.stringify(
        value,
      ).toLowerCase();

    for (
      const forbidden of
        [
          '"remaining"',
          '"reservable"',
          '"available"',
          '"atp"',
          '"active"',
          '"governing"',
          '"eligible"',
          '"sufficient"',
          '"accepted"',
          '"acceptance"',
          '"orderable"',
          '"quantityonhand"',
        ]
    ) {
      assert.equal(
        serialized.includes(
          forbidden,
        ),
        false,
        forbidden,
      );
    }
  },
);

test(
  "007L source is pure arithmetic composition with BigInt subtraction and no clamp or side effects",
  () => {
    const source =
      readFileSync(
        new URL(
          "./reservation-selection-recorded-capacity-arithmetic.ts",
          import.meta.url,
        ),
        "utf8",
      );

    assert.match(
      source,
      /BigInt/,
    );

    assert.match(
      source,
      /recordedCapacityDelta/,
    );

    assert.doesNotMatch(
      source,
      /Math\.max\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bUPSERT\b/i,
    );

    assert.doesNotMatch(
      source,
      /\.prepare\s*\(|\.bind\s*\(|\.all\s*</,
    );

    assert.doesNotMatch(
      source,
      /Date\.now|new Date|process\.env|fetch\s*\(|Math\.random|randomUUID/,
    );

    assert.doesNotMatch(
      source,
      /createFoodReservationAcceptance|createInitialFoodReservationAcceptance/,
    );
  },
);