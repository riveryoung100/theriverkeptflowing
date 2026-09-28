import type {
    InsuranceContactAttempt,
    InsuranceContactAttemptId
} from "./contact-attempt";

import type {
    TelnyxCallLegCorrelation,
    TelnyxCallLegRole
} from "./telnyx-call-correlation";

import type {
    TelnyxVoiceEvent
} from "./telnyx-voice-event";


export interface TelnyxCorrelatedEventCorrelationLookup {
    getByProviderReference(
        provider:
            "telnyx",
        providerReference:
            string
    ):
        Promise<
            TelnyxCallLegCorrelation |
            undefined
        >;
}


export interface TelnyxCorrelatedEventAttemptLookup {
    getAttempt(
        attemptId:
            InsuranceContactAttemptId
    ):
        Promise<
            InsuranceContactAttempt |
            undefined
        >;
}


export interface TelnyxCorrelatedEventDependencies {
    readonly correlations:
        TelnyxCorrelatedEventCorrelationLookup;

    readonly attempts:
        TelnyxCorrelatedEventAttemptLookup;
}


export interface ResolvedTelnyxCorrelatedEvent {
    readonly event:
        TelnyxVoiceEvent;

    readonly attempt:
        InsuranceContactAttempt;

    readonly correlation:
        TelnyxCallLegCorrelation;

    readonly legRole:
        TelnyxCallLegRole;
}


export type ResolveTelnyxCorrelatedEventResult =
    | {
        readonly resolved:
            true;

        readonly value:
            ResolvedTelnyxCorrelatedEvent;
    }
    | {
        readonly resolved:
            false;

        readonly reason:
            "correlation-not-found";
    }
    | {
        readonly resolved:
            false;

        readonly reason:
            "orphaned-correlation";

        readonly attemptId:
            InsuranceContactAttemptId;

        readonly legRole:
            TelnyxCallLegRole;
    };


function assertCorrelationMatchesEvent(
    correlation:
        TelnyxCallLegCorrelation,
    event:
        TelnyxVoiceEvent
):
    void {

    if(correlation.provider !== "telnyx"){
        throw new TypeError(
            "Correlated Telnyx event requires a telnyx correlation provider."
        );
    }

    if(
        correlation.providerReference !==
        event.callControlId
    ){
        throw new Error(
            "Correlated Telnyx event provider reference does not match event callControlId."
        );
    }
}


function assertAttemptMatchesCorrelation(
    attempt:
        InsuranceContactAttempt,
    correlation:
        TelnyxCallLegCorrelation
):
    void {

    if(
        attempt.attemptId !==
        correlation.attemptId
    ){
        throw new Error(
            "Correlated Telnyx event attempt identity does not match correlation attemptId."
        );
    }
}


export function createTelnyxCorrelatedEventResolver(
    dependencies:
        TelnyxCorrelatedEventDependencies
){

    return {
        async resolve(
            event:
                TelnyxVoiceEvent
        ):
            Promise<
                ResolveTelnyxCorrelatedEventResult
            > {

            const correlation =
                await dependencies
                    .correlations
                    .getByProviderReference(
                        "telnyx",
                        event.callControlId
                    );

            if(correlation === undefined){
                return {
                    resolved:
                        false,
                    reason:
                        "correlation-not-found"
                };
            }

            assertCorrelationMatchesEvent(
                correlation,
                event
            );

            const attempt =
                await dependencies
                    .attempts
                    .getAttempt(
                        correlation.attemptId
                    );

            if(attempt === undefined){
                return {
                    resolved:
                        false,
                    reason:
                        "orphaned-correlation",
                    attemptId:
                        correlation.attemptId,
                    legRole:
                        correlation.legRole
                };
            }

            assertAttemptMatchesCorrelation(
                attempt,
                correlation
            );

            return {
                resolved:
                    true,
                value: {
                    event,
                    attempt,
                    correlation,
                    legRole:
                        correlation.legRole
                }
            };
        }
    };
}
