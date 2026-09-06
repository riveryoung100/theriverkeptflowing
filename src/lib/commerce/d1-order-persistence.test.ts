import assert from "node:assert/strict";
import {
    describe,
    it
} from "node:test";

import {
    D1CommerceOrderPersistence
} from "./d1-order-persistence";

import type {
    RiverOrder
} from "../fulfillment/types";


interface StoredRow {

    order_id:
        string;

    provider:
        string;

    provider_order_or_session_id:
        string;

    provider_payment_reference:
        string;

    customer_reference:
        string;

    delivery_email:
        string;

    product_id:
        string;

    product_version:
        string;

    amount:
        number;

    currency:
        string;

    payment_state:
        string;

    created_at:
        string;

    paid_at:
        string | null;

}


function createOrder(
    overrides:
        Partial<RiverOrder> = {}
): RiverOrder {

    return {
        orderId:
            "order-001",
        provider:
            "stripe",
        providerOrderOrSessionId:
            "cs_test_001",
        providerPaymentReference:
            "pi_test_001",
        customerReference:
            "customer-001",
        deliveryEmail:
            "customer@example.com",
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
            "2026-09-06T20:00:00.000Z",
        paidAt:
            "2026-09-06T20:00:00.000Z",
        ...overrides
    };

}


function createFakeD1Database():
D1Database {

    const rows =
        new Map<
            string,
            StoredRow
        >();


    function findByProviderOrder(
        identity:
            unknown
    ): StoredRow | undefined {

        return Array.from(
            rows.values()
        ).find(
            (row) => {
                return (
                    row.provider_order_or_session_id ===
                    identity
                );
            }
        );

    }


    function findByProviderPayment(
        identity:
            unknown
    ): StoredRow | undefined {

        return Array.from(
            rows.values()
        ).find(
            (row) => {
                return (
                    row.provider_payment_reference ===
                    identity
                );
            }
        );

    }


    const database = {

        prepare(
            sql:
                string
        ) {

            return {

                bind(
                    ...values:
                        unknown[]
                ) {

                    return {

                        async first() {

                            let row:
                                StoredRow | undefined;

                            if (
                                sql.includes(
                                    "WHERE order_id = ?1"
                                )
                            ) {

                                row =
                                    rows.get(
                                        String(
                                            values[0]
                                        )
                                    );

                            }
                            else if (
                                sql.includes(
                                    "WHERE provider_order_or_session_id = ?1"
                                )
                            ) {

                                row =
                                    findByProviderOrder(
                                        values[0]
                                    );

                            }
                            else if (
                                sql.includes(
                                    "WHERE provider_payment_reference = ?1"
                                )
                            ) {

                                row =
                                    findByProviderPayment(
                                        values[0]
                                    );

                            }
                            else {

                                throw new Error(
                                    "Unexpected fake D1 SELECT."
                                );

                            }

                            return row === undefined
                                ? null
                                : {
                                    ...row
                                };

                        },


                        async run() {

                            if (
                                !sql.includes(
                                    "INSERT INTO commerce_orders"
                                )
                            ) {

                                throw new Error(
                                    "Unexpected fake D1 mutation."
                                );

                            }

                            const incoming:
                                StoredRow = {
                                    order_id:
                                        String(values[0]),
                                    provider:
                                        String(values[1]),
                                    provider_order_or_session_id:
                                        String(values[2]),
                                    provider_payment_reference:
                                        String(values[3]),
                                    customer_reference:
                                        String(values[4]),
                                    delivery_email:
                                        String(values[5]),
                                    product_id:
                                        String(values[6]),
                                    product_version:
                                        String(values[7]),
                                    amount:
                                        Number(values[8]),
                                    currency:
                                        String(values[9]),
                                    payment_state:
                                        String(values[10]),
                                    created_at:
                                        String(values[11]),
                                    paid_at:
                                        values[12] === null
                                            ? null
                                            : String(values[12])
                                };

                            const existingProviderOrder =
                                findByProviderOrder(
                                    incoming.provider_order_or_session_id
                                );

                            if (
                                existingProviderOrder !== undefined &&
                                existingProviderOrder.order_id !==
                                    incoming.order_id
                            ) {

                                throw new Error(
                                    "UNIQUE constraint failed: commerce_orders.provider_order_or_session_id"
                                );

                            }

                            const existingProviderPayment =
                                findByProviderPayment(
                                    incoming.provider_payment_reference
                                );

                            if (
                                existingProviderPayment !== undefined &&
                                existingProviderPayment.order_id !==
                                    incoming.order_id
                            ) {

                                throw new Error(
                                    "UNIQUE constraint failed: commerce_orders.provider_payment_reference"
                                );

                            }

                            const existing =
                                rows.get(
                                    incoming.order_id
                                );

                            if (existing === undefined) {

                                rows.set(
                                    incoming.order_id,
                                    incoming
                                );

                            }
                            else {

                                rows.set(
                                    incoming.order_id,
                                    {
                                        ...existing,
                                        payment_state:
                                            incoming.payment_state,
                                        paid_at:
                                            incoming.paid_at
                                    }
                                );

                            }

                            return {
                                success:
                                    true,
                                meta: {
                                    changes:
                                        1
                                }
                            };

                        }

                    };

                }

            };

        }

    };

    return database as unknown as
        D1Database;

}


