import assert from "node:assert/strict";
import test from "node:test";

import {
    createInMemoryFulfillmentPersistence,
    InMemoryFulfillmentPersistence
} from "./persistence";

import type {
    Entitlement,
    FulfillmentRecord,
    FulfillmentRequest,
    RiverOrder
} from "./types";


function createOrder(
    overrides: Partial<RiverOrder> = {}
): RiverOrder {

    return {
        orderId: "order-001",
        provider: "test-provider",
        providerOrderOrSessionId: "provider-order-001",
        providerPaymentReference: "payment-001",
        customerReference: "customer-001",
        deliveryEmail: "customer@example.com",
        productId: "river-life-operating-system",
        productVersion: "v1",
        amount: 1000,
        currency: "USD",
        paymentState: "paid",
        createdAt: "2026-09-04T18:30:00.000Z",
        ...overrides
    };
}


function createEntitlement(
    overrides: Partial<Entitlement> = {}
): Entitlement {

    return {
        entitlementId: "entitlement-001",
        orderId: "order-001",
        customerReference: "customer-001",
        productId: "river-life-operating-system",
        productVersion: "v1",
        releaseId: "release-001",
        status: "active",
        createdAt: "2026-09-04T18:31:00.000Z",
        ...overrides
    };
}


function createFulfillmentRequest(
    overrides: Partial<FulfillmentRequest> = {}
): FulfillmentRequest {

    return {
        fulfillmentRequestId: "request-001",
        orderId: "order-001",
        productId: "river-life-operating-system",
        productVersion: "v1",
        customerReference: "customer-001",
        deliveryEmail: "customer@example.com",
        paymentState: "paid",
        paymentReference: "payment-001",
        purchasedAt: "2026-09-04T18:30:00.000Z",
        ...overrides
    };
}


function createFulfillmentRecord(
    overrides: Partial<FulfillmentRecord> = {}
): FulfillmentRecord {

    return {
        fulfillmentId: "fulfillment-001",
        fulfillmentRequestId: "request-001",
        orderId: "order-001",
        productId: "river-life-operating-system",
        productVersion: "v1",
        releaseId: "release-001",
        entitlementId: "entitlement-001",
        fulfillmentState: "ready",
        deliveryState: "not-attempted",
        ...overrides
    };
}


test(
    "persists and retrieves the four canonical fulfillment records",
    async () => {

        const persistence =
            createInMemoryFulfillmentPersistence();

        const order =
            createOrder();

        const entitlement =
            createEntitlement();

        const request =
            createFulfillmentRequest();

        const fulfillment =
            createFulfillmentRecord();

        await persistence.saveOrder(order);
        await persistence.saveEntitlement(entitlement);
        await persistence.saveFulfillmentRequest(request);
        await persistence.saveFulfillmentRecord(fulfillment);

        assert.deepEqual(
            await persistence.getOrder(order.orderId),
            order
        );

        assert.deepEqual(
            await persistence.getEntitlement(
                entitlement.entitlementId
            ),
            entitlement
        );

        assert.deepEqual(
            await persistence.getFulfillmentRequest(
                request.fulfillmentRequestId
            ),
            request
        );

        assert.deepEqual(
            await persistence.getFulfillmentRecord(
                fulfillment.fulfillmentId
            ),
            fulfillment
        );
    }
);


test(
    "supports provider identity lookup for duplicate payment-event safety",
    async () => {

        const persistence =
            createInMemoryFulfillmentPersistence();

        const order =
            createOrder();

        await persistence.saveOrder(order);

        assert.deepEqual(
            await persistence.getOrderByProviderOrderOrSessionId(
                order.providerOrderOrSessionId
            ),
            order
        );

        assert.deepEqual(
            await persistence.getOrderByProviderPaymentReference(
                order.providerPaymentReference
            ),
            order
        );
    }
);


test(
    "supports order-linked entitlement recovery",
    async () => {

        const persistence =
            createInMemoryFulfillmentPersistence();

        const entitlement =
            createEntitlement();

        await persistence.saveEntitlement(
            entitlement
        );

        assert.deepEqual(
            await persistence.getEntitlementByOrderId(
                entitlement.orderId
            ),
            entitlement
        );
    }
);


test(
    "supports order-linked fulfillment request recovery",
    async () => {

        const persistence =
            createInMemoryFulfillmentPersistence();

        const request =
            createFulfillmentRequest();

        await persistence.saveFulfillmentRequest(
            request
        );

        assert.deepEqual(
            await persistence.getFulfillmentRequestByOrderId(
                request.orderId
            ),
            request
        );
    }
);


