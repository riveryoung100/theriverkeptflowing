import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    InsuranceCreatedAtCohortPageReader
} from "./complete-created-at-cohort";

import {
    projectInsuranceCreatedAtReportCohortMetadata,
    resolveInsuranceCreatedAtReportCohort
} from "./created-at-report-cohort";

import type {
    InsuranceCreatedAtReportCohortMetadata
} from "./created-at-report-cohort";

import {
    createD1RiverCrmPersistence
} from "../river-os/d1-crm";

import type {
    InsuranceAcquisitionOutcomeAnalytics
} from "./acquisition-outcome-analytics";

import {
    createD1InsuranceAcquisitionOutcomeAnalyticsApplication
} from "./d1-acquisition-outcome-analytics";

import type {
    InsuranceAcquisitionOutcomeAnalyticsApplication
} from "./d1-acquisition-outcome-analytics";


export type InsuranceCreatedAtOutcomeCohortReader =
    InsuranceCreatedAtCohortPageReader;


export interface GetInsuranceCreatedAtOutcomeAnalyticsInput {
    readonly createdAtFromInclusive:
        string;

    readonly createdAtToExclusive:
        string;

    readonly limit?:
        number;
}


export type InsuranceCreatedAtOutcomeAnalyticsResult =
    InsuranceAcquisitionOutcomeAnalytics & {
        readonly cohort:
            InsuranceCreatedAtReportCohortMetadata;
    };


export interface InsuranceCreatedAtOutcomeAnalyticsApplication {
    getCreatedAtAnalytics(
        input:
            GetInsuranceCreatedAtOutcomeAnalyticsInput
    ): Promise<
        InsuranceCreatedAtOutcomeAnalyticsResult
    >;
}


export function createInsuranceCreatedAtOutcomeAnalyticsApplication(
    cohortReader:
        InsuranceCreatedAtOutcomeCohortReader,
    outcomeApplication:
        InsuranceAcquisitionOutcomeAnalyticsApplication
): InsuranceCreatedAtOutcomeAnalyticsApplication {
    return {
        async getCreatedAtAnalytics(
            input
        ){
            const cohort =
                await resolveInsuranceCreatedAtReportCohort(
                    cohortReader,
                    {
                        createdAtFromInclusive:
                            input.createdAtFromInclusive,

                        createdAtToExclusive:
                            input.createdAtToExclusive,

                        ...(input.limit !== undefined
                            ? {
                                limit:
                                    input.limit
                            }
                            : {})
                    }
                );

            const relationships =
                cohort.relationships;

            const relationshipIds =
                relationships.map(
                    relationship =>
                        requireRiverCrmRelationshipId(
                            relationship.relationshipId
                        )
                );

            const analytics =
                await outcomeApplication
                    .getAnalytics({
                        relationshipIds
                    });

            return {
                ...analytics,

                cohort:
                    projectInsuranceCreatedAtReportCohortMetadata(
                        cohort
                    )
            };
        }
    };
}


export function createD1InsuranceCreatedAtOutcomeAnalyticsApplication(
    database:
        D1Database
): InsuranceCreatedAtOutcomeAnalyticsApplication {
    return createInsuranceCreatedAtOutcomeAnalyticsApplication(
        createD1RiverCrmPersistence(
            database
        ),
        createD1InsuranceAcquisitionOutcomeAnalyticsApplication(
            database
        )
    );
}
