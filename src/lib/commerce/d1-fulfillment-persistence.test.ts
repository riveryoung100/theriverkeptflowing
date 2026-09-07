import assert from "node:assert/strict";
import test from "node:test";

import type {
    Entitlement,
    FulfillmentRecord,
    FulfillmentRequest
} from "../fulfillment/types";

import {
    D1FulfillmentPersistence,
    type D1FulfillmentDatabase
} from "./d1-fulfillment-persistence";


type Row =
    Record<string, unknown>;


class StatementDouble {

    private values:
        unknown[] =
        [];


    public constructor(
        private readonly database:
            DatabaseDouble,
        private readonly sql:
            string
    ) {}


    public bind(
        ...values:
            unknown[]
    ): StatementDouble {

        this.values =
            values;

        return this;

    }


    public async first<T>():
        Promise<T | null> {

        return this.database.first(
            this.sql,
            this.values
        ) as T | null;

    }


    public async run():
        Promise<unknown> {

        this.database.run(
            this.sql,
            this.values
        );

        return {
            success:
                true
        };

    }

}


class DatabaseDouble
implements D1FulfillmentDatabase {

    public readonly entitlements =
        new Map<string, Row>();

    public readonly requests =
        new Map<string, Row>();

    public readonly records =
        new Map<string, Row>();


    public prepare(
        sql:
            string
    ): StatementDouble {

        return new StatementDouble(
            this,
            sql.replace(
                /\s+/g,
                " "
            ).trim()
        );

    }


    public first(
        sql:
            string,
        values:
            unknown[]
    ): Row | null {

        const identity =
            String(
                values[0]
            );

        if (
            sql.includes(
                "FROM fulfillment_entitlements"
            )
        ) {

            if (
                sql.includes(
                    "WHERE entitlement_id"
                )
            ) {

                return (
                    this.entitlements.get(
                        identity
                    ) ??
                    null
                );

            }

            return (
                [...this.entitlements.values()]
                    .find(
                        row =>
                            row.order_id === identity
                    ) ??
                null
            );

        }

        if (
            sql.includes(
                "FROM fulfillment_requests"
            )
        ) {

            if (
                sql.includes(
                    "WHERE fulfillment_request_id"
                )
            ) {

                return (
                    this.requests.get(
                        identity
                    ) ??
                    null
                );

            }

            return (
                [...this.requests.values()]
                    .find(
                        row =>
                            row.order_id === identity
                    ) ??
                null
            );

        }

        if (
            sql.includes(
                "FROM fulfillment_records"
            )
        ) {

            if (
                sql.includes(
                    "WHERE fulfillment_id"
                )
            ) {

                return (
                    this.records.get(
                        identity
                    ) ??
                    null
                );

            }

            if (
                sql.includes(
                    "WHERE fulfillment_request_id"
                )
            ) {

                return (
                    [...this.records.values()]
                        .find(
                            row =>
                                row.fulfillment_request_id ===
                                identity
                        ) ??
                    null
                );

            }

            return (
                [...this.records.values()]
                    .find(
                        row =>
                            row.order_id === identity
                    ) ??
                null
            );

        }

        throw new Error(
            `Unsupported SELECT: ${sql}`
        );

    }


    public run(
        sql:
            string,
        values:
            unknown[]
    ): void {

        if (
            sql.includes(
                "INSERT INTO fulfillment_entitlements"
            )
        ) {

            const [
                entitlement_id,
                order_id,
                customer_reference,
                product_id,
                product_version,
                release_id,
                status,
                created_at,
                revoked_at
            ] =
                values;

            const id =
                String(
                    entitlement_id
                );

            const existing =
                this.entitlements.get(
                    id
                );

            if (existing) {

                existing.status =
                    status;

                existing.revoked_at =
                    revoked_at;

                return;

            }

            if (
                [...this.entitlements.values()]
                    .some(
                        row =>
                            row.order_id === order_id &&
                            row.product_id === product_id &&
                            row.product_version === product_version &&
                            row.release_id === release_id
                    )
            ) {

                throw new Error(
                    "UNIQUE entitlement order and product release"
                );

            }

            this.entitlements.set(
                id,
                {
                    entitlement_id,
                    order_id,
                    customer_reference,
                    product_id,
                    product_version,
                    release_id,
                    status,
                    created_at,
                    revoked_at
                }
            );

            return;

        }

        if (
            sql.includes(
                "INSERT INTO fulfillment_requests"
            )
        ) {

            const [
                fulfillment_request_id,
                order_id,
                product_id,
                product_version,
                customer_reference,
                delivery_email,
                payment_state,
                payment_reference,
                purchased_at
            ] =
                values;

            const id =
                String(
                    fulfillment_request_id
                );

            if (this.requests.has(id)) {

                return;

            }

            if (
                [...this.requests.values()]
                    .some(
                        row =>
                            row.order_id === order_id
                    )
            ) {

                throw new Error(
                    "UNIQUE fulfillment request order"
                );

            }

            this.requests.set(
                id,
                {
                    fulfillment_request_id,
                    order_id,
                    product_id,
                    product_version,
                    customer_reference,
                    delivery_email,
                    payment_state,
                    payment_reference,
                    purchased_at
                }
            );

            return;

        }

        if (
            sql.includes(
                "INSERT INTO fulfillment_records"
            )
        ) {

            const [
                fulfillment_id,
                fulfillment_request_id,
                order_id,
                product_id,
                product_version,
                release_id,
                entitlement_id,
                fulfillment_state,
                delivery_state,
                delivery_attempted_at,
                delivered_at,
                failure_reason
            ] =
                values;

            const id =
                String(
                    fulfillment_id
                );

            const existing =
                this.records.get(
                    id
                );

            if (existing) {

                existing.fulfillment_state =
                    fulfillment_state;

                existing.delivery_state =
                    delivery_state;

                existing.delivery_attempted_at =
                    delivery_attempted_at;

                existing.delivered_at =
                    delivered_at;

                existing.failure_reason =
                    failure_reason;

                return;

            }

            if (
                [...this.records.values()]
                    .some(
                        row =>
                            row.fulfillment_request_id ===
                                fulfillment_request_id ||
                            row.order_id ===
                                order_id
                    )
            ) {

                throw new Error(
                    "UNIQUE fulfillment record identity"
                );

            }

            this.records.set(
                id,
                {
                    fulfillment_id,
                    fulfillment_request_id,
                    order_id,
                    product_id,
                    product_version,
                    release_id,
                    entitlement_id,
                    fulfillment_state,
                    delivery_state,
                    delivery_attempted_at,
                    delivered_at,
                    failure_reason
                }
            );

            return;

        }

        throw new Error(
            `Unsupported mutation: ${sql}`
        );

    }

}


