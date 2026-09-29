import {
    TELNYX_WEBHOOK_SIGNATURE_HEADER,
    TELNYX_WEBHOOK_TIMESTAMP_HEADER,
    verifyTelnyxWebhookSignature
} from "./telnyx-webhook-signature";

import {
    normalizeVerifiedTelnyxWebhookVoiceEvent
} from "./telnyx-verified-webhook-event";

import type {
    ApplyD1TelnyxWebhookEventResult
} from "./d1-telnyx-webhook-application";

export interface ApplyVerifiedTelnyxWebhookEvent {
    apply(
        input: {
            readonly event: import("./telnyx-voice-event").TelnyxVoiceEvent;
            readonly receivedAt: string;
        }
    ): Promise<ApplyD1TelnyxWebhookEventResult>;
}

export interface HandleTelnyxWebhookInput {
    readonly request:
        Request;

    readonly publicKey:
        CryptoKey;

    readonly application:
        ApplyVerifiedTelnyxWebhookEvent;

    readonly nowMs?:
        number;
}

function emptyResponse(
    status:
        number
): Response {
    return new Response(
        null,
        {
            status,
            headers: {
                "cache-control":
                    "no-store"
            }
        }
    );
}

function jsonErrorResponse(
    status:
        number,
    code:
        string
): Response {
    return new Response(
        JSON.stringify({
            ok:
                false,
            error: {
                code
            }
        }),
        {
            status,
            headers: {
                "cache-control":
                    "no-store",
                "content-type":
                    "application/json; charset=utf-8"
            }
        }
    );
}

export async function handleTelnyxWebhook(
    input:
        HandleTelnyxWebhookInput
): Promise<Response> {
    const rawBody =
        await input.request.text();

    const verification =
        await verifyTelnyxWebhookSignature({
            rawBody,
            signature:
                input.request.headers.get(
                    TELNYX_WEBHOOK_SIGNATURE_HEADER
                ),
            timestamp:
                input.request.headers.get(
                    TELNYX_WEBHOOK_TIMESTAMP_HEADER
                ),
            publicKey:
                input.publicKey,
            nowMs:
                input.nowMs
        });

    if(!verification.verified){
        return jsonErrorResponse(
            401,
            verification.reason
        );
    }

    const normalized =
        normalizeVerifiedTelnyxWebhookVoiceEvent(
            rawBody
        );

    if(!normalized.normalized){
        if(
            normalized.reason ===
                "unsupported-event"
        ){
            return emptyResponse(
                204
            );
        }

        return jsonErrorResponse(
            400,
            normalized.reason
        );
    }

    const receivedAt =
        new Date(
            input.nowMs ??
            Date.now()
        ).toISOString();

    const result =
        await input.application.apply({
            event:
                normalized.event,
            receivedAt
        });

    if(
        result.acknowledgement
            .acknowledge
    ){
        return emptyResponse(
            204
        );
    }

    return jsonErrorResponse(
        503,
        "retry"
    );
}
