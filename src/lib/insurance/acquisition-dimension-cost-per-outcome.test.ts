import assert from "node:assert/strict";
import test from "node:test";

import {
    INSURANCE_ACQUISITION_ANALYTICS_PROJECTION_VERSION
} from "./acquisition-analytics";

import {
    createInsuranceAcquisitionDimensionCostPerOutcome,
    INSURANCE_ACQUISITION_DIMENSION_COST_PER_OUTCOME_VERSION
} from "./acquisition-dimension-cost-per-outcome";


function view(
    relationshipId:
        string,
    options:
        {
            readonly acquisitionSource?:
                string;

            readonly sourceVendor?:
                string;

            readonly campaign?:
                string;

            readonly productInterest?:
                string;

            readonly state?:
                string;

            readonly quoteStatus?:
                string;

            readonly assignedProducer?:
                string;

            readonly presentation:
                boolean;

            readonly currencies:
                readonly {
                    readonly currency:
                        string;

                    readonly acquisitionCostMinorUnits:
                        number;
                }[];
        }
){
    return {
        relationshipId,

        analytics: {
            projectionVersion:
                INSURANCE_ACQUISITION_ANALYTICS_PROJECTION_VERSION,

            relationshipId,

            currencies:
                options.currencies.map(
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
        },

        ...(options.presentation
            ? {
                presentation: {
                    relationshipId,

                    state:
                        options.state ??
                        "TX",

                    postalCode:
                        "79720",

                    productInterest:
                        options.productInterest ??
                        "auto",

                    quoteStatus:
                        options.quoteStatus ??
                        "not-started",

                    ...(options.assignedProducer !== undefined
                        ? {
                            assignedProducer:
                                options.assignedProducer
                        }
                        : {}),

                    ...(options.acquisitionSource !== undefined
                        ? {
                            acquisitionSource:
                                options.acquisitionSource
                        }
                        : {}),

                    ...(options.sourceVendor !== undefined
                        ? {
                            sourceVendor:
                                options.sourceVendor
                        }
                        : {}),

                    ...(options.campaign !== undefined
                        ? {
                            campaign:
                                options.campaign
                        }
                        : {}),

                    consentChannels:
                        [],

                    doNotContact:
                        false,

                    recentEvents:
                        []
                }
            }
            : {})
    } as never;
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
    "projects exact acquisition cost per quote and bind by acquisition source",
    () => {
        const result =
            createInsuranceAcquisitionDimensionCostPerOutcome({
                dimension:
                    "acquisitionSource",

                relationshipIds: [
                    "relationship:ins-004f-a",
                    "relationship:ins-004f-b",
                    "relationship:ins-004f-c"
                ] as never,

                views: [
                    view(
                        "relationship:ins-004f-a",
                        {
                            presentation:
                                true,

                            acquisitionSource:
                                "google",

                            currencies: [
                                {
                                    currency:
                                        "USD",

                                    acquisitionCostMinorUnits:
                                        1000
                                }
                            ]
                        }
                    ),
                    view(
                        "relationship:ins-004f-b",
                        {
                            presentation:
                                true,

                            acquisitionSource:
                                "google",

                            currencies: [
                                {
                                    currency:
                                        "USD",

                                    acquisitionCostMinorUnits:
                                        500
                                }
                            ]
                        }
                    ),
                    view(
                        "relationship:ins-004f-c",
                        {
                            presentation:
                                true,

                            acquisitionSource:
                                "referral",

                            currencies: [
                                {
                                    currency:
                                        "USD",

                                    acquisitionCostMinorUnits:
                                        700
                                }
                            ]
                        }
                    )
                ],

                outcomeFacts: [
                    fact(
                        "ins-004f-a-quoted",
                        "relationship:ins-004f-a",
                        "quoted"
                    ),
                    fact(
                        "ins-004f-a-bound",
                        "relationship:ins-004f-a",
                        "bound"
                    ),
                    fact(
                        "ins-004f-b-quoted",
                        "relationship:ins-004f-b",
                        "quoted"
                    )
                ] as never
            });

        assert.deepEqual(
            result,
            {
                projectionVersion:
                    INSURANCE_ACQUISITION_DIMENSION_COST_PER_OUTCOME_VERSION,

                dimension:
                    "acquisitionSource",

                relationshipCount:
                    3,

                buckets: [
                    {
                        dimensionValue:
                            "google",

                        relationshipCount:
                            2,

                        quotedRelationshipCount:
                            2,

                        boundRelationshipCount:
                            1,

                        currencies: [
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
                    },
                    {
                        dimensionValue:
                            "referral",

                        relationshipCount:
                            1,

                        quotedRelationshipCount:
                            0,

                        boundRelationshipCount:
                            0,

                        currencies: [
                            {
                                currency:
                                    "USD",

                                acquisitionCostMinorUnits:
                                    700
                            }
                        ]
                    }
                ]
            }
        );
    }
);


test(
    "keeps currencies isolated while using the same bucket outcome denominators",
    () => {
        const result =
            createInsuranceAcquisitionDimensionCostPerOutcome({
                dimension:
                    "state",

                relationshipIds: [
                    "relationship:ins-004f-a",
                    "relationship:ins-004f-b"
                ] as never,

                views: [
                    view(
                        "relationship:ins-004f-a",
                        {
                            presentation:
                                true,

                            state:
                                "TX",

                            currencies: [
                                {
                                    currency:
                                        "USD",

                                    acquisitionCostMinorUnits:
                                        1000
                                }
                            ]
                        }
                    ),
                    view(
                        "relationship:ins-004f-b",
                        {
                            presentation:
                                true,

                            state:
                                "TX",

                            currencies: [
                                {
                                    currency:
                                        "CAD",

                                    acquisitionCostMinorUnits:
                                        2000
                                }
                            ]
                        }
                    )
                ],

                outcomeFacts: [
                    fact(
                        "ins-004f-a-quoted",
                        "relationship:ins-004f-a",
                        "quoted"
                    ),
                    fact(
                        "ins-004f-a-bound",
                        "relationship:ins-004f-a",
                        "bound"
                    ),
                    fact(
                        "ins-004f-b-quoted",
                        "relationship:ins-004f-b",
                        "quoted"
                    )
                ] as never
            });

        assert.deepEqual(
            result.buckets[0]
                ?.currencies,
            [
                {
                    currency:
                        "CAD",

                    acquisitionCostMinorUnits:
                        2000,

                    costPerQuote: {
                        numeratorMinorUnits:
                            2000,

                        denominatorCount:
                            2
                    },

                    costPerBind: {
                        numeratorMinorUnits:
                            2000,

                        denominatorCount:
                            1
                    }
                },
                {
                    currency:
                        "USD",

                    acquisitionCostMinorUnits:
                        1000,

                    costPerQuote: {
                        numeratorMinorUnits:
                            1000,

                        denominatorCount:
                            2
                    },

                    costPerBind: {
                        numeratorMinorUnits:
                            1000,

                        denominatorCount:
                            1
                    }
                }
            ]
        );
    }
);


test(
    "preserves an exact zero-over-positive-denominator representation",
    () => {
        const result =
            createInsuranceAcquisitionDimensionCostPerOutcome({
                dimension:
                    "campaign",

                relationshipIds: [
                    "relationship:ins-004f-a"
                ] as never,

                views: [
                    view(
                        "relationship:ins-004f-a",
                        {
                            presentation:
                                true,

                            campaign:
                                "zero-cost",

                            currencies: [
                                {
                                    currency:
                                        "USD",

                                    acquisitionCostMinorUnits:
                                        0
                                }
                            ]
                        }
                    )
                ],

                outcomeFacts: [
                    fact(
                        "ins-004f-a-quoted",
                        "relationship:ins-004f-a",
                        "quoted"
                    )
                ] as never
            });

        assert.deepEqual(
            result.buckets[0]
                ?.currencies[0]
                ?.costPerQuote,
            {
                numeratorMinorUnits:
                    0,

                denominatorCount:
                    1
            }
        );

        assert.equal(
            result.buckets[0]
                ?.currencies[0]
                ?.costPerBind,
            undefined
        );
    }
);


test(
    "bound-only durable evidence does not create a quote denominator",
    () => {
        const result =
            createInsuranceAcquisitionDimensionCostPerOutcome({
                dimension:
                    "quoteStatus",

                relationshipIds: [
                    "relationship:ins-004f-a"
                ] as never,

                views: [
                    view(
                        "relationship:ins-004f-a",
                        {
                            presentation:
                                true,

                            quoteStatus:
                                "quoted",

                            currencies: [
                                {
                                    currency:
                                        "USD",

                                    acquisitionCostMinorUnits:
                                        900
                                }
                            ]
                        }
                    )
                ],

                outcomeFacts: [
                    fact(
                        "ins-004f-a-bound",
                        "relationship:ins-004f-a",
                        "bound"
                    )
                ] as never
            });

        const bucket =
            result.buckets[0];

        assert.equal(
            bucket
                ?.quotedRelationshipCount,
            0
        );

        assert.equal(
            bucket
                ?.boundRelationshipCount,
            1
        );

        assert.equal(
            bucket
                ?.currencies[0]
                ?.costPerQuote,
            undefined
        );

        assert.deepEqual(
            bucket
                ?.currencies[0]
                ?.costPerBind,
            {
                numeratorMinorUnits:
                    900,

                denominatorCount:
                    1
            }
        );
    }
);


test(
    "preserves absent-dimension bucket semantics",
    () => {
        const result =
            createInsuranceAcquisitionDimensionCostPerOutcome({
                dimension:
                    "sourceVendor",

                relationshipIds: [
                    "relationship:ins-004f-a"
                ] as never,

                views: [
                    view(
                        "relationship:ins-004f-a",
                        {
                            presentation:
                                false,

                            currencies: [
                                {
                                    currency:
                                        "USD",

                                    acquisitionCostMinorUnits:
                                        1200
                                }
                            ]
                        }
                    )
                ],

                outcomeFacts: [
                    fact(
                        "ins-004f-a-quoted",
                        "relationship:ins-004f-a",
                        "quoted"
                    )
                ] as never
            });

        assert.equal(
            "dimensionValue" in
                result.buckets[0],
            false
        );

        assert.deepEqual(
            result.buckets[0]
                ?.currencies[0]
                ?.costPerQuote,
            {
                numeratorMinorUnits:
                    1200,

                denominatorCount:
                    1
            }
        );
    }
);


test(
    "deduplicates the explicit denominator cohort through canonical outcome analytics",
    () => {
        const result =
            createInsuranceAcquisitionDimensionCostPerOutcome({
                dimension:
                    "state",

                relationshipIds: [
                    "relationship:ins-004f-a",
                    "relationship:ins-004f-a"
                ] as never,

                views: [
                    view(
                        "relationship:ins-004f-a",
                        {
                            presentation:
                                true,

                            state:
                                "TX",

                            currencies: [
                                {
                                    currency:
                                        "USD",

                                    acquisitionCostMinorUnits:
                                        100
                                }
                            ]
                        }
                    )
                ],

                outcomeFacts:
                    []
            });

        assert.equal(
            result.relationshipCount,
            1
        );

        assert.equal(
            result.buckets[0]
                ?.relationshipCount,
            1
        );
    }
);


test(
    "rejects durable outcome fact outside the explicit cohort",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionDimensionCostPerOutcome({
                    dimension:
                        "state",

                    relationshipIds: [
                        "relationship:ins-004f-a"
                    ] as never,

                    views: [
                        view(
                            "relationship:ins-004f-a",
                            {
                                presentation:
                                    true,

                                state:
                                    "TX",

                                currencies:
                                    []
                            }
                        )
                    ],

                    outcomeFacts: [
                        fact(
                            "ins-004f-outside",
                            "relationship:ins-004f-outside",
                            "quoted"
                        )
                    ] as never
                }),
            /cohort/
        );
    }
);


test(
    "rejects duplicate attributed relationship views through canonical economics aggregation",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionDimensionCostPerOutcome({
                    dimension:
                        "state",

                    relationshipIds: [
                        "relationship:ins-004f-a"
                    ] as never,

                    views: [
                        view(
                            "relationship:ins-004f-a",
                            {
                                presentation:
                                    true,

                                state:
                                    "TX",

                                currencies:
                                    []
                            }
                        ),
                        view(
                            "relationship:ins-004f-a",
                            {
                                presentation:
                                    true,

                                state:
                                    "TX",

                                currencies:
                                    []
                            }
                        )
                    ],

                    outcomeFacts:
                        []
                }),
            /duplicate/
        );
    }
);
