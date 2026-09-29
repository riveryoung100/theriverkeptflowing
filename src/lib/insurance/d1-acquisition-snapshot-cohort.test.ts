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
    createInsuranceRecentRelationshipAggregateSnapshotApplication
} from "./d1-acquisition-snapshot-cohort";

import type {
    InsuranceRecentRelationshipSnapshotCohortReader
} from "./d1-acquisition-snapshot-cohort";


class RecordingCohortReader
implements InsuranceRecentRelationshipSnapshotCohortReader {
    calls =
        0;

    requestedLimit:
        number | undefined;

    constructor(
        private readonly relationships:
            readonly {
                readonly relationshipId:
                    string;
            }[]
    ){}

    async list(
        limit?:
            number
    ): Promise<
        readonly {
            readonly relationshipId:
                string;
        }[]
    > {
        this.calls +=
            1;

        this.requestedLimit =
            limit;

        return this.relationships;
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
    "loads bounded recent CRM relationships once and forwards IDs plus dimensions to snapshot",
    async () => {
        const cohortReader =
            new RecordingCohortReader([
                {
                    relationshipId:
                        "relationship:ins-003n-1"
                },
                {
                    relationshipId:
                        "relationship:ins-003n-2"
                }
            ]);

        const snapshotApplication =
            new RecordingSnapshotApplication();

        const application =
            createInsuranceRecentRelationshipAggregateSnapshotApplication(
                cohortReader,
                snapshotApplication
            );

        const result =
            await application
                .getRecentRelationshipSnapshot({
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
            cohortReader.requestedLimit,
            25
        );

        assert.equal(
            snapshotApplication.calls,
            1
        );

        assert.deepEqual(
            snapshotApplication.input,
            {
                relationshipIds: [
                    "relationship:ins-003n-1",
                    "relationship:ins-003n-2"
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
    "omitted limit preserves canonical CRM default ownership",
    async () => {
        const cohortReader =
            new RecordingCohortReader([
                {
                    relationshipId:
                        "relationship:ins-003n-default"
                }
            ]);

        const snapshotApplication =
            new RecordingSnapshotApplication();

        const application =
            createInsuranceRecentRelationshipAggregateSnapshotApplication(
                cohortReader,
                snapshotApplication
            );

        await application
            .getRecentRelationshipSnapshot({
                dimensions: [
                    "sourceVendor",
                    "assignedProducer"
                ]
            });

        assert.equal(
            cohortReader.calls,
            1
        );

        assert.equal(
            cohortReader.requestedLimit,
            undefined
        );

        assert.equal(
            snapshotApplication.calls,
            1
        );

        assert.deepEqual(
            snapshotApplication.input
                ?.relationshipIds,
            [
                "relationship:ins-003n-default"
            ]
        );
    }
);


test(
    "empty CRM cohort is forwarded as an empty snapshot cohort",
    async () => {
        const cohortReader =
            new RecordingCohortReader(
                []
            );

        const snapshotApplication =
            new RecordingSnapshotApplication();

        const application =
            createInsuranceRecentRelationshipAggregateSnapshotApplication(
                cohortReader,
                snapshotApplication
            );

        const result =
            await application
                .getRecentRelationshipSnapshot({
                    limit:
                        10,
                    dimensions: [
                        "campaign",
                        "productInterest"
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
    "rejects malformed CRM relationship before snapshot execution",
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
            createInsuranceRecentRelationshipAggregateSnapshotApplication(
                cohortReader,
                snapshotApplication
            );

        await assert.rejects(
            application
                .getRecentRelationshipSnapshot({
                    limit:
                        5,
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
    "preserves requested dimension order for downstream snapshot ownership",
    async () => {
        const cohortReader =
            new RecordingCohortReader([
                {
                    relationshipId:
                        "relationship:ins-003n-dimensions"
                }
            ]);

        const snapshotApplication =
            new RecordingSnapshotApplication();

        const application =
            createInsuranceRecentRelationshipAggregateSnapshotApplication(
                cohortReader,
                snapshotApplication
            );

        await application
            .getRecentRelationshipSnapshot({
                dimensions: [
                    "state",
                    "campaign",
                    "state",
                    "acquisitionSource"
                ]
            });

        assert.deepEqual(
            snapshotApplication.input
                ?.dimensions,
            [
                "state",
                "campaign",
                "state",
                "acquisitionSource"
            ]
        );
    }
);
