import type {
    RiverCrmD1Database
} from "../river-os/d1-crm-growth";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import type {
    InsuranceAcquisitionAggregateAnalytics,
    InsuranceAcquisitionAggregateDimension
} from "./acquisition-aggregate-analytics";

import {
    createInsuranceAcquisitionAggregateAnalytics
} from "./acquisition-aggregate-analytics";

import {
    createD1InsuranceLeadPresentationPersistence
} from "./d1-lead-presentation";

import {
    createD1InsuranceAcquisitionEconomicsPersistence
} from "./d1-acquisition-economics";

import type {
    InsuranceAttributedEconomicsBatchFactReader,
    InsuranceAttributedEconomicsBatchPresentationReader
} from "./d1-attributed-economics-batch";

import {
    createInsuranceAttributedEconomicsBatchApplication
} from "./d1-attributed-economics-batch";


export type InsuranceAcquisitionAggregatePresentationReader =
    InsuranceAttributedEconomicsBatchPresentationReader;


export type InsuranceAcquisitionAggregateEconomicsReader =
    InsuranceAttributedEconomicsBatchFactReader;


export interface GetInsuranceAcquisitionAggregateAnalyticsInput {
    readonly dimension:
        InsuranceAcquisitionAggregateDimension;

    readonly relationshipIds:
        readonly RiverCrmRelationshipId[];
}


export interface InsuranceAcquisitionAggregateAnalyticsApplication {
    getAggregateAnalytics(
        input:
            GetInsuranceAcquisitionAggregateAnalyticsInput
    ): Promise<
        InsuranceAcquisitionAggregateAnalytics
    >;
}


export function createInsuranceAcquisitionAggregateAnalyticsApplication(
    presentationReader:
        InsuranceAcquisitionAggregatePresentationReader,
    economicsReader:
        InsuranceAcquisitionAggregateEconomicsReader
): InsuranceAcquisitionAggregateAnalyticsApplication {
    const viewApplication =
        createInsuranceAttributedEconomicsBatchApplication(
            presentationReader,
            economicsReader
        );

    return {
        async getAggregateAnalytics(
            input
        ){
            const views =
                await viewApplication
                    .getViews(
                        input.relationshipIds
                    );

            return createInsuranceAcquisitionAggregateAnalytics({
                dimension:
                    input.dimension,
                views
            });
        }
    };
}


export function createD1InsuranceAcquisitionAggregateAnalyticsApplication(
    database:
        RiverCrmD1Database
): InsuranceAcquisitionAggregateAnalyticsApplication {
    return createInsuranceAcquisitionAggregateAnalyticsApplication(
        createD1InsuranceLeadPresentationPersistence(
            database
        ),
        createD1InsuranceAcquisitionEconomicsPersistence(
            database
        )
    );
}
