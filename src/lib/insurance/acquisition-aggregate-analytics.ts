import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import type {
    InsuranceAttributedRelationshipEconomicsView
} from "./d1-acquisition-economics-view";


export const INSURANCE_ACQUISITION_AGGREGATE_PROJECTION_VERSION =
    "insurance-acquisition-aggregate-v1" as const;


export const INSURANCE_ACQUISITION_AGGREGATE_DIMENSIONS = [
    "acquisitionSource",
    "sourceVendor",
    "campaign",
    "productInterest",
    "state",
    "quoteStatus",
    "assignedProducer"
] as const;


export type InsuranceAcquisitionAggregateDimension =
    typeof INSURANCE_ACQUISITION_AGGREGATE_DIMENSIONS[number];


export interface InsuranceAcquisitionAggregateCurrencyProjection {
    readonly currency:
        string;

    readonly acquisitionCostMinorUnits:
        number;

    readonly quotedPremiumMinorUnits:
        number;

    readonly writtenPremiumMinorUnits:
        number;

    readonly renewalPremiumMinorUnits:
        number;

    readonly earnedCommissionMinorUnits:
        number;

    readonly paidCommissionMinorUnits:
        number;

    readonly chargebackMinorUnits:
        number;

    readonly adjustmentMinorUnits:
        number;

    readonly realizedCommissionMinorUnits:
        number;

    readonly contributionMarginMinorUnits:
        number;
}


export interface InsuranceAcquisitionAggregateBucket {
    readonly dimensionValue?:
        string;

    readonly relationshipCount:
        number;

    readonly currencies:
        readonly InsuranceAcquisitionAggregateCurrencyProjection[];
}


export interface InsuranceAcquisitionAggregateAnalytics {
    readonly projectionVersion:
        typeof INSURANCE_ACQUISITION_AGGREGATE_PROJECTION_VERSION;

    readonly dimension:
        InsuranceAcquisitionAggregateDimension;

    readonly relationshipCount:
        number;

    readonly buckets:
        readonly InsuranceAcquisitionAggregateBucket[];
}


export interface CreateInsuranceAcquisitionAggregateAnalyticsInput {
    readonly dimension:
        InsuranceAcquisitionAggregateDimension;

    readonly views:
        readonly InsuranceAttributedRelationshipEconomicsView[];
}


interface MutableCurrencyProjection {
    currency:
        string;

    acquisitionCostMinorUnits:
        number;

    quotedPremiumMinorUnits:
        number;

    writtenPremiumMinorUnits:
        number;

    renewalPremiumMinorUnits:
        number;

    earnedCommissionMinorUnits:
        number;

    paidCommissionMinorUnits:
        number;

    chargebackMinorUnits:
        number;

    adjustmentMinorUnits:
        number;

    realizedCommissionMinorUnits:
        number;

    contributionMarginMinorUnits:
        number;
}


interface MutableBucket {
    readonly dimensionValue?:
        string;

    relationshipCount:
        number;

    readonly currencies:
        Map<
            string,
            MutableCurrencyProjection
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
            "Insurance acquisition aggregate dimension is not supported."
        );
    }

    return value;
}


