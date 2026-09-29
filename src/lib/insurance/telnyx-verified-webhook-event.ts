import {
    normalizeTelnyxVoiceEvent,
    type TelnyxVoiceEvent
} from "./telnyx-voice-event";

export type TelnyxVerifiedWebhookEventNormalizationFailureReason =
    | "invalid-json"
    | "invalid-payload"
    | "unsupported-event";

export type TelnyxVerifiedWebhookEventNormalizationResult =
    | {
        readonly normalized: true;
        readonly event: TelnyxVoiceEvent;
    }
    | {
        readonly normalized: false;
        readonly reason:
            TelnyxVerifiedWebhookEventNormalizationFailureReason;
    };

function parseVerifiedWebhookJson(
    rawBody: string
): unknown | undefined {
    try {
        return JSON.parse(
            rawBody
        ) as unknown;
    }
    catch(error){
        if(error instanceof SyntaxError){
            return undefined;
        }

        throw error;
    }
}

export function normalizeVerifiedTelnyxWebhookVoiceEvent(
    rawBody: string
): TelnyxVerifiedWebhookEventNormalizationResult {
    const parsed =
        parseVerifiedWebhookJson(
            rawBody
        );

    if(parsed === undefined){
        return {
            normalized: false,
            reason: "invalid-json"
        };
    }

    try {
        const event =
            normalizeTelnyxVoiceEvent(
                parsed
            );

        if(event === undefined){
            return {
                normalized: false,
                reason: "unsupported-event"
            };
        }

        return {
            normalized: true,
            event
        };
    }
    catch(error){
        if(error instanceof TypeError){
            return {
                normalized: false,
                reason: "invalid-payload"
            };
        }

        throw error;
    }
}
