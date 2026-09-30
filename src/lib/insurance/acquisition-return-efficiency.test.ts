import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceAcquisitionReturnEfficiency,
    INSURANCE_ACQUISITION_RETURN_EFFICIENCY_VERSION
} from "./acquisition-return-efficiency";


test(
    "projects exact currency-isolated realized commission and contribution return ratios",
    () => {
        const input =
            Object.freeze([
                Object.freeze({
                    currency:
                        "USD",

                    acquisitionCostMinorUnits:
                        1000,

                    realizedCommissionMinorUnits:
                        1500,

                    contributionMarginMinorUnits:
                        500
                }),

                Object.freeze({
                    currency:
                        "EUR",

                    acquisitionCostMinorUnits:
                        500,

                    realizedCommissionMinorUnits:
                        -100,

                    contributionMarginMinorUnits:
                        -600
                })
            ]);

        const result =
            createInsuranceAcquisitionReturnEfficiency({
                currencies:
                    input
            });

        assert.equal(
            result.projectionVersion,
            INSURANCE_ACQUISITION_RETURN_EFFICIENCY_VERSION
        );

        assert.deepEqual(
            result.currencies,
            [
                {
                    currency:
                        "EUR",

                    acquisitionCostMinorUnits:
                        500,

                    realizedCommissionMinorUnits:
                        -100,

                    contributionMarginMinorUnits:
                        -600,

                    realizedCommissionToAcquisitionCost: {
                        numeratorMinorUnits:
                            -100,

                        denominatorMinorUnits:
                            500
                    },

                    contributionToAcquisitionCost: {
                        numeratorMinorUnits:
                            -600,

                        denominatorMinorUnits:
                            500
                    }
                },
                {
                    currency:
                        "USD",

                    acquisitionCostMinorUnits:
                        1000,

                    realizedCommissionMinorUnits:
                        1500,

                    contributionMarginMinorUnits:
                        500,

                    realizedCommissionToAcquisitionCost: {
                        numeratorMinorUnits:
                            1500,

                        denominatorMinorUnits:
                            1000
                    },

                    contributionToAcquisitionCost: {
                        numeratorMinorUnits:
                            500,

                        denominatorMinorUnits:
                            1000
                    }
                }
            ]
        );

        assert.deepEqual(
            input.map(
                currency =>
                    currency.currency
            ),
            [
                "USD",
                "EUR"
            ]
        );
    }
);


test(
    "zero acquisition cost preserves amounts but omits both return ratios",
    () => {
        const result =
            createInsuranceAcquisitionReturnEfficiency({
                currencies: [
                    {
                        currency:
                            "USD",

                        acquisitionCostMinorUnits:
                            0,

                        realizedCommissionMinorUnits:
                            500,

                        contributionMarginMinorUnits:
                            500
                    },
                    {
                        currency:
                            "EUR",

                        acquisitionCostMinorUnits:
                            0,

                        realizedCommissionMinorUnits:
                            -200,

                        contributionMarginMinorUnits:
                            -200
                    }
                ]
            });

        assert.equal(
            result.currencies.length,
            2
        );

        for(const currency of result.currencies){
            assert.equal(
                "realizedCommissionToAcquisitionCost" in currency,
                false
            );

            assert.equal(
                "contributionToAcquisitionCost" in currency,
                false
            );
        }
    }
);


test(
    "does not expose premium as an acquisition-return numerator",
    () => {
        const result =
            createInsuranceAcquisitionReturnEfficiency({
                currencies: [
                    {
                        currency:
                            "USD",

                        acquisitionCostMinorUnits:
                            100,

                        realizedCommissionMinorUnits:
                            20,

                        contributionMarginMinorUnits:
                            -80
                    }
                ]
            });

        const currency =
            result.currencies[0];

        assert.ok(
            currency
        );

        assert.equal(
            "quotedPremiumMinorUnits" in currency,
            false
        );

        assert.equal(
            "writtenPremiumMinorUnits" in currency,
            false
        );

        assert.equal(
            "renewalPremiumMinorUnits" in currency,
            false
        );
    }
);


test(
    "rejects duplicate currencies rather than aggregating them",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionReturnEfficiency({
                    currencies: [
                        {
                            currency:
                                "USD",

                            acquisitionCostMinorUnits:
                                100,

                            realizedCommissionMinorUnits:
                                20,

                            contributionMarginMinorUnits:
                                -80
                        },
                        {
                            currency:
                                "USD",

                            acquisitionCostMinorUnits:
                                200,

                            realizedCommissionMinorUnits:
                                40,

                            contributionMarginMinorUnits:
                                -160
                        }
                    ]
                }),
            /duplicate currency USD/
        );
    }
);


test(
    "rejects noncanonical currency codes",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionReturnEfficiency({
                    currencies: [
                        {
                            currency:
                                "usd",

                            acquisitionCostMinorUnits:
                                100,

                            realizedCommissionMinorUnits:
                                20,

                            contributionMarginMinorUnits:
                                -80
                        }
                    ]
                }),
            /canonical uppercase three-letter currency/
        );
    }
);


test(
    "rejects negative or unsafe acquisition cost denominators",
    () => {
        for(const acquisitionCostMinorUnits of [
            -1,
            Number.MAX_SAFE_INTEGER + 1
        ]){
            assert.throws(
                () =>
                    createInsuranceAcquisitionReturnEfficiency({
                        currencies: [
                            {
                                currency:
                                    "USD",

                                acquisitionCostMinorUnits,

                                realizedCommissionMinorUnits:
                                    0,

                                contributionMarginMinorUnits:
                                    0
                            }
                        ]
                    }),
                /acquisitionCostMinorUnits to be a safe non-negative integer/
            );
        }
    }
);


test(
    "rejects unsafe signed return numerators",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionReturnEfficiency({
                    currencies: [
                        {
                            currency:
                                "USD",

                            acquisitionCostMinorUnits:
                                100,

                            realizedCommissionMinorUnits:
                                Number.MAX_SAFE_INTEGER + 1,

                            contributionMarginMinorUnits:
                                0
                        }
                    ]
                }),
            /realizedCommissionMinorUnits to be a safe signed integer/
        );

        assert.throws(
            () =>
                createInsuranceAcquisitionReturnEfficiency({
                    currencies: [
                        {
                            currency:
                                "USD",

                            acquisitionCostMinorUnits:
                                100,

                            realizedCommissionMinorUnits:
                                0,

                            contributionMarginMinorUnits:
                                Number.MIN_SAFE_INTEGER - 1
                        }
                    ]
                }),
            /contributionMarginMinorUnits to be a safe signed integer/
        );
    }
);


test(
    "empty currency input returns an empty canonical projection",
    () => {
        const result =
            createInsuranceAcquisitionReturnEfficiency({
                currencies:
                    []
            });

        assert.deepEqual(
            result,
            {
                projectionVersion:
                    INSURANCE_ACQUISITION_RETURN_EFFICIENCY_VERSION,

                currencies:
                    []
            }
        );
    }
);
