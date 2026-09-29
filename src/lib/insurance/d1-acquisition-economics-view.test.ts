import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceAcquisitionCostFact,
    createInsuranceCommissionFact,
    createInsurancePremiumFact
} from "./acquisition-economics";

import {
    createInsuranceRelationshipAcquisitionAnalytics
} from "./acquisition-analytics";

import {
    createInsuranceLeadPresentation
} from "./lead-presentation";

import {
    createInsuranceLeadProfile
} from "./lead-profile";

import {
    createRiverCrmAcquisitionAttribution
} from "../river-os/crm-growth-contracts";

import {
    createInsuranceAttributedRelationshipEconomicsApplication
} from "./d1-acquisition-economics-view";

import type {
    InsuranceLeadPresentationReader
} from "./d1-acquisition-economics-view";

import type {
    InsuranceRelationshipAcquisitionAnalyticsApplication
} from "./d1-acquisition-analytics";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";


const relationshipId =
    "relationship:ins-003g" as
        RiverCrmRelationshipId;

const occurredAt =
    "2026-09-30T00:00:00.000Z";


function presentation(){
    return createInsuranceLeadPresentation({
        profile:
            createInsuranceLeadProfile({
                relationshipId,
                state:
                    "TX",
                postalCode:
                    "79720",
                productInterest:
                    "home",
                quoteStatus:
                    "quoted",
                assignedProducer:
                    "River",
                createdAt:
                    occurredAt,
                updatedAt:
                    occurredAt
            }),

        acquisition:
            createRiverCrmAcquisitionAttribution({
                relationshipId,
                source:
                    "website",
                sourceVendor:
                    "Meta",
                campaign:
                    "West Texas Home",
                capturedAt:
                    occurredAt,
                updatedAt:
                    occurredAt
            }),

        consents:
            [],

        events:
            []
    });
}


function analytics(){
    return createInsuranceRelationshipAcquisitionAnalytics({
        relationshipId,

        acquisitionCosts: [
            createInsuranceAcquisitionCostFact({
                costId:
                    "acquisition-cost:g1",
                relationshipId,
                category:
                    "advertising",
                money: {
                    amountMinorUnits:
                        4000,
                    currency:
                        "USD"
                },
                occurredAt
            })
        ],

        premiumFacts: [
            createInsurancePremiumFact({
                premiumFactId:
                    "premium-fact:g1",
                relationshipId,
                kind:
                    "written",
                money: {
                    amountMinorUnits:
                        220000,
                    currency:
                        "USD"
                },
                occurredAt
            })
        ],

        commissionFacts: [
            createInsuranceCommissionFact({
                commissionFactId:
                    "commission-fact:g1",
                relationshipId,
                kind:
                    "paid",
                money: {
                    amountMinorUnits:
                        16000,
                    currency:
                        "USD"
                },
                occurredAt
            })
        ]
    });
}


function analyticsApplication():
    InsuranceRelationshipAcquisitionAnalyticsApplication {

    return {
        async getRelationshipAnalytics(
            requestedRelationshipId
        ){
            assert.equal(
                requestedRelationshipId,
                relationshipId
            );

            return analytics();
        }
    };
}


