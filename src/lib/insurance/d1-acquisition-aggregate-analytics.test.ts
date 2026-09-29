import assert from "node:assert/strict";
import test from "node:test";

import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import {
    createInsuranceAcquisitionCostFact
} from "./acquisition-economics";

import type {
    InsuranceAcquisitionCostFact,
    InsuranceCommissionFact,
    InsurancePremiumFact,
    InsuranceRenewalFact
} from "./acquisition-economics";

import type {
    InsuranceLeadPresentation
} from "./lead-presentation";

import {
    createInsuranceAcquisitionAggregateAnalyticsApplication
} from "./d1-acquisition-aggregate-analytics";

import type {
    InsuranceAcquisitionAggregateEconomicsReader,
    InsuranceAcquisitionAggregatePresentationReader
} from "./d1-acquisition-aggregate-analytics";


const relationshipOne =
    requireRiverCrmRelationshipId(
        "relationship:ins-003j-1"
    );

const relationshipTwo =
    requireRiverCrmRelationshipId(
        "relationship:ins-003j-2"
    );

const occurredAt =
    "2026-09-29T18:00:00.000Z";


class RecordingPresentationReader
implements InsuranceAcquisitionAggregatePresentationReader {
    calls =
        0;

    requested:
        readonly string[] = [];

    constructor(
        private readonly values:
            readonly InsuranceLeadPresentation[]
    ){}

    async listForRelationships(
        relationshipIds:
            Parameters<
                InsuranceAcquisitionAggregatePresentationReader[
                    "listForRelationships"
                ]
            >[0]
    ): Promise<
        readonly InsuranceLeadPresentation[]
    > {
        this.calls +=
            1;

        this.requested =
            [
                ...relationshipIds
            ];

        return this.values;
    }
}


class RecordingEconomicsReader
implements InsuranceAcquisitionAggregateEconomicsReader {
    acquisitionCostCalls =
        0;

    premiumCalls =
        0;

    commissionCalls =
        0;

    renewalCalls =
        0;

    requested:
        readonly string[] = [];

    constructor(
        private readonly acquisitionCosts:
            readonly InsuranceAcquisitionCostFact[] = [],
        private readonly premiumFacts:
            readonly InsurancePremiumFact[] = [],
        private readonly commissionFacts:
            readonly InsuranceCommissionFact[] = [],
        private readonly renewalFacts:
            readonly InsuranceRenewalFact[] = []
    ){}

    private record(
        relationshipIds:
            readonly string[]
    ): void {
        this.requested =
            [
                ...relationshipIds
            ];
    }

    async listAcquisitionCostsForRelationships(
        relationshipIds:
            Parameters<
                InsuranceAcquisitionAggregateEconomicsReader[
                    "listAcquisitionCostsForRelationships"
                ]
            >[0]
    ): Promise<
        readonly InsuranceAcquisitionCostFact[]
    > {
        this.acquisitionCostCalls +=
            1;

        this.record(
            relationshipIds
        );

        return this.acquisitionCosts;
    }

    async listPremiumFactsForRelationships(
        relationshipIds:
            Parameters<
                InsuranceAcquisitionAggregateEconomicsReader[
                    "listPremiumFactsForRelationships"
                ]
            >[0]
    ): Promise<
        readonly InsurancePremiumFact[]
    > {
        this.premiumCalls +=
            1;

        this.record(
            relationshipIds
        );

        return this.premiumFacts;
    }

    async listCommissionFactsForRelationships(
        relationshipIds:
            Parameters<
                InsuranceAcquisitionAggregateEconomicsReader[
                    "listCommissionFactsForRelationships"
                ]
            >[0]
    ): Promise<
        readonly InsuranceCommissionFact[]
    > {
        this.commissionCalls +=
            1;

        this.record(
            relationshipIds
        );

        return this.commissionFacts;
    }

    async listRenewalFactsForRelationships(
        relationshipIds:
            Parameters<
                InsuranceAcquisitionAggregateEconomicsReader[
                    "listRenewalFactsForRelationships"
                ]
            >[0]
    ): Promise<
        readonly InsuranceRenewalFact[]
    > {
        this.renewalCalls +=
            1;

        this.record(
            relationshipIds
        );

        return this.renewalFacts;
    }
}


test(
    "batch-loads explicit relationship cohort and delegates aggregate projection",
    async () => {
        const presentationReader =
            new RecordingPresentationReader([
                {
                    relationshipId:
                        relationshipOne,
                    acquisitionSource:
                        "google"
                } as InsuranceLeadPresentation,
                {
                    relationshipId:
                        relationshipTwo,
                    acquisitionSource:
                        "referral"
                } as InsuranceLeadPresentation
            ]);

        const economicsReader =
            new RecordingEconomicsReader([
                createInsuranceAcquisitionCostFact({
                    costId:
                        "acquisition-cost:ins-003j-1",
                    relationshipId:
                        relationshipOne,
                    category:
                        "advertising",
                    money: {
                        amountMinorUnits:
                            1000,
                        currency:
                            "USD"
                    },
                    occurredAt
                }),
                createInsuranceAcquisitionCostFact({
                    costId:
                        "acquisition-cost:ins-003j-2",
                    relationshipId:
                        relationshipTwo,
                    category:
                        "advertising",
                    money: {
                        amountMinorUnits:
                            2500,
                        currency:
                            "USD"
                    },
                    occurredAt
                })
            ]);

        const application =
            createInsuranceAcquisitionAggregateAnalyticsApplication(
                presentationReader,
                economicsReader
            );

        const result =
            await application
                .getAggregateAnalytics({
                    dimension:
                        "acquisitionSource",
                    relationshipIds: [
                        relationshipOne,
                        relationshipTwo,
                        relationshipOne
                    ]
                });

        assert.equal(
            presentationReader.calls,
            1
        );

        assert.equal(
            economicsReader.acquisitionCostCalls,
            1
        );

        assert.equal(
            economicsReader.premiumCalls,
            1
        );

        assert.equal(
            economicsReader.commissionCalls,
            1
        );

        assert.equal(
            economicsReader.renewalCalls,
            1
        );

        assert.deepEqual(
            presentationReader.requested,
            [
                relationshipOne,
                relationshipTwo
            ]
        );

        assert.deepEqual(
            economicsReader.requested,
            [
                relationshipOne,
                relationshipTwo
            ]
        );

        assert.equal(
            result.relationshipCount,
            2
        );

        const google =
            result.buckets.find(
                bucket=>
                    bucket.dimensionValue ===
                    "google"
            );

        const referral =
            result.buckets.find(
                bucket=>
                    bucket.dimensionValue ===
                    "referral"
            );

        assert.ok(
            google
        );

        assert.ok(
            referral
        );

        assert.equal(
            google.relationshipCount,
            1
        );

        assert.equal(
            referral.relationshipCount,
            1
        );

        assert.equal(
            google.currencies[0]
                ?.acquisitionCostMinorUnits,
            1000
        );

        assert.equal(
            referral.currencies[0]
                ?.acquisitionCostMinorUnits,
            2500
        );
    }
);


