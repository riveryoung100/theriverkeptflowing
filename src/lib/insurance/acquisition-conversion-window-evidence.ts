import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import type {
    InsuranceAcquisitionCostFact,
    InsuranceCommissionFact,
    InsurancePremiumFact,
    InsuranceRenewalFact
} from "./acquisition-economics";

import type {
    InsuranceAcquisitionOutcomeFact
} from "./acquisition-outcomes";


export const INSURANCE_ACQUISITION_CONVERSION_WINDOW_EVIDENCE_VERSION =
    "insurance-acquisition-conversion-window-evidence-v1" as const;


const MILLISECONDS_PER_DAY =
    86_400_000;


export interface InsuranceAcquisitionConversionWindowRelationship {
    readonly relationshipId:
        RiverCrmRelationshipId;

    readonly createdAt:
        string;
}


export interface InsuranceAcquisitionConversionWindowRelationshipWindow {
    readonly relationshipId:
        RiverCrmRelationshipId;

    readonly createdAt:
        string;

    readonly windowEndExclusive:
        string;
}


export interface CreateInsuranceAcquisitionConversionWindowEvidenceInput {
    readonly relationships:
        readonly InsuranceAcquisitionConversionWindowRelationship[];

    readonly asOfExclusive:
        string;

    readonly windowDays:
        number;

    readonly acquisitionCosts?:
        readonly InsuranceAcquisitionCostFact[];

    readonly premiumFacts?:
        readonly InsurancePremiumFact[];

    readonly commissionFacts?:
        readonly InsuranceCommissionFact[];

    readonly renewalFacts?:
        readonly InsuranceRenewalFact[];

    readonly outcomeFacts?:
        readonly InsuranceAcquisitionOutcomeFact[];
}


export interface InsuranceAcquisitionConversionWindowEvidence {
    readonly projectionVersion:
        typeof INSURANCE_ACQUISITION_CONVERSION_WINDOW_EVIDENCE_VERSION;

    readonly asOfExclusive:
        string;

    readonly windowDays:
        number;

    readonly cohortRelationshipCount:
        number;

    readonly matureRelationshipCount:
        number;

    readonly immatureRelationshipCount:
        number;

    readonly relationshipIds:
        readonly RiverCrmRelationshipId[];

    readonly relationshipWindows:
        readonly InsuranceAcquisitionConversionWindowRelationshipWindow[];

    readonly acquisitionCosts:
        readonly InsuranceAcquisitionCostFact[];

    readonly premiumFacts:
        readonly InsurancePremiumFact[];

    readonly commissionFacts:
        readonly InsuranceCommissionFact[];

    readonly renewalFacts:
        readonly InsuranceRenewalFact[];

    readonly outcomeFacts:
        readonly InsuranceAcquisitionOutcomeFact[];
}


interface RelationshipWindowState {
    readonly relationshipId:
        RiverCrmRelationshipId;

    readonly createdAt:
        string;

    readonly createdAtMilliseconds:
        number;

    readonly windowEndExclusive:
        string;

    readonly windowEndMilliseconds:
        number;

    readonly mature:
        boolean;
}


function requireCanonicalUtcTimestamp(
    value:
        unknown,
    label:
        string
): {
    readonly value:
        string;

    readonly milliseconds:
        number;
} {
    if(
        typeof value !== "string" ||
        value.length === 0
    ){
        throw new TypeError(
            `Insurance acquisition conversion window requires ${label} to be a canonical UTC timestamp.`
        );
    }

    const milliseconds =
        Date.parse(
            value
        );

    if(Number.isNaN(milliseconds)){
        throw new TypeError(
            `Insurance acquisition conversion window requires ${label} to be a canonical UTC timestamp.`
        );
    }

    const canonical =
        new Date(
            milliseconds
        ).toISOString();

    if(canonical !== value){
        throw new TypeError(
            `Insurance acquisition conversion window requires ${label} to be a canonical UTC timestamp.`
        );
    }

    return {
        value,
        milliseconds
    };
}


export function requireInsuranceAcquisitionConversionWindowDays(
    value:
        number
): number {
    if(
        !Number.isSafeInteger(
            value
        ) ||
        value <= 0
    ){
        throw new TypeError(
            "Insurance acquisition conversion window requires windowDays to be a positive safe integer."
        );
    }

    return value;
}


function conversionWindowDurationMilliseconds(
    windowDays:
        number
): number {
    const milliseconds =
        windowDays *
        MILLISECONDS_PER_DAY;

    if(
        !Number.isSafeInteger(
            milliseconds
        )
    ){
        throw new RangeError(
            "Insurance acquisition conversion window exceeds the safe elapsed-duration range."
        );
    }

    return milliseconds;
}


function createRelationshipWindow(
    relationship:
        InsuranceAcquisitionConversionWindowRelationship,
    durationMilliseconds:
        number,
    asOfMilliseconds:
        number
): RelationshipWindowState {
    const relationshipId =
        requireRiverCrmRelationshipId(
            relationship.relationshipId
        );

    const createdAt =
        requireCanonicalUtcTimestamp(
            relationship.createdAt,
            "relationship createdAt"
        );

    const windowEndMilliseconds =
        createdAt.milliseconds +
        durationMilliseconds;

    if(
        !Number.isSafeInteger(
            windowEndMilliseconds
        )
    ){
        throw new RangeError(
            "Insurance acquisition conversion window end exceeds the safe timestamp range."
        );
    }

    const windowEndDate =
        new Date(
            windowEndMilliseconds
        );

    if(Number.isNaN(windowEndDate.getTime())){
        throw new RangeError(
            "Insurance acquisition conversion window end exceeds the supported timestamp range."
        );
    }

    const windowEndExclusive =
        windowEndDate.toISOString();

    return {
        relationshipId,

        createdAt:
            createdAt.value,

        createdAtMilliseconds:
            createdAt.milliseconds,

        windowEndExclusive,

        windowEndMilliseconds,

        mature:
            windowEndMilliseconds <=
            asOfMilliseconds
    };
}


