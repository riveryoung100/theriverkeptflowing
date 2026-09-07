import assert from "node:assert/strict";
import test from "node:test";

import type {
    ProductRelease
} from "../fulfillment/types";

import type {
    DeliveryProvider,
    DeliveryProviderRequest,
    DeliveryProviderResult
} from "../fulfillment/delivery-provider";

import {
    processVerifiedPaidOrder
} from "./paid-order-fulfillment";

import type {
    VerifiedPaymentEvent
} from "./payment-event";

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

    public readonly orders =
        new Map<string, Row>();

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
            String(values[0]);

        if (
            sql.includes(
                "FROM commerce_orders"
            )
        ) {

            if (
                sql.includes(
                    "WHERE order_id"
                )
            ) {
                return this.orders.get(identity) ?? null;
            }

            if (
                sql.includes(
                    "WHERE provider_order_or_session_id"
                )
            ) {
                return (
                    [...this.orders.values()]
                        .find(
                            row =>
                                row.provider_order_or_session_id ===
                                identity
                        ) ??
                    null
                );
            }

            if (
                sql.includes(
                    "WHERE provider_payment_reference"
                )
            ) {
                return (
                    [...this.orders.values()]
                        .find(
                            row =>
                                row.provider_payment_reference ===
                                identity
                        ) ??
                    null
                );
            }
        }

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
                return this.entitlements.get(identity) ?? null;
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
                return this.requests.get(identity) ?? null;
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
                return this.records.get(identity) ?? null;
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
                "INSERT INTO commerce_orders"
            )
        ) {

            const [
                order_id,
                provider,
                provider_order_or_session_id,
                provider_payment_reference,
                customer_reference,
                delivery_email,
                product_id,
                product_version,
                amount,
                currency,
                payment_state,
                created_at,
                paid_at
            ] =
                values;

            const id =
                String(order_id);

            const existing =
                this.orders.get(id);

            if (existing) {

                existing.payment_state =
                    payment_state;

                existing.paid_at =
                    paid_at;

                return;
            }

            for (
                const row
                of this.orders.values()
            ) {

                if (
                    row.provider_order_or_session_id ===
                        provider_order_or_session_id ||
                    row.provider_payment_reference ===
                        provider_payment_reference
                ) {
                    throw new Error(
                        "UNIQUE commerce identity"
                    );
                }
            }

            this.orders.set(
                id,
                {
                    order_id,
                    provider,
                    provider_order_or_session_id,
                    provider_payment_reference,
                    customer_reference,
                    delivery_email,
                    product_id,
                    product_version,
                    amount,
                    currency,
                    payment_state,
                    created_at,
                    paid_at
                }
            );

            return;
        }

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
                String(entitlement_id);

            const existing =
                this.entitlements.get(id);

            if (existing) {
                existing.status =
                    status;

                existing.revoked_at =
                    revoked_at;

                return;
            }

            for (
                const row
                of this.entitlements.values()
            ) {

                if (
                    row.order_id === order_id &&
                    row.product_id === product_id &&
                    row.product_version === product_version &&
                    row.release_id === release_id
                ) {
                    throw new Error(
                        "UNIQUE entitlement order and product release"
                    );
                }
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

            for (
                const row
                of this.requests.values()
            ) {

                if (row.order_id === order_id) {
                    throw new Error(
                        "UNIQUE fulfillment request order"
                    );
                }
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
                String(fulfillment_id);

            const existing =
                this.records.get(id);

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

            for (
                const row
                of this.records.values()
            ) {

                if (
                    row.fulfillment_request_id ===
                        fulfillment_request_id ||
                    row.order_id ===
                        order_id
                ) {
                    throw new Error(
                        "UNIQUE fulfillment identity"
                    );
                }
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


class CountingDeliveryProvider
implements DeliveryProvider {

    public calls =
        0;


    public async send(
        request:
            DeliveryProviderRequest
    ): Promise<DeliveryProviderResult> {

        this.calls++;

        return {
            status:
                "sent",

            providerMessageReference:
                `delivery-${request.fulfillmentId}`,

            acceptedAt:
                "2026-09-07T00:01:00.000Z"
        };
    }
}


const paymentEvent:
    VerifiedPaymentEvent =
    {
        verificationState:
            "verified",

        provider:
            "stripe",

        providerEventId:
            "evt_e07_replay_001",

        providerOrderOrSessionId:
            "cs_e07_replay_001",

        providerPaymentReference:
            "pi_e07_replay_001",

        customerReference:
            "customer-e07-replay",

        deliveryEmail:
            "customer@example.com",

        productId:
            "river-life-operating-system",

        productVersion:
            "v1",

        amount:
            29,

        currency:
            "USD",

        paymentState:
            "paid",

        eventCreatedAt:
            "2026-09-07T00:00:00.000Z",

        paidAt:
            "2026-09-07T00:00:00.000Z"
    };


const release:
    ProductRelease =
    {
        productId:
            "river-life-operating-system",

        productVersion:
            "v1",

        releaseId:
            "release-e07-replay-v1",

        artifactFilename:
            "river-life-operating-system-v1.pdf",

        artifactFormat:
            "pdf",

        artifactByteSize:
            4,

        artifactSha256:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

        createdAt:
            "2026-09-07T00:00:00.000Z",

        releaseStatus:
            "approved"
    };


test(
    "identical verified paid evidence is durably idempotent across recreated persistence adapters",
    async () => {

        const database =
            new DatabaseDouble();

        const deliveryProvider =
            new CountingDeliveryProvider();

        const firstPersistence =
            new D1FulfillmentPersistence(
                database
            );

        const first =
            await processVerifiedPaidOrder(
                {
                    persistence:
                        firstPersistence,

                    deliveryProvider
                },
                {
                    paymentEvent,
                    release,

                    artifactBytes:
                        new Uint8Array(
                            [1, 2, 3, 4]
                        ),

                    occurredAt:
                        "2026-09-07T00:01:00.000Z",

                    message: {
                        subject:
                            "Your River Life Operating System",

                        text:
                            "Your product is ready."
                    }
                }
            );

        assert.equal(
            first.fulfillmentRecord.fulfillmentState,
            "delivered"
        );

        assert.equal(
            deliveryProvider.calls,
            1
        );

        assert.equal(
            database.orders.size,
            1
        );

        assert.equal(
            database.entitlements.size,
            1
        );

        assert.equal(
            database.requests.size,
            1
        );

        assert.equal(
            database.records.size,
            1
        );

        /*
         * Recreate the D1 adapter to prove replay safety comes from
         * durable persisted state rather than adapter process memory.
         */

        const replayPersistence =
            new D1FulfillmentPersistence(
                database
            );

        const replay =
            await processVerifiedPaidOrder(
                {
                    persistence:
                        replayPersistence,

                    deliveryProvider
                },
                {
                    paymentEvent,
                    release,

                    artifactBytes:
                        new Uint8Array(
                            [1, 2, 3, 4]
                        ),

                    occurredAt:
                        "2026-09-07T00:02:00.000Z",

                    message: {
                        subject:
                            "Your River Life Operating System",

                        text:
                            "Your product is ready."
                    }
                }
            );

        assert.equal(
            replay.fulfillmentRecord.fulfillmentState,
            "delivered"
        );

        assert.equal(
            replay.fulfillmentRecord.fulfillmentId,
            first.fulfillmentRecord.fulfillmentId
        );

        assert.equal(
            replay.fulfillmentRequest.fulfillmentRequestId,
            first.fulfillmentRequest.fulfillmentRequestId
        );

        assert.equal(
            replay.entitlement.entitlementId,
            first.entitlement.entitlementId
        );

        assert.equal(
            deliveryProvider.calls,
            1
        );

        assert.equal(
            database.orders.size,
            1
        );

        assert.equal(
            database.entitlements.size,
            1
        );

        assert.equal(
            database.requests.size,
            1
        );

        assert.equal(
            database.records.size,
            1
        );
    }
);


