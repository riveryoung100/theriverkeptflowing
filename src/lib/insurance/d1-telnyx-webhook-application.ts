import {
    createD1TelnyxCorrelatedEventApplicationService,
    type D1TelnyxCorrelatedEventApplicationDatabase
} from "./d1-telnyx-correlated-event-application";

import type {
    ApplyTelnyxCorrelatedEventResult
} from "./telnyx-correlated-event-application";

import type {
    TelnyxVoiceEvent
} from "./telnyx-voice-event";

import {
    mapTelnyxCorrelatedEventApplicationToWebhookAcknowledgement,
    type TelnyxWebhookAcknowledgement
} from "./telnyx-webhook-acknowledgement";

export interface ApplyD1TelnyxWebhookEventInput {
    readonly event:
        TelnyxVoiceEvent;

    readonly receivedAt:
        string;
}

export interface ApplyD1TelnyxWebhookEventResult {
    readonly application:
        ApplyTelnyxCorrelatedEventResult;

    readonly acknowledgement:
        TelnyxWebhookAcknowledgement;
}

export interface D1TelnyxWebhookApplicationService {
    apply(
        input:
            ApplyD1TelnyxWebhookEventInput
    ):
        Promise<
            ApplyD1TelnyxWebhookEventResult
        >;
}

export function createD1TelnyxWebhookApplicationService(
    database:
        D1TelnyxCorrelatedEventApplicationDatabase
):
    D1TelnyxWebhookApplicationService {

    const application =
        createD1TelnyxCorrelatedEventApplicationService(
            database
        );

    return {
        async apply(
            input:
                ApplyD1TelnyxWebhookEventInput
        ):
            Promise<
                ApplyD1TelnyxWebhookEventResult
            > {

            const applicationResult =
                await application.apply({
                    event:
                        input.event,
                    receivedAt:
                        input.receivedAt
                });

            return {
                application:
                    applicationResult,
                acknowledgement:
                    mapTelnyxCorrelatedEventApplicationToWebhookAcknowledgement(
                        applicationResult
                    )
            };
        }
    };
}
