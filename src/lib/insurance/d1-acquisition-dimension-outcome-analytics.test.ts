import assert from "node:assert/strict";
import test from "node:test";

import type {
    InsuranceAttributedEconomicsBatchApplication
} from "./d1-attributed-economics-batch";

import {
    createInsuranceAcquisitionDimensionOutcomeAnalyticsApplication
} from "./d1-acquisition-dimension-outcome-analytics";

import type {
    InsuranceDimensionOutcomeFactReader
} from "./d1-acquisition-dimension-outcome-analytics";


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
            relationshipId => ({
                relationshipId,

                analytics: {
                    relationshipId
                },

                presentation: {
                    relationshipId,

                    state:
                        relationshipId.endsWith("-a")
                            ? "TX"
                            : "NM",

                    postalCode:
                        "79720",

                    productInterest:
                        "auto",

                    quoteStatus:
                        "not-started",

                    acquisitionSource:
                        "google",

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
implements InsuranceDimensionOutcomeFactReader {
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
                InsuranceDimensionOutcomeFactReader[
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
    "canonicalizes cohort once and supplies identical IDs to views and durable outcomes",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        outcomeReader.facts = [
            fact(
                "ins-004c-a-quoted",
                "relationship:ins-004c-a",
                "quoted"
            ),
            fact(
                "ins-004c-a-bound",
                "relationship:ins-004c-a",
                "bound"
            )
        ];

        const application =
            createInsuranceAcquisitionDimensionOutcomeAnalyticsApplication(
                viewsApplication,
                outcomeReader
            );

        const result =
            await application
                .getDimensionOutcomeAnalytics({
                    dimension:
                        "state",

                    relationshipIds: [
                        "relationship:ins-004c-a",
                        "relationship:ins-004c-a",
                        "relationship:ins-004c-b"
                    ] as never
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
                "relationship:ins-004c-a",
                "relationship:ins-004c-b"
            ]
        );

        assert.deepEqual(
            outcomeReader.relationshipIds,
            viewsApplication.relationshipIds
        );

        assert.equal(
            result.relationshipCount,
            2
        );

        assert.equal(
            result.buckets[0]
                ?.dimensionValue,
            "NM"
        );

        assert.equal(
            result.buckets[1]
                ?.dimensionValue,
            "TX"
        );

        assert.equal(
            result.buckets[1]
                ?.quotedRelationshipCount,
            1
        );

        assert.equal(
            result.buckets[1]
                ?.boundRelationshipCount,
            1
        );
    }
);


test(
    "empty canonical cohort performs zero downstream reads",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        const application =
            createInsuranceAcquisitionDimensionOutcomeAnalyticsApplication(
                viewsApplication,
                outcomeReader
            );

        const result =
            await application
                .getDimensionOutcomeAnalytics({
                    dimension:
                        "campaign",

                    relationshipIds:
                        []
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
            result.buckets,
            []
        );
    }
);


test(
    "rejects malformed relationship identity before any downstream read",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        const application =
            createInsuranceAcquisitionDimensionOutcomeAnalyticsApplication(
                viewsApplication,
                outcomeReader
            );

        await assert.rejects(
            application
                .getDimensionOutcomeAnalytics({
                    dimension:
                        "state",

                    relationshipIds: [
                        "lead:not-a-relationship"
                    ] as never
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
    "delegates bound-only evidence without inventing quoted evidence",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        outcomeReader.facts = [
            fact(
                "ins-004c-a-bound",
                "relationship:ins-004c-a",
                "bound"
            )
        ];

        const application =
            createInsuranceAcquisitionDimensionOutcomeAnalyticsApplication(
                viewsApplication,
                outcomeReader
            );

        const result =
            await application
                .getDimensionOutcomeAnalytics({
                    dimension:
                        "state",

                    relationshipIds: [
                        "relationship:ins-004c-a"
                    ] as never
                });

        assert.equal(
            result.buckets[0]
                ?.quotedRelationshipCount,
            0
        );

        assert.equal(
            result.buckets[0]
                ?.boundRelationshipCount,
            1
        );
    }
);


test(
    "delegates quoteStatus strictly as segmentation metadata",
    async () => {
        const viewsApplication:
            InsuranceAttributedEconomicsBatchApplication = {
                async getViews(
                    relationshipIds
                ){
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
                                    "TX",

                                postalCode:
                                    "79720",

                                productInterest:
                                    "auto",

                                quoteStatus:
                                    index === 0
                                        ? "quoted"
                                        : "not-started",

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
            };

        const outcomeReader =
            new RecordingOutcomeReader();

        outcomeReader.facts = [
            fact(
                "ins-004c-b-quoted",
                "relationship:ins-004c-b",
                "quoted"
            )
        ];

        const application =
            createInsuranceAcquisitionDimensionOutcomeAnalyticsApplication(
                viewsApplication,
                outcomeReader
            );

        const result =
            await application
                .getDimensionOutcomeAnalytics({
                    dimension:
                        "quoteStatus",

                    relationshipIds: [
                        "relationship:ins-004c-a",
                        "relationship:ins-004c-b"
                    ] as never
                });

        const quotedStatus =
            result.buckets.find(
                bucket =>
                    bucket.dimensionValue ===
                    "quoted"
            );

        const notStarted =
            result.buckets.find(
                bucket =>
                    bucket.dimensionValue ===
                    "not-started"
            );

        assert.equal(
            quotedStatus
                ?.quotedRelationshipCount,
            0
        );

        assert.equal(
            notStarted
                ?.quotedRelationshipCount,
            1
        );
    }
);


test(
    "canonical durable outcome validation remains owned by INS-004B",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        outcomeReader.facts = [
            fact(
                "ins-004c-outside",
                "relationship:ins-004c-outside",
                "quoted"
            )
        ];

        const application =
            createInsuranceAcquisitionDimensionOutcomeAnalyticsApplication(
                viewsApplication,
                outcomeReader
            );

        await assert.rejects(
            application
                .getDimensionOutcomeAnalytics({
                    dimension:
                        "state",

                    relationshipIds: [
                        "relationship:ins-004c-a"
                    ] as never
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