test(
    "empty explicit cohort returns empty aggregate without persistence reads",
    async () => {
        const presentationReader =
            new RecordingPresentationReader(
                []
            );

        const economicsReader =
            new RecordingEconomicsReader();

        const application =
            createInsuranceAcquisitionAggregateAnalyticsApplication(
                presentationReader,
                economicsReader
            );

        const result =
            await application
                .getAggregateAnalytics({
                    dimension:
                        "campaign",
                    relationshipIds:
                        []
                });

        assert.equal(
            result.relationshipCount,
            0
        );

        assert.deepEqual(
            result.buckets,
            []
        );

        assert.equal(
            presentationReader.calls,
            0
        );

        assert.equal(
            economicsReader.acquisitionCostCalls,
            0
        );

        assert.equal(
            economicsReader.premiumCalls,
            0
        );

        assert.equal(
            economicsReader.commissionCalls,
            0
        );

        assert.equal(
            economicsReader.renewalCalls,
            0
        );
    }
);


test(
    "rejects invalid requested relationship before any persistence read",
    async () => {
        const presentationReader =
            new RecordingPresentationReader(
                []
            );

        const economicsReader =
            new RecordingEconomicsReader();

        const application =
            createInsuranceAcquisitionAggregateAnalyticsApplication(
                presentationReader,
                economicsReader
            );

        await assert.rejects(
            application
                .getAggregateAnalytics({
                    dimension:
                        "state",
                    relationshipIds: [
                        relationshipOne,
                        "lead:not-a-relationship" as never
                    ]
                }),
            /relationship/
        );

        assert.equal(
            presentationReader.calls,
            0
        );

        assert.equal(
            economicsReader.acquisitionCostCalls,
            0
        );
    }
);


test(
    "rejects a presentation outside the explicit requested cohort",
    async () => {
        const presentationReader =
            new RecordingPresentationReader([
                {
                    relationshipId:
                        relationshipTwo,
                    acquisitionSource:
                        "referral"
                } as InsuranceLeadPresentation
            ]);

        const economicsReader =
            new RecordingEconomicsReader();

        const application =
            createInsuranceAcquisitionAggregateAnalyticsApplication(
                presentationReader,
                economicsReader
            );

        await assert.rejects(
            application
                .getAggregateAnalytics({
                    dimension:
                        "acquisitionSource",
                    relationshipIds: [
                        relationshipOne
                    ]
                }),
            /outside the requested cohort/
        );
    }
);


test(
    "rejects economic facts outside the explicit requested cohort",
    async () => {
        const presentationReader =
            new RecordingPresentationReader(
                []
            );

        const economicsReader =
            new RecordingEconomicsReader([
                createInsuranceAcquisitionCostFact({
                    costId:
                        "acquisition-cost:ins-003j-outside",
                    relationshipId:
                        relationshipTwo,
                    category:
                        "advertising",
                    money: {
                        amountMinorUnits:
                            900,
                        currency:
                            "USD"
                    },
                    occurredAt
                })
            ]);

        const application =
            createInsuranceAcquisitionAggregateAnalyticsApplication(
                presentationReader,
                economicsReader
            );

        await assert.rejects(
            application
                .getAggregateAnalytics({
                    dimension:
                        "campaign",
                    relationshipIds: [
                        relationshipOne
                    ]
                }),
            /outside the requested cohort/
        );
    }
);


test(
    "preserves requested relationship with absent presentation and empty economics",
    async () => {
        const presentationReader =
            new RecordingPresentationReader(
                []
            );

        const economicsReader =
            new RecordingEconomicsReader();

        const application =
            createInsuranceAcquisitionAggregateAnalyticsApplication(
                presentationReader,
                economicsReader
            );

        const result =
            await application
                .getAggregateAnalytics({
                    dimension:
                        "assignedProducer",
                    relationshipIds: [
                        relationshipOne
                    ]
                });

        assert.equal(
            result.relationshipCount,
            1
        );

        assert.equal(
            result.buckets.length,
            1
        );

        assert.equal(
            result.buckets[0]
                ?.dimensionValue,
            undefined
        );

        assert.equal(
            result.buckets[0]
                ?.relationshipCount,
            1
        );

        assert.deepEqual(
            result.buckets[0]
                ?.currencies,
            []
        );
    }
);
