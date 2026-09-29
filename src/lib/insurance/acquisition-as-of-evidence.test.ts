import assert from "node:assert/strict";
import test from "node:test";

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
    createInsuranceAcquisitionAsOfEvidence,
    INSURANCE_ACQUISITION_AS_OF_EVIDENCE_VERSION
} from "./acquisition-as-of-evidence";


const relationshipId =
    "relationship:ins-004k-a";


test(
    "uses one upper-exclusive occurredAt cutoff across every evidence family",
    () => {
        const before =
            "2026-09-30T23:59:59.999Z";

        const boundary =
            "2026-10-01T00:00:00.000Z";

        const after =
            "2026-10-01T00:00:00.001Z";

        const result =
            createInsuranceAcquisitionAsOfEvidence({
                asOfExclusive:
                    boundary,

                acquisitionCosts: [
                    createInsuranceAcquisitionCostFact({
                        costId:
                            "acquisition-cost:before",
                        relationshipId,
                        category:
                            "lead",
                        money: {
                            amountMinorUnits:
                                1000,
                            currency:
                                "USD"
                        },
                        occurredAt:
                            before
                    }),
                    createInsuranceAcquisitionCostFact({
                        costId:
                            "acquisition-cost:boundary",
                        relationshipId,
                        category:
                            "lead",
                        money: {
                            amountMinorUnits:
                                2000,
                            currency:
                                "USD"
                        },
                        occurredAt:
                            boundary
                    }),
                    createInsuranceAcquisitionCostFact({
                        costId:
                            "acquisition-cost:after",
                        relationshipId,
                        category:
                            "lead",
                        money: {
                            amountMinorUnits:
                                3000,
                            currency:
                                "USD"
                        },
                        occurredAt:
                            after
                    })
                ],

                premiumFacts: [
                    createInsurancePremiumFact({
                        premiumFactId:
                            "premium-fact:before",
                        relationshipId,
                        kind:
                            "written",
                        money: {
                            amountMinorUnits:
                                150000,
                            currency:
                                "USD"
                        },
                        occurredAt:
                            before
                    }),
                    createInsurancePremiumFact({
                        premiumFactId:
                            "premium-fact:boundary",
                        relationshipId,
                        kind:
                            "quoted",
                        money: {
                            amountMinorUnits:
                                160000,
                            currency:
                                "USD"
                        },
                        occurredAt:
                            boundary
                    })
                ],

                commissionFacts: [
                    createInsuranceCommissionFact({
                        commissionFactId:
                            "commission-fact:before",
                        relationshipId,
                        kind:
                            "earned",
                        money: {
                            amountMinorUnits:
                                15000,
                            currency:
                                "USD"
                        },
                        occurredAt:
                            before
                    }),
                    createInsuranceCommissionFact({
                        commissionFactId:
                            "commission-fact:after",
                        relationshipId,
                        kind:
                            "paid",
                        money: {
                            amountMinorUnits:
                                15000,
                            currency:
                                "USD"
                        },
                        occurredAt:
                            after
                    })
                ],

                renewalFacts: [
                    createInsuranceRenewalFact({
                        renewalFactId:
                            "renewal-fact:before",
                        relationshipId,
                        kind:
                            "due",
                        occurredAt:
                            before
                    }),
                    createInsuranceRenewalFact({
                        renewalFactId:
                            "renewal-fact:boundary",
                        relationshipId,
                        kind:
                            "renewed",
                        occurredAt:
                            boundary
                    })
                ],

                outcomeFacts: [
                    createInsuranceAcquisitionOutcomeFact({
                        outcomeFactId:
                            "outcome-fact:before",
                        relationshipId,
                        kind:
                            "quoted",
                        occurredAt:
                            before
                    }),
                    createInsuranceAcquisitionOutcomeFact({
                        outcomeFactId:
                            "outcome-fact:boundary",
                        relationshipId,
                        kind:
                            "bound",
                        occurredAt:
                            boundary
                    }),
                    createInsuranceAcquisitionOutcomeFact({
                        outcomeFactId:
                            "outcome-fact:after",
                        relationshipId,
                        kind:
                            "bound",
                        occurredAt:
                            after
                    })
                ]
            });

        assert.equal(
            result.projectionVersion,
            INSURANCE_ACQUISITION_AS_OF_EVIDENCE_VERSION
        );

        assert.equal(
            result.asOfExclusive,
            boundary
        );

        assert.deepEqual(
            result.acquisitionCosts.map(
                value =>
                    value.costId
            ),
            [
                "acquisition-cost:before"
            ]
        );

        assert.deepEqual(
            result.premiumFacts.map(
                value =>
                    value.premiumFactId
            ),
            [
                "premium-fact:before"
            ]
        );

        assert.deepEqual(
            result.commissionFacts.map(
                value =>
                    value.commissionFactId
            ),
            [
                "commission-fact:before"
            ]
        );

        assert.deepEqual(
            result.renewalFacts.map(
                value =>
                    value.renewalFactId
            ),
            [
                "renewal-fact:before"
            ]
        );

        assert.deepEqual(
            result.outcomeFacts.map(
                value =>
                    value.outcomeFactId
            ),
            [
                "outcome-fact:before"
            ]
        );
    }
);


