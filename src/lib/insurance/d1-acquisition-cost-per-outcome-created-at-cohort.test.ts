import assert from "node:assert/strict";
import test from "node:test";

import {
    INSURANCE_ACQUISITION_ANALYTICS_PROJECTION_VERSION
} from "./acquisition-analytics";

import {
    INSURANCE_ACQUISITION_COST_PER_OUTCOME_VERSION
} from "./acquisition-cost-per-outcome";

import {
    INSURANCE_ACQUISITION_OUTCOME_ANALYTICS_VERSION
} from "./acquisition-outcome-analytics";

import type {
    InsuranceAttributedEconomicsBatchApplication
} from "./d1-attributed-economics-batch";

import type {
    InsuranceAcquisitionOutcomeAnalyticsApplication
} from "./d1-acquisition-outcome-analytics";

import {
    createInsuranceCreatedAtCostPerOutcomeApplication
} from "./d1-acquisition-cost-per-outcome-created-at-cohort";

import type {
    InsuranceCreatedAtCostPerOutcomeCohortReader
} from "./d1-acquisition-cost-per-outcome-created-at-cohort";


class RecordingCohortReader
implements InsuranceCreatedAtCostPerOutcomeCohortReader {
    calls =
        0;

    query:
        unknown;

    constructor(
        private readonly relationships:
            readonly {
                readonly relationshipId:
                    string;
            }[]
    ){}

    async listCreatedAtRangePage(
        query:
            Parameters<
                InsuranceCreatedAtCostPerOutcomeCohortReader[
                    "listCreatedAtRangePage"
                ]
            >[0]
    ){
        this.calls +=
            1;

        this.query =
            query;

        const upperExclusive =
            new Date(
                query.createdAtToExclusive
            ).getTime();

        return {
            relationships:
                this.relationships.map(
                    (
                        relationship,
                        index
                    ) => ({
                        relationshipId:
                            relationship.relationshipId,

                        createdAt:
                            new Date(
                                upperExclusive -
                                (
                                    index +
                                    1
                                )
                            ).toISOString()
                    })
                ),

            hasMore:
                false
        } as Awaited<
            ReturnType<
                InsuranceCreatedAtCostPerOutcomeCohortReader[
                    "listCreatedAtRangePage"
                ]
            >
        >;
    }
}


class RecordingEconomicsApplication
implements InsuranceAttributedEconomicsBatchApplication {
    calls =
        0;

    relationshipIds:
        readonly string[] | undefined;

    async getViews(
        relationshipIds:
            Parameters<
                InsuranceAttributedEconomicsBatchApplication[
                    "getViews"
                ]
            >[0]
    ){
        this.calls +=
            1;

        this.relationshipIds =
            relationshipIds;

        return relationshipIds.map(
            relationshipId => ({
                relationshipId,

                analytics: {
                    projectionVersion:
                        INSURANCE_ACQUISITION_ANALYTICS_PROJECTION_VERSION,

                    relationshipId,

                    currencies: [
                        {
                            currency:
                                "USD",

                            acquisitionCostMinorUnits:
                                1000,

                            quotedPremiumMinorUnits:
                                0,

                            writtenPremiumMinorUnits:
                                0,

                            renewalPremiumMinorUnits:
                                0,

                            earnedCommissionMinorUnits:
                                0,

                            paidCommissionMinorUnits:
                                0,

                            chargebackMinorUnits:
                                0,

                            adjustmentMinorUnits:
                                0,

                            realizedCommissionMinorUnits:
                                0,

                            contributionMarginMinorUnits:
                                -1000
                        }
                    ],

                    renewalFactCount:
                        0
                }
            })
        );
    }
}


class RecordingOutcomeApplication
implements InsuranceAcquisitionOutcomeAnalyticsApplication {
    calls =
        0;

    relationshipIds:
        readonly string[] | undefined;

    quotedRelationshipCount =
        0;

    boundRelationshipCount =
        0;

    async getAnalytics(
        input:
            Parameters<
                InsuranceAcquisitionOutcomeAnalyticsApplication[
                    "getAnalytics"
                ]
            >[0]
    ){
        this.calls +=
            1;

        this.relationshipIds =
            input.relationshipIds;

        return {
            projectionVersion:
                INSURANCE_ACQUISITION_OUTCOME_ANALYTICS_VERSION,

            relationshipCount:
                input.relationshipIds.length,

            quotedRelationshipCount:
                this.quotedRelationshipCount,

            boundRelationshipCount:
                this.boundRelationshipCount,

            outcomeFactCount:
                this.quotedRelationshipCount +
                this.boundRelationshipCount,

            quotedOutcomeFactCount:
                this.quotedRelationshipCount,

            boundOutcomeFactCount:
                this.boundRelationshipCount
        };
    }
}


