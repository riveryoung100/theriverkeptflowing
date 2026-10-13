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
  cancelFoodPhysicalOrderVersion,
  createInitialFoodPhysicalOrderVersion,
} from "./physical-order-domain";

import * as d from "./cash-payment-evidence-domain";

const money = (minorUnits = 1200) => ({
  currency: "USD",
  minorUnits,
});

function physicalOrder() {
  const packageDefinition = validateFoodPackageDefinitionVersion({
    id: createFoodPackageDefinitionId("synthetic-i"),
    version: 1,
    descriptor: "Synthetic package",
  });

  const sku = validateFoodSkuVersion(
    {
      id: createFoodSkuId("synthetic-i"),
      version: 1,
      servingOffer: {
        offerId: "food-serving-offer:synthetic-i" as never,
        version: 1,
      },
      package: {
        id: packageDefinition.id,
        version: packageDefinition.version,
      },
    },
  );

  const price = createInitialFoodApprovedCommercialPrice(
    {
      id: createFoodApprovedCommercialPriceId("synthetic-i"),
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
    id: createFoodCartId("synthetic-i"),
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

  const quote = createInitialFoodMerchandiseQuoteVersion(
    {
      id: createFoodMerchandiseQuoteId("synthetic-i"),
      version: 1,
    },
    cart,
    [sku],
    [price],
  );

  const fulfillment = createInitialFoodFulfillmentIntentVersion(
    {
      id: "food-fulfillment-intent:synthetic-i",
      version: 1,
    },
    quote,
    {
      method: "meetup",
      locationReference: "fixture:location",
      windowReference: "fixture:window",
    },
  );

  const reservation = createInitialFoodReservationRequestVersion(
    {
      id: "food-reservation-request:synthetic-i",
      version: 1,
    },
    quote,
    fulfillment,
  );

  return createInitialFoodPhysicalOrderVersion(
    {
      id: createFoodPhysicalOrderId("synthetic-i"),
      version: 1,
    },
    quote,
    fulfillment,
    reservation,
  );
}

function evidenceInput(
  receivedAmount = money(2400),
) {
  return {
    channel: "cash" as const,
    cashReceiptReference: "cash-receipt:synthetic",
    confirmationSourceReference: "fixture:manual-cash-confirmation",
    receivedAmount,
  };
}

test(
  "exact order-bound cash payment evidence is immutable evidence only",
  () => {
    const order = physicalOrder();

    const evidence =
      d.createInitialFoodCashPaymentEvidenceVersion(
        {
          id: d.createFoodCashPaymentEvidenceId("synthetic"),
          version: 1,
        },
        order,
        evidenceInput(),
      );

    assert.equal(evidence.order.id, order.id);
    assert.equal(evidence.order.version, order.version);
    assert.deepEqual(
      evidence.order.merchandiseSubtotal,
      order.merchandiseSubtotal,
    );

    assert.equal(evidence.evidence.channel, "cash");
    assert.equal(
      evidence.evidence.cashReceiptReference,
      "cash-receipt:synthetic",
    );

    assert.ok(Object.isFrozen(evidence));
    assert.ok(Object.isFrozen(evidence.order));
    assert.ok(Object.isFrozen(evidence.order.merchandiseSubtotal));
    assert.ok(Object.isFrozen(evidence.evidence));
    assert.ok(Object.isFrozen(evidence.evidence.receivedAmount));
  },
);

test(
  "cash received amount deliberately need not equal merchandise subtotal",
  () => {
    const order = physicalOrder();

    const evidence =
      d.createInitialFoodCashPaymentEvidenceVersion(
        {
          id: d.createFoodCashPaymentEvidenceId("different-amount"),
          version: 1,
        },
        order,
        evidenceInput(money(2500)),
      );

    assert.notDeepEqual(
      evidence.evidence.receivedAmount,
      evidence.order.merchandiseSubtotal,
    );

    assert.equal("paidInFull" in evidence, false);
    assert.equal("completedSale" in evidence, false);
    assert.equal("amountDue" in evidence, false);
    assert.equal("grandTotal" in evidence, false);
  },
);

test(
  "exact order identity version and subtotal snapshot cannot drift",
  () => {
    const order = physicalOrder();

    const evidence =
      d.createInitialFoodCashPaymentEvidenceVersion(
        {
          id: d.createFoodCashPaymentEvidenceId("binding"),
          version: 1,
        },
        order,
        evidenceInput(),
      );

    assert.throws(() =>
      d.validateFoodCashPaymentEvidenceAgainstOrder(
        {
          ...evidence,
          order: {
            ...evidence.order,
            version: evidence.order.version + 1,
          },
        },
        order,
      ),
    );

    assert.throws(() =>
      d.validateFoodCashPaymentEvidenceAgainstOrder(
        {
          ...evidence,
          order: {
            ...evidence.order,
            merchandiseSubtotal: money(999),
          },
        },
        order,
      ),
    );
  },
);

test(
  "cash evidence cannot smuggle sale accounting fulfillment inventory or rewards authority",
  () => {
    const order = physicalOrder();

    const base = {
      id: d.createFoodCashPaymentEvidenceId("authority"),
      version: 1,
      order: {
        id: order.id,
        version: order.version,
        merchandiseSubtotal: order.merchandiseSubtotal,
      },
      evidence: evidenceInput(),
    };

    for (const key of [
      "paidInFull",
      "completedSale",
      "revenue",
      "tax",
      "discount",
      "deliveryFee",
      "tip",
      "grandTotal",
      "amountDue",
      "changeDue",
      "cashTendered",
      "deposit",
      "bankDeposit",
      "accounting",
      "ledger",
      "inventory",
      "fulfilled",
      "dispatchReady",
      "handedOver",
      "verifiedPurchase",
      "rewardsEligible",
    ]) {
      assert.throws(() =>
        d.validateFoodCashPaymentEvidenceVersion({
          ...base,
          [key]: true,
        }),
      );
    }
  },
);

test(
  "cash evidence remains distinct from electronic processor semantics",
  () => {
    const order = physicalOrder();

    const base = {
      id: d.createFoodCashPaymentEvidenceId("channel"),
      version: 1,
      order: {
        id: order.id,
        version: order.version,
        merchandiseSubtotal: order.merchandiseSubtotal,
      },
      evidence: evidenceInput(),
    };

    assert.throws(() =>
      d.validateFoodCashPaymentEvidenceVersion({
        ...base,
        evidence: {
          ...base.evidence,
          channel: "electronic-processor",
        },
      }),
    );

    for (const key of [
      "processor",
      "processorPaymentReference",
      "authorizationReference",
      "settlementId",
      "refundId",
      "chargebackId",
    ]) {
      assert.throws(() =>
        d.validateFoodCashPaymentEvidenceVersion({
          ...base,
          evidence: {
            ...base.evidence,
            [key]: "fixture:value",
          },
        }),
      );
    }
  },
);

test(
  "late cash evidence may bind cancelled exact order version without reviving it",
  () => {
    const requested = physicalOrder();
    const cancelled = cancelFoodPhysicalOrderVersion(
      requested,
      {
        id: requested.id,
        version: 2,
      },
    );

    const evidence =
      d.createInitialFoodCashPaymentEvidenceVersion(
        {
          id: d.createFoodCashPaymentEvidenceId("cancelled"),
          version: 1,
        },
        cancelled,
        evidenceInput(),
      );

    assert.equal(evidence.order.id, cancelled.id);
    assert.equal(evidence.order.version, 2);
    assert.equal(cancelled.state, "cancelled");
    assert.equal("state" in evidence, false);
    assert.equal("dispatchReady" in evidence, false);
  },
);

test(
  "initial cash evidence requires version one and strict canonical evidence",
  () => {
    const order = physicalOrder();

    assert.throws(() =>
      d.createInitialFoodCashPaymentEvidenceVersion(
        {
          id: d.createFoodCashPaymentEvidenceId("bad-version"),
          version: 2,
        },
        order,
        evidenceInput(),
      ),
    );

    assert.throws(() =>
      d.createFoodCashPaymentEvidenceId("bad:id"),
    );

    assert.throws(() =>
      d.createInitialFoodCashPaymentEvidenceVersion(
        {
          id: d.createFoodCashPaymentEvidenceId("blank-ref"),
          version: 1,
        },
        order,
        {
          ...evidenceInput(),
          cashReceiptReference: " ",
        },
      ),
    );

    assert.throws(() =>
      d.createInitialFoodCashPaymentEvidenceVersion(
        {
          id: d.createFoodCashPaymentEvidenceId("bad-money"),
          version: 1,
        },
        order,
        {
          ...evidenceInput(),
          receivedAmount: {
            currency: "usd",
            minorUnits: 100,
          },
        },
      ),
    );
  },
);

test(
  "source contains no POS accounting persistence provider clock or paid-order side effects",
  () => {
    const source = readFileSync(
      new URL("./cash-payment-evidence-domain.ts", import.meta.url),
      "utf8",
    );

    assert.doesNotMatch(
      source,
      /Date\.now|new Date|process\.env|fetch\s*\(|Math\.random|D1Database|database|repository|INSERT|UPDATE|DELETE|Stripe|Square|PayPal|cardNumber|cvc|cvv|webhook|paidInFull\s*:|completedSale\s*:|dispatchReady\s*:|rewardsEligible\s*:/i,
    );
  },
);
