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
    InsuranceAcquisitionAggregateCurrencyProjection
} from "./acquisition-aggregate-analytics";

import {
    createInsuranceAcquisitionCostPerOutcome
} from "./acquisition-cost-per-outcome";

import type {
    InsuranceAcquisitionCostPerOutcome
} from "./acquisition-cost-per-outcome";

import {
    createInsuranceAcquisitionReturnEfficiency
} from "./acquisition-return-efficiency";

import type {
    InsuranceAcquisitionReturnEfficiency
} from "./acquisition-return-efficiency";

import {
    createInsuranceAcquisitionOutcomeAnalytics
} from "./acquisition-outcome-analytics";

import type {
    InsuranceAcquisitionOutcomeAnalytics
} from "./acquisition-outcome-analytics";

import {
    createInsuranceAcquisitionOutcomeRates
} from "./acquisition-outcome-rates";

import type {
    InsuranceAcquisitionOutcomeRates
} from "./acquisition-outcome-rates";

import type {
    InsuranceAcquisitionOutcomeFact
} from "./acquisition-outcomes";

import type {
    InsuranceAttributedRelationshipEconomicsView
} from "./d1-acquisition-economics-view";


export const INSURANCE_ACQUISITION_OVERALL_PERFORMANCE_SUMMARY_VERSION =
    "insurance-acquisition-overall-performance-summary-v1" as const;


export interface CreateInsuranceAcquisitionOverallPerformanceSummaryInput {
    readonly relationshipIds:
        readonly RiverCrmRelationshipId[];

    readonly views:
        readonly InsuranceAttributedRelationshipEconomicsView[];

    readonly outcomeFacts:
        readonly InsuranceAcquisitionOutcomeFact[];
}


export interface InsuranceAcquisitionOverallPerformanceSummary {
    readonly projectionVersion:
        typeof INSURANCE_ACQUISITION_OVERALL_PERFORMANCE_SUMMARY_VERSION;

    readonly relationshipCount:
        number;

    readonly currencies:
        readonly InsuranceAcquisitionAggregateCurrencyProjection[];

    readonly outcomes:
        InsuranceAcquisitionOutcomeAnalytics;

    readonly rates:
        InsuranceAcquisitionOutcomeRates;

    readonly costPerOutcome:
        InsuranceAcquisitionCostPerOutcome;

    readonly returnEfficiency:
        InsuranceAcquisitionReturnEfficiency;
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


function requireSafeInteger(
    value:
        unknown,
    field:
        string
): number {
    if(
        typeof value !== "number" ||
        !Number.isSafeInteger(
            value
        )
    ){
        throw new TypeError(
            `Insurance acquisition overall performance summary requires ${field} to be a safe integer.`
        );
    }

    return value;
}


function checkedAdd(
    left:
        number,
    right:
        number,
    field:
        string
): number {
    const result =
        left +
        right;

    if(!Number.isSafeInteger(result)){
        throw new RangeError(
            `Insurance acquisition overall performance summary overflowed ${field}.`
        );
    }

    return result;
}


function requireCurrency(
    value:
        unknown
): string {
    if(
        typeof value !== "string" ||
        !/^[A-Z]{3}$/.test(value)
    ){
        throw new TypeError(
            "Insurance acquisition overall performance summary requires canonical uppercase three-letter currency codes."
        );
    }

    return value;
}


function createMutableCurrency(
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


export function createInsuranceAcquisitionOverallPerformanceSummary(
    input:
        CreateInsuranceAcquisitionOverallPerformanceSummaryInput
): InsuranceAcquisitionOverallPerformanceSummary {
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

    const seenViews =
        new Set<
            RiverCrmRelationshipId
        >();

    const currencyTotals =
        new Map<
            string,
            MutableCurrencyProjection
        >();

    for(const view of input.views){
        const relationshipId =
            requireRiverCrmRelationshipId(
                view.relationshipId
            );

        if(!requested.has(relationshipId)){
            throw new RangeError(
                "Insurance acquisition overall performance summary received an economics view outside the explicit cohort."
            );
        }

        if(seenViews.has(relationshipId)){
            throw new TypeError(
                "Insurance acquisition overall performance summary allows at most one economics view per relationship."
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
                "Insurance acquisition overall performance summary requires canonical relationship acquisition analytics."
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
                "Insurance acquisition overall performance summary requires analytics relationship identity to match its attributed view."
            );
        }

        const seenCurrencies =
            new Set<string>();

        for(const rawCurrency of view.analytics.currencies){
            const currency =
                requireCurrency(
                    rawCurrency.currency
                );

            if(seenCurrencies.has(currency)){
                throw new TypeError(
                    "Insurance acquisition overall performance summary requires unique currencies within each relationship analytics projection."
                );
            }

            seenCurrencies.add(
                currency
            );

            let total =
                currencyTotals.get(
                    currency
                );

            if(total === undefined){
                total =
                    createMutableCurrency(
                        currency
                    );

                currencyTotals.set(
                    currency,
                    total
                );
            }

            total.acquisitionCostMinorUnits =
                checkedAdd(
                    total.acquisitionCostMinorUnits,
                    requireSafeInteger(
                        rawCurrency.acquisitionCostMinorUnits,
                        "acquisitionCostMinorUnits"
                    ),
                    "acquisitionCostMinorUnits"
                );

            total.quotedPremiumMinorUnits =
                checkedAdd(
                    total.quotedPremiumMinorUnits,
                    requireSafeInteger(
                        rawCurrency.quotedPremiumMinorUnits,
                        "quotedPremiumMinorUnits"
                    ),
                    "quotedPremiumMinorUnits"
                );

            total.writtenPremiumMinorUnits =
                checkedAdd(
                    total.writtenPremiumMinorUnits,
                    requireSafeInteger(
                        rawCurrency.writtenPremiumMinorUnits,
                        "writtenPremiumMinorUnits"
                    ),
                    "writtenPremiumMinorUnits"
                );

            total.renewalPremiumMinorUnits =
                checkedAdd(
                    total.renewalPremiumMinorUnits,
                    requireSafeInteger(
                        rawCurrency.renewalPremiumMinorUnits,
                        "renewalPremiumMinorUnits"
                    ),
                    "renewalPremiumMinorUnits"
                );

            total.earnedCommissionMinorUnits =
                checkedAdd(
                    total.earnedCommissionMinorUnits,
                    requireSafeInteger(
                        rawCurrency.earnedCommissionMinorUnits,
                        "earnedCommissionMinorUnits"
                    ),
                    "earnedCommissionMinorUnits"
                );

            total.paidCommissionMinorUnits =
                checkedAdd(
                    total.paidCommissionMinorUnits,
                    requireSafeInteger(
                        rawCurrency.paidCommissionMinorUnits,
                        "paidCommissionMinorUnits"
                    ),
                    "paidCommissionMinorUnits"
                );

            total.chargebackMinorUnits =
                checkedAdd(
                    total.chargebackMinorUnits,
                    requireSafeInteger(
                        rawCurrency.chargebackMinorUnits,
                        "chargebackMinorUnits"
                    ),
                    "chargebackMinorUnits"
                );

            total.adjustmentMinorUnits =
                checkedAdd(
                    total.adjustmentMinorUnits,
                    requireSafeInteger(
                        rawCurrency.adjustmentMinorUnits,
                        "adjustmentMinorUnits"
                    ),
                    "adjustmentMinorUnits"
                );

            total.realizedCommissionMinorUnits =
                checkedAdd(
                    total.realizedCommissionMinorUnits,
                    requireSafeInteger(
                        rawCurrency.realizedCommissionMinorUnits,
                        "realizedCommissionMinorUnits"
                    ),
                    "realizedCommissionMinorUnits"
                );

            total.contributionMarginMinorUnits =
                checkedAdd(
                    total.contributionMarginMinorUnits,
                    requireSafeInteger(
                        rawCurrency.contributionMarginMinorUnits,
                        "contributionMarginMinorUnits"
                    ),
                    "contributionMarginMinorUnits"
                );
        }
    }

    if(
        seenViews.size !==
        relationshipIds.length
    ){
        throw new RangeError(
            "Insurance acquisition overall performance summary requires one economics view for every canonical cohort relationship."
        );
    }

    const currencies:
        InsuranceAcquisitionAggregateCurrencyProjection[] =
        [...currencyTotals.values()]
            .sort(
                (
                    left,
                    right
                ) =>
                    left.currency <
                    right.currency
                        ? -1
                        : left.currency >
                            right.currency
                            ? 1
                            : 0
            )
            .map(
                currency => ({
                    currency:
                        currency.currency,

                    acquisitionCostMinorUnits:
                        currency.acquisitionCostMinorUnits,

                    quotedPremiumMinorUnits:
                        currency.quotedPremiumMinorUnits,

                    writtenPremiumMinorUnits:
                        currency.writtenPremiumMinorUnits,

                    renewalPremiumMinorUnits:
                        currency.renewalPremiumMinorUnits,

                    earnedCommissionMinorUnits:
                        currency.earnedCommissionMinorUnits,

                    paidCommissionMinorUnits:
                        currency.paidCommissionMinorUnits,

                    chargebackMinorUnits:
                        currency.chargebackMinorUnits,

                    adjustmentMinorUnits:
                        currency.adjustmentMinorUnits,

                    realizedCommissionMinorUnits:
                        currency.realizedCommissionMinorUnits,

                    contributionMarginMinorUnits:
                        currency.contributionMarginMinorUnits
                })
            );

    const outcomes =
        createInsuranceAcquisitionOutcomeAnalytics({
            relationshipIds,

            outcomeFacts:
                input.outcomeFacts
        });

    const rates =
        createInsuranceAcquisitionOutcomeRates(
            outcomes
        );

    const costPerOutcome =
        createInsuranceAcquisitionCostPerOutcome({
            relationshipIds,

            views:
                input.views,

            outcomeAnalytics:
                outcomes
        });

    const returnEfficiency =
        createInsuranceAcquisitionReturnEfficiency({
            currencies
        });

    if(
        outcomes.relationshipCount !==
            relationshipIds.length ||
        rates.relationshipCount !==
            relationshipIds.length ||
        costPerOutcome.relationshipCount !==
            relationshipIds.length
    ){
        throw new RangeError(
            "Insurance acquisition overall performance summary requires one relationship denominator across all projection families."
        );
    }

    if(
        rates.quotedRelationshipCount !==
            outcomes.quotedRelationshipCount ||
        rates.boundRelationshipCount !==
            outcomes.boundRelationshipCount ||
        costPerOutcome.quotedRelationshipCount !==
            outcomes.quotedRelationshipCount ||
        costPerOutcome.boundRelationshipCount !==
            outcomes.boundRelationshipCount
    ){
        throw new RangeError(
            "Insurance acquisition overall performance summary requires matching durable outcome numerators across rate and cost projections."
        );
    }

    return {
        projectionVersion:
            INSURANCE_ACQUISITION_OVERALL_PERFORMANCE_SUMMARY_VERSION,

        relationshipCount:
            relationshipIds.length,

        currencies,

        outcomes,

        rates,

        costPerOutcome,

        returnEfficiency
    };
}
