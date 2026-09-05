import type {
    Entitlement,
    FulfillmentRecord,
    FulfillmentRequest,
    ProductRelease,
    RiverOrder
} from "./types";

import {
    evaluateFulfillmentReadiness,
    transitionDeliveryState,
    transitionFulfillmentState
} from "./lifecycle";

import type {
    FulfillmentPersistence
} from "./persistence";

import type {
    DeliveryProvider,
    DeliveryProviderMessage,
    DeliveryProviderResult
} from "./delivery-provider";

import {
    assertDeliveryProviderRequest,
    assertDeliveryProviderResult
} from "./delivery-provider";


export interface FulfillmentOrchestrationInput {

    readonly order:
        RiverOrder;

    readonly release:
        ProductRelease;

    readonly artifactBytes:
        Uint8Array;

    readonly message:
        DeliveryProviderMessage;

    readonly occurredAt:
        string;

}


export interface FulfillmentOrchestrationDependencies {

    readonly persistence:
        FulfillmentPersistence;

    readonly deliveryProvider:
        DeliveryProvider;

}


export interface FulfillmentOrchestrationResult {

    readonly entitlement:
        Entitlement;

    readonly fulfillmentRequest:
        FulfillmentRequest;

    readonly fulfillmentRecord:
        FulfillmentRecord;

    readonly deliveryResult?:
        DeliveryProviderResult;

    readonly providerInvoked:
        boolean;

}


function requireNonEmpty(
    value:
        string,
    field:
        string
): string {

    const normalized =
        value.trim();

    if (normalized.length === 0) {
        throw new Error(
            `${field} must be non-empty.`
        );
    }

    return normalized;

}


function assertArtifactBytes(
    release:
        ProductRelease,
    artifactBytes:
        Uint8Array
): void {

    if (!(artifactBytes instanceof Uint8Array)) {
        throw new Error(
            "artifactBytes must be a Uint8Array."
        );
    }

    if (artifactBytes.byteLength === 0) {
        throw new Error(
            "artifactBytes must be non-empty."
        );
    }

    if (
        artifactBytes.byteLength !==
        release.artifactByteSize
    ) {

        throw new Error(
            "artifactBytes length does not match release artifactByteSize."
        );

    }

}


function assertExistingEntitlementMatches(
    entitlement:
        Entitlement,
    order:
        RiverOrder,
    release:
        ProductRelease
): void {

    if (
        entitlement.orderId !==
        order.orderId
    ) {
        throw new Error(
            "Existing entitlement orderId mismatch."
        );
    }

    if (
        entitlement.customerReference !==
        order.customerReference
    ) {
        throw new Error(
            "Existing entitlement customerReference mismatch."
        );
    }

    if (
        entitlement.productId !==
        order.productId
    ) {
        throw new Error(
            "Existing entitlement productId mismatch."
        );
    }

    if (
        entitlement.productVersion !==
        order.productVersion
    ) {
        throw new Error(
            "Existing entitlement productVersion mismatch."
        );
    }

    if (
        entitlement.releaseId !==
        release.releaseId
    ) {
        throw new Error(
            "Existing entitlement releaseId mismatch."
        );
    }

    if (
        entitlement.status !==
        "active"
    ) {
        throw new Error(
            "Existing entitlement is not active."
        );
    }

}


function assertExistingRequestMatches(
    request:
        FulfillmentRequest,
    order:
        RiverOrder
): void {

    if (
        request.orderId !==
        order.orderId
    ) {
        throw new Error(
            "Existing fulfillment request orderId mismatch."
        );
    }

    if (
        request.productId !==
        order.productId
    ) {
        throw new Error(
            "Existing fulfillment request productId mismatch."
        );
    }

    if (
        request.productVersion !==
        order.productVersion
    ) {
        throw new Error(
            "Existing fulfillment request productVersion mismatch."
        );
    }

    if (
        request.customerReference !==
        order.customerReference
    ) {
        throw new Error(
            "Existing fulfillment request customerReference mismatch."
        );
    }

    if (
        request.deliveryEmail !==
        order.deliveryEmail
    ) {
        throw new Error(
            "Existing fulfillment request deliveryEmail mismatch."
        );
    }

    if (
        request.paymentState !==
        "paid"
    ) {
        throw new Error(
            "Existing fulfillment request paymentState is not paid."
        );
    }

    if (
        request.paymentReference !==
        order.providerPaymentReference
    ) {
        throw new Error(
            "Existing fulfillment request paymentReference mismatch."
        );
    }

}


