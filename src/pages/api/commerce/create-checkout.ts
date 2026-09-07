import type {
    APIRoute
} from "astro";

import {
    env
} from "cloudflare:workers";

import Stripe from "stripe";

import {
    createRiverLifeOperatingSystemCheckout
} from "../../../lib/commerce/stripe-checkout";


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

    const value =
        runtimeEnvironment
            .STRIPE_SECRET_KEY;

    if (
        typeof value !== "string" ||
        value.length === 0 ||
        value.trim() !== value
    ) {

        throw new Error(
            "STRIPE_SECRET_KEY is not configured."
        );
    }

    return value;
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
            await createRiverLifeOperatingSystemCheckout(
                stripe,
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
    catch (error) {

        const stripeError =
            error as {
                type?: unknown;
                code?: unknown;
                param?: unknown;
                statusCode?: unknown;
                requestId?: unknown;
            };

        console.error(
            "Stripe checkout session creation failed.",
            {
                type:
                    typeof stripeError.type === "string"
                        ? stripeError.type
                        : null,

                code:
                    typeof stripeError.code === "string"
                        ? stripeError.code
                        : null,

                param:
                    typeof stripeError.param === "string"
                        ? stripeError.param
                        : null,

                statusCode:
                    typeof stripeError.statusCode === "number"
                        ? stripeError.statusCode
                        : null,

                requestId:
                    typeof stripeError.requestId === "string"
                        ? stripeError.requestId
                        : null
            }
        );

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