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

import * as d from "./payable-assessment-domain";

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
      id: createFoodPackageDefinitionId("synthetic-j"),
      version: 1,
      descriptor: "Synthetic package",
    });

  const sku = validateFoodSkuVersion({
    id: createFoodSkuId("synthetic-j"),
    version: 1,
    servingOffer: {
      offerId: "food-serving-offer:synthetic-j" as never,
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
          "synthetic-j",
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
    id: createFoodCartId("synthetic-j"),
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
          "synthetic-j",
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
        id: "food-fulfillment-intent:synthetic-j",
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
        id: "food-reservation-request:synthetic-j",
        version: 1,
      },
      quote,
      fulfillment,
    );

  return createInitialFoodPhysicalOrderVersion(
    {
      id: createFoodPhysicalOrderId("synthetic-j"),
      version: 1,
    },
    quote,
    fulfillment,
    reservation,
  );
}

const metadata = (
  sourceReference = "fixture:assessment",
) => ({
  attribution: "fixture:trusted-assessor",
  sourceReference,
  assessedOn: "2026-10-13",
});

test(
  "initial assessment binds exact order and derives unchanged subtotal when adjustments are empty",
  () => {
    const order = physicalOrder();

    const value =
      d.createInitialFoodPayableAssessmentVersion(
        {
          id: d.createFoodPayableAssessmentId(
            "synthetic",
          ),
          version: 1,
        },
        order,
        [],
        metadata(),
      );

    assert.equal(value.order.id, order.id);
    assert.equal(value.order.version, order.version);

    assert.deepEqual(
      value.order.merchandiseSubtotal,
      order.merchandiseSubtotal,
    );

    assert.deepEqual(value.amountDue, {
      currency: "USD",
      minorUnits: 2400,
    });

    assert.deepEqual(value.adjustments, []);

    assert.ok(Object.isFrozen(value));
    assert.ok(Object.isFrozen(value.order));
    assert.ok(Object.isFrozen(value.adjustments));
    assert.ok(Object.isFrozen(value.amountDue));
    assert.ok(Object.isFrozen(value.assessment));
  },
);

test(
  "explicit charges and credits derive exact nonnegative amount due",
  () => {
    const order = physicalOrder();

    const value =
      d.createInitialFoodPayableAssessmentVersion(
        {
          id: d.createFoodPayableAssessmentId(
            "arithmetic",
          ),
          version: 1,
        },
        order,
        [
          {
            direction: "charge",
            reference: "fixture:charge:delivery",
            money: money(500),
            sourceReference:
              "fixture:delivery-policy-output",
          },
          {
            direction: "charge",
            reference: "fixture:charge:tax",
            money: money(200),
            sourceReference:
              "fixture:tax-policy-output",
          },
          {
            direction: "credit",
            reference: "fixture:credit:manual",
            money: money(300),
            sourceReference:
              "fixture:credit-policy-output",
          },
        ],
        metadata(),
      );

    assert.deepEqual(value.amountDue, {
      currency: "USD",
      minorUnits: 2800,
    });

    assert.equal(value.adjustments.length, 3);

    assert.equal(
      value.adjustments[0]?.direction,
      "charge",
    );

    assert.equal(
      value.adjustments[2]?.direction,
      "credit",
    );
  },
);

test(
  "amountDue is derived and structural validation rejects forged arithmetic",
  () => {
    const order = physicalOrder();

    const value =
      d.createInitialFoodPayableAssessmentVersion(
        {
          id: d.createFoodPayableAssessmentId(
            "derived",
          ),
          version: 1,
        },
        order,
        [
          {
            direction: "charge",
            reference: "fixture:charge",
            money: money(100),
            sourceReference: "fixture:source",
          },
        ],
        metadata(),
      );

    assert.throws(() =>
      d.validateFoodPayableAssessmentVersion({
        ...value,
        amountDue: money(
          value.amountDue.minorUnits + 1,
        ),
      }),
    );

    assert.deepEqual(value.amountDue, {
      currency: "USD",
      minorUnits: 2500,
    });
  },
);

test(
  "adjustments require exact currency unique references and safe nonnegative arithmetic",
  () => {
    const order = physicalOrder();

    const base = {
      id: d.createFoodPayableAssessmentId(
        "invalid-adjustment",
      ),
      version: 1,
    };

    assert.throws(() =>
      d.createInitialFoodPayableAssessmentVersion(
        base,
        order,
        [
          {
            direction: "charge",
            reference: "fixture:mixed",
            money: money(10, "EUR"),
            sourceReference: "fixture:source",
          },
        ],
        metadata(),
      ),
    );

    assert.throws(() =>
      d.createInitialFoodPayableAssessmentVersion(
        base,
        order,
        [
          {
            direction: "charge",
            reference: "fixture:duplicate",
            money: money(10),
            sourceReference: "fixture:a",
          },
          {
            direction: "credit",
            reference: "fixture:duplicate",
            money: money(5),
            sourceReference: "fixture:b",
          },
        ],
        metadata(),
      ),
    );

    assert.throws(() =>
      d.createInitialFoodPayableAssessmentVersion(
        base,
        order,
        [
          {
            direction: "charge",
            reference: "fixture:overflow",
            money: money(
              Number.MAX_SAFE_INTEGER,
            ),
            sourceReference: "fixture:source",
          },
        ],
        metadata(),
      ),
    );

    assert.throws(() =>
      d.createInitialFoodPayableAssessmentVersion(
        base,
        order,
        [
          {
            direction: "credit",
            reference: "fixture:negative-due",
            money: money(2401),
            sourceReference: "fixture:source",
          },
        ],
        metadata(),
      ),
    );
  },
);

