import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import {
    createInsuranceAcquisitionOutcomeFact
} from "./acquisition-outcomes";

import type {
    InsuranceAcquisitionOutcomeFact
} from "./acquisition-outcomes";


export const INSURANCE_ACQUISITION_OUTCOME_ANALYTICS_VERSION =
    "insurance-acquisition-outcome-analytics-v1" as const;


export interface CreateInsuranceAcquisitionOutcomeAnalyticsInput {
    readonly relationshipIds:
        readonly RiverCrmRelationshipId[];

    readonly outcomeFacts:
        readonly InsuranceAcquisitionOutcomeFact[];
}


export interface InsuranceAcquisitionOutcomeAnalytics {
    readonly projectionVersion:
        typeof INSURANCE_ACQUISITION_OUTCOME_ANALYTICS_VERSION;

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
}


function canonicalRelationshipIds(
    rawRelationshipIds:
        readonly RiverCrmRelationshipId[]
): readonly RiverCrmRelationshipId[] {
    const result:
        RiverCrmRelationshipId[] = [];

    const seen =
        new Set<
            RiverCrmRelationshipId
        >();

    for(const rawRelationshipId of rawRelationshipIds){
        const relationshipId =
            requireRiverCrmRelationshipId(
                rawRelationshipId
            );

        if(!seen.has(relationshipId)){
            seen.add(
                relationshipId
            );

            result.push(
                relationshipId
            );
        }
    }

    return result;
}


function checkedIncrement(
    value:
        number,
    field:
        string
): number {
    if(
        !Number.isSafeInteger(
            value
        ) ||
        value < 0
    ){
        throw new RangeError(
            `Insurance acquisition outcome analytics ${field} is not a safe non-negative integer.`
        );
    }

    const next =
        value + 1;

    if(
        !Number.isSafeInteger(
            next
        )
    ){
        throw new RangeError(
            `Insurance acquisition outcome analytics ${field} exceeded safe integer range.`
        );
    }

    return next;
}


export function createInsuranceAcquisitionOutcomeAnalytics(
    input:
        CreateInsuranceAcquisitionOutcomeAnalyticsInput
): InsuranceAcquisitionOutcomeAnalytics {
    const relationshipIds =
        canonicalRelationshipIds(
            input.relationshipIds
        );

    const cohort =
        new Set<
            RiverCrmRelationshipId
        >(
            relationshipIds
        );

    const outcomeFactIds =
        new Set<
            string
        >();

    const quotedRelationships =
        new Set<
            RiverCrmRelationshipId
        >();

    const boundRelationships =
        new Set<
            RiverCrmRelationshipId
        >();

    let outcomeFactCount =
        0;

    let quotedOutcomeFactCount =
        0;

    let boundOutcomeFactCount =
        0;

    for(const rawFact of input.outcomeFacts){
        const fact =
            createInsuranceAcquisitionOutcomeFact(
                rawFact
            );

        if(
            !cohort.has(
                fact.relationshipId
            )
        ){
            throw new TypeError(
                "Insurance acquisition outcome fact relationship is outside the explicit analytics cohort."
            );
        }

        if(
            outcomeFactIds.has(
                fact.outcomeFactId
            )
        ){
            throw new TypeError(
                "Insurance acquisition outcome analytics requires unique outcomeFactId values."
            );
        }

        outcomeFactIds.add(
            fact.outcomeFactId
        );

        outcomeFactCount =
            checkedIncrement(
                outcomeFactCount,
                "outcomeFactCount"
            );

        if(fact.kind === "quoted"){
            quotedOutcomeFactCount =
                checkedIncrement(
                    quotedOutcomeFactCount,
                    "quotedOutcomeFactCount"
                );

            quotedRelationships.add(
                fact.relationshipId
            );
        }
        else {
            boundOutcomeFactCount =
                checkedIncrement(
                    boundOutcomeFactCount,
                    "boundOutcomeFactCount"
                );

            boundRelationships.add(
                fact.relationshipId
            );
        }
    }

    return {
        projectionVersion:
            INSURANCE_ACQUISITION_OUTCOME_ANALYTICS_VERSION,

        relationshipCount:
            relationshipIds.length,

        quotedRelationshipCount:
            quotedRelationships.size,

        boundRelationshipCount:
            boundRelationships.size,

        outcomeFactCount,

        quotedOutcomeFactCount,

        boundOutcomeFactCount
    };
}
