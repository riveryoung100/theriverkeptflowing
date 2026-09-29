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


export interface InsuranceCreatedAtCostPerOutcomeCohortReader {
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


export interface GetInsuranceCreatedAtCostPerOutcomeInput {
    readonly createdAtFromInclusive:
        string;

    readonly createdAtToExclusive:
        string;

    readonly limit?:
        number;
}


export interface InsuranceCreatedAtCostPerOutcomeApplication {
    getCreatedAtCostPerOutcome(
        input:
            GetInsuranceCreatedAtCostPerOutcomeInput
    ): Promise<
        InsuranceAcquisitionCostPerOutcome
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

            return createInsuranceAcquisitionCostPerOutcome({
                relationshipIds,
                views,
                outcomeAnalytics
            });
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
