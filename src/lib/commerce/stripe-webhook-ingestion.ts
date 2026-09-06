import Stripe from "stripe";

import type {
    PaymentState
} from "../fulfillment/types";

import {
    adaptVerifiedStripePaymentEvidence
} from "./stripe-payment-adapter";

import type {
    VerifiedStripePaymentEvidence
} from "./stripe-payment-adapter";

import type {
    VerifiedPaymentEvent
} from "./payment-event";


const SUPPORTED_STRIPE_CHECKOUT_EVENT_TYPES =
new Set<string>([
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed"
]);


export interface StripeWebhookIngestionInput {

    rawBody:
        string;

    signature:
        string;

    webhookSecret:
        string;

}


export interface HandledStripeWebhookIngestion {

    status:
        "handled";

    eventType:
        string;

    providerEventId:
        string;

    paymentEvent:
        VerifiedPaymentEvent;

}


export interface IgnoredStripeWebhookIngestion {

    status:
        "ignored";

    eventType:
        string;

    providerEventId:
        string;

}


export type StripeWebhookIngestionResult =
    | HandledStripeWebhookIngestion
    | IgnoredStripeWebhookIngestion;


function requireNonEmptyString(
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
            `${fieldName} must be a non-empty trimmed string.`
        );

    }

    return value;

}


function requireUnixTimestamp(
    value:
        unknown,
    fieldName:
        string
): number {

    if (
        typeof value !== "number" ||
        !Number.isInteger(value) ||
        value < 0
    ) {

        throw new Error(
            `${fieldName} must be a non-negative integer Unix timestamp.`
        );

    }

    return value;

}


function toIsoTimestamp(
    value:
        number,
    fieldName:
        string
): string {

    const timestamp =
        new Date(
            value * 1000
        );

    if (
        Number.isNaN(
            timestamp.getTime()
        )
    ) {

        throw new Error(
            `${fieldName} must produce a valid timestamp.`
        );

    }

    return timestamp.toISOString();

}


function getExpandableId(
    value:
        {
            id:
                string;
        }
        | string
        | null,
    fieldName:
        string
): string {

    if (
        typeof value === "string"
    ) {

        return requireNonEmptyString(
            value,
            fieldName
        );

    }

    if (
        value !== null &&
        typeof value === "object"
    ) {

        return requireNonEmptyString(
            value.id,
            fieldName
        );

    }

    throw new Error(
        `${fieldName} is required.`
    );

}


function getDeliveryEmail(
    session:
        Stripe.Checkout.Session
): string {

    const customerDetailsEmail =
        session.customer_details?.email;

    if (
        typeof customerDetailsEmail === "string" &&
        customerDetailsEmail.length > 0
    ) {

        return requireNonEmptyString(
            customerDetailsEmail,
            "Stripe checkout delivery email"
        );

    }

    if (
        typeof session.customer_email === "string" &&
        session.customer_email.length > 0
    ) {

        return requireNonEmptyString(
            session.customer_email,
            "Stripe checkout delivery email"
        );

    }

    throw new Error(
        "Stripe checkout delivery email is required."
    );

}


function getRequiredMetadata(
    session:
        Stripe.Checkout.Session,
    key:
        string
): string {

    const value =
        session.metadata?.[key];

    return requireNonEmptyString(
        value,
        `Stripe checkout metadata.${key}`
    );

}


function getUsdAmount(
    session:
        Stripe.Checkout.Session
): number {

    if (
        session.currency !== "usd"
    ) {

        throw new Error(
            "PRODUCT-001E V1 Stripe checkout ingestion requires USD currency."
        );

    }

    if (
        typeof session.amount_total !== "number" ||
        !Number.isInteger(
            session.amount_total
        ) ||
        session.amount_total < 0
    ) {

        throw new Error(
            "Stripe checkout amount_total must be a non-negative integer."
        );

    }

    return (
        session.amount_total /
        100
    );

}


