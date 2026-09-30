import assert from "node:assert/strict";
import test from "node:test";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import {
    createInsuranceAcquisitionCostFact,
    createInsuranceCommissionFact,
    createInsurancePremiumFact,
    createInsuranceRenewalFact
} from "./acquisition-economics";

import {
    createInsuranceAcquisitionOutcomeFact
} from "./acquisition-outcomes";

import {
    createInsuranceAcquisitionConversionWindowEvidence,
    INSURANCE_ACQUISITION_CONVERSION_WINDOW_EVIDENCE_VERSION
} from "./acquisition-conversion-window-evidence";


const relationshipOne =
    "relationship:ins-004o-a" as RiverCrmRelationshipId;

const relationshipTwo =
    "relationship:ins-004o-b" as RiverCrmRelationshipId;


test(
    "uses only fully mature relationships in the fixed N-day denominator",
    () => {
        const result =
            createInsuranceAcquisitionConversionWindowEvidence({
                relationships: [
                    {
                        relationshipId:
                            relationshipOne,
                        createdAt:
                            "2026-09-01T00:00:00.000Z"
                    },
                    {
                        relationshipId:
                            relationshipTwo,
                        createdAt:
                            "2026-09-02T00:00:00.001Z"
                    }
                ],

                asOfExclusive:
                    "2026-10-02T00:00:00.000Z",

                windowDays:
                    30
            });

        assert.equal(
            result.projectionVersion,
            INSURANCE_ACQUISITION_CONVERSION_WINDOW_EVIDENCE_VERSION
        );

        assert.equal(
            result.cohortRelationshipCount,
            2
        );

        assert.equal(
            result.matureRelationshipCount,
            1
        );

        assert.equal(
            result.immatureRelationshipCount,
            1
        );

        assert.deepEqual(
            result.relationshipIds,
            [
                relationshipOne
            ]
        );

        assert.deepEqual(
            result.relationshipWindows,
            [
                {
                    relationshipId:
                        relationshipOne,

                    createdAt:
                        "2026-09-01T00:00:00.000Z",

                    windowEndExclusive:
                        "2026-10-01T00:00:00.000Z"
                }
            ]
        );
    }
);


test(
    "relationship is mature when window end exactly equals asOfExclusive",
    () => {
        const result =
            createInsuranceAcquisitionConversionWindowEvidence({
                relationships: [
                    {
                        relationshipId:
                            relationshipOne,

                        createdAt:
                            "2026-09-01T00:00:00.000Z"
                    }
                ],

                asOfExclusive:
                    "2026-10-01T00:00:00.000Z",

                windowDays:
                    30
            });

        assert.deepEqual(
            result.relationshipIds,
            [
                relationshipOne
            ]
        );
    }
);


test(
    "applies each mature relationship's own upper-exclusive evidence boundary",
    () => {
        const insideOne =
            createInsuranceAcquisitionOutcomeFact({
                outcomeFactId:
                    "outcome-fact:ins-004o-one-inside",

                relationshipId:
                    relationshipOne,

                kind:
                    "quoted",

                occurredAt:
                    "2026-09-30T23:59:59.999Z"
            });

        const boundaryOne =
            createInsuranceAcquisitionOutcomeFact({
                outcomeFactId:
                    "outcome-fact:ins-004o-one-boundary",

                relationshipId:
                    relationshipOne,

                kind:
                    "bound",

                occurredAt:
                    "2026-10-01T00:00:00.000Z"
            });

        const insideTwo =
            createInsuranceAcquisitionOutcomeFact({
                outcomeFactId:
                    "outcome-fact:ins-004o-two-inside",

                relationshipId:
                    relationshipTwo,

                kind:
                    "bound",

                occurredAt:
                    "2026-10-09T23:59:59.999Z"
            });

        const boundaryTwo =
            createInsuranceAcquisitionOutcomeFact({
                outcomeFactId:
                    "outcome-fact:ins-004o-two-boundary",

                relationshipId:
                    relationshipTwo,

                kind:
                    "bound",

                occurredAt:
                    "2026-10-10T00:00:00.000Z"
            });

        const result =
            createInsuranceAcquisitionConversionWindowEvidence({
                relationships: [
                    {
                        relationshipId:
                            relationshipOne,

                        createdAt:
                            "2026-09-01T00:00:00.000Z"
                    },
                    {
                        relationshipId:
                            relationshipTwo,

                        createdAt:
                            "2026-09-10T00:00:00.000Z"
                    }
                ],

                asOfExclusive:
                    "2026-11-01T00:00:00.000Z",

                windowDays:
                    30,

                outcomeFacts: [
                    insideOne,
                    boundaryOne,
                    insideTwo,
                    boundaryTwo
                ]
            });

        assert.deepEqual(
            result.outcomeFacts,
            [
                insideOne,
                insideTwo
            ]
        );
    }
);


