import {
    planTelnyxCorrelatedAttemptEventReconciliation
} from "./telnyx-correlated-attempt-reconciliation";

import type {
    InsuranceContactAttempt,
    InsuranceContactAttemptId
} from "./contact-attempt";

import type {
    ExecuteTelnyxCorrelatedAttemptReconciliationInput,
    ExecuteTelnyxCorrelatedAttemptReconciliationResult
} from "./d1-telnyx-correlated-attempt-reconciliation";

import type {
    ApplyTelnyxCorrelatedBridgeEventInput,
    ApplyTelnyxCorrelatedBridgeEventResult
} from "./telnyx-bridge-event-application";

import type {
    ResolvedTelnyxCorrelatedEvent,
    ResolveTelnyxCorrelatedEventResult
} from "./telnyx-correlated-event";

import type {
    TelnyxCallLegRole
} from "./telnyx-call-correlation";

import type {
    TelnyxVoiceEvent
} from "./telnyx-voice-event";


export interface TelnyxCorrelatedEventApplicationResolver {
    resolve(
        event:
            TelnyxVoiceEvent
    ):
        Promise<
            ResolveTelnyxCorrelatedEventResult
        >;
}


export interface TelnyxCorrelatedEventApplicationBridgeService {
    apply(
        input:
            ApplyTelnyxCorrelatedBridgeEventInput
    ):
        Promise<
            ApplyTelnyxCorrelatedBridgeEventResult
        >;
}


export interface TelnyxCorrelatedEventApplicationAttemptLookup {
    getAttempt(
        attemptId:
            InsuranceContactAttemptId
    ):
        Promise<
            InsuranceContactAttempt |
            undefined
        >;
}


export interface TelnyxCorrelatedEventApplicationAttemptExecutor {
    execute(
        input:
            ExecuteTelnyxCorrelatedAttemptReconciliationInput
    ):
        Promise<
            ExecuteTelnyxCorrelatedAttemptReconciliationResult
        >;
}


export interface TelnyxCorrelatedEventApplicationDependencies {
    readonly resolver:
        TelnyxCorrelatedEventApplicationResolver;

    readonly bridgeApplication:
        TelnyxCorrelatedEventApplicationBridgeService;

    readonly attempts:
        TelnyxCorrelatedEventApplicationAttemptLookup;

    readonly attemptExecutor:
        TelnyxCorrelatedEventApplicationAttemptExecutor;
}


export interface ApplyTelnyxCorrelatedEventInput {
    readonly event:
        TelnyxVoiceEvent;

    readonly receivedAt:
        string;
}


export type ApplyTelnyxCorrelatedEventResult =
    | {
        readonly handled:
            false;

        readonly reason:
            "correlation-not-found";
    }
    | {
        readonly handled:
            false;

        readonly reason:
            "orphaned-correlation";

        readonly attemptId:
            InsuranceContactAttemptId;

        readonly legRole:
            TelnyxCallLegRole;
    }
    | {
        readonly handled:
            false;

        readonly reason:
            "bridge-not-found";

        readonly attemptId:
            InsuranceContactAttemptId;

        readonly bridgeReplanned:
            boolean;
    }
    | {
        readonly handled:
            false;

        readonly reason:
            "stale-bridge";

        readonly attemptId:
            InsuranceContactAttemptId;

        readonly retryable:
            true;

        readonly bridgeReplanned:
            true;
    }
    | {
        readonly handled:
            true;

        readonly outcome:
            "deferred";

        readonly attemptId:
            InsuranceContactAttemptId;

        readonly retryable:
            true;

        readonly bridgeReplanned:
            boolean;

        readonly attemptReplanned:
            false;
    }
    | {
        readonly handled:
            false;

        readonly reason:
            "attempt-not-found";

        readonly attemptId:
            InsuranceContactAttemptId;

        readonly bridgeReplanned:
            boolean;

        readonly attemptReplanned:
            true;
    }
    | {
        readonly handled:
            false;

        readonly reason:
            "stale-attempt";

        readonly attemptId:
            InsuranceContactAttemptId;

        readonly retryable:
            true;

        readonly bridgeReplanned:
            boolean;

        readonly attemptReplanned:
            true;
    }
    | {
        readonly handled:
            true;

        readonly outcome:
            "applied";

        readonly attemptId:
            InsuranceContactAttemptId;

        readonly duplicate:
            boolean;

        readonly attemptUpdated:
            boolean;

        readonly bridgeOutcome:
            "no-op" |
            "updated";

        readonly bridgeReplanned:
            boolean;

        readonly attemptReplanned:
            boolean;
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
            "Correlated Telnyx event application requires receivedAt to be a valid timestamp."
        );
    }

    return value.trim();
}


