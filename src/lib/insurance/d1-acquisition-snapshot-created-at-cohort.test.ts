import assert from "node:assert/strict";
import test from "node:test";

import {
    INSURANCE_ACQUISITION_AGGREGATE_SNAPSHOT_VERSION
} from "./acquisition-aggregate-snapshot";

import type {
    GetInsuranceAcquisitionAggregateSnapshotInput,
    InsuranceAcquisitionAggregateSnapshotApplication
} from "./acquisition-aggregate-snapshot";

import {
    createInsuranceCreatedAtAggregateSnapshotApplication
} from "./d1-acquisition-snapshot-created-at-cohort";

import type {
    InsuranceCreatedAtSnapshotCohortReader
} from "./d1-acquisition-snapshot-created-at-cohort";


class RecordingCreatedAtCohortReader
implements InsuranceCreatedAtSnapshotCohortReader {
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
                InsuranceCreatedAtSnapshotCohortReader[
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
                InsuranceCreatedAtSnapshotCohortReader[
                    "listCreatedAtRangePage"
                ]
            >
        >;
    }
}


class RecordingSnapshotApplication
implements InsuranceAcquisitionAggregateSnapshotApplication {
    calls =
        0;

    input:
        GetInsuranceAcquisitionAggregateSnapshotInput | undefined;

    async getSnapshot(
        input:
            GetInsuranceAcquisitionAggregateSnapshotInput
    ){
        this.calls +=
            1;

        this.input =
            input;

        return {
            version:
                INSURANCE_ACQUISITION_AGGREGATE_SNAPSHOT_VERSION,

            relationshipCount:
                input.relationshipIds.length,

            aggregates:
                []
        };
    }
}


test(
    "forwards explicit created-at window and limit to CRM then sends returned IDs to one snapshot",
    async () => {
        const cohortReader =
            new RecordingCreatedAtCohortReader([
                {
                    relationshipId:
                        "relationship:ins-003p-2"
                },
                {
                    relationshipId:
                        "relationship:ins-003p-1"
                }
            ]);

        const snapshotApplication =
            new RecordingSnapshotApplication();

        const application =
            createInsuranceCreatedAtAggregateSnapshotApplication(
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
            snapshotApplication.calls,
            1
        );

        assert.deepEqual(
            snapshotApplication.input,
            {
                relationshipIds: [
                    "relationship:ins-003p-2",
                    "relationship:ins-003p-1"
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
    "omitted limit stays omitted so CRM retains default ownership",
    async () => {
        const cohortReader =
            new RecordingCreatedAtCohortReader([
                {
                    relationshipId:
                        "relationship:ins-003p-default"
                }
            ]);

        const snapshotApplication =
            new RecordingSnapshotApplication();

        const application =
            createInsuranceCreatedAtAggregateSnapshotApplication(
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
                    "sourceVendor"
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

        assert.equal(
            snapshotApplication.calls,
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
                        "relationship:ins-003p-newer"
                },
                {
                    relationshipId:
                        "relationship:ins-003p-older"
                }
            ]);

        const snapshotApplication =
            new RecordingSnapshotApplication();

        const application =
            createInsuranceCreatedAtAggregateSnapshotApplication(
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
                    "productInterest"
                ]
            });

        assert.deepEqual(
            snapshotApplication.input
                ?.relationshipIds,
            [
                "relationship:ins-003p-newer",
                "relationship:ins-003p-older"
            ]
        );
    }
);


test(
    "empty created-at cohort still invokes one empty snapshot",
    async () => {
        const cohortReader =
            new RecordingCreatedAtCohortReader(
                []
            );

        const snapshotApplication =
            new RecordingSnapshotApplication();

        const application =
            createInsuranceCreatedAtAggregateSnapshotApplication(
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
                        "campaign",
                        "assignedProducer"
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
            snapshotApplication.input
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
    "rejects malformed relationship returned by CRM before snapshot execution",
    async () => {
        const cohortReader =
            new RecordingCreatedAtCohortReader([
                {
                    relationshipId:
                        "lead:not-a-relationship"
                }
            ]);

        const snapshotApplication =
            new RecordingSnapshotApplication();

        const application =
            createInsuranceCreatedAtAggregateSnapshotApplication(
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
                        "quoteStatus"
                    ]
                }),
            /relationship/
        );

        assert.equal(
            cohortReader.calls,
            1
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
            new RecordingCreatedAtCohortReader(
                []
            );

        const snapshotApplication =
            new RecordingSnapshotApplication();

        const application =
            createInsuranceCreatedAtAggregateSnapshotApplication(
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

        assert.equal(
            snapshotApplication.calls,
            1
        );
    }
);
