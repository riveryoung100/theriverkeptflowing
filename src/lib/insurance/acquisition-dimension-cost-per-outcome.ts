import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import {
    createInsuranceAcquisitionAggregateAnalytics
} from "./acquisition-aggregate-analytics";

import type {
    InsuranceAcquisitionAggregateDimension
} from "./acquisition-aggregate-analytics";

import type {
    InsuranceAcquisitionMoneyPerOutcome
} from "./acquisition-cost-per-outcome";

import {
    createInsuranceAcquisitionDimensionOutcomeAnalytics
} from "./acquisition-dimension-outcome-analytics";

import type {
    InsuranceAcquisitionOutcomeFact
} from "./acquisition-outcomes";

import type {
    InsuranceAttributedRelationshipEconomicsView
} from "./d1-acquisition-economics-view";


export const INSURANCE_ACQUISITION_DIMENSION_COST_PER_OUTCOME_VERSION =
    "insurance-acquisition-dimension-cost-per-outcome-v1" as const;


export interface InsuranceAcquisitionDimensionCostPerOutcomeCurrency {
    readonly currency:
        string;

    readonly acquisitionCostMinorUnits:
        number;

    readonly costPerQuote?:
        InsuranceAcquisitionMoneyPerOutcome;

    readonly costPerBind?:
        InsuranceAcquisitionMoneyPerOutcome;
}


export interface InsuranceAcquisitionDimensionCostPerOutcomeBucket {
    readonly dimensionValue?:
        string;

    readonly relationshipCount:
        number;

    readonly quotedRelationshipCount:
        number;

    readonly boundRelationshipCount:
        number;

    readonly currencies:
        readonly InsuranceAcquisitionDimensionCostPerOutcomeCurrency[];
}


export interface InsuranceAcquisitionDimensionCostPerOutcome {
    readonly projectionVersion:
        typeof INSURANCE_ACQUISITION_DIMENSION_COST_PER_OUTCOME_VERSION;

    readonly dimension:
        InsuranceAcquisitionAggregateDimension;

    readonly relationshipCount:
        number;

    readonly buckets:
        readonly InsuranceAcquisitionDimensionCostPerOutcomeBucket[];
}


export interface CreateInsuranceAcquisitionDimensionCostPerOutcomeInput {
    readonly dimension:
        InsuranceAcquisitionAggregateDimension;

    readonly relationshipIds:
        readonly RiverCrmRelationshipId[];

    readonly views:
        readonly InsuranceAttributedRelationshipEconomicsView[];

    readonly outcomeFacts:
        readonly InsuranceAcquisitionOutcomeFact[];
}


function bucketKey(
    dimensionValue:
        string | undefined
): string {
    return dimensionValue === undefined
        ? "0:"
        : `1:${dimensionValue}`;
}


function exactMoneyPerOutcome(
    numeratorMinorUnits:
        number,
    denominatorCount:
        number
): InsuranceAcquisitionMoneyPerOutcome | undefined {
    if(denominatorCount === 0){
        return undefined;
    }

    return {
        numeratorMinorUnits,
        denominatorCount
    };
}


export function createInsuranceAcquisitionDimensionCostPerOutcome(
    input:
        CreateInsuranceAcquisitionDimensionCostPerOutcomeInput
): InsuranceAcquisitionDimensionCostPerOutcome {
    const economics =
        createInsuranceAcquisitionAggregateAnalytics({
            dimension:
                input.dimension,

            views:
                input.views
        });

    const outcomes =
        createInsuranceAcquisitionDimensionOutcomeAnalytics({
            dimension:
                input.dimension,

            relationshipIds:
                input.relationshipIds,

            views:
                input.views,

            outcomeFacts:
                input.outcomeFacts
        });

    if(economics.dimension !== outcomes.dimension){
        throw new TypeError(
            "Insurance acquisition dimension cost per outcome requires matching economics and outcome dimensions."
        );
    }

    if(
        economics.relationshipCount !==
        outcomes.relationshipCount
    ){
        throw new RangeError(
            "Insurance acquisition dimension cost per outcome requires matching economics and outcome relationship counts."
        );
    }

    const economicsBuckets =
        new Map(
            economics.buckets.map(
                bucket => [
                    bucketKey(
                        bucket.dimensionValue
                    ),
                    bucket
                ] as const
            )
        );

    if(
        economicsBuckets.size !==
        economics.buckets.length
    ){
        throw new TypeError(
            "Insurance acquisition dimension cost per outcome requires unique economics dimension buckets."
        );
    }

    const projectedBuckets =
        outcomes.buckets.map(
            outcomeBucket => {
                const key =
                    bucketKey(
                        outcomeBucket.dimensionValue
                    );

                const economicsBucket =
                    economicsBuckets.get(
                        key
                    );

                if(economicsBucket === undefined){
                    throw new RangeError(
                        "Insurance acquisition dimension cost per outcome requires a matching economics bucket for every outcome bucket."
                    );
                }

                if(
                    economicsBucket.relationshipCount !==
                    outcomeBucket.relationshipCount
                ){
                    throw new RangeError(
                        "Insurance acquisition dimension cost per outcome requires matching bucket relationship counts."
                    );
                }

                economicsBuckets.delete(
                    key
                );

                const currencies =
                    economicsBucket.currencies.map(
                        currency => {
                            const costPerQuote =
                                exactMoneyPerOutcome(
                                    currency.acquisitionCostMinorUnits,
                                    outcomeBucket.quotedRelationshipCount
                                );

                            const costPerBind =
                                exactMoneyPerOutcome(
                                    currency.acquisitionCostMinorUnits,
                                    outcomeBucket.boundRelationshipCount
                                );

                            return {
                                currency:
                                    currency.currency,

                                acquisitionCostMinorUnits:
                                    currency.acquisitionCostMinorUnits,

                                ...(costPerQuote !== undefined
                                    ? {
                                        costPerQuote
                                    }
                                    : {}),

                                ...(costPerBind !== undefined
                                    ? {
                                        costPerBind
                                    }
                                    : {})
                            };
                        }
                    );

                return {
                    ...(outcomeBucket.dimensionValue !== undefined
                        ? {
                            dimensionValue:
                                outcomeBucket.dimensionValue
                        }
                        : {}),

                    relationshipCount:
                        outcomeBucket.relationshipCount,

                    quotedRelationshipCount:
                        outcomeBucket.quotedRelationshipCount,

                    boundRelationshipCount:
                        outcomeBucket.boundRelationshipCount,

                    currencies
                };
            }
        );

    if(economicsBuckets.size !== 0){
        throw new RangeError(
            "Insurance acquisition dimension cost per outcome requires a matching outcome bucket for every economics bucket."
        );
    }

    return {
        projectionVersion:
            INSURANCE_ACQUISITION_DIMENSION_COST_PER_OUTCOME_VERSION,

        dimension:
            outcomes.dimension,

        relationshipCount:
            outcomes.relationshipCount,

        buckets:
            projectedBuckets
    };
}
