import assert from "node:assert/strict";
import test from "node:test";

import type {
    InsuranceAttributedEconomicsBatchApplication
} from "./d1-attributed-economics-batch";

import {
    createInsuranceAcquisitionDimensionOutcomeSnapshotApplication,
    INSURANCE_ACQUISITION_DIMENSION_OUTCOME_SNAPSHOT_VERSION
} from "./acquisition-dimension-outcome-snapshot";

import type {
    InsuranceDimensionOutcomeSnapshotFactReader
} from "./acquisition-dimension-outcome-snapshot";


class RecordingViewsApplication
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
            (
                relationshipId,
                index
            ) => ({
                relationshipId,

                analytics: {
                    relationshipId
                },

                presentation: {
                    relationshipId,

                    state:
                        index === 0
                            ? "TX"
                            : "NM",

                    postalCode:
                        "79720",

                    productInterest:
                        index === 0
                            ? "auto"
                            : "home",

                    quoteStatus:
                        index === 0
                            ? "quoted"
                            : "not-started",

                    acquisitionSource:
                        index === 0
                            ? "google"
                            : "referral",

                    campaign:
                        "fall-2026",

                    consentChannels:
                        [],

                    doNotContact:
                        false,

                    recentEvents:
                        []
                }
            })
        ) as never;
    }
}


class RecordingOutcomeReader
implements InsuranceDimensionOutcomeSnapshotFactReader {
    calls =
        0;

    relationshipIds:
        readonly string[] | undefined;

    facts:
        readonly unknown[] =
            [];

    async listForRelationships(
        relationshipIds:
            Parameters<
                InsuranceDimensionOutcomeSnapshotFactReader[
                    "listForRelationships"
                ]
            >[0]
    ){
        this.calls +=
            1;

        this.relationshipIds =
            relationshipIds;

        return this.facts as never;
    }
}


function fact(
    suffix:
        string,
    relationshipId:
        string,
    kind:
        "quoted" | "bound"
){
    return {
        outcomeFactId:
            `outcome-fact:${suffix}`,

        relationshipId,

        kind,

        occurredAt:
            "2026-09-15T12:00:00.000Z"
    };
}


test(
    "loads one cohort once and derives multiple dimensions from the same views and outcome facts",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        outcomeReader.facts = [
            fact(
                "ins-004d-a-quoted",
                "relationship:ins-004d-a",
                "quoted"
            ),
            fact(
                "ins-004d-a-bound",
                "relationship:ins-004d-a",
                "bound"
            ),
            fact(
                "ins-004d-b-quoted",
                "relationship:ins-004d-b",
                "quoted"
            )
        ];

        const application =
            createInsuranceAcquisitionDimensionOutcomeSnapshotApplication(
                viewsApplication,
                outcomeReader
            );

        const result =
            await application
                .getSnapshot({
                    relationshipIds: [
                        "relationship:ins-004d-a",
                        "relationship:ins-004d-a",
                        "relationship:ins-004d-b"
                    ] as never,

                    dimensions: [
                        "acquisitionSource",
                        "state",
                        "campaign"
                    ]
                });

        assert.equal(
            viewsApplication.calls,
            1
        );

        assert.equal(
            outcomeReader.calls,
            1
        );

        assert.deepEqual(
            viewsApplication.relationshipIds,
            [
                "relationship:ins-004d-a",
                "relationship:ins-004d-b"
            ]
        );

        assert.deepEqual(
            outcomeReader.relationshipIds,
            viewsApplication.relationshipIds
        );

        assert.equal(
            result.version,
            INSURANCE_ACQUISITION_DIMENSION_OUTCOME_SNAPSHOT_VERSION
        );

        assert.equal(
            result.relationshipCount,
            2
        );

        assert.deepEqual(
            result.analytics.map(
                analytics =>
                    analytics.dimension
            ),
            [
                "acquisitionSource",
                "state",
                "campaign"
            ]
        );

        assert.equal(
            result.analytics[0]
                ?.buckets.find(
                    bucket =>
                        bucket.dimensionValue ===
                        "google"
                )
                ?.boundRelationshipCount,
            1
        );

        assert.equal(
            result.analytics[1]
                ?.buckets.find(
                    bucket =>
                        bucket.dimensionValue ===
                        "NM"
                )
                ?.quotedRelationshipCount,
            1
        );
    }
);


