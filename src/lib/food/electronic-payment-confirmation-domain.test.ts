import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    createInitialFoodCartVersion,
    createInitialFoodMerchandiseQuoteVersion,
} from "./cart-quote-domain";

import {
    createInitialFoodFulfillmentIntentVersion,
    createInitialFoodReservationRequestVersion,
} from "./fulfillment-capacity-reservation-domain";

import {
    cancelFoodPhysicalOrderVersion,
    createInitialFoodPhysicalOrderVersion,
} from "./physical-order-domain";

import {
    createFoodElectronicPaymentConfirmationId,
    createInitialFoodElectronicPaymentConfirmationVersion,
    validateFoodElectronicPaymentConfirmationAgainstOrder,
    validateFoodElectronicPaymentConfirmationVersion,
} from "./electronic-payment-confirmation-domain";

function sku(
    name: string,
    version = 1,
) {
    return {
        id: `food-sku:${name}`,
        version,
        servingOffer: {
            offerId:
                `food-serving-offer:${name}`,
            version: 1,
        },
        package: {
            id:
                `food-package-definition:${name}`,
            version: 1,
        },
    };
}

function approvedPrice(
    name: string,
    skuInput: ReturnType<typeof sku>,
    minorUnits: number,
) {
    return {
        id:
            `food-approved-commercial-price:${name}`,
        version: 1,
        sku: {
            id: skuInput.id,
            version: skuInput.version,
        },
        money: {
            currency: "USD",
            minorUnits,
        },
        approval: {
            attribution: "fixture:owner",
            sourceReference:
                `fixture:price:${name}`,
            approvedOn: "2026-10-13",
        },
    };
}

function physicalOrder(
    name = "005f",
) {
    const a = sku(`${name}-a`);
    const b = sku(`${name}-b`);

    const cart =
        createInitialFoodCartVersion({
            id:
                `food-cart:${name}`,
            version: 1,
            lines: [
                {
                    sku: {
                        id: a.id,
                        version: a.version,
                    },
                    quantity: 2,
                },
                {
                    sku: {
                        id: b.id,
                        version: b.version,
                    },
                    quantity: 3,
                },
            ],
        });

    const quote =
        createInitialFoodMerchandiseQuoteVersion(
            {
                id:
                    `food-merchandise-quote:${name}`,
                version: 1,
            },
            cart,
            [a, b],
            [
                approvedPrice(
                    `${name}-a`,
                    a,
                    1200,
                ),
                approvedPrice(
                    `${name}-b`,
                    b,
                    700,
                ),
            ],
        );

    const fulfillmentIntent =
        createInitialFoodFulfillmentIntentVersion(
            {
                id:
                    `food-fulfillment-intent:${name}`,
                version: 1,
            },
            quote,
            {
                method: "meetup",
                locationReference:
                    `fixture:location:${name}`,
                windowReference:
                    `fixture:window:${name}`,
            },
        );

    const reservationRequest =
        createInitialFoodReservationRequestVersion(
            {
                id:
                    `food-reservation-request:${name}`,
                version: 1,
            },
            quote,
            fulfillmentIntent,
        );

    return createInitialFoodPhysicalOrderVersion(
        {
            id:
                `food-physical-order:${name}`,
            version: 1,
        },
        quote,
        fulfillmentIntent,
        reservationRequest,
    );
}

function confirmationEvidence(
    minorUnits = 4500,
) {
    return {
        channel:
            "electronic-processor",
        processor:
            "fixture-processor",
        processorPaymentReference:
            "fixture:processor-payment:1",
        confirmationSourceReference:
            "fixture:trusted-server-confirmation:1",
        confirmedAmount: {
            currency: "USD",
            minorUnits,
        },
    };
}

