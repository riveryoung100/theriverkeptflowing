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


export const INSURANCE_ACQUISITION_DIMENSION_OUTCOME_SNAPSHOT_VERSION =
    "insurance-acquisition-dimension-outcome-snapshot-v1" as const;


export interface InsuranceDimensionOutcomeSnapshotFactReader {
    listForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        readonly InsuranceAcquisitionOutcomeFact[]
    >;
}


export interface GetInsuranceAcquisitionDimensionOutcomeSnapshotInput {
    readonly relationshipIds:
        readonly RiverCrmRelationshipId[];

    readonly dimensions:
        readonly InsuranceAcquisitionAggregateDimension[];
}


export interface InsuranceAcquisitionDimensionOutcomeSnapshot {
    readonly version:
        typeof INSURANCE_ACQUISITION_DIMENSION_OUTCOME_SNAPSHOT_VERSION;

    readonly relationshipCount:
        number;

    readonly analytics:
        readonly InsuranceAcquisitionDimensionOutcomeAnalytics[];
}


export interface InsuranceAcquisitionDimensionOutcomeSnapshotApplication {
    getSnapshot(
        input:
            GetInsuranceAcquisitionDimensionOutcomeSnapshotInput
    ): Promise<
        InsuranceAcquisitionDimensionOutcomeSnapshot
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
            "Insurance acquisition dimension outcome snapshot received an unsupported dimension."
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
        Awaited<
            ReturnType<
                InsuranceAttributedEconomicsBatchApplication[
                    "getViews"
                ]
            >
        >,
    outcomeFacts:
        readonly InsuranceAcquisitionOutcomeFact[]
): readonly InsuranceAcquisitionDimensionOutcomeAnalytics[] {
    return dimensions.map(
        dimension =>
            createInsuranceAcquisitionDimensionOutcomeAnalytics({
                dimension,
                relationshipIds,
                views,
                outcomeFacts
            })
    );
}


export function createInsuranceAcquisitionDimensionOutcomeSnapshotApplication(
    viewsApplication:
        InsuranceAttributedEconomicsBatchApplication,
    outcomeReader:
        InsuranceDimensionOutcomeSnapshotFactReader
): InsuranceAcquisitionDimensionOutcomeSnapshotApplication {
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
                        INSURANCE_ACQUISITION_DIMENSION_OUTCOME_SNAPSHOT_VERSION,

                    relationshipCount:
                        0,

                    analytics:
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
                    INSURANCE_ACQUISITION_DIMENSION_OUTCOME_SNAPSHOT_VERSION,

                relationshipCount:
                    relationshipIds.length,

                analytics:
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


export function createD1InsuranceAcquisitionDimensionOutcomeSnapshotApplication(
    database:
        RiverCrmD1Database
): InsuranceAcquisitionDimensionOutcomeSnapshotApplication {
    return createInsuranceAcquisitionDimensionOutcomeSnapshotApplication(
        createD1InsuranceAttributedEconomicsBatchApplication(
            database
        ),
        createD1InsuranceAcquisitionOutcomePersistence(
            database
        )
    );
}
