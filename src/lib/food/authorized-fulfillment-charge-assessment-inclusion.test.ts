import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createFoodApprovedCommercialPriceId,
  createInitialFoodApprovedCommercialPrice,
} from "./approved-commercial-price-domain";

import {
  createFoodCartId,
  createFoodMerchandiseQuoteId,
  createInitialFoodCartVersion,
  createInitialFoodMerchandiseQuoteVersion,
} from "./cart-quote-domain";

import {
  createFoodFulfillmentIntentId,
  createFoodReservationRequestId,
  createInitialFoodFulfillmentIntentVersion,
  createInitialFoodReservationRequestVersion,
} from "./fulfillment-capacity-reservation-domain";

import {
  createFoodPackageDefinitionId,
  createFoodSkuId,
  validateFoodPackageDefinitionVersion,
  validateFoodSkuVersion,
} from "./package-sku-domain";

import {
  createFoodPhysicalOrderId,
  createInitialFoodPhysicalOrderVersion,
} from "./physical-order-domain";

import {
  createFoodManualFulfillmentApprovalId,
  createInitialFoodManualFulfillmentApprovalVersion,
} from "./manual-fulfillment-approval-domain";

import {
  createFoodFulfillmentPolicyDecisionId,
  createInitialFoodFulfillmentPolicyDecisionVersion,
} from "./fulfillment-policy-decision-domain";

import {
  deriveFoodAuthorizedFulfillmentChargeCandidate,
} from "./authorized-fulfillment-charge-candidate";

import {
  projectFoodAuthorizedFulfillmentChargeToPayableAdjustment,
} from "./authorized-fulfillment-charge-adjustment";

import {
  createFoodPayableAssessmentId,
  createInitialFoodPayableAssessmentVersion,
} from "./payable-assessment-domain";

import * as d from "./authorized-fulfillment-charge-assessment-inclusion";

const money = (
  minorUnits = 1200,
  currency = "USD",
) => ({
  currency,
  minorUnits,
});

interface AdjustmentInput {
  readonly direction:
    | "charge"
    | "credit";
  readonly reference: string;
  readonly money: {
    readonly currency: string;
    readonly minorUnits: number;
  };
  readonly sourceReference: string;
}

function sources(
  suffix = "synthetic-q",
) {
  const packageDefinition =
    validateFoodPackageDefinitionVersion({
      id:
        createFoodPackageDefinitionId(
          suffix,
        ),
      version: 1,
      descriptor:
        "Synthetic FOOD-005Q package",
    });

  const sku =
    validateFoodSkuVersion({
      id:
        createFoodSkuId(
          suffix,
        ),
      version: 1,
      servingOffer: {
        offerId:
          `food-serving-offer:${suffix}` as never,
        version: 1,
      },
      package: {
        id:
          packageDefinition.id,
        version:
          packageDefinition.version,
      },
    });

  const price =
    createInitialFoodApprovedCommercialPrice(
      {
        id:
          createFoodApprovedCommercialPriceId(
            suffix,
          ),
        version: 1,
        sku: {
          id: sku.id,
          version: sku.version,
        },
        money: money(),
        approval: {
          attribution:
            "fixture:synthetic-price",
          sourceReference:
            "fixture:price-policy",
          approvedOn:
            "2026-10-13",
        },
      },
      sku,
    );

  const cart =
    createInitialFoodCartVersion({
      id:
        createFoodCartId(
          suffix,
        ),
      version: 1,
      lines: [
        {
          sku: {
            id: sku.id,
            version: sku.version,
          },
          quantity: 2,
        },
      ],
    });

  const quote =
    createInitialFoodMerchandiseQuoteVersion(
      {
        id:
          createFoodMerchandiseQuoteId(
            suffix,
          ),
        version: 1,
      },
      cart,
      [sku],
      [price],
    );

  const fulfillment =
    createInitialFoodFulfillmentIntentVersion(
      {
        id:
          createFoodFulfillmentIntentId(
            suffix,
          ),
        version: 1,
      },
      quote,
      {
        method:
          "personal-delivery",
        locationReference:
          "fixture:food-005q-location",
        windowReference:
          "fixture:food-005q-window",
      },
    );

  const reservation =
    createInitialFoodReservationRequestVersion(
      {
        id:
          createFoodReservationRequestId(
            suffix,
          ),
        version: 1,
      },
      quote,
      fulfillment,
    );

  const order =
    createInitialFoodPhysicalOrderVersion(
      {
        id:
          createFoodPhysicalOrderId(
            suffix,
          ),
        version: 1,
      },
      quote,
      fulfillment,
      reservation,
    );

  return {
    fulfillment,
    order,
  };
}

