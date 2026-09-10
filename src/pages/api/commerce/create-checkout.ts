import type {
    APIRoute
} from "astro";

import {
    env
} from "cloudflare:workers";

import Stripe from "stripe";

import {
    requireStripeSandboxSecretKey
} from "../../../lib/commerce/stripe-sandbox-secret-key";

import {
    createRegisteredRiverProductCheckout
} from "../../../lib/commerce/stripe-checkout";

import {
    RIVER_LIFE_OPERATING_SYSTEM_COMMERCE_PRODUCT
} from "../../../lib/commerce/product-catalog";


export const prerender =
    false;


function jsonResponse(
    body:
        Record<string, unknown>,
    status:
        number
): Response {

    return new Response(
        JSON.stringify(
            body
        ),
        {
            status,
            headers: {
                "content-type":
                    "application/json; charset=utf-8",

                "cache-control":
                    "no-store"
            }
        }
    );
}


function getStripeSecretKey(): string {

    const runtimeEnvironment =
        env as unknown as
            Record<string, unknown>;

    return requireStripeSandboxSecretKey(
        runtimeEnvironment
            .STRIPE_SECRET_KEY
    );
}


function readString(
    body:
        Record<string, unknown>,
    key:
        string
): string {

    const value =
        body[key];

    if (
        typeof value !== "string"
    ) {

        throw new Error(
            `${key} must be a string.`
        );
    }

    return value;
}


function readOptionalString(
    body:
        Record<string, unknown>,
    key:
        string,
    fallback:
        string
): string {

    if (
        !Object.prototype.hasOwnProperty.call(
            body,
            key
        )
    ) {
        return fallback;
    }

    return readString(
        body,
        key
    );
}

export const POST:
APIRoute =
async ({
    request,
    url
}) => {

    let secretKey:
        string;

    try {

        secretKey =
            getStripeSecretKey();

    }
    catch {

        return jsonResponse(
            {
                created:
                    false,

                error:
                    "Checkout endpoint is not configured."
            },
            500
        );
    }

    let body:
        Record<string, unknown>;

    try {

        const parsed =
            await request.json();

        if (
            typeof parsed !== "object" ||
            parsed === null ||
            Array.isArray(parsed)
        ) {

            throw new Error(
                "Checkout request must be an object."
            );
        }

        body =
            parsed as
                Record<string, unknown>;

    }
    catch {

        return jsonResponse(
            {
                created:
                    false,

                error:
                    "Invalid checkout request."
            },
            400
        );
    }

    try {

        const stripe =
            new Stripe(
                secretKey
            );

        const checkout =
            await createRegisteredRiverProductCheckout(
                stripe,
                readOptionalString(
                    body,
                    "productId",
                    RIVER_LIFE_OPERATING_SYSTEM_COMMERCE_PRODUCT.productId
                ),
                readOptionalString(
                    body,
                    "productVersion",
                    RIVER_LIFE_OPERATING_SYSTEM_COMMERCE_PRODUCT.productVersion
                ),
                {
                    customerReference:
                        readString(
                            body,
                            "customerReference"
                        ),

                    deliveryEmail:
                        readString(
                            body,
                            "deliveryEmail"
                        ),

                    origin:
                        url.origin
                }
            );

        return jsonResponse(
            {
                created:
                    true,

                provider:
                    checkout.provider,

                checkoutSessionId:
                    checkout.checkoutSessionId,

                checkoutUrl:
                    checkout.checkoutUrl
            },
            201
        );

    }
    catch {

        return jsonResponse(
            {
                created:
                    false,

                error:
                    "Unable to create checkout."
            },
            400
        );
    }
};
