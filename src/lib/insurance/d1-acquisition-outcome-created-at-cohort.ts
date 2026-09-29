import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    RiverCrmCreatedAtCohortQuery
} from "../river-os/crm-workspace";

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


export interface InsuranceCreatedAtOutcomeCohortReader {
    listCreatedAtRange(
        query:
            RiverCrmCreatedAtCohortQuery
    ): Promise<
        readonly {
            readonly relationshipId:
                string;
        }[]
    >;
}


export interface GetInsuranceCreatedAtOutcomeAnalyticsInput {
    readonly createdAtFromInclusive:
        string;

    readonly createdAtToExclusive:
        string;

    readonly limit?:
        number;
}


export interface InsuranceCreatedAtOutcomeAnalyticsApplication {
    getCreatedAtAnalytics(
        input:
            GetInsuranceCreatedAtOutcomeAnalyticsInput
    ): Promise<
        InsuranceAcquisitionOutcomeAnalytics
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
            const cohortQuery:
                RiverCrmCreatedAtCohortQuery = {
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
                };

            const relationships =
                await cohortReader
                    .listCreatedAtRange(
                        cohortQuery
                    );

            const relationshipIds =
                relationships.map(
                    relationship =>
                        requireRiverCrmRelationshipId(
                            relationship.relationshipId
                        )
                );

            return outcomeApplication
                .getAnalytics({
                    relationshipIds
                });
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
