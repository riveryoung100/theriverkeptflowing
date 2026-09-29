import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import {
    createD1RiverCrmPersistence
} from "../river-os/d1-crm";

import type {
    InsuranceAcquisitionAggregateAnalytics,
    InsuranceAcquisitionAggregateDimension
} from "./acquisition-aggregate-analytics";

import {
    createD1InsuranceAcquisitionAggregateAnalyticsApplication
} from "./d1-acquisition-aggregate-analytics";

import type {
    GetInsuranceAcquisitionAggregateAnalyticsInput,
    InsuranceAcquisitionAggregateAnalyticsApplication
} from "./d1-acquisition-aggregate-analytics";


export interface InsuranceRecentRelationshipCohortReader {
    list(
        limit?:
            number
    ): Promise<
        readonly {
            readonly relationshipId:
                string;
        }[]
    >;
}


export interface GetInsuranceRecentRelationshipAggregateAnalyticsInput {
    readonly dimension:
        InsuranceAcquisitionAggregateDimension;

    readonly limit?:
        number;
}


export interface InsuranceRecentRelationshipAggregateAnalyticsApplication {
    getRecentRelationshipAggregateAnalytics(
        input:
            GetInsuranceRecentRelationshipAggregateAnalyticsInput
    ): Promise<
        InsuranceAcquisitionAggregateAnalytics
    >;
}


export function createInsuranceRecentRelationshipAggregateAnalyticsApplication(
    cohortReader:
        InsuranceRecentRelationshipCohortReader,
    aggregateApplication:
        InsuranceAcquisitionAggregateAnalyticsApplication
): InsuranceRecentRelationshipAggregateAnalyticsApplication {
    return {
        async getRecentRelationshipAggregateAnalytics(
            input
        ){
            const relationships =
                input.limit === undefined
                    ? await cohortReader.list()
                    : await cohortReader.list(
                        input.limit
                    );

            const relationshipIds =
                relationships.map(
                    relationship=>
                        requireRiverCrmRelationshipId(
                            relationship.relationshipId
                        )
                );

            const aggregateInput:
                GetInsuranceAcquisitionAggregateAnalyticsInput = {
                    dimension:
                        input.dimension,
                    relationshipIds
                };

            return aggregateApplication
                .getAggregateAnalytics(
                    aggregateInput
                );
        }
    };
}


export function createD1InsuranceRecentRelationshipAggregateAnalyticsApplication(
    database:
        D1Database
): InsuranceRecentRelationshipAggregateAnalyticsApplication {
    return createInsuranceRecentRelationshipAggregateAnalyticsApplication(
        createD1RiverCrmPersistence(
            database
        ),
        createD1InsuranceAcquisitionAggregateAnalyticsApplication(
            database
        )
    );
}