test(
    "reads created-at cohort once and supplies identical IDs to economics and outcomes",
    async () => {
        const cohortReader =
            new RecordingCohortReader([
                {
                    relationshipId:
                        "relationship:ins-003z-a"
                },
                {
                    relationshipId:
                        "relationship:ins-003z-b"
                }
            ]);

        const economicsApplication =
            new RecordingEconomicsApplication();

        const outcomeApplication =
            new RecordingOutcomeApplication();

        outcomeApplication.quotedRelationshipCount =
            1;

        outcomeApplication.boundRelationshipCount =
            1;

        const application =
            createInsuranceCreatedAtCostPerOutcomeApplication(
                cohortReader,
                economicsApplication,
                outcomeApplication
            );

        const result =
            await application
                .getCreatedAtCostPerOutcome({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    limit:
                        25
                });

        assert.equal(
            cohortReader.calls,
            1
        );

        assert.equal(
            economicsApplication.calls,
            1
        );

        assert.equal(
            outcomeApplication.calls,
            1
        );

        assert.deepEqual(
            economicsApplication.relationshipIds,
            [
                "relationship:ins-003z-a",
                "relationship:ins-003z-b"
            ]
        );

        assert.deepEqual(
            outcomeApplication.relationshipIds,
            economicsApplication.relationshipIds
        );

        assert.equal(
            result.projectionVersion,
            INSURANCE_ACQUISITION_COST_PER_OUTCOME_VERSION
        );

        assert.deepEqual(
            result.currencies,
            [
                {
                    currency:
                        "USD",

                    acquisitionCostMinorUnits:
                        2000,

                    costPerQuote: {
                        numeratorMinorUnits:
                            2000,

                        denominatorCount:
                            1
                    },

                    costPerBind: {
                        numeratorMinorUnits:
                            2000,

                        denominatorCount:
                            1
                    }
                }
            ]
        );
    }
);


test(
    "preserves created-at query and omitted limit for CRM ownership",
    async () => {
        const cohortReader =
            new RecordingCohortReader(
                []
            );

        const economicsApplication =
            new RecordingEconomicsApplication();

        const outcomeApplication =
            new RecordingOutcomeApplication();

        const application =
            createInsuranceCreatedAtCostPerOutcomeApplication(
                cohortReader,
                economicsApplication,
                outcomeApplication
            );

        await application
            .getCreatedAtCostPerOutcome({
                createdAtFromInclusive:
                    "2026-09-01T00:00:00.000Z",

                createdAtToExclusive:
                    "2026-10-01T00:00:00.000Z"
            });

        assert.deepEqual(
            cohortReader.query,
            {
                createdAtFromInclusive:
                    "2026-09-01T00:00:00.000Z",

                createdAtToExclusive:
                    "2026-10-01T00:00:00.000Z",

                pageSize:
                    100
            }
        );
    }
);


test(
    "empty cohort delegates once to both downstream applications and produces zero projection",
    async () => {
        const cohortReader =
            new RecordingCohortReader(
                []
            );

        const economicsApplication =
            new RecordingEconomicsApplication();

        const outcomeApplication =
            new RecordingOutcomeApplication();

        const application =
            createInsuranceCreatedAtCostPerOutcomeApplication(
                cohortReader,
                economicsApplication,
                outcomeApplication
            );

        const result =
            await application
                .getCreatedAtCostPerOutcome({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z"
                });

        assert.equal(
            economicsApplication.calls,
            1
        );

        assert.equal(
            outcomeApplication.calls,
            1
        );

        assert.deepEqual(
            economicsApplication.relationshipIds,
            []
        );

        assert.deepEqual(
            outcomeApplication.relationshipIds,
            []
        );

        assert.equal(
            result.relationshipCount,
            0
        );

        assert.deepEqual(
            result.currencies,
            []
        );
    }
);


test(
    "rejects malformed CRM relationship before downstream analytics calls",
    async () => {
        const cohortReader =
            new RecordingCohortReader([
                {
                    relationshipId:
                        "lead:not-a-relationship"
                }
            ]);

        const economicsApplication =
            new RecordingEconomicsApplication();

        const outcomeApplication =
            new RecordingOutcomeApplication();

        const application =
            createInsuranceCreatedAtCostPerOutcomeApplication(
                cohortReader,
                economicsApplication,
                outcomeApplication
            );

        await assert.rejects(
            application
                .getCreatedAtCostPerOutcome({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z"
                }),
            /relationship/
        );

        assert.equal(
            economicsApplication.calls,
            0
        );

        assert.equal(
            outcomeApplication.calls,
            0
        );
    }
);


test(
    "uses canonical created-at timestamps through report cohort resolution",
    async () => {
        const cohortReader =
            new RecordingCohortReader(
                []
            );

        const economicsApplication =
            new RecordingEconomicsApplication();

        const outcomeApplication =
            new RecordingOutcomeApplication();

        const application =
            createInsuranceCreatedAtCostPerOutcomeApplication(
                cohortReader,
                economicsApplication,
                outcomeApplication
            );

        await application
            .getCreatedAtCostPerOutcome({
                createdAtFromInclusive:
                    "2026-09-01T00:00:00.000Z",

                createdAtToExclusive:
                    "2026-10-01T00:00:00.000Z"
            });

        assert.deepEqual(
            cohortReader.query,
            {
                createdAtFromInclusive:
                    "2026-09-01T00:00:00.000Z",

                createdAtToExclusive:
                    "2026-10-01T00:00:00.000Z",

                pageSize:
                    100
            }
        );
    }
);
