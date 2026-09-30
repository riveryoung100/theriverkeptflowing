import assert from "node:assert/strict";
import test from "node:test";

import {
    INSURANCE_ACQUISITION_OUTCOME_ANALYTICS_VERSION
} from "./acquisition-outcome-analytics";

import type {
    GetInsuranceAcquisitionOutcomeAnalyticsInput,
    InsuranceAcquisitionOutcomeAnalyticsApplication
} from "./d1-acquisition-outcome-analytics";

import {
    createInsuranceCreatedAtOutcomeAnalyticsApplication
} from "./d1-acquisition-outcome-created-at-cohort";

import type {
    InsuranceCreatedAtOutcomeCohortReader
} from "./d1-acquisition-outcome-created-at-cohort";


class RecordingCreatedAtCohortReader
implements InsuranceCreatedAtOutcomeCohortReader {
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
                InsuranceCreatedAtOutcomeCohortReader[
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
                InsuranceCreatedAtOutcomeCohortReader[
                    "listCreatedAtRangePage"
                ]
            >
        >;
    }
}


class RecordingOutcomeApplication
implements InsuranceAcquisitionOutcomeAnalyticsApplication {
    calls =
        0;

    input:
        GetInsuranceAcquisitionOutcomeAnalyticsInput | undefined;

    async getAnalytics(
        input:
            GetInsuranceAcquisitionOutcomeAnalyticsInput
    ){
        this.calls +=
            1;

        this.input =
            input;

        return {
            projectionVersion:
                INSURANCE_ACQUISITION_OUTCOME_ANALYTICS_VERSION,

            relationshipCount:
                input.relationshipIds.length,

            quotedRelationshipCount:
                0,

            boundRelationshipCount:
                0,

            outcomeFactCount:
                0,

            quotedOutcomeFactCount:
                0,

            boundOutcomeFactCount:
                0
        };
    }
}


test(
    "reads explicit created-at cohort once and forwards canonical IDs to outcome analytics once",
    async () => {
        const cohortReader =
            new RecordingCreatedAtCohortReader([
                {
                    relationshipId:
                        "relationship:ins-003u-newer"
                },
                {
                    relationshipId:
                        "relationship:ins-003u-older"
                }
            ]);

        const outcomeApplication =
            new RecordingOutcomeApplication();

        const application =
            createInsuranceCreatedAtOutcomeAnalyticsApplication(
                cohortReader,
                outcomeApplication
            );

        const result =
            await application
                .getCreatedAtAnalytics({
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

        assert.deepEqual(
            cohortReader.query,
            {
                createdAtFromInclusive:
                    "2026-09-01T00:00:00.000Z",

                createdAtToExclusive:
                    "2026-10-01T00:00:00.000Z",

                pageSize:
                    25
            }
        );

        assert.equal(
            outcomeApplication.calls,
            1
        );

        assert.deepEqual(
            outcomeApplication.input,
            {
                relationshipIds: [
                    "relationship:ins-003u-newer",
                    "relationship:ins-003u-older"
                ]
            }
        );

        assert.equal(
            result.relationshipCount,
            2
        );
    }
);


test(
    "omitted limit stays omitted so CRM retains default ownership",
    async () => {
        const cohortReader =
            new RecordingCreatedAtCohortReader([
                {
                    relationshipId:
                        "relationship:ins-003u-default"
                }
            ]);

        const outcomeApplication =
            new RecordingOutcomeApplication();

        const application =
            createInsuranceCreatedAtOutcomeAnalyticsApplication(
                cohortReader,
                outcomeApplication
            );

        await application
            .getCreatedAtAnalytics({
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

        assert.equal(
            outcomeApplication.calls,
            1
        );
    }
);


test(
    "preserves CRM cohort order when forwarding relationship IDs",
    async () => {
        const cohortReader =
            new RecordingCreatedAtCohortReader([
                {
                    relationshipId:
                        "relationship:ins-003u-3"
                },
                {
                    relationshipId:
                        "relationship:ins-003u-2"
                },
                {
                    relationshipId:
                        "relationship:ins-003u-1"
                }
            ]);

        const outcomeApplication =
            new RecordingOutcomeApplication();

        const application =
            createInsuranceCreatedAtOutcomeAnalyticsApplication(
                cohortReader,
                outcomeApplication
            );

        await application
            .getCreatedAtAnalytics({
                createdAtFromInclusive:
                    "2026-09-01T00:00:00.000Z",

                createdAtToExclusive:
                    "2026-10-01T00:00:00.000Z"
            });

        assert.deepEqual(
            outcomeApplication.input
                ?.relationshipIds,
            [
                "relationship:ins-003u-3",
                "relationship:ins-003u-2",
                "relationship:ins-003u-1"
            ]
        );
    }
);


test(
    "empty CRM cohort is forwarded once as empty outcome cohort",
    async () => {
        const cohortReader =
            new RecordingCreatedAtCohortReader(
                []
            );

        const outcomeApplication =
            new RecordingOutcomeApplication();

        const application =
            createInsuranceCreatedAtOutcomeAnalyticsApplication(
                cohortReader,
                outcomeApplication
            );

        const result =
            await application
                .getCreatedAtAnalytics({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z"
                });

        assert.equal(
            cohortReader.calls,
            1
        );

        assert.equal(
            outcomeApplication.calls,
            1
        );

        assert.deepEqual(
            outcomeApplication.input
                ?.relationshipIds,
            []
        );

        assert.equal(
            result.relationshipCount,
            0
        );
    }
);


test(
    "rejects malformed CRM relationship before outcome analytics execution",
    async () => {
        const cohortReader =
            new RecordingCreatedAtCohortReader([
                {
                    relationshipId:
                        "lead:not-a-relationship"
                }
            ]);

        const outcomeApplication =
            new RecordingOutcomeApplication();

        const application =
            createInsuranceCreatedAtOutcomeAnalyticsApplication(
                cohortReader,
                outcomeApplication
            );

        await assert.rejects(
            application
                .getCreatedAtAnalytics({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z"
                }),
            /relationship/
        );

        assert.equal(
            cohortReader.calls,
            1
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
            new RecordingCreatedAtCohortReader(
                []
            );

        const outcomeApplication =
            new RecordingOutcomeApplication();

        const application =
            createInsuranceCreatedAtOutcomeAnalyticsApplication(
                cohortReader,
                outcomeApplication
            );

        await application
            .getCreatedAtAnalytics({
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

        assert.equal(
            outcomeApplication.calls,
            1
        );
    }
);