function authority(
  suffix = "synthetic-q",
  feeMinorUnits = 500,
) {
  const source =
    sources(suffix);

  const policy =
    createInitialFoodFulfillmentPolicyDecisionVersion(
      {
        id:
          createFoodFulfillmentPolicyDecisionId(
            suffix,
          ),
        version: 1,
      },
      source.order,
      source.fulfillment,
      {
        manualApprovalRequirement:
          "required",
        attribution:
          "fixture:trusted-policy",
        policyReference:
          `fixture:policy:${suffix}`,
        decidedOn:
          "2026-10-13",
      },
    );

  const approval =
    createInitialFoodManualFulfillmentApprovalVersion(
      {
        id:
          createFoodManualFulfillmentApprovalId(
            suffix,
          ),
        version: 1,
      },
      source.order,
      source.fulfillment,
      {
        approvedAdditionalFee:
          money(feeMinorUnits),
        attribution:
          "fixture:owner-review",
        sourceReference:
          `fixture:approval:${suffix}`,
        approvedOn:
          "2026-10-13",
      },
    );

  const authorized =
    deriveFoodAuthorizedFulfillmentChargeCandidate(
      policy,
      approval,
      source.order,
      source.fulfillment,
    );

  const adjustment =
    projectFoodAuthorizedFulfillmentChargeToPayableAdjustment(
      authorized,
    );

  return {
    ...source,
    policy,
    approval,
    authorized,
    adjustment,
  };
}

function assessmentMetadata(
  suffix = "synthetic-q",
) {
  return {
    attribution:
      "fixture:trusted-assessor",
    sourceReference:
      `fixture:assessment:${suffix}`,
    assessedOn:
      "2026-10-13",
  };
}

function assessmentWith(
  value:
    ReturnType<typeof authority>,
  adjustment:
    AdjustmentInput,
  suffix:
    string,
) {
  return createInitialFoodPayableAssessmentVersion(
    {
      id:
        createFoodPayableAssessmentId(
          suffix,
        ),
      version: 1,
    },
    value.order,
    [adjustment],
    assessmentMetadata(
      suffix,
    ),
  );
}

test(
  "proves exact FOOD-005P adjustment inclusion in one exact FOOD-005J assessment",
  () => {
    const value =
      authority();

    const assessment =
      assessmentWith(
        value,
        value.adjustment,
        "exact-q",
      );

    const inclusion =
      d.validateFoodAuthorizedFulfillmentChargeAssessmentInclusion(
        value.authorized,
        assessment,
        value.order,
      );

    assert.equal(
      inclusion.kind,
      "authorized-fulfillment-charge-assessment-inclusion",
    );

    assert.deepEqual(
      inclusion.order,
      {
        id: value.order.id,
        version:
          value.order.version,
      },
    );

    assert.deepEqual(
      inclusion.payableAssessment,
      {
        id: assessment.id,
        version:
          assessment.version,
      },
    );

    assert.deepEqual(
      inclusion.adjustment,
      value.adjustment,
    );

    assert.ok(
      Object.isFrozen(
        inclusion,
      ),
    );

    assert.ok(
      Object.isFrozen(
        inclusion.order,
      ),
    );

    assert.ok(
      Object.isFrozen(
        inclusion.payableAssessment,
      ),
    );

    assert.ok(
      Object.isFrozen(
        inclusion.adjustment,
      ),
    );

    assert.ok(
      Object.isFrozen(
        inclusion.adjustment.money,
      ),
    );
  },
);

test(
  "missing exact authorized adjustment fails closed",
  () => {
    const value =
      authority(
        "missing-q",
      );

    const assessment =
      createInitialFoodPayableAssessmentVersion(
        {
          id:
            createFoodPayableAssessmentId(
              "missing-q",
            ),
          version: 1,
        },
        value.order,
        [],
        assessmentMetadata(
          "missing-q",
        ),
      );

    assert.throws(() =>
      d.validateFoodAuthorizedFulfillmentChargeAssessmentInclusion(
        value.authorized,
        assessment,
        value.order,
      ),
    );
  },
);

