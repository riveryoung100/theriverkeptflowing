import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceAcquisitionCostFact,
    createInsuranceCommissionFact,
    createInsurancePremiumFact,
    createInsuranceRenewalFact
} from "./acquisition-economics";

import {
    createInsuranceRelationshipAcquisitionAnalyticsApplication
} from "./d1-acquisition-analytics";

import type {
    InsuranceAcquisitionAnalyticsFactReader
} from "./d1-acquisition-analytics";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";


const relationshipId =
    "relationship:ins-003f" as
        RiverCrmRelationshipId;

const occurredAt =
    "2026-09-29T23:45:00.000Z";


function reader():
    InsuranceAcquisitionAnalyticsFactReader {

    return {
        async listAcquisitionCostsForRelationship(
            requestedRelationshipId
        ){
            assert.equal(
                requestedRelationshipId,
                relationshipId
            );

            return [
                createInsuranceAcquisitionCostFact({
                    costId:
                        "acquisition-cost:f1",
                    relationshipId,
                    category:
                        "lead",
                    money: {
                        amountMinorUnits:
                            3000,
                        currency:
                            "USD"
                    },
                    occurredAt
                })
            ];
        },

        async listPremiumFactsForRelationship(
            requestedRelationshipId
        ){
            assert.equal(
                requestedRelationshipId,
                relationshipId
            );

            return [
                createInsurancePremiumFact({
                    premiumFactId:
                        "premium-fact:f1",
                    relationshipId,
                    kind:
                        "written",
                    money: {
                        amountMinorUnits:
                            180000,
                        currency:
                            "USD"
                    },
                    occurredAt
                })
            ];
        },

        async listCommissionFactsForRelationship(
            requestedRelationshipId
        ){
            assert.equal(
                requestedRelationshipId,
                relationshipId
            );

            return [
                createInsuranceCommissionFact({
                    commissionFactId:
                        "commission-fact:paid-f1",
                    relationshipId,
                    kind:
                        "paid",
                    money: {
                        amountMinorUnits:
                            14000,
                        currency:
                            "USD"
                    },
                    occurredAt
                }),

                createInsuranceCommissionFact({
                    commissionFactId:
                        "commission-fact:chargeback-f1",
                    relationshipId,
                    kind:
                        "chargeback",
                    money: {
                        amountMinorUnits:
                            -2000,
                        currency:
                            "USD"
                    },
                    occurredAt
                })
            ];
        },

        async listRenewalFactsForRelationship(
            requestedRelationshipId
        ){
            assert.equal(
                requestedRelationshipId,
                relationshipId
            );

            return [
                createInsuranceRenewalFact({
                    renewalFactId:
                        "renewal-fact:f1",
                    relationshipId,
                    kind:
                        "due",
                    occurredAt:
                        "2027-09-01T00:00:00.000Z"
                })
            ];
        }
    };
}


test(
    "loads all relationship fact streams and projects contribution",
    async () => {
        const application =
            createInsuranceRelationshipAcquisitionAnalyticsApplication(
                reader()
            );

        const result =
            await application
                .getRelationshipAnalytics(
                    relationshipId
                );

        assert.equal(
            result.relationshipId,
            relationshipId
        );

        assert.equal(
            result.currencies.length,
            1
        );

        const usd =
            result.currencies[0]!;

        assert.equal(
            usd.acquisitionCostMinorUnits,
            3000
        );

        assert.equal(
            usd.writtenPremiumMinorUnits,
            180000
        );

        assert.equal(
            usd.realizedCommissionMinorUnits,
            12000
        );

        assert.equal(
            usd.contributionMarginMinorUnits,
            9000
        );

        assert.equal(
            result.latestRenewal?.kind,
            "due"
        );
    }
);


test(
    "empty persistence streams produce empty deterministic projection",
    async () => {
        const emptyReader:
            InsuranceAcquisitionAnalyticsFactReader = {
                async listAcquisitionCostsForRelationship(){
                    return [];
                },

                async listPremiumFactsForRelationship(){
                    return [];
                },

                async listCommissionFactsForRelationship(){
                    return [];
                },

                async listRenewalFactsForRelationship(){
                    return [];
                }
            };

        const application =
            createInsuranceRelationshipAcquisitionAnalyticsApplication(
                emptyReader
            );

        const result =
            await application
                .getRelationshipAnalytics(
                    relationshipId
                );

        assert.deepEqual(
            result.currencies,
            []
        );

        assert.equal(
            result.renewalFactCount,
            0
        );
    }
);


test(
    "rejects noncanonical relationship before any persistence read",
    async () => {
        let reads =
            0;

        const countingReader:
            InsuranceAcquisitionAnalyticsFactReader = {
                async listAcquisitionCostsForRelationship(){
                    reads += 1;
                    return [];
                },

                async listPremiumFactsForRelationship(){
                    reads += 1;
                    return [];
                },

                async listCommissionFactsForRelationship(){
                    reads += 1;
                    return [];
                },

                async listRenewalFactsForRelationship(){
                    reads += 1;
                    return [];
                }
            };

        const application =
            createInsuranceRelationshipAcquisitionAnalyticsApplication(
                countingReader
            );

        await assert.rejects(
            application.getRelationshipAnalytics(
                "lead:invalid" as
                    RiverCrmRelationshipId
            ),
            /relationship/
        );

        assert.equal(
            reads,
            0
        );
    }
);


test(
    "persistence read failure propagates and no analytics write exists",
    async () => {
        const failingReader:
            InsuranceAcquisitionAnalyticsFactReader = {
                async listAcquisitionCostsForRelationship(){
                    throw new Error(
                        "d1 read unavailable"
                    );
                },

                async listPremiumFactsForRelationship(){
                    return [];
                },

                async listCommissionFactsForRelationship(){
                    return [];
                },

                async listRenewalFactsForRelationship(){
                    return [];
                }
            };

        const application =
            createInsuranceRelationshipAcquisitionAnalyticsApplication(
                failingReader
            );

        await assert.rejects(
            application.getRelationshipAnalytics(
                relationshipId
            ),
            /d1 read unavailable/
        );
    }
);
