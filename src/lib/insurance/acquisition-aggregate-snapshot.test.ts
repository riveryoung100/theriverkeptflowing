import assert from "node:assert/strict";
import test from "node:test";

import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import {
    createInsuranceRelationshipAcquisitionAnalytics
} from "./acquisition-analytics";

import type {
    InsuranceAttributedRelationshipEconomicsView
} from "./d1-acquisition-economics-view";

import type {
    InsuranceAttributedEconomicsBatchApplication
} from "./d1-attributed-economics-batch";

import {
    INSURANCE_ACQUISITION_AGGREGATE_SNAPSHOT_VERSION,
    createInsuranceAcquisitionAggregateSnapshotApplication
} from "./acquisition-aggregate-snapshot";


const relationshipOne =
    requireRiverCrmRelationshipId(
        "relationship:ins-003m-1"
    );

const relationshipTwo =
    requireRiverCrmRelationshipId(
        "relationship:ins-003m-2"
    );


class RecordingViewsApplication
implements InsuranceAttributedEconomicsBatchApplication {
    calls =
        0;

    requested:
        readonly string[] = [];

    constructor(
        private readonly views:
            readonly InsuranceAttributedRelationshipEconomicsView[]
    ){}

    async getViews(
        relationshipIds:
            Parameters<
                InsuranceAttributedEconomicsBatchApplication[
                    "getViews"
                ]
            >[0]
    ): Promise<
        readonly InsuranceAttributedRelationshipEconomicsView[]
    > {
        this.calls +=
            1;

        this.requested =
            [
                ...relationshipIds
            ];

        return this.views;
    }
}


function emptyAnalytics(
    relationshipId:
        typeof relationshipOne
){
    return createInsuranceRelationshipAcquisitionAnalytics({
        relationshipId,
        acquisitionCosts:
            [],
        premiumFacts:
            [],
        commissionFacts:
            [],
        renewalFacts:
            []
    });
}


test(
    "loads attributed economics views once and derives multiple aggregate dimensions",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication([
                {
                    relationshipId:
                        relationshipOne,
                    analytics:
                        emptyAnalytics(
                            relationshipOne
                        ),
                    presentation: {
                        relationshipId:
                            relationshipOne,
                        acquisitionSource:
                            "google",
                        campaign:
                            "launch"
                    } as never
                },
                {
                    relationshipId:
                        relationshipTwo,
                    analytics:
                        createInsuranceRelationshipAcquisitionAnalytics({
                            relationshipId:
                                relationshipTwo,
                            acquisitionCosts:
                                [],
                            premiumFacts:
                                [],
                            commissionFacts:
                                [],
                            renewalFacts:
                                []
                        }),
                    presentation: {
                        relationshipId:
                            relationshipTwo,
                        acquisitionSource:
                            "referral",
                        campaign:
                            "partner"
                    } as never
                }
            ]);

        const application =
            createInsuranceAcquisitionAggregateSnapshotApplication(
                viewsApplication
            );

        const result =
            await application
                .getSnapshot({
                    relationshipIds: [
                        relationshipOne,
                        relationshipTwo
                    ],
                    dimensions: [
                        "acquisitionSource",
                        "campaign"
                    ]
                });

        assert.equal(
            viewsApplication.calls,
            1
        );

        assert.deepEqual(
            viewsApplication.requested,
            [
                relationshipOne,
                relationshipTwo
            ]
        );

        assert.equal(
            result.version,
            INSURANCE_ACQUISITION_AGGREGATE_SNAPSHOT_VERSION
        );

        assert.equal(
            result.relationshipCount,
            2
        );

        assert.deepEqual(
            result.aggregates.map(
                aggregate=>
                    aggregate.dimension
            ),
            [
                "acquisitionSource",
                "campaign"
            ]
        );

        assert.equal(
            result.aggregates[0]
                ?.relationshipCount,
            2
        );

        assert.equal(
            result.aggregates[1]
                ?.relationshipCount,
            2
        );
    }
);


test(
    "deduplicates requested dimensions while preserving first occurrence",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication([
                {
                    relationshipId:
                        relationshipOne,
                    analytics:
                        emptyAnalytics(
                            relationshipOne
                        )
                }
            ]);

        const application =
            createInsuranceAcquisitionAggregateSnapshotApplication(
                viewsApplication
            );

        const result =
            await application
                .getSnapshot({
                    relationshipIds: [
                        relationshipOne
                    ],
                    dimensions: [
                        "state",
                        "campaign",
                        "state",
                        "campaign",
                        "assignedProducer"
                    ]
                });

        assert.equal(
            viewsApplication.calls,
            1
        );

        assert.deepEqual(
            result.aggregates.map(
                aggregate=>
                    aggregate.dimension
            ),
            [
                "state",
                "campaign",
                "assignedProducer"
            ]
        );
    }
);


test(
    "empty dimension request still loads canonical views only once",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication([
                {
                    relationshipId:
                        relationshipOne,
                    analytics:
                        emptyAnalytics(
                            relationshipOne
                        )
                }
            ]);

        const application =
            createInsuranceAcquisitionAggregateSnapshotApplication(
                viewsApplication
            );

        const result =
            await application
                .getSnapshot({
                    relationshipIds: [
                        relationshipOne
                    ],
                    dimensions:
                        []
                });

        assert.equal(
            viewsApplication.calls,
            1
        );

        assert.equal(
            result.relationshipCount,
            1
        );

        assert.deepEqual(
            result.aggregates,
            []
        );
    }
);


test(
    "empty relationship cohort remains deterministic across several dimensions",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication(
                []
            );

        const application =
            createInsuranceAcquisitionAggregateSnapshotApplication(
                viewsApplication
            );

        const result =
            await application
                .getSnapshot({
                    relationshipIds:
                        [],
                    dimensions: [
                        "acquisitionSource",
                        "campaign",
                        "productInterest",
                        "state",
                        "quoteStatus",
                        "assignedProducer"
                    ]
                });

        assert.equal(
            viewsApplication.calls,
            1
        );

        assert.equal(
            result.relationshipCount,
            0
        );

        assert.equal(
            result.aggregates.length,
            6
        );

        for(const aggregate of result.aggregates){
            assert.equal(
                aggregate.relationshipCount,
                0
            );

            assert.deepEqual(
                aggregate.buckets,
                []
            );
        }
    }
);
