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
  cancelFoodPhysicalOrderVersion,
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

import * as d from "./authorized-fulfillment-charge-candidate";

const money = (
  minorUnits = 1200,
  currency = "USD",
) => ({
  currency,
  minorUnits,
});

function sources(
  suffix = "synthetic-o",
) {
  const packageDefinition =
    validateFoodPackageDefinitionVersion({
      id:
        createFoodPackageDefinitionId(
          suffix,
        ),
      version: 1,
      descriptor: "Synthetic package",
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
            "fixture:synthetic",
          sourceReference:
            "fixture:price",
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
        method: "personal-delivery",
        locationReference:
          "fixture:approved-trip-location",
        windowReference:
          "fixture:approved-trip-window",
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
    reservation,
    order,
  };
}

function policyFor(
  source: ReturnType<typeof sources>,
  suffix: string,
  requirement:
    | "required"
    | "not-required" =
      "required",
) {
  return createInitialFoodFulfillmentPolicyDecisionVersion(
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
        requirement,
      attribution:
        "fixture:trusted-policy",
      policyReference:
        "fixture:policy-reference",
      decidedOn:
        "2026-10-13",
    },
  );
}

function approvalFor(
  source: ReturnType<typeof sources>,
  suffix: string,
  feeMinorUnits = 500,
) {
  return createInitialFoodManualFulfillmentApprovalVersion(
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
        "fixture:manual-approval",
      approvedOn:
        "2026-10-13",
    },
  );
}

function bundle(
  suffix = "synthetic-o",
  feeMinorUnits = 500,
) {
  const source = sources(suffix);

  const policy =
    policyFor(
      source,
      suffix,
    );

  const approval =
    approvalFor(
      source,
      suffix,
      feeMinorUnits,
    );

  return {
    ...source,
    policy,
    approval,
  };
}

test(
  "derives exact immutable authorized fulfillment charge candidate from required policy and positive approval",
  () => {
    const value =
      bundle();

    const candidate =
      d.deriveFoodAuthorizedFulfillmentChargeCandidate(
        value.policy,
        value.approval,
        value.order,
        value.fulfillment,
      );

    assert.equal(
      candidate.kind,
      "manual-fulfillment-approved-fee",
    );

    assert.deepEqual(
      candidate.order,
      {
        id: value.order.id,
        version: value.order.version,
      },
    );

    assert.deepEqual(
      candidate.fulfillmentIntent,
      {
        id: value.fulfillment.id,
        version:
          value.fulfillment.version,
        method:
          value.fulfillment.method,
        locationReference:
          value.fulfillment
            .locationReference,
        windowReference:
          value.fulfillment
            .windowReference,
      },
    );

    assert.deepEqual(
      candidate.money,
      money(500),
    );

    assert.ok(Object.isFrozen(candidate));
    assert.ok(
      Object.isFrozen(candidate.order),
    );
    assert.ok(
      Object.isFrozen(
        candidate.fulfillmentIntent,
      ),
    );
    assert.ok(
      Object.isFrozen(
        candidate.policyDecision,
      ),
    );
    assert.ok(
      Object.isFrozen(
        candidate.manualApproval,
      ),
    );
    assert.ok(
      Object.isFrozen(candidate.money),
    );
  },
);

test(
  "not-required policy cannot create manual fulfillment charge authority",
  () => {
    const source =
      sources("not-required");

    const policy =
      policyFor(
        source,
        "not-required",
        "not-required",
      );

    const approval =
      approvalFor(
        source,
        "not-required",
      );

    assert.throws(
      () =>
        d.deriveFoodAuthorizedFulfillmentChargeCandidate(
          policy,
          approval,
          source.order,
          source.fulfillment,
        ),
      /requires manual approval policy/,
    );
  },
);

