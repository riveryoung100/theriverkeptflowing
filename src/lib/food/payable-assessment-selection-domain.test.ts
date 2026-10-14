import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createFoodPayableAssessmentId,
} from "./payable-assessment-domain";

import * as d from "./payable-assessment-selection-domain";

function money(
  minorUnits: number,
  currency = "USD",
) {
  return Object.freeze({
    currency,
    minorUnits,
  });
}

function assessment(
  version = 1,
  suffix = "synthetic-r",
) {
  return {
    id:
      createFoodPayableAssessmentId(
        suffix,
      ),
    version,
    order: {
      id:
        `food-physical-order:${suffix}`,
      version: 1,
      merchandiseSubtotal:
        money(2400),
    },
    adjustments: [],
    amountDue:
      money(2400),
    assessment: {
      attribution:
        "fixture:trusted-assessor",
      sourceReference:
        `fixture:assessment:${suffix}`,
      assessedOn:
        "2026-10-14",
    },
  };
}

function selection(
  value = assessment(),
) {
  return {
    kind:
      "payable-assessment-selection",
    order: {
      id: value.order.id,
      version: value.order.version,
    },
    payableAssessment: {
      id: value.id,
      version: value.version,
    },
    attribution:
      "fixture:trusted-selector",
    sourceReference:
      "fixture:selection",
    selectedOn:
      "2026-10-14",
  };
}

test(
  "validates exact explicit FOOD-005J assessment selection as immutable evidence",
  () => {
    const payable =
      assessment();

    const result =
      d.validateFoodPayableAssessmentSelectionEvidence(
        selection(payable),
        payable,
      );

    assert.deepEqual(
      result,
      {
        kind:
          "payable-assessment-selection",
        order: {
          id: payable.order.id,
          version:
            payable.order.version,
        },
        payableAssessment: {
          id: payable.id,
          version:
            payable.version,
        },
        attribution:
          "fixture:trusted-selector",
        sourceReference:
          "fixture:selection",
        selectedOn:
          "2026-10-14",
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
        result.payableAssessment,
      ),
    );
  },
);

test(
  "selection must bind the exact payable assessment identity and version",
  () => {
    const payable =
      assessment();

    assert.throws(() =>
      d.validateFoodPayableAssessmentSelectionEvidence(
        {
          ...selection(payable),
          payableAssessment: {
            id:
              createFoodPayableAssessmentId(
                "different-r",
              ),
            version:
              payable.version,
          },
        },
        payable,
      ),
    );

    assert.throws(() =>
      d.validateFoodPayableAssessmentSelectionEvidence(
        {
          ...selection(payable),
          payableAssessment: {
            id: payable.id,
            version:
              payable.version + 1,
          },
        },
        payable,
      ),
    );
  },
);

test(
  "selection must bind the exact FOOD-005E order identity and version carried by the assessment",
  () => {
    const payable =
      assessment();

    assert.throws(() =>
      d.validateFoodPayableAssessmentSelectionEvidence(
        {
          ...selection(payable),
          order: {
            id:
              "food-physical-order:different-r",
            version:
              payable.order.version,
          },
        },
        payable,
      ),
    );

    assert.throws(() =>
      d.validateFoodPayableAssessmentSelectionEvidence(
        {
          ...selection(payable),
          order: {
            id:
              payable.order.id,
            version:
              payable.order.version + 1,
          },
        },
        payable,
      ),
    );
  },
);

test(
  "explicit historical version selection does not infer latest current or supersession",
  () => {
    const historical =
      assessment(
        1,
        "history-r",
      );

    const later = {
      ...historical,
      version: 2,
      amountDue:
        money(2500),
      adjustments: [
        {
          direction: "charge",
          reference:
            "fixture:later-charge",
          money:
            money(100),
          sourceReference:
            "fixture:later-policy",
        },
      ],
      assessment: {
        attribution:
          "fixture:trusted-assessor",
        sourceReference:
          "fixture:later-assessment",
        assessedOn:
          "2026-10-14",
      },
    };

    const selectedHistorical =
      d.validateFoodPayableAssessmentSelectionEvidence(
        selection(historical),
        historical,
      );

    assert.equal(
      selectedHistorical.payableAssessment.version,
      1,
    );

    assert.equal(
      later.version,
      2,
    );

    assert.equal(
      "latest" in selectedHistorical,
      false,
    );

    assert.equal(
      "current" in selectedHistorical,
      false,
    );

    assert.equal(
      "superseded" in selectedHistorical,
      false,
    );
  },
);

test(
  "strict evidence rejects extra authority and malformed selector metadata",
  () => {
    const payable =
      assessment();

    assert.throws(() =>
      d.validateFoodPayableAssessmentSelectionEvidence(
        {
          ...selection(payable),
          current: true,
        },
        payable,
      ),
    );

    assert.throws(() =>
      d.validateFoodPayableAssessmentSelectionEvidence(
        {
          ...selection(payable),
          attribution: "",
        },
        payable,
      ),
    );

    assert.throws(() =>
      d.validateFoodPayableAssessmentSelectionEvidence(
        {
          ...selection(payable),
          selectedOn:
            "10/14/2026",
        },
        payable,
      ),
    );
  },
);

test(
  "malformed FOOD-005J assessment fails closed before selection evidence can be accepted",
  () => {
    const payable =
      assessment();

    assert.throws(() =>
      d.validateFoodPayableAssessmentSelectionEvidence(
        selection(payable),
        {
          ...payable,
          amountDue:
            money(999),
        },
      ),
    );

    assert.throws(() =>
      d.validateFoodPayableAssessmentSelectionEvidence(
        selection(payable),
        {
          ...payable,
          unexpected:
            true,
        },
      ),
    );
  },
);

test(
  "selection evidence grants no pricing readiness payment reservation fulfillment sale accounting or rewards authority",
  () => {
    const payable =
      assessment();

    const selected =
      d.validateFoodPayableAssessmentSelectionEvidence(
        selection(payable),
        payable,
      );

    for (const key of [
      "latest",
      "current",
      "usable",
      "superseded",
      "amountDue",
      "merchandiseSubtotal",
      "adjustments",
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
        key in selected,
        false,
      );
    }
  },
);

test(
  "source remains pure explicit selection validation with no latest lookup persistence provider clock or operational effects",
  () => {
    const source =
      readFileSync(
        new URL(
          "./payable-assessment-selection-domain.ts",
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