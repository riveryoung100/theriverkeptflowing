import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import {
    createInsuranceAcquisitionCostFact,
    createInsuranceCommissionFact,
    createInsurancePremiumFact,
    createInsuranceRenewalFact
} from "./acquisition-economics";

import type {
    InsuranceAcquisitionCostFact,
    InsuranceCommissionFact,
    InsurancePremiumFact,
    InsuranceRenewalFact,
    InsuranceRenewalKind
} from "./acquisition-economics";


export const INSURANCE_ACQUISITION_ANALYTICS_PROJECTION_VERSION =
    "insurance-acquisition-economics-v1" as const;


export interface InsuranceAcquisitionAnalyticsCurrencyProjection {
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

    readonly acquisitionCostFactCount:
        number;

    readonly premiumFactCount:
        number;

    readonly commissionFactCount:
        number;
}


export interface InsuranceLatestRenewalProjection {
    readonly renewalFactId:
        string;

    readonly kind:
        InsuranceRenewalKind;

    readonly occurredAt:
        string;

    readonly effectiveAt?:
        string;
}


export interface InsuranceRelationshipAcquisitionAnalytics {
    readonly projectionVersion:
        typeof INSURANCE_ACQUISITION_ANALYTICS_PROJECTION_VERSION;

    readonly relationshipId:
        RiverCrmRelationshipId;

    readonly currencies:
        readonly InsuranceAcquisitionAnalyticsCurrencyProjection[];

    readonly renewalFactCount:
        number;

    readonly latestRenewal?:
        InsuranceLatestRenewalProjection;
}


export interface CreateInsuranceRelationshipAcquisitionAnalyticsInput {
    readonly relationshipId:
        unknown;

    readonly acquisitionCosts?:
        readonly InsuranceAcquisitionCostFact[];

    readonly premiumFacts?:
        readonly InsurancePremiumFact[];

    readonly commissionFacts?:
        readonly InsuranceCommissionFact[];

    readonly renewalFacts?:
        readonly InsuranceRenewalFact[];
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

    acquisitionCostFactCount:
        number;

    premiumFactCount:
        number;

    commissionFactCount:
        number;
}


function requireMatchingRelationship(
    expected:
        RiverCrmRelationshipId,
    actual:
        RiverCrmRelationshipId,
    factType:
        string
): void {
    if(actual !== expected){
        throw new TypeError(
            `Insurance acquisition analytics requires every ${factType} fact to belong to ${expected}.`
        );
    }
}


function requireUniqueFactId(
    seen:
        Set<string>,
    factId:
        string,
    factType:
        string
): void {
    if(seen.has(factId)){
        throw new TypeError(
            `Insurance acquisition analytics rejects duplicate ${factType} fact identity ${factId}.`
        );
    }

    seen.add(
        factId
    );
}


function getCurrencyProjection(
    projections:
        Map<
            string,
            MutableCurrencyProjection
        >,
    currency:
        string
): MutableCurrencyProjection {
    const existing =
        projections.get(
            currency
        );

    if(existing !== undefined){
        return existing;
    }

    const created:
        MutableCurrencyProjection = {
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

            acquisitionCostFactCount:
                0,

            premiumFactCount:
                0,

            commissionFactCount:
                0
        };

    projections.set(
        currency,
        created
    );

    return created;
}


function safeAdd(
    current:
        number,
    amount:
        number,
    field:
        string
): number {
    const result =
        current + amount;

    if(!Number.isSafeInteger(result)){
        throw new RangeError(
            `Insurance acquisition analytics overflowed ${field}.`
        );
    }

    return result;
}


function compareRenewals(
    left:
        InsuranceRenewalFact,
    right:
        InsuranceRenewalFact
): number {
    const leftTime =
        Date.parse(
            left.occurredAt
        );

    const rightTime =
        Date.parse(
            right.occurredAt
        );

    if(leftTime !== rightTime){
        return rightTime - leftTime;
    }

    return String(
        right.renewalFactId
    ).localeCompare(
        String(
            left.renewalFactId
        )
    );
}


