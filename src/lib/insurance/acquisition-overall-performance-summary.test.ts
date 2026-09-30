import assert from "node:assert/strict";
import test from "node:test";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import {
    INSURANCE_ACQUISITION_ANALYTICS_PROJECTION_VERSION
} from "./acquisition-analytics";

import {
    createInsuranceAcquisitionOutcomeFact
} from "./acquisition-outcomes";

import {
    createInsuranceAcquisitionOverallPerformanceSummary,
    INSURANCE_ACQUISITION_OVERALL_PERFORMANCE_SUMMARY_VERSION
} from "./acquisition-overall-performance-summary";

import type {
    InsuranceAttributedRelationshipEconomicsView
} from "./d1-acquisition-economics-view";


const relationshipOne =
    "relationship:ins-004t-a" as RiverCrmRelationshipId;

const relationshipTwo =
    "relationship:ins-004t-b" as RiverCrmRelationshipId;


interface CurrencyInput {
    readonly currency:
        string;

    readonly acquisitionCostMinorUnits:
        number;

    readonly quotedPremiumMinorUnits:
        number;

    readonly writtenPremiumMinorUnits:
        number;

    readonly renewalPremiumMinorUnits:
        number;

    readonly earnedCommissionMinorUnits:
        number;

    readonly paidCommissionMinorUnits:
        number;

    readonly chargebackMinorUnits:
        number;

    readonly adjustmentMinorUnits:
        number;

    readonly realizedCommissionMinorUnits:
        number;

    readonly contributionMarginMinorUnits:
        number;
}


function view(
    relationshipId:
        RiverCrmRelationshipId,
    currencies:
        readonly CurrencyInput[]
): InsuranceAttributedRelationshipEconomicsView {
    return {
        relationshipId,

        analytics: {
            projectionVersion:
                INSURANCE_ACQUISITION_ANALYTICS_PROJECTION_VERSION,

            relationshipId,

            currencies:
                currencies.map(
                    currency => ({
                        ...currency,

                        acquisitionCostFactCount:
                            0,

                        premiumFactCount:
                            0,

                        commissionFactCount:
                            0
                    })
                ),

            renewalFactCount:
                0
        }
    };
}


