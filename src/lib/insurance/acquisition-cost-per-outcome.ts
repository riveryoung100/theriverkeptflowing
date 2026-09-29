import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import {
    INSURANCE_ACQUISITION_ANALYTICS_PROJECTION_VERSION
} from "./acquisition-analytics";

import type {
    InsuranceAcquisitionOutcomeAnalytics
} from "./acquisition-outcome-analytics";

import {
    createInsuranceAcquisitionOutcomeRates
} from "./acquisition-outcome-rates";

import type {
    InsuranceAttributedRelationshipEconomicsView
} from "./d1-acquisition-economics-view";


export const INSURANCE_ACQUISITION_COST_PER_OUTCOME_VERSION =
    "insurance-acquisition-cost-per-outcome-v1" as const;


export interface InsuranceAcquisitionMoneyPerOutcome {
    readonly numeratorMinorUnits:
        number;

    readonly denominatorCount:
        number;
}


export interface InsuranceAcquisitionCostPerOutcomeCurrency {
    readonly currency:
        string;

    readonly acquisitionCostMinorUnits:
        number;

    readonly costPerQuote?:
        InsuranceAcquisitionMoneyPerOutcome;

    readonly costPerBind?:
        InsuranceAcquisitionMoneyPerOutcome;
}


export interface InsuranceAcquisitionCostPerOutcome {
    readonly projectionVersion:
        typeof INSURANCE_ACQUISITION_COST_PER_OUTCOME_VERSION;

    readonly relationshipCount:
        number;

    readonly quotedRelationshipCount:
        number;

    readonly boundRelationshipCount:
        number;

    readonly currencies:
        readonly InsuranceAcquisitionCostPerOutcomeCurrency[];
}


export interface CreateInsuranceAcquisitionCostPerOutcomeInput {
    readonly relationshipIds:
        readonly RiverCrmRelationshipId[];

    readonly views:
        readonly InsuranceAttributedRelationshipEconomicsView[];

    readonly outcomeAnalytics:
        InsuranceAcquisitionOutcomeAnalytics;
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


function requireSafeNonNegativeMinorUnits(
    value:
        unknown
): number {
    if(
        typeof value !== "number" ||
        !Number.isSafeInteger(
            value
        ) ||
        value < 0
    ){
        throw new TypeError(
            "Insurance acquisition cost per outcome requires acquisitionCostMinorUnits to be a safe non-negative integer."
        );
    }

    return value;
}


function checkedAdd(
    left:
        number,
    right:
        number
): number {
    const result =
        left +
        right;

    if(
        !Number.isSafeInteger(
            result
        ) ||
        result < 0
    ){
        throw new RangeError(
            "Insurance acquisition cost per outcome exceeded safe integer range."
        );
    }

    return result;
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


export function createInsuranceAcquisitionCostPerOutcome(
    input:
        CreateInsuranceAcquisitionCostPerOutcomeInput
): InsuranceAcquisitionCostPerOutcome {
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

    const outcomeRates =
        createInsuranceAcquisitionOutcomeRates(
            input.outcomeAnalytics
        );

    if(
        outcomeRates.relationshipCount !==
        relationshipIds.length
    ){
        throw new RangeError(
            "Insurance acquisition cost per outcome requires outcome analytics relationshipCount to equal the explicit cohort size."
        );
    }

    const seenViews =
        new Set<
            RiverCrmRelationshipId
        >();

    const currencyTotals =
        new Map<
            string,
            number
        >();

    for(const view of input.views){
        const relationshipId =
            requireRiverCrmRelationshipId(
                view.relationshipId
            );

        if(!requested.has(relationshipId)){
            throw new TypeError(
                "Insurance acquisition cost per outcome received an economics view outside the explicit cohort."
            );
        }

        if(seenViews.has(relationshipId)){
            throw new TypeError(
                "Insurance acquisition cost per outcome requires at most one economics view per cohort relationship."
            );
        }

        seenViews.add(
            relationshipId
        );

        if(
            view.analytics.projectionVersion !==
            INSURANCE_ACQUISITION_ANALYTICS_PROJECTION_VERSION
        ){
            throw new TypeError(
                "Insurance acquisition cost per outcome requires canonical relationship acquisition analytics."
            );
        }

        const analyticsRelationshipId =
            requireRiverCrmRelationshipId(
                view.analytics.relationshipId
            );

        if(
            analyticsRelationshipId !==
            relationshipId
        ){
            throw new TypeError(
                "Insurance acquisition cost per outcome requires analytics relationship identity to match the attributed view."
            );
        }

        for(const currency of view.analytics.currencies){
            const acquisitionCostMinorUnits =
                requireSafeNonNegativeMinorUnits(
                    currency.acquisitionCostMinorUnits
                );

            const existing =
                currencyTotals.get(
                    currency.currency
                ) ?? 0;

            currencyTotals.set(
                currency.currency,
                checkedAdd(
                    existing,
                    acquisitionCostMinorUnits
                )
            );
        }
    }

    if(
        seenViews.size !==
        relationshipIds.length
    ){
        throw new RangeError(
            "Insurance acquisition cost per outcome requires one economics view for every canonical cohort relationship."
        );
    }

    const currencies =
        [...currencyTotals.entries()]
            .sort(
                (
                    [left],
                    [right]
                ) =>
                    left < right
                        ? -1
                        : left > right
                            ? 1
                            : 0
            )
            .map(
                (
                    [
                        currency,
                        acquisitionCostMinorUnits
                    ]
                ) => {
                    const costPerQuote =
                        exactMoneyPerOutcome(
                            acquisitionCostMinorUnits,
                            outcomeRates.quotedRelationshipCount
                        );

                    const costPerBind =
                        exactMoneyPerOutcome(
                            acquisitionCostMinorUnits,
                            outcomeRates.boundRelationshipCount
                        );

                    return {
                        currency,

                        acquisitionCostMinorUnits,

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
        projectionVersion:
            INSURANCE_ACQUISITION_COST_PER_OUTCOME_VERSION,

        relationshipCount:
            outcomeRates.relationshipCount,

        quotedRelationshipCount:
            outcomeRates.quotedRelationshipCount,

        boundRelationshipCount:
            outcomeRates.boundRelationshipCount,

        currencies
    };
}
