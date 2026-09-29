import assert from "node:assert/strict";
import test from "node:test";

import {
    INSURANCE_ACQUISITION_ANALYTICS_PROJECTION_VERSION
} from "./acquisition-analytics";

import {
    createInsuranceAcquisitionCostPerOutcome,
    INSURANCE_ACQUISITION_COST_PER_OUTCOME_VERSION
} from "./acquisition-cost-per-outcome";

import {
    INSURANCE_ACQUISITION_OUTCOME_ANALYTICS_VERSION
} from "./acquisition-outcome-analytics";


function outcomeAnalytics(
    relationshipCount:
        number,
    quotedRelationshipCount:
        number,
    boundRelationshipCount:
        number
){
    return {
        projectionVersion:
            INSURANCE_ACQUISITION_OUTCOME_ANALYTICS_VERSION,

        relationshipCount,

        quotedRelationshipCount,

        boundRelationshipCount,

        outcomeFactCount:
            quotedRelationshipCount +
            boundRelationshipCount,

        quotedOutcomeFactCount:
            quotedRelationshipCount,

        boundOutcomeFactCount:
            boundRelationshipCount
    };
}


function view(
    relationshipId:
        string,
    currencies:
        readonly {
            readonly currency:
                string;

            readonly acquisitionCostMinorUnits:
                number;
        }[]
){
    return {
        relationshipId,

        analytics: {
            projectionVersion:
                INSURANCE_ACQUISITION_ANALYTICS_PROJECTION_VERSION,

            relationshipId,

            currencies:
                currencies.map(
                    currency => ({
                        currency:
                            currency.currency,

                        acquisitionCostMinorUnits:
                            currency.acquisitionCostMinorUnits,

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
                            -currency.acquisitionCostMinorUnits
                    })
                ),

            renewalFactCount:
                0
        }
    };
}


test(
    "projects exact acquisition cost per quote and bind for one currency",
    () => {
        const result =
            createInsuranceAcquisitionCostPerOutcome({
                relationshipIds: [
                    "relationship:ins-003y-a",
                    "relationship:ins-003y-b",
                    "relationship:ins-003y-c"
                ] as never,

                views: [
                    view(
                        "relationship:ins-003y-a",
                        [
                            {
                                currency:
                                    "USD",

                                acquisitionCostMinorUnits:
                                    1000
                            }
                        ]
                    ),
                    view(
                        "relationship:ins-003y-b",
                        [
                            {
                                currency:
                                    "USD",

                                acquisitionCostMinorUnits:
                                    2000
                            }
                        ]
                    ),
                    view(
                        "relationship:ins-003y-c",
                        []
                    )
                ] as never,

                outcomeAnalytics:
                    outcomeAnalytics(
                        3,
                        2,
                        1
                    )
            });

        assert.deepEqual(
            result,
            {
                projectionVersion:
                    INSURANCE_ACQUISITION_COST_PER_OUTCOME_VERSION,

                relationshipCount:
                    3,

                quotedRelationshipCount:
                    2,

                boundRelationshipCount:
                    1,

                currencies: [
                    {
                        currency:
                            "USD",

                        acquisitionCostMinorUnits:
                            3000,

                        costPerQuote: {
                            numeratorMinorUnits:
                                3000,

                            denominatorCount:
                                2
                        },

                        costPerBind: {
                            numeratorMinorUnits:
                                3000,

                            denominatorCount:
                                1
                        }
                    }
                ]
            }
        );
    }
);


test(
    "keeps acquisition costs isolated by currency",
    () => {
        const result =
            createInsuranceAcquisitionCostPerOutcome({
                relationshipIds: [
                    "relationship:ins-003y-a",
                    "relationship:ins-003y-b"
                ] as never,

                views: [
                    view(
                        "relationship:ins-003y-a",
                        [
                            {
                                currency:
                                    "USD",

                                acquisitionCostMinorUnits:
                                    1250
                            },
                            {
                                currency:
                                    "EUR",

                                acquisitionCostMinorUnits:
                                    500
                            }
                        ]
                    ),
                    view(
                        "relationship:ins-003y-b",
                        [
                            {
                                currency:
                                    "USD",

                                acquisitionCostMinorUnits:
                                    750
                            }
                        ]
                    )
                ] as never,

                outcomeAnalytics:
                    outcomeAnalytics(
                        2,
                        1,
                        1
                    )
            });

        assert.deepEqual(
            result.currencies,
            [
                {
                    currency:
                        "EUR",

                    acquisitionCostMinorUnits:
                        500,

                    costPerQuote: {
                        numeratorMinorUnits:
                            500,

                        denominatorCount:
                            1
                    },

                    costPerBind: {
                        numeratorMinorUnits:
                            500,

                        denominatorCount:
                            1
                    }
                },
                {
                    currency:
                        "USD",

                    acquisitionCostMinorUnits:
                        2000,

                    costPerQuote: {
                        numeratorMinorUnits:
                            2000,

                        denominatorCount:
                            1
                    },

                    costPerBind: {
                        numeratorMinorUnits:
                            2000,

                        denominatorCount:
                            1
                    }
                }
            ]
        );
    }
);


