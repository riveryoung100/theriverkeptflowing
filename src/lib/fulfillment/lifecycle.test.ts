import assert from "node:assert/strict";
import test from "node:test";

import {
    canTransitionDeliveryState,
    canTransitionFulfillmentState,
    evaluateFulfillmentReadiness,
    transitionDeliveryState,
    transitionFulfillmentState
} from "./lifecycle";

import type {
    ProductRelease,
    RiverOrder
} from "./types";


function createOrder(
    overrides:
        Partial<RiverOrder> = {}
): RiverOrder {

    return {

        orderId:
            "order-001",

        provider:
            "test-provider",

        providerOrderOrSessionId:
            "provider-order-001",

        providerPaymentReference:
            "payment-001",

        customerReference:
            "customer-001",

        deliveryEmail:
            "reader@example.com",

        productId:
            "river-life-operating-system",

        productVersion:
            "v1",

        amount:
            2900,

        currency:
            "USD",

        paymentState:
            "paid",

        createdAt:
            "2026-09-03T00:00:00.000Z",

        paidAt:
            "2026-09-03T00:01:00.000Z",

        ...overrides

    };

}


function createRelease(
    overrides:
        Partial<ProductRelease> = {}
): ProductRelease {

    return {

        productId:
            "river-life-operating-system",

        productVersion:
            "v1",

        releaseId:
            "release-001",

        artifactFilename:
            "river-life-operating-system-v1.pdf",

        artifactFormat:
            "PDF",

        artifactByteSize:
            1000,

        artifactSha256:
            "example-sha256",

        createdAt:
            "2026-09-03T00:00:00.000Z",

        releaseStatus:
            "approved",

        ...overrides

    };

}


test(
    "marks a paid matching order and approved release ready for fulfillment",
    () => {

        const result =
            evaluateFulfillmentReadiness({
                order:
                    createOrder(),
                release:
                    createRelease()
            });

        assert.deepEqual(
            result,
            {
                ready:
                    true,
                fulfillmentState:
                    "ready"
            }
        );

    }
);


test(
    "does not authorize fulfillment before payment is paid",
    () => {

        const result =
            evaluateFulfillmentReadiness({
                order:
                    createOrder({
                        paymentState:
                            "pending",
                        paidAt:
                            undefined
                    }),
                release:
                    createRelease()
            });

        assert.deepEqual(
            result,
            {
                ready:
                    false,
                fulfillmentState:
                    "not-ready",
                reason:
                    "order-not-paid"
            }
        );

    }
);


test(
    "does not authorize fulfillment from failed refunded disputed or unknown payment states",
    () => {

        const states =
            [
                "failed",
                "refunded",
                "disputed",
                "unknown"
            ] as const;

        for (const paymentState of states) {

            const result =
                evaluateFulfillmentReadiness({
                    order:
                        createOrder({
                            paymentState,
                            paidAt:
                                undefined
                        }),
                    release:
                        createRelease()
                });

            assert.equal(
                result.ready,
                false
            );

            assert.equal(
                result.reason,
                "order-not-paid"
            );

        }

    }
);


test(
    "requires an approved release",
    () => {

        const result =
            evaluateFulfillmentReadiness({
                order:
                    createOrder(),
                release:
                    createRelease({
                        releaseStatus:
                            "draft"
                    })
            });

        assert.deepEqual(
            result,
            {
                ready:
                    false,
                fulfillmentState:
                    "not-ready",
                reason:
                    "release-not-approved"
            }
        );

    }
);


test(
    "rejects product identity mismatch",
    () => {

        const result =
            evaluateFulfillmentReadiness({
                order:
                    createOrder(),
                release:
                    createRelease({
                        productId:
                            "different-product"
                    })
            });

        assert.equal(
            result.ready,
            false
        );

        assert.equal(
            result.reason,
            "product-mismatch"
        );

    }
);


test(
    "rejects product version mismatch",
    () => {

        const result =
            evaluateFulfillmentReadiness({
                order:
                    createOrder(),
                release:
                    createRelease({
                        productVersion:
                            "v2"
                    })
            });

        assert.equal(
            result.ready,
            false
        );

        assert.equal(
            result.reason,
            "product-version-mismatch"
        );

    }
);