test("exact order-bound provider-neutral electronic payment confirmation is immutable evidence only", () => {
    const order =
        physicalOrder("confirmation");

    const confirmation =
        createInitialFoodElectronicPaymentConfirmationVersion(
            {
                id:
                    createFoodElectronicPaymentConfirmationId(
                        "confirmation-1",
                    ),
                version: 1,
            },
            order,
            confirmationEvidence(),
        );

    assert.equal(
        confirmation.order.id,
        order.id,
    );

    assert.equal(
        confirmation.order.version,
        order.version,
    );

    assert.deepEqual(
        confirmation.order
            .merchandiseSubtotal,
        order.merchandiseSubtotal,
    );

    assert.equal(
        confirmation.evidence.channel,
        "electronic-processor",
    );

    assert(Object.isFrozen(confirmation));
    assert(Object.isFrozen(confirmation.order));
    assert(
        Object.isFrozen(
            confirmation.order
                .merchandiseSubtotal,
        ),
    );
    assert(Object.isFrozen(confirmation.evidence));
    assert(
        Object.isFrozen(
            confirmation.evidence
                .confirmedAmount,
        ),
    );

    for (const forbidden of [
        "paid",
        "paidInFull",
        "dispatchReady",
        "settled",
        "refunded",
    ]) {
        assert.equal(
            forbidden in confirmation,
            false,
        );
    }
});

test("confirmed processor amount deliberately need not equal merchandise subtotal", () => {
    const order =
        physicalOrder("different-amount");

    const confirmedAmount =
        order.merchandiseSubtotal
            .minorUnits + 725;

    const confirmation =
        createInitialFoodElectronicPaymentConfirmationVersion(
            {
                id:
                    "food-electronic-payment-confirmation:different-amount",
                version: 1,
            },
            order,
            confirmationEvidence(
                confirmedAmount,
            ),
        );

    assert.notEqual(
        confirmation.evidence
            .confirmedAmount.minorUnits,
        confirmation.order
            .merchandiseSubtotal.minorUnits,
    );

    assert.equal(
        confirmation.evidence
            .confirmedAmount.minorUnits,
        confirmedAmount,
    );

    assert.equal(
        "grandTotal" in confirmation,
        false,
    );

    assert.equal(
        "amountDue" in confirmation,
        false,
    );
});

test("exact order identity version and subtotal snapshot cannot drift", () => {
    const order =
        physicalOrder("exact-order");

    const confirmation =
        createInitialFoodElectronicPaymentConfirmationVersion(
            {
                id:
                    "food-electronic-payment-confirmation:exact-order",
                version: 1,
            },
            order,
            confirmationEvidence(),
        );

    const otherOrder =
        physicalOrder("other-order");

    assert.throws(() =>
        validateFoodElectronicPaymentConfirmationAgainstOrder(
            confirmation,
            otherOrder,
        ),
    );

    assert.throws(() =>
        validateFoodElectronicPaymentConfirmationAgainstOrder(
            {
                ...confirmation,
                order: {
                    ...confirmation.order,
                    version:
                        confirmation.order
                            .version + 1,
                },
            },
            order,
        ),
    );

    assert.throws(() =>
        validateFoodElectronicPaymentConfirmationAgainstOrder(
            {
                ...confirmation,
                order: {
                    ...confirmation.order,
                    merchandiseSubtotal: {
                        currency: "USD",
                        minorUnits:
                            confirmation.order
                                .merchandiseSubtotal
                                .minorUnits + 1,
                    },
                },
            },
            order,
        ),
    );
});

test("browser success authorization settlement refund and dispatch authority cannot be smuggled into confirmation", () => {
    const order =
        physicalOrder("strict");

    const confirmation =
        createInitialFoodElectronicPaymentConfirmationVersion(
            {
                id:
                    "food-electronic-payment-confirmation:strict",
                version: 1,
            },
            order,
            confirmationEvidence(),
        );

    for (const [key, value] of [
        ["browserSuccess", true],
        ["checkoutSuccess", true],
        ["authorized", true],
        ["authorizationReference", "auth"],
        ["paidInFull", true],
        ["settled", true],
        ["refunded", true],
        ["chargeback", true],
        ["dispatchReady", true],
        ["cash", true],
        ["tax", 1],
        ["deliveryFee", 1],
        ["grandTotal", 1],
        ["amountDue", 1],
    ] as const) {
        assert.throws(() =>
            validateFoodElectronicPaymentConfirmationVersion({
                ...confirmation,
                [key]: value,
            }),
        );
    }

    assert.throws(() =>
        validateFoodElectronicPaymentConfirmationVersion({
            ...confirmation,
            evidence: {
                ...confirmation.evidence,
                browserSuccess: true,
            },
        }),
    );
});

