import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import type {
    RiverCrmD1Database
} from "../river-os/d1-crm";

import {
    INSURANCE_ACQUISITION_AGGREGATE_DIMENSIONS
} from "./acquisition-aggregate-analytics";

import type {
    InsuranceAcquisitionAggregateDimension
} from "./acquisition-aggregate-analytics";

import {
    createInsuranceAcquisitionDimensionCostPerOutcome
} from "./acquisition-dimension-cost-per-outcome";

import type {
    InsuranceAcquisitionDimensionCostPerOutcome
} from "./acquisition-dimension-cost-per-outcome";

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


export interface InsuranceDimensionCostPerOutcomeFactReader {
    listForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        readonly InsuranceAcquisitionOutcomeFact[]
    >;
}


export interface GetInsuranceAcquisitionDimensionCostPerOutcomeInput {
    readonly dimension:
        InsuranceAcquisitionAggregateDimension;

    readonly relationshipIds:
        readonly RiverCrmRelationshipId[];
}


export interface InsuranceAcquisitionDimensionCostPerOutcomeApplication {
    getDimensionCostPerOutcome(
        input:
            GetInsuranceAcquisitionDimensionCostPerOutcomeInput
    ): Promise<
        InsuranceAcquisitionDimensionCostPerOutcome
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


function requireDimension(
    value:
        InsuranceAcquisitionAggregateDimension
): InsuranceAcquisitionAggregateDimension {
    if(
        !(
            INSURANCE_ACQUISITION_AGGREGATE_DIMENSIONS as
                readonly string[]
        ).includes(
            value as string
        )
    ){
        throw new TypeError(
            "Insurance acquisition dimension cost per outcome application received an unsupported dimension."
        );
    }

    return value;
}


export function createInsuranceAcquisitionDimensionCostPerOutcomeApplication(
    viewsApplication:
        InsuranceAttributedEconomicsBatchApplication,
    outcomeReader:
        InsuranceDimensionCostPerOutcomeFactReader
): InsuranceAcquisitionDimensionCostPerOutcomeApplication {
    return {
        async getDimensionCostPerOutcome(
            input
        ){
            const dimension =
                requireDimension(
                    input.dimension
                );

            const relationshipIds =
                canonicalRelationshipIds(
                    input.relationshipIds
                );

            if(relationshipIds.length === 0){
                return createInsuranceAcquisitionDimensionCostPerOutcome({
                    dimension,
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

            return createInsuranceAcquisitionDimensionCostPerOutcome({
                dimension,
                relationshipIds,
                views,
                outcomeFacts
            });
        }
    };
}


export function createD1InsuranceAcquisitionDimensionCostPerOutcomeApplication(
    database:
        RiverCrmD1Database
): InsuranceAcquisitionDimensionCostPerOutcomeApplication {
    return createInsuranceAcquisitionDimensionCostPerOutcomeApplication(
        createD1InsuranceAttributedEconomicsBatchApplication(
            database
        ),
        createD1InsuranceAcquisitionOutcomePersistence(
            database
        )
    );
}