test(
    "deduplicates explicit cohort identity before denominator matching",
    () => {
        const result =
            createInsuranceAcquisitionCostPerOutcome({
                relationshipIds: [
                    "relationship:ins-003y-a",
                    "relationship:ins-003y-a",
                    "relationship:ins-003y-b"
                ] as never,

                views: [
                    view(
                        "relationship:ins-003y-a",
                        []
                    ),
                    view(
                        "relationship:ins-003y-b",
                        []
                    )
                ] as never,

                outcomeAnalytics:
                    outcomeAnalytics(
                        2,
                        1,
                        0
                    )
            });

        assert.equal(
            result.relationshipCount,
            2
        );

        assert.deepEqual(
            result.currencies,
            []
        );
    }
);


test(
    "zero quote and bind counts omit both money-per-outcome values",
    () => {
        const result =
            createInsuranceAcquisitionCostPerOutcome({
                relationshipIds: [
                    "relationship:ins-003y-a"
                ] as never,

                views: [
                    view(
                        "relationship:ins-003y-a",
                        [
                            {
                                currency:
                                    "USD",

                                acquisitionCostMinorUnits:
                                    900
                            }
                        ]
                    )
                ] as never,

                outcomeAnalytics:
                    outcomeAnalytics(
                        1,
                        0,
                        0
                    )
            });

        assert.equal(
            result.currencies[0]
                ?.acquisitionCostMinorUnits,
            900
        );

        assert.equal(
            "costPerQuote" in
                result.currencies[0],
            false
        );

        assert.equal(
            "costPerBind" in
                result.currencies[0],
            false
        );
    }
);


test(
    "empty canonical cohort requires no views and produces no currencies",
    () => {
        const result =
            createInsuranceAcquisitionCostPerOutcome({
                relationshipIds:
                    [],

                views:
                    [],

                outcomeAnalytics:
                    outcomeAnalytics(
                        0,
                        0,
                        0
                    )
            });

        assert.deepEqual(
            result,
            {
                projectionVersion:
                    INSURANCE_ACQUISITION_COST_PER_OUTCOME_VERSION,

                relationshipCount:
                    0,

                quotedRelationshipCount:
                    0,

                boundRelationshipCount:
                    0,

                currencies:
                    []
            }
        );
    }
);


test(
    "rejects economics view outside explicit cohort",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionCostPerOutcome({
                    relationshipIds: [
                        "relationship:ins-003y-a"
                    ] as never,

                    views: [
                        view(
                            "relationship:ins-003y-outside",
                            []
                        )
                    ] as never,

                    outcomeAnalytics:
                        outcomeAnalytics(
                            1,
                            0,
                            0
                        )
                }),
            /outside the explicit cohort/
        );
    }
);


test(
    "rejects duplicate economics view identity",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionCostPerOutcome({
                    relationshipIds: [
                        "relationship:ins-003y-a"
                    ] as never,

                    views: [
                        view(
                            "relationship:ins-003y-a",
                            []
                        ),
                        view(
                            "relationship:ins-003y-a",
                            []
                        )
                    ] as never,

                    outcomeAnalytics:
                        outcomeAnalytics(
                            1,
                            0,
                            0
                        )
                }),
            /at most one economics view/
        );
    }
);


test(
    "rejects missing economics view for canonical cohort relationship",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionCostPerOutcome({
                    relationshipIds: [
                        "relationship:ins-003y-a",
                        "relationship:ins-003y-b"
                    ] as never,

                    views: [
                        view(
                            "relationship:ins-003y-a",
                            []
                        )
                    ] as never,

                    outcomeAnalytics:
                        outcomeAnalytics(
                            2,
                            1,
                            0
                        )
                }),
            /one economics view for every canonical cohort relationship/
        );
    }
);


test(
    "rejects analytics relationship identity mismatch",
    () => {
        const mismatched =
            view(
                "relationship:ins-003y-a",
                []
            ) as {
                analytics:
                    {
                        relationshipId:
                            string;
                    };
            };

        mismatched.analytics.relationshipId =
            "relationship:ins-003y-b";

        assert.throws(
            () =>
                createInsuranceAcquisitionCostPerOutcome({
                    relationshipIds: [
                        "relationship:ins-003y-a"
                    ] as never,

                    views: [
                        mismatched
                    ] as never,

                    outcomeAnalytics:
                        outcomeAnalytics(
                            1,
                            0,
                            0
                        )
                }),
            /analytics relationship identity/
        );
    }
);


test(
    "rejects outcome analytics from a different denominator cohort",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionCostPerOutcome({
                    relationshipIds: [
                        "relationship:ins-003y-a",
                        "relationship:ins-003y-b"
                    ] as never,

                    views: [
                        view(
                            "relationship:ins-003y-a",
                            []
                        ),
                        view(
                            "relationship:ins-003y-b",
                            []
                        )
                    ] as never,

                    outcomeAnalytics:
                        outcomeAnalytics(
                            1,
                            1,
                            0
                        )
                }),
            /relationshipCount to equal the explicit cohort size/
        );
    }
);


test(
    "rejects invalid acquisition cost minor units",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionCostPerOutcome({
                    relationshipIds: [
                        "relationship:ins-003y-a"
                    ] as never,

                    views: [
                        view(
                            "relationship:ins-003y-a",
                            [
                                {
                                    currency:
                                        "USD",

                                    acquisitionCostMinorUnits:
                                        -1
                                }
                            ]
                        )
                    ] as never,

                    outcomeAnalytics:
                        outcomeAnalytics(
                            1,
                            1,
                            0
                        )
                }),
            /safe non-negative integer/
        );
    }
);
