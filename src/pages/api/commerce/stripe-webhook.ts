import type {
    APIRoute
} from "astro";

import {
    env
} from "cloudflare:workers";

import {
    processStripeWebhookPaymentAtRuntime,
    type StripeWebhookRuntimeEnvironment
} from "../../../lib/commerce/stripe-webhook-runtime";

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


function getRuntimeEnvironment():
StripeWebhookRuntimeEnvironment {

    return env as unknown as
        StripeWebhookRuntimeEnvironment;

}


function getWebhookSecret(
    runtimeEnvironment:
        StripeWebhookRuntimeEnvironment
): string {

    const value =
        (
            runtimeEnvironment as
                unknown as
                Record<string, unknown>
        ).STRIPE_WEBHOOK_SECRET;

    if (
        typeof value !==
            "string" ||
        value.length ===
            0 ||
        value.trim() !==
            value
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
        signature ===
            null ||
        signature.length ===
            0
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

    const runtimeEnvironment =
        getRuntimeEnvironment();

    let webhookSecret:
        string;

    try {

        webhookSecret =
            getWebhookSecret(
                runtimeEnvironment
            );

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

    let ingestion:
        Awaited<
            ReturnType<
                typeof verifyAndIngestStripeWebhook
            >
        >;

    try {

        ingestion =
            await verifyAndIngestStripeWebhook({
                rawBody,
                signature,
                webhookSecret
            });

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

    if (
        ingestion.status ===
            "ignored"
    ) {

        return jsonResponse(
            {
                received:
                    true,

                handled:
                    false,

                eventType:
                    ingestion.eventType,

                providerEventId:
                    ingestion.providerEventId
            },
            200
        );

    }

    if (
        ingestion.paymentEvent
            .paymentState !==
            "paid"
    ) {

        return jsonResponse(
            {
                received:
                    true,

                handled:
                    true,

                fulfilled:
                    false,

                paymentState:
                    ingestion.paymentEvent
                        .paymentState,

                eventType:
                    ingestion.eventType,

                providerEventId:
                    ingestion.providerEventId
            },
            200
        );

    }

    try {

        await processStripeWebhookPaymentAtRuntime({
            paymentEvent:
                ingestion.paymentEvent,

            environment:
                runtimeEnvironment
        });

    }
    catch (error) {

        console.error(
            "Stripe paid-order runtime processing failed.",
            error
        );

        /*
         * Returning a non-2xx response is intentional.
         * Stripe may redeliver the verified event, while
         * durable fulfillment idempotency prevents a
         * successful delivery from being duplicated.
         */
        return jsonResponse(
            {
                received:
                    false,

                handled:
                    true,

                fulfilled:
                    false,

                error:
                    "Paid-order runtime processing failed.",

                providerEventId:
                    ingestion.providerEventId
            },
            500
        );

    }

    return jsonResponse(
        {
            received:
                true,

            handled:
                true,

            fulfilled:
                true,

            eventType:
                ingestion.eventType,

            providerEventId:
                ingestion.providerEventId
        },
        200
    );

};
