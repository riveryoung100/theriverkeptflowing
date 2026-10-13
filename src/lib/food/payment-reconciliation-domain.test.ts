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
  createFoodPayableAssessmentId,
  createInitialFoodPayableAssessmentVersion,
  type FoodPayableAssessmentVersion,
} from "./payable-assessment-domain";

import * as d from "./payment-reconciliation-domain";

const money = (
  minorUnits = 1200,
  currency = "USD",
) => ({
  currency,
  minorUnits,
});

function physicalOrder() {
  const packageDefinition =
    validateFoodPackageDefinitionVersion({
      id: createFoodPackageDefinitionId("synthetic-k"),
      version: 1,
      descriptor: "Synthetic package",
    });

  const sku = validateFoodSkuVersion({
    id: createFoodSkuId("synthetic-k"),
    version: 1,
    servingOffer: {
      offerId:
        "food-serving-offer:synthetic-k" as never,
      version: 1,
    },
    package: {
      id: packageDefinition.id,
      version: packageDefinition.version,
    },
  });

  const price =
    createInitialFoodApprovedCommercialPrice(
      {
        id: createFoodApprovedCommercialPriceId(
          "synthetic-k",
        ),
        version: 1,
        sku: {
          id: sku.id,
          version: sku.version,
        },
        money: money(),
        approval: {
          attribution: "fixture:synthetic",
          sourceReference: "fixture:price",
          approvedOn: "2026-10-13",
        },
      },
      sku,
    );

  const cart = createInitialFoodCartVersion({
    id: createFoodCartId("synthetic-k"),
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
        id: createFoodMerchandiseQuoteId(
          "synthetic-k",
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
          "food-fulfillment-intent:synthetic-k",
        version: 1,
      },
      quote,
      {
        method: "meetup",
        locationReference: "fixture:location",
        windowReference: "fixture:window",
      },
    );

  const reservation =
    createInitialFoodReservationRequestVersion(
      {
        id:
          "food-reservation-request:synthetic-k",
        version: 1,
      },
      quote,
      fulfillment,
    );

  return createInitialFoodPhysicalOrderVersion(
    {
      id: createFoodPhysicalOrderId(
        "synthetic-k",
      ),
      version: 1,
    },
    quote,
    fulfillment,
    reservation,
  );
}

function assessment(
  adjustmentMinorUnits = 0,
): FoodPayableAssessmentVersion {
  const order = physicalOrder();

  return createInitialFoodPayableAssessmentVersion(
    {
      id: createFoodPayableAssessmentId(
        `synthetic-k-${adjustmentMinorUnits}`,
      ),
      version: 1,
    },
    order,
    adjustmentMinorUnits === 0
      ? []
      : [
          {
            direction:
              adjustmentMinorUnits > 0
                ? "charge"
                : "credit",
            reference:
              "fixture:assessment-adjustment",
            money: money(
              Math.abs(adjustmentMinorUnits),
            ),
            sourceReference:
              "fixture:assessment-policy",
          },
        ],
    {
      attribution: "fixture:assessor",
      sourceReference: "fixture:assessment",
      assessedOn: "2026-10-13",
    },
  );
}

function evidence(
  assessmentValue: FoodPayableAssessmentVersion,
  minorUnits: number,
  sourceKind:
    | "electronic-confirmation"
    | "cash-evidence" =
      "electronic-confirmation",
  sourceId = "fixture:payment:1",
  sourceVersion = 1,
) {
  return {
    sourceKind,
    sourceId,
    sourceVersion,
    order: {
      id: assessmentValue.order.id,
      version: assessmentValue.order.version,
      merchandiseSubtotal:
        assessmentValue.order.merchandiseSubtotal,
    },
    amount: money(
      minorUnits,
      assessmentValue.amountDue.currency,
    ),
  };
}

test(
  "positive amount due with no evidence is unpaid",
  () => {
    const payable = assessment();

    const result =
      d.deriveFoodPaymentReconciliation(
        payable,
        [],
      );

    assert.equal(result.status, "unpaid");
    assert.equal(result.amountDue.minorUnits, 2400);
    assert.equal(result.evidenceTotal.minorUnits, 0);
    assert.equal(result.remainingBalance.minorUnits, 2400);
    assert.equal(result.overpaymentAmount.minorUnits, 0);

    assert.ok(Object.isFrozen(result));
    assert.ok(Object.isFrozen(result.assessment));
    assert.ok(Object.isFrozen(result.order));
    assert.ok(Object.isFrozen(result.evidence));
  },
);

test(
  "zero amount due is distinct no-payment-due rather than paid-in-full",
  () => {
    const payable = assessment(-2400);

    const result =
      d.deriveFoodPaymentReconciliation(
        payable,
        [],
      );

    assert.equal(result.status, "no-payment-due");
    assert.equal(result.amountDue.minorUnits, 0);
    assert.equal(result.evidenceTotal.minorUnits, 0);
  },
);

test(
  "partial exact and excess evidence derive partial paid-in-full and overpaid statuses",
  () => {
    const payable = assessment();

    const partial =
      d.deriveFoodPaymentReconciliation(
        payable,
        [evidence(payable, 1000)],
      );

    assert.equal(partial.status, "partially-paid");
    assert.equal(partial.evidenceTotal.minorUnits, 1000);
    assert.equal(partial.remainingBalance.minorUnits, 1400);

    const exact =
      d.deriveFoodPaymentReconciliation(
        payable,
        [evidence(payable, 2400)],
      );

    assert.equal(exact.status, "paid-in-full");
    assert.equal(exact.remainingBalance.minorUnits, 0);
    assert.equal(exact.overpaymentAmount.minorUnits, 0);

    const excess =
      d.deriveFoodPaymentReconciliation(
        payable,
        [evidence(payable, 2500)],
      );

    assert.equal(excess.status, "overpaid");
    assert.equal(excess.overpaymentAmount.minorUnits, 100);
  },
);

test(
  "multiple electronic and cash snapshots aggregate without replacing source-family identity",
  () => {
    const payable = assessment();

    const result =
      d.deriveFoodPaymentReconciliation(
        payable,
        [
          evidence(
            payable,
            1000,
            "electronic-confirmation",
            "food-electronic-payment-confirmation:fixture-a",
          ),
          evidence(
            payable,
            1400,
            "cash-evidence",
            "food-cash-payment-evidence:fixture-b",
          ),
        ],
      );

    assert.equal(result.status, "paid-in-full");
    assert.equal(result.evidenceTotal.minorUnits, 2400);

    assert.equal(
      result.evidence[0]?.sourceKind,
      "electronic-confirmation",
    );

    assert.equal(
      result.evidence[1]?.sourceKind,
      "cash-evidence",
    );

    assert.ok(Object.isFrozen(result.evidence[0]));
    assert.ok(Object.isFrozen(result.evidence[1]));
  },
);

test(
  "duplicate source identity order drift subtotal drift and currency drift fail closed",
  () => {
    const payable = assessment();

    const same = evidence(
      payable,
      1000,
      "electronic-confirmation",
      "fixture:duplicate",
    );

    assert.throws(() =>
      d.deriveFoodPaymentReconciliation(
        payable,
        [same, { ...same }],
      ),
    );

    assert.throws(() =>
      d.deriveFoodPaymentReconciliation(
        payable,
        [
          {
            ...same,
            order: {
              ...same.order,
              version: same.order.version + 1,
            },
          },
        ],
      ),
    );

    assert.throws(() =>
      d.deriveFoodPaymentReconciliation(
        payable,
        [
          {
            ...same,
            order: {
              ...same.order,
              merchandiseSubtotal: money(999),
            },
          },
        ],
      ),
    );

    assert.throws(() =>
      d.deriveFoodPaymentReconciliation(
        payable,
        [
          {
            ...same,
            amount: money(1000, "EUR"),
          },
        ],
      ),
    );
  },
);

test(
  "evidence validation is strict bounded and safe-integer aggregation fails closed",
  () => {
    const payable = assessment();
    const valid = evidence(payable, 1);

    assert.throws(() =>
      d.validateFoodNormalizedPaymentEvidence(
        {
          ...valid,
          sourceKind: "card",
        },
        payable,
      ),
    );

    assert.throws(() =>
      d.validateFoodNormalizedPaymentEvidence(
        {
          ...valid,
          sourceVersion: 0,
        },
        payable,
      ),
    );

    assert.throws(() =>
      d.validateFoodNormalizedPaymentEvidence(
        {
          ...valid,
          extra: true,
        },
        payable,
      ),
    );

    assert.throws(() =>
      d.deriveFoodPaymentReconciliation(
        payable,
        [
          evidence(
            payable,
            Number.MAX_SAFE_INTEGER,
            "electronic-confirmation",
            "fixture:max",
          ),
          evidence(
            payable,
            1,
            "cash-evidence",
            "fixture:overflow",
          ),
        ],
      ),
    );
  },
);

test(
  "reconciliation cannot smuggle fulfillment sale accounting refund inventory rewards or checkout authority",
  () => {
    const payable = assessment();

    const result =
      d.deriveFoodPaymentReconciliation(
        payable,
        [evidence(payable, 2400)],
      );

    for (const key of [
      "dispatchReady",
      "fulfilled",
      "handedOver",
      "completedSale",
      "revenue",
      "accounting",
      "ledger",
      "inventory",
      "rewardsEligible",
      "verifiedPurchase",
      "refund",
      "refundDue",
      "changeDue",
      "chargeback",
      "checkoutReady",
      "paymentReady",
      "orderState",
    ]) {
      assert.equal(key in result, false);
    }

    assert.equal(result.status, "paid-in-full");
  },
);

test(
  "source is a pure projection with no persistence provider clock concrete evidence-domain or operational side effects",
  () => {
    const source = readFileSync(
      new URL(
        "./payment-reconciliation-domain.ts",
        import.meta.url,
      ),
      "utf8",
    );

    assert.doesNotMatch(
      source,
      /Date\.now|new Date|process\.env|fetch\s*\(|Math\.random|D1Database|database|repository|INSERT|UPDATE|DELETE|Stripe|Square|PayPal|webhook|electronic-payment-confirmation-domain|cash-payment-evidence-domain|dispatchReady\s*:|fulfilled\s*:|completedSale\s*:|revenue\s*:|ledger\s*:|inventory\s*:|refund\s*:/i,
    );
  },
);
