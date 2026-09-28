import type {
    InsuranceContactAttemptId
} from "./contact-attempt";


export type TelnyxCallBridgeState =
    | "operator-dial-requested"
    | "operator-answered"
    | "lead-dial-requested"
    | "lead-answered"
    | "bridge-requested"
    | "bridged"
    | "completed"
    | "failed";


export interface TelnyxCallBridge {
    readonly attemptId:
        InsuranceContactAttemptId;

    readonly state:
        TelnyxCallBridgeState;

    readonly operatorCallControlId?:
        string;

    readonly leadCallControlId?:
        string;

    readonly failureCode?:
        string;

    readonly createdAt:
        string;

    readonly updatedAt:
        string;
}


export interface CreateTelnyxCallBridgeInput {
    readonly attemptId:
        InsuranceContactAttemptId;

    readonly createdAt:
        string;
}


export interface TelnyxCallBridgeTransitionDetails {
    readonly operatorCallControlId?:
        string;

    readonly leadCallControlId?:
        string;

    readonly failureCode?:
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
            `Telnyx call bridge requires ${field}.`
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
            `Telnyx call bridge requires ${field} to be a valid timestamp.`
        );
    }

    return text;
}


function terminal(
    state:
        TelnyxCallBridgeState
):
    boolean {

    return (
        state ===
            "completed" ||
        state ===
            "failed"
    );
}


const LEGAL_TRANSITIONS:
    Readonly<
        Record<
            TelnyxCallBridgeState,
            readonly TelnyxCallBridgeState[]
        >
    > = {
        "operator-dial-requested": [
            "operator-answered",
            "failed"
        ],

        "operator-answered": [
            "lead-dial-requested",
            "failed"
        ],

        "lead-dial-requested": [
            "lead-answered",
            "failed"
        ],

        "lead-answered": [
            "bridge-requested",
            "failed"
        ],

        "bridge-requested": [
            "bridged",
            "failed"
        ],

        "bridged": [
            "completed",
            "failed"
        ],

        "completed": [],

        "failed": []
    };


function requireIdentityForState(
    bridge:
        TelnyxCallBridge
):
    void {

    if(
        bridge.state !==
            "operator-dial-requested" &&
        bridge.state !==
            "failed" &&
        bridge.operatorCallControlId ===
            undefined
    ){
        throw new TypeError(
            "Telnyx call bridge requires operatorCallControlId after the operator dial request."
        );
    }

    if(
        (
            bridge.state ===
                "lead-answered" ||
            bridge.state ===
                "bridge-requested" ||
            bridge.state ===
                "bridged" ||
            bridge.state ===
                "completed"
        ) &&
        bridge.leadCallControlId ===
            undefined
    ){
        throw new TypeError(
            "Telnyx call bridge requires leadCallControlId after the lead dial request."
        );
    }

    if(
        bridge.state ===
            "failed" &&
        bridge.failureCode ===
            undefined
    ){
        throw new TypeError(
            "Telnyx call bridge failed state requires failureCode."
        );
    }
}


export function createTelnyxCallBridge(
    input:
        CreateTelnyxCallBridgeInput
):
    TelnyxCallBridge {

    const createdAt =
        requiredTimestamp(
            input.createdAt,
            "createdAt"
        );

    return {
        attemptId:
            input.attemptId,
        state:
            "operator-dial-requested",
        createdAt,
        updatedAt:
            createdAt
    };
}


export function transitionTelnyxCallBridge(
    current:
        TelnyxCallBridge,
    nextState:
        TelnyxCallBridgeState,
    updatedAt:
        string,
    details:
        TelnyxCallBridgeTransitionDetails = {}
):
    TelnyxCallBridge {

    if(
        terminal(
            current.state
        )
    ){
        throw new Error(
            "Terminal Telnyx call bridge cannot transition."
        );
    }

    if(
        !LEGAL_TRANSITIONS[
            current.state
        ].includes(
            nextState
        )
    ){
        throw new Error(
            `Illegal Telnyx call bridge transition: ${current.state} -> ${nextState}.`
        );
    }

    const timestamp =
        requiredTimestamp(
            updatedAt,
            "updatedAt"
        );

    const operatorCallControlId =
        details.operatorCallControlId ===
            undefined
            ? current.operatorCallControlId
            : requiredText(
                details.operatorCallControlId,
                "operatorCallControlId"
            );

    const leadCallControlId =
        details.leadCallControlId ===
            undefined
            ? current.leadCallControlId
            : requiredText(
                details.leadCallControlId,
                "leadCallControlId"
            );

    const failureCode =
        nextState ===
            "failed"
            ? requiredText(
                details.failureCode,
                "failureCode"
            )
            : undefined;

    const next:
        TelnyxCallBridge = {
            ...current,
            state:
                nextState,
            updatedAt:
                timestamp,
            ...(operatorCallControlId !==
                undefined
                ? {
                    operatorCallControlId
                }
                : {}),
            ...(leadCallControlId !==
                undefined
                ? {
                    leadCallControlId
                }
                : {}),
            ...(failureCode !==
                undefined
                ? {
                    failureCode
                }
                : {})
        };

    requireIdentityForState(
        next
    );

    return next;
}