export function createInsuranceRelationshipAcquisitionAnalytics(
    input:
        CreateInsuranceRelationshipAcquisitionAnalyticsInput
): InsuranceRelationshipAcquisitionAnalytics {
    const relationshipId =
        requireRiverCrmRelationshipId(
            input.relationshipId
        );

    const projections =
        new Map<
            string,
            MutableCurrencyProjection
        >();

    const acquisitionCostIds =
        new Set<string>();

    const premiumFactIds =
        new Set<string>();

    const commissionFactIds =
        new Set<string>();

    const renewalFactIds =
        new Set<string>();

    for(const rawFact of input.acquisitionCosts ?? []){
        const fact =
            createInsuranceAcquisitionCostFact(
                rawFact
            );

        requireMatchingRelationship(
            relationshipId,
            fact.relationshipId,
            "acquisition-cost"
        );

        requireUniqueFactId(
            acquisitionCostIds,
            fact.costId,
            "acquisition-cost"
        );

        const projection =
            getCurrencyProjection(
                projections,
                fact.money.currency
            );

        projection.acquisitionCostMinorUnits =
            safeAdd(
                projection.acquisitionCostMinorUnits,
                fact.money.amountMinorUnits,
                "acquisition cost"
            );

        projection.acquisitionCostFactCount +=
            1;
    }


    for(const rawFact of input.premiumFacts ?? []){
        const fact =
            createInsurancePremiumFact(
                rawFact
            );

        requireMatchingRelationship(
            relationshipId,
            fact.relationshipId,
            "premium"
        );

        requireUniqueFactId(
            premiumFactIds,
            fact.premiumFactId,
            "premium"
        );

        const projection =
            getCurrencyProjection(
                projections,
                fact.money.currency
            );

        if(fact.kind === "quoted"){
            projection.quotedPremiumMinorUnits =
                safeAdd(
                    projection.quotedPremiumMinorUnits,
                    fact.money.amountMinorUnits,
                    "quoted premium"
                );
        }
        else if(fact.kind === "written"){
            projection.writtenPremiumMinorUnits =
                safeAdd(
                    projection.writtenPremiumMinorUnits,
                    fact.money.amountMinorUnits,
                    "written premium"
                );
        }
        else {
            projection.renewalPremiumMinorUnits =
                safeAdd(
                    projection.renewalPremiumMinorUnits,
                    fact.money.amountMinorUnits,
                    "renewal premium"
                );
        }

        projection.premiumFactCount +=
            1;
    }


    for(const rawFact of input.commissionFacts ?? []){
        const fact =
            createInsuranceCommissionFact(
                rawFact
            );

        requireMatchingRelationship(
            relationshipId,
            fact.relationshipId,
            "commission"
        );

        requireUniqueFactId(
            commissionFactIds,
            fact.commissionFactId,
            "commission"
        );

        const projection =
            getCurrencyProjection(
                projections,
                fact.money.currency
            );

        if(fact.kind === "earned"){
            projection.earnedCommissionMinorUnits =
                safeAdd(
                    projection.earnedCommissionMinorUnits,
                    fact.money.amountMinorUnits,
                    "earned commission"
                );
        }
        else if(fact.kind === "paid"){
            projection.paidCommissionMinorUnits =
                safeAdd(
                    projection.paidCommissionMinorUnits,
                    fact.money.amountMinorUnits,
                    "paid commission"
                );
        }
        else if(fact.kind === "chargeback"){
            projection.chargebackMinorUnits =
                safeAdd(
                    projection.chargebackMinorUnits,
                    fact.money.amountMinorUnits,
                    "chargeback"
                );
        }
        else {
            projection.adjustmentMinorUnits =
                safeAdd(
                    projection.adjustmentMinorUnits,
                    fact.money.amountMinorUnits,
                    "commission adjustment"
                );
        }

        projection.commissionFactCount +=
            1;
    }


    const canonicalRenewals =
        (input.renewalFacts ?? [])
            .map(
                rawFact =>
                    createInsuranceRenewalFact(
                        rawFact
                    )
            );

    for(const fact of canonicalRenewals){
        requireMatchingRelationship(
            relationshipId,
            fact.relationshipId,
            "renewal"
        );

        requireUniqueFactId(
            renewalFactIds,
            fact.renewalFactId,
            "renewal"
        );
    }


    const currencies =
        [...projections.values()]
            .sort(
                (
                    left,
                    right
                ) =>
                    left.currency.localeCompare(
                        right.currency
                    )
            )
            .map(
                projection => {
                    const realizedCommissionMinorUnits =
                        safeAdd(
                            safeAdd(
                                projection.paidCommissionMinorUnits,
                                projection.chargebackMinorUnits,
                                "realized commission"
                            ),
                            projection.adjustmentMinorUnits,
                            "realized commission"
                        );

                    const contributionMarginMinorUnits =
                        safeAdd(
                            realizedCommissionMinorUnits,
                            -projection.acquisitionCostMinorUnits,
                            "contribution margin"
                        );

                    return {
                        currency:
                            projection.currency,

                        acquisitionCostMinorUnits:
                            projection.acquisitionCostMinorUnits,

                        quotedPremiumMinorUnits:
                            projection.quotedPremiumMinorUnits,

                        writtenPremiumMinorUnits:
                            projection.writtenPremiumMinorUnits,

                        renewalPremiumMinorUnits:
                            projection.renewalPremiumMinorUnits,

                        earnedCommissionMinorUnits:
                            projection.earnedCommissionMinorUnits,

                        paidCommissionMinorUnits:
                            projection.paidCommissionMinorUnits,

                        chargebackMinorUnits:
                            projection.chargebackMinorUnits,

                        adjustmentMinorUnits:
                            projection.adjustmentMinorUnits,

                        realizedCommissionMinorUnits,

                        contributionMarginMinorUnits,

                        acquisitionCostFactCount:
                            projection.acquisitionCostFactCount,

                        premiumFactCount:
                            projection.premiumFactCount,

                        commissionFactCount:
                            projection.commissionFactCount
                    };
                }
            );


    const latestRenewal =
        canonicalRenewals.length === 0
            ? undefined
            : [...canonicalRenewals]
                .sort(
                    compareRenewals
                )[0];


    return {
        projectionVersion:
            INSURANCE_ACQUISITION_ANALYTICS_PROJECTION_VERSION,

        relationshipId,

        currencies,

        renewalFactCount:
            canonicalRenewals.length,

        ...(latestRenewal !== undefined
            ? {
                latestRenewal: {
                    renewalFactId:
                        latestRenewal.renewalFactId,

                    kind:
                        latestRenewal.kind,

                    occurredAt:
                        latestRenewal.occurredAt,

                    ...(latestRenewal.effectiveAt !== undefined
                        ? {
                            effectiveAt:
                                latestRenewal.effectiveAt
                        }
                        : {})
                }
            }
            : {})
    };
}
