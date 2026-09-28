import type {
    InsuranceContactAttemptId
} from "./contact-attempt";


export type TelnyxCallLegRole =
    | "operator"
    | "lead";


export interface TelnyxCallLegCorrelation {
    readonly attemptId:
        InsuranceContactAttemptId;

    readonly legRole:
        TelnyxCallLegRole;

    readonly provider:
        "telnyx";

    readonly providerReference:
        string;

    readonly createdAt:
        string;

    readonly updatedAt:
        string;
}


export interface CreateTelnyxCallLegCorrelationInput {
    readonly attemptId:
        InsuranceContactAttemptId;

    readonly legRole:
        TelnyxCallLegRole;

    readonly providerReference:
        string;

    readonly createdAt:
        string;

    readonly updatedAt?:
        string;
}


function requiredText(
    value:
        unknown,
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
            `Telnyx call-leg correlation requires ${field}.`
        );
    }

    return value.trim();
}


function requiredTimestamp(
    value:
        unknown,
    field:
        string
):
    string {

    const text =
        requiredText(
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
            `Telnyx call-leg correlation requires ${field} to be a valid timestamp.`
        );
    }

    return text;
}


function requiredLegRole(
    value:
        unknown
):
    TelnyxCallLegRole {

    if(
        value !== "operator" &&
        value !== "lead"
    ){
        throw new TypeError(
            "Telnyx call-leg correlation legRole must be operator or lead."
        );
    }

    return value;
}


export function createTelnyxCallLegCorrelation(
    input:
        CreateTelnyxCallLegCorrelationInput
):
    TelnyxCallLegCorrelation {

    const createdAt =
        requiredTimestamp(
            input.createdAt,
            "createdAt"
        );

    const updatedAt =
        input.updatedAt ===
            undefined
            ? createdAt
            : requiredTimestamp(
                input.updatedAt,
                "updatedAt"
            );

    return {
        attemptId:
            input.attemptId,
        legRole:
            requiredLegRole(
                input.legRole
            ),
        provider:
            "telnyx",
        providerReference:
            requiredText(
                input.providerReference,
                "providerReference"
            ),
        createdAt,
        updatedAt
    };
}