function assertExistingRecordMatches(
    record:
        FulfillmentRecord,
    request:
        FulfillmentRequest,
    entitlement:
        Entitlement,
    release:
        ProductRelease
): void {

    if (
        record.fulfillmentRequestId !==
        request.fulfillmentRequestId
    ) {
        throw new Error(
            "Existing fulfillment record request mismatch."
        );
    }

    if (
        record.orderId !==
        request.orderId
    ) {
        throw new Error(
            "Existing fulfillment record order mismatch."
        );
    }

    if (
        record.productId !==
        request.productId
    ) {
        throw new Error(
            "Existing fulfillment record productId mismatch."
        );
    }

    if (
        record.productVersion !==
        request.productVersion
    ) {
        throw new Error(
            "Existing fulfillment record productVersion mismatch."
        );
    }

    if (
        record.releaseId !==
        release.releaseId
    ) {
        throw new Error(
            "Existing fulfillment record releaseId mismatch."
        );
    }

    if (
        record.entitlementId !==
        entitlement.entitlementId
    ) {
        throw new Error(
            "Existing fulfillment record entitlementId mismatch."
        );
    }

}


function buildEntitlement(
    order:
        RiverOrder,
    release:
        ProductRelease,
    occurredAt:
        string
): Entitlement {

    return {
        entitlementId:
            `entitlement:${order.orderId}:${release.releaseId}`,
        orderId:
            order.orderId,
        customerReference:
            order.customerReference,
        productId:
            order.productId,
        productVersion:
            order.productVersion,
        releaseId:
            release.releaseId,
        status:
            "active",
        createdAt:
            occurredAt
    };

}


function buildFulfillmentRequest(
    order:
        RiverOrder
): FulfillmentRequest {

    return {
        fulfillmentRequestId:
            `fulfillment-request:${order.orderId}`,
        orderId:
            order.orderId,
        productId:
            order.productId,
        productVersion:
            order.productVersion,
        customerReference:
            order.customerReference,
        deliveryEmail:
            order.deliveryEmail,
        paymentState:
            "paid",
        paymentReference:
            order.providerPaymentReference,
        purchasedAt:
            order.paidAt ??
            order.createdAt
    };

}


function buildFulfillmentRecord(
    request:
        FulfillmentRequest,
    entitlement:
        Entitlement,
    release:
        ProductRelease
): FulfillmentRecord {

    return {
        fulfillmentId:
            `fulfillment:${request.orderId}:${release.releaseId}`,
        fulfillmentRequestId:
            request.fulfillmentRequestId,
        orderId:
            request.orderId,
        productId:
            request.productId,
        productVersion:
            request.productVersion,
        releaseId:
            release.releaseId,
        entitlementId:
            entitlement.entitlementId,
        fulfillmentState:
            "ready",
        deliveryState:
            "not-attempted"
    };

}


