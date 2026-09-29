import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import {
    INSURANCE_ACQUISITION_AGGREGATE_DIMENSIONS
} from "./acquisition-aggregate-analytics";

import type {
    InsuranceAcquisitionAggregateDimension
} from "./acquisition-aggregate-analytics";

import {
    createInsuranceAcquisitionOutcomeAnalytics
} from "./acquisition-outcome-analytics";

import {
    createInsuranceAcquisitionOutcomeRates
} from "./acquisition-outcome-rates";

import type {
    InsuranceAcquisitionOutcomeRate
} from "./acquisition-outcome-rates";

import type {
    InsuranceAcquisitionOutcomeFact
} from "./acquisition-outcomes";

import type {
    InsuranceAttributedRelationshipEconomicsView
} from "./d1-acquisition-economics-view";


export const INSURANCE_ACQUISITION_DIMENSION_OUTCOME_ANALYTICS_VERSION =
    "insurance-acquisition-dimension-outcome-analytics-v1" as const;


export interface InsuranceAcquisitionDimensionOutcomeBucket {
    readonly dimensionValue?:
        string;

    readonly relationshipCount:
        number;

    readonly quotedRelationshipCount:
        number;

    readonly boundRelationshipCount:
        number;

    readonly outcomeFactCount:
        number;

    readonly quotedOutcomeFactCount:
        number;

    readonly boundOutcomeFactCount:
        number;

    readonly quoteRate?:
        InsuranceAcquisitionOutcomeRate;

    readonly bindRate?:
        InsuranceAcquisitionOutcomeRate;
}


export interface InsuranceAcquisitionDimensionOutcomeAnalytics {
    readonly projectionVersion:
        typeof INSURANCE_ACQUISITION_DIMENSION_OUTCOME_ANALYTICS_VERSION;

    readonly dimension:
        InsuranceAcquisitionAggregateDimension;

    readonly relationshipCount:
        number;

    readonly buckets:
        readonly InsuranceAcquisitionDimensionOutcomeBucket[];
}


export interface CreateInsuranceAcquisitionDimensionOutcomeAnalyticsInput {
    readonly dimension:
        InsuranceAcquisitionAggregateDimension;

    readonly relationshipIds:
        readonly RiverCrmRelationshipId[];

    readonly views:
        readonly InsuranceAttributedRelationshipEconomicsView[];

    readonly outcomeFacts:
        readonly InsuranceAcquisitionOutcomeFact[];
}


interface MutableBucket {
    readonly dimensionValue?:
        string;

    readonly relationshipIds:
        RiverCrmRelationshipId[];
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
            "Insurance acquisition dimension outcome analytics received an unsupported dimension."
        );
    }

    return value;
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


function getDimensionValue(
    view:
        InsuranceAttributedRelationshipEconomicsView,
    dimension:
        InsuranceAcquisitionAggregateDimension
): string | undefined {
    const presentation =
        view.presentation;

    if(presentation === undefined){
        return undefined;
    }

    const presentationRelationshipId =
        requireRiverCrmRelationshipId(
            presentation.relationshipId
        );

    if(
        presentationRelationshipId !==
        view.relationshipId
    ){
        throw new TypeError(
            "Insurance acquisition dimension outcome analytics requires presentation relationship identity to match its attributed view."
        );
    }

    switch(dimension){
        case "acquisitionSource":
            return presentation.acquisitionSource;

        case "sourceVendor":
            return presentation.sourceVendor;

        case "campaign":
            return presentation.campaign;

        case "productInterest":
            return presentation.productInterest;

        case "state":
            return presentation.state;

        case "quoteStatus":
            return presentation.quoteStatus;

        case "assignedProducer":
            return presentation.assignedProducer;
    }
}


function bucketKey(
    dimensionValue:
        string | undefined
): string {
    return dimensionValue === undefined
        ? "0:"
        : `1:${dimensionValue}`;
}


function compareOptionalStrings(
    left:
        string | undefined,
    right:
        string | undefined
): number {
    if(left === right){
        return 0;
    }

    if(left === undefined){
        return 1;
    }

    if(right === undefined){
        return -1;
    }

    return left < right
        ? -1
        : 1;
}