describe(
    "PRODUCT-001E-04 D1 commerce order persistence",
    () => {

        it(
            "durably maps the canonical RiverOrder contract without redefining it",
            async () => {

                const persistence =
                    new D1CommerceOrderPersistence(
                        createFakeD1Database()
                    );

                const order =
                    createOrder();

                await persistence.saveOrder(
                    order
                );

                assert.deepEqual(
                    await persistence.getOrder(
                        order.orderId
                    ),
                    order
                );

            }
        );


        it(
            "preserves canonical decimal major-unit amount without converting it to provider minor units",
            async () => {

                const persistence =
                    new D1CommerceOrderPersistence(
                        createFakeD1Database()
                    );

                const order =
                    createOrder({
                        amount:
                            29.95
                    });

                await persistence.saveOrder(
                    order
                );

                const persisted =
                    await persistence.getOrder(
                        order.orderId
                    );

                assert.ok(
                    persisted
                );

                assert.equal(
                    persisted.amount,
                    29.95
                );

                assert.deepEqual(
                    persisted,
                    order
                );

            }
        );

        it(
            "supports both canonical provider identity lookups",
            async () => {

                const persistence =
                    new D1CommerceOrderPersistence(
                        createFakeD1Database()
                    );

                const order =
                    createOrder();

                await persistence.saveOrder(
                    order
                );

                assert.deepEqual(
                    await persistence
                        .getOrderByProviderOrderOrSessionId(
                            order.providerOrderOrSessionId
                        ),
                    order
                );

                assert.deepEqual(
                    await persistence
                        .getOrderByProviderPaymentReference(
                            order.providerPaymentReference
                        ),
                    order
                );

            }
        );


        it(
            "allows legitimate payment-state progression under stable order identity",
            async () => {

                const persistence =
                    new D1CommerceOrderPersistence(
                        createFakeD1Database()
                    );

                const pending =
                    createOrder({
                        paymentState:
                            "pending",
                        paidAt:
                            undefined
                    });

                await persistence.saveOrder(
                    pending
                );

                const paid =
                    {
                        ...pending,
                        paymentState:
                            "paid" as const,
                        paidAt:
                            "2026-09-06T20:05:00.000Z"
                    };

                await persistence.saveOrder(
                    paid
                );

                assert.deepEqual(
                    await persistence.getOrder(
                        paid.orderId
                    ),
                    paid
                );

            }
        );


        it(
            "rejects canonical order identity drift before durable mutation",
            async () => {

                const persistence =
                    new D1CommerceOrderPersistence(
                        createFakeD1Database()
                    );

                const order =
                    createOrder();

                await persistence.saveOrder(
                    order
                );

                await assert.rejects(
                    () => {
                        return persistence.saveOrder({
                            ...order,
                            productId:
                                "different-product"
                        });
                    },
                    /Order cannot change productId/
                );

                assert.deepEqual(
                    await persistence.getOrder(
                        order.orderId
                    ),
                    order
                );

            }
        );


        it(
            "rejects duplicate provider payment identity across canonical orders",
            async () => {

                const persistence =
                    new D1CommerceOrderPersistence(
                        createFakeD1Database()
                    );

                const first =
                    createOrder();

                await persistence.saveOrder(
                    first
                );

                await assert.rejects(
                    () => {
                        return persistence.saveOrder(
                            createOrder({
                                orderId:
                                    "order-002",
                                providerOrderOrSessionId:
                                    "cs_test_002"
                            })
                        );
                    },
                    /already contains provider payment reference/
                );

            }
        );


        it(
            "rejects duplicate provider order identity across canonical orders",
            async () => {

                const persistence =
                    new D1CommerceOrderPersistence(
                        createFakeD1Database()
                    );

                const first =
                    createOrder();

                await persistence.saveOrder(
                    first
                );

                await assert.rejects(
                    () => {
                        return persistence.saveOrder(
                            createOrder({
                                orderId:
                                    "order-002",
                                providerPaymentReference:
                                    "pi_test_002"
                            })
                        );
                    },
                    /already contains provider order or session identity/
                );

            }
        );

    }
);
