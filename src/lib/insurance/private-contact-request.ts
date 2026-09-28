import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    InsuranceContactChannel,
    InsuranceContactIntent
} from "./contact-attempt";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";


export interface InsurancePrivateContactRequest {
    readonly relationshipId:
        RiverCrmRelationshipId;

    readonly channel:
        InsuranceContactChannel;

    readonly intent:
        InsuranceContactIntent;
}


const CHANNELS:
    readonly InsuranceContactChannel[] = [
        "phone",
        "sms",
        "email"
    ];


const INTENTS:
    readonly InsuranceContactIntent[] = [
        "instant-contact",
        "callback"
    ];


function requiredText(
    value:
        FormDataEntryValue | null,
    label:
        string
):
    string {

    if(
        typeof value !==
            "string" ||
        value.trim().length ===
            0
    ){
        throw new TypeError(
            `${label} is required.`
        );
    }

    return value.trim();
}


function requireChannel(
    value:
        FormDataEntryValue | null
):
    InsuranceContactChannel {

    const channel =
        requiredText(
            value,
            "Insurance contact channel"
        );

    if(
        !CHANNELS.includes(
            channel as
                InsuranceContactChannel
        )
    ){
        throw new TypeError(
            "Insurance contact channel is unsupported."
        );
    }

    return channel as
        InsuranceContactChannel;
}


function requireIntent(
    value:
        FormDataEntryValue | null
):
    InsuranceContactIntent {

    const intent =
        requiredText(
            value,
            "Insurance contact intent"
        );

    if(
        !INTENTS.includes(
            intent as
                InsuranceContactIntent
        )
    ){
        throw new TypeError(
            "Insurance contact intent is unsupported."
        );
    }

    return intent as
        InsuranceContactIntent;
}


export function buildInsurancePrivateContactRequestFromForm(
    formData:
        FormData
):
    InsurancePrivateContactRequest {

    return {
        relationshipId:
            requireRiverCrmRelationshipId(
                formData.get(
                    "relationshipId"
                )
            ) as
                RiverCrmRelationshipId,

        channel:
            requireChannel(
                formData.get(
                    "channel"
                )
            ),

        intent:
            requireIntent(
                formData.get(
                    "intent"
                )
            )
    };
}
