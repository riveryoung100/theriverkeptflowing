import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import * as d from "./fulfillment-charge-policy-satisfaction";

function policy(
  requirement:
    | "required"
    | "not-required" = "required",
  suffix = "synthetic-s",
) {
  return {
    id:
      `food-fulfillment-policy-decision:${suffix}`,
    version: 1,
    order: {
      id:
        `food-physical-order:${suffix}`,
      version: 1,
    },
    fulfillmentIntent: {
      id:
        `food-fulfillment-intent:${suffix}`,
      version: 1,
      method: "delivery",
      locationReference:
        `fixture:location:${suffix}`,
      windowReference:
        `fixture:window:${suffix}`,
    },
    manualApprovalRequirement:
      requirement,
    decision: {
      attribution:
        "fixture:trusted-policy",
      policyReference:
        `fixture:policy:${suffix}`,
      decidedOn:
        "2026-10-14",
    },
  };
}

function selection(
  suffix = "synthetic-s",
) {
  return {
    kind:
      "payable-assessment-selection",
    order: {
      id:
        `food-physical-order:${suffix}`,
      version: 1,
    },
    payableAssessment: {
      id:
        `food-payable-assessment:${suffix}`,
      version: 2,
    },
    attribution:
      "fixture:trusted-selector",
    sourceReference:
      `fixture:selection:${suffix}`,
    selectedOn:
      "2026-10-14",
  };
}

function inclusion(
  suffix = "synthetic-s",
) {
  return {
    kind:
      "authorized-fulfillment-charge-assessment-inclusion",
    order: {
      id:
        `food-physical-order:${suffix}`,
      version: 1,
    },
    payableAssessment: {
      id:
        `food-payable-assessment:${suffix}`,
      version: 2,
    },
    adjustment: {
      direction: "charge",
      reference:
        `food-manual-fulfillment-approval:${suffix}@v1`,
      money: {
        currency: "USD",
        minorUnits: 500,
      },
      sourceReference:
        `food-fulfillment-policy-decision:${suffix}@v1`,
    },
  };
}

test(
  "required policy is satisfied only by exact authorized inclusion tied to selected assessment",
  () => {
    const result =
      d.deriveFoodFulfillmentChargePolicySatisfaction(
        policy("required"),
        selection(),
        inclusion(),
      );

    assert.deepEqual(
      result,
      {
        kind:
          "fulfillment-charge-policy-satisfaction",
        order: {
          id:
            "food-physical-order:synthetic-s",
          version: 1,
        },
        policyDecision: {
          id:
            "food-fulfillment-policy-decision:synthetic-s",
          version: 1,
        },
        payableAssessment: {
          id:
            "food-payable-assessment:synthetic-s",
          version: 2,
        },
        manualApprovalRequirement:
          "required",
        chargeGate:
          "required-with-authorized-inclusion",
      },
    );

    assert.ok(
      Object.isFrozen(result),
    );

    assert.ok(
      Object.isFrozen(result.order),
    );

    assert.ok(
      Object.isFrozen(
        result.policyDecision,
      ),
    );

    assert.ok(
      Object.isFrozen(
        result.payableAssessment,
      ),
    );
  },
);

test(
  "required policy fails closed when authorized inclusion is absent",
  () => {
    assert.throws(() =>
      d.deriveFoodFulfillmentChargePolicySatisfaction(
        policy("required"),
        selection(),
      ),
    );
  },
);

test(
  "required policy rejects inclusion for a different order or different selected assessment",
  () => {
    assert.throws(() =>
      d.deriveFoodFulfillmentChargePolicySatisfaction(
        policy("required"),
        selection(),
        {
          ...inclusion(),
          order: {
            id:
              "food-physical-order:different",
            version: 1,
          },
        },
      ),
    );

    assert.throws(() =>
      d.deriveFoodFulfillmentChargePolicySatisfaction(
        policy("required"),
        selection(),
        {
          ...inclusion(),
          payableAssessment: {
            id:
              "food-payable-assessment:different",
            version: 2,
          },
        },
      ),
    );
  },
);

