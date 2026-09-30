import assert from "node:assert/strict";
import test from "node:test";

import {
    INSURANCE_ACQUISITION_AGGREGATE_PROJECTION_VERSION
} from "./acquisition-aggregate-analytics";

import type {
    InsuranceAcquisitionAggregateAnalytics,
    InsuranceAcquisitionAggregateCurrencyProjection
} from "./acquisition-aggregate-analytics";

import {
    createInsuranceAcquisitionDimensionReturnEfficiency,
    INSURANCE_ACQUISITION_DIMENSION_RETURN_EFFICIENCY_VERSION
} from "./acquisition-dimension-return-efficiency";


function currency(
    input: {
        readonly currency:
            string;

        readonly acquisitionCostMinorUnits:
            number;

        readonly realizedCommissionMinorUnits:
            number;

        readonly contributionMarginMinorUnits:
            number;
    }
): InsuranceAcquisitionAggregateCurrencyProjection {
    return {
        currency:
            input.currency,

        acquisitionCostMinorUnits:
            input.acquisitionCostMinorUnits,

        quotedPremiumMinorUnits:
            0,

        writtenPremiumMinorUnits:
            0,

        renewalPremiumMinorUnits:
            0,

        earnedCommissionMinorUnits:
            0,

        paidCommissionMinorUnits:
            input.realizedCommissionMinorUnits,

        chargebackMinorUnits:
            0,

        adjustmentMinorUnits:
            0,

        realizedCommissionMinorUnits:
            input.realizedCommissionMinorUnits,

        contributionMarginMinorUnits:
            input.contributionMarginMinorUnits
    };
}


test(
    "derives exact return efficiency from canonical economics buckets while preserving bucket order and identity",
    () => {
        const economics:
            InsuranceAcquisitionAggregateAnalytics = {
                projectionVersion:
                    INSURANCE_ACQUISITION_AGGREGATE_PROJECTION_VERSION,

                dimension:
                    "campaign",

                relationshipCount:
                    3,

                buckets: [
                    {
                        dimensionValue:
                            "campaign-b",

                        relationshipCount:
                            2,

                        currencies: [
                            currency({
                                currency:
                                    "USD",

                                acquisitionCostMinorUnits:
                                    1000,

                                realizedCommissionMinorUnits:
                                    1500,

                                contributionMarginMinorUnits:
                                    500
                            }),
                            currency({
                                currency:
                                    "EUR",

                                acquisitionCostMinorUnits:
                                    0,

                                realizedCommissionMinorUnits:
                                    -200,

                                contributionMarginMinorUnits:
                                    -200
                            })
                        ]
                    },
                    {
                        relationshipCount:
                            1,

                        currencies: [
                            currency({
                                currency:
                                    "USD",

                                acquisitionCostMinorUnits:
                                    500,

                                realizedCommissionMinorUnits:
                                    100,

                                contributionMarginMinorUnits:
                                    -400
                            })
                        ]
                    }
                ]
            };

        const result =
            createInsuranceAcquisitionDimensionReturnEfficiency({
                economics
            });

        assert.equal(
            result.projectionVersion,
            INSURANCE_ACQUISITION_DIMENSION_RETURN_EFFICIENCY_VERSION
        );

        assert.equal(
            result.dimension,
            "campaign"
        );

        assert.equal(
            result.relationshipCount,
            3
        );

        assert.equal(
            result.buckets.length,
            2
        );

        assert.equal(
            result.buckets[0]?.dimensionValue,
            "campaign-b"
        );

        assert.equal(
            result.buckets[0]?.relationshipCount,
            2
        );

        assert.equal(
            "dimensionValue" in result.buckets[1]!,
            false
        );

        assert.deepEqual(
            result.buckets[0]?.currencies,
            [
                {
                    currency:
                        "EUR",

                    acquisitionCostMinorUnits:
                        0,

                    realizedCommissionMinorUnits:
                        -200,

                    contributionMarginMinorUnits:
                        -200
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
            result.buckets[1]?.currencies,
            [
                {
                    currency:
                        "USD",

                    acquisitionCostMinorUnits:
                        500,

                    realizedCommissionMinorUnits:
                        100,

                    contributionMarginMinorUnits:
                        -400,

                    realizedCommissionToAcquisitionCost: {
                        numeratorMinorUnits:
                            100,

                        denominatorMinorUnits:
                            500
                    },

                    contributionToAcquisitionCost: {
                        numeratorMinorUnits:
                            -400,

                        denominatorMinorUnits:
                            500
                    }
                }
            ]
        );

        assert.deepEqual(
            economics.buckets.map(
                bucket =>
                    bucket.dimensionValue
            ),
            [
                "campaign-b",
                undefined
            ]
        );
    }
);


test(
    "empty canonical economics produces an empty dimension return-efficiency projection",
    () => {
        const result =
            createInsuranceAcquisitionDimensionReturnEfficiency({
                economics: {
                    projectionVersion:
                        INSURANCE_ACQUISITION_AGGREGATE_PROJECTION_VERSION,

                    dimension:
                        "state",

                    relationshipCount:
                        0,

                    buckets:
                        []
                }
            });

        assert.deepEqual(
            result,
            {
                projectionVersion:
                    INSURANCE_ACQUISITION_DIMENSION_RETURN_EFFICIENCY_VERSION,

                dimension:
                    "state",

                relationshipCount:
                    0,

                buckets:
                    []
            }
        );
    }
);


test(
    "rejects a noncanonical aggregate economics projection",
    () => {
        const economics = {
            projectionVersion:
                "not-canonical",

            dimension:
                "campaign",

            relationshipCount:
                0,

            buckets:
                []
        } as unknown as InsuranceAcquisitionAggregateAnalytics;

        assert.throws(
            () =>
                createInsuranceAcquisitionDimensionReturnEfficiency({
                    economics
                }),
            /requires canonical aggregate economics/
        );
    }
);
