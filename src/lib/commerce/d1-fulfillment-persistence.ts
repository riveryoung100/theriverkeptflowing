import type {
    Entitlement,
    FulfillmentRecord,
    FulfillmentRequest,
    RiverOrder
} from "../fulfillment/types";

import type {
    FulfillmentPersistence
} from "../fulfillment/persistence";

import {
    InMemoryFulfillmentPersistence
} from "../fulfillment/persistence";

import {
    D1CommerceOrderPersistence
} from "./d1-order-persistence";


interface D1Statement {

    bind(
        ...values:
            unknown[]
    ): D1Statement;

    first<T>():
        Promise<T | null>;

    run():
        Promise<unknown>;

}


export interface D1FulfillmentDatabase {

    prepare(
        query:
            string
    ): D1Statement;

}


interface EntitlementRow {

    entitlement_id:
        unknown;

    order_id:
        unknown;

    customer_reference:
        unknown;

    product_id:
        unknown;

    product_version:
        unknown;

    release_id:
        unknown;

    status:
        unknown;

    created_at:
        unknown;

    revoked_at:
        unknown;

}


interface FulfillmentRequestRow {

    fulfillment_request_id:
        unknown;

    order_id:
        unknown;

    product_id:
        unknown;

    product_version:
        unknown;

    customer_reference:
        unknown;

    delivery_email:
        unknown;

    payment_state:
        unknown;

    payment_reference:
        unknown;

    purchased_at:
        unknown;

}


interface FulfillmentRecordRow {

    fulfillment_id:
        unknown;

    fulfillment_request_id:
        unknown;

    order_id:
        unknown;

    product_id:
        unknown;

    product_version:
        unknown;

    release_id:
        unknown;

    entitlement_id:
        unknown;

    fulfillment_state:
        unknown;

    delivery_state:
        unknown;

    delivery_attempted_at:
        unknown;

    delivered_at:
        unknown;

    failure_reason:
        unknown;

}


function requireStoredString(
    value:
        unknown,
    fieldName:
        string
): string {

    if (
        typeof value !== "string" ||
        value.length === 0 ||
        value.trim() !== value
    ) {

        throw new Error(
            `Stored fulfillment record has invalid ${fieldName}.`
        );

    }

    return value;

}


function optionalStoredString(
    value:
        unknown,
    fieldName:
        string
): string | undefined {

    if (
        value === null ||
        value === undefined
    ) {

        return undefined;

    }

    return requireStoredString(
        value,
        fieldName
    );

}


function rowToEntitlement(
    row:
        EntitlementRow
): Entitlement {

    const revokedAt =
        optionalStoredString(
            row.revoked_at,
            "revoked_at"
        );

    return {
        entitlementId:
            requireStoredString(
                row.entitlement_id,
                "entitlement_id"
            ),

        orderId:
            requireStoredString(
                row.order_id,
                "order_id"
            ),

        customerReference:
            requireStoredString(
                row.customer_reference,
                "customer_reference"
            ),

        productId:
            requireStoredString(
                row.product_id,
                "product_id"
            ),

        productVersion:
            requireStoredString(
                row.product_version,
                "product_version"
            ),

        releaseId:
            requireStoredString(
                row.release_id,
                "release_id"
            ),

        status:
            requireStoredString(
                row.status,
                "status"
            ) as Entitlement["status"],

        createdAt:
            requireStoredString(
                row.created_at,
                "created_at"
            ),

        ...(
            revokedAt === undefined
                ? {}
                : {
                    revokedAt
                }
        )
    };

}


function rowToFulfillmentRequest(
    row:
        FulfillmentRequestRow
): FulfillmentRequest {

    return {
        fulfillmentRequestId:
            requireStoredString(
                row.fulfillment_request_id,
                "fulfillment_request_id"
            ),

        orderId:
            requireStoredString(
                row.order_id,
                "order_id"
            ),

        productId:
            requireStoredString(
                row.product_id,
                "product_id"
            ),

        productVersion:
            requireStoredString(
                row.product_version,
                "product_version"
            ),

        customerReference:
            requireStoredString(
                row.customer_reference,
                "customer_reference"
            ),

        deliveryEmail:
            requireStoredString(
                row.delivery_email,
                "delivery_email"
            ),

        paymentState:
            requireStoredString(
                row.payment_state,
                "payment_state"
            ) as FulfillmentRequest["paymentState"],

        paymentReference:
            requireStoredString(
                row.payment_reference,
                "payment_reference"
            ),

        purchasedAt:
            requireStoredString(
                row.purchased_at,
                "purchased_at"
            )
    };

}