export function createInsuranceAcquisitionDimensionOutcomeAnalytics(
    input:
        CreateInsuranceAcquisitionDimensionOutcomeAnalyticsInput
): InsuranceAcquisitionDimensionOutcomeAnalytics {
    const dimension =
        requireDimension(
            input.dimension
        );

    const relationshipIds =
        canonicalRelationshipIds(
            input.relationshipIds
        );

    const requested =
        new Set<
            RiverCrmRelationshipId
        >(
            relationshipIds
        );

    const globalOutcomeAnalytics =
        createInsuranceAcquisitionOutcomeAnalytics({
            relationshipIds,
            outcomeFacts:
                input.outcomeFacts
        });

    const seenViews =
        new Set<
            RiverCrmRelationshipId
        >();

    const buckets =
        new Map<
            string,
            MutableBucket
        >();

    for(const view of input.views){
        const relationshipId =
            requireRiverCrmRelationshipId(
                view.relationshipId
            );

        if(!requested.has(relationshipId)){
            throw new TypeError(
                "Insurance acquisition dimension outcome analytics received an attributed view outside the explicit cohort."
            );
        }

        if(seenViews.has(relationshipId)){
            throw new TypeError(
                "Insurance acquisition dimension outcome analytics requires at most one attributed view per cohort relationship."
            );
        }

        seenViews.add(
            relationshipId
        );

        const dimensionValue =
            getDimensionValue(
                view,
                dimension
            );

        const key =
            bucketKey(
                dimensionValue
            );

        let bucket =
            buckets.get(
                key
            );

        if(bucket === undefined){
            bucket = {
                ...(dimensionValue !== undefined
                    ? {
                        dimensionValue
                    }
                    : {}),

                relationshipIds:
                    []
            };

            buckets.set(
                key,
                bucket
            );
        }

        bucket.relationshipIds.push(
            relationshipId
        );
    }

    if(
        seenViews.size !==
        relationshipIds.length
    ){
        throw new RangeError(
            "Insurance acquisition dimension outcome analytics requires one attributed view for every canonical cohort relationship."
        );
    }

    const factsByRelationship =
        new Map<
            RiverCrmRelationshipId,
            InsuranceAcquisitionOutcomeFact[]
        >();

    for(const fact of input.outcomeFacts){
        const relationshipId =
            requireRiverCrmRelationshipId(
                fact.relationshipId
            );

        const existing =
            factsByRelationship.get(
                relationshipId
            );

        if(existing !== undefined){
            existing.push(
                fact
            );
        }
        else{
            factsByRelationship.set(
                relationshipId,
                [
                    fact
                ]
            );
        }
    }

    const projectedBuckets =
        [...buckets.values()]
            .sort(
                (
                    left,
                    right
                ) =>
                    compareOptionalStrings(
                        left.dimensionValue,
                        right.dimensionValue
                    )
            )
            .map(
                bucket => {
                    const bucketFacts:
                        InsuranceAcquisitionOutcomeFact[] = [];

                    for(
                        const relationshipId
                        of bucket.relationshipIds
                    ){
                        const facts =
                            factsByRelationship.get(
                                relationshipId
                            );

                        if(facts !== undefined){
                            bucketFacts.push(
                                ...facts
                            );
                        }
                    }

                    const analytics =
                        createInsuranceAcquisitionOutcomeAnalytics({
                            relationshipIds:
                                bucket.relationshipIds,

                            outcomeFacts:
                                bucketFacts
                        });

                    const rates =
                        createInsuranceAcquisitionOutcomeRates(
                            analytics
                        );

                    return {
                        ...(bucket.dimensionValue !== undefined
                            ? {
                                dimensionValue:
                                    bucket.dimensionValue
                            }
                            : {}),

                        relationshipCount:
                            analytics.relationshipCount,

                        quotedRelationshipCount:
                            analytics.quotedRelationshipCount,

                        boundRelationshipCount:
                            analytics.boundRelationshipCount,

                        outcomeFactCount:
                            analytics.outcomeFactCount,

                        quotedOutcomeFactCount:
                            analytics.quotedOutcomeFactCount,

                        boundOutcomeFactCount:
                            analytics.boundOutcomeFactCount,

                        ...(rates.quoteRate !== undefined
                            ? {
                                quoteRate:
                                    rates.quoteRate
                            }
                            : {}),

                        ...(rates.bindRate !== undefined
                            ? {
                                bindRate:
                                    rates.bindRate
                            }
                            : {})
                    };
                }
            );

    return {
        projectionVersion:
            INSURANCE_ACQUISITION_DIMENSION_OUTCOME_ANALYTICS_VERSION,

        dimension,

        relationshipCount:
            globalOutcomeAnalytics.relationshipCount,

        buckets:
            projectedBuckets
    };
}
