import type {
    ProductRelease
} from "../fulfillment/types";

import type {
    FulfillmentPersistence
} from "../fulfillment/persistence";

import type {
    DeliveryProvider,
    DeliveryProviderMessage
} from "../fulfillment/delivery-provider";

import type {
    VerifiedPaymentEvent
} from "./payment-event";

import {
    processVerifiedPaidOrder
} from "./paid-order-fulfillment";


export interface ApprovedReleaseArtifact {
    readonly release:
        ProductRelease;

    readonly artifactBytes:
        Uint8Array;
}


export interface ApprovedReleaseResolver {
    resolveApprovedRelease(
        productId: string,
        productVersion: string
    ): Promise<
        ApprovedReleaseArtifact
    >;
}


export interface RuntimePaidOrderHandoffInput {
    readonly paymentEvent:
        VerifiedPaymentEvent;

    readonly occurredAt:
        string;

    readonly message:
        DeliveryProviderMessage;
}


export interface RuntimePaidOrderHandoffDependencies {
    readonly persistence:
        FulfillmentPersistence;

    readonly deliveryProvider:
        DeliveryProvider;

    readonly releaseResolver:
        ApprovedReleaseResolver;
}


export type RuntimePaidOrderHandoffResult =
    Awaited<
        ReturnType<
            typeof processVerifiedPaidOrder
        >
    >;


function assertNonEmptyString(
    value: string,
    fieldName: string
): void {

    if (
        typeof value !== "string" ||
        value.length === 0 ||
        value.trim() !== value
    ) {
        throw new Error(
            `${fieldName} must be a normalized non-empty string.`
        );
    }
}


function assertResolvedRelease(
    paymentEvent: VerifiedPaymentEvent,
    artifact: ApprovedReleaseArtifact
): void {

    if (
        artifact.release.releaseStatus !==
        "approved"
    ) {
        throw new Error(
            "Runtime release resolver returned a non-approved release."
        );
    }

    if (
        artifact.release.productId !==
        paymentEvent.productId
    ) {
        throw new Error(
            "Runtime release productId does not match verified payment evidence."
        );
    }

    if (
        artifact.release.productVersion !==
        paymentEvent.productVersion
    ) {
        throw new Error(
            "Runtime release productVersion does not match verified payment evidence."
        );
    }

    if (
        !(
            artifact.artifactBytes
            instanceof Uint8Array
        )
    ) {
        throw new Error(
            "Runtime release artifactBytes must be a Uint8Array."
        );
    }

    if (
        artifact.artifactBytes.byteLength ===
        0
    ) {
        throw new Error(
            "Runtime release artifactBytes must be non-empty."
        );
    }

    if (
        artifact.artifactBytes.byteLength !==
        artifact.release.artifactByteSize
    ) {
        throw new Error(
            "Runtime release artifact byte length does not match approved release metadata."
        );
    }
}


export async function handoffVerifiedPaidOrderAtRuntime(
    input: RuntimePaidOrderHandoffInput,
    dependencies: RuntimePaidOrderHandoffDependencies
): Promise<
    RuntimePaidOrderHandoffResult
> {

    assertNonEmptyString(
        input.occurredAt,
        "occurredAt"
    );

    if (
        input.paymentEvent.paymentState !==
        "paid"
    ) {
        throw new Error(
            "Runtime paid-order handoff requires verified paid payment evidence."
        );
    }

    const artifact =
        await dependencies
            .releaseResolver
            .resolveApprovedRelease(
                input.paymentEvent.productId,
                input.paymentEvent.productVersion
            );

    assertResolvedRelease(
        input.paymentEvent,
        artifact
    );

    return processVerifiedPaidOrder(
        {
            persistence:
                dependencies.persistence,

            deliveryProvider:
                dependencies.deliveryProvider
        },
        {
            paymentEvent:
                input.paymentEvent,

            release:
                artifact.release,

            artifactBytes:
                artifact.artifactBytes,

            occurredAt:
                input.occurredAt,

            message:
                input.message
        }
    );
}