function rowToFulfillmentRecord(
    row:
        FulfillmentRecordRow
): FulfillmentRecord {

    const deliveryAttemptedAt =
        optionalStoredString(
            row.delivery_attempted_at,
            "delivery_attempted_at"
        );

    const deliveredAt =
        optionalStoredString(
            row.delivered_at,
            "delivered_at"
        );

    const failureReason =
        optionalStoredString(
            row.failure_reason,
            "failure_reason"
        );

    return {
        fulfillmentId:
            requireStoredString(
                row.fulfillment_id,
                "fulfillment_id"
            ),

        fulfillmentRequestId:
            requireStoredString(
                row.fulfillment_request_id,
                "fulfillment_request_id"
            ),

        orderId:
            requireStoredString(
                row.order_id,
                "order_id"
            ),

        productId:
            requireStoredString(
                row.product_id,
                "product_id"
            ),

        productVersion:
            requireStoredString(
                row.product_version,
                "product_version"
            ),

        releaseId:
            requireStoredString(
                row.release_id,
                "release_id"
            ),

        entitlementId:
            requireStoredString(
                row.entitlement_id,
                "entitlement_id"
            ),

        fulfillmentState:
            requireStoredString(
                row.fulfillment_state,
                "fulfillment_state"
            ) as FulfillmentRecord["fulfillmentState"],

        deliveryState:
            requireStoredString(
                row.delivery_state,
                "delivery_state"
            ) as FulfillmentRecord["deliveryState"],

        ...(
            deliveryAttemptedAt === undefined
                ? {}
                : {
                    deliveryAttemptedAt
                }
        ),

        ...(
            deliveredAt === undefined
                ? {}
                : {
                    deliveredAt
                }
        ),

        ...(
            failureReason === undefined
                ? {}
                : {
                    failureReason
                }
        )
    };

}