test(
    "excludes every fact family for an immature relationship",
    () => {
        const occurredAt =
            "2026-09-20T00:00:00.000Z";

        const result =
            createInsuranceAcquisitionConversionWindowEvidence({
                relationships: [
                    {
                        relationshipId:
                            relationshipOne,

                        createdAt:
                            "2026-09-15T00:00:00.000Z"
                    }
                ],

                asOfExclusive:
                    "2026-10-01T00:00:00.000Z",

                windowDays:
                    30,

                acquisitionCosts: [
                    createInsuranceAcquisitionCostFact({
                        costId:
                            "acquisition-cost:ins-004o-immature",

                        relationshipId:
                            relationshipOne,

                        category:
                            "advertising",

                        money: {
                            amountMinorUnits:
                                1000,

                            currency:
                                "USD"
                        },

                        occurredAt
                    })
                ],

                premiumFacts: [
                    createInsurancePremiumFact({
                        premiumFactId:
                            "premium-fact:ins-004o-immature",

                        relationshipId:
                            relationshipOne,

                        kind:
                            "written",

                        money: {
                            amountMinorUnits:
                                150000,

                            currency:
                                "USD"
                        },

                        occurredAt
                    })
                ],

                commissionFacts: [
                    createInsuranceCommissionFact({
                        commissionFactId:
                            "commission-fact:ins-004o-immature",

                        relationshipId:
                            relationshipOne,

                        kind:
                            "earned",

                        money: {
                            amountMinorUnits:
                                15000,

                            currency:
                                "USD"
                        },

                        occurredAt
                    })
                ],

                renewalFacts: [
                    createInsuranceRenewalFact({
                        renewalFactId:
                            "renewal-fact:ins-004o-immature",

                        relationshipId:
                            relationshipOne,

                        kind:
                            "due",

                        occurredAt
                    })
                ],

                outcomeFacts: [
                    createInsuranceAcquisitionOutcomeFact({
                        outcomeFactId:
                            "outcome-fact:ins-004o-immature",

                        relationshipId:
                            relationshipOne,

                        kind:
                            "quoted",

                        occurredAt
                    })
                ]
            });

        assert.deepEqual(
            result.relationshipIds,
            []
        );

        assert.deepEqual(
            result.acquisitionCosts,
            []
        );

        assert.deepEqual(
            result.premiumFacts,
            []
        );

        assert.deepEqual(
            result.commissionFacts,
            []
        );

        assert.deepEqual(
            result.renewalFacts,
            []
        );

        assert.deepEqual(
            result.outcomeFacts,
            []
        );
    }
);


test(
    "future effectiveAt never controls premium or renewal conversion-window inclusion",
    () => {
        const premium =
            createInsurancePremiumFact({
                premiumFactId:
                    "premium-fact:ins-004o-future-effective",

                relationshipId:
                    relationshipOne,

                kind:
                    "written",

                money: {
                    amountMinorUnits:
                        200000,

                    currency:
                        "USD"
                },

                occurredAt:
                    "2026-09-10T00:00:00.000Z",

                effectiveAt:
                    "2027-01-01T00:00:00.000Z"
            });

        const renewal =
            createInsuranceRenewalFact({
                renewalFactId:
                    "renewal-fact:ins-004o-future-effective",

                relationshipId:
                    relationshipOne,

                kind:
                    "due",

                occurredAt:
                    "2026-09-15T00:00:00.000Z",

                effectiveAt:
                    "2027-02-01T00:00:00.000Z"
            });

        const result =
            createInsuranceAcquisitionConversionWindowEvidence({
                relationships: [
                    {
                        relationshipId:
                            relationshipOne,

                        createdAt:
                            "2026-09-01T00:00:00.000Z"
                    }
                ],

                asOfExclusive:
                    "2026-11-01T00:00:00.000Z",

                windowDays:
                    30,

                premiumFacts: [
                    premium
                ],

                renewalFacts: [
                    renewal
                ]
            });

        assert.equal(
            result.premiumFacts[0],
            premium
        );

        assert.equal(
            result.renewalFacts[0],
            renewal
        );
    }
);


test(
    "deduplicates identical relationship records preserving first occurrence order",
    () => {
        const result =
            createInsuranceAcquisitionConversionWindowEvidence({
                relationships: [
                    {
                        relationshipId:
                            relationshipTwo,

                        createdAt:
                            "2026-08-01T00:00:00.000Z"
                    },
                    {
                        relationshipId:
                            relationshipOne,

                        createdAt:
                            "2026-08-02T00:00:00.000Z"
                    },
                    {
                        relationshipId:
                            relationshipTwo,

                        createdAt:
                            "2026-08-01T00:00:00.000Z"
                    }
                ],

                asOfExclusive:
                    "2026-10-01T00:00:00.000Z",

                windowDays:
                    30
            });

        assert.deepEqual(
            result.relationshipIds,
            [
                relationshipTwo,
                relationshipOne
            ]
        );
    }
);