function entitlement():
    Entitlement {

    return {
        entitlementId:
            "entitlement-e07-001",

        orderId:
            "order-e07-001",

        customerReference:
            "customer-e07-001",

        productId:
            "river-life-operating-system",

        productVersion:
            "v1",

        releaseId:
            "release-e07-v1",

        status:
            "active",

        createdAt:
            "2026-09-07T00:00:00.000Z"
    };

}


function request():
    FulfillmentRequest {

    return {
        fulfillmentRequestId:
            "request-e07-001",

        orderId:
            "order-e07-001",

        productId:
            "river-life-operating-system",

        productVersion:
            "v1",

        customerReference:
            "customer-e07-001",

        deliveryEmail:
            "customer@example.com",

        paymentState:
            "paid",

        paymentReference:
            "pi_e07_001",

        purchasedAt:
            "2026-09-07T00:00:00.000Z"
    };

}


function record():
    FulfillmentRecord {

    return {
        fulfillmentId:
            "fulfillment-e07-001",

        fulfillmentRequestId:
            "request-e07-001",

        orderId:
            "order-e07-001",

        productId:
            "river-life-operating-system",

        productVersion:
            "v1",

        releaseId:
            "release-e07-v1",

        entitlementId:
            "entitlement-e07-001",

        fulfillmentState:
            "ready",

        deliveryState:
            "not-attempted"
    };

}


