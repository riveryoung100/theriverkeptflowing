import type {
    PaymentState
} from "../fulfillment/types";

import {
    assertVerifiedPaymentEvent
} from "./payment-event";

import type {
    VerifiedPaymentEvent
} from "./payment-event";


export interface VerifiedStripePaymentEvidence {

    verificationState:
        "verified";

    eventId:
        string;

    checkoutSessionId:
        string;

    paymentIntentId:
        string;

    customerReference:
        string;

    deliveryEmail:
        string;

    productId:
        string;

    productVersion:
        string;

    amount:
        number;

    currency:
        string;

    paymentState:
        PaymentState;

    eventCreatedAt:
        string;

    paidAt?:
        string;

}


export function adaptVerifiedStripePaymentEvidence(
    evidence:
        VerifiedStripePaymentEvidence
): VerifiedPaymentEvent {

    const event:
        VerifiedPaymentEvent =
        {
            verificationState:
                evidence.verificationState,

            provider:
                "stripe",

            providerEventId:
                evidence.eventId,

            providerOrderOrSessionId:
                evidence.checkoutSessionId,

            providerPaymentReference:
                evidence.paymentIntentId,

            customerReference:
                evidence.customerReference,

            deliveryEmail:
                evidence.deliveryEmail,

            productId:
                evidence.productId,

            productVersion:
                evidence.productVersion,

            amount:
                evidence.amount,

            currency:
                evidence.currency,

            paymentState:
                evidence.paymentState,

            eventCreatedAt:
                evidence.eventCreatedAt,

            ...(
                evidence.paidAt === undefined
                    ? {}
                    : {
                        paidAt:
                            evidence.paidAt
                    }
            )
        };

    assertVerifiedPaymentEvent(
        event
    );

    return event;

}
