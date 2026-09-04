import type {
    DeliveryState,
    FulfillmentReadinessInput,
    FulfillmentReadinessResult,
    FulfillmentState,
    FulfillmentTransitionInput,
    FulfillmentTransitionResult
} from "./types";


const FULFILLMENT_TRANSITIONS:
Readonly<
    Record<
        FulfillmentState,
        readonly FulfillmentState[]
    >
> = {

    "not-ready": [
        "ready",
        "revoked"
    ],

    "ready": [
        "processing",
        "revoked"
    ],

    "processing": [
        "delivered",
        "failed",
        "revoked"
    ],

    "delivered": [
        "revoked"
    ],

    "failed": [
        "ready",
        "processing",
        "revoked"
    ],

    "revoked": []

};


const DELIVERY_TRANSITIONS:
Readonly<
    Record<
        DeliveryState,
        readonly DeliveryState[]
    >
> = {

    "not-attempted": [
        "attempting"
    ],

    "attempting": [
        "sent",
        "failed"
    ],

    "sent": [],

    "failed": [
        "attempting"
    ]

};


export function evaluateFulfillmentReadiness(
    input:
        FulfillmentReadinessInput
): FulfillmentReadinessResult {

    if (
        input.order.paymentState !==
        "paid"
    ) {

        return {
            ready:
                false,
            fulfillmentState:
                "not-ready",
            reason:
                "order-not-paid"
        };

    }

    if (
        input.release.releaseStatus !==
        "approved"
    ) {

        return {
            ready:
                false,
            fulfillmentState:
                "not-ready",
            reason:
                "release-not-approved"
        };

    }

    if (
        input.order.productId !==
        input.release.productId
    ) {

        return {
            ready:
                false,
            fulfillmentState:
                "not-ready",
            reason:
                "product-mismatch"
        };

    }

    if (
        input.order.productVersion !==
        input.release.productVersion
    ) {

        return {
            ready:
                false,
            fulfillmentState:
                "not-ready",
            reason:
                "product-version-mismatch"
        };

    }

    if (
        input.order.deliveryEmail
            .trim()
            .length ===
        0
    ) {

        return {
            ready:
                false,
            fulfillmentState:
                "not-ready",
            reason:
                "delivery-email-missing"
        };

    }

    return {
        ready:
            true,
        fulfillmentState:
            "ready"
    };

}


export function canTransitionFulfillmentState(
    from:
        FulfillmentState,
    to:
        FulfillmentState
): boolean {

    if (from === to) {
        return true;
    }

    return FULFILLMENT_TRANSITIONS[
        from
    ].includes(
        to
    );

}


export function transitionFulfillmentState(
    current:
        FulfillmentTransitionInput,
    next:
        FulfillmentState
): FulfillmentTransitionResult {

    if (
        !canTransitionFulfillmentState(
            current.fulfillmentState,
            next
        )
    ) {

        throw new Error(
            `Invalid fulfillment transition: ${current.fulfillmentState} -> ${next}`
        );

    }

    return {
        ...current,
        fulfillmentState:
            next
    };

}


export function canTransitionDeliveryState(
    from:
        DeliveryState,
    to:
        DeliveryState
): boolean {

    if (from === to) {
        return true;
    }

    return DELIVERY_TRANSITIONS[
        from
    ].includes(
        to
    );

}


export function transitionDeliveryState(
    current:
        FulfillmentTransitionInput,
    next:
        DeliveryState
): FulfillmentTransitionResult {

    if (
        !canTransitionDeliveryState(
            current.deliveryState,
            next
        )
    ) {

        throw new Error(
            `Invalid delivery transition: ${current.deliveryState} -> ${next}`
        );

    }

    return {
        ...current,
        deliveryState:
            next
    };

}
