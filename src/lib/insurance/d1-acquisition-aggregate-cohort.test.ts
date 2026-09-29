import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceAcquisitionAggregateAnalytics
} from "./acquisition-aggregate-analytics";

import {
    createInsuranceRecentRelationshipAggregateAnalyticsApplication
} from "./d1-acquisition-aggregate-cohort";

import type {
    InsuranceRecentRelationshipCohortReader
} from "./d1-acquisition-aggregate-cohort";

import type {
    GetInsuranceAcquisitionAggregateAnalyticsInput,
    InsuranceAcquisitionAggregateAnalyticsApplication
} from "./d1-acquisition-aggregate-analytics";


class RecordingCohortReader
implements InsuranceRecentRelationshipCohortReader {
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


class RecordingAggregateApplication
implements InsuranceAcquisitionAggregateAnalyticsApplication {
    calls =
        0;

    input:
        GetInsuranceAcquisitionAggregateAnalyticsInput | undefined;

    async getAggregateAnalytics(
        input:
            GetInsuranceAcquisitionAggregateAnalyticsInput
    ){
        this.calls +=
            1;

        this.input =
            input;

        return createInsuranceAcquisitionAggregateAnalytics({
            dimension:
                input.dimension,
            views:
                []
        });
    }
}


test(
    "uses canonical recent relationship cohort and forwards IDs to aggregate analytics",
    async () => {
        const cohortReader =
            new RecordingCohortReader([
                {
                    relationshipId:
                        "relationship:ins-003k-1"
                },
                {
                    relationshipId:
                        "relationship:ins-003k-2"
                }
            ]);

        const aggregateApplication =
            new RecordingAggregateApplication();

        const application =
            createInsuranceRecentRelationshipAggregateAnalyticsApplication(
                cohortReader,
                aggregateApplication
            );

        const result =
            await application
                .getRecentRelationshipAggregateAnalytics({
                    dimension:
                        "acquisitionSource",
                    limit:
                        25
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
            aggregateApplication.calls,
            1
        );

        assert.deepEqual(
            aggregateApplication.input,
            {
                dimension:
                    "acquisitionSource",
                relationshipIds: [
                    "relationship:ins-003k-1",
                    "relationship:ins-003k-2"
                ]
            }
        );

        assert.equal(
            result.dimension,
            "acquisitionSource"
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
                        "relationship:ins-003k-default"
                }
            ]);

        const aggregateApplication =
            new RecordingAggregateApplication();

        const application =
            createInsuranceRecentRelationshipAggregateAnalyticsApplication(
                cohortReader,
                aggregateApplication
            );

        await application
            .getRecentRelationshipAggregateAnalytics({
                dimension:
                    "campaign"
            });

        assert.equal(
            cohortReader.calls,
            1
        );

        assert.equal(
            cohortReader.requestedLimit,
            undefined
        );

        assert.deepEqual(
            aggregateApplication.input
                ?.relationshipIds,
            [
                "relationship:ins-003k-default"
            ]
        );
    }
);


test(
    "preserves empty canonical CRM cohort",
    async () => {
        const cohortReader =
            new RecordingCohortReader(
                []
            );

        const aggregateApplication =
            new RecordingAggregateApplication();

        const application =
            createInsuranceRecentRelationshipAggregateAnalyticsApplication(
                cohortReader,
                aggregateApplication
            );

        const result =
            await application
                .getRecentRelationshipAggregateAnalytics({
                    dimension:
                        "state",
                    limit:
                        10
                });

        assert.equal(
            cohortReader.calls,
            1
        );

        assert.equal(
            aggregateApplication.calls,
            1
        );

        assert.deepEqual(
            aggregateApplication.input
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
    "rejects malformed relationship returned by cohort before aggregate application",
    async () => {
        const cohortReader =
            new RecordingCohortReader([
                {
                    relationshipId:
                        "lead:not-a-relationship"
                }
            ]);

        const aggregateApplication =
            new RecordingAggregateApplication();

        const application =
            createInsuranceRecentRelationshipAggregateAnalyticsApplication(
                cohortReader,
                aggregateApplication
            );

        await assert.rejects(
            application
                .getRecentRelationshipAggregateAnalytics({
                    dimension:
                        "assignedProducer",
                    limit:
                        5
                }),
            /relationship/
        );

        assert.equal(
            cohortReader.calls,
            1
        );

        assert.equal(
            aggregateApplication.calls,
            0
        );
    }
);
