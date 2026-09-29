import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

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
    createInsuranceAcquisitionAggregateAnalytics,
    INSURANCE_ACQUISITION_AGGREGATE_DIMENSIONS
} from "./acquisition-aggregate-analytics";

import type {
    InsuranceAcquisitionAggregateAnalytics,
    InsuranceAcquisitionAggregateDimension
} from "./acquisition-aggregate-analytics";

import {
    createInsuranceAcquisitionDimensionCostPerOutcome
} from "./acquisition-dimension-cost-per-outcome";

import type {
    InsuranceAcquisitionDimensionCostPerOutcome
} from "./acquisition-dimension-cost-per-outcome";

import {
    createInsuranceAcquisitionDimensionOutcomeAnalytics
} from "./acquisition-dimension-outcome-analytics";

import type {
    InsuranceAcquisitionDimensionOutcomeAnalytics
} from "./acquisition-dimension-outcome-analytics";

import type {
    InsuranceAcquisitionOutcomeFact
} from "./acquisition-outcomes";

import type {
    InsuranceAttributedRelationshipEconomicsView
} from "./d1-acquisition-economics-view";

import {
    createD1InsuranceAcquisitionOutcomePersistence
} from "./d1-acquisition-outcomes";

import {
    createD1InsuranceAttributedEconomicsBatchApplication
} from "./d1-attributed-economics-batch";

import type {
    InsuranceAttributedEconomicsBatchApplication
} from "./d1-attributed-economics-batch";


export const INSURANCE_ACQUISITION_PERFORMANCE_SNAPSHOT_VERSION =
    "insurance-acquisition-performance-snapshot-v1" as const;


export interface InsuranceAcquisitionPerformanceSnapshotCohortReader {
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


export interface InsuranceAcquisitionPerformanceSnapshotOutcomeReader {
    listForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        readonly InsuranceAcquisitionOutcomeFact[]
    >;
}


export interface GetInsuranceAcquisitionPerformanceSnapshotInput {
    readonly createdAtFromInclusive:
        string;

    readonly createdAtToExclusive:
        string;

    readonly limit?:
        number;

    readonly dimensions:
        readonly InsuranceAcquisitionAggregateDimension[];
}


export interface InsuranceAcquisitionPerformanceDimensionProjection {
    readonly dimension:
        InsuranceAcquisitionAggregateDimension;

    readonly economics:
        InsuranceAcquisitionAggregateAnalytics;

    readonly outcomes:
        InsuranceAcquisitionDimensionOutcomeAnalytics;

    readonly costPerOutcome:
        InsuranceAcquisitionDimensionCostPerOutcome;
}


export interface InsuranceAcquisitionPerformanceSnapshot {
    readonly version:
        typeof INSURANCE_ACQUISITION_PERFORMANCE_SNAPSHOT_VERSION;

    readonly relationshipCount:
        number;

    readonly dimensions:
        readonly InsuranceAcquisitionPerformanceDimensionProjection[];
}


export interface InsuranceAcquisitionPerformanceSnapshotApplication {
    getCreatedAtSnapshot(
        input:
            GetInsuranceAcquisitionPerformanceSnapshotInput
    ): Promise<
        InsuranceAcquisitionPerformanceSnapshot
    >;
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
            "Insurance acquisition performance snapshot received an unsupported dimension."
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


function canonicalRelationshipIds(
    values:
        readonly {
            readonly relationshipId:
                string;
        }[]
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
                value.relationshipId
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


function projectDimension(
    dimension:
        InsuranceAcquisitionAggregateDimension,
    relationshipIds:
        readonly RiverCrmRelationshipId[],
    views:
        readonly InsuranceAttributedRelationshipEconomicsView[],
    outcomeFacts:
        readonly InsuranceAcquisitionOutcomeFact[]
): InsuranceAcquisitionPerformanceDimensionProjection {
    const economics =
        createInsuranceAcquisitionAggregateAnalytics({
            dimension,
            views
        });

    const outcomes =
        createInsuranceAcquisitionDimensionOutcomeAnalytics({
            dimension,
            relationshipIds,
            views,
            outcomeFacts
        });

    const costPerOutcome =
        createInsuranceAcquisitionDimensionCostPerOutcome({
            dimension,
            relationshipIds,
            views,
            outcomeFacts
        });

    if(
        economics.dimension !== dimension ||
        outcomes.dimension !== dimension ||
        costPerOutcome.dimension !== dimension
    ){
        throw new TypeError(
            "Insurance acquisition performance snapshot requires matching dimension identities across projections."
        );
    }

    if(
        economics.relationshipCount !==
            relationshipIds.length ||
        outcomes.relationshipCount !==
            relationshipIds.length ||
        costPerOutcome.relationshipCount !==
            relationshipIds.length
    ){
        throw new RangeError(
            "Insurance acquisition performance snapshot requires matching relationship counts across projections."
        );
    }

    return {
        dimension,
        economics,
        outcomes,
        costPerOutcome
    };
}


function projectDimensions(
    dimensions:
        readonly InsuranceAcquisitionAggregateDimension[],
    relationshipIds:
        readonly RiverCrmRelationshipId[],
    views:
        readonly InsuranceAttributedRelationshipEconomicsView[],
    outcomeFacts:
        readonly InsuranceAcquisitionOutcomeFact[]
): readonly InsuranceAcquisitionPerformanceDimensionProjection[] {
    return dimensions.map(
        dimension =>
            projectDimension(
                dimension,
                relationshipIds,
                views,
                outcomeFacts
            )
    );
}


export function createInsuranceAcquisitionPerformanceSnapshotApplication(
    cohortReader:
        InsuranceAcquisitionPerformanceSnapshotCohortReader,
    viewsApplication:
        InsuranceAttributedEconomicsBatchApplication,
    outcomeReader:
        InsuranceAcquisitionPerformanceSnapshotOutcomeReader
): InsuranceAcquisitionPerformanceSnapshotApplication {
    return {
        async getCreatedAtSnapshot(
            input
        ){
            const dimensions =
                canonicalDimensions(
                    input.dimensions
                );

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
                canonicalRelationshipIds(
                    relationships
                );

            if(relationshipIds.length === 0){
                return {
                    version:
                        INSURANCE_ACQUISITION_PERFORMANCE_SNAPSHOT_VERSION,

                    relationshipCount:
                        0,

                    dimensions:
                        projectDimensions(
                            dimensions,
                            relationshipIds,
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
                    INSURANCE_ACQUISITION_PERFORMANCE_SNAPSHOT_VERSION,

                relationshipCount:
                    relationshipIds.length,

                dimensions:
                    projectDimensions(
                        dimensions,
                        relationshipIds,
                        views,
                        outcomeFacts
                    )
            };
        }
    };
}


export function createD1InsuranceAcquisitionPerformanceSnapshotApplication(
    database:
        RiverCrmD1Database
): InsuranceAcquisitionPerformanceSnapshotApplication {
    return createInsuranceAcquisitionPerformanceSnapshotApplication(
        createD1RiverCrmPersistence(
            database
        ),
        createD1InsuranceAttributedEconomicsBatchApplication(
            database
        ),
        createD1InsuranceAcquisitionOutcomePersistence(
            database
        )
    );
}
