import assert from "node:assert/strict";
import test from "node:test";

import {
    INSURANCE_ACQUISITION_DIMENSION_OUTCOME_SNAPSHOT_VERSION
} from "./acquisition-dimension-outcome-snapshot";

import type {
    InsuranceAcquisitionDimensionOutcomeSnapshotApplication
} from "./acquisition-dimension-outcome-snapshot";

import {
    createInsuranceCreatedAtDimensionOutcomeSnapshotApplication
} from "./d1-acquisition-dimension-outcome-snapshot-created-at-cohort";

import type {
    InsuranceCreatedAtDimensionOutcomeSnapshotCohortReader
} from "./d1-acquisition-dimension-outcome-snapshot-created-at-cohort";


class RecordingCohortReader
implements InsuranceCreatedAtDimensionOutcomeSnapshotCohortReader {
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
                InsuranceCreatedAtDimensionOutcomeSnapshotCohortReader[
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
                InsuranceCreatedAtDimensionOutcomeSnapshotCohortReader[
                    "listCreatedAtRangePage"
                ]
            >
        >;
    }
}


class RecordingSnapshotApplication
implements InsuranceAcquisitionDimensionOutcomeSnapshotApplication {
    calls =
        0;

    input:
        Parameters<
            InsuranceAcquisitionDimensionOutcomeSnapshotApplication[
                "getSnapshot"
            ]
        >[0] | undefined;

    async getSnapshot(
        input:
            Parameters<
                InsuranceAcquisitionDimensionOutcomeSnapshotApplication[
                    "getSnapshot"
                ]
            >[0]
    ){
        this.calls +=
            1;

        this.input =
            input;

        return {
            version:
                INSURANCE_ACQUISITION_DIMENSION_OUTCOME_SNAPSHOT_VERSION,

            relationshipCount:
                input.relationshipIds.length,

            analytics:
                input.dimensions.map(
                    dimension => ({
                        projectionVersion:
                            "insurance-acquisition-dimension-outcome-analytics-v1" as const,

                        dimension,

                        relationshipCount:
                            input.relationshipIds.length,

                        buckets:
                            []
                    })
                )
        };
    }
}


test(
    "reads created-at cohort once and delegates exact relationship IDs once to snapshot",
    async () => {
        const cohortReader =
            new RecordingCohortReader([
                {
                    relationshipId:
                        "relationship:ins-004e-a"
                },
                {
                    relationshipId:
                        "relationship:ins-004e-b"
                }
            ]);

        const snapshotApplication =
            new RecordingSnapshotApplication();

        const application =
            createInsuranceCreatedAtDimensionOutcomeSnapshotApplication(
                cohortReader,
                snapshotApplication
            );

        const result =
            await application
                .getCreatedAtSnapshot({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    limit:
                        25,

                    dimensions: [
                        "acquisitionSource",
                        "campaign",
                        "state"
                    ]
                });

        assert.equal(
            cohortReader.calls,
            1
        );

        assert.equal(
            snapshotApplication.calls,
            1
        );

        assert.deepEqual(
            snapshotApplication.input,
            {
                relationshipIds: [
                    "relationship:ins-004e-a",
                    "relationship:ins-004e-b"
                ],

                dimensions: [
                    "acquisitionSource",
                    "campaign",
                    "state"
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
    "preserves CRM-owned created-at query and explicit limit",
    async () => {
        const cohortReader =
            new RecordingCohortReader(
                []
            );

        const snapshotApplication =
            new RecordingSnapshotApplication();

        const application =
            createInsuranceCreatedAtDimensionOutcomeSnapshotApplication(
                cohortReader,
                snapshotApplication
            );

        await application
            .getCreatedAtSnapshot({
                createdAtFromInclusive:
                    "2026-09-01T00:00:00.000Z",

                createdAtToExclusive:
                    "2026-10-01T00:00:00.000Z",

                limit:
                    73,

                dimensions: [
                    "state"
                ]
            });

        assert.deepEqual(
            cohortReader.query,
            {
                createdAtFromInclusive:
                    "2026-09-01T00:00:00.000Z",

                createdAtToExclusive:
                    "2026-10-01T00:00:00.000Z",

                pageSize:
                    73
            }
        );
    }
);


test(
    "omitted limit remains omitted for CRM ownership",
    async () => {
        const cohortReader =
            new RecordingCohortReader(
                []
            );

        const snapshotApplication =
            new RecordingSnapshotApplication();

        const application =
            createInsuranceCreatedAtDimensionOutcomeSnapshotApplication(
                cohortReader,
                snapshotApplication
            );

        await application
            .getCreatedAtSnapshot({
                createdAtFromInclusive:
                    "2026-09-01T00:00:00.000Z",

                createdAtToExclusive:
                    "2026-10-01T00:00:00.000Z",

                dimensions: [
                    "state"
                ]
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
    "empty created-at cohort still delegates snapshot once with empty relationship IDs",
    async () => {
        const cohortReader =
            new RecordingCohortReader(
                []
            );

        const snapshotApplication =
            new RecordingSnapshotApplication();

        const application =
            createInsuranceCreatedAtDimensionOutcomeSnapshotApplication(
                cohortReader,
                snapshotApplication
            );

        const result =
            await application
                .getCreatedAtSnapshot({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    dimensions: [
                        "state",
                        "campaign"
                    ]
                });

        assert.equal(
            cohortReader.calls,
            1
        );

        assert.equal(
            snapshotApplication.calls,
            1
        );

        assert.deepEqual(
            snapshotApplication.input,
            {
                relationshipIds:
                    [],

                dimensions: [
                    "state",
                    "campaign"
                ]
            }
        );

        assert.equal(
            result.relationshipCount,
            0
        );
    }
);


test(
    "rejects malformed relationship returned by CRM before snapshot delegation",
    async () => {
        const cohortReader =
            new RecordingCohortReader([
                {
                    relationshipId:
                        "lead:not-a-relationship"
                }
            ]);

        const snapshotApplication =
            new RecordingSnapshotApplication();

        const application =
            createInsuranceCreatedAtDimensionOutcomeSnapshotApplication(
                cohortReader,
                snapshotApplication
            );

        await assert.rejects(
            application
                .getCreatedAtSnapshot({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    dimensions: [
                        "state"
                    ]
                }),
            /relationship/
        );

        assert.equal(
            snapshotApplication.calls,
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

        const snapshotApplication =
            new RecordingSnapshotApplication();

        const application =
            createInsuranceCreatedAtDimensionOutcomeSnapshotApplication(
                cohortReader,
                snapshotApplication
            );

        await application
            .getCreatedAtSnapshot({
                createdAtFromInclusive:
                    "2026-09-01T00:00:00.000Z",

                createdAtToExclusive:
                    "2026-10-01T00:00:00.000Z",

                dimensions:
                    []
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
