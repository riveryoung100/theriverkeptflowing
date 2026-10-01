import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    RiverCrmPipelineStage
} from "../river-os/crm-workspace";

import type {
    InsuranceQuoteStatus
} from "./lead-profile";


export interface InsurancePrivateOperatingStateRequest {
    readonly relationshipId:
        string;

    readonly stage:
        RiverCrmPipelineStage;

    readonly quoteStatus:
        InsuranceQuoteStatus;

    readonly assignedProducer:
        string |
        null;
}


function requiredText(
    value:
        FormDataEntryValue |
        null,
    field:
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
            `Insurance operating-state request requires ${field}.`
        );
    }

    return value.trim();
}


function optionalAssignment(
    value:
        FormDataEntryValue |
        null
):
    string |
    null {

    if(value === null){
        return null;
    }

    if(typeof value !== "string"){
        throw new TypeError(
            "Insurance operating-state request assignedProducer must be text."
        );
    }

    const normalized =
        value.trim();

    return normalized.length ===
        0
        ? null
        : normalized;
}


export function buildInsurancePrivateOperatingStateRequestFromForm(
    formData:
        FormData
):
    InsurancePrivateOperatingStateRequest {

    /*
     * The transport layer only normalizes values.
     * Runtime membership/transition validation belongs to the
     * canonical INS-006Q operating-state planner.
     */
    const stage =
        requiredText(
            formData.get(
                "stage"
            ),
            "stage"
        ) as
            RiverCrmPipelineStage;

    const quoteStatus =
        requiredText(
            formData.get(
                "quoteStatus"
            ),
            "quoteStatus"
        ) as
            InsuranceQuoteStatus;

    return {
        relationshipId:
            requireRiverCrmRelationshipId(
                formData.get(
                    "relationshipId"
                )
            ),

        stage,

        quoteStatus,

        assignedProducer:
            optionalAssignment(
                formData.get(
                    "assignedProducer"
                )
            )
    };
}
