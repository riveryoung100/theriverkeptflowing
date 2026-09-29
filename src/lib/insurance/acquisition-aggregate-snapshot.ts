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
    createD1InsuranceAttributedEconomicsBatchApplication
} from "./d1-attributed-economics-batch";

import type {
    InsuranceAttributedEconomicsBatchApplication
} from "./d1-attributed-economics-batch";


export const INSURANCE_ACQUISITION_AGGREGATE_SNAPSHOT_VERSION =
    "insurance-acquisition-aggregate-snapshot-v1" as const;


export interface GetInsuranceAcquisitionAggregateSnapshotInput {
    readonly relationshipIds:
        readonly RiverCrmRelationshipId[];

    readonly dimensions:
        readonly InsuranceAcquisitionAggregateDimension[];
}


export interface InsuranceAcquisitionAggregateSnapshot {
    readonly version:
        typeof INSURANCE_ACQUISITION_AGGREGATE_SNAPSHOT_VERSION;

    readonly relationshipCount:
        number;

    readonly aggregates:
        readonly InsuranceAcquisitionAggregateAnalytics[];
}


export interface InsuranceAcquisitionAggregateSnapshotApplication {
    getSnapshot(
        input:
            GetInsuranceAcquisitionAggregateSnapshotInput
    ): Promise<
        InsuranceAcquisitionAggregateSnapshot
    >;
}


function canonicalDimensions(
    dimensions:
        readonly InsuranceAcquisitionAggregateDimension[]
): readonly InsuranceAcquisitionAggregateDimension[] {
    const result:
        InsuranceAcquisitionAggregateDimension[] = [];

    const seen =
        new Set<
            InsuranceAcquisitionAggregateDimension
        >();

    for(const dimension of dimensions){
        if(!seen.has(dimension)){
            seen.add(
                dimension
            );

            result.push(
                dimension
            );
        }
    }

    return result;
}


export function createInsuranceAcquisitionAggregateSnapshotApplication(
    viewsApplication:
        InsuranceAttributedEconomicsBatchApplication
): InsuranceAcquisitionAggregateSnapshotApplication {
    return {
        async getSnapshot(
            input
        ){
            const views =
                await viewsApplication
                    .getViews(
                        input.relationshipIds
                    );

            const dimensions =
                canonicalDimensions(
                    input.dimensions
                );

            const aggregates =
                dimensions.map(
                    dimension=>
                        createInsuranceAcquisitionAggregateAnalytics({
                            dimension,
                            views
                        })
                );

            return {
                version:
                    INSURANCE_ACQUISITION_AGGREGATE_SNAPSHOT_VERSION,

                relationshipCount:
                    views.length,

                aggregates
            };
        }
    };
}


export function createD1InsuranceAcquisitionAggregateSnapshotApplication(
    database:
        RiverCrmD1Database
): InsuranceAcquisitionAggregateSnapshotApplication {
    return createInsuranceAcquisitionAggregateSnapshotApplication(
        createD1InsuranceAttributedEconomicsBatchApplication(
            database
        )
    );
}