test(
    "combines canonical acquisition presentation with relationship economics",
    async () => {
        const presentationReader:
            InsuranceLeadPresentationReader = {
                async listForRelationships(
                    relationshipIds
                ){
                    assert.deepEqual(
                        relationshipIds,
                        [
                            relationshipId
                        ]
                    );

                    return [
                        presentation()
                    ];
                }
            };

        const application =
            createInsuranceAttributedRelationshipEconomicsApplication(
                presentationReader,
                analyticsApplication()
            );

        const result =
            await application
                .getRelationshipEconomicsView(
                    relationshipId
                );

        assert.equal(
            result.relationshipId,
            relationshipId
        );

        assert.equal(
            result.presentation?.acquisitionSource,
            "website"
        );

        assert.equal(
            result.presentation?.sourceVendor,
            "Meta"
        );

        assert.equal(
            result.presentation?.campaign,
            "West Texas Home"
        );

        assert.equal(
            result.presentation?.productInterest,
            "home"
        );

        assert.equal(
            result.presentation?.state,
            "TX"
        );

        assert.equal(
            result.presentation?.quoteStatus,
            "quoted"
        );

        const usd =
            result.analytics.currencies[0]!;

        assert.equal(
            usd.writtenPremiumMinorUnits,
            220000
        );

        assert.equal(
            usd.acquisitionCostMinorUnits,
            4000
        );

        assert.equal(
            usd.realizedCommissionMinorUnits,
            16000
        );

        assert.equal(
            usd.contributionMarginMinorUnits,
            12000
        );
    }
);


test(
    "preserves missing insurance presentation as absent context",
    async () => {
        const presentationReader:
            InsuranceLeadPresentationReader = {
                async listForRelationships(){
                    return [];
                }
            };

        const application =
            createInsuranceAttributedRelationshipEconomicsApplication(
                presentationReader,
                analyticsApplication()
            );

        const result =
            await application
                .getRelationshipEconomicsView(
                    relationshipId
                );

        assert.equal(
            result.presentation,
            undefined
        );

        assert.equal(
            result.analytics.relationshipId,
            relationshipId
        );
    }
);


test(
    "rejects mismatched presentation relationship",
    async () => {
        const wrongPresentation =
            createInsuranceLeadPresentation({
                profile:
                    createInsuranceLeadProfile({
                        relationshipId:
                            "relationship:other",
                        state:
                            "TX",
                        postalCode:
                            "79720",
                        productInterest:
                            "auto",
                        quoteStatus:
                            "requested",
                        createdAt:
                            occurredAt,
                        updatedAt:
                            occurredAt
                    }),

                consents:
                    [],

                events:
                    []
            });

        const presentationReader:
            InsuranceLeadPresentationReader = {
                async listForRelationships(){
                    return [
                        wrongPresentation
                    ];
                }
            };

        const application =
            createInsuranceAttributedRelationshipEconomicsApplication(
                presentationReader,
                analyticsApplication()
            );

        await assert.rejects(
            application.getRelationshipEconomicsView(
                relationshipId
            ),
            /presentation relationship mismatch/
        );
    }
);


test(
    "rejects duplicate presentations for one relationship",
    async () => {
        const value =
            presentation();

        const presentationReader:
            InsuranceLeadPresentationReader = {
                async listForRelationships(){
                    return [
                        value,
                        value
                    ];
                }
            };

        const application =
            createInsuranceAttributedRelationshipEconomicsApplication(
                presentationReader,
                analyticsApplication()
            );

        await assert.rejects(
            application.getRelationshipEconomicsView(
                relationshipId
            ),
            /at most one insurance presentation/
        );
    }
);


test(
    "rejects noncanonical relationship before either read starts",
    async () => {
        let presentationReads =
            0;

        let analyticsReads =
            0;

        const presentationReader:
            InsuranceLeadPresentationReader = {
                async listForRelationships(){
                    presentationReads +=
                        1;

                    return [];
                }
            };

        const analyticsReader:
            InsuranceRelationshipAcquisitionAnalyticsApplication = {
                async getRelationshipAnalytics(){
                    analyticsReads +=
                        1;

                    return analytics();
                }
            };

        const application =
            createInsuranceAttributedRelationshipEconomicsApplication(
                presentationReader,
                analyticsReader
            );

        await assert.rejects(
            application.getRelationshipEconomicsView(
                "lead:invalid" as
                    RiverCrmRelationshipId
            ),
            /relationship/
        );

        assert.equal(
            presentationReads,
            0
        );

        assert.equal(
            analyticsReads,
            0
        );
    }
);
