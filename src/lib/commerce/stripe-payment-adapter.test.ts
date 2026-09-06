import assert from "node:assert/strict";

import test from "node:test";

import {
    normalizeVerifiedPaymentEvent
} from "./payment-event";

import {
    adaptVerifiedStripePaymentEvidence
} from "./stripe-payment-adapter";

import type {
    VerifiedStripePaymentEvidence
} from "./stripe-payment-adapter";


function createVerifiedStripeEvidence(
    overrides:
        Partial<VerifiedStripePaymentEvidence> =
        {}
): VerifiedStripePaymentEvidence {

    return {
        verificationState:
            "verified",

        eventId:
            "evt_river_001",

        checkoutSessionId:
            "cs_river_001",

        paymentIntentId:
            "pi_river_001",

        customerReference:
            "cus_river_001",

        deliveryEmail:
            "river@example.com",

        productId:
            "river-life-operating-system",

        productVersion:
            "v1",

        amount:
            29,

        currency:
            "usd",

        paymentState:
            "paid",

        eventCreatedAt:
            "2026-09-06T20:00:00.000Z",

        paidAt:
            "2026-09-06T20:00:01.000Z",

        ...overrides
    };

}


test(
    "adapts verified Stripe payment evidence into the provider-independent payment-event contract",
    () => {

        const adapted =
            adaptVerifiedStripePaymentEvidence(
                createVerifiedStripeEvidence()
            );

        assert.deepEqual(
            adapted,
            {
                verificationState:
                    "verified",

                provider:
                    "stripe",

                providerEventId:
                    "evt_river_001",

                providerOrderOrSessionId:
                    "cs_river_001",

                providerPaymentReference:
                    "pi_river_001",

                customerReference:
                    "cus_river_001",

                deliveryEmail:
                    "river@example.com",

                productId:
                    "river-life-operating-system",

                productVersion:
                    "v1",

                amount:
                    29,

                currency:
                    "usd",

                paymentState:
                    "paid",

                eventCreatedAt:
                    "2026-09-06T20:00:00.000Z",

                paidAt:
                    "2026-09-06T20:00:01.000Z"
            }
        );

    }
);


test(
    "uses Stripe checkout-session identity as canonical provider order identity",
    () => {

        const adapted =
            adaptVerifiedStripePaymentEvidence(
                createVerifiedStripeEvidence()
            );

        const order =
            normalizeVerifiedPaymentEvent(
                adapted
            );

        assert.equal(
            order.orderId,
            "order:stripe:cs_river_001"
        );

        assert.equal(
            order.providerOrderOrSessionId,
            "cs_river_001"
        );

    }
);


test(
    "uses Stripe payment-intent identity as canonical provider payment reference",
    () => {

        const adapted =
            adaptVerifiedStripePaymentEvidence(
                createVerifiedStripeEvidence()
            );

        const order =
            normalizeVerifiedPaymentEvent(
                adapted
            );

        assert.equal(
            order.providerPaymentReference,
            "pi_river_001"
        );

    }
);


test(
    "preserves Stripe event identity outside the canonical RiverOrder contract",
    () => {

        const adapted =
            adaptVerifiedStripePaymentEvidence(
                createVerifiedStripeEvidence()
            );

        const order =
            normalizeVerifiedPaymentEvent(
                adapted
            );

        assert.equal(
            adapted.providerEventId,
            "evt_river_001"
        );

        assert.equal(
            "providerEventId" in order,
            false
        );

    }
);


test(
    "does not invent paidAt for non-paid Stripe payment evidence",
    () => {

        const adapted =
            adaptVerifiedStripePaymentEvidence(
                createVerifiedStripeEvidence(
                    {
                        paymentState:
                            "pending",

                        paidAt:
                            undefined
                    }
                )
            );

        assert.equal(
            adapted.paymentState,
            "pending"
        );

        assert.equal(
            "paidAt" in adapted,
            false
        );

    }
);


test(
    "requires paidAt when verified Stripe payment evidence is paid",
    () => {

        assert.throws(
            () =>
                adaptVerifiedStripePaymentEvidence(
                    createVerifiedStripeEvidence(
                        {
                            paidAt:
                                undefined
                        }
                    )
                ),
            /paidAt is required when paymentState is paid/
        );

    }
);


test(
    "supports every canonical payment state without redefining fulfillment readiness",
    () => {

        const states =
            [
                "pending",
                "paid",
                "failed",
                "refunded",
                "disputed",
                "unknown"
            ] as const;

        for (
            const paymentState of
            states
        ) {

            const adapted =
                adaptVerifiedStripePaymentEvidence(
                    createVerifiedStripeEvidence(
                        {
                            paymentState,

                            paidAt:
                                paymentState ===
                                "paid"
                                    ? "2026-09-06T20:00:01.000Z"
                                    : undefined
                        }
                    )
                );

            assert.equal(
                adapted.paymentState,
                paymentState
            );

        }

    }
);


test(
    "delegates canonical identity validation to the provider-independent contract",
    () => {

        assert.throws(
            () =>
                adaptVerifiedStripePaymentEvidence(
                    createVerifiedStripeEvidence(
                        {
                            checkoutSessionId:
                                " cs_river_001 "
                        }
                    )
                ),
            /providerOrderOrSessionId must be a non-empty canonical identity/
        );

    }
);


test(
    "delegates amount and timestamp validation to the provider-independent contract",
    () => {

        assert.throws(
            () =>
                adaptVerifiedStripePaymentEvidence(
                    createVerifiedStripeEvidence(
                        {
                            amount:
                                -1
                        }
                    )
                ),
            /amount must be a finite non-negative number/
        );

        assert.throws(
            () =>
                adaptVerifiedStripePaymentEvidence(
                    createVerifiedStripeEvidence(
                        {
                            eventCreatedAt:
                                "not-a-timestamp"
                        }
                    )
                ),
            /eventCreatedAt must be a valid timestamp/
        );

    }
);


test(
    "requires verified Stripe evidence before adaptation",
    () => {

        const malformed =
            {
                ...createVerifiedStripeEvidence(),

                verificationState:
                    "rejected"
            } as unknown as VerifiedStripePaymentEvidence;

        assert.throws(
            () =>
                adaptVerifiedStripePaymentEvidence(
                    malformed
                ),
            /payment event must be verified before normalization/
        );

    }
);
