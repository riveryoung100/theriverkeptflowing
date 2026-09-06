import assert from "node:assert/strict";
import {
    createHash
} from "node:crypto";
import {
    mkdtemp,
    readFile,
    writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
    describe,
    it
} from "node:test";

import type {
    DeliveryProvider,
    DeliveryProviderRequest,
    DeliveryProviderResult
} from "./delivery-provider";

import {
    orchestrateFulfillment
} from "./orchestration";

import {
    InMemoryFulfillmentPersistence
} from "./persistence";

import {
    buildProductReleaseArtifact
} from "./release-artifact";

import type {
    RiverOrder
} from "./types";


function sha256(
    value:
        Buffer
        | string
): string {

    return createHash(
        "sha256"
    )
        .update(
            value
        )
        .digest(
            "hex"
        );

}


describe(
    "PRODUCT-001D-07 end-to-end fulfillment readiness gate",
    () => {

        it(
            "demonstrates safe normalized paid-order delivery through recorded persistent delivery result",
            async () => {

                const workspace =
                    await mkdtemp(
                        path.join(
                            os.tmpdir(),
                            "river-product-001d-07-"
                        )
                    );

                const sourcePath =
                    path.join(
                        workspace,
                        "river-life-operating-system-v1.md"
                    );

                const outputDirectory =
                    path.join(
                        workspace,
                        "private-releases"
                    );

                const manuscript =
                    [
                        "---",
                        "draft: true",
                        "---",
                        "",
                        "# The River Life Operating System",
                        "",
                        "A source-grounded readiness-gate artifact.",
                        "",
                        "## Exercise",
                        "",
                        "- Clarify what matters.",
                        "- Record the next faithful action.",
                        ""
                    ].join(
                        "\n"
                    );

                await writeFile(
                    sourcePath,
                    manuscript,
                    "utf8"
                );

                const authoritativeSourceSha256 =
                    sha256(
                        manuscript
                    );

                const artifact =
                    await buildProductReleaseArtifact({
                        sourceManuscriptPath:
                            sourcePath,
                        outputDirectory,
                        productId:
                            "river-life-operating-system",
                        productVersion:
                            "v1",
                        releaseId:
                            "product-001d-07-release",
                        artifactFilename:
                            "river-life-operating-system-v1.pdf",
                        releaseStatus:
                            "approved",
                        createdAt:
                            "2026-09-05T22:00:00.000Z",
                        expectedSourceSha256:
                            authoritativeSourceSha256
                    });

                assert.equal(
                    artifact.release.releaseStatus,
                    "approved"
                );

                assert.equal(
                    artifact.release.productId,
                    "river-life-operating-system"
                );

                assert.equal(
                    artifact.release.productVersion,
                    "v1"
                );

                assert.equal(
                    artifact.release.releaseId,
                    "product-001d-07-release"
                );

                const artifactBytes =
                    await readFile(
                        artifact.artifactPath
                    );

                assert.equal(
                    artifactBytes.byteLength,
                    artifact.release.artifactByteSize
                );

                assert.equal(
                    sha256(
                        artifactBytes
                    ),
                    artifact.release.artifactSha256
                );

                const order:
                    RiverOrder = {
                        orderId:
                            "product-001d-07-order",
                        provider:
                            "normalized-test-payment-provider",
                        providerOrderOrSessionId:
                            "product-001d-07-provider-order",
                        providerPaymentReference:
                            "product-001d-07-payment",
                        customerReference:
                            "product-001d-07-customer",
                        deliveryEmail:
                            "customer@example.com",
                        productId:
                            "river-life-operating-system",
                        productVersion:
                            "v1",
                        amount:
                            4900,
                        currency:
                            "USD",
                        paymentState:
                            "paid",
                        createdAt:
                            "2026-09-05T22:01:00.000Z",
                        paidAt:
                            "2026-09-05T22:02:00.000Z"
                    };

                const persistence =
                    new InMemoryFulfillmentPersistence();

                const providerRequests:
                    DeliveryProviderRequest[] =
                    [];

                const deliveryProvider:
                    DeliveryProvider = {

                        async send(
                            request:
                                DeliveryProviderRequest
                        ): Promise<DeliveryProviderResult> {

                            providerRequests.push(
                                request
                            );

                            return {
                                status:
                                    "sent",
                                providerMessageReference:
                                    "product-001d-07-message",
                                sentAt:
                                    "2026-09-05T22:03:01.000Z"
                            };

                        }

                    };

                await persistence.saveOrder(
                    order
                );

                const persistedNormalizedOrder =
                    await persistence.getOrder(
                        order.orderId
                    );

                assert.deepEqual(
                    persistedNormalizedOrder,
                    order
                );

                const firstResult =
                    await orchestrateFulfillment(
                        {
                            order,
                            release:
                                artifact.release,
                            artifactBytes,
                            message: {
                                subject:
                                    "Your River Life Operating System",
                                text:
                                    "Your River Life Operating System is attached."
                            },
                            occurredAt:
                                "2026-09-05T22:03:00.000Z"
                        },
                        {
                            persistence,
                            deliveryProvider
                        }
                    );

                assert.equal(
                    firstResult.providerInvoked,
                    true
                );

                assert.equal(
                    providerRequests.length,
                    1
                );

                assert.equal(
                    firstResult.entitlement.status,
                    "active"
                );

                assert.equal(
                    firstResult.fulfillmentRequest.paymentState,
                    "paid"
                );

                assert.equal(
                    firstResult.fulfillmentRecord.fulfillmentState,
                    "delivered"
                );

                assert.equal(
                    firstResult.fulfillmentRecord.deliveryState,
                    "sent"
                );

                assert.ok(
                    firstResult.deliveryResult
                );

                assert.equal(
                    firstResult.deliveryResult.status,
                    "sent"
                );

                const persistedOrder =
                    await persistence.getOrder(
                        order.orderId
                    );

                const persistedEntitlement =
                    await persistence.getEntitlementByOrderId(
                        order.orderId
                    );

                const persistedRequest =
                    await persistence.getFulfillmentRequestByOrderId(
                        order.orderId
                    );

                const persistedFulfillment =
                    await persistence.getFulfillmentRecordByOrderId(
                        order.orderId
                    );

                assert.ok(
                    persistedOrder
                );

                assert.ok(
                    persistedEntitlement
                );

                assert.ok(
                    persistedRequest
                );

                assert.ok(
                    persistedFulfillment
                );

                assert.equal(
                    persistedOrder.paymentState,
                    "paid"
                );

                assert.equal(
                    persistedEntitlement.status,
                    "active"
                );

                assert.equal(
                    persistedRequest.paymentState,
                    "paid"
                );

                assert.equal(
                    persistedFulfillment.fulfillmentState,
                    "delivered"
                );

                assert.equal(
                    persistedFulfillment.deliveryState,
                    "sent"
                );

                assert.equal(
                    persistedFulfillment.deliveredAt,
                    "2026-09-05T22:03:00.000Z"
                );

                assert.equal(
                    providerRequests[0]?.release.releaseId,
                    artifact.release.releaseId
                );

                assert.equal(
                    providerRequests[0]?.artifactBytes.byteLength,
                    artifact.release.artifactByteSize
                );

                assert.equal(
                    sha256(
                        providerRequests[0]?.artifactBytes ??
                        Buffer.alloc(
                            0
                        )
                    ),
                    artifact.release.artifactSha256
                );

                const secondResult =
                    await orchestrateFulfillment(
                        {
                            order,
                            release:
                                artifact.release,
                            artifactBytes,
                            message: {
                                subject:
                                    "Your River Life Operating System",
                                text:
                                    "Your River Life Operating System is attached."
                            },
                            occurredAt:
                                "2026-09-05T22:04:00.000Z"
                        },
                        {
                            persistence,
                            deliveryProvider
                        }
                    );

                assert.equal(
                    secondResult.providerInvoked,
                    false
                );

                assert.equal(
                    providerRequests.length,
                    1
                );

                assert.equal(
                    secondResult.entitlement.entitlementId,
                    firstResult.entitlement.entitlementId
                );

                assert.equal(
                    secondResult.fulfillmentRequest.fulfillmentRequestId,
                    firstResult.fulfillmentRequest.fulfillmentRequestId
                );

                assert.equal(
                    secondResult.fulfillmentRecord.fulfillmentId,
                    firstResult.fulfillmentRecord.fulfillmentId
                );

                assert.equal(
                    secondResult.fulfillmentRecord.fulfillmentState,
                    "delivered"
                );

                assert.equal(
                    secondResult.fulfillmentRecord.deliveryState,
                    "sent"
                );

            }
        );

    }
);