test(
    "rejects conflicting createdAt values for a duplicate relationship identity",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionConversionWindowEvidence({
                    relationships: [
                        {
                            relationshipId:
                                relationshipOne,

                            createdAt:
                                "2026-08-01T00:00:00.000Z"
                        },
                        {
                            relationshipId:
                                relationshipOne,

                            createdAt:
                                "2026-08-02T00:00:00.000Z"
                        }
                    ],

                    asOfExclusive:
                        "2026-10-01T00:00:00.000Z",

                    windowDays:
                        30
                }),
            /conflicting createdAt/
        );
    }
);


test(
    "rejects evidence outside the supplied relationship cohort",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionConversionWindowEvidence({
                    relationships: [
                        {
                            relationshipId:
                                relationshipOne,

                            createdAt:
                                "2026-08-01T00:00:00.000Z"
                        }
                    ],

                    asOfExclusive:
                        "2026-10-01T00:00:00.000Z",

                    windowDays:
                        30,

                    outcomeFacts: [
                        createInsuranceAcquisitionOutcomeFact({
                            outcomeFactId:
                                "outcome-fact:ins-004o-outside",

                            relationshipId:
                                relationshipTwo,

                            kind:
                                "quoted",

                            occurredAt:
                                "2026-08-10T00:00:00.000Z"
                        })
                    ]
                }),
            /outside the supplied relationship cohort/
        );
    }
);


test(
    "rejects noncanonical relationship and reporting timestamps",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionConversionWindowEvidence({
                    relationships: [
                        {
                            relationshipId:
                                relationshipOne,

                            createdAt:
                                "2026-09-01T00:00:00Z"
                        }
                    ],

                    asOfExclusive:
                        "2026-10-01T00:00:00.000Z",

                    windowDays:
                        30
                }),
            /relationship createdAt.*canonical UTC timestamp/
        );

        assert.throws(
            () =>
                createInsuranceAcquisitionConversionWindowEvidence({
                    relationships: [
                        {
                            relationshipId:
                                relationshipOne,

                            createdAt:
                                "2026-09-01T00:00:00.000Z"
                        }
                    ],

                    asOfExclusive:
                        "2026-10-01T00:00:00Z",

                    windowDays:
                        30
                }),
            /asOfExclusive.*canonical UTC timestamp/
        );
    }
);


test(
    "rejects invalid or unsafe window day counts",
    () => {
        for(const windowDays of [
            0,
            -1,
            1.5,
            Number.NaN,
            Number.POSITIVE_INFINITY
        ]){
            assert.throws(
                () =>
                    createInsuranceAcquisitionConversionWindowEvidence({
                        relationships:
                            [],

                        asOfExclusive:
                            "2026-10-01T00:00:00.000Z",

                        windowDays
                    }),
                /positive safe integer/
            );
        }

        assert.throws(
            () =>
                createInsuranceAcquisitionConversionWindowEvidence({
                    relationships:
                        [],

                    asOfExclusive:
                        "2026-10-01T00:00:00.000Z",

                    windowDays:
                        Number.MAX_SAFE_INTEGER
                }),
            /safe elapsed-duration range/
        );
    }
);


test(
    "preserves included raw fact order and object identity",
    () => {
        const second =
            createInsuranceAcquisitionCostFact({
                costId:
                    "acquisition-cost:ins-004o-second",

                relationshipId:
                    relationshipOne,

                category:
                    "advertising",

                money: {
                    amountMinorUnits:
                        200,

                    currency:
                        "USD"
                },

                occurredAt:
                    "2026-09-20T00:00:00.000Z"
            });

        const first =
            createInsuranceAcquisitionCostFact({
                costId:
                    "acquisition-cost:ins-004o-first",

                relationshipId:
                    relationshipOne,

                category:
                    "advertising",

                money: {
                    amountMinorUnits:
                        100,

                    currency:
                        "USD"
                },

                occurredAt:
                    "2026-09-10T00:00:00.000Z"
            });

        const result =
            createInsuranceAcquisitionConversionWindowEvidence({
                relationships: [
                    {
                        relationshipId:
                            relationshipOne,

                        createdAt:
                            "2026-09-01T00:00:00.000Z"
                    }
                ],

                asOfExclusive:
                    "2026-11-01T00:00:00.000Z",

                windowDays:
                    30,

                acquisitionCosts: [
                    second,
                    first
                ]
            });

        assert.equal(
            result.acquisitionCosts[0],
            second
        );

        assert.equal(
            result.acquisitionCosts[1],
            first
        );
    }
);

