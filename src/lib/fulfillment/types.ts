export type PaymentState =
    | "pending"
    | "paid"
    | "failed"
    | "refunded"
    | "disputed"
    | "unknown";


export type ProductReleaseStatus =
    | "draft"
    | "approved"
    | "retired";


export type EntitlementStatus =
    | "active"
    | "revoked";


export type FulfillmentState =
    | "not-ready"
    | "ready"
    | "processing"
    | "delivered"
    | "failed"
    | "revoked";


export type DeliveryState =
    | "not-attempted"
    | "attempting"
    | "sent"
    | "failed";


export interface ProductRelease {

    productId:
        string;

    productVersion:
        string;

    releaseId:
        string;

    artifactFilename:
        string;

    artifactFormat:
        string;

    artifactByteSize:
        number;

    artifactSha256:
        string;

    createdAt:
        string;

    releaseStatus:
        ProductReleaseStatus;

}


export interface RiverOrder {

    orderId:
        string;

    provider:
        string;

    providerOrderOrSessionId:
        string;

    providerPaymentReference:
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

    createdAt:
        string;

    paidAt?:
        string;

}


export interface Entitlement {

    entitlementId:
        string;

    orderId:
        string;

    customerReference:
        string;

    productId:
        string;

    productVersion:
        string;

    releaseId:
        string;

    status:
        EntitlementStatus;

    createdAt:
        string;

    revokedAt?:
        string;

}


export interface FulfillmentRequest {

    fulfillmentRequestId:
        string;

    orderId:
        string;

    productId:
        string;

    productVersion:
        string;

    customerReference:
        string;

    deliveryEmail:
        string;

    paymentState:
        PaymentState;

    paymentReference:
        string;

    purchasedAt:
        string;

}


export interface FulfillmentRecord {

    fulfillmentId:
        string;

    fulfillmentRequestId:
        string;

    orderId:
        string;

    productId:
        string;

    productVersion:
        string;

    releaseId:
        string;

    entitlementId:
        string;

    fulfillmentState:
        FulfillmentState;

    deliveryState:
        DeliveryState;

    deliveryAttemptedAt?:
        string;

    deliveredAt?:
        string;

    failureReason?:
        string;

}


export interface FulfillmentReadinessInput {

    order:
        RiverOrder;

    release:
        ProductRelease;

}


export interface FulfillmentReadinessResult {

    ready:
        boolean;

    fulfillmentState:
        "not-ready" | "ready";

    reason?:
        string;

}


export interface FulfillmentTransitionInput {

    fulfillmentState:
        FulfillmentState;

    deliveryState:
        DeliveryState;

}


export interface FulfillmentTransitionResult {

    fulfillmentState:
        FulfillmentState;

    deliveryState:
        DeliveryState;

}
