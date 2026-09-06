import assert from "node:assert/strict";
import test from "node:test";

import {
    assertVerifiedPaymentEvent,
    buildCanonicalRiverOrderId,
    normalizeVerifiedPaymentEvent,
    providerIndependentOrderAdapter
} from "./payment-event";

import type {
    VerifiedPaymentEvent
} from "./payment-event";


function createVerifiedPaymentEvent(
    overrides:
        Partial<VerifiedPaymentEvent> = {}
): VerifiedPaymentEvent {

    return {
        verificationState:
            "verified",

        provider:
            "test-payment-provider",

        providerEventId:
            "event-001",

        providerOrderOrSessionId:
            "provider-order-001",

        providerPaymentReference:
            "payment-001",

        customerReference:
            "customer-001",

        deliveryEmail:
            "river@example.com",

        productId:
            "river-life-operating-system",

        productVersion:
            "1.0.0",

        amount:
            4900,

        currency:
            "USD",

        paymentState:
            "paid",

        eventCreatedAt:
            "2026-09-06T18:00:00.000Z",

        paidAt:
            "2026-09-06T18:01:00.000Z",

        ...overrides
    };

}


test(
    "normalizes a verified provider-independent payment event into the canonical RiverOrder contract",
    () => {

        const event =
            createVerifiedPaymentEvent();

        const order =
            normalizeVerifiedPaymentEvent(
                event
            );

        assert.deepEqual(
            order,
            {
                orderId:
                    "order:test-payment-provider:provider-order-001",

                provider:
                    "test-payment-provider",

                providerOrderOrSessionId:
                    "provider-order-001",

                providerPaymentReference:
                    "payment-001",

                customerReference:
                    "customer-001",

                deliveryEmail:
                    "river@example.com",

                productId:
                    "river-life-operating-system",

                productVersion:
                    "1.0.0",

                amount:
                    4900,

                currency:
                    "USD",

                paymentState:
                    "paid",

                createdAt:
                    "2026-09-06T18:00:00.000Z",

                paidAt:
                    "2026-09-06T18:01:00.000Z"
            }
        );

    }
);


test(
    "builds deterministic canonical order identity from provider and provider order identity",
    () => {

        const event =
            createVerifiedPaymentEvent();

        assert.equal(
            buildCanonicalRiverOrderId(
                event
            ),
            "order:test-payment-provider:provider-order-001"
        );

        assert.equal(
            buildCanonicalRiverOrderId(
                event
            ),
            buildCanonicalRiverOrderId(
                {
                    provider:
                        event.provider,

                    providerOrderOrSessionId:
                        event.providerOrderOrSessionId
                }
            )
        );

    }
);


test(
    "keeps provider event identity outside the canonical RiverOrder contract",
    () => {

        const order =
            normalizeVerifiedPaymentEvent(
                createVerifiedPaymentEvent()
            );

        assert.equal(
            Object.prototype.hasOwnProperty.call(
                order,
                "providerEventId"
            ),
            false
        );

        assert.equal(
            Object.prototype.hasOwnProperty.call(
                order,
                "verificationState"
            ),
            false
        );

    }
);


test(
    "preserves canonical payment identity required by persistence duplicate-event protection",
    () => {

        const event =
            createVerifiedPaymentEvent();

        const order =
            providerIndependentOrderAdapter
                .toRiverOrder(
                    event
                );

        assert.equal(
            order.provider,
            event.provider
        );

        assert.equal(
            order.providerOrderOrSessionId,
            event.providerOrderOrSessionId
        );

        assert.equal(
            order.providerPaymentReference,
            event.providerPaymentReference
        );

    }
);


test(
    "does not invent paidAt for a non-paid verified payment event",
    () => {

        const event =
            createVerifiedPaymentEvent({
                paymentState:
                    "pending",

                paidAt:
                    undefined
            });

        const order =
            normalizeVerifiedPaymentEvent(
                event
            );

        assert.equal(
            order.paidAt,
            undefined
        );

        assert.equal(
            Object.prototype.hasOwnProperty.call(
                order,
                "paidAt"
            ),
            false
        );

    }
);


test(
    "requires paidAt when a verified payment event is paid",
    () => {

        assert.throws(
            () =>
                normalizeVerifiedPaymentEvent(
                    createVerifiedPaymentEvent({
                        paymentState:
                            "paid",

                        paidAt:
                            undefined
                    })
                ),
            /paidAt is required when paymentState is paid/
        );

    }
);


test(
    "supports every canonical PaymentState without redefining fulfillment readiness",
    () => {

        const states:
            VerifiedPaymentEvent["paymentState"][] =
            [
                "pending",
                "paid",
                "failed",
                "refunded",
                "disputed",
                "unknown"
            ];

        for (
            const paymentState
            of states
        ) {

            const order =
                normalizeVerifiedPaymentEvent(
                    createVerifiedPaymentEvent({
                        paymentState
                    })
                );

            assert.equal(
                order.paymentState,
                paymentState
            );

        }

    }
);


test(
    "rejects whitespace-padded provider identities before canonical order normalization",
    () => {

        assert.throws(
            () =>
                normalizeVerifiedPaymentEvent(
                    createVerifiedPaymentEvent({
                        provider:
                            " test-payment-provider"
                    })
                ),
            /provider must be a non-empty canonical identity/
        );

        assert.throws(
            () =>
                normalizeVerifiedPaymentEvent(
                    createVerifiedPaymentEvent({
                        providerOrderOrSessionId:
                            "provider-order-001 "
                    })
                ),
            /providerOrderOrSessionId must be a non-empty canonical identity/
        );

        assert.throws(
            () =>
                normalizeVerifiedPaymentEvent(
                    createVerifiedPaymentEvent({
                        providerPaymentReference:
                            ""
                    })
                ),
            /providerPaymentReference must be a non-empty canonical identity/
        );

    }
);


test(
    "rejects invalid amount and timestamp evidence",
    () => {

        assert.throws(
            () =>
                normalizeVerifiedPaymentEvent(
                    createVerifiedPaymentEvent({
                        amount:
                            Number.NaN
                    })
                ),
            /amount must be a finite non-negative number/
        );

        assert.throws(
            () =>
                normalizeVerifiedPaymentEvent(
                    createVerifiedPaymentEvent({
                        eventCreatedAt:
                            "not-a-timestamp"
                    })
                ),
            /eventCreatedAt must be a valid timestamp/
        );

    }
);


test(
    "requires verified payment-event evidence before normalization",
    () => {

        const event =
            createVerifiedPaymentEvent();

        const malformed =
            {
                ...event,
                verificationState:
                    "rejected"
            } as unknown as VerifiedPaymentEvent;

        assert.throws(
            () =>
                assertVerifiedPaymentEvent(
                    malformed
                ),
            /payment event must be verified before normalization/
        );

    }
);
