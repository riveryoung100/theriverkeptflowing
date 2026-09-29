import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";


export const INSURANCE_ACQUISITION_OUTCOME_KINDS = [
    "quoted",
    "bound"
] as const;


export type InsuranceAcquisitionOutcomeKind =
    typeof INSURANCE_ACQUISITION_OUTCOME_KINDS[number];


export type InsuranceAcquisitionOutcomeFactId =
    string & {
        readonly __insuranceAcquisitionOutcomeFactId:
            unique symbol;
    };


export interface InsuranceAcquisitionOutcomeFact {
    readonly outcomeFactId:
        InsuranceAcquisitionOutcomeFactId;

    readonly relationshipId:
        RiverCrmRelationshipId;

    readonly kind:
        InsuranceAcquisitionOutcomeKind;

    readonly occurredAt:
        string;

    readonly providerReference?:
        string;

    readonly policyReference?:
        string;

    readonly externalReference?:
        string;

    readonly note?:
        string;
}


export interface CreateInsuranceAcquisitionOutcomeFactInput {
    readonly outcomeFactId:
        unknown;

    readonly relationshipId:
        unknown;

    readonly kind:
        unknown;

    readonly occurredAt:
        unknown;

    readonly providerReference?:
        unknown;

    readonly policyReference?:
        unknown;

    readonly externalReference?:
        unknown;

    readonly note?:
        unknown;
}


function requiredText(
    value:
        unknown,
    field:
        string
): string {
    if(typeof value !== "string"){
        throw new TypeError(
            `Insurance acquisition outcome ${field} must be a string.`
        );
    }

    const trimmed =
        value.trim();

    if(trimmed.length === 0){
        throw new TypeError(
            `Insurance acquisition outcome ${field} is required.`
        );
    }

    return trimmed;
}


function optionalText(
    value:
        unknown,
    field:
        string
): string | undefined {
    if(
        value === undefined ||
        value === null
    ){
        return undefined;
    }

    return requiredText(
        value,
        field
    );
}


function requiredTimestamp(
    value:
        unknown,
    field:
        string
): string {
    const text =
        requiredText(
            value,
            field
        );

    const parsed =
        new Date(
            text
        );

    if(
        Number.isNaN(
            parsed.getTime()
        )
    ){
        throw new TypeError(
            `Insurance acquisition outcome ${field} must be a valid timestamp.`
        );
    }

    return text;
}


export function createInsuranceAcquisitionOutcomeFactId(
    value:
        unknown
): InsuranceAcquisitionOutcomeFactId {
    const text =
        requiredText(
            value,
            "outcomeFactId"
        );

    if(
        !text.startsWith(
            "outcome-fact:"
        )
    ){
        throw new TypeError(
            "Insurance acquisition outcome outcomeFactId must start with outcome-fact:."
        );
    }

    return text as
        InsuranceAcquisitionOutcomeFactId;
}


export function createInsuranceAcquisitionOutcomeFact(
    input:
        CreateInsuranceAcquisitionOutcomeFactInput
): InsuranceAcquisitionOutcomeFact {
    const kind =
        requiredText(
            input.kind,
            "kind"
        );

    if(
        !(
            INSURANCE_ACQUISITION_OUTCOME_KINDS as
                readonly string[]
        ).includes(
            kind
        )
    ){
        throw new TypeError(
            "Insurance acquisition outcome kind is not supported."
        );
    }

    const providerReference =
        optionalText(
            input.providerReference,
            "providerReference"
        );

    const policyReference =
        optionalText(
            input.policyReference,
            "policyReference"
        );

    const externalReference =
        optionalText(
            input.externalReference,
            "externalReference"
        );

    const note =
        optionalText(
            input.note,
            "note"
        );

    return {
        outcomeFactId:
            createInsuranceAcquisitionOutcomeFactId(
                input.outcomeFactId
            ),

        relationshipId:
            requireRiverCrmRelationshipId(
                input.relationshipId
            ),

        kind:
            kind as
                InsuranceAcquisitionOutcomeKind,

        occurredAt:
            requiredTimestamp(
                input.occurredAt,
                "occurredAt"
            ),

        ...(providerReference !== undefined
            ? {
                providerReference
            }
            : {}),

        ...(policyReference !== undefined
            ? {
                policyReference
            }
            : {}),

        ...(externalReference !== undefined
            ? {
                externalReference
            }
            : {}),

        ...(note !== undefined
            ? {
                note
            }
            : {})
    };
}
