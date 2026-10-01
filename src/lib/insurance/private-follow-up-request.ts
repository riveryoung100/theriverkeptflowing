import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";


export type InsurancePrivateFollowUpOperation =
    | "schedule"
    | "clear";


export interface InsurancePrivateFollowUpRequest {
    readonly relationshipId:
        string;

    readonly operation:
        InsurancePrivateFollowUpOperation;

    readonly nextFollowUpAt:
        string |
        null;
}


const ABSOLUTE_TIMESTAMP_SUFFIX =
    /(?:Z|[+-]\d{2}:\d{2})$/;


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
            `Insurance follow-up request requires ${field}.`
        );
    }

    return value.trim();
}


function requireOperation(
    value:
        FormDataEntryValue |
        null
):
    InsurancePrivateFollowUpOperation {

    const operation =
        requiredText(
            value,
            "operation"
        );

    if(
        operation !==
            "schedule" &&
        operation !==
            "clear"
    ){
        throw new TypeError(
            "Insurance follow-up request operation is not supported."
        );
    }

    return operation;
}


function requireAbsoluteTimestamp(
    value:
        FormDataEntryValue |
        null
):
    string {

    const timestamp =
        requiredText(
            value,
            "nextFollowUpAt"
        );

    if(
        !ABSOLUTE_TIMESTAMP_SUFFIX.test(
            timestamp
        ) ||
        Number.isNaN(
            Date.parse(
                timestamp
            )
        )
    ){
        throw new TypeError(
            "Insurance follow-up request nextFollowUpAt must be a valid absolute timestamp."
        );
    }

    return timestamp;
}


export function buildInsurancePrivateFollowUpRequestFromForm(
    formData:
        FormData
):
    InsurancePrivateFollowUpRequest {

    const relationshipId =
        requireRiverCrmRelationshipId(
            formData.get(
                "relationshipId"
            )
        );

    const operation =
        requireOperation(
            formData.get(
                "operation"
            )
        );

    if(operation === "clear"){
        return {
            relationshipId,

            operation,

            nextFollowUpAt:
                null
        };
    }

    return {
        relationshipId,

        operation,

        nextFollowUpAt:
            requireAbsoluteTimestamp(
                formData.get(
                    "nextFollowUpAt"
                )
            )
    };
}
