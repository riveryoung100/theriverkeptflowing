export type TelnyxVoiceEventType =
    | "call.initiated"
    | "call.answered"
    | "call.bridged"
    | "call.hangup";


export interface TelnyxVoiceEvent {
    readonly provider:
        "telnyx";

    readonly providerEventId:
        string;

    readonly type:
        TelnyxVoiceEventType;

    readonly occurredAt:
        string;

    readonly callControlId:
        string;

    readonly callLegId?:
        string;

    readonly callSessionId?:
        string;

    readonly hangupCause?:
        string;

    readonly hangupSource?:
        string;

    readonly sipHangupCause?:
        string;
}


const RECOGNIZED_EVENT_TYPES:
    ReadonlySet<string> =
        new Set<TelnyxVoiceEventType>([
            "call.initiated",
            "call.answered",
            "call.bridged",
            "call.hangup"
        ]);


function objectRecord(
    value:
        unknown,
    field:
        string
):
    Record<string, unknown> {

    if(
        value === null ||
        typeof value !==
            "object" ||
        Array.isArray(
            value
        )
    ){
        throw new TypeError(
            `Telnyx voice event requires ${field} to be an object.`
        );
    }

    return value as
        Record<string, unknown>;
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
            `Telnyx voice event requires ${field}.`
        );
    }

    return value.trim();
}


function optionalText(
    value:
        unknown
):
    string | undefined {

    if(value === undefined){
        return undefined;
    }

    if(
        typeof value !==
            "string" ||
        value.trim().length ===
            0
    ){
        return undefined;
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
            `Telnyx voice event requires ${field} to be a valid timestamp.`
        );
    }

    return text;
}


function recognizedEventType(
    value:
        unknown
):
    TelnyxVoiceEventType | undefined {

    if(
        typeof value !==
            "string"
    ){
        return undefined;
    }

    const text =
        value.trim();

    if(
        !RECOGNIZED_EVENT_TYPES.has(
            text
        )
    ){
        return undefined;
    }

    return text as
        TelnyxVoiceEventType;
}


export function normalizeTelnyxVoiceEvent(
    input:
        unknown
):
    TelnyxVoiceEvent | undefined {

    const envelope =
        objectRecord(
            input,
            "envelope"
        );

    const type =
        recognizedEventType(
            envelope.event_type
        );

    if(type === undefined){
        return undefined;
    }

    const recordType =
        requiredText(
            envelope.record_type,
            "record_type"
        );

    if(recordType !== "event"){
        throw new TypeError(
            "Telnyx voice event requires record_type to equal event."
        );
    }

    const payload =
        objectRecord(
            envelope.payload,
            "payload"
        );

    const providerEventId =
        requiredText(
            envelope.id,
            "id"
        );

    const occurredAt =
        requiredTimestamp(
            envelope.occurred_at,
            "occurred_at"
        );

    const callControlId =
        requiredText(
            payload.call_control_id,
            "payload.call_control_id"
        );

    const callLegId =
        optionalText(
            payload.call_leg_id
        );

    const callSessionId =
        optionalText(
            payload.call_session_id
        );

    const hangupCause =
        type ===
            "call.hangup"
            ? optionalText(
                payload.hangup_cause
            )
            : undefined;

    const hangupSource =
        type ===
            "call.hangup"
            ? optionalText(
                payload.hangup_source
            )
            : undefined;

    const sipHangupCause =
        type ===
            "call.hangup"
            ? optionalText(
                payload.sip_hangup_cause
            )
            : undefined;

    return {
        provider:
            "telnyx",
        providerEventId,
        type,
        occurredAt,
        callControlId,
        ...(callLegId !==
            undefined
            ? {
                callLegId
            }
            : {}),
        ...(callSessionId !==
            undefined
            ? {
                callSessionId
            }
            : {}),
        ...(hangupCause !==
            undefined
            ? {
                hangupCause
            }
            : {}),
        ...(hangupSource !==
            undefined
            ? {
                hangupSource
            }
            : {}),
        ...(sipHangupCause !==
            undefined
            ? {
                sipHangupCause
            }
            : {})
    };
}
