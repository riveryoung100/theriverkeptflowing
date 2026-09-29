import assert from "node:assert/strict";
import test from "node:test";

import {
    INSURANCE_ACQUISITION_ANALYTICS_PROJECTION_VERSION
} from "./acquisition-analytics";

import type {
    InsuranceAttributedEconomicsBatchApplication
} from "./d1-attributed-economics-batch";

import {
    createInsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication,
    INSURANCE_ACQUISITION_DIMENSION_COST_PER_OUTCOME_SNAPSHOT_VERSION
} from "./acquisition-dimension-cost-per-outcome-snapshot";

import type {
    InsuranceDimensionCostPerOutcomeSnapshotFactReader
} from "./acquisition-dimension-cost-per-outcome-snapshot";


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
                    projectionVersion:
                        INSURANCE_ACQUISITION_ANALYTICS_PROJECTION_VERSION,

                    relationshipId,

                    currencies: [
                        {
                            currency:
                                "USD",

                            acquisitionCostMinorUnits:
                                index === 0
                                    ? 1000
                                    : 500,

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
                                index === 0
                                    ? -1000
                                    : -500
                        }
                    ],

                    renewalFactCount:
                        0
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
implements InsuranceDimensionCostPerOutcomeSnapshotFactReader {
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
                InsuranceDimensionCostPerOutcomeSnapshotFactReader[
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
    "loads one cohort once and derives multiple dimension cost-per-outcome projections",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        outcomeReader.facts = [
            fact(
                "ins-004h-a-quoted",
                "relationship:ins-004h-a",
                "quoted"
            ),
            fact(
                "ins-004h-a-bound",
                "relationship:ins-004h-a",
                "bound"
            ),
            fact(
                "ins-004h-b-quoted",
                "relationship:ins-004h-b",
                "quoted"
            )
        ];

        const application =
            createInsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication(
                viewsApplication,
                outcomeReader
            );

        const result =
            await application
                .getSnapshot({
                    relationshipIds: [
                        "relationship:ins-004h-a",
                        "relationship:ins-004h-a",
                        "relationship:ins-004h-b"
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
                "relationship:ins-004h-a",
                "relationship:ins-004h-b"
            ]
        );

        assert.deepEqual(
            outcomeReader.relationshipIds,
            viewsApplication.relationshipIds
        );

        assert.equal(
            result.version,
            INSURANCE_ACQUISITION_DIMENSION_COST_PER_OUTCOME_SNAPSHOT_VERSION
        );

        assert.equal(
            result.relationshipCount,
            2
        );

        assert.deepEqual(
            result.projections.map(
                projection =>
                    projection.dimension
            ),
            [
                "acquisitionSource",
                "state",
                "campaign"
            ]
        );

        const google =
            result.projections[0]
                ?.buckets.find(
                    bucket =>
                        bucket.dimensionValue ===
                        "google"
                );

        assert.deepEqual(
            google
                ?.currencies[0]
                ?.costPerQuote,
            {
                numeratorMinorUnits:
                    1000,

                denominatorCount:
                    1
            }
        );

        assert.deepEqual(
            google
                ?.currencies[0]
                ?.costPerBind,
            {
                numeratorMinorUnits:
                    1000,

                denominatorCount:
                    1
            }
        );

        const campaign =
            result.projections[2]
                ?.buckets[0];

        assert.deepEqual(
            campaign
                ?.currencies[0]
                ?.costPerQuote,
            {
                numeratorMinorUnits:
                    1500,

                denominatorCount:
                    2
            }
        );

        assert.deepEqual(
            campaign
                ?.currencies[0]
                ?.costPerBind,
            {
                numeratorMinorUnits:
                    1500,

                denominatorCount:
                    1
            }
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
            createInsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication(
                viewsApplication,
                outcomeReader
            );

        const result =
            await application
                .getSnapshot({
                    relationshipIds: [
                        "relationship:ins-004h-a"
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
            result.projections.map(
                projection =>
                    projection.dimension
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
    "empty cohort performs zero downstream reads and returns zero projections for requested dimensions",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        const application =
            createInsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication(
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
            result.projections.map(
                projection => ({
                    dimension:
                        projection.dimension,

                    relationshipCount:
                        projection.relationshipCount,

                    buckets:
                        projection.buckets
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
            createInsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication(
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
            createInsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication(
                viewsApplication,
                outcomeReader
            );

        await assert.rejects(
            application
                .getSnapshot({
                    relationshipIds: [
                        "relationship:ins-004h-a"
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
    "bound-only durable evidence creates cost per bind but no cost per quote across dimensions",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        outcomeReader.facts = [
            fact(
                "ins-004h-a-bound",
                "relationship:ins-004h-a",
                "bound"
            )
        ];

        const application =
            createInsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication(
                viewsApplication,
                outcomeReader
            );

        const result =
            await application
                .getSnapshot({
                    relationshipIds: [
                        "relationship:ins-004h-a"
                    ] as never,

                    dimensions: [
                        "state",
                        "quoteStatus",
                        "acquisitionSource"
                    ]
                });

        for(const projection of result.projections){
            const currency =
                projection.buckets[0]
                    ?.currencies[0];

            assert.equal(
                projection.buckets[0]
                    ?.quotedRelationshipCount,
                0
            );

            assert.equal(
                projection.buckets[0]
                    ?.boundRelationshipCount,
                1
            );

            assert.equal(
                currency
                    ?.costPerQuote,
                undefined
            );

            assert.deepEqual(
                currency
                    ?.costPerBind,
                {
                    numeratorMinorUnits:
                        1000,

                    denominatorCount:
                        1
                }
            );
        }
    }
);


test(
    "durable fact outside canonical cohort is rejected from shared evidence",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        outcomeReader.facts = [
            fact(
                "ins-004h-outside",
                "relationship:ins-004h-outside",
                "quoted"
            )
        ];

        const application =
            createInsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication(
                viewsApplication,
                outcomeReader
            );

        await assert.rejects(
            application
                .getSnapshot({
                    relationshipIds: [
                        "relationship:ins-004h-a"
                    ] as never,

                    dimensions: [
                        "state",
                        "campaign"
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