test(
    "supports fulfillment recovery by request and order identity",
    async () => {

        const persistence =
            createInMemoryFulfillmentPersistence();

        const fulfillment =
            createFulfillmentRecord();

        await persistence.saveFulfillmentRecord(
            fulfillment
        );

        assert.deepEqual(
            await persistence.getFulfillmentRecordByRequestId(
                fulfillment.fulfillmentRequestId
            ),
            fulfillment
        );

        assert.deepEqual(
            await persistence.getFulfillmentRecordByOrderId(
                fulfillment.orderId
            ),
            fulfillment
        );
    }
);


test(
    "returns undefined when canonical records are absent",
    async () => {

        const persistence =
            createInMemoryFulfillmentPersistence();

        assert.equal(
            await persistence.getOrder("missing-order"),
            undefined
        );

        assert.equal(
            await persistence.getEntitlement(
                "missing-entitlement"
            ),
            undefined
        );

        assert.equal(
            await persistence.getFulfillmentRequest(
                "missing-request"
            ),
            undefined
        );

        assert.equal(
            await persistence.getFulfillmentRecord(
                "missing-fulfillment"
            ),
            undefined
        );

        assert.equal(
            await persistence.getOrderByProviderOrderOrSessionId(
                "missing-provider-order"
            ),
            undefined
        );

        assert.equal(
            await persistence.getOrderByProviderPaymentReference(
                "missing-payment"
            ),
            undefined
        );
    }
);


test(
    "persists legitimate state updates under stable canonical identity",
    async () => {

        const persistence =
            createInMemoryFulfillmentPersistence();

        const order =
            createOrder({
                paymentState: "pending"
            });

        await persistence.saveOrder(order);

        await persistence.saveOrder({
            ...order,
            paymentState: "paid"
        });

        assert.equal(
            (
                await persistence.getOrder(
                    order.orderId
                )
            )?.paymentState,
            "paid"
        );

        const fulfillment =
            createFulfillmentRecord();

        await persistence.saveFulfillmentRecord(
            fulfillment
        );

        await persistence.saveFulfillmentRecord({
            ...fulfillment,
            fulfillmentState: "processing",
            deliveryState: "attempting",
            deliveryAttemptedAt:
                "2026-09-04T18:35:00.000Z"
        });

        assert.deepEqual(
            await persistence.getFulfillmentRecord(
                fulfillment.fulfillmentId
            ),
            {
                ...fulfillment,
                fulfillmentState: "processing",
                deliveryState: "attempting",
                deliveryAttemptedAt:
                    "2026-09-04T18:35:00.000Z"
            }
        );
    }
);


test(
    "returns defensive copies instead of exposing stored mutable state",
    async () => {

        const persistence =
            createInMemoryFulfillmentPersistence();

        const order =
            createOrder();

        await persistence.saveOrder(
            order
        );

        const retrieved =
            await persistence.getOrder(
                order.orderId
            );

        assert.ok(retrieved);

        retrieved.paymentState =
            "failed";

        assert.equal(
            (
                await persistence.getOrder(
                    order.orderId
                )
            )?.paymentState,
            "paid"
        );
    }
);


test(
    "rejects a second order using an existing provider payment identity",
    async () => {

        const persistence =
            new InMemoryFulfillmentPersistence();

        await persistence.saveOrder(
            createOrder({
                orderId: "order-001"
            })
        );

        await assert.rejects(
            () => {
                return persistence.saveOrder(
                    createOrder({
                        orderId: "order-002",
                        providerOrderOrSessionId:
                            "provider-order-002"
                    })
                );
            },
            /already contains provider payment reference/
        );
    }
);


test(
    "rejects a second entitlement for the same order and product release",
    async () => {

        const persistence =
            createInMemoryFulfillmentPersistence();

        await persistence.saveEntitlement(
            createEntitlement({
                entitlementId: "entitlement-001"
            })
        );

        await assert.rejects(
            () => {
                return persistence.saveEntitlement(
                    createEntitlement({
                        entitlementId: "entitlement-002"
                    })
                );
            },
            /already contains order and product release entitlement identity/
        );
    }
);


test(
    "rejects order identity drift under the same orderId",
    async () => {

        const persistence =
            createInMemoryFulfillmentPersistence();

        const order =
            createOrder();

        await persistence.saveOrder(
            order
        );

        await assert.rejects(
            () => {
                return persistence.saveOrder({
                    ...order,
                    productId: "different-product"
                });
            },
            /Order cannot change productId/
        );

        await assert.rejects(
            () => {
                return persistence.saveOrder({
                    ...order,
                    customerReference:
                        "different-customer"
                });
            },
            /Order cannot change customerReference/
        );

        assert.deepEqual(
            await persistence.getOrder(
                order.orderId
            ),
            order
        );
    }
);