test(
    "excludes pre-creation evidence while including evidence exactly at relationship creation",
    () => {
        const createdAt =
            "2026-09-01T00:00:00.000Z";

        const beforeCreatedAt =
            "2026-08-31T23:59:59.999Z";

        const acquisitionCostBefore =
            createInsuranceAcquisitionCostFact({
                costId:
                    "acquisition-cost:ins-004p-before",

                relationshipId:
                    relationshipOne,

                category:
                    "advertising",

                money: {
                    amountMinorUnits:
                        100,

                    currency:
                        "USD"
                },

                occurredAt:
                    beforeCreatedAt
            });

        const acquisitionCostAtCreation =
            createInsuranceAcquisitionCostFact({
                costId:
                    "acquisition-cost:ins-004p-at",

                relationshipId:
                    relationshipOne,

                category:
                    "advertising",

                money: {
                    amountMinorUnits:
                        200,

                    currency:
                        "USD"
                },

                occurredAt:
                    createdAt
            });

        const premiumBefore =
            createInsurancePremiumFact({
                premiumFactId:
                    "premium-fact:ins-004p-before",

                relationshipId:
                    relationshipOne,

                kind:
                    "quoted",

                money: {
                    amountMinorUnits:
                        100000,

                    currency:
                        "USD"
                },

                occurredAt:
                    beforeCreatedAt
            });

        const premiumAtCreation =
            createInsurancePremiumFact({
                premiumFactId:
                    "premium-fact:ins-004p-at",

                relationshipId:
                    relationshipOne,

                kind:
                    "quoted",

                money: {
                    amountMinorUnits:
                        110000,

                    currency:
                        "USD"
                },

                occurredAt:
                    createdAt
            });

        const commissionBefore =
            createInsuranceCommissionFact({
                commissionFactId:
                    "commission-fact:ins-004p-before",

                relationshipId:
                    relationshipOne,

                kind:
                    "earned",

                money: {
                    amountMinorUnits:
                        10000,

                    currency:
                        "USD"
                },

                occurredAt:
                    beforeCreatedAt
            });

        const commissionAtCreation =
            createInsuranceCommissionFact({
                commissionFactId:
                    "commission-fact:ins-004p-at",

                relationshipId:
                    relationshipOne,

                kind:
                    "earned",

                money: {
                    amountMinorUnits:
                        11000,

                    currency:
                        "USD"
                },

                occurredAt:
                    createdAt
            });

        const renewalBefore =
            createInsuranceRenewalFact({
                renewalFactId:
                    "renewal-fact:ins-004p-before",

                relationshipId:
                    relationshipOne,

                kind:
                    "due",

                occurredAt:
                    beforeCreatedAt
            });

        const renewalAtCreation =
            createInsuranceRenewalFact({
                renewalFactId:
                    "renewal-fact:ins-004p-at",

                relationshipId:
                    relationshipOne,

                kind:
                    "due",

                occurredAt:
                    createdAt
            });

        const outcomeBefore =
            createInsuranceAcquisitionOutcomeFact({
                outcomeFactId:
                    "outcome-fact:ins-004p-before",

                relationshipId:
                    relationshipOne,

                kind:
                    "quoted",

                occurredAt:
                    beforeCreatedAt
            });

        const outcomeAtCreation =
            createInsuranceAcquisitionOutcomeFact({
                outcomeFactId:
                    "outcome-fact:ins-004p-at",

                relationshipId:
                    relationshipOne,

                kind:
                    "quoted",

                occurredAt:
                    createdAt
            });

        const result =
            createInsuranceAcquisitionConversionWindowEvidence({
                relationships: [
                    {
                        relationshipId:
                            relationshipOne,

                        createdAt
                    }
                ],

                asOfExclusive:
                    "2026-11-01T00:00:00.000Z",

                windowDays:
                    30,

                acquisitionCosts: [
                    acquisitionCostBefore,
                    acquisitionCostAtCreation
                ],

                premiumFacts: [
                    premiumBefore,
                    premiumAtCreation
                ],

                commissionFacts: [
                    commissionBefore,
                    commissionAtCreation
                ],

                renewalFacts: [
                    renewalBefore,
                    renewalAtCreation
                ],

                outcomeFacts: [
                    outcomeBefore,
                    outcomeAtCreation
                ]
            });

        assert.deepEqual(
            result.acquisitionCosts,
            [
                acquisitionCostAtCreation
            ]
        );

        assert.deepEqual(
            result.premiumFacts,
            [
                premiumAtCreation
            ]
        );

        assert.deepEqual(
            result.commissionFacts,
            [
                commissionAtCreation
            ]
        );

        assert.deepEqual(
            result.renewalFacts,
            [
                renewalAtCreation
            ]
        );

        assert.deepEqual(
            result.outcomeFacts,
            [
                outcomeAtCreation
            ]
        );
    }
);