function checkedAdd(
    left:
        number,
    right:
        number,
    label:
        string
): number {
    if(
        !Number.isSafeInteger(left) ||
        !Number.isSafeInteger(right)
    ){
        throw new TypeError(
            `${label} requires safe integer minor units.`
        );
    }

    const result =
        left + right;

    if(!Number.isSafeInteger(result)){
        throw new RangeError(
            `${label} exceeds safe integer range.`
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


function createEmptyCurrencyProjection(
    currency:
        string
): MutableCurrencyProjection {
    return {
        currency,
        acquisitionCostMinorUnits:
            0,
        quotedPremiumMinorUnits:
            0,
        writtenPremiumMinorUnits:
            0,
        renewalPremiumMinorUnits:
            0,
        earnedCommissionMinorUnits:
            0,
        paidCommissionMinorUnits:
            0,
        chargebackMinorUnits:
            0,
        adjustmentMinorUnits:
            0,
        realizedCommissionMinorUnits:
            0,
        contributionMarginMinorUnits:
            0
    };
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

    if(left < right){
        return -1;
    }

    return 1;
}


export function createInsuranceAcquisitionAggregateAnalytics(
    input:
        CreateInsuranceAcquisitionAggregateAnalyticsInput
): InsuranceAcquisitionAggregateAnalytics {
    const dimension =
        requireDimension(
            input.dimension
        );

    const relationshipIds =
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

        if(relationshipIds.has(relationshipId)){
            throw new TypeError(
                "Insurance acquisition aggregate contains duplicate relationshipId."
            );
        }

        relationshipIds.add(
            relationshipId
        );

        if(
            view.analytics.relationshipId !==
            relationshipId
        ){
            throw new TypeError(
                "Insurance acquisition aggregate analytics relationship mismatch."
            );
        }

        if(
            view.presentation !== undefined &&
            view.presentation.relationshipId !==
            relationshipId
        ){
            throw new TypeError(
                "Insurance acquisition aggregate presentation relationship mismatch."
            );
        }

        const dimensionValue =
            getDimensionValue(
                view,
                dimension
            );

        const bucketKey =
            dimensionValue === undefined
                ? "\u0000"
                : `\u0001${dimensionValue}`;

        let bucket =
            buckets.get(
                bucketKey
            );

        if(bucket === undefined){
            bucket = {
                ...(dimensionValue !== undefined
                    ? {
                        dimensionValue
                    }
                    : {}),
                relationshipCount:
                    0,
                currencies:
                    new Map()
            };

            buckets.set(
                bucketKey,
                bucket
            );
        }

        bucket.relationshipCount =
            checkedAdd(
                bucket.relationshipCount,
                1,
                "relationship count"
            );

        for(const currency of view.analytics.currencies){
            let aggregate =
                bucket.currencies.get(
                    currency.currency
                );

            if(aggregate === undefined){
                aggregate =
                    createEmptyCurrencyProjection(
                        currency.currency
                    );

                bucket.currencies.set(
                    currency.currency,
                    aggregate
                );
            }

            aggregate.acquisitionCostMinorUnits =
                checkedAdd(
                    aggregate.acquisitionCostMinorUnits,
                    currency.acquisitionCostMinorUnits,
                    "acquisition cost"
                );

            aggregate.quotedPremiumMinorUnits =
                checkedAdd(
                    aggregate.quotedPremiumMinorUnits,
                    currency.quotedPremiumMinorUnits,
                    "quoted premium"
                );

            aggregate.writtenPremiumMinorUnits =
                checkedAdd(
                    aggregate.writtenPremiumMinorUnits,
                    currency.writtenPremiumMinorUnits,
                    "written premium"
                );

            aggregate.renewalPremiumMinorUnits =
                checkedAdd(
                    aggregate.renewalPremiumMinorUnits,
                    currency.renewalPremiumMinorUnits,
                    "renewal premium"
                );

            aggregate.earnedCommissionMinorUnits =
                checkedAdd(
                    aggregate.earnedCommissionMinorUnits,
                    currency.earnedCommissionMinorUnits,
                    "earned commission"
                );

            aggregate.paidCommissionMinorUnits =
                checkedAdd(
                    aggregate.paidCommissionMinorUnits,
                    currency.paidCommissionMinorUnits,
                    "paid commission"
                );

            aggregate.chargebackMinorUnits =
                checkedAdd(
                    aggregate.chargebackMinorUnits,
                    currency.chargebackMinorUnits,
                    "chargeback"
                );

            aggregate.adjustmentMinorUnits =
                checkedAdd(
                    aggregate.adjustmentMinorUnits,
                    currency.adjustmentMinorUnits,
                    "adjustment"
                );

            aggregate.realizedCommissionMinorUnits =
                checkedAdd(
                    aggregate.realizedCommissionMinorUnits,
                    currency.realizedCommissionMinorUnits,
                    "realized commission"
                );

            aggregate.contributionMarginMinorUnits =
                checkedAdd(
                    aggregate.contributionMarginMinorUnits,
                    currency.contributionMarginMinorUnits,
                    "contribution margin"
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
                bucket => ({
                    ...(bucket.dimensionValue !== undefined
                        ? {
                            dimensionValue:
                                bucket.dimensionValue
                        }
                        : {}),

                    relationshipCount:
                        bucket.relationshipCount,

                    currencies:
                        [...bucket.currencies.values()]
                            .sort(
                                (
                                    left,
                                    right
                                ) =>
                                    left.currency < right.currency
                                        ? -1
                                        : left.currency > right.currency
                                            ? 1
                                            : 0
                            )
                            .map(
                                currency => ({
                                    ...currency
                                })
                            )
                })
            );

    return {
        projectionVersion:
            INSURANCE_ACQUISITION_AGGREGATE_PROJECTION_VERSION,

        dimension,

        relationshipCount:
            relationshipIds.size,

        buckets:
            projectedBuckets
    };
}