test(
    "persists and recovers the complete non-order fulfillment surface",
    async () => {

        const database =
            new DatabaseDouble();

        const persistence =
            new D1FulfillmentPersistence(
                database
            );

        const storedEntitlement =
            entitlement();

        const storedRequest =
            request();

        const storedRecord =
            record();

        await persistence.saveEntitlement(
            storedEntitlement
        );

        await persistence.saveFulfillmentRequest(
            storedRequest
        );

        await persistence.saveFulfillmentRecord(
            storedRecord
        );

        assert.deepEqual(
            await persistence.getEntitlement(
                storedEntitlement.entitlementId
            ),
            storedEntitlement
        );

        assert.deepEqual(
            await persistence.getEntitlementByOrderId(
                storedEntitlement.orderId
            ),
            storedEntitlement
        );

        assert.deepEqual(
            await persistence.getFulfillmentRequest(
                storedRequest.fulfillmentRequestId
            ),
            storedRequest
        );

        assert.deepEqual(
            await persistence.getFulfillmentRequestByOrderId(
                storedRequest.orderId
            ),
            storedRequest
        );

        assert.deepEqual(
            await persistence.getFulfillmentRecord(
                storedRecord.fulfillmentId
            ),
            storedRecord
        );

        assert.deepEqual(
            await persistence.getFulfillmentRecordByRequestId(
                storedRecord.fulfillmentRequestId
            ),
            storedRecord
        );

        assert.deepEqual(
            await persistence.getFulfillmentRecordByOrderId(
                storedRecord.orderId
            ),
            storedRecord
        );

    }
);


test(
    "persists legitimate fulfillment lifecycle progression",
    async () => {

        const database =
            new DatabaseDouble();

        const persistence =
            new D1FulfillmentPersistence(
                database
            );

        const initial =
            record();

        await persistence.saveFulfillmentRecord(
            initial
        );

        const processing:
            FulfillmentRecord =
            {
                ...initial,

                fulfillmentState:
                    "processing",

                deliveryState:
                    "attempting",

                deliveryAttemptedAt:
                    "2026-09-07T00:01:00.000Z"
            };

        await persistence.saveFulfillmentRecord(
            processing
        );

        const delivered:
            FulfillmentRecord =
            {
                ...processing,

                fulfillmentState:
                    "delivered",

                deliveryState:
                    "sent",

                deliveredAt:
                    "2026-09-07T00:01:01.000Z"
            };

        await persistence.saveFulfillmentRecord(
            delivered
        );

        assert.deepEqual(
            await persistence.getFulfillmentRecord(
                initial.fulfillmentId
            ),
            delivered
        );

    }
);


test(
    "rejects duplicate entitlement order identity",
    async () => {

        const database =
            new DatabaseDouble();

        const persistence =
            new D1FulfillmentPersistence(
                database
            );

        const first =
            entitlement();

        await persistence.saveEntitlement(
            first
        );

        await assert.rejects(
            persistence.saveEntitlement({
                ...first,

                entitlementId:
                    "entitlement-e07-duplicate"
            })
        );

    }
);


test(
    "rejects duplicate fulfillment request order identity",
    async () => {

        const database =
            new DatabaseDouble();

        const persistence =
            new D1FulfillmentPersistence(
                database
            );

        const first =
            request();

        await persistence.saveFulfillmentRequest(
            first
        );

        await assert.rejects(
            persistence.saveFulfillmentRequest({
                ...first,

                fulfillmentRequestId:
                    "request-e07-duplicate"
            })
        );

    }
);


test(
    "rejects duplicate fulfillment record request and order identities",
    async () => {

        const database =
            new DatabaseDouble();

        const persistence =
            new D1FulfillmentPersistence(
                database
            );

        const first =
            record();

        await persistence.saveFulfillmentRecord(
            first
        );

        await assert.rejects(
            persistence.saveFulfillmentRecord({
                ...first,

                fulfillmentId:
                    "fulfillment-e07-duplicate"
            })
        );

    }
);

