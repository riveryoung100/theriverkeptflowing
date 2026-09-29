import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceAcquisitionCostFact,
    createInsuranceCommissionFact,
    createInsurancePremiumFact,
    createInsuranceRenewalFact
} from "./acquisition-economics";

import {
    INSURANCE_ACQUISITION_ANALYTICS_PROJECTION_VERSION,
    createInsuranceRelationshipAcquisitionAnalytics
} from "./acquisition-analytics";


const relationshipId =
    "relationship:ins-003e";

const occurredAt =
    "2026-09-29T23:30:00.000Z";


test(
    "projects relationship economics without treating premium as revenue",
    () => {
        const result =
            createInsuranceRelationshipAcquisitionAnalytics({
                relationshipId,

                acquisitionCosts: [
                    createInsuranceAcquisitionCostFact({
                        costId:
                            "acquisition-cost:e1",
                        relationshipId,
                        category:
                            "lead",
                        money: {
                            amountMinorUnits:
                                2500,
                            currency:
                                "USD"
                        },
                        occurredAt
                    })
                ],

                premiumFacts: [
                    createInsurancePremiumFact({
                        premiumFactId:
                            "premium-fact:e1",
                        relationshipId,
                        kind:
                            "written",
                        money: {
                            amountMinorUnits:
                                200000,
                            currency:
                                "USD"
                        },
                        occurredAt
                    })
                ],

                commissionFacts: [
                    createInsuranceCommissionFact({
                        commissionFactId:
                            "commission-fact:paid-e1",
                        relationshipId,
                        kind:
                            "paid",
                        money: {
                            amountMinorUnits:
                                12000,
                            currency:
                                "USD"
                        },
                        occurredAt
                    })
                ]
            });

        assert.equal(
            result.projectionVersion,
            INSURANCE_ACQUISITION_ANALYTICS_PROJECTION_VERSION
        );

        assert.equal(
            result.currencies.length,
            1
        );

        const usd =
            result.currencies[0]!;

        assert.equal(
            usd.writtenPremiumMinorUnits,
            200000
        );

        assert.equal(
            usd.realizedCommissionMinorUnits,
            12000
        );

        assert.equal(
            usd.acquisitionCostMinorUnits,
            2500
        );

        assert.equal(
            usd.contributionMarginMinorUnits,
            9500
        );

        assert.notEqual(
            usd.contributionMarginMinorUnits,
            usd.writtenPremiumMinorUnits -
                usd.acquisitionCostMinorUnits
        );
    }
);


test(
    "applies signed chargebacks and adjustments to realized commission",
    () => {
        const result =
            createInsuranceRelationshipAcquisitionAnalytics({
                relationshipId,

                acquisitionCosts: [
                    createInsuranceAcquisitionCostFact({
                        costId:
                            "acquisition-cost:e2",
                        relationshipId,
                        category:
                            "advertising",
                        money: {
                            amountMinorUnits:
                                3000,
                            currency:
                                "USD"
                        },
                        occurredAt
                    })
                ],

                commissionFacts: [
                    createInsuranceCommissionFact({
                        commissionFactId:
                            "commission-fact:paid-e2",
                        relationshipId,
                        kind:
                            "paid",
                        money: {
                            amountMinorUnits:
                                15000,
                            currency:
                                "USD"
                        },
                        occurredAt
                    }),

                    createInsuranceCommissionFact({
                        commissionFactId:
                            "commission-fact:chargeback-e2",
                        relationshipId,
                        kind:
                            "chargeback",
                        money: {
                            amountMinorUnits:
                                -4000,
                            currency:
                                "USD"
                        },
                        occurredAt
                    }),

                    createInsuranceCommissionFact({
                        commissionFactId:
                            "commission-fact:adjustment-e2",
                        relationshipId,
                        kind:
                            "adjustment",
                        money: {
                            amountMinorUnits:
                                500,
                            currency:
                                "USD"
                        },
                        occurredAt
                    }),

                    createInsuranceCommissionFact({
                        commissionFactId:
                            "commission-fact:earned-e2",
                        relationshipId,
                        kind:
                            "earned",
                        money: {
                            amountMinorUnits:
                                16000,
                            currency:
                                "USD"
                        },
                        occurredAt
                    })
                ]
            });

        const usd =
            result.currencies[0]!;

        assert.equal(
            usd.earnedCommissionMinorUnits,
            16000
        );

        assert.equal(
            usd.paidCommissionMinorUnits,
            15000
        );

        assert.equal(
            usd.chargebackMinorUnits,
            -4000
        );

        assert.equal(
            usd.adjustmentMinorUnits,
            500
        );

        assert.equal(
            usd.realizedCommissionMinorUnits,
            11500
        );

        assert.equal(
            usd.contributionMarginMinorUnits,
            8500
        );
    }
);


