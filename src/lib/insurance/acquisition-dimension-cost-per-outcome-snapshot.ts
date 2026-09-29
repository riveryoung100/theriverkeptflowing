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

import type {
    InsuranceAttributedRelationshipEconomicsView
} from "./d1-acquisition-economics-view";


export const INSURANCE_ACQUISITION_DIMENSION_COST_PER_OUTCOME_SNAPSHOT_VERSION =
    "insurance-acquisition-dimension-cost-per-outcome-snapshot-v1" as const;


export interface InsuranceDimensionCostPerOutcomeSnapshotFactReader {
    listForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        readonly InsuranceAcquisitionOutcomeFact[]
    >;
}


export interface GetInsuranceAcquisitionDimensionCostPerOutcomeSnapshotInput {
    readonly relationshipIds:
        readonly RiverCrmRelationshipId[];

    readonly dimensions:
        readonly InsuranceAcquisitionAggregateDimension[];
}


export interface InsuranceAcquisitionDimensionCostPerOutcomeSnapshot {
    readonly version:
        typeof INSURANCE_ACQUISITION_DIMENSION_COST_PER_OUTCOME_SNAPSHOT_VERSION;

    readonly relationshipCount:
        number;

    readonly projections:
        readonly InsuranceAcquisitionDimensionCostPerOutcome[];
}


export interface InsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication {
    getSnapshot(
        input:
            GetInsuranceAcquisitionDimensionCostPerOutcomeSnapshotInput
    ): Promise<
        InsuranceAcquisitionDimensionCostPerOutcomeSnapshot
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
            "Insurance acquisition dimension cost per outcome snapshot received an unsupported dimension."
        );
    }

    return value;
}


function canonicalDimensions(
    values:
        readonly InsuranceAcquisitionAggregateDimension[]
): readonly InsuranceAcquisitionAggregateDimension[] {
    const result:
        InsuranceAcquisitionAggregateDimension[] = [];

    const seen =
        new Set<
            InsuranceAcquisitionAggregateDimension
        >();

    for(const value of values){
        const dimension =
            requireDimension(
                value
            );

        if(seen.has(dimension)){
            continue;
        }

        seen.add(
            dimension
        );

        result.push(
            dimension
        );
    }

    return result;
}


function projectDimensions(
    relationshipIds:
        readonly RiverCrmRelationshipId[],
    dimensions:
        readonly InsuranceAcquisitionAggregateDimension[],
    views:
        readonly InsuranceAttributedRelationshipEconomicsView[],
    outcomeFacts:
        readonly InsuranceAcquisitionOutcomeFact[]
): readonly InsuranceAcquisitionDimensionCostPerOutcome[] {
    return dimensions.map(
        dimension =>
            createInsuranceAcquisitionDimensionCostPerOutcome({
                dimension,
                relationshipIds,
                views,
                outcomeFacts
            })
    );
}


export function createInsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication(
    viewsApplication:
        InsuranceAttributedEconomicsBatchApplication,
    outcomeReader:
        InsuranceDimensionCostPerOutcomeSnapshotFactReader
): InsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication {
    return {
        async getSnapshot(
            input
        ){
            const relationshipIds =
                canonicalRelationshipIds(
                    input.relationshipIds
                );

            const dimensions =
                canonicalDimensions(
                    input.dimensions
                );

            if(relationshipIds.length === 0){
                return {
                    version:
                        INSURANCE_ACQUISITION_DIMENSION_COST_PER_OUTCOME_SNAPSHOT_VERSION,

                    relationshipCount:
                        0,

                    projections:
                        projectDimensions(
                            relationshipIds,
                            dimensions,
                            [],
                            []
                        )
                };
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

            return {
                version:
                    INSURANCE_ACQUISITION_DIMENSION_COST_PER_OUTCOME_SNAPSHOT_VERSION,

                relationshipCount:
                    relationshipIds.length,

                projections:
                    projectDimensions(
                        relationshipIds,
                        dimensions,
                        views,
                        outcomeFacts
                    )
            };
        }
    };
}


export function createD1InsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication(
    database:
        RiverCrmD1Database
): InsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication {
    return createInsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication(
        createD1InsuranceAttributedEconomicsBatchApplication(
            database
        ),
        createD1InsuranceAcquisitionOutcomePersistence(
            database
        )
    );
}