function canonicalRelationshipWindows(
    relationships:
        readonly InsuranceAcquisitionConversionWindowRelationship[],
    durationMilliseconds:
        number,
    asOfMilliseconds:
        number
): readonly RelationshipWindowState[] {
    const result:
        RelationshipWindowState[] = [];

    const seen =
        new Map<
            RiverCrmRelationshipId,
            RelationshipWindowState
        >();

    for(const relationship of relationships){
        const next =
            createRelationshipWindow(
                relationship,
                durationMilliseconds,
                asOfMilliseconds
            );

        const existing =
            seen.get(
                next.relationshipId
            );

        if(existing !== undefined){
            if(
                existing.createdAt !==
                next.createdAt
            ){
                throw new RangeError(
                    "Insurance acquisition conversion window received conflicting createdAt values for one relationship."
                );
            }

            continue;
        }

        seen.set(
            next.relationshipId,
            next
        );

        result.push(
            next
        );
    }

    return result;
}


function filterEvidence<
    T extends {
        readonly relationshipId:
            unknown;

        readonly occurredAt:
            string;
    }
>(
    values:
        readonly T[] | undefined,
    allRelationships:
        ReadonlyMap<
            RiverCrmRelationshipId,
            RelationshipWindowState
        >,
    matureRelationships:
        ReadonlyMap<
            RiverCrmRelationshipId,
            RelationshipWindowState
        >,
    asOfMilliseconds:
        number,
    family:
        string
): readonly T[] {
    const result:
        T[] = [];

    for(const value of values ?? []){
        const relationshipId =
            requireRiverCrmRelationshipId(
                value.relationshipId
            );

        if(
            !allRelationships.has(
                relationshipId
            )
        ){
            throw new RangeError(
                `Insurance acquisition conversion window ${family} belongs outside the supplied relationship cohort.`
            );
        }

        const occurredAt =
            requireCanonicalUtcTimestamp(
                value.occurredAt,
                `${family} occurredAt`
            );

        const relationship =
            matureRelationships.get(
                relationshipId
            );

        if(relationship === undefined){
            continue;
        }

        if(
            occurredAt.milliseconds >=
                relationship.createdAtMilliseconds &&
            occurredAt.milliseconds <
                asOfMilliseconds &&
            occurredAt.milliseconds <
                relationship.windowEndMilliseconds
        ){
            result.push(
                value
            );
        }
    }

    return result;
}


export function createInsuranceAcquisitionConversionWindowEvidence(
    input:
        CreateInsuranceAcquisitionConversionWindowEvidenceInput
): InsuranceAcquisitionConversionWindowEvidence {
    const asOf =
        requireCanonicalUtcTimestamp(
            input.asOfExclusive,
            "asOfExclusive"
        );

    const windowDays =
        requireInsuranceAcquisitionConversionWindowDays(
            input.windowDays
        );

    const durationMilliseconds =
        conversionWindowDurationMilliseconds(
            windowDays
        );

    const relationships =
        canonicalRelationshipWindows(
            input.relationships,
            durationMilliseconds,
            asOf.milliseconds
        );

    const allRelationships =
        new Map<
            RiverCrmRelationshipId,
            RelationshipWindowState
        >(
            relationships.map(
                relationship => [
                    relationship.relationshipId,
                    relationship
                ] as const
            )
        );

    const matureRelationshipsInOrder =
        relationships.filter(
            relationship =>
                relationship.mature
        );

    const matureRelationships =
        new Map<
            RiverCrmRelationshipId,
            RelationshipWindowState
        >(
            matureRelationshipsInOrder.map(
                relationship => [
                    relationship.relationshipId,
                    relationship
                ] as const
            )
        );

    return {
        projectionVersion:
            INSURANCE_ACQUISITION_CONVERSION_WINDOW_EVIDENCE_VERSION,

        asOfExclusive:
            asOf.value,

        windowDays,

        cohortRelationshipCount:
            relationships.length,

        matureRelationshipCount:
            matureRelationshipsInOrder.length,

        immatureRelationshipCount:
            relationships.length -
            matureRelationshipsInOrder.length,

        relationshipIds:
            matureRelationshipsInOrder.map(
                relationship =>
                    relationship.relationshipId
            ),

        relationshipWindows:
            matureRelationshipsInOrder.map(
                relationship => ({
                    relationshipId:
                        relationship.relationshipId,

                    createdAt:
                        relationship.createdAt,

                    windowEndExclusive:
                        relationship.windowEndExclusive
                })
            ),

        acquisitionCosts:
            filterEvidence(
                input.acquisitionCosts,
                allRelationships,
                matureRelationships,
                asOf.milliseconds,
                "acquisition cost fact"
            ),

        premiumFacts:
            filterEvidence(
                input.premiumFacts,
                allRelationships,
                matureRelationships,
                asOf.milliseconds,
                "premium fact"
            ),

        commissionFacts:
            filterEvidence(
                input.commissionFacts,
                allRelationships,
                matureRelationships,
                asOf.milliseconds,
                "commission fact"
            ),

        renewalFacts:
            filterEvidence(
                input.renewalFacts,
                allRelationships,
                matureRelationships,
                asOf.milliseconds,
                "renewal fact"
            ),

        outcomeFacts:
            filterEvidence(
                input.outcomeFacts,
                allRelationships,
                matureRelationships,
                asOf.milliseconds,
                "outcome fact"
            )
    };
}