test(
    "combines canonical economics outcomes exact rates and cost per outcome without dimension bucketing",
    () => {
        const result =
            createInsuranceAcquisitionOverallPerformanceSummary({
                relationshipIds: [
                    relationshipOne,
                    relationshipTwo
                ],

                views: [
                    view(
                        relationshipOne,
                        [
                            {
                                currency:
                                    "USD",

                                acquisitionCostMinorUnits:
                                    1000,

                                quotedPremiumMinorUnits:
                                    100000,

                                writtenPremiumMinorUnits:
                                    90000,

                                renewalPremiumMinorUnits:
                                    0,

                                earnedCommissionMinorUnits:
                                    10000,

                                paidCommissionMinorUnits:
                                    8000,

                                chargebackMinorUnits:
                                    -500,

                                adjustmentMinorUnits:
                                    100,

                                realizedCommissionMinorUnits:
                                    7600,

                                contributionMarginMinorUnits:
                                    6600
                            },
                            {
                                currency:
                                    "EUR",

                                acquisitionCostMinorUnits:
                                    400,

                                quotedPremiumMinorUnits:
                                    30000,

                                writtenPremiumMinorUnits:
                                    25000,

                                renewalPremiumMinorUnits:
                                    0,

                                earnedCommissionMinorUnits:
                                    4000,

                                paidCommissionMinorUnits:
                                    3500,

                                chargebackMinorUnits:
                                    0,

                                adjustmentMinorUnits:
                                    0,

                                realizedCommissionMinorUnits:
                                    3500,

                                contributionMarginMinorUnits:
                                    3100
                            }
                        ]
                    ),

                    view(
                        relationshipTwo,
                        [
                            {
                                currency:
                                    "USD",

                                acquisitionCostMinorUnits:
                                    500,

                                quotedPremiumMinorUnits:
                                    50000,

                                writtenPremiumMinorUnits:
                                    40000,

                                renewalPremiumMinorUnits:
                                    30000,

                                earnedCommissionMinorUnits:
                                    6000,

                                paidCommissionMinorUnits:
                                    5000,

                                chargebackMinorUnits:
                                    0,

                                adjustmentMinorUnits:
                                    -100,

                                realizedCommissionMinorUnits:
                                    4900,

                                contributionMarginMinorUnits:
                                    4400
                            }
                        ]
                    )
                ],

                outcomeFacts: [
                    createInsuranceAcquisitionOutcomeFact({
                        outcomeFactId:
                            "outcome-fact:ins-004t-a-quote",

                        relationshipId:
                            relationshipOne,

                        kind:
                            "quoted",

                        occurredAt:
                            "2026-09-01T00:00:00.000Z"
                    }),

                    createInsuranceAcquisitionOutcomeFact({
                        outcomeFactId:
                            "outcome-fact:ins-004t-a-bind",

                        relationshipId:
                            relationshipOne,

                        kind:
                            "bound",

                        occurredAt:
                            "2026-09-02T00:00:00.000Z"
                    }),

                    createInsuranceAcquisitionOutcomeFact({
                        outcomeFactId:
                            "outcome-fact:ins-004t-b-quote",

                        relationshipId:
                            relationshipTwo,

                        kind:
                            "quoted",

                        occurredAt:
                            "2026-09-03T00:00:00.000Z"
                    })
                ]
            });

        assert.equal(
            result.projectionVersion,
            INSURANCE_ACQUISITION_OVERALL_PERFORMANCE_SUMMARY_VERSION
        );

        assert.equal(
            result.relationshipCount,
            2
        );

        assert.deepEqual(
            result.currencies,
            [
                {
                    currency:
                        "EUR",

                    acquisitionCostMinorUnits:
                        400,

                    quotedPremiumMinorUnits:
                        30000,

                    writtenPremiumMinorUnits:
                        25000,

                    renewalPremiumMinorUnits:
                        0,

                    earnedCommissionMinorUnits:
                        4000,

                    paidCommissionMinorUnits:
                        3500,

                    chargebackMinorUnits:
                        0,

                    adjustmentMinorUnits:
                        0,

                    realizedCommissionMinorUnits:
                        3500,

                    contributionMarginMinorUnits:
                        3100
                },
                {
                    currency:
                        "USD",

                    acquisitionCostMinorUnits:
                        1500,

                    quotedPremiumMinorUnits:
                        150000,

                    writtenPremiumMinorUnits:
                        130000,

                    renewalPremiumMinorUnits:
                        30000,

                    earnedCommissionMinorUnits:
                        16000,

                    paidCommissionMinorUnits:
                        13000,

                    chargebackMinorUnits:
                        -500,

                    adjustmentMinorUnits:
                        0,

                    realizedCommissionMinorUnits:
                        12500,

                    contributionMarginMinorUnits:
                        11000
                }
            ]
        );

        assert.equal(
            result.outcomes.quotedRelationshipCount,
            2
        );

        assert.equal(
            result.outcomes.boundRelationshipCount,
            1
        );

        assert.deepEqual(
            result.rates.quoteRate,
            {
                numerator:
                    2,

                denominator:
                    2
            }
        );

        assert.deepEqual(
            result.rates.bindRate,
            {
                numerator:
                    1,

                denominator:
                    2
            }
        );

        assert.deepEqual(
            result.costPerOutcome.currencies,
            [
                {
                    currency:
                        "EUR",

                    acquisitionCostMinorUnits:
                        400,

                    costPerQuote: {
                        numeratorMinorUnits:
                            400,

                        denominatorCount:
                            2
                    },

                    costPerBind: {
                        numeratorMinorUnits:
                            400,

                        denominatorCount:
                            1
                    }
                },
                {
                    currency:
                        "USD",

                    acquisitionCostMinorUnits:
                        1500,

                    costPerQuote: {
                        numeratorMinorUnits:
                            1500,

                        denominatorCount:
                            2
                    },

                    costPerBind: {
                        numeratorMinorUnits:
                            1500,

                        denominatorCount:
                            1
                    }
                }
            ]
        );
    }
);


test(
    "deduplicates explicit relationship identity before the shared denominator",
    () => {
        const result =
            createInsuranceAcquisitionOverallPerformanceSummary({
                relationshipIds: [
                    relationshipOne,
                    relationshipOne,
                    relationshipTwo
                ],

                views: [
                    view(
                        relationshipOne,
                        []
                    ),
                    view(
                        relationshipTwo,
                        []
                    )
                ],

                outcomeFacts:
                    []
            });

        assert.equal(
            result.relationshipCount,
            2
        );

        assert.equal(
            result.outcomes.relationshipCount,
            2
        );

        assert.equal(
            result.rates.relationshipCount,
            2
        );

        assert.equal(
            result.costPerOutcome.relationshipCount,
            2
        );
    }
);


