import {
    createInsuranceAcquisitionOutcomeRates
} from "./acquisition-outcome-rates";

import type {
    InsuranceAcquisitionOutcomeRates
} from "./acquisition-outcome-rates";

import {
    createD1InsuranceCreatedAtOutcomeAnalyticsApplication
} from "./d1-acquisition-outcome-created-at-cohort";

import type {
    GetInsuranceCreatedAtOutcomeAnalyticsInput,
    InsuranceCreatedAtOutcomeAnalyticsApplication
} from "./d1-acquisition-outcome-created-at-cohort";


export type GetInsuranceCreatedAtOutcomeRatesInput =
    GetInsuranceCreatedAtOutcomeAnalyticsInput;


export interface InsuranceCreatedAtOutcomeRatesApplication {
    getCreatedAtRates(
        input:
            GetInsuranceCreatedAtOutcomeRatesInput
    ): Promise<
        InsuranceAcquisitionOutcomeRates
    >;
}


export function createInsuranceCreatedAtOutcomeRatesApplication(
    analyticsApplication:
        InsuranceCreatedAtOutcomeAnalyticsApplication
): InsuranceCreatedAtOutcomeRatesApplication {
    return {
        async getCreatedAtRates(
            input
        ){
            const analytics =
                await analyticsApplication
                    .getCreatedAtAnalytics(
                        input
                    );

            return createInsuranceAcquisitionOutcomeRates(
                analytics
            );
        }
    };
}


export function createD1InsuranceCreatedAtOutcomeRatesApplication(
    database:
        D1Database
): InsuranceCreatedAtOutcomeRatesApplication {
    return createInsuranceCreatedAtOutcomeRatesApplication(
        createD1InsuranceCreatedAtOutcomeAnalyticsApplication(
            database
        )
    );
}
