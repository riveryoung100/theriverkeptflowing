import type {
    RiverCrmAcquisitionAttribution,
    RiverCrmContactConsent,
    RiverCrmRelationshipEvent
} from "../river-os/crm-growth-contracts";

import type {
    InsuranceLeadProfile
} from "./lead-profile";


export const INSURANCE_PRESENTATION_EVENT_LIMIT =
    5;

export interface InsuranceLeadConsentPresentation {
    readonly channel:
        RiverCrmContactConsent["channel"];

    readonly status:
        RiverCrmContactConsent["status"];

    readonly doNotContact:
        boolean;
}

export interface InsuranceLeadEventPresentation {
    readonly eventType:
        RiverCrmRelationshipEvent["eventType"];

    readonly occurredAt:
        string;

    readonly source:
        string;
}

export interface InsuranceLeadPresentation {
    readonly relationshipId:
        InsuranceLeadProfile["relationshipId"];

    readonly state:
        string;

    readonly postalCode:
        string;

    readonly productInterest:
        InsuranceLeadProfile["productInterest"];

    readonly quoteStatus:
        InsuranceLeadProfile["quoteStatus"];

    readonly assignedProducer?:
        string;

    readonly acquisitionSource?:
        string;

    readonly sourceVendor?:
        string;

    readonly campaign?:
        string;

    readonly consentChannels:
        readonly InsuranceLeadConsentPresentation[];

    readonly doNotContact:
        boolean;

    readonly recentEvents:
        readonly InsuranceLeadEventPresentation[];
}

export interface CreateInsuranceLeadPresentationInput {
    readonly profile:
        InsuranceLeadProfile;

    readonly acquisition?:
        RiverCrmAcquisitionAttribution |
        null;

    readonly consents?:
        readonly RiverCrmContactConsent[];

    readonly events?:
        readonly RiverCrmRelationshipEvent[];
}


function assertRelationshipOwnership(
    input:
        CreateInsuranceLeadPresentationInput
): void {
    const relationshipId =
        input.profile.relationshipId;

    if(
        input.acquisition !== undefined &&
        input.acquisition !== null &&
        input.acquisition.relationshipId !== relationshipId
    ){
        throw new TypeError(
            "Insurance presentation acquisition relationship does not match profile relationship."
        );
    }

    for(const consent of input.consents ?? []){
        if(consent.relationshipId !== relationshipId){
            throw new TypeError(
                "Insurance presentation consent relationship does not match profile relationship."
            );
        }
    }

    for(const event of input.events ?? []){
        if(event.relationshipId !== relationshipId){
            throw new TypeError(
                "Insurance presentation event relationship does not match profile relationship."
            );
        }
    }
}

function newestEvents(
    events:
        readonly RiverCrmRelationshipEvent[]
): readonly RiverCrmRelationshipEvent[] {
    return [...events]
        .sort(
            (
                left,
                right
            ) =>
                new Date(
                    right.occurredAt
                ).getTime() -
                new Date(
                    left.occurredAt
                ).getTime()
        )
        .slice(
            0,
            INSURANCE_PRESENTATION_EVENT_LIMIT
        );
}

export function createInsuranceLeadPresentation(
    input:
        CreateInsuranceLeadPresentationInput
): InsuranceLeadPresentation {
    assertRelationshipOwnership(
        input
    );

    const acquisition =
        input.acquisition ??
        undefined;

    const consents =
        input.consents ??
        [];

    const events =
        input.events ??
        [];

    return {
        relationshipId:
            input.profile.relationshipId,

        state:
            input.profile.state,

        postalCode:
            input.profile.postalCode,

        productInterest:
            input.profile.productInterest,

        quoteStatus:
            input.profile.quoteStatus,

        ...(input.profile.assignedProducer !== undefined
            ? {
                assignedProducer:
                    input.profile.assignedProducer
            }
            : {}),

        ...(acquisition !== undefined
            ? {
                acquisitionSource:
                    acquisition.source,

                ...(acquisition.sourceVendor !== undefined
                    ? {
                        sourceVendor:
                            acquisition.sourceVendor
                    }
                    : {}),

                ...(acquisition.campaign !== undefined
                    ? {
                        campaign:
                            acquisition.campaign
                    }
                    : {})
            }
            : {}),

        consentChannels:
            consents.map(
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
            consents.some(
                consent =>
                    consent.doNotContact
            ),

        recentEvents:
            newestEvents(
                events
            ).map(
                event => ({
                    eventType:
                        event.eventType,

                    occurredAt:
                        event.occurredAt,

                    source:
                        event.source
                })
            )
    };
}
