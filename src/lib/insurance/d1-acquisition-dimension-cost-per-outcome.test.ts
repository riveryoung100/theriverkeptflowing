import assert from "node:assert/strict";
import test from "node:test";

import {
    INSURANCE_ACQUISITION_ANALYTICS_PROJECTION_VERSION
} from "./acquisition-analytics";

import type {
    InsuranceAttributedEconomicsBatchApplication
} from "./d1-attributed-economics-batch";

import {
    createInsuranceAcquisitionDimensionCostPerOutcomeApplication
} from "./d1-acquisition-dimension-cost-per-outcome";

import type {
    InsuranceDimensionCostPerOutcomeFactReader
} from "./d1-acquisition-dimension-cost-per-outcome";


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
                        "TX",

                    postalCode:
                        "79720",

                    productInterest:
                        "auto",

                    quoteStatus:
                        index === 0
                            ? "quoted"
                            : "not-started",

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
implements InsuranceDimensionCostPerOutcomeFactReader {
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
                InsuranceDimensionCostPerOutcomeFactReader[
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
    "canonicalizes one cohort and loads views and outcomes once using identical IDs",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        outcomeReader.facts = [
            fact(
                "ins-004g-a-quoted",
                "relationship:ins-004g-a",
                "quoted"
            ),
            fact(
                "ins-004g-a-bound",
                "relationship:ins-004g-a",
                "bound"
            ),
            fact(
                "ins-004g-b-quoted",
                "relationship:ins-004g-b",
                "quoted"
            )
        ];

        const application =
            createInsuranceAcquisitionDimensionCostPerOutcomeApplication(
                viewsApplication,
                outcomeReader
            );

        const result =
            await application
                .getDimensionCostPerOutcome({
                    dimension:
                        "acquisitionSource",

                    relationshipIds: [
                        "relationship:ins-004g-a",
                        "relationship:ins-004g-a",
                        "relationship:ins-004g-b"
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
                "relationship:ins-004g-a",
                "relationship:ins-004g-b"
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

        assert.deepEqual(
            result.buckets[0]
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
            result.buckets[0]
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
    "empty canonical cohort performs zero downstream reads",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        const application =
            createInsuranceAcquisitionDimensionCostPerOutcomeApplication(
                viewsApplication,
                outcomeReader
            );

        const result =
            await application
                .getDimensionCostPerOutcome({
                    dimension:
                        "state",

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
    "rejects malformed relationship identity before downstream reads",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        const application =
            createInsuranceAcquisitionDimensionCostPerOutcomeApplication(
                viewsApplication,
                outcomeReader
            );

        await assert.rejects(
            application
                .getDimensionCostPerOutcome({
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
    "rejects unsupported dimension before downstream reads",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        const application =
            createInsuranceAcquisitionDimensionCostPerOutcomeApplication(
                viewsApplication,
                outcomeReader
            );

        await assert.rejects(
            application
                .getDimensionCostPerOutcome({
                    dimension:
                        "not-a-dimension" as never,

                    relationshipIds: [
                        "relationship:ins-004g-a"
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
    "bound-only durable evidence produces only cost per bind",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        outcomeReader.facts = [
            fact(
                "ins-004g-a-bound",
                "relationship:ins-004g-a",
                "bound"
            )
        ];

        const application =
            createInsuranceAcquisitionDimensionCostPerOutcomeApplication(
                viewsApplication,
                outcomeReader
            );

        const result =
            await application
                .getDimensionCostPerOutcome({
                    dimension:
                        "quoteStatus",

                    relationshipIds: [
                        "relationship:ins-004g-a"
                    ] as never
                });

        const currency =
            result.buckets[0]
                ?.currencies[0];

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
);


test(
    "durable outcome facts outside the cohort remain rejected by INS-004F",
    async () => {
        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        outcomeReader.facts = [
            fact(
                "ins-004g-outside",
                "relationship:ins-004g-outside",
                "quoted"
            )
        ];

        const application =
            createInsuranceAcquisitionDimensionCostPerOutcomeApplication(
                viewsApplication,
                outcomeReader
            );

        await assert.rejects(
            application
                .getDimensionCostPerOutcome({
                    dimension:
                        "state",

                    relationshipIds: [
                        "relationship:ins-004g-a"
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