test(
    "deduplicates requested dimensions while preserving first occurrence order",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        const application =
            createInsuranceAcquisitionDimensionOutcomeSnapshotApplication(
                viewsApplication,
                outcomeReader
            );

        const result =
            await application
                .getSnapshot({
                    relationshipIds: [
                        "relationship:ins-004d-a"
                    ] as never,

                    dimensions: [
                        "state",
                        "campaign",
                        "state",
                        "productInterest",
                        "campaign"
                    ]
                });

        assert.deepEqual(
            result.analytics.map(
                analytics =>
                    analytics.dimension
            ),
            [
                "state",
                "campaign",
                "productInterest"
            ]
        );

        assert.equal(
            viewsApplication.calls,
            1
        );

        assert.equal(
            outcomeReader.calls,
            1
        );
    }
);


test(
    "empty cohort performs zero downstream reads while returning requested zero projections",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        const application =
            createInsuranceAcquisitionDimensionOutcomeSnapshotApplication(
                viewsApplication,
                outcomeReader
            );

        const result =
            await application
                .getSnapshot({
                    relationshipIds:
                        [],

                    dimensions: [
                        "state",
                        "campaign"
                    ]
                });

        assert.equal(
            viewsApplication.calls,
            0
        );

        assert.equal(
            outcomeReader.calls,
            0
        );

        assert.equal(
            result.relationshipCount,
            0
        );

        assert.deepEqual(
            result.analytics.map(
                analytics => ({
                    dimension:
                        analytics.dimension,

                    relationshipCount:
                        analytics.relationshipCount,

                    buckets:
                        analytics.buckets
                })
            ),
            [
                {
                    dimension:
                        "state",

                    relationshipCount:
                        0,

                    buckets:
                        []
                },
                {
                    dimension:
                        "campaign",

                    relationshipCount:
                        0,

                    buckets:
                        []
                }
            ]
        );
    }
);


test(
    "rejects malformed relationship identity before downstream reads",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        const application =
            createInsuranceAcquisitionDimensionOutcomeSnapshotApplication(
                viewsApplication,
                outcomeReader
            );

        await assert.rejects(
            application
                .getSnapshot({
                    relationshipIds: [
                        "lead:not-a-relationship"
                    ] as never,

                    dimensions: [
                        "state"
                    ]
                }),
            /relationship/
        );

        assert.equal(
            viewsApplication.calls,
            0
        );

        assert.equal(
            outcomeReader.calls,
            0
        );
    }
);


test(
    "rejects unsupported dimension before downstream reads",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        const application =
            createInsuranceAcquisitionDimensionOutcomeSnapshotApplication(
                viewsApplication,
                outcomeReader
            );

        await assert.rejects(
            application
                .getSnapshot({
                    relationshipIds: [
                        "relationship:ins-004d-a"
                    ] as never,

                    dimensions: [
                        "not-a-dimension"
                    ] as never
                }),
            /unsupported dimension/
        );

        assert.equal(
            viewsApplication.calls,
            0
        );

        assert.equal(
            outcomeReader.calls,
            0
        );
    }
);


test(
    "bound-only durable evidence remains bound-only across every requested dimension",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        outcomeReader.facts = [
            fact(
                "ins-004d-a-bound",
                "relationship:ins-004d-a",
                "bound"
            )
        ];

        const application =
            createInsuranceAcquisitionDimensionOutcomeSnapshotApplication(
                viewsApplication,
                outcomeReader
            );

        const result =
            await application
                .getSnapshot({
                    relationshipIds: [
                        "relationship:ins-004d-a"
                    ] as never,

                    dimensions: [
                        "state",
                        "quoteStatus",
                        "acquisitionSource"
                    ]
                });

        for(const analytics of result.analytics){
            assert.equal(
                analytics.buckets[0]
                    ?.quotedRelationshipCount,
                0
            );

            assert.equal(
                analytics.buckets[0]
                    ?.boundRelationshipCount,
                1
            );
        }
    }
);


test(
    "durable fact validation is shared across the snapshot rather than inferred per presentation",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        outcomeReader.facts = [
            fact(
                "ins-004d-outside",
                "relationship:ins-004d-outside",
                "quoted"
            )
        ];

        const application =
            createInsuranceAcquisitionDimensionOutcomeSnapshotApplication(
                viewsApplication,
                outcomeReader
            );

        await assert.rejects(
            application
                .getSnapshot({
                    relationshipIds: [
                        "relationship:ins-004d-a"
                    ] as never,

                    dimensions: [
                        "state",
                        "quoteStatus"
                    ]
                }),
            /cohort/
        );

        assert.equal(
            viewsApplication.calls,
            1
        );

        assert.equal(
            outcomeReader.calls,
            1
        );
    }
);
