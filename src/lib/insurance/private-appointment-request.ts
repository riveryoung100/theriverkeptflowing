import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";


export type InsurancePrivateAppointmentOperation =
    | "schedule"
    | "clear";


export interface InsurancePrivateAppointmentRequest {
    readonly relationshipId:
        string;

    readonly operation:
        InsurancePrivateAppointmentOperation;

    readonly appointmentAt:
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
            `Insurance appointment request requires ${field}.`
        );
    }

    return value.trim();
}


function requireOperation(
    value:
        FormDataEntryValue |
        null
):
    InsurancePrivateAppointmentOperation {

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
            "Insurance appointment request operation is not supported."
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
            "appointmentAt"
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
            "Insurance appointment request appointmentAt must be a valid absolute timestamp."
        );
    }

    return timestamp;
}


export function buildInsurancePrivateAppointmentRequestFromForm(
    formData:
        FormData
):
    InsurancePrivateAppointmentRequest {

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

            appointmentAt:
                null
        };
    }

    return {
        relationshipId,

        operation,

        appointmentAt:
            requireAbsoluteTimestamp(
                formData.get(
                    "appointmentAt"
                )
            )
    };
}
