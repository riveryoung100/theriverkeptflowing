import {
    createRiverCrmRelationshipEvent
} from "../river-os/crm-growth-contracts";

import type {
    RiverCrmRelationshipEvent
} from "../river-os/crm-growth-contracts";

import type {
    InsuranceLeadPresentation
} from "./lead-presentation";


export const INSURANCE_CALLBACK_NOTE_MAX_LENGTH =
    1000;

export type InsuranceIntegrationContactChannel =
    InsuranceLeadPresentation["consentChannels"][number]["channel"];

export interface InsuranceGrowthIntegrationContactChannel {
    readonly channel:
        InsuranceIntegrationContactChannel;

    readonly status:
        InsuranceLeadPresentation["consentChannels"][number]["status"];

    readonly doNotContact:
        boolean;
}

export interface InsuranceGrowthIntegrationContext {
    readonly relationshipId:
        InsuranceLeadPresentation["relationshipId"];

    readonly productInterest:
        InsuranceLeadPresentation["productInterest"];

    readonly quoteStatus:
        InsuranceLeadPresentation["quoteStatus"];

    readonly state:
        string;

    readonly postalCode:
        string;

    readonly acquisitionSource?:
        string;

    readonly campaign?:
        string;

    readonly contactChannels:
        readonly InsuranceGrowthIntegrationContactChannel[];

    readonly doNotContact:
        boolean;
}

export interface CreateInsuranceCallbackRequestedEventInput {
    readonly eventId:
        unknown;

    readonly relationshipId:
        unknown;

    readonly occurredAt:
        unknown;

    readonly source:
        unknown;

    readonly externalReference?:
        unknown;

    readonly requestedChannel?:
        unknown;

    readonly requestedAt?:
        unknown;

    readonly notes?:
        unknown;
}

export interface InsuranceGrowthIntegrationHandoff {
    readonly context:
        InsuranceGrowthIntegrationContext;

    readonly triggerEvent:
        RiverCrmRelationshipEvent;
}


function requiredNonBlankText(
    value:
        unknown,
    field:
        string
): string {
    if(
        typeof value !== "string" ||
        value.trim().length === 0
    ){
        throw new TypeError(
            `${field} must be non-empty text.`
        );
    }

    return value.trim();
}

function optionalExternalReference(
    value:
        unknown
): string | undefined {
    if(value === undefined){
        return undefined;
    }

    return requiredNonBlankText(
        value,
        "Insurance integration external reference"
    );
}

function optionalCallbackChannel(
    value:
        unknown
): InsuranceIntegrationContactChannel | undefined {
    if(value === undefined){
        return undefined;
    }

    if(
        value !== "phone" &&
        value !== "sms" &&
        value !== "email"
    ){
        throw new TypeError(
            "Insurance callback requestedChannel must be phone, sms, or email."
        );
    }

    return value;
}

function optionalTimestamp(
    value:
        unknown,
    field:
        string
): string | undefined {
    if(value === undefined){
        return undefined;
    }

    const text=
        requiredNonBlankText(
            value,
            field
        );

    if(
        Number.isNaN(
            Date.parse(
                text
            )
        )
    ){
        throw new TypeError(
            `${field} must be a valid timestamp.`
        );
    }

    return text;
}

function optionalNotes(
    value:
        unknown
): string | undefined {
    if(value === undefined){
        return undefined;
    }

    const text=
        requiredNonBlankText(
            value,
            "Insurance callback notes"
        );

    if(
        text.length >
        INSURANCE_CALLBACK_NOTE_MAX_LENGTH
    ){
        throw new TypeError(
            `Insurance callback notes must not exceed ${INSURANCE_CALLBACK_NOTE_MAX_LENGTH} characters.`
        );
    }

    return text;
}


export function createInsuranceGrowthIntegrationContext(
    presentation:
        InsuranceLeadPresentation
): InsuranceGrowthIntegrationContext {
    return {
        relationshipId:
            presentation.relationshipId,

        productInterest:
            presentation.productInterest,

        quoteStatus:
            presentation.quoteStatus,

        state:
            presentation.state,

        postalCode:
            presentation.postalCode,

        ...(presentation.acquisitionSource !== undefined
            ? {
                acquisitionSource:
                    presentation.acquisitionSource
            }
            : {}),

        ...(presentation.campaign !== undefined
            ? {
                campaign:
                    presentation.campaign
            }
            : {}),

        contactChannels:
            presentation.consentChannels.map(
                consent => ({
                    channel:
                        consent.channel,

                    status:
                        consent.status,

                    doNotContact:
                        consent.doNotContact
                })
            ),

        doNotContact:
            presentation.doNotContact
    };
}


export function createInsuranceCallbackRequestedEvent(
    input:
        CreateInsuranceCallbackRequestedEventInput
): RiverCrmRelationshipEvent {
    const externalReference=
        optionalExternalReference(
            input.externalReference
        );

    const requestedChannel=
        optionalCallbackChannel(
            input.requestedChannel
        );

    const requestedAt=
        optionalTimestamp(
            input.requestedAt,
            "Insurance callback requestedAt"
        );

    const notes=
        optionalNotes(
            input.notes
        );

    const metadata: {
        requestedChannel?:
            InsuranceIntegrationContactChannel;

        requestedAt?:
            string;

        notes?:
            string;
    } = {
        ...(requestedChannel !== undefined
            ? {
                requestedChannel
            }
            : {}),

        ...(requestedAt !== undefined
            ? {
                requestedAt
            }
            : {}),

        ...(notes !== undefined
            ? {
                notes
            }
            : {})
    };

    return createRiverCrmRelationshipEvent({
        eventId:
            input.eventId,

        relationshipId:
            input.relationshipId,

        eventType:
            "callback-requested",

        occurredAt:
            input.occurredAt,

        source:
            input.source,

        ...(externalReference !== undefined
            ? {
                externalReference
            }
            : {}),

        ...(Object.keys(metadata).length > 0
            ? {
                metadata
            }
            : {})
    });
}


export function createInsuranceGrowthIntegrationHandoff(
    context:
        InsuranceGrowthIntegrationContext,
    triggerEvent:
        RiverCrmRelationshipEvent
): InsuranceGrowthIntegrationHandoff {
    if(
        context.relationshipId !==
        triggerEvent.relationshipId
    ){
        throw new TypeError(
            "Insurance integration handoff relationship mismatch."
        );
    }

    return {
        context,
        triggerEvent
    };
}