test(
    "keeps currencies isolated and deterministically ordered",
    () => {
        const result =
            createInsuranceRelationshipAcquisitionAnalytics({
                relationshipId,

                acquisitionCosts: [
                    createInsuranceAcquisitionCostFact({
                        costId:
                            "acquisition-cost:usd",
                        relationshipId,
                        category:
                            "lead",
                        money: {
                            amountMinorUnits:
                                1000,
                            currency:
                                "USD"
                        },
                        occurredAt
                    }),

                    createInsuranceAcquisitionCostFact({
                        costId:
                            "acquisition-cost:eur",
                        relationshipId,
                        category:
                            "lead",
                        money: {
                            amountMinorUnits:
                                500,
                            currency:
                                "EUR"
                        },
                        occurredAt
                    })
                ]
            });

        assert.deepEqual(
            result.currencies.map(
                value =>
                    value.currency
            ),
            [
                "EUR",
                "USD"
            ]
        );

        assert.equal(
            result.currencies[0]!
                .acquisitionCostMinorUnits,
            500
        );

        assert.equal(
            result.currencies[1]!
                .acquisitionCostMinorUnits,
            1000
        );
    }
);


test(
    "separates quoted written and renewal premium",
    () => {
        const result =
            createInsuranceRelationshipAcquisitionAnalytics({
                relationshipId,

                premiumFacts: [
                    createInsurancePremiumFact({
                        premiumFactId:
                            "premium-fact:quoted",
                        relationshipId,
                        kind:
                            "quoted",
                        money: {
                            amountMinorUnits:
                                210000,
                            currency:
                                "USD"
                        },
                        occurredAt
                    }),

                    createInsurancePremiumFact({
                        premiumFactId:
                            "premium-fact:written",
                        relationshipId,
                        kind:
                            "written",
                        money: {
                            amountMinorUnits:
                                200000,
                            currency:
                                "USD"
                        },
                        occurredAt
                    }),

                    createInsurancePremiumFact({
                        premiumFactId:
                            "premium-fact:renewal",
                        relationshipId,
                        kind:
                            "renewal",
                        money: {
                            amountMinorUnits:
                                205000,
                            currency:
                                "USD"
                        },
                        occurredAt
                    })
                ]
            });

        const usd =
            result.currencies[0]!;

        assert.equal(
            usd.quotedPremiumMinorUnits,
            210000
        );

        assert.equal(
            usd.writtenPremiumMinorUnits,
            200000
        );

        assert.equal(
            usd.renewalPremiumMinorUnits,
            205000
        );

        assert.equal(
            usd.realizedCommissionMinorUnits,
            0
        );
    }
);


test(
    "derives latest renewal lifecycle observation",
    () => {
        const result =
            createInsuranceRelationshipAcquisitionAnalytics({
                relationshipId,

                renewalFacts: [
                    createInsuranceRenewalFact({
                        renewalFactId:
                            "renewal-fact:older",
                        relationshipId,
                        kind:
                            "due",
                        occurredAt:
                            "2027-08-01T00:00:00.000Z"
                    }),

                    createInsuranceRenewalFact({
                        renewalFactId:
                            "renewal-fact:newer",
                        relationshipId,
                        kind:
                            "renewed",
                        occurredAt:
                            "2027-09-01T00:00:00.000Z",
                        effectiveAt:
                            "2027-10-01T00:00:00.000Z"
                    })
                ]
            });

        assert.equal(
            result.renewalFactCount,
            2
        );

        assert.equal(
            result.latestRenewal?.renewalFactId,
            "renewal-fact:newer"
        );

        assert.equal(
            result.latestRenewal?.kind,
            "renewed"
        );

        assert.equal(
            result.latestRenewal?.effectiveAt,
            "2027-10-01T00:00:00.000Z"
        );
    }
);


test(
    "rejects facts belonging to another relationship",
    () => {
        assert.throws(
            () =>
                createInsuranceRelationshipAcquisitionAnalytics({
                    relationshipId,

                    premiumFacts: [
                        createInsurancePremiumFact({
                            premiumFactId:
                                "premium-fact:wrong-root",
                            relationshipId:
                                "relationship:other",
                            kind:
                                "written",
                            money: {
                                amountMinorUnits:
                                    100000,
                                currency:
                                    "USD"
                            },
                            occurredAt
                        })
                    ]
                }),
            /every premium fact/
        );
    }
);


test(
    "rejects duplicate fact identities rather than double counting",
    () => {
        const fact =
            createInsuranceCommissionFact({
                commissionFactId:
                    "commission-fact:duplicate",
                relationshipId,
                kind:
                    "paid",
                money: {
                    amountMinorUnits:
                        5000,
                    currency:
                        "USD"
                },
                occurredAt
            });

        assert.throws(
            () =>
                createInsuranceRelationshipAcquisitionAnalytics({
                    relationshipId,
                    commissionFacts: [
                        fact,
                        fact
                    ]
                }),
            /duplicate commission fact identity/
        );
    }
);


test(
    "empty relationship projection remains deterministic",
    () => {
        const result =
            createInsuranceRelationshipAcquisitionAnalytics({
                relationshipId
            });

        assert.equal(
            result.relationshipId,
            relationshipId
        );

        assert.deepEqual(
            result.currencies,
            []
        );

        assert.equal(
            result.renewalFactCount,
            0
        );

        assert.equal(
            result.latestRenewal,
            undefined
        );
    }
);