test(
    "future premium effectiveAt does not exclude a fact that occurred before cutoff",
    () => {
        const premium =
            createInsurancePremiumFact({
                premiumFactId:
                    "premium-fact:future-effective",
                relationshipId,
                kind:
                    "written",
                money: {
                    amountMinorUnits:
                        175000,
                    currency:
                        "USD"
                },
                occurredAt:
                    "2026-09-15T12:00:00.000Z",
                effectiveAt:
                    "2026-11-01T00:00:00.000Z"
            });

        const result =
            createInsuranceAcquisitionAsOfEvidence({
                asOfExclusive:
                    "2026-10-01T00:00:00.000Z",
                premiumFacts: [
                    premium
                ]
            });

        assert.deepEqual(
            result.premiumFacts,
            [
                premium
            ]
        );
    }
);


test(
    "future renewal effectiveAt does not exclude a fact that occurred before cutoff",
    () => {
        const renewal =
            createInsuranceRenewalFact({
                renewalFactId:
                    "renewal-fact:future-effective",
                relationshipId,
                kind:
                    "due",
                occurredAt:
                    "2026-09-20T12:00:00.000Z",
                effectiveAt:
                    "2027-01-01T00:00:00.000Z"
            });

        const result =
            createInsuranceAcquisitionAsOfEvidence({
                asOfExclusive:
                    "2026-10-01T00:00:00.000Z",
                renewalFacts: [
                    renewal
                ]
            });

        assert.deepEqual(
            result.renewalFacts,
            [
                renewal
            ]
        );
    }
);


test(
    "preserves original input order and object identity",
    () => {
        const first =
            createInsuranceAcquisitionCostFact({
                costId:
                    "acquisition-cost:first",
                relationshipId,
                category:
                    "lead",
                money: {
                    amountMinorUnits:
                        100,
                    currency:
                        "USD"
                },
                occurredAt:
                    "2026-09-20T00:00:00.000Z"
            });

        const second =
            createInsuranceAcquisitionCostFact({
                costId:
                    "acquisition-cost:second",
                relationshipId,
                category:
                    "lead",
                money: {
                    amountMinorUnits:
                        200,
                    currency:
                        "USD"
                },
                occurredAt:
                    "2026-09-10T00:00:00.000Z"
            });

        const result =
            createInsuranceAcquisitionAsOfEvidence({
                asOfExclusive:
                    "2026-10-01T00:00:00.000Z",
                acquisitionCosts: [
                    first,
                    second
                ]
            });

        assert.equal(
            result.acquisitionCosts[0],
            first
        );

        assert.equal(
            result.acquisitionCosts[1],
            second
        );
    }
);


test(
    "omitted evidence families become empty arrays",
    () => {
        const result =
            createInsuranceAcquisitionAsOfEvidence({
                asOfExclusive:
                    "2026-10-01T00:00:00.000Z"
            });

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
    "rejects noncanonical asOfExclusive timestamps",
    () => {
        for(const value of [
            "",
            "not-a-date",
            "2026-10-01",
            "2026-10-01T00:00:00Z",
            "2026-09-30T19:00:00.000-05:00"
        ]){
            assert.throws(
                () =>
                    createInsuranceAcquisitionAsOfEvidence({
                        asOfExclusive:
                            value
                    }),
                /canonical UTC timestamp/
            );
        }
    }
);


test(
    "rejects malformed fact occurredAt instead of silently comparing it",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionAsOfEvidence({
                    asOfExclusive:
                        "2026-10-01T00:00:00.000Z",
                    acquisitionCosts: [
                        {
                            costId:
                                "acquisition-cost:bad",
                            relationshipId,
                            category:
                                "lead",
                            money: {
                                amountMinorUnits:
                                    100,
                                currency:
                                    "USD"
                            },
                            occurredAt:
                                "not-a-date"
                        } as never
                    ]
                }),
            /valid fact occurredAt/
        );
    }
);
