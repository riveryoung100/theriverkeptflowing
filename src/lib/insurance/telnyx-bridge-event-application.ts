import {
    planTelnyxCorrelatedBridgeReconciliation
} from "./telnyx-bridge-reconciliation";

import type {
    CompareAndSetTelnyxCallBridgeResult
} from "./d1-telnyx-call-bridge";

import type {
    InsuranceContactAttemptId
} from "./contact-attempt";

import type {
    TelnyxCallBridge
} from "./telnyx-call-bridge";

import type {
    TelnyxBridgeReconciliationPlan,
    TelnyxBridgeReconciliationReason
} from "./telnyx-bridge-reconciliation";

import type {
    ResolvedTelnyxCorrelatedEvent
} from "./telnyx-correlated-event";


export interface TelnyxBridgeEventApplicationPersistence {
    getBridge(
        attemptId:
            InsuranceContactAttemptId
    ):
        Promise<
            TelnyxCallBridge |
            undefined
        >;

    compareAndSetBridge(
        previous:
            TelnyxCallBridge,
        next:
            TelnyxCallBridge
    ):
        Promise<
            CompareAndSetTelnyxCallBridgeResult
        >;
}


export interface TelnyxBridgeEventApplicationDependencies {
    readonly bridges:
        TelnyxBridgeEventApplicationPersistence;
}


export interface ApplyTelnyxCorrelatedBridgeEventInput {
    readonly correlated:
        ResolvedTelnyxCorrelatedEvent;
}


export type ApplyTelnyxCorrelatedBridgeEventResult =
    | {
        readonly handled:
            false;

        readonly reason:
            "bridge-not-found";

        readonly attemptId:
            InsuranceContactAttemptId;

        readonly replanned:
            boolean;
    }
    | {
        readonly handled:
            true;

        readonly outcome:
            "no-op";

        readonly reason:
            TelnyxBridgeReconciliationReason;

        readonly bridge:
            TelnyxCallBridge;

        readonly replanned:
            boolean;
    }
    | {
        readonly handled:
            true;

        readonly outcome:
            "deferred";

        readonly reason:
            TelnyxBridgeReconciliationReason;

        readonly bridge:
            TelnyxCallBridge;

        readonly retryable:
            true;

        readonly replanned:
            boolean;
    }
    | {
        readonly handled:
            true;

        readonly outcome:
            "updated";

        readonly reason:
            TelnyxBridgeReconciliationReason;

        readonly bridge:
            TelnyxCallBridge;

        readonly replanned:
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

        readonly replanned:
            true;
    };


function assertCorrelatedAttemptIdentity(
    correlated:
        ResolvedTelnyxCorrelatedEvent
):
    InsuranceContactAttemptId {

    if(
        correlated.attempt.attemptId !==
        correlated.correlation.attemptId
    ){
        throw new Error(
            "Telnyx bridge event application requires matching correlated attempt identity."
        );
    }

    return correlated.attempt.attemptId;
}


function resultFromPassivePlan(
    plan:
        Extract<
            TelnyxBridgeReconciliationPlan,
            {
                readonly kind:
                    "no-op" |
                    "defer";
            }
        >,
    replanned:
        boolean
):
    ApplyTelnyxCorrelatedBridgeEventResult {

    if(plan.kind === "no-op"){
        return {
            handled:
                true,
            outcome:
                "no-op",
            reason:
                plan.reason,
            bridge:
                plan.bridge,
            replanned
        };
    }

    return {
        handled:
            true,
        outcome:
            "deferred",
        reason:
            plan.reason,
        bridge:
            plan.bridge,
        retryable:
            true,
        replanned
    };
}


async function applyPlan(
    bridges:
        TelnyxBridgeEventApplicationPersistence,
    plan:
        TelnyxBridgeReconciliationPlan,
    replanned:
        boolean
):
    Promise<
        ApplyTelnyxCorrelatedBridgeEventResult |
        {
            readonly stale:
                true;
        }
    > {

    if(
        plan.kind ===
            "no-op" ||
        plan.kind ===
            "defer"
    ){
        return resultFromPassivePlan(
            plan,
            replanned
        );
    }

    const result =
        await bridges
            .compareAndSetBridge(
                plan.previous,
                plan.next
            );

    if(!result.updated){
        return {
            stale:
                true
        };
    }

    return {
        handled:
            true,
        outcome:
            "updated",
        reason:
            plan.reason,
        bridge:
            result.bridge,
        replanned
    };
}


export function createTelnyxBridgeEventApplicationService(
    dependencies:
        TelnyxBridgeEventApplicationDependencies
){
    return {
        async apply(
            input:
                ApplyTelnyxCorrelatedBridgeEventInput
        ):
            Promise<
                ApplyTelnyxCorrelatedBridgeEventResult
            > {

            const attemptId =
                assertCorrelatedAttemptIdentity(
                    input.correlated
                );

            const initialBridge =
                await dependencies
                    .bridges
                    .getBridge(
                        attemptId
                    );

            if(
                initialBridge ===
                    undefined
            ){
                return {
                    handled:
                        false,
                    reason:
                        "bridge-not-found",
                    attemptId,
                    replanned:
                        false
                };
            }

            const initialPlan =
                planTelnyxCorrelatedBridgeReconciliation(
                    initialBridge,
                    input.correlated
                );

            const initialResult =
                await applyPlan(
                    dependencies.bridges,
                    initialPlan,
                    false
                );

            if(
                !(
                    "stale" in
                    initialResult
                )
            ){
                return initialResult;
            }

            const freshBridge =
                await dependencies
                    .bridges
                    .getBridge(
                        attemptId
                    );

            if(
                freshBridge ===
                    undefined
            ){
                return {
                    handled:
                        false,
                    reason:
                        "bridge-not-found",
                    attemptId,
                    replanned:
                        true
                };
            }

            const freshPlan =
                planTelnyxCorrelatedBridgeReconciliation(
                    freshBridge,
                    input.correlated
                );

            const retryResult =
                await applyPlan(
                    dependencies.bridges,
                    freshPlan,
                    true
                );

            if(
                !(
                    "stale" in
                    retryResult
                )
            ){
                return retryResult;
            }

            return {
                handled:
                    false,
                reason:
                    "stale-bridge",
                attemptId,
                retryable:
                    true,
                replanned:
                    true
            };
        }
    };
}
