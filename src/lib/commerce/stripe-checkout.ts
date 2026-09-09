import Stripe from "stripe";

import {
    RIVER_LIFE_OPERATING_SYSTEM_COMMERCE_PRODUCT,
} from "./product-catalog";


export const RIVER_LIFE_OPERATING_SYSTEM_PRODUCT_ID =
    RIVER_LIFE_OPERATING_SYSTEM_COMMERCE_PRODUCT.productId;

export const RIVER_LIFE_OPERATING_SYSTEM_PRODUCT_VERSION =
    RIVER_LIFE_OPERATING_SYSTEM_COMMERCE_PRODUCT.productVersion;


export interface RiverCheckoutProduct {
    productId:
        string;

    productVersion:
        string;

    productName:
        string;

    unitAmountUsdCents:
        number;
}


export interface RiverCheckoutRequest {
    customerReference:
        string;

    deliveryEmail:
        string;

    origin:
        string;
}


export interface RiverCheckoutSession {
    provider:
        "stripe";

    checkoutSessionId:
        string;

    checkoutUrl:
        string;
}


export interface StripeCheckoutSessionCreator {
    checkout:
        {
            sessions:
                {
                    create(
                        params:
                            Stripe.Checkout.SessionCreateParams
                    ):
                        Promise<Stripe.Checkout.Session>;
                };
        };
}


export const riverLifeOperatingSystemCheckoutProduct:
    RiverCheckoutProduct =
    RIVER_LIFE_OPERATING_SYSTEM_COMMERCE_PRODUCT;


function requireNormalizedValue(
    value:
        string,
    label:
        string
): string {

    if (
        value.length === 0 ||
        value.trim() !== value
    ) {

        throw new Error(
            `${label} must be a non-empty normalized string.`
        );
    }

    return value;
}


function requireCheckoutOrigin(
    value:
        string
): string {

    const normalized =
        requireNormalizedValue(
            value,
            "Checkout origin"
        );

    const parsed =
        new URL(
            normalized
        );

    if (
        parsed.protocol !== "https:" &&
        parsed.hostname !== "localhost"
    ) {

        throw new Error(
            "Checkout origin must use HTTPS outside localhost."
        );
    }

    if (
        parsed.pathname !== "/" ||
        parsed.search.length !== 0 ||
        parsed.hash.length !== 0
    ) {

        throw new Error(
            "Checkout origin must not contain a path, query, or fragment."
        );
    }

    return parsed.origin;
}


function requireDeliveryEmail(
    value:
        string
): string {

    const normalized =
        requireNormalizedValue(
            value,
            "Delivery email"
        );

    if (
        !normalized.includes("@")
    ) {

        throw new Error(
            "Delivery email must contain @."
        );
    }

    return normalized;
}


export async function createRiverLifeOperatingSystemCheckout(
    stripe:
        StripeCheckoutSessionCreator,
    request:
        RiverCheckoutRequest
): Promise<RiverCheckoutSession> {

    const customerReference =
        requireNormalizedValue(
            request.customerReference,
            "River customer reference"
        );

    const deliveryEmail =
        requireDeliveryEmail(
            request.deliveryEmail
        );

    const origin =
        requireCheckoutOrigin(
            request.origin
        );

    const product =
        riverLifeOperatingSystemCheckoutProduct;

    const session =
        await stripe.checkout.sessions.create({
            mode:
                "payment",

            customer_email:
                deliveryEmail,

            client_reference_id:
                customerReference,

            line_items: [
                {
                    quantity:
                        1,

                    price_data: {
                        currency:
                            "usd",

                        unit_amount:
                            product.unitAmountUsdCents,

                        product_data: {
                            name:
                                product.productName,

                            metadata: {
                                river_product_id:
                                    product.productId,

                                river_product_version:
                                    product.productVersion
                            }
                        }
                    }
                }
            ],

            metadata: {
                river_customer_reference:
                    customerReference,

                river_product_id:
                    product.productId,

                river_product_version:
                    product.productVersion
            },

            payment_intent_data: {
                metadata: {
                    river_customer_reference:
                        customerReference,

                    river_product_id:
                        product.productId,

                    river_product_version:
                        product.productVersion
                }
            },

            success_url:
                `${origin}/shop?checkout=success&session_id={CHECKOUT_SESSION_ID}`,

            cancel_url:
                `${origin}/shop?checkout=cancelled`
        });

    if (
        typeof session.id !== "string" ||
        session.id.length === 0 ||
        session.id.trim() !== session.id
    ) {

        throw new Error(
            "Stripe Checkout did not return a normalized session identity."
        );
    }

    if (
        typeof session.url !== "string" ||
        session.url.length === 0 ||
        session.url.trim() !== session.url
    ) {

        throw new Error(
            "Stripe Checkout did not return a checkout URL."
        );
    }

    return {
        provider:
            "stripe",

        checkoutSessionId:
            session.id,

        checkoutUrl:
            session.url
    };
}
