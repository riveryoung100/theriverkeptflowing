import assert from "node:assert/strict";
import test from "node:test";

import {
    INSURANCE_ACQUISITION_OUTCOME_ANALYTICS_VERSION
} from "./acquisition-outcome-analytics";

import {
    INSURANCE_ACQUISITION_OUTCOME_RATES_VERSION
} from "./acquisition-outcome-rates";

import type {
    GetInsuranceCreatedAtOutcomeAnalyticsInput,
    InsuranceCreatedAtOutcomeAnalyticsApplication
} from "./d1-acquisition-outcome-created-at-cohort";

import {
    createInsuranceCreatedAtOutcomeRatesApplication
} from "./d1-acquisition-outcome-rates-created-at-cohort";


class RecordingCreatedAtAnalyticsApplication
implements InsuranceCreatedAtOutcomeAnalyticsApplication {
    calls =
        0;

    input:
        GetInsuranceCreatedAtOutcomeAnalyticsInput | undefined;

    constructor(
        private readonly relationshipCount:
            number,

        private readonly quotedRelationshipCount:
            number,

        private readonly boundRelationshipCount:
            number
    ){}

    async getCreatedAtAnalytics(
        input:
            GetInsuranceCreatedAtOutcomeAnalyticsInput
    ){
        this.calls +=
            1;

        this.input =
            input;

        return {
            projectionVersion:
                INSURANCE_ACQUISITION_OUTCOME_ANALYTICS_VERSION,

            relationshipCount:
                this.relationshipCount,

            quotedRelationshipCount:
                this.quotedRelationshipCount,

            boundRelationshipCount:
                this.boundRelationshipCount,

            outcomeFactCount:
                this.quotedRelationshipCount +
                this.boundRelationshipCount,

            quotedOutcomeFactCount:
                this.quotedRelationshipCount,

            boundOutcomeFactCount:
                this.boundRelationshipCount
        };
    }
}


test(
    "invokes created-at analytics once and projects exact quote and bind rates",
    async () => {
        const analyticsApplication =
            new RecordingCreatedAtAnalyticsApplication(
                10,
                4,
                2
            );

        const application =
            createInsuranceCreatedAtOutcomeRatesApplication(
                analyticsApplication
            );

        const result =
            await application
                .getCreatedAtRates({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    limit:
                        25
                });

        assert.equal(
            analyticsApplication.calls,
            1
        );

        assert.deepEqual(
            analyticsApplication.input,
            {
                createdAtFromInclusive:
                    "2026-09-01T00:00:00.000Z",

                createdAtToExclusive:
                    "2026-10-01T00:00:00.000Z",

                limit:
                    25
            }
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
    "preserves omitted limit for upstream CRM ownership",
    async () => {
        const analyticsApplication =
            new RecordingCreatedAtAnalyticsApplication(
                5,
                2,
                1
            );

        const application =
            createInsuranceCreatedAtOutcomeRatesApplication(
                analyticsApplication
            );

        await application
            .getCreatedAtRates({
                createdAtFromInclusive:
                    "2026-09-01T00:00:00.000Z",

                createdAtToExclusive:
                    "2026-10-01T00:00:00.000Z"
            });

        assert.deepEqual(
            analyticsApplication.input,
            {
                createdAtFromInclusive:
                    "2026-09-01T00:00:00.000Z",

                createdAtToExclusive:
                    "2026-10-01T00:00:00.000Z"
            }
        );
    }
);


test(
    "zero created cohort preserves zero counts and omitted rates",
    async () => {
        const analyticsApplication =
            new RecordingCreatedAtAnalyticsApplication(
                0,
                0,
                0
            );

        const application =
            createInsuranceCreatedAtOutcomeRatesApplication(
                analyticsApplication
            );

        const result =
            await application
                .getCreatedAtRates({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z"
                });

        assert.equal(
            analyticsApplication.calls,
            1
        );

        assert.equal(
            result.relationshipCount,
            0
        );

        assert.equal(
            "quoteRate" in result,
            false
        );

        assert.equal(
            "bindRate" in result,
            false
        );
    }
);


test(
    "bound remains independently denominatored and does not imply quoted",
    async () => {
        const analyticsApplication =
            new RecordingCreatedAtAnalyticsApplication(
                3,
                1,
                2
            );

        const application =
            createInsuranceCreatedAtOutcomeRatesApplication(
                analyticsApplication
            );

        const result =
            await application
                .getCreatedAtRates({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z"
                });

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
    "upstream invalid numerator relationship is rejected by canonical rate layer",
    async () => {
        const analyticsApplication =
            new RecordingCreatedAtAnalyticsApplication(
                2,
                3,
                1
            );

        const application =
            createInsuranceCreatedAtOutcomeRatesApplication(
                analyticsApplication
            );

        await assert.rejects(
            application
                .getCreatedAtRates({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z"
                }),
            /quotedRelationshipCount not to exceed relationshipCount/
        );

        assert.equal(
            analyticsApplication.calls,
            1
        );
    }
);


test(
    "does not validate or rewrite date strings in rate composition layer",
    async () => {
        const analyticsApplication =
            new RecordingCreatedAtAnalyticsApplication(
                0,
                0,
                0
            );

        const application =
            createInsuranceCreatedAtOutcomeRatesApplication(
                analyticsApplication
            );

        await application
            .getCreatedAtRates({
                createdAtFromInclusive:
                    "crm-owned-lower-bound",

                createdAtToExclusive:
                    "crm-owned-upper-bound"
            });

        assert.deepEqual(
            analyticsApplication.input,
            {
                createdAtFromInclusive:
                    "crm-owned-lower-bound",

                createdAtToExclusive:
                    "crm-owned-upper-bound"
            }
        );
    }
);