export class D1FulfillmentPersistence
implements FulfillmentPersistence {

    private readonly orderPersistence:
        D1CommerceOrderPersistence;


    public constructor(
        private readonly database:
            D1FulfillmentDatabase
    ) {

        this.orderPersistence =
            new D1CommerceOrderPersistence(
                database
            );

    }


    public async saveOrder(
        order:
            RiverOrder
    ): Promise<void> {

        await this.orderPersistence.saveOrder(
            order
        );

    }


    public async getOrder(
        orderId:
            string
    ): Promise<RiverOrder | undefined> {

        return this.orderPersistence.getOrder(
            orderId
        );

    }


    public async getOrderByProviderOrderOrSessionId(
        providerOrderOrSessionId:
            string
    ): Promise<RiverOrder | undefined> {

        return this.orderPersistence
            .getOrderByProviderOrderOrSessionId(
                providerOrderOrSessionId
            );

    }


    public async getOrderByProviderPaymentReference(
        providerPaymentReference:
            string
    ): Promise<RiverOrder | undefined> {

        return this.orderPersistence
            .getOrderByProviderPaymentReference(
                providerPaymentReference
            );

    }


    public async saveEntitlement(
        entitlement:
            Entitlement
    ): Promise<void> {

        const validator =
            new InMemoryFulfillmentPersistence();

        const candidates =
            [
                await this.getEntitlement(
                    entitlement.entitlementId
                ),

                await this.getEntitlementByOrderId(
                    entitlement.orderId
                )
            ];

        const seeded =
            new Set<string>();

        for (
            const candidate
            of candidates
        ) {

            if (
                candidate === undefined ||
                seeded.has(
                    candidate.entitlementId
                )
            ) {

                continue;

            }

            await validator.saveEntitlement(
                candidate
            );

            seeded.add(
                candidate.entitlementId
            );

        }

        await validator.saveEntitlement(
            entitlement
        );

        await this.database
            .prepare(
                `
                    INSERT INTO fulfillment_entitlements (
                        entitlement_id,
                        order_id,
                        customer_reference,
                        product_id,
                        product_version,
                        release_id,
                        status,
                        created_at,
                        revoked_at
                    )
                    VALUES (
                        ?1, ?2, ?3, ?4, ?5,
                        ?6, ?7, ?8, ?9
                    )
                    ON CONFLICT(entitlement_id)
                    DO UPDATE SET
                        status =
                            excluded.status,
                        revoked_at =
                            excluded.revoked_at
                `
            )
            .bind(
                entitlement.entitlementId,
                entitlement.orderId,
                entitlement.customerReference,
                entitlement.productId,
                entitlement.productVersion,
                entitlement.releaseId,
                entitlement.status,
                entitlement.createdAt,
                entitlement.revokedAt ?? null
            )
            .run();

    }


    public async getEntitlement(
        entitlementId:
            string
    ): Promise<Entitlement | undefined> {

        const row =
            await this.database
                .prepare(
                    `
                        SELECT *
                        FROM fulfillment_entitlements
                        WHERE entitlement_id = ?1
                        LIMIT 1
                    `
                )
                .bind(
                    entitlementId
                )
                .first<EntitlementRow>();

        return row === null
            ? undefined
            : rowToEntitlement(
                row
            );

    }


    public async getEntitlementByOrderId(
        orderId:
            string
    ): Promise<Entitlement | undefined> {

        const row =
            await this.database
                .prepare(
                    `
                        SELECT *
                        FROM fulfillment_entitlements
                        WHERE order_id = ?1
                        LIMIT 1
                    `
                )
                .bind(
                    orderId
                )
                .first<EntitlementRow>();

        return row === null
            ? undefined
            : rowToEntitlement(
                row
            );

    }


    public async saveFulfillmentRequest(
        request:
            FulfillmentRequest
    ): Promise<void> {

        const validator =
            new InMemoryFulfillmentPersistence();

        const candidates =
            [
                await this.getFulfillmentRequest(
                    request.fulfillmentRequestId
                ),

                await this.getFulfillmentRequestByOrderId(
                    request.orderId
                )
            ];

        const seeded =
            new Set<string>();

        for (
            const candidate
            of candidates
        ) {

            if (
                candidate === undefined ||
                seeded.has(
                    candidate.fulfillmentRequestId
                )
            ) {

                continue;

            }

            await validator.saveFulfillmentRequest(
                candidate
            );

            seeded.add(
                candidate.fulfillmentRequestId
            );

        }

        await validator.saveFulfillmentRequest(
            request
        );

        await this.database
            .prepare(
                `
                    INSERT INTO fulfillment_requests (
                        fulfillment_request_id,
                        order_id,
                        product_id,
                        product_version,
                        customer_reference,
                        delivery_email,
                        payment_state,
                        payment_reference,
                        purchased_at
                    )
                    VALUES (
                        ?1, ?2, ?3, ?4, ?5,
                        ?6, ?7, ?8, ?9
                    )
                    ON CONFLICT(fulfillment_request_id)
                    DO NOTHING
                `
            )
            .bind(
                request.fulfillmentRequestId,
                request.orderId,
                request.productId,
                request.productVersion,
                request.customerReference,
                request.deliveryEmail,
                request.paymentState,
                request.paymentReference,
                request.purchasedAt
            )
            .run();

    }


    public async getFulfillmentRequest(
        fulfillmentRequestId:
            string
    ): Promise<FulfillmentRequest | undefined> {

        const row =
            await this.database
                .prepare(
                    `
                        SELECT *
                        FROM fulfillment_requests
                        WHERE fulfillment_request_id = ?1
                        LIMIT 1
                    `
                )
                .bind(
                    fulfillmentRequestId
                )
                .first<FulfillmentRequestRow>();

        return row === null
            ? undefined
            : rowToFulfillmentRequest(
                row
            );

    }


    public async getFulfillmentRequestByOrderId(
        orderId:
            string
    ): Promise<FulfillmentRequest | undefined> {

        const row =
            await this.database
                .prepare(
                    `
                        SELECT *
                        FROM fulfillment_requests
                        WHERE order_id = ?1
                        LIMIT 1
                    `
                )
                .bind(
                    orderId
                )
                .first<FulfillmentRequestRow>();

        return row === null
            ? undefined
            : rowToFulfillmentRequest(
                row
            );

    }


    public async saveFulfillmentRecord(
        record:
            FulfillmentRecord
    ): Promise<void> {

        const validator =
            new InMemoryFulfillmentPersistence();

        const candidates =
            [
                await this.getFulfillmentRecord(
                    record.fulfillmentId
                ),

                await this.getFulfillmentRecordByRequestId(
                    record.fulfillmentRequestId
                ),

                await this.getFulfillmentRecordByOrderId(
                    record.orderId
                )
            ];

        const seeded =
            new Set<string>();

        for (
            const candidate
            of candidates
        ) {

            if (
                candidate === undefined ||
                seeded.has(
                    candidate.fulfillmentId
                )
            ) {

                continue;

            }

            await validator.saveFulfillmentRecord(
                candidate
            );

            seeded.add(
                candidate.fulfillmentId
            );

        }

        await validator.saveFulfillmentRecord(
            record
        );

        await this.database
            .prepare(
                `
                    INSERT INTO fulfillment_records (
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
                    )
                    VALUES (
                        ?1, ?2, ?3, ?4, ?5, ?6,
                        ?7, ?8, ?9, ?10, ?11, ?12
                    )
                    ON CONFLICT(fulfillment_id)
                    DO UPDATE SET
                        fulfillment_state =
                            excluded.fulfillment_state,
                        delivery_state =
                            excluded.delivery_state,
                        delivery_attempted_at =
                            excluded.delivery_attempted_at,
                        delivered_at =
                            excluded.delivered_at,
                        failure_reason =
                            excluded.failure_reason
                `
            )
            .bind(
                record.fulfillmentId,
                record.fulfillmentRequestId,
                record.orderId,
                record.productId,
                record.productVersion,
                record.releaseId,
                record.entitlementId,
                record.fulfillmentState,
                record.deliveryState,
                record.deliveryAttemptedAt ?? null,
                record.deliveredAt ?? null,
                record.failureReason ?? null
            )
            .run();

    }


    public async getFulfillmentRecord(
        fulfillmentId:
            string
    ): Promise<FulfillmentRecord | undefined> {

        const row =
            await this.database
                .prepare(
                    `
                        SELECT *
                        FROM fulfillment_records
                        WHERE fulfillment_id = ?1
                        LIMIT 1
                    `
                )
                .bind(
                    fulfillmentId
                )
                .first<FulfillmentRecordRow>();

        return row === null
            ? undefined
            : rowToFulfillmentRecord(
                row
            );

    }


    public async getFulfillmentRecordByRequestId(
        fulfillmentRequestId:
            string
    ): Promise<FulfillmentRecord | undefined> {

        const row =
            await this.database
                .prepare(
                    `
                        SELECT *
                        FROM fulfillment_records
                        WHERE fulfillment_request_id = ?1
                        LIMIT 1
                    `
                )
                .bind(
                    fulfillmentRequestId
                )
                .first<FulfillmentRecordRow>();

        return row === null
            ? undefined
            : rowToFulfillmentRecord(
                row
            );

    }


    public async getFulfillmentRecordByOrderId(
        orderId:
            string
    ): Promise<FulfillmentRecord | undefined> {

        const row =
            await this.database
                .prepare(
                    `
                        SELECT *
                        FROM fulfillment_records
                        WHERE order_id = ?1
                        LIMIT 1
                    `
                )
                .bind(
                    orderId
                )
                .first<FulfillmentRecordRow>();

        return row === null
            ? undefined
            : rowToFulfillmentRecord(
                row
            );

    }

}


export function createD1FulfillmentPersistence(
    database:
        D1FulfillmentDatabase
): FulfillmentPersistence {

    return new D1FulfillmentPersistence(
        database
    );

}

