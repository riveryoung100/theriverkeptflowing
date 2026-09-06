import type {
    FulfillmentPersistence
} from "../fulfillment/persistence";

import {
    InMemoryFulfillmentPersistence
} from "../fulfillment/persistence";

import type {
    PaymentState,
    RiverOrder
} from "../fulfillment/types";


type OrderPersistenceSurface =
    Pick<
        FulfillmentPersistence,
        | "saveOrder"
        | "getOrder"
        | "getOrderByProviderOrderOrSessionId"
        | "getOrderByProviderPaymentReference"
    >;


interface CommerceOrderRow {

    order_id:
        unknown;

    provider:
        unknown;

    provider_order_or_session_id:
        unknown;

    provider_payment_reference:
        unknown;

    customer_reference:
        unknown;

    delivery_email:
        unknown;

    product_id:
        unknown;

    product_version:
        unknown;

    amount:
        unknown;

    currency:
        unknown;

    payment_state:
        unknown;

    created_at:
        unknown;

    paid_at:
        unknown;

}


const orderColumns =
    [
        "order_id",
        "provider",
        "provider_order_or_session_id",
        "provider_payment_reference",
        "customer_reference",
        "delivery_email",
        "product_id",
        "product_version",
        "amount",
        "currency",
        "payment_state",
        "created_at",
        "paid_at"
    ].join(
        ", "
    );


const selectByOrderIdSql =
    `
        SELECT ${orderColumns}
        FROM commerce_orders
        WHERE order_id = ?1
        LIMIT 1
    `;


const selectByProviderOrderSql =
    `
        SELECT ${orderColumns}
        FROM commerce_orders
        WHERE provider_order_or_session_id = ?1
        LIMIT 1
    `;


const selectByProviderPaymentSql =
    `
        SELECT ${orderColumns}
        FROM commerce_orders
        WHERE provider_payment_reference = ?1
        LIMIT 1
    `;


const saveOrderSql =
    `
        INSERT INTO commerce_orders (
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
        )
        VALUES (
            ?1,
            ?2,
            ?3,
            ?4,
            ?5,
            ?6,
            ?7,
            ?8,
            ?9,
            ?10,
            ?11,
            ?12,
            ?13
        )
        ON CONFLICT(order_id)
        DO UPDATE SET
            payment_state =
                excluded.payment_state,
            paid_at =
                excluded.paid_at
    `;


const paymentStates:
    readonly PaymentState[] =
    [
        "pending",
        "paid",
        "failed",
        "refunded",
        "disputed",
        "unknown"
    ];


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
            `Stored commerce order has invalid ${fieldName}.`
        );

    }

    return value;

}


function requireStoredAmount(
    value:
        unknown
): number {

    if (
        typeof value !== "number" ||
        !Number.isFinite(
            value
        ) ||
        value < 0
    ) {

        throw new Error(
            "Stored commerce order has invalid amount."
        );

    }

    return value;

}


function requireStoredPaymentState(
    value:
        unknown
): PaymentState {

    if (
        typeof value !== "string" ||
        !paymentStates.includes(
            value as PaymentState
        )
    ) {

        throw new Error(
            "Stored commerce order has invalid payment_state."
        );

    }

    return value as PaymentState;

}


function optionalStoredTimestamp(
    value:
        unknown
): string | undefined {

    if (
        value === null ||
        value === undefined
    ) {

        return undefined;

    }

    return requireStoredString(
        value,
        "paid_at"
    );

}


function rowToRiverOrder(
    row:
        CommerceOrderRow
): RiverOrder {

    const paidAt =
        optionalStoredTimestamp(
            row.paid_at
        );

    return {
        orderId:
            requireStoredString(
                row.order_id,
                "order_id"
            ),

        provider:
            requireStoredString(
                row.provider,
                "provider"
            ),

        providerOrderOrSessionId:
            requireStoredString(
                row.provider_order_or_session_id,
                "provider_order_or_session_id"
            ),

        providerPaymentReference:
            requireStoredString(
                row.provider_payment_reference,
                "provider_payment_reference"
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

        amount:
            requireStoredAmount(
                row.amount
            ),

        currency:
            requireStoredString(
                row.currency,
                "currency"
            ),

        paymentState:
            requireStoredPaymentState(
                row.payment_state
            ),

        createdAt:
            requireStoredString(
                row.created_at,
                "created_at"
            ),

        ...(
            paidAt === undefined
                ? {}
                : {
                    paidAt
                }
        )
    };

}


async function validateOrderAgainstExistingState(
    persistence:
        D1CommerceOrderPersistence,
    order:
        RiverOrder
): Promise<void> {

    const validator =
        new InMemoryFulfillmentPersistence();

    const candidates =
        [
            await persistence.getOrder(
                order.orderId
            ),

            await persistence
                .getOrderByProviderOrderOrSessionId(
                    order.providerOrderOrSessionId
                ),

            await persistence
                .getOrderByProviderPaymentReference(
                    order.providerPaymentReference
                )
        ];

    const seededOrderIds =
        new Set<string>();

    for (
        const candidate
        of candidates
    ) {

        if (
            candidate === undefined ||
            seededOrderIds.has(
                candidate.orderId
            )
        ) {

            continue;

        }

        await validator.saveOrder(
            candidate
        );

        seededOrderIds.add(
            candidate.orderId
        );

    }

    await validator.saveOrder(
        order
    );

}


export class D1CommerceOrderPersistence
implements OrderPersistenceSurface {

    public constructor(
        private readonly database:
            D1Database
    ) {}


    public async saveOrder(
        order:
            RiverOrder
    ): Promise<void> {

        await validateOrderAgainstExistingState(
            this,
            order
        );

        await this.database
            .prepare(
                saveOrderSql
            )
            .bind(
                order.orderId,
                order.provider,
                order.providerOrderOrSessionId,
                order.providerPaymentReference,
                order.customerReference,
                order.deliveryEmail,
                order.productId,
                order.productVersion,
                order.amount,
                order.currency,
                order.paymentState,
                order.createdAt,
                order.paidAt ?? null
            )
            .run();

    }


    public async getOrder(
        orderId:
            string
    ): Promise<RiverOrder | undefined> {

        return this.getOne(
            selectByOrderIdSql,
            orderId
        );

    }


    public async getOrderByProviderOrderOrSessionId(
        providerOrderOrSessionId:
            string
    ): Promise<RiverOrder | undefined> {

        return this.getOne(
            selectByProviderOrderSql,
            providerOrderOrSessionId
        );

    }


    public async getOrderByProviderPaymentReference(
        providerPaymentReference:
            string
    ): Promise<RiverOrder | undefined> {

        return this.getOne(
            selectByProviderPaymentSql,
            providerPaymentReference
        );

    }


    private async getOne(
        sql:
            string,
        identity:
            string
    ): Promise<RiverOrder | undefined> {

        const row =
            await this.database
                .prepare(
                    sql
                )
                .bind(
                    identity
                )
                .first<CommerceOrderRow>();

        if (row === null) {

            return undefined;

        }

        return rowToRiverOrder(
            row
        );

    }

}


export function createD1CommerceOrderPersistence(
    database:
        D1Database
): OrderPersistenceSurface {

    return new D1CommerceOrderPersistence(
        database
    );

}
