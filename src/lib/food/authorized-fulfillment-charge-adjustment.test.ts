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
  createFoodPayableAssessmentId,
  createInitialFoodPayableAssessmentVersion,
} from "./payable-assessment-domain";

import * as d from "./authorized-fulfillment-charge-adjustment";

const money = (
  minorUnits = 1200,
  currency = "USD",
) => ({
  currency,
  minorUnits,
});

function sources(
  suffix = "synthetic-p",
) {
  const packageDefinition =
    validateFoodPackageDefinitionVersion({
      id:
        createFoodPackageDefinitionId(
          suffix,
        ),
      version: 1,
      descriptor:
        "Synthetic FOOD-005P package",
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
        id: packageDefinition.id,
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
          "fixture:food-005p-location",
        windowReference:
          "fixture:food-005p-window",
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

function candidate(
  suffix = "synthetic-p",
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

  return {
    ...source,
    policy,
    approval,
    authorized,
  };
}

function assessmentMetadata(
  suffix = "synthetic-p",
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

test(
  "projects exact FOOD-005O authority into immutable FOOD-005J charge-adjustment shape",
  () => {
    const value =
      candidate();

    const adjustment =
      d.projectFoodAuthorizedFulfillmentChargeToPayableAdjustment(
        value.authorized,
      );

    assert.deepEqual(
      adjustment,
      {
        direction: "charge",
        reference:
          `${value.approval.id}@v${value.approval.version}`,
        money:
          money(500),
        sourceReference:
          `${value.policy.id}@v${value.policy.version}`,
      },
    );

    assert.deepEqual(
      Object.keys(adjustment).sort(),
      [
        "direction",
        "money",
        "reference",
        "sourceReference",
      ],
    );

    assert.ok(
      Object.isFrozen(adjustment),
    );

    assert.ok(
      Object.isFrozen(
        adjustment.money,
      ),
    );
  },
);

test(
  "reference carries exact manual-approval identity while sourceReference carries exact policy-decision identity",
  () => {
    const value =
      candidate("identity-p");

    const adjustment =
      d.projectFoodAuthorizedFulfillmentChargeToPayableAdjustment(
        value.authorized,
      );

    assert.equal(
      adjustment.reference,
      `${value.authorized.manualApproval.id}@v${value.authorized.manualApproval.version}`,
    );

    assert.equal(
      adjustment.sourceReference,
      `${value.authorized.policyDecision.id}@v${value.authorized.policyDecision.version}`,
    );
  },
);

test(
  "projection copies exact authorized money and performs no repricing or rounding",
  () => {
    const value =
      candidate(
        "money-p",
        537,
      );

    const adjustment =
      d.projectFoodAuthorizedFulfillmentChargeToPayableAdjustment(
        value.authorized,
      );

    assert.deepEqual(
      adjustment.money,
      {
        currency: "USD",
        minorUnits: 537,
      },
    );
  },
);

test(
  "projected adjustment is structurally accepted by FOOD-005J and changes amountDue only through canonical J arithmetic",
  () => {
    const value =
      candidate(
        "j-compatible-p",
        500,
      );

    const adjustment =
      d.projectFoodAuthorizedFulfillmentChargeToPayableAdjustment(
        value.authorized,
      );

    const assessment =
      createInitialFoodPayableAssessmentVersion(
        {
          id:
            createFoodPayableAssessmentId(
              "j-compatible-p",
            ),
          version: 1,
        },
        value.order,
        [adjustment],
        assessmentMetadata(
          "j-compatible-p",
        ),
      );

    assert.equal(
      assessment.adjustments.length,
      1,
    );

    assert.deepEqual(
      assessment.adjustments[0],
      adjustment,
    );

    assert.deepEqual(
      assessment.amountDue,
      money(2900),
    );
  },
);

test(
  "zero approved fee remains one explicit zero charge adjustment and FOOD-005J keeps subtotal unchanged",
  () => {
    const value =
      candidate(
        "zero-p",
        0,
      );

    const adjustment =
      d.projectFoodAuthorizedFulfillmentChargeToPayableAdjustment(
        value.authorized,
      );

    assert.deepEqual(
      adjustment.money,
      money(0),
    );

    const assessment =
      createInitialFoodPayableAssessmentVersion(
        {
          id:
            createFoodPayableAssessmentId(
              "zero-p",
            ),
          version: 1,
        },
        value.order,
        [adjustment],
        assessmentMetadata(
          "zero-p",
        ),
      );

    assert.equal(
      assessment.adjustments.length,
      1,
    );

    assert.deepEqual(
      assessment.amountDue,
      money(2400),
    );
  },
);

test(
  "same fee amount with different exact approval or policy identities yields different canonical adjustment identity",
  () => {
    const a =
      candidate(
        "identity-a-p",
        500,
      );

    const b =
      candidate(
        "identity-b-p",
        500,
      );

    const adjustmentA =
      d.projectFoodAuthorizedFulfillmentChargeToPayableAdjustment(
        a.authorized,
      );

    const adjustmentB =
      d.projectFoodAuthorizedFulfillmentChargeToPayableAdjustment(
        b.authorized,
      );

    assert.deepEqual(
      adjustmentA.money,
      adjustmentB.money,
    );

    assert.notEqual(
      adjustmentA.reference,
      adjustmentB.reference,
    );

    assert.notEqual(
      adjustmentA.sourceReference,
      adjustmentB.sourceReference,
    );
  },
);

test(
  "projection does not claim payable inclusion amountDue readiness payment inventory fulfillment sale accounting or rewards authority",
  () => {
    const value =
      candidate("authority-p");

    const adjustment =
      d.projectFoodAuthorizedFulfillmentChargeToPayableAdjustment(
        value.authorized,
      );

    for (const key of [
      "payableAssessment",
      "assessmentId",
      "assessmentVersion",
      "includedInAssessment",
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
        key in adjustment,
        false,
      );
    }
  },
);

test(
  "source remains a pure projection with no FOOD-005J mutation persistence provider clock or operational effects",
  () => {
    const source = readFileSync(
      new URL(
        "./authorized-fulfillment-charge-adjustment.ts",
        import.meta.url,
      ),
      "utf8",
    );

    assert.doesNotMatch(
      source,
      /Date\.now|new Date|process\.env|fetch\s*\(|Math\.random|D1Database|database|repository|INSERT|UPDATE|DELETE|Stripe|Square|PayPal|webhook|payable-assessment-domain|payment-reconciliation-domain|electronic-payment-confirmation-domain|cash-payment-evidence-domain|amountDue\s*:|checkoutReady\s*:|paymentReady\s*:|paymentLink\s*:|dispatchReady\s*:|completedSale\s*:|revenue\s*:|ledger\s*:/i,
    );
  },
);
