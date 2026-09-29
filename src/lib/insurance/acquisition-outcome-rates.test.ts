import assert from "node:assert/strict";
import test from "node:test";

import {
    INSURANCE_ACQUISITION_OUTCOME_ANALYTICS_VERSION
} from "./acquisition-outcome-analytics";

import {
    createInsuranceAcquisitionOutcomeRates,
    INSURANCE_ACQUISITION_OUTCOME_RATES_VERSION
} from "./acquisition-outcome-rates";


function analytics(
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


test(
    "creates exact quote and bind fractions over canonical relationship denominator",
    () => {
        const result =
            createInsuranceAcquisitionOutcomeRates(
                analytics(
                    10,
                    4,
                    2
                )
            );

        assert.deepEqual(
            result,
            {
                projectionVersion:
                    INSURANCE_ACQUISITION_OUTCOME_RATES_VERSION,

                relationshipCount:
                    10,

                quotedRelationshipCount:
                    4,

                boundRelationshipCount:
                    2,

                quoteRate: {
                    numerator:
                        4,

                    denominator:
                        10
                },

                bindRate: {
                    numerator:
                        2,

                    denominator:
                        10
                }
            }
        );
    }
);


test(
    "does not reduce fractions or introduce display rounding",
    () => {
        const result =
            createInsuranceAcquisitionOutcomeRates(
                analytics(
                    7,
                    3,
                    1
                )
            );

        assert.deepEqual(
            result.quoteRate,
            {
                numerator:
                    3,

                denominator:
                    7
            }
        );

        assert.deepEqual(
            result.bindRate,
            {
                numerator:
                    1,

                denominator:
                    7
            }
        );
    }
);


test(
    "positive denominator with zero outcomes produces exact zero-over-denominator rates",
    () => {
        const result =
            createInsuranceAcquisitionOutcomeRates(
                analytics(
                    8,
                    0,
                    0
                )
            );

        assert.deepEqual(
            result.quoteRate,
            {
                numerator:
                    0,

                denominator:
                    8
            }
        );

        assert.deepEqual(
            result.bindRate,
            {
                numerator:
                    0,

                denominator:
                    8
            }
        );
    }
);


test(
    "zero relationship denominator omits both rates",
    () => {
        const result =
            createInsuranceAcquisitionOutcomeRates(
                analytics(
                    0,
                    0,
                    0
                )
            );

        assert.equal(
            "quoteRate" in result,
            false
        );

        assert.equal(
            "bindRate" in result,
            false
        );

        assert.equal(
            result.relationshipCount,
            0
        );
    }
);


test(
    "bound rate remains independently denominatored and does not imply quoted",
    () => {
        const result =
            createInsuranceAcquisitionOutcomeRates(
                analytics(
                    3,
                    1,
                    2
                )
            );

        assert.deepEqual(
            result.quoteRate,
            {
                numerator:
                    1,

                denominator:
                    3
            }
        );

        assert.deepEqual(
            result.bindRate,
            {
                numerator:
                    2,

                denominator:
                    3
            }
        );
    }
);


test(
    "rejects quoted relationship count above denominator",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionOutcomeRates(
                    analytics(
                        2,
                        3,
                        1
                    )
                ),
            /quotedRelationshipCount not to exceed relationshipCount/
        );
    }
);


test(
    "rejects bound relationship count above denominator",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionOutcomeRates(
                    analytics(
                        2,
                        1,
                        3
                    )
                ),
            /boundRelationshipCount not to exceed relationshipCount/
        );
    }
);


test(
    "rejects negative noninteger and unsafe counts",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionOutcomeRates(
                    analytics(
                        -1,
                        0,
                        0
                    )
                ),
            /relationshipCount/
        );

        assert.throws(
            () =>
                createInsuranceAcquisitionOutcomeRates(
                    analytics(
                        2.5,
                        1,
                        1
                    )
                ),
            /relationshipCount/
        );

        assert.throws(
            () =>
                createInsuranceAcquisitionOutcomeRates(
                    analytics(
                        Number.MAX_SAFE_INTEGER + 1,
                        1,
                        1
                    )
                ),
            /relationshipCount/
        );
    }
);


test(
    "rejects noncanonical upstream projection version",
    () => {
        const input = {
            ...analytics(
                3,
                2,
                1
            ),

            projectionVersion:
                "not-canonical"
        };

        assert.throws(
            () =>
                createInsuranceAcquisitionOutcomeRates(
                    input as never
                ),
            /canonical outcome analytics/
        );
    }
);
