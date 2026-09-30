import assert from "node:assert/strict";
import test from "node:test";

import {
    INSURANCE_ACQUISITION_DIMENSION_COST_PER_OUTCOME_SNAPSHOT_VERSION
} from "./acquisition-dimension-cost-per-outcome-snapshot";

import type {
    InsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication
} from "./acquisition-dimension-cost-per-outcome-snapshot";

import {
    createInsuranceCreatedAtDimensionCostPerOutcomeSnapshotApplication
} from "./d1-acquisition-dimension-cost-per-outcome-snapshot-created-at-cohort";

import type {
    InsuranceCreatedAtDimensionCostPerOutcomeSnapshotCohortReader
} from "./d1-acquisition-dimension-cost-per-outcome-snapshot-created-at-cohort";


class RecordingCohortReader
implements InsuranceCreatedAtDimensionCostPerOutcomeSnapshotCohortReader {
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
                InsuranceCreatedAtDimensionCostPerOutcomeSnapshotCohortReader[
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
                InsuranceCreatedAtDimensionCostPerOutcomeSnapshotCohortReader[
                    "listCreatedAtRangePage"
                ]
            >
        >;
    }
}


class RecordingSnapshotApplication
implements InsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication {
    calls =
        0;

    input:
        Parameters<
            InsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication[
                "getSnapshot"
            ]
        >[0] | undefined;

    async getSnapshot(
        input:
            Parameters<
                InsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication[
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
                INSURANCE_ACQUISITION_DIMENSION_COST_PER_OUTCOME_SNAPSHOT_VERSION,

            relationshipCount:
                input.relationshipIds.length,

            projections:
                []
        };
    }
}


test(
    "reads created-at cohort once and delegates exact relationship IDs once to cost-per-outcome snapshot",
    async () => {
        const cohortReader =
            new RecordingCohortReader([
                {
                    relationshipId:
                        "relationship:ins-004i-a"
                },
                {
                    relationshipId:
                        "relationship:ins-004i-b"
                }
            ]);

        const snapshotApplication =
            new RecordingSnapshotApplication();

        const application =
            createInsuranceCreatedAtDimensionCostPerOutcomeSnapshotApplication(
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
                    "relationship:ins-004i-a",
                    "relationship:ins-004i-b"
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
            createInsuranceCreatedAtDimensionCostPerOutcomeSnapshotApplication(
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
            createInsuranceCreatedAtDimensionCostPerOutcomeSnapshotApplication(
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
            createInsuranceCreatedAtDimensionCostPerOutcomeSnapshotApplication(
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
            createInsuranceCreatedAtDimensionCostPerOutcomeSnapshotApplication(
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
            createInsuranceCreatedAtDimensionCostPerOutcomeSnapshotApplication(
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
