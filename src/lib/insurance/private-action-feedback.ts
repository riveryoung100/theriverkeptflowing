export type InsurancePrivateActionFeedbackKind =
    | "operating-state"
    | "appointment"
    | "follow-up";


export interface InsurancePrivateActionFeedback {
    readonly kind:
        InsurancePrivateActionFeedbackKind;

    readonly outcome:
        string;

    readonly message:
        string;
}


function normalizedOutcome(
    searchParams:
        URLSearchParams,
    name:
        string
):
    string |
    undefined {

    const value =
        searchParams
            .get(
                name
            )
            ?.trim();

    return value ===
        undefined ||
        value.length ===
            0
        ? undefined
        : value;
}


export function resolveInsurancePrivateActionFeedback(
    searchParams:
        URLSearchParams
):
    InsurancePrivateActionFeedback |
    undefined {

    const operatingState =
        normalizedOutcome(
            searchParams,
            "operatingState"
        );

    if(operatingState === "updated"){
        return {
            kind:
                "operating-state",

            outcome:
                operatingState,

            message:
                "Insurance operating state updated."
        };
    }

    if(operatingState === "no-op"){
        return {
            kind:
                "operating-state",

            outcome:
                operatingState,

            message:
                "Insurance operating state already matched the requested values."
        };
    }

    const appointment =
        normalizedOutcome(
            searchParams,
            "appointment"
        );

    if(appointment === "scheduled"){
        return {
            kind:
                "appointment",

            outcome:
                appointment,

            message:
                "Appointment scheduled."
        };
    }

    if(appointment === "rescheduled"){
        return {
            kind:
                "appointment",

            outcome:
                appointment,

            message:
                "Appointment rescheduled."
        };
    }

    if(appointment === "cleared"){
        return {
            kind:
                "appointment",

            outcome:
                appointment,

            message:
                "Appointment cleared."
        };
    }

    if(appointment === "no-op"){
        return {
            kind:
                "appointment",

            outcome:
                appointment,

            message:
                "Appointment already matched the requested value."
        };
    }

    const followUp =
        normalizedOutcome(
            searchParams,
            "followUp"
        );

    if(followUp === "scheduled"){
        return {
            kind:
                "follow-up",

            outcome:
                followUp,

            message:
                "Follow-up scheduled."
        };
    }

    if(followUp === "cleared"){
        return {
            kind:
                "follow-up",

            outcome:
                followUp,

            message:
                "Follow-up cleared."
        };
    }

    if(followUp === "no-op"){
        return {
            kind:
                "follow-up",

            outcome:
                followUp,

            message:
                "Follow-up already matched the requested value."
        };
    }

    return undefined;
}