test("only electronic processor channel is accepted and processor remains opaque provider-neutral text", () => {
    const order =
        physicalOrder("provider");

    for (const channel of [
        "cash",
        "browser-success",
        "manual-paid",
        "bank-deposit",
        "processor-settlement",
    ]) {
        assert.throws(() =>
            createInitialFoodElectronicPaymentConfirmationVersion(
                {
                    id:
                        `food-electronic-payment-confirmation:${channel}`,
                    version: 1,
                },
                order,
                {
                    ...confirmationEvidence(),
                    channel,
                },
            ),
        );
    }

    const value =
        createInitialFoodElectronicPaymentConfirmationVersion(
            {
                id:
                    "food-electronic-payment-confirmation:opaque-provider",
                version: 1,
            },
            order,
            {
                ...confirmationEvidence(),
                processor:
                    "opaque-provider-key",
            },
        );

    assert.equal(
        value.evidence.processor,
        "opaque-provider-key",
    );
});

test("late confirmation may be recorded against cancelled exact order version without reviving or dispatching it", () => {
    const requested =
        physicalOrder("late");

    const cancelled =
        cancelFoodPhysicalOrderVersion(
            requested,
            {
                id: requested.id,
                version: 2,
            },
        );

    const confirmation =
        createInitialFoodElectronicPaymentConfirmationVersion(
            {
                id:
                    "food-electronic-payment-confirmation:late",
                version: 1,
            },
            cancelled,
            confirmationEvidence(),
        );

    assert.equal(
        confirmation.order.id,
        cancelled.id,
    );

    assert.equal(
        confirmation.order.version,
        2,
    );

    assert.equal(
        cancelled.state,
        "cancelled",
    );

    assert.equal(
        "state" in confirmation,
        false,
    );

    assert.equal(
        "dispatchReady" in confirmation,
        false,
    );
});

test("initial confirmation requires version one and strict canonical evidence", () => {
    const order =
        physicalOrder("version");

    assert.throws(() =>
        createInitialFoodElectronicPaymentConfirmationVersion(
            {
                id:
                    "food-electronic-payment-confirmation:bad-version",
                version: 2,
            },
            order,
            confirmationEvidence(),
        ),
    );

    assert.throws(() =>
        createInitialFoodElectronicPaymentConfirmationVersion(
            {
                id:
                    "food-electronic-payment-confirmation:bad-money",
                version: 1,
            },
            order,
            {
                ...confirmationEvidence(),
                confirmedAmount: {
                    currency: "usd",
                    minorUnits: 100,
                },
            },
        ),
    );

    assert.throws(() =>
        createInitialFoodElectronicPaymentConfirmationVersion(
            {
                id:
                    "food-electronic-payment-confirmation:bad-ref",
                version: 1,
            },
            order,
            {
                ...confirmationEvidence(),
                processorPaymentReference:
                    " ",
            },
        ),
    );
});

test("FOOD-005F has no provider SDK card data browser transport clock persistence or paid-order side effects", async () => {
    const source = await readFile(
        new URL(
            "./electronic-payment-confirmation-domain.ts",
            import.meta.url,
        ),
        "utf8",
    );

    assert.doesNotMatch(
        source,
        /Date\.now|new Date|process\.env|fetch\(|Math\.random|node:fs|D1Database|wrangler|stripe|paypal|square/i,
    );

    assert.doesNotMatch(
        source,
        /cardNumber|card_number|cvc|cvv|paymentMethodSecret|clientSecret|webhookSignature|browserSuccess|checkoutSuccess|paidInFull:|dispatchReady:|refundId:|chargebackId:|settlementId:|cashReceived:/i,
    );
});
