import type {
    VerifiedPaymentEvent
} from "./payment-event";

import {
    RIVER_LIFE_OPERATING_SYSTEM_COMMERCE_PRODUCT,
} from "./product-catalog";

import {
    D1FulfillmentPersistence
} from "./d1-fulfillment-persistence";

import {
    R2ApprovedReleaseResolver,
    type R2ReleaseBucket
} from "./r2-approved-release-resolver";

import {
    ResendDeliveryProvider
} from "./resend-delivery-provider";

import {
    handoffVerifiedPaidOrderAtRuntime
} from "./runtime-paid-order-handoff";


type CommerceDatabase =
    ConstructorParameters<
        typeof D1FulfillmentPersistence
    >[0];


export interface StripeWebhookRuntimeEnvironment {

    readonly RIVER_COMMERCE_DB:
        unknown;

    readonly RIVER_PRODUCT_RELEASES:
        unknown;

    readonly RESEND_API_KEY:
        unknown;

    readonly RIVER_DELIVERY_FROM:
        unknown;

}


export interface StripeWebhookRuntimeInput {

    readonly paymentEvent:
        VerifiedPaymentEvent;

    readonly environment:
        StripeWebhookRuntimeEnvironment;

}


function requireNormalizedText(
    value:
        unknown,
    name:
        string
): string {

    if (
        typeof value !==
            "string" ||
        value.length ===
            0 ||
        value.trim() !==
            value
    ) {

        throw new TypeError(
            `${name} must be a normalized non-empty string.`
        );

    }

    return value;

}


function requireCommerceDatabase(
    value:
        unknown
): CommerceDatabase {

    if (
        typeof value !==
            "object" ||
        value ===
            null ||
        !(
            "prepare"
            in value
        ) ||
        typeof (
            value as {
                prepare?:
                    unknown;
            }
        ).prepare !==
            "function"
    ) {

        throw new TypeError(
            "RIVER_COMMERCE_DB is not configured."
        );

    }

    return value as
        CommerceDatabase;

}


function requireReleaseBucket(
    value:
        unknown
): R2ReleaseBucket {

    if (
        typeof value !==
            "object" ||
        value ===
            null ||
        !(
            "get"
            in value
        ) ||
        typeof (
            value as {
                get?:
                    unknown;
            }
        ).get !==
            "function"
    ) {

        throw new TypeError(
            "RIVER_PRODUCT_RELEASES is not configured."
        );

    }

    return value as
        R2ReleaseBucket;

}


export async function processStripeWebhookPaymentAtRuntime(
    input:
        StripeWebhookRuntimeInput
) {

    if (
        input.paymentEvent.paymentState !==
            "paid"
    ) {

        return {
            status:
                "no-fulfillment-required" as const,

            paymentState:
                input.paymentEvent.paymentState
        };

    }

    const persistence =
        new D1FulfillmentPersistence(
            requireCommerceDatabase(
                input.environment
                    .RIVER_COMMERCE_DB
            )
        );

    const releaseResolver =
        new R2ApprovedReleaseResolver(
            requireReleaseBucket(
                input.environment
                    .RIVER_PRODUCT_RELEASES
            ),
            {
                productId:
                    RIVER_LIFE_OPERATING_SYSTEM_COMMERCE_PRODUCT.productId,

                productVersion:
                    RIVER_LIFE_OPERATING_SYSTEM_COMMERCE_PRODUCT.productVersion,

                releaseId:
                    RIVER_LIFE_OPERATING_SYSTEM_COMMERCE_PRODUCT.approvedReleaseId,

                keyPrefix:
                    "releases"
            }
        );

    const deliveryProvider =
        new ResendDeliveryProvider({
            apiKey:
                requireNormalizedText(
                    input.environment
                        .RESEND_API_KEY,
                    "RESEND_API_KEY"
                ),

            from:
                requireNormalizedText(
                    input.environment
                        .RIVER_DELIVERY_FROM,
                    "RIVER_DELIVERY_FROM"
                )
        });

    const result =
        await handoffVerifiedPaidOrderAtRuntime(
            {
                paymentEvent:
                    input.paymentEvent,

                occurredAt:
                    input.paymentEvent
                        .eventCreatedAt,

                message: {
                    subject:
                        RIVER_LIFE_OPERATING_SYSTEM_COMMERCE_PRODUCT.deliverySubject,

                    text:
                        RIVER_LIFE_OPERATING_SYSTEM_COMMERCE_PRODUCT.deliveryText
                }
            },
            {
                persistence,
                releaseResolver,
                deliveryProvider
            }
        );

    return {
        status:
            "fulfilled" as const,

        result
    };

}
