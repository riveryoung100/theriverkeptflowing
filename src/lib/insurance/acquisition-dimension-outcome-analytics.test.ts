import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceAcquisitionDimensionOutcomeAnalytics,
    INSURANCE_ACQUISITION_DIMENSION_OUTCOME_ANALYTICS_VERSION
} from "./acquisition-dimension-outcome-analytics";


function view(
    relationshipId:
        string,
    presentation?:
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

            readonly relationshipId?:
                string;
        }
){
    return {
        relationshipId,

        analytics: {
            relationshipId
        },

        ...(presentation !== undefined
            ? {
                presentation: {
                    relationshipId:
                        presentation.relationshipId ??
                        relationshipId,

                    state:
                        presentation.state ??
                        "TX",

                    postalCode:
                        "79720",

                    productInterest:
                        presentation.productInterest ??
                        "auto",

                    quoteStatus:
                        presentation.quoteStatus ??
                        "not-started",

                    ...(presentation.assignedProducer !== undefined
                        ? {
                            assignedProducer:
                                presentation.assignedProducer
                        }
                        : {}),

                    ...(presentation.acquisitionSource !== undefined
                        ? {
                            acquisitionSource:
                                presentation.acquisitionSource
                        }
                        : {}),

                    ...(presentation.sourceVendor !== undefined
                        ? {
                            sourceVendor:
                                presentation.sourceVendor
                        }
                        : {}),

                    ...(presentation.campaign !== undefined
                        ? {
                            campaign:
                                presentation.campaign
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
    };
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
    "groups durable quote and bind attainment by acquisition source",
    () => {
        const result =
            createInsuranceAcquisitionDimensionOutcomeAnalytics({
                dimension:
                    "acquisitionSource",

                relationshipIds: [
                    "relationship:ins-004b-a",
                    "relationship:ins-004b-b",
                    "relationship:ins-004b-c"
                ] as never,

                views: [
                    view(
                        "relationship:ins-004b-a",
                        {
                            acquisitionSource:
                                "google"
                        }
                    ),
                    view(
                        "relationship:ins-004b-b",
                        {
                            acquisitionSource:
                                "google"
                        }
                    ),
                    view(
                        "relationship:ins-004b-c",
                        {
                            acquisitionSource:
                                "referral"
                        }
                    )
                ] as never,

                outcomeFacts: [
                    fact(
                        "ins-004b-a-quoted",
                        "relationship:ins-004b-a",
                        "quoted"
                    ),
                    fact(
                        "ins-004b-a-bound",
                        "relationship:ins-004b-a",
                        "bound"
                    ),
                    fact(
                        "ins-004b-b-quoted",
                        "relationship:ins-004b-b",
                        "quoted"
                    )
                ] as never
            });

        assert.deepEqual(
            result,
            {
                projectionVersion:
                    INSURANCE_ACQUISITION_DIMENSION_OUTCOME_ANALYTICS_VERSION,

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

                        outcomeFactCount:
                            3,

                        quotedOutcomeFactCount:
                            2,

                        boundOutcomeFactCount:
                            1,

                        quoteRate: {
                            numerator:
                                2,

                            denominator:
                                2
                        },

                        bindRate: {
                            numerator:
                                1,

                            denominator:
                                2
                        }
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

                        outcomeFactCount:
                            0,

                        quotedOutcomeFactCount:
                            0,

                        boundOutcomeFactCount:
                            0,

                        quoteRate: {
                            numerator:
                                0,

                            denominator:
                                1
                        },

                        bindRate: {
                            numerator:
                                0,

                            denominator:
                                1
                        }
                    }
                ]
            }
        );
    }
);


test(
    "keeps bound-only evidence bound-only inside a dimension bucket",
    () => {
        const result =
            createInsuranceAcquisitionDimensionOutcomeAnalytics({
                dimension:
                    "state",

                relationshipIds: [
                    "relationship:ins-004b-a"
                ] as never,

                views: [
                    view(
                        "relationship:ins-004b-a",
                        {
                            state:
                                "TX"
                        }
                    )
                ] as never,

                outcomeFacts: [
                    fact(
                        "ins-004b-a-bound",
                        "relationship:ins-004b-a",
                        "bound"
                    )
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

        assert.deepEqual(
            result.buckets[0]
                ?.quoteRate,
            {
                numerator:
                    0,

                denominator:
                    1
            }
        );

        assert.deepEqual(
            result.buckets[0]
                ?.bindRate,
            {
                numerator:
                    1,

                denominator:
                    1
            }
        );
    }
);


test(
    "uses quoteStatus only for segmentation and never as outcome evidence",
    () => {
        const result =
            createInsuranceAcquisitionDimensionOutcomeAnalytics({
                dimension:
                    "quoteStatus",

                relationshipIds: [
                    "relationship:ins-004b-a",
                    "relationship:ins-004b-b"
                ] as never,

                views: [
                    view(
                        "relationship:ins-004b-a",
                        {
                            quoteStatus:
                                "quoted"
                        }
                    ),
                    view(
                        "relationship:ins-004b-b",
                        {
                            quoteStatus:
                                "not-started"
                        }
                    )
                ] as never,

                outcomeFacts: [
                    fact(
                        "ins-004b-b-quoted",
                        "relationship:ins-004b-b",
                        "quoted"
                    )
                ] as never
            });

        const notStarted =
            result.buckets.find(
                bucket =>
                    bucket.dimensionValue ===
                    "not-started"
            );

        const quotedStatus =
            result.buckets.find(
                bucket =>
                    bucket.dimensionValue ===
                    "quoted"
            );

        assert.equal(
            notStarted
                ?.quotedRelationshipCount,
            1
        );

        assert.equal(
            quotedStatus
                ?.quotedRelationshipCount,
            0
        );
    }
);


test(
    "supports all seven canonical dimensions",
    () => {
        const dimensions = [
            [
                "acquisitionSource",
                "google"
            ],
            [
                "sourceVendor",
                "vendor-a"
            ],
            [
                "campaign",
                "campaign-a"
            ],
            [
                "productInterest",
                "home"
            ],
            [
                "state",
                "TX"
            ],
            [
                "quoteStatus",
                "in-progress"
            ],
            [
                "assignedProducer",
                "producer-a"
            ]
        ] as const;

        const attributedView =
            view(
                "relationship:ins-004b-a",
                {
                    acquisitionSource:
                        "google",

                    sourceVendor:
                        "vendor-a",

                    campaign:
                        "campaign-a",

                    productInterest:
                        "home",

                    state:
                        "TX",

                    quoteStatus:
                        "in-progress",

                    assignedProducer:
                        "producer-a"
                }
            );

        for(
            const [
                dimension,
                expectedValue
            ] of dimensions
        ){
            const result =
                createInsuranceAcquisitionDimensionOutcomeAnalytics({
                    dimension,

                    relationshipIds: [
                        "relationship:ins-004b-a"
                    ] as never,

                    views: [
                        attributedView
                    ] as never,

                    outcomeFacts:
                        []
                });

            assert.equal(
                result.buckets[0]
                    ?.dimensionValue,
                expectedValue
            );
        }
    }
);


test(
    "groups missing presentation or absent dimension into one absent bucket sorted last",
    () => {
        const result =
            createInsuranceAcquisitionDimensionOutcomeAnalytics({
                dimension:
                    "sourceVendor",

                relationshipIds: [
                    "relationship:ins-004b-a",
                    "relationship:ins-004b-b",
                    "relationship:ins-004b-c"
                ] as never,

                views: [
                    view(
                        "relationship:ins-004b-a",
                        {
                            sourceVendor:
                                "vendor-a"
                        }
                    ),
                    view(
                        "relationship:ins-004b-b",
                        {}
                    ),
                    view(
                        "relationship:ins-004b-c"
                    )
                ] as never,

                outcomeFacts:
                    []
            });

        assert.equal(
            result.buckets.length,
            2
        );

        assert.equal(
            result.buckets[0]
                ?.dimensionValue,
            "vendor-a"
        );

        assert.equal(
            "dimensionValue" in
                result.buckets[1],
            false
        );

        assert.equal(
            result.buckets[1]
                ?.relationshipCount,
            2
        );
    }
);


test(
    "repeated durable facts preserve fact count while relationship numerator counts once",
    () => {
        const result =
            createInsuranceAcquisitionDimensionOutcomeAnalytics({
                dimension:
                    "state",

                relationshipIds: [
                    "relationship:ins-004b-a"
                ] as never,

                views: [
                    view(
                        "relationship:ins-004b-a",
                        {
                            state:
                                "TX"
                        }
                    )
                ] as never,

                outcomeFacts: [
                    fact(
                        "ins-004b-a-quoted-1",
                        "relationship:ins-004b-a",
                        "quoted"
                    ),
                    fact(
                        "ins-004b-a-quoted-2",
                        "relationship:ins-004b-a",
                        "quoted"
                    )
                ] as never
            });

        assert.equal(
            result.buckets[0]
                ?.quotedRelationshipCount,
            1
        );

        assert.equal(
            result.buckets[0]
                ?.quotedOutcomeFactCount,
            2
        );
    }
);


test(
    "deduplicates explicit cohort identity",
    () => {
        const result =
            createInsuranceAcquisitionDimensionOutcomeAnalytics({
                dimension:
                    "state",

                relationshipIds: [
                    "relationship:ins-004b-a",
                    "relationship:ins-004b-a"
                ] as never,

                views: [
                    view(
                        "relationship:ins-004b-a",
                        {
                            state:
                                "TX"
                        }
                    )
                ] as never,

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
    "rejects attributed view outside explicit cohort",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionDimensionOutcomeAnalytics({
                    dimension:
                        "state",

                    relationshipIds: [
                        "relationship:ins-004b-a"
                    ] as never,

                    views: [
                        view(
                            "relationship:ins-004b-outside",
                            {
                                state:
                                    "TX"
                            }
                        )
                    ] as never,

                    outcomeFacts:
                        []
                }),
            /outside the explicit cohort/
        );
    }
);


test(
    "rejects duplicate attributed view identity",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionDimensionOutcomeAnalytics({
                    dimension:
                        "state",

                    relationshipIds: [
                        "relationship:ins-004b-a"
                    ] as never,

                    views: [
                        view(
                            "relationship:ins-004b-a",
                            {
                                state:
                                    "TX"
                            }
                        ),
                        view(
                            "relationship:ins-004b-a",
                            {
                                state:
                                    "TX"
                            }
                        )
                    ] as never,

                    outcomeFacts:
                        []
                }),
            /at most one attributed view/
        );
    }
);


test(
    "rejects missing attributed view for cohort relationship",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionDimensionOutcomeAnalytics({
                    dimension:
                        "state",

                    relationshipIds: [
                        "relationship:ins-004b-a",
                        "relationship:ins-004b-b"
                    ] as never,

                    views: [
                        view(
                            "relationship:ins-004b-a",
                            {
                                state:
                                    "TX"
                            }
                        )
                    ] as never,

                    outcomeFacts:
                        []
                }),
            /one attributed view for every canonical cohort relationship/
        );
    }
);


test(
    "rejects presentation relationship identity mismatch",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionDimensionOutcomeAnalytics({
                    dimension:
                        "state",

                    relationshipIds: [
                        "relationship:ins-004b-a"
                    ] as never,

                    views: [
                        view(
                            "relationship:ins-004b-a",
                            {
                                relationshipId:
                                    "relationship:ins-004b-b",

                                state:
                                    "TX"
                            }
                        )
                    ] as never,

                    outcomeFacts:
                        []
                }),
            /presentation relationship identity/
        );
    }
);


test(
    "rejects durable outcome fact outside explicit cohort through canonical analytics",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionDimensionOutcomeAnalytics({
                    dimension:
                        "state",

                    relationshipIds: [
                        "relationship:ins-004b-a"
                    ] as never,

                    views: [
                        view(
                            "relationship:ins-004b-a",
                            {
                                state:
                                    "TX"
                            }
                        )
                    ] as never,

                    outcomeFacts: [
                        fact(
                            "ins-004b-outside-quoted",
                            "relationship:ins-004b-outside",
                            "quoted"
                        )
                    ] as never
                }),
            /cohort/
        );
    }
);


test(
    "rejects duplicate durable outcome fact identity globally",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionDimensionOutcomeAnalytics({
                    dimension:
                        "state",

                    relationshipIds: [
                        "relationship:ins-004b-a"
                    ] as never,

                    views: [
                        view(
                            "relationship:ins-004b-a",
                            {
                                state:
                                    "TX"
                            }
                        )
                    ] as never,

                    outcomeFacts: [
                        fact(
                            "ins-004b-duplicate",
                            "relationship:ins-004b-a",
                            "quoted"
                        ),
                        fact(
                            "ins-004b-duplicate",
                            "relationship:ins-004b-a",
                            "quoted"
                        )
                    ] as never
                }),
            /unique outcomeFactId/
        );
    }
);