test(
  "cancelled exact order cannot create a new authorized charge candidate",
  () => {
    const source =
      sources("cancelled-o");

    const cancelled =
      cancelFoodPhysicalOrderVersion(
        source.order,
        {
          id: source.order.id,
          version: 2,
        },
      );

    const policy =
      createInitialFoodFulfillmentPolicyDecisionVersion(
        {
          id:
            createFoodFulfillmentPolicyDecisionId(
              "cancelled-o",
            ),
          version: 1,
        },
        cancelled,
        source.fulfillment,
        {
          manualApprovalRequirement:
            "required",
          attribution:
            "fixture:trusted-policy",
          policyReference:
            "fixture:historical",
          decidedOn:
            "2026-10-13",
        },
      );

    const approval =
      createInitialFoodManualFulfillmentApprovalVersion(
        {
          id:
            createFoodManualFulfillmentApprovalId(
              "cancelled-o",
            ),
          version: 1,
        },
        cancelled,
        source.fulfillment,
        {
          approvedAdditionalFee:
            money(500),
          attribution:
            "fixture:owner-review",
          sourceReference:
            "fixture:historical",
          approvedOn:
            "2026-10-13",
        },
      );

    assert.throws(
      () =>
        d.deriveFoodAuthorizedFulfillmentChargeCandidate(
          policy,
          approval,
          cancelled,
          source.fulfillment,
        ),
      /requires requested physical order/,
    );
  },
);

test(
  "exact source mismatch or snapshot drift fails closed",
  () => {
    const a =
      bundle("source-a");

    const b =
      bundle("source-b");

    assert.throws(() =>
      d.deriveFoodAuthorizedFulfillmentChargeCandidate(
        a.policy,
        a.approval,
        b.order,
        a.fulfillment,
      ),
    );

    assert.throws(() =>
      d.deriveFoodAuthorizedFulfillmentChargeCandidate(
        a.policy,
        b.approval,
        a.order,
        a.fulfillment,
      ),
    );

    assert.throws(() =>
      d.deriveFoodAuthorizedFulfillmentChargeCandidate(
        a.policy,
        a.approval,
        a.order,
        b.fulfillment,
      ),
    );
  },
);

test(
  "candidate preserves exact zero or positive approved fee and both policy and approval provenance",
  () => {
    const value =
      bundle(
        "zero-o",
        0,
      );

    const candidate =
      d.deriveFoodAuthorizedFulfillmentChargeCandidate(
        value.policy,
        value.approval,
        value.order,
        value.fulfillment,
      );

    assert.deepEqual(
      candidate.money,
      money(0),
    );

    assert.deepEqual(
      candidate.policyDecision,
      {
        id: value.policy.id,
        version:
          value.policy.version,
        attribution:
          "fixture:trusted-policy",
        policyReference:
          "fixture:policy-reference",
        decidedOn:
          "2026-10-13",
      },
    );

    assert.deepEqual(
      candidate.manualApproval,
      {
        id: value.approval.id,
        version:
          value.approval.version,
        attribution:
          "fixture:owner-review",
        sourceReference:
          "fixture:manual-approval",
        approvedOn:
          "2026-10-13",
      },
    );
  },
);

test(
  "strict upstream validation rejects forged policy or approval fields",
  () => {
    const value =
      bundle("strict-o");

    assert.throws(() =>
      d.deriveFoodAuthorizedFulfillmentChargeCandidate(
        {
          ...value.policy,
          checkoutReady: true,
        },
        value.approval,
        value.order,
        value.fulfillment,
      ),
    );

    assert.throws(() =>
      d.deriveFoodAuthorizedFulfillmentChargeCandidate(
        value.policy,
        {
          ...value.approval,
          amountDue: money(999),
        },
        value.order,
        value.fulfillment,
      ),
    );
  },
);

test(
  "candidate cannot smuggle payable assessment inclusion checkout payment inventory fulfillment sale accounting or rewards authority",
  () => {
    const value =
      bundle("authority-o");

    const candidate =
      d.deriveFoodAuthorizedFulfillmentChargeCandidate(
        value.policy,
        value.approval,
        value.order,
        value.fulfillment,
      );

    for (const key of [
      "payableAssessment",
      "assessmentId",
      "assessmentVersion",
      "includedInAssessment",
      "chargeAdjustment",
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
        key in candidate,
        false,
      );
    }
  },
);

test(
  "source stays pure and does not depend on FOOD-005J persistence providers payment or operational effects",
  () => {
    const source = readFileSync(
      new URL(
        "./authorized-fulfillment-charge-candidate.ts",
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