test(
  "direction reference sourceReference currency and minorUnits must all match exactly",
  () => {
    const value =
      authority(
        "fields-q",
        500,
      );

    const wrongAdjustments:
      AdjustmentInput[] = [
        {
          ...value.adjustment,
          direction:
            "credit",
        },
        {
          ...value.adjustment,
          reference:
            "fixture:wrong-reference",
        },
        {
          ...value.adjustment,
          sourceReference:
            "fixture:wrong-source",
        },
        {
          ...value.adjustment,
          money: money(
            501,
          ),
        },
        {
          ...value.adjustment,
          money: money(
            500,
            "EUR",
          ),
        },
      ];

    for (
      let index = 0;
      index <
      wrongAdjustments.length;
      index += 1
    ) {
      const adjustment =
        wrongAdjustments[index];

      if (!adjustment) {
        throw new Error(
          "Synthetic adjustment fixture missing",
        );
      }

      let assessment: unknown;

      try {
        assessment =
          assessmentWith(
            value,
            adjustment,
            `fields-q-${index}`,
          );
      }
      catch {
        /*
         * Some malformed variants may already be rejected by FOOD-005J,
         * which is also a valid fail-closed outcome.
         */
        continue;
      }

      assert.throws(() =>
        d.validateFoodAuthorizedFulfillmentChargeAssessmentInclusion(
          value.authorized,
          assessment,
          value.order,
        ),
      );
    }
  },
);

test(
  "assessment and candidate must bind the same exact FOOD-005E order version",
  () => {
    const expected =
      authority(
        "order-a-q",
      );

    const other =
      authority(
        "order-b-q",
      );

    const assessment =
      assessmentWith(
        other,
        other.adjustment,
        "order-b-assessment-q",
      );

    assert.throws(() =>
      d.validateFoodAuthorizedFulfillmentChargeAssessmentInclusion(
        expected.authorized,
        assessment,
        expected.order,
      ),
    );

    assert.throws(() =>
      d.validateFoodAuthorizedFulfillmentChargeAssessmentInclusion(
        expected.authorized,
        assessmentWith(
          expected,
          expected.adjustment,
          "order-a-assessment-q",
        ),
        other.order,
      ),
    );
  },
);

test(
  "zero approved fee still requires the exact explicit zero FOOD-005P adjustment",
  () => {
    const value =
      authority(
        "zero-q",
        0,
      );

    const assessment =
      assessmentWith(
        value,
        value.adjustment,
        "zero-q",
      );

    const inclusion =
      d.validateFoodAuthorizedFulfillmentChargeAssessmentInclusion(
        value.authorized,
        assessment,
        value.order,
      );

    assert.deepEqual(
      inclusion.adjustment.money,
      money(0),
    );

    const missing =
      createInitialFoodPayableAssessmentVersion(
        {
          id:
            createFoodPayableAssessmentId(
              "zero-missing-q",
            ),
          version: 1,
        },
        value.order,
        [],
        assessmentMetadata(
          "zero-missing-q",
        ),
      );

    assert.throws(() =>
      d.validateFoodAuthorizedFulfillmentChargeAssessmentInclusion(
        value.authorized,
        missing,
        value.order,
      ),
    );
  },
);

test(
  "forged duplicate matching adjustments fail closed",
  () => {
    const value =
      authority(
        "duplicate-q",
      );

    const assessment =
      assessmentWith(
        value,
        value.adjustment,
        "duplicate-q",
      );

    const forged = {
      ...assessment,
      adjustments: [
        assessment.adjustments[0],
        assessment.adjustments[0],
      ],
    };

    assert.throws(() =>
      d.validateFoodAuthorizedFulfillmentChargeAssessmentInclusion(
        value.authorized,
        forged,
        value.order,
      ),
    );
  },
);

test(
  "inclusion evidence grants no currentness readiness payment inventory fulfillment sale accounting or rewards authority",
  () => {
    const value =
      authority(
        "authority-q",
      );

    const assessment =
      assessmentWith(
        value,
        value.adjustment,
        "authority-q",
      );

    const inclusion =
      d.validateFoodAuthorizedFulfillmentChargeAssessmentInclusion(
        value.authorized,
        assessment,
        value.order,
      );

    for (const key of [
      "current",
      "latest",
      "selected",
      "usable",
      "amountDue",
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
        key in inclusion,
        false,
      );
    }
  },
);

test(
  "source remains a pure exact inclusion validator with no assessment mutation selection persistence provider or operational effects",
  () => {
    const source = readFileSync(
      new URL(
        "./authorized-fulfillment-charge-assessment-inclusion.ts",
        import.meta.url,
      ),
      "utf8",
    );

    assert.doesNotMatch(
      source,
      /Date\.now|new Date|process\.env|fetch\s*\(|Math\.random|D1Database|database|repository|INSERT|UPDATE|DELETE|Stripe|Square|PayPal|webhook|createInitialFoodPayable|reviseFoodPayable|latest|current|checkoutReady\s*:|paymentReady\s*:|paymentLink\s*:|paymentStatus\s*:|paidInFull\s*:|quantityOnHand\s*:|reservedQuantity\s*:|dispatchReady\s*:|completedSale\s*:|revenue\s*:|ledger\s*:/i,
    );
  },
);
