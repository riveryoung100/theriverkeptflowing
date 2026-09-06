import type {
    APIRoute
} from "astro";

import {
    env
} from "cloudflare:workers";

import {
    verifyAndIngestStripeWebhook
} from "../../../lib/commerce/stripe-webhook-ingestion";


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


function getWebhookSecret(): string {

    const runtimeEnvironment =
        env as unknown as
            Record<string, unknown>;

    const value =
        runtimeEnvironment
            .STRIPE_WEBHOOK_SECRET;

    if (
        typeof value !== "string" ||
        value.length === 0 ||
        value.trim() !== value
    ) {

        throw new Error(
            "STRIPE_WEBHOOK_SECRET is not configured."
        );

    }

    return value;

}


export const POST:
APIRoute =
async ({
    request
}) => {

    const signature =
        request.headers.get(
            "stripe-signature"
        );

    if (
        signature === null ||
        signature.length === 0
    ) {

        return jsonResponse(
            {
                received:
                    false,

                error:
                    "Missing Stripe signature."
            },
            400
        );

    }

    let webhookSecret:
        string;

    try {

        webhookSecret =
            getWebhookSecret();

    }
    catch {

        return jsonResponse(
            {
                received:
                    false,

                error:
                    "Webhook endpoint is not configured."
            },
            500
        );

    }

    const rawBody =
        await request.text();

    try {

        const result =
            await verifyAndIngestStripeWebhook({
                rawBody,
                signature,
                webhookSecret
            });

        return jsonResponse(
            {
                received:
                    true,

                handled:
                    result.status ===
                    "handled",

                eventType:
                    result.eventType,

                providerEventId:
                    result.providerEventId
            },
            200
        );

    }
    catch {

        return jsonResponse(
            {
                received:
                    false,

                error:
                    "Invalid Stripe webhook."
            },
            400
        );

    }

};
