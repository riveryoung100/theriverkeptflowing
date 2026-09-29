import {
    INSURANCE_ACQUISITION_OUTCOME_ANALYTICS_VERSION
} from "./acquisition-outcome-analytics";

import type {
    InsuranceAcquisitionOutcomeAnalytics
} from "./acquisition-outcome-analytics";


export const INSURANCE_ACQUISITION_OUTCOME_RATES_VERSION =
    "insurance-acquisition-outcome-rates-v1" as const;


export interface InsuranceAcquisitionOutcomeRate {
    readonly numerator:
        number;

    readonly denominator:
        number;
}


export interface InsuranceAcquisitionOutcomeRates {
    readonly projectionVersion:
        typeof INSURANCE_ACQUISITION_OUTCOME_RATES_VERSION;

    readonly relationshipCount:
        number;

    readonly quotedRelationshipCount:
        number;

    readonly boundRelationshipCount:
        number;

    readonly quoteRate?:
        InsuranceAcquisitionOutcomeRate;

    readonly bindRate?:
        InsuranceAcquisitionOutcomeRate;
}


function requireSafeNonNegativeInteger(
    value:
        unknown,
    field:
        string
): number {
    if(
        typeof value !== "number" ||
        !Number.isSafeInteger(
            value
        ) ||
        value < 0
    ){
        throw new TypeError(
            `Insurance acquisition outcome rates require ${field} to be a safe non-negative integer.`
        );
    }

    return value;
}


function exactRate(
    numerator:
        number,
    denominator:
        number
): InsuranceAcquisitionOutcomeRate | undefined {
    if(denominator === 0){
        return undefined;
    }

    return {
        numerator,
        denominator
    };
}


export function createInsuranceAcquisitionOutcomeRates(
    analytics:
        InsuranceAcquisitionOutcomeAnalytics
): InsuranceAcquisitionOutcomeRates {
    if(
        analytics.projectionVersion !==
        INSURANCE_ACQUISITION_OUTCOME_ANALYTICS_VERSION
    ){
        throw new TypeError(
            "Insurance acquisition outcome rates require canonical outcome analytics."
        );
    }

    const relationshipCount =
        requireSafeNonNegativeInteger(
            analytics.relationshipCount,
            "relationshipCount"
        );

    const quotedRelationshipCount =
        requireSafeNonNegativeInteger(
            analytics.quotedRelationshipCount,
            "quotedRelationshipCount"
        );

    const boundRelationshipCount =
        requireSafeNonNegativeInteger(
            analytics.boundRelationshipCount,
            "boundRelationshipCount"
        );

    if(
        quotedRelationshipCount >
        relationshipCount
    ){
        throw new RangeError(
            "Insurance acquisition outcome rates require quotedRelationshipCount not to exceed relationshipCount."
        );
    }

    if(
        boundRelationshipCount >
        relationshipCount
    ){
        throw new RangeError(
            "Insurance acquisition outcome rates require boundRelationshipCount not to exceed relationshipCount."
        );
    }

    const quoteRate =
        exactRate(
            quotedRelationshipCount,
            relationshipCount
        );

    const bindRate =
        exactRate(
            boundRelationshipCount,
            relationshipCount
        );

    return {
        projectionVersion:
            INSURANCE_ACQUISITION_OUTCOME_RATES_VERSION,

        relationshipCount,

        quotedRelationshipCount,

        boundRelationshipCount,

        ...(quoteRate !== undefined
            ? {
                quoteRate
            }
            : {}),

        ...(bindRate !== undefined
            ? {
                bindRate
            }
            : {})
    };
}