test(
    "rejects entitlement identity drift under the same entitlementId",
    async () => {

        const persistence =
            createInMemoryFulfillmentPersistence();

        const entitlement =
            createEntitlement();

        await persistence.saveEntitlement(
            entitlement
        );

        await assert.rejects(
            () => {
                return persistence.saveEntitlement({
                    ...entitlement,
                    releaseId: "different-release"
                });
            },
            /Entitlement cannot change releaseId/
        );

        assert.deepEqual(
            await persistence.getEntitlement(
                entitlement.entitlementId
            ),
            entitlement
        );
    }
);


test(
    "rejects fulfillment request identity drift under the same request identity",
    async () => {

        const persistence =
            createInMemoryFulfillmentPersistence();

        const request =
            createFulfillmentRequest();

        await persistence.saveFulfillmentRequest(
            request
        );

        await assert.rejects(
            () => {
                return persistence.saveFulfillmentRequest({
                    ...request,
                    orderId: "different-order"
                });
            },
            /Fulfillment request cannot change orderId/
        );

        assert.deepEqual(
            await persistence.getFulfillmentRequest(
                request.fulfillmentRequestId
            ),
            request
        );
    }
);


test(
    "rejects fulfillment linkage drift while allowing lifecycle state updates",
    async () => {

        const persistence =
            createInMemoryFulfillmentPersistence();

        const fulfillment =
            createFulfillmentRecord();

        await persistence.saveFulfillmentRecord(
            fulfillment
        );

        await assert.rejects(
            () => {
                return persistence.saveFulfillmentRecord({
                    ...fulfillment,
                    orderId: "different-order"
                });
            },
            /Fulfillment record cannot change orderId/
        );

        await assert.rejects(
            () => {
                return persistence.saveFulfillmentRecord({
                    ...fulfillment,
                    fulfillmentRequestId:
                        "different-request"
                });
            },
            /Fulfillment record cannot change fulfillmentRequestId/
        );

        await persistence.saveFulfillmentRecord({
            ...fulfillment,
            fulfillmentState: "processing",
            deliveryState: "attempting",
            deliveryAttemptedAt:
                "2026-09-04T18:40:00.000Z"
        });

        assert.equal(
            (
                await persistence.getFulfillmentRecord(
                    fulfillment.fulfillmentId
                )
            )?.fulfillmentState,
            "processing"
        );
    }
);


test(
    "rejects duplicate fulfillment request and fulfillment secondary identities at save time",
    async () => {

        const persistence =
            createInMemoryFulfillmentPersistence();

        await persistence.saveFulfillmentRequest(
            createFulfillmentRequest({
                fulfillmentRequestId: "request-001",
                orderId: "order-001"
            })
        );

        await assert.rejects(
            () => {
                return persistence.saveFulfillmentRequest(
                    createFulfillmentRequest({
                        fulfillmentRequestId: "request-002",
                        orderId: "order-001"
                    })
                );
            },
            /already contains fulfillment request order identity/
        );

        await persistence.saveFulfillmentRecord(
            createFulfillmentRecord({
                fulfillmentId: "fulfillment-001",
                fulfillmentRequestId: "request-001",
                orderId: "order-001"
            })
        );

        await assert.rejects(
            () => {
                return persistence.saveFulfillmentRecord(
                    createFulfillmentRecord({
                        fulfillmentId: "fulfillment-002",
                        fulfillmentRequestId: "request-001",
                        orderId: "order-002"
                    })
                );
            },
            /already contains fulfillment request identity/
        );

        await assert.rejects(
            () => {
                return persistence.saveFulfillmentRecord(
                    createFulfillmentRecord({
                        fulfillmentId: "fulfillment-003",
                        fulfillmentRequestId: "request-003",
                        orderId: "order-001"
                    })
                );
            },
            /already contains fulfillment order identity/
        );
    }
);


test(
    "rejects empty and whitespace-padded canonical identities",
    async () => {

        const persistence =
            createInMemoryFulfillmentPersistence();

        await assert.rejects(
            () => {
                return persistence.saveOrder(
                    createOrder({
                        orderId: ""
                    })
                );
            },
            /Order identifier/
        );

        await assert.rejects(
            () => {
                return persistence.getOrder(
                    " order-001 "
                );
            },
            /Order identifier/
        );

        await assert.rejects(
            () => {
                return persistence.saveEntitlement(
                    createEntitlement({
                        orderId: " "
                    })
                );
            },
            /Entitlement order identifier/
        );

        await assert.rejects(
            () => {
                return persistence.saveFulfillmentRecord(
                    createFulfillmentRecord({
                        fulfillmentRequestId: ""
                    })
                );
            },
            /Fulfillment request identifier/
        );
    }
);