test(
  "not-required policy is positively satisfied without inventing approval charge or inclusion evidence",
  () => {
    const result =
      d.deriveFoodFulfillmentChargePolicySatisfaction(
        policy(
          "not-required",
          "standard-s",
        ),
        selection(
          "standard-s",
        ),
      );

    assert.equal(
      result.manualApprovalRequirement,
      "not-required",
    );

    assert.equal(
      result.chargeGate,
      "not-required-without-charge",
    );

    assert.deepEqual(
      result.payableAssessment,
      {
        id:
          "food-payable-assessment:standard-s",
        version: 2,
      },
    );
  },
);

test(
  "not-required policy rejects FOOD-005Q inclusion instead of accepting synthetic zero-fee authority",
  () => {
    assert.throws(() =>
      d.deriveFoodFulfillmentChargePolicySatisfaction(
        policy(
          "not-required",
        ),
        selection(),
        inclusion(),
      ),
    );

    assert.throws(() =>
      d.deriveFoodFulfillmentChargePolicySatisfaction(
        policy(
          "not-required",
        ),
        selection(),
        {
          ...inclusion(),
          adjustment: {
            ...inclusion()
              .adjustment,
            money: {
              currency: "USD",
              minorUnits: 0,
            },
          },
        },
      ),
    );
  },
);

test(
  "policy and selection must bind the same exact physical order",
  () => {
    assert.throws(() =>
      d.deriveFoodFulfillmentChargePolicySatisfaction(
        policy(
          "not-required",
          "policy-order",
        ),
        selection(
          "selection-order",
        ),
      ),
    );
  },
);

test(
  "strict upstream evidence cannot smuggle malformed shapes or unsupported authority",
  () => {
    assert.throws(() =>
      d.deriveFoodFulfillmentChargePolicySatisfaction(
        {
          ...policy(),
          checkoutReady: true,
        },
        selection(),
        inclusion(),
      ),
    );

    assert.throws(() =>
      d.deriveFoodFulfillmentChargePolicySatisfaction(
        policy(),
        {
          ...selection(),
          current: true,
        },
        inclusion(),
      ),
    );

    assert.throws(() =>
      d.deriveFoodFulfillmentChargePolicySatisfaction(
        policy(),
        selection(),
        {
          ...inclusion(),
          amountDue: {
            currency: "USD",
            minorUnits: 2900,
          },
        },
      ),
    );
  },
);

test(
  "satisfaction evidence grants no amount readiness payment reservation fulfillment sale accounting or rewards authority",
  () => {
    const result =
      d.deriveFoodFulfillmentChargePolicySatisfaction(
        policy(),
        selection(),
        inclusion(),
      );

    for (const key of [
      "adjustment",
      "approvedAdditionalFee",
      "amountDue",
      "latest",
      "current",
      "usable",
      "checkoutReady",
      "paymentReady",
      "paymentLink",
      "checkoutSession",
      "paymentStatus",
      "paidInFull",
      "reservationAccepted",
      "quantityOnHand",
      "availableQuantity",
      "reservedQuantity",
      "inventory",
      "prepareReady",
      "dispatchReady",
      "fulfilled",
      "completedSale",
      "revenue",
      "accounting",
      "ledger",
      "rewardsEligible",
      "verifiedPurchase",
    ]) {
      assert.equal(
        key in result,
        false,
      );
    }

    const source =
      readFileSync(
        new URL(
          "./fulfillment-charge-policy-satisfaction.ts",
          import.meta.url,
        ),
        "utf8",
      );

    assert.doesNotMatch(
      source,
      /Date\.now|new Date|Date\.parse|process\.env|fetch\s*\(|Math\.random|D1Database|database|repository|INSERT|UPDATE|DELETE|Stripe|Square|PayPal|webhook|getLatest|listLatest|checkoutReady\s*:|paymentReady\s*:|paymentLink\s*:|paymentStatus\s*:|paidInFull\s*:|quantityOnHand\s*:|reservedQuantity\s*:|dispatchReady\s*:|completedSale\s*:|revenue\s*:|ledger\s*:/i,
    );
  },
);
