import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import type {
    RiverCrmD1Database
} from "../river-os/d1-crm";

import type {
    InsuranceAcquisitionAggregateDimension
} from "./acquisition-aggregate-analytics";

import {
    createInsuranceAcquisitionDimensionOutcomeAnalytics
} from "./acquisition-dimension-outcome-analytics";

import type {
    InsuranceAcquisitionDimensionOutcomeAnalytics
} from "./acquisition-dimension-outcome-analytics";

import type {
    InsuranceAcquisitionOutcomeFact
} from "./acquisition-outcomes";

import {
    createD1InsuranceAcquisitionOutcomePersistence
} from "./d1-acquisition-outcomes";

import {
    createD1InsuranceAttributedEconomicsBatchApplication
} from "./d1-attributed-economics-batch";

import type {
    InsuranceAttributedEconomicsBatchApplication
} from "./d1-attributed-economics-batch";


export interface InsuranceDimensionOutcomeFactReader {
    listForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        readonly InsuranceAcquisitionOutcomeFact[]
    >;
}


export interface GetInsuranceAcquisitionDimensionOutcomeAnalyticsInput {
    readonly dimension:
        InsuranceAcquisitionAggregateDimension;

    readonly relationshipIds:
        readonly RiverCrmRelationshipId[];
}


export interface InsuranceAcquisitionDimensionOutcomeAnalyticsApplication {
    getDimensionOutcomeAnalytics(
        input:
            GetInsuranceAcquisitionDimensionOutcomeAnalyticsInput
    ): Promise<
        InsuranceAcquisitionDimensionOutcomeAnalytics
    >;
}


function canonicalRelationshipIds(
    values:
        readonly RiverCrmRelationshipId[]
): readonly RiverCrmRelationshipId[] {
    const result:
        RiverCrmRelationshipId[] = [];

    const seen =
        new Set<
            RiverCrmRelationshipId
        >();

    for(const value of values){
        const relationshipId =
            requireRiverCrmRelationshipId(
                value
            );

        if(seen.has(relationshipId)){
            continue;
        }

        seen.add(
            relationshipId
        );

        result.push(
            relationshipId
        );
    }

    return result;
}


export function createInsuranceAcquisitionDimensionOutcomeAnalyticsApplication(
    viewsApplication:
        InsuranceAttributedEconomicsBatchApplication,
    outcomeReader:
        InsuranceDimensionOutcomeFactReader
): InsuranceAcquisitionDimensionOutcomeAnalyticsApplication {
    return {
        async getDimensionOutcomeAnalytics(
            input
        ){
            const relationshipIds =
                canonicalRelationshipIds(
                    input.relationshipIds
                );

            if(relationshipIds.length === 0){
                return createInsuranceAcquisitionDimensionOutcomeAnalytics({
                    dimension:
                        input.dimension,

                    relationshipIds,

                    views:
                        [],

                    outcomeFacts:
                        []
                });
            }

            const [
                views,
                outcomeFacts
            ] =
                await Promise.all([
                    viewsApplication
                        .getViews(
                            relationshipIds
                        ),

                    outcomeReader
                        .listForRelationships(
                            relationshipIds
                        )
                ]);

            return createInsuranceAcquisitionDimensionOutcomeAnalytics({
                dimension:
                    input.dimension,

                relationshipIds,

                views,
                outcomeFacts
            });
        }
    };
}


export function createD1InsuranceAcquisitionDimensionOutcomeAnalyticsApplication(
    database:
        RiverCrmD1Database
): InsuranceAcquisitionDimensionOutcomeAnalyticsApplication {
    return createInsuranceAcquisitionDimensionOutcomeAnalyticsApplication(
        createD1InsuranceAttributedEconomicsBatchApplication(
            database
        ),
        createD1InsuranceAcquisitionOutcomePersistence(
            database
        )
    );
}