function refreshedCorrelation(
    correlated:
        ResolvedTelnyxCorrelatedEvent,
    attempt:
        InsuranceContactAttempt
):
    ResolvedTelnyxCorrelatedEvent {

    if(
        attempt.attemptId !==
            correlated.correlation.attemptId
    ){
        throw new Error(
            "Correlated Telnyx event application requires refreshed attempt identity to match persisted correlation attemptId."
        );
    }

    return {
        event:
            correlated.event,
        attempt,
        correlation:
            correlated.correlation,
        legRole:
            correlated.legRole
    };
}


async function executeAttempt(
    dependencies:
        TelnyxCorrelatedEventApplicationDependencies,
    correlated:
        ResolvedTelnyxCorrelatedEvent,
    receivedAt:
        string
):
    Promise<
        ExecuteTelnyxCorrelatedAttemptReconciliationResult
    > {

    const plan =
        planTelnyxCorrelatedAttemptEventReconciliation(
            correlated
        );

    return dependencies
        .attemptExecutor
        .execute({
            correlated,
            plan,
            receivedAt
        });
}


export function createTelnyxCorrelatedEventApplicationService(
    dependencies:
        TelnyxCorrelatedEventApplicationDependencies
){
    return {
        async apply(
            input:
                ApplyTelnyxCorrelatedEventInput
        ):
            Promise<
                ApplyTelnyxCorrelatedEventResult
            > {

            const receivedAt =
                requireTimestamp(
                    input.receivedAt
                );

            const resolution =
                await dependencies
                    .resolver
                    .resolve(
                        input.event
                    );

            if(!resolution.resolved){
                if(
                    resolution.reason ===
                        "correlation-not-found"
                ){
                    return {
                        handled:
                            false,
                        reason:
                            "correlation-not-found"
                    };
                }

                return {
                    handled:
                        false,
                    reason:
                        "orphaned-correlation",
                    attemptId:
                        resolution.attemptId,
                    legRole:
                        resolution.legRole
                };
            }

            const correlated =
                resolution.value;

            const bridgeResult =
                await dependencies
                    .bridgeApplication
                    .apply({
                        correlated
                    });

            if(!bridgeResult.handled){
                if(
                    bridgeResult.reason ===
                        "bridge-not-found"
                ){
                    return {
                        handled:
                            false,
                        reason:
                            "bridge-not-found",
                        attemptId:
                            bridgeResult.attemptId,
                        bridgeReplanned:
                            bridgeResult.replanned
                    };
                }

                return {
                    handled:
                        false,
                    reason:
                        "stale-bridge",
                    attemptId:
                        bridgeResult.attemptId,
                    retryable:
                        true,
                    bridgeReplanned:
                        true
                };
            }

            if(
                bridgeResult.outcome ===
                    "deferred"
            ){
                return {
                    handled:
                        true,
                    outcome:
                        "deferred",
                    attemptId:
                        correlated.attempt.attemptId,
                    retryable:
                        true,
                    bridgeReplanned:
                        bridgeResult.replanned,
                    attemptReplanned:
                        false
                };
            }

            const initialAttemptResult =
                await executeAttempt(
                    dependencies,
                    correlated,
                    receivedAt
                );

            if(initialAttemptResult.ok){
                return {
                    handled:
                        true,
                    outcome:
                        "applied",
                    attemptId:
                        correlated.attempt.attemptId,
                    duplicate:
                        initialAttemptResult.duplicate,
                    attemptUpdated:
                        initialAttemptResult.attemptUpdated,
                    bridgeOutcome:
                        bridgeResult.outcome,
                    bridgeReplanned:
                        bridgeResult.replanned,
                    attemptReplanned:
                        false
                };
            }

            const freshAttempt =
                await dependencies
                    .attempts
                    .getAttempt(
                        correlated.correlation.attemptId
                    );

            if(
                freshAttempt ===
                    undefined
            ){
                return {
                    handled:
                        false,
                    reason:
                        "attempt-not-found",
                    attemptId:
                        correlated.correlation.attemptId,
                    bridgeReplanned:
                        bridgeResult.replanned,
                    attemptReplanned:
                        true
                };
            }

            const freshCorrelated =
                refreshedCorrelation(
                    correlated,
                    freshAttempt
                );

            const retryAttemptResult =
                await executeAttempt(
                    dependencies,
                    freshCorrelated,
                    receivedAt
                );

            if(retryAttemptResult.ok){
                return {
                    handled:
                        true,
                    outcome:
                        "applied",
                    attemptId:
                        freshAttempt.attemptId,
                    duplicate:
                        retryAttemptResult.duplicate,
                    attemptUpdated:
                        retryAttemptResult.attemptUpdated,
                    bridgeOutcome:
                        bridgeResult.outcome,
                    bridgeReplanned:
                        bridgeResult.replanned,
                    attemptReplanned:
                        true
                };
            }

            return {
                handled:
                    false,
                reason:
                    "stale-attempt",
                attemptId:
                    freshAttempt.attemptId,
                retryable:
                    true,
                bridgeReplanned:
                    bridgeResult.replanned,
                attemptReplanned:
                    true
            };
        }
    };
}
