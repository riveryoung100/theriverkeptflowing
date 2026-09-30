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
    RiverCrmD1Database
} from "../river-os/d1-crm";

import {
    createInsuranceAcquisitionCostPerOutcome
} from "./acquisition-cost-per-outcome";

import type {
    InsuranceAcquisitionCostPerOutcome
} from "./acquisition-cost-per-outcome";

import {
    createD1InsuranceAttributedEconomicsBatchApplication
} from "./d1-attributed-economics-batch";

import type {
    InsuranceAttributedEconomicsBatchApplication
} from "./d1-attributed-economics-batch";

import {
    createD1InsuranceAcquisitionOutcomeAnalyticsApplication
} from "./d1-acquisition-outcome-analytics";

import type {
    InsuranceAcquisitionOutcomeAnalyticsApplication
} from "./d1-acquisition-outcome-analytics";


export type InsuranceCreatedAtCostPerOutcomeCohortReader =
    InsuranceCreatedAtCohortPageReader;


export interface GetInsuranceCreatedAtCostPerOutcomeInput {
    readonly createdAtFromInclusive:
        string;

    readonly createdAtToExclusive:
        string;

    readonly limit?:
        number;
}


export type InsuranceCreatedAtCostPerOutcomeResult =
    InsuranceAcquisitionCostPerOutcome & {
        readonly cohort:
            InsuranceCreatedAtReportCohortMetadata;
    };


export interface InsuranceCreatedAtCostPerOutcomeApplication {
    getCreatedAtCostPerOutcome(
        input:
            GetInsuranceCreatedAtCostPerOutcomeInput
    ): Promise<
        InsuranceCreatedAtCostPerOutcomeResult
    >;
}


export function createInsuranceCreatedAtCostPerOutcomeApplication(
    cohortReader:
        InsuranceCreatedAtCostPerOutcomeCohortReader,
    economicsApplication:
        InsuranceAttributedEconomicsBatchApplication,
    outcomeApplication:
        InsuranceAcquisitionOutcomeAnalyticsApplication
): InsuranceCreatedAtCostPerOutcomeApplication {
    return {
        async getCreatedAtCostPerOutcome(
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

            const [
                views,
                outcomeAnalytics
            ] =
                await Promise.all([
                    economicsApplication
                        .getViews(
                            relationshipIds
                        ),

                    outcomeApplication
                        .getAnalytics({
                            relationshipIds
                        })
                ]);

            const result =
                createInsuranceAcquisitionCostPerOutcome({
                    relationshipIds,
                    views,
                    outcomeAnalytics
                });

            return {
                ...result,

                cohort:
                    projectInsuranceCreatedAtReportCohortMetadata(
                        cohort
                    )
            };
        }
    };
}


export function createD1InsuranceCreatedAtCostPerOutcomeApplication(
    database:
        RiverCrmD1Database
): InsuranceCreatedAtCostPerOutcomeApplication {
    return createInsuranceCreatedAtCostPerOutcomeApplication(
        createD1RiverCrmPersistence(
            database
        ),
        createD1InsuranceAttributedEconomicsBatchApplication(
            database
        ),
        createD1InsuranceAcquisitionOutcomeAnalyticsApplication(
            database
        )
    );
}
