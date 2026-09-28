import type {
    InsuranceContactAttempt,
    InsuranceContactAttemptId
} from "./contact-attempt";

import {
    planTelnyxAttemptEventReconciliation
} from "./telnyx-event-reconciliation";

import type {
    ExecuteTelnyxContactEventReconciliationInput,
    ExecuteTelnyxContactEventReconciliationResult
} from "./d1-contact-event-reconciliation";

import type {
    TelnyxVoiceEvent
} from "./telnyx-voice-event";


export interface TelnyxEventApplicationAttemptLookup {
    getAttemptByProviderReference(
        provider:
            string,
        providerReference:
            string
    ):
        Promise<
            InsuranceContactAttempt |
            undefined
        >;
}


export interface TelnyxEventApplicationExecutor {
    execute(
        input:
            ExecuteTelnyxContactEventReconciliationInput
    ):
        Promise<
            ExecuteTelnyxContactEventReconciliationResult
        >;
}


export interface TelnyxEventApplicationDependencies {
    readonly attempts:
        TelnyxEventApplicationAttemptLookup;

    readonly executor:
        TelnyxEventApplicationExecutor;
}


export interface ApplyTelnyxVoiceEventInput {
    readonly event:
        TelnyxVoiceEvent;

    readonly receivedAt:
        string;
}


export type ApplyTelnyxVoiceEventResult =
    | {
        readonly handled:
            false;

        readonly reason:
            "attempt-not-found";
    }
    | {
        readonly handled:
            true;

        readonly attemptId:
            InsuranceContactAttemptId;

        readonly duplicate:
            boolean;

        readonly attemptUpdated:
            boolean;

        readonly replanned:
            boolean;
    }
    | {
        readonly handled:
            false;

        readonly reason:
            "stale-attempt";

        readonly retryable:
            true;

        readonly attemptId:
            InsuranceContactAttemptId;

        readonly replanned:
            true;
    };


function requireTimestamp(
    value:
        unknown
):
    string {

    if(
        typeof value !==
            "string" ||
        value.trim().length ===
            0 ||
        Number.isNaN(
            Date.parse(
                value
            )
        )
    ){
        throw new TypeError(
            "Telnyx event application requires receivedAt to be a valid timestamp."
        );
    }

    return value.trim();
}


async function findAttempt(
    dependencies:
        TelnyxEventApplicationDependencies,
    event:
        TelnyxVoiceEvent
):
    Promise<
        InsuranceContactAttempt |
        undefined
    > {

    return dependencies
        .attempts
        .getAttemptByProviderReference(
            "telnyx",
            event.callControlId
        );
}


async function executeAgainstAttempt(
    dependencies:
        TelnyxEventApplicationDependencies,
    event:
        TelnyxVoiceEvent,
    attempt:
        InsuranceContactAttempt,
    receivedAt:
        string
):
    Promise<
        ExecuteTelnyxContactEventReconciliationResult
    > {

    const plan =
        planTelnyxAttemptEventReconciliation(
            attempt,
            event
        );

    return dependencies
        .executor
        .execute({
            event,
            plan,
            receivedAt
        });
}


export function createTelnyxEventApplicationService(
    dependencies:
        TelnyxEventApplicationDependencies
){
    return {
        async apply(
            input:
                ApplyTelnyxVoiceEventInput
        ):
            Promise<
                ApplyTelnyxVoiceEventResult
            > {

            const receivedAt =
                requireTimestamp(
                    input.receivedAt
                );

            const initialAttempt =
                await findAttempt(
                    dependencies,
                    input.event
                );

            if(
                initialAttempt ===
                    undefined
            ){
                return {
                    handled:
                        false,
                    reason:
                        "attempt-not-found"
                };
            }

            const initialResult =
                await executeAgainstAttempt(
                    dependencies,
                    input.event,
                    initialAttempt,
                    receivedAt
                );

            if(initialResult.ok){
                return {
                    handled:
                        true,
                    attemptId:
                        initialAttempt.attemptId,
                    duplicate:
                        initialResult.duplicate,
                    attemptUpdated:
                        initialResult.attemptUpdated,
                    replanned:
                        false
                };
            }

            const freshAttempt =
                await findAttempt(
                    dependencies,
                    input.event
                );

            if(
                freshAttempt ===
                    undefined
            ){
                return {
                    handled:
                        false,
                    reason:
                        "attempt-not-found"
                };
            }

            const retryResult =
                await executeAgainstAttempt(
                    dependencies,
                    input.event,
                    freshAttempt,
                    receivedAt
                );

            if(retryResult.ok){
                return {
                    handled:
                        true,
                    attemptId:
                        freshAttempt.attemptId,
                    duplicate:
                        retryResult.duplicate,
                    attemptUpdated:
                        retryResult.attemptUpdated,
                    replanned:
                        true
                };
            }

            return {
                handled:
                    false,
                reason:
                    "stale-attempt",
                retryable:
                    true,
                attemptId:
                    freshAttempt.attemptId,
                replanned:
                    true
            };
        }
    };
}