function determinePaymentState(
    eventType:
        string,
    session:
        Stripe.Checkout.Session
): PaymentState {

    if (
        eventType ===
        "checkout.session.async_payment_succeeded"
    ) {

        return "paid";

    }

    if (
        eventType ===
        "checkout.session.async_payment_failed"
    ) {

        return "failed";

    }

    if (
        eventType ===
        "checkout.session.completed"
    ) {

        return (
            session.payment_status === "paid"
                ? "paid"
                : "pending"
        );

    }

    return "unknown";

}


export function normalizeVerifiedStripeCheckoutEvent(
    event:
        Stripe.Event
): VerifiedStripePaymentEvidence {

    if (
        !SUPPORTED_STRIPE_CHECKOUT_EVENT_TYPES.has(
            event.type
        )
    ) {

        throw new Error(
            `Unsupported Stripe checkout event type: ${event.type}`
        );

    }

    const providerEventId =
        requireNonEmptyString(
            event.id,
            "Stripe event id"
        );

    const eventCreated =
        requireUnixTimestamp(
            event.created,
            "Stripe event created"
        );

    const session =
        event.data.object as
            Stripe.Checkout.Session;

    if (
        session.object !==
        "checkout.session"
    ) {

        throw new Error(
            "Stripe webhook event data must contain a Checkout Session."
        );

    }

    const checkoutSessionId =
        requireNonEmptyString(
            session.id,
            "Stripe checkout session id"
        );

    const paymentIntentId =
        getExpandableId(
            session.payment_intent,
            "Stripe payment intent id"
        );

    const customerReference =
        getRequiredMetadata(
            session,
            "river_customer_reference"
        );

    const productId =
        getRequiredMetadata(
            session,
            "river_product_id"
        );

    const productVersion =
        getRequiredMetadata(
            session,
            "river_product_version"
        );

    const deliveryEmail =
        getDeliveryEmail(
            session
        );

    const amount =
        getUsdAmount(
            session
        );

    const paymentState =
        determinePaymentState(
            event.type,
            session
        );

    const eventCreatedAt =
        toIsoTimestamp(
            eventCreated,
            "Stripe event created"
        );

    return {
        verificationState:
            "verified",

        eventId:
            providerEventId,

        checkoutSessionId,

        paymentIntentId,

        customerReference,

        deliveryEmail,

        productId,

        productVersion,

        amount,

        currency:
            "usd",

        paymentState,

        eventCreatedAt,

        ...(
            paymentState === "paid"
                ? {
                    paidAt:
                        eventCreatedAt
                }
                : {}
        )
    };

}


export async function verifyAndIngestStripeWebhook(
    input:
        StripeWebhookIngestionInput
): Promise<StripeWebhookIngestionResult> {

    const rawBody =
        requireNonEmptyString(
            input.rawBody,
            "Stripe raw webhook body"
        );

    const signature =
        requireNonEmptyString(
            input.signature,
            "Stripe-Signature header"
        );

    const webhookSecret =
        requireNonEmptyString(
            input.webhookSecret,
            "Stripe webhook secret"
        );

    const event =
        await Stripe.webhooks
            .constructEventAsync(
                rawBody,
                signature,
                webhookSecret,
                undefined,
                Stripe.createSubtleCryptoProvider()
            );

    const providerEventId =
        requireNonEmptyString(
            event.id,
            "Stripe event id"
        );

    if (
        !SUPPORTED_STRIPE_CHECKOUT_EVENT_TYPES.has(
            event.type
        )
    ) {

        return {
            status:
                "ignored",

            eventType:
                event.type,

            providerEventId
        };

    }

    const evidence =
        normalizeVerifiedStripeCheckoutEvent(
            event
        );

    const paymentEvent =
        adaptVerifiedStripePaymentEvidence(
            evidence
        );

    return {
        status:
            "handled",

        eventType:
            event.type,

        providerEventId,

        paymentEvent
    };

}