export async function orchestrateFulfillment(
    input:
        FulfillmentOrchestrationInput,
    dependencies:
        FulfillmentOrchestrationDependencies
): Promise<FulfillmentOrchestrationResult> {

    const {
        order,
        release,
        artifactBytes,
        message
    } = input;

    const occurredAt =
        requireNonEmpty(
            input.occurredAt,
            "occurredAt"
        );

    requireNonEmpty(
        order.orderId,
        "order.orderId"
    );

    requireNonEmpty(
        order.customerReference,
        "order.customerReference"
    );

    requireNonEmpty(
        order.deliveryEmail,
        "order.deliveryEmail"
    );

    requireNonEmpty(
        order.providerPaymentReference,
        "order.providerPaymentReference"
    );

    requireNonEmpty(
        release.releaseId,
        "release.releaseId"
    );

    const readiness =
        evaluateFulfillmentReadiness({
            order,
            release
        });

    if (!readiness.ready) {

        throw new Error(
            `Fulfillment is not ready: ${readiness.reason}`
        );

    }

    assertArtifactBytes(
        release,
        artifactBytes
    );

    let entitlement =
        await dependencies.persistence
            .getEntitlementByOrderId(
                order.orderId
            );

    if (entitlement) {

        assertExistingEntitlementMatches(
            entitlement,
            order,
            release
        );

    }
    else {

        entitlement =
            buildEntitlement(
                order,
                release,
                occurredAt
            );

        await dependencies.persistence
            .saveEntitlement(
                entitlement
            );

    }

    let fulfillmentRequest =
        await dependencies.persistence
            .getFulfillmentRequestByOrderId(
                order.orderId
            );

    if (fulfillmentRequest) {

        assertExistingRequestMatches(
            fulfillmentRequest,
            order
        );

    }
    else {

        fulfillmentRequest =
            buildFulfillmentRequest(
                order
            );

        await dependencies.persistence
            .saveFulfillmentRequest(
                fulfillmentRequest
            );

    }

    let fulfillmentRecord =
        await dependencies.persistence
            .getFulfillmentRecordByOrderId(
                order.orderId
            );

    if (fulfillmentRecord) {

        assertExistingRecordMatches(
            fulfillmentRecord,
            fulfillmentRequest,
            entitlement,
            release
        );

    }
    else {

        fulfillmentRecord =
            buildFulfillmentRecord(
                fulfillmentRequest,
                entitlement,
                release
            );

        await dependencies.persistence
            .saveFulfillmentRecord(
                fulfillmentRecord
            );

    }

    if (
        fulfillmentRecord.fulfillmentState ===
        "delivered"
        &&
        fulfillmentRecord.deliveryState ===
        "sent"
    ) {

        return {
            entitlement,
            fulfillmentRequest,
            fulfillmentRecord,
            providerInvoked:
                false
        };

    }

    if (
        fulfillmentRecord.fulfillmentState ===
        "revoked"
    ) {

        throw new Error(
            "Fulfillment record is revoked."
        );

    }

    if (
        fulfillmentRecord.deliveryState ===
        "sent"
    ) {

        throw new Error(
            "Delivery is sent but fulfillment is not delivered."
        );

    }

    let transitioningRecord =
        fulfillmentRecord;

    if (
        transitioningRecord.fulfillmentState ===
        "not-ready"
    ) {

        transitioningRecord =
            transitionFulfillmentState(
                transitioningRecord,
                "ready"
            );

    }

    if (
        transitioningRecord.fulfillmentState ===
        "failed"
    ) {

        transitioningRecord =
            transitionFulfillmentState(
                transitioningRecord,
                "processing"
            );

    }
    else if (
        transitioningRecord.fulfillmentState ===
        "ready"
    ) {

        transitioningRecord =
            transitionFulfillmentState(
                transitioningRecord,
                "processing"
            );

    }

    if (
        transitioningRecord.fulfillmentState !==
        "processing"
    ) {

        throw new Error(
            `Fulfillment cannot be processed from state: ${transitioningRecord.fulfillmentState}`
        );

    }

    if (
        transitioningRecord.deliveryState ===
        "not-attempted"
        ||
        transitioningRecord.deliveryState ===
        "failed"
    ) {

        transitioningRecord =
            transitionDeliveryState(
                transitioningRecord,
                "attempting"
            );

    }

    if (
        transitioningRecord.deliveryState !==
        "attempting"
    ) {

        throw new Error(
            `Delivery cannot be attempted from state: ${transitioningRecord.deliveryState}`
        );

    }

    transitioningRecord = {
        ...transitioningRecord,
        deliveryAttemptedAt:
            occurredAt,
        failureReason:
            undefined
    };

    await dependencies.persistence
        .saveFulfillmentRecord(
            transitioningRecord
        );

    const providerRequest = {
        fulfillmentId:
            transitioningRecord.fulfillmentId,
        fulfillmentRequestId:
            fulfillmentRequest.fulfillmentRequestId,
        orderId:
            order.orderId,
        entitlementId:
            entitlement.entitlementId,
        customerReference:
            order.customerReference,
        deliveryEmail:
            order.deliveryEmail,
        idempotencyKey:
            transitioningRecord.fulfillmentId,
        release,
        artifactBytes,
        message
    };

    assertDeliveryProviderRequest(
        providerRequest
    );

    const deliveryResult =
        await dependencies.deliveryProvider
            .send(
                providerRequest
            );

    assertDeliveryProviderResult(
        deliveryResult
    );

    if (
        deliveryResult.status ===
        "sent"
    ) {

        const sentRecord =
            transitionDeliveryState(
                transitioningRecord,
                "sent"
            );

        const deliveredRecord =
            transitionFulfillmentState(
                sentRecord,
                "delivered"
            );

        fulfillmentRecord = {
            ...deliveredRecord,
            deliveredAt:
                deliveryResult.acceptedAt ??
                occurredAt,
            failureReason:
                undefined
        };

    }
    else {

        const failedDeliveryRecord =
            transitionDeliveryState(
                transitioningRecord,
                "failed"
            );

        const failedFulfillmentRecord =
            transitionFulfillmentState(
                failedDeliveryRecord,
                "failed"
            );

        fulfillmentRecord = {
            ...failedFulfillmentRecord,
            failureReason:
                `${deliveryResult.code}: ${deliveryResult.message}`
        };

    }

    await dependencies.persistence
        .saveFulfillmentRecord(
            fulfillmentRecord
        );

    return {
        entitlement,
        fulfillmentRequest,
        fulfillmentRecord,
        deliveryResult,
        providerInvoked:
            true
    };

}
