import assert from "node:assert/strict";
import test from "node:test";

import {
    evaluateProduct001E07CommerceReadiness,
    product001E07ReadinessRequirements,
    type CommerceReadinessEvidence
} from "./commerce-readiness";

function createReadyEvidence():
    CommerceReadinessEvidence {

    return {
        providerIndependentPaymentEventContract:
            true,

        providerVerificationBoundary:
            true,

        canonicalOrderNormalization:
            true,

        durableProviderEventRedeliveryIdempotency:
            true,

        duplicateProviderPaymentIdentityProtection:
            true,

        concretePaymentProviderSelected:
            true,

        concreteCheckoutMechanismSelected:
            true,

        providerIsolationFromFulfillmentDomain:
            true,

        verifiedPaidOrderFulfillmentIntegration:
            true,

        durableCommerceRetryPersistence:
            true,

        durableFulfillmentPersistence:
            true,

        runtimePaidOrderHandoff:
            true,

        durableCommerceDatabaseProvisioned:
            true,

        secretsAndCustomerDataRemainServerOnly:
            true,

        publicationBoundaryClosed:
            true
    };
}

test(
    "PRODUCT-001E-07 becomes ready only when every governed readiness requirement is satisfied",
    () => {

        const result =
            evaluateProduct001E07CommerceReadiness(
                createReadyEvidence()
            );

        assert.equal(
            result.ready,
            true
        );

        assert.deepEqual(
            result.blockers,
            []
        );

        assert.deepEqual(
            result.satisfied,
            product001E07ReadinessRequirements
        );
    }
);

test(
    "current production gaps keep PRODUCT-001E-07 closed",
    () => {

        const evidence =
            createReadyEvidence();

        const result =
            evaluateProduct001E07CommerceReadiness({
                ...evidence,

                durableProviderEventRedeliveryIdempotency:
                    false,

                durableCommerceRetryPersistence:
                    false,

                durableFulfillmentPersistence:
                    false,

                runtimePaidOrderHandoff:
                    false,

                durableCommerceDatabaseProvisioned:
                    false
            });

        assert.equal(
            result.ready,
            false
        );

        assert.deepEqual(
            result.blockers,
            [
                "durableProviderEventRedeliveryIdempotency",
                "durableCommerceRetryPersistence",
                "durableFulfillmentPersistence",
                "runtimePaidOrderHandoff",
                "durableCommerceDatabaseProvisioned"
            ]
        );
    }
);

test(
    "provider-event redelivery durability is independently required",
    () => {

        const evidence =
            createReadyEvidence();

        const result =
            evaluateProduct001E07CommerceReadiness({
                ...evidence,

                durableProviderEventRedeliveryIdempotency:
                    false
            });

        assert.equal(
            result.ready,
            false
        );

        assert.deepEqual(
            result.blockers,
            [
                "durableProviderEventRedeliveryIdempotency"
            ]
        );
    }
);

test(
    "runtime paid-order handoff is independently required",
    () => {

        const evidence =
            createReadyEvidence();

        const result =
            evaluateProduct001E07CommerceReadiness({
                ...evidence,

                runtimePaidOrderHandoff:
                    false
            });

        assert.equal(
            result.ready,
            false
        );

        assert.deepEqual(
            result.blockers,
            [
                "runtimePaidOrderHandoff"
            ]
        );
    }
);

test(
    "durable fulfillment persistence is independently required",
    () => {

        const evidence =
            createReadyEvidence();

        const result =
            evaluateProduct001E07CommerceReadiness({
                ...evidence,

                durableFulfillmentPersistence:
                    false
            });

        assert.equal(
            result.ready,
            false
        );

        assert.deepEqual(
            result.blockers,
            [
                "durableFulfillmentPersistence"
            ]
        );
    }
);

test(
    "provisioned durable commerce infrastructure is independently required",
    () => {

        const evidence =
            createReadyEvidence();

        const result =
            evaluateProduct001E07CommerceReadiness({
                ...evidence,

                durableCommerceDatabaseProvisioned:
                    false
            });

        assert.equal(
            result.ready,
            false
        );

        assert.deepEqual(
            result.blockers,
            [
                "durableCommerceDatabaseProvisioned"
            ]
        );
    }
);

test(
    "publication boundary must remain closed while PRODUCT-001E owns readiness",
    () => {

        const evidence =
            createReadyEvidence();

        const result =
            evaluateProduct001E07CommerceReadiness({
                ...evidence,

                publicationBoundaryClosed:
                    false
            });

        assert.equal(
            result.ready,
            false
        );

        assert.deepEqual(
            result.blockers,
            [
                "publicationBoundaryClosed"
            ]
        );
    }
);

test(
    "readiness reports every missing requirement in canonical order",
    () => {

        const evidence:
            CommerceReadinessEvidence =
            {
                providerIndependentPaymentEventContract:
                    false,

                providerVerificationBoundary:
                    false,

                canonicalOrderNormalization:
                    false,

                durableProviderEventRedeliveryIdempotency:
                    false,

                duplicateProviderPaymentIdentityProtection:
                    false,

                concretePaymentProviderSelected:
                    false,

                concreteCheckoutMechanismSelected:
                    false,

                providerIsolationFromFulfillmentDomain:
                    false,

                verifiedPaidOrderFulfillmentIntegration:
                    false,

                durableCommerceRetryPersistence:
                    false,

                durableFulfillmentPersistence:
                    false,

                runtimePaidOrderHandoff:
                    false,

                durableCommerceDatabaseProvisioned:
                    false,

                secretsAndCustomerDataRemainServerOnly:
                    false,

                publicationBoundaryClosed:
                    false
            };

        const result =
            evaluateProduct001E07CommerceReadiness(
                evidence
            );

        assert.equal(
            result.ready,
            false
        );

        assert.deepEqual(
            result.satisfied,
            []
        );

        assert.deepEqual(
            result.blockers,
            product001E07ReadinessRequirements
        );
    }
);
