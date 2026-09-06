import type {
    PaymentState,
    RiverOrder
} from "../fulfillment/types";


export interface PaymentEventIdentity {

    provider:
        string;

    providerEventId:
        string;

    providerOrderOrSessionId:
        string;

    providerPaymentReference:
        string;

}


export interface VerifiedPaymentEvent
extends PaymentEventIdentity {

    verificationState:
        "verified";

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


export interface PaymentEventVerificationFailure
extends PaymentEventIdentity {

    verificationState:
        "rejected";

    code:
        string;

    message:
        string;

}


export type PaymentEventVerificationResult =
    VerifiedPaymentEvent |
    PaymentEventVerificationFailure;


export interface PaymentEventVerifier {

    verify(
        event:
            unknown
    ):
        Promise<PaymentEventVerificationResult>;

}


export interface ProviderOrderAdapter {

    toRiverOrder(
        event:
            VerifiedPaymentEvent
    ):
        RiverOrder;

}


function assertNonEmptyIdentity(
    value:
        string,
    fieldName:
        string
): void {

    if (
        value.length === 0 ||
        value.trim() !== value
    ) {
        throw new Error(
            `${fieldName} must be a non-empty canonical identity.`
        );
    }

}


function assertFiniteNonNegativeAmount(
    amount:
        number
): void {

    if (
        !Number.isFinite(amount) ||
        amount < 0
    ) {
        throw new Error(
            "amount must be a finite non-negative number."
        );
    }

}


function assertTimestamp(
    value:
        string,
    fieldName:
        string
): void {

    if (
        value.length === 0 ||
        value.trim() !== value ||
        Number.isNaN(
            Date.parse(value)
        )
    ) {
        throw new Error(
            `${fieldName} must be a valid timestamp.`
        );
    }

}


function assertPaymentState(
    paymentState:
        PaymentState
): void {

    const supportedStates:
        readonly PaymentState[] =
        [
            "pending",
            "paid",
            "failed",
            "refunded",
            "disputed",
            "unknown"
        ];

    if (
        !supportedStates.includes(
            paymentState
        )
    ) {
        throw new Error(
            "paymentState is not supported."
        );
    }

}


export function assertVerifiedPaymentEvent(
    event:
        VerifiedPaymentEvent
): void {

    if (
        event.verificationState !==
        "verified"
    ) {
        throw new Error(
            "payment event must be verified before normalization."
        );
    }

    assertNonEmptyIdentity(
        event.provider,
        "provider"
    );

    assertNonEmptyIdentity(
        event.providerEventId,
        "providerEventId"
    );

    assertNonEmptyIdentity(
        event.providerOrderOrSessionId,
        "providerOrderOrSessionId"
    );

    assertNonEmptyIdentity(
        event.providerPaymentReference,
        "providerPaymentReference"
    );

    assertNonEmptyIdentity(
        event.customerReference,
        "customerReference"
    );

    assertNonEmptyIdentity(
        event.deliveryEmail,
        "deliveryEmail"
    );

    assertNonEmptyIdentity(
        event.productId,
        "productId"
    );

    assertNonEmptyIdentity(
        event.productVersion,
        "productVersion"
    );

    assertFiniteNonNegativeAmount(
        event.amount
    );

    assertNonEmptyIdentity(
        event.currency,
        "currency"
    );

    assertPaymentState(
        event.paymentState
    );

    assertTimestamp(
        event.eventCreatedAt,
        "eventCreatedAt"
    );

    if (
        event.paymentState === "paid" &&
        event.paidAt === undefined
    ) {
        throw new Error(
            "paidAt is required when paymentState is paid."
        );
    }

    if (
        event.paidAt !== undefined
    ) {
        assertTimestamp(
            event.paidAt,
            "paidAt"
        );
    }

}


export function buildCanonicalRiverOrderId(
    event:
        Pick<
            VerifiedPaymentEvent,
            | "provider"
            | "providerOrderOrSessionId"
        >
): string {

    assertNonEmptyIdentity(
        event.provider,
        "provider"
    );

    assertNonEmptyIdentity(
        event.providerOrderOrSessionId,
        "providerOrderOrSessionId"
    );

    return [
        "order",
        event.provider,
        event.providerOrderOrSessionId
    ].join(":");

}


export function normalizeVerifiedPaymentEvent(
    event:
        VerifiedPaymentEvent
): RiverOrder {

    assertVerifiedPaymentEvent(
        event
    );

    return {
        orderId:
            buildCanonicalRiverOrderId(
                event
            ),

        provider:
            event.provider,

        providerOrderOrSessionId:
            event.providerOrderOrSessionId,

        providerPaymentReference:
            event.providerPaymentReference,

        customerReference:
            event.customerReference,

        deliveryEmail:
            event.deliveryEmail,

        productId:
            event.productId,

        productVersion:
            event.productVersion,

        amount:
            event.amount,

        currency:
            event.currency,

        paymentState:
            event.paymentState,

        createdAt:
            event.eventCreatedAt,

        ...(
            event.paidAt === undefined
                ? {}
                : {
                    paidAt:
                        event.paidAt
                }
        )
    };

}


export const providerIndependentOrderAdapter:
    ProviderOrderAdapter =
    {

        toRiverOrder(
            event:
                VerifiedPaymentEvent
        ): RiverOrder {

            return normalizeVerifiedPaymentEvent(
                event
            );

        }

    };
