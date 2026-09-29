import type {
    ApplyTelnyxCorrelatedEventResult
} from "./telnyx-correlated-event-application";

export type TelnyxWebhookAcknowledgementClassification =
    | "accepted"
    | "ignored"
    | "transient";

export type TelnyxWebhookAcknowledgement =
    | {
        readonly acknowledge: true;
        readonly retry: false;
        readonly classification:
            "accepted" |
            "ignored";
    }
    | {
        readonly acknowledge: false;
        readonly retry: true;
        readonly classification:
            "transient";
    };

function assertNever(
    value: never
): never {
    throw new Error(
        `Unhandled Telnyx correlated application result: ${JSON.stringify(value)}`
    );
}

export function mapTelnyxCorrelatedEventApplicationToWebhookAcknowledgement(
    result: ApplyTelnyxCorrelatedEventResult
): TelnyxWebhookAcknowledgement {
    if(result.handled){
        if(result.outcome === "applied"){
            return {
                acknowledge: true,
                retry: false,
                classification:
                    "accepted"
            };
        }

        if(result.outcome === "deferred"){
            return {
                acknowledge: false,
                retry: true,
                classification:
                    "transient"
            };
        }

        return assertNever(
            result
        );
    }

    switch(result.reason){
        case "correlation-not-found":
            return {
                acknowledge: false,
                retry: true,
                classification:
                    "transient"
            };

        case "stale-bridge":
        case "stale-attempt":
            return {
                acknowledge: false,
                retry: true,
                classification:
                    "transient"
            };

        case "orphaned-correlation":
        case "bridge-not-found":
        case "attempt-not-found":
            return {
                acknowledge: true,
                retry: false,
                classification:
                    "ignored"
            };

        default:
            return assertNever(
                result
            );
    }
}