test(
  "exact order identity version and subtotal cannot drift",
  () => {
    const order = physicalOrder();

    const value =
      d.createInitialFoodPayableAssessmentVersion(
        {
          id: d.createFoodPayableAssessmentId(
            "binding",
          ),
          version: 1,
        },
        order,
        [],
        metadata(),
      );

    assert.throws(() =>
      d.validateFoodPayableAssessmentAgainstOrder(
        {
          ...value,
          order: {
            ...value.order,
            version: value.order.version + 1,
          },
        },
        order,
      ),
    );

    assert.throws(() =>
      d.validateFoodPayableAssessmentAgainstOrder(
        {
          ...value,
          order: {
            ...value.order,
            merchandiseSubtotal: money(999),
          },
          amountDue: money(999),
        },
        order,
      ),
    );
  },
);

test(
  "revisions are consecutive retain exact order and preserve historical assessment",
  () => {
    const order = physicalOrder();

    const first =
      d.createInitialFoodPayableAssessmentVersion(
        {
          id: d.createFoodPayableAssessmentId(
            "revision",
          ),
          version: 1,
        },
        order,
        [],
        metadata("fixture:first"),
      );

    const second =
      d.reviseFoodPayableAssessmentVersion(
        first,
        {
          id: first.id,
          version: 2,
        },
        order,
        [
          {
            direction: "charge",
            reference: "fixture:new-charge",
            money: money(400),
            sourceReference: "fixture:new-policy",
          },
        ],
        metadata("fixture:second"),
      );

    assert.equal(first.version, 1);
    assert.equal(first.amountDue.minorUnits, 2400);
    assert.deepEqual(first.adjustments, []);

    assert.equal(second.version, 2);
    assert.equal(second.order.id, first.order.id);
    assert.equal(
      second.order.version,
      first.order.version,
    );
    assert.equal(second.amountDue.minorUnits, 2800);

    assert.throws(() =>
      d.reviseFoodPayableAssessmentVersion(
        first,
        {
          id: first.id,
          version: 3,
        },
        order,
        [],
        metadata(),
      ),
    );

    assert.throws(() =>
      d.reviseFoodPayableAssessmentVersion(
        first,
        {
          id: d.createFoodPayableAssessmentId(
            "different",
          ),
          version: 2,
        },
        order,
        [],
        metadata(),
      ),
    );
  },
);

test(
  "strict records cannot smuggle tax payment fulfillment sale inventory or accounting authority",
  () => {
    const order = physicalOrder();

    const value =
      d.createInitialFoodPayableAssessmentVersion(
        {
          id: d.createFoodPayableAssessmentId(
            "authority",
          ),
          version: 1,
        },
        order,
        [],
        metadata(),
      );

    for (const key of [
      "taxRate",
      "taxable",
      "taxJurisdiction",
      "legallyCompliant",
      "deliveryApproved",
      "checkoutReady",
      "paymentReady",
      "paid",
      "paidInFull",
      "paymentStatus",
      "paymentEvidence",
      "cashReceived",
      "processorConfirmation",
      "fulfilled",
      "dispatchReady",
      "handedOver",
      "completedSale",
      "revenue",
      "inventory",
      "ledger",
      "rewardsEligible",
    ]) {
      assert.throws(() =>
        d.validateFoodPayableAssessmentVersion({
          ...value,
          [key]: true,
        }),
      );
    }
  },
);

test(
  "source contains no tax engine payment evidence provider runtime persistence or fulfillment side effects",
  () => {
    const source = readFileSync(
      new URL(
        "./payable-assessment-domain.ts",
        import.meta.url,
      ),
      "utf8",
    );

    assert.doesNotMatch(
      source,
      /Date\.now|new Date|process\.env|fetch\s*\(|Math\.random|D1Database|Stripe|Square|PayPal|electronic-payment-confirmation-domain|cash-payment-evidence-domain|taxRate|taxJurisdiction|checkoutReady\s*:|paymentReady\s*:|paidInFull\s*:|dispatchReady\s*:|completedSale\s*:|revenue\s*:|inventory\s*:|ledger\s*:/i,
    );
  },
);