test(
    "requires a non-empty delivery email",
    () => {

        const result =
            evaluateFulfillmentReadiness({
                order:
                    createOrder({
                        deliveryEmail:
                            "   "
                    }),
                release:
                    createRelease()
            });

        assert.equal(
            result.ready,
            false
        );

        assert.equal(
            result.reason,
            "delivery-email-missing"
        );

    }
);


test(
    "allows the normal fulfillment lifecycle",
    () => {

        assert.equal(
            canTransitionFulfillmentState(
                "not-ready",
                "ready"
            ),
            true
        );

        assert.equal(
            canTransitionFulfillmentState(
                "ready",
                "processing"
            ),
            true
        );

        assert.equal(
            canTransitionFulfillmentState(
                "processing",
                "delivered"
            ),
            true
        );

    }
);


test(
    "allows failed fulfillment to be retried",
    () => {

        assert.equal(
            canTransitionFulfillmentState(
                "processing",
                "failed"
            ),
            true
        );

        assert.equal(
            canTransitionFulfillmentState(
                "failed",
                "ready"
            ),
            true
        );

        assert.equal(
            canTransitionFulfillmentState(
                "failed",
                "processing"
            ),
            true
        );

    }
);


test(
    "makes identical fulfillment transitions idempotent",
    () => {

        assert.equal(
            canTransitionFulfillmentState(
                "processing",
                "processing"
            ),
            true
        );

        const result =
            transitionFulfillmentState(
                {
                    fulfillmentState:
                        "processing",
                    deliveryState:
                        "attempting"
                },
                "processing"
            );

        assert.equal(
            result.fulfillmentState,
            "processing"
        );

    }
);


test(
    "rejects invalid fulfillment transitions",
    () => {

        assert.equal(
            canTransitionFulfillmentState(
                "not-ready",
                "delivered"
            ),
            false
        );

        assert.throws(
            () =>
                transitionFulfillmentState(
                    {
                        fulfillmentState:
                            "not-ready",
                        deliveryState:
                            "not-attempted"
                    },
                    "delivered"
                ),
            /Invalid fulfillment transition/
        );

    }
);


test(
    "does not allow revoked fulfillment to resume",
    () => {

        assert.equal(
            canTransitionFulfillmentState(
                "revoked",
                "ready"
            ),
            false
        );

        assert.equal(
            canTransitionFulfillmentState(
                "revoked",
                "processing"
            ),
            false
        );

    }
);


test(
    "allows the normal delivery lifecycle",
    () => {

        assert.equal(
            canTransitionDeliveryState(
                "not-attempted",
                "attempting"
            ),
            true
        );

        assert.equal(
            canTransitionDeliveryState(
                "attempting",
                "sent"
            ),
            true
        );

    }
);


test(
    "allows failed delivery to be retried",
    () => {

        assert.equal(
            canTransitionDeliveryState(
                "attempting",
                "failed"
            ),
            true
        );

        assert.equal(
            canTransitionDeliveryState(
                "failed",
                "attempting"
            ),
            true
        );

    }
);


test(
    "makes identical delivery transitions idempotent",
    () => {

        assert.equal(
            canTransitionDeliveryState(
                "sent",
                "sent"
            ),
            true
        );

        const result =
            transitionDeliveryState(
                {
                    fulfillmentState:
                        "delivered",
                    deliveryState:
                        "sent"
                },
                "sent"
            );

        assert.equal(
            result.deliveryState,
            "sent"
        );

    }
);


test(
    "rejects invalid delivery transitions",
    () => {

        assert.equal(
            canTransitionDeliveryState(
                "not-attempted",
                "sent"
            ),
            false
        );

        assert.throws(
            () =>
                transitionDeliveryState(
                    {
                        fulfillmentState:
                            "ready",
                        deliveryState:
                            "not-attempted"
                    },
                    "sent"
                ),
            /Invalid delivery transition/
        );

    }
);
