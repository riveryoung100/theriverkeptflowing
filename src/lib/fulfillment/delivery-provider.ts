import type {
    ProductRelease
} from "./types";


export interface DeliveryProviderMessage {

    readonly subject:
        string;

    readonly text:
        string;

}


export interface DeliveryProviderRequest {

    readonly fulfillmentId:
        string;

    readonly fulfillmentRequestId:
        string;

    readonly orderId:
        string;

    readonly entitlementId:
        string;

    readonly customerReference:
        string;

    readonly deliveryEmail:
        string;

    readonly idempotencyKey:
        string;

    readonly release:
        ProductRelease;

    readonly artifactBytes:
        Uint8Array;

    readonly message:
        DeliveryProviderMessage;

}


export interface DeliveryProviderSentResult {

    readonly status:
        "sent";

    readonly providerMessageReference?:
        string;

    readonly acceptedAt?:
        string;

}


export interface DeliveryProviderFailedResult {

    readonly status:
        "failed";

    readonly code:
        string;

    readonly message:
        string;

    readonly retryable:
        boolean;

    readonly providerMessageReference?:
        string;

}


export type DeliveryProviderResult =
    | DeliveryProviderSentResult
    | DeliveryProviderFailedResult;


export interface DeliveryProvider {

    send(
        request:
            DeliveryProviderRequest
    ): Promise<DeliveryProviderResult>;

}


function requireNormalizedValue(
    value:
        string,
    label:
        string
): void {

    if (
        typeof value !== "string" ||
        value.trim().length === 0 ||
        value.trim() !== value
    ) {

        throw new TypeError(
            `${label} must be a non-empty normalized value.`
        );

    }

}


function requireNonEmptyText(
    value:
        string,
    label:
        string
): void {

    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {

        throw new TypeError(
            `${label} must contain non-whitespace text.`
        );

    }

}


export function assertDeliveryProviderRequest(
    request:
        DeliveryProviderRequest
): void {

    requireNormalizedValue(
        request.fulfillmentId,
        "Fulfillment identifier"
    );

    requireNormalizedValue(
        request.fulfillmentRequestId,
        "Fulfillment request identifier"
    );

    requireNormalizedValue(
        request.orderId,
        "Order identifier"
    );

    requireNormalizedValue(
        request.entitlementId,
        "Entitlement identifier"
    );

    requireNormalizedValue(
        request.customerReference,
        "Customer reference"
    );

    requireNormalizedValue(
        request.deliveryEmail,
        "Delivery email"
    );

    requireNormalizedValue(
        request.idempotencyKey,
        "Delivery idempotency key"
    );

    requireNormalizedValue(
        request.release.productId,
        "Release product identifier"
    );

    requireNormalizedValue(
        request.release.productVersion,
        "Release product version"
    );

    requireNormalizedValue(
        request.release.releaseId,
        "Release identifier"
    );

    requireNormalizedValue(
        request.release.artifactFilename,
        "Release artifact filename"
    );

    requireNormalizedValue(
        request.release.artifactFormat,
        "Release artifact format"
    );

    requireNormalizedValue(
        request.release.artifactSha256,
        "Release artifact SHA-256"
    );

    if (
        request.release.releaseStatus !==
        "approved"
    ) {

        throw new Error(
            "Delivery provider request requires an approved product release."
        );

    }

    if (
        !Number.isSafeInteger(
            request.release.artifactByteSize
        ) ||
        request.release.artifactByteSize <= 0
    ) {

        throw new TypeError(
            "Release artifact byte size must be a positive safe integer."
        );

    }

    if (
        !(request.artifactBytes instanceof Uint8Array) ||
        request.artifactBytes.byteLength === 0
    ) {

        throw new TypeError(
            "Delivery artifact bytes must be a non-empty Uint8Array."
        );

    }

    if (
        request.artifactBytes.byteLength !==
        request.release.artifactByteSize
    ) {

        throw new Error(
            "Delivery artifact byte length must match the approved release metadata."
        );

    }

    requireNonEmptyText(
        request.message.subject,
        "Delivery message subject"
    );

    requireNonEmptyText(
        request.message.text,
        "Delivery message text"
    );

}


export function assertDeliveryProviderResult(
    result:
        DeliveryProviderResult
): void {

    if (result.status === "sent") {

        if (
            result.providerMessageReference !==
            undefined
        ) {

            requireNormalizedValue(
                result.providerMessageReference,
                "Provider message reference"
            );

        }

        if (
            result.acceptedAt !==
            undefined
        ) {

            requireNormalizedValue(
                result.acceptedAt,
                "Provider accepted timestamp"
            );

        }

        return;

    }

    if (result.status === "failed") {

        requireNormalizedValue(
            result.code,
            "Delivery failure code"
        );

        requireNonEmptyText(
            result.message,
            "Delivery failure message"
        );

        if (
            typeof result.retryable !==
            "boolean"
        ) {

            throw new TypeError(
                "Delivery failure retryable must be boolean."
            );

        }

        if (
            result.providerMessageReference !==
            undefined
        ) {

            requireNormalizedValue(
                result.providerMessageReference,
                "Provider message reference"
            );

        }

        return;

    }

    const exhaustive:
        never =
        result;

    throw new Error(
        `Unsupported delivery provider result: ${String(exhaustive)}`
    );

}