import {
    INSURANCE_ACQUISITION_AGGREGATE_PROJECTION_VERSION
} from "./acquisition-aggregate-analytics";

import type {
    InsuranceAcquisitionAggregateAnalytics,
    InsuranceAcquisitionAggregateDimension
} from "./acquisition-aggregate-analytics";

import {
    createInsuranceAcquisitionReturnEfficiency
} from "./acquisition-return-efficiency";

import type {
    InsuranceAcquisitionReturnEfficiencyCurrency
} from "./acquisition-return-efficiency";


export const INSURANCE_ACQUISITION_DIMENSION_RETURN_EFFICIENCY_VERSION =
    "insurance-acquisition-dimension-return-efficiency-v1" as const;


export interface InsuranceAcquisitionDimensionReturnEfficiencyBucket {
    readonly dimensionValue?:
        string;

    readonly relationshipCount:
        number;

    readonly currencies:
        readonly InsuranceAcquisitionReturnEfficiencyCurrency[];
}


export interface InsuranceAcquisitionDimensionReturnEfficiency {
    readonly projectionVersion:
        typeof INSURANCE_ACQUISITION_DIMENSION_RETURN_EFFICIENCY_VERSION;

    readonly dimension:
        InsuranceAcquisitionAggregateDimension;

    readonly relationshipCount:
        number;

    readonly buckets:
        readonly InsuranceAcquisitionDimensionReturnEfficiencyBucket[];
}


export interface CreateInsuranceAcquisitionDimensionReturnEfficiencyInput {
    readonly economics:
        InsuranceAcquisitionAggregateAnalytics;
}


export function createInsuranceAcquisitionDimensionReturnEfficiency(
    input:
        CreateInsuranceAcquisitionDimensionReturnEfficiencyInput
): InsuranceAcquisitionDimensionReturnEfficiency {
    if(
        input.economics.projectionVersion !==
        INSURANCE_ACQUISITION_AGGREGATE_PROJECTION_VERSION
    ){
        throw new TypeError(
            "Insurance acquisition dimension return efficiency requires canonical aggregate economics."
        );
    }

    const buckets =
        input.economics.buckets.map(
            bucket => {
                const returnEfficiency =
                    createInsuranceAcquisitionReturnEfficiency({
                        currencies:
                            bucket.currencies
                    });

                return {
                    ...(bucket.dimensionValue !== undefined
                        ? {
                            dimensionValue:
                                bucket.dimensionValue
                        }
                        : {}),

                    relationshipCount:
                        bucket.relationshipCount,

                    currencies:
                        returnEfficiency.currencies
                };
            }
        );

    return {
        projectionVersion:
            INSURANCE_ACQUISITION_DIMENSION_RETURN_EFFICIENCY_VERSION,

        dimension:
            input.economics.dimension,

        relationshipCount:
            input.economics.relationshipCount,

        buckets
    };
}