test(
    "empty cohort produces empty economics and canonical zero outcome projections",
    () => {
        const result =
            createInsuranceAcquisitionOverallPerformanceSummary({
                relationshipIds:
                    [],

                views:
                    [],

                outcomeFacts:
                    []
            });

        assert.equal(
            result.relationshipCount,
            0
        );

        assert.deepEqual(
            result.currencies,
            []
        );

        assert.equal(
            result.outcomes.relationshipCount,
            0
        );

        assert.equal(
            "quoteRate" in result.rates,
            false
        );

        assert.equal(
            "bindRate" in result.rates,
            false
        );

        assert.deepEqual(
            result.costPerOutcome.currencies,
            []
        );
    }
);


test(
    "rejects economics views outside the explicit cohort",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionOverallPerformanceSummary({
                    relationshipIds: [
                        relationshipOne
                    ],

                    views: [
                        view(
                            relationshipTwo,
                            []
                        )
                    ],

                    outcomeFacts:
                        []
                }),
            /outside the explicit cohort/
        );
    }
);


test(
    "rejects duplicate or missing economics views",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionOverallPerformanceSummary({
                    relationshipIds: [
                        relationshipOne
                    ],

                    views: [
                        view(
                            relationshipOne,
                            []
                        ),
                        view(
                            relationshipOne,
                            []
                        )
                    ],

                    outcomeFacts:
                        []
                }),
            /at most one economics view/
        );

        assert.throws(
            () =>
                createInsuranceAcquisitionOverallPerformanceSummary({
                    relationshipIds: [
                        relationshipOne,
                        relationshipTwo
                    ],

                    views: [
                        view(
                            relationshipOne,
                            []
                        )
                    ],

                    outcomeFacts:
                        []
                }),
            /one economics view for every canonical cohort relationship/
        );
    }
);


test(
    "rejects noncanonical relationship analytics before totals are trusted",
    () => {
        const badView = {
            ...view(
                relationshipOne,
                []
            ),

            analytics: {
                ...view(
                    relationshipOne,
                    []
                ).analytics,

                projectionVersion:
                    "not-canonical"
            }
        } as unknown as InsuranceAttributedRelationshipEconomicsView;

        assert.throws(
            () =>
                createInsuranceAcquisitionOverallPerformanceSummary({
                    relationshipIds: [
                        relationshipOne
                    ],

                    views: [
                        badView
                    ],

                    outcomeFacts:
                        []
                }),
            /canonical relationship acquisition analytics/
        );
    }
);


test(
    "rejects analytics relationship identity mismatch",
    () => {
        const mismatched = {
            ...view(
                relationshipOne,
                []
            ),

            analytics: {
                ...view(
                    relationshipOne,
                    []
                ).analytics,

                relationshipId:
                    relationshipTwo
            }
        } as InsuranceAttributedRelationshipEconomicsView;

        assert.throws(
            () =>
                createInsuranceAcquisitionOverallPerformanceSummary({
                    relationshipIds: [
                        relationshipOne
                    ],

                    views: [
                        mismatched
                    ],

                    outcomeFacts:
                        []
                }),
            /analytics relationship identity/
        );
    }
);


test(
    "rejects unsafe economic totals instead of overflowing integer accounting",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionOverallPerformanceSummary({
                    relationshipIds: [
                        relationshipOne,
                        relationshipTwo
                    ],

                    views: [
                        view(
                            relationshipOne,
                            [
                                {
                                    currency:
                                        "USD",

                                    acquisitionCostMinorUnits:
                                        Number.MAX_SAFE_INTEGER,

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
                                        0
                                }
                            ]
                        ),

                        view(
                            relationshipTwo,
                            [
                                {
                                    currency:
                                        "USD",

                                    acquisitionCostMinorUnits:
                                        1,

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
                                        0
                                }
                            ]
                        )
                    ],

                    outcomeFacts:
                        []
                }),
            /overflowed acquisitionCostMinorUnits/
        );
    }
);
