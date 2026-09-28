import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceContactAttempt,
    createInsuranceContactAttemptId,
    createInsuranceContactIdempotencyKey
} from "./contact-attempt";

import {
    createTelnyxCallBridge,
    transitionTelnyxCallBridge
} from "./telnyx-call-bridge";

import {
    createTelnyxCallLegCorrelation
} from "./telnyx-call-correlation";

import {
    planTelnyxCorrelatedBridgeReconciliation
} from "./telnyx-bridge-reconciliation";

import type {
    ResolvedTelnyxCorrelatedEvent
} from "./telnyx-correlated-event";

import type {
    TelnyxCallBridge
} from "./telnyx-call-bridge";

import type {
    TelnyxCallLegRole
} from "./telnyx-call-correlation";

import type {
    TelnyxVoiceEventType
} from "./telnyx-voice-event";


const attemptId =
    createInsuranceContactAttemptId(
        "contact-attempt:e2c3b-1"
    );

const baseTime =
    "2026-09-28T21:30:00.000Z";

const eventTime =
    "2026-09-28T21:30:10.000Z";


function attempt(){
    return createInsuranceContactAttempt({
        attemptId,
        relationshipId:
            "relationship:e2c3b-1",
        channel:
            "phone",
        intent:
            "instant-contact",
        state:
            "attempting",
        idempotencyKey:
            createInsuranceContactIdempotencyKey(
                "contact-idempotency:e2c3b-1"
            ),
        provider:
            "telnyx",
        providerReference:
            "operator-call",
        requestedAt:
            baseTime,
        attemptedAt:
            baseTime,
        createdAt:
            baseTime,
        updatedAt:
            baseTime
    });
}


function correlated(
    legRole:
        TelnyxCallLegRole,
    type:
        TelnyxVoiceEventType
):
    ResolvedTelnyxCorrelatedEvent {

    const callControlId =
        legRole ===
            "operator"
            ? "operator-call"
            : "lead-call";

    const correlation =
        createTelnyxCallLegCorrelation({
            attemptId,
            legRole,
            providerReference:
                callControlId,
            createdAt:
                baseTime
        });

    return {
        event: {
            provider:
                "telnyx",
            providerEventId:
                `event:${legRole}:${type}`,
            type,
            occurredAt:
                eventTime,
            callControlId
        },
        attempt:
            attempt(),
        correlation,
        legRole
    };
}


function initialBridge(){
    return createTelnyxCallBridge({
        attemptId,
        createdAt:
            baseTime
    });
}


function operatorAnsweredBridge(){
    return transitionTelnyxCallBridge(
        initialBridge(),
        "operator-answered",
        "2026-09-28T21:30:01.000Z",
        {
            operatorCallControlId:
                "operator-call"
        }
    );
}


function leadDialBridge(){
    return transitionTelnyxCallBridge(
        operatorAnsweredBridge(),
        "lead-dial-requested",
        "2026-09-28T21:30:02.000Z"
    );
}


function leadAnsweredBridge(){
    return transitionTelnyxCallBridge(
        leadDialBridge(),
        "lead-answered",
        "2026-09-28T21:30:03.000Z",
        {
            leadCallControlId:
                "lead-call"
        }
    );
}


function bridgeRequested(){
    return transitionTelnyxCallBridge(
        leadAnsweredBridge(),
        "bridge-requested",
        "2026-09-28T21:30:04.000Z"
    );
}


function bridgedBridge(){
    return transitionTelnyxCallBridge(
        bridgeRequested(),
        "bridged",
        "2026-09-28T21:30:05.000Z"
    );
}


test(
    "initiated event is observational no-op",
    () => {
        const bridge =
            initialBridge();

        const plan =
            planTelnyxCorrelatedBridgeReconciliation(
                bridge,
                correlated(
                    "operator",
                    "call.initiated"
                )
            );

        assert.deepEqual(
            plan,
            {
                kind:
                    "no-op",
                reason:
                    "initiated-observed",
                bridge
            }
        );
    }
);


test(
    "operator answered advances initial bridge and records operator identity",
    () => {
        const bridge =
            initialBridge();

        const plan =
            planTelnyxCorrelatedBridgeReconciliation(
                bridge,
                correlated(
                    "operator",
                    "call.answered"
                )
            );

        assert.equal(
            plan.kind,
            "update"
        );

        if(plan.kind !== "update"){
            return;
        }

        assert.equal(
            plan.next.state,
            "operator-answered"
        );

        assert.equal(
            plan.next.operatorCallControlId,
            "operator-call"
        );
    }
);


test(
    "duplicate operator answer after bridge has advanced is no-op",
    () => {
        const bridge =
            leadDialBridge();

        const plan =
            planTelnyxCorrelatedBridgeReconciliation(
                bridge,
                correlated(
                    "operator",
                    "call.answered"
                )
            );

        assert.equal(
            plan.kind,
            "no-op"
        );

        assert.equal(
            plan.reason,
            "operator-answer-already-observed"
        );
    }
);


test(
    "lead answer before operator answer is deferred",
    () => {
        const bridge =
            initialBridge();

        const plan =
            planTelnyxCorrelatedBridgeReconciliation(
                bridge,
                correlated(
                    "lead",
                    "call.answered"
                )
            );

        assert.deepEqual(
            plan,
            {
                kind:
                    "defer",
                reason:
                    "lead-answer-before-operator",
                bridge,
                retryable:
                    true
            }
        );
    }
);


test(
    "lead answer catches up from operator-answered through lead-dial-requested",
    () => {
        const bridge =
            operatorAnsweredBridge();

        const plan =
            planTelnyxCorrelatedBridgeReconciliation(
                bridge,
                correlated(
                    "lead",
                    "call.answered"
                )
            );

        assert.equal(
            plan.kind,
            "update"
        );

        if(plan.kind !== "update"){
            return;
        }

        assert.equal(
            plan.next.state,
            "lead-answered"
        );

        assert.equal(
            plan.next.operatorCallControlId,
            "operator-call"
        );

        assert.equal(
            plan.next.leadCallControlId,
            "lead-call"
        );
    }
);


test(
    "lead answer advances lead-dial-requested directly",
    () => {
        const bridge =
            leadDialBridge();

        const plan =
            planTelnyxCorrelatedBridgeReconciliation(
                bridge,
                correlated(
                    "lead",
                    "call.answered"
                )
            );

        assert.equal(
            plan.kind,
            "update"
        );

        if(plan.kind !== "update"){
            return;
        }

        assert.equal(
            plan.next.state,
            "lead-answered"
        );

        assert.equal(
            plan.next.leadCallControlId,
            "lead-call"
        );
    }
);


test(
    "bridged evidence before lead answer is deferred",
    () => {
        const bridge =
            leadDialBridge();

        const plan =
            planTelnyxCorrelatedBridgeReconciliation(
                bridge,
                correlated(
                    "lead",
                    "call.bridged"
                )
            );

        assert.equal(
            plan.kind,
            "defer"
        );

        assert.equal(
            plan.reason,
            "bridge-prerequisites-missing"
        );
    }
);


test(
    "bridged evidence catches up lead-answered through bridge-requested",
    () => {
        const bridge =
            leadAnsweredBridge();

        const plan =
            planTelnyxCorrelatedBridgeReconciliation(
                bridge,
                correlated(
                    "lead",
                    "call.bridged"
                )
            );

        assert.equal(
            plan.kind,
            "update"
        );

        if(plan.kind !== "update"){
            return;
        }

        assert.equal(
            plan.next.state,
            "bridged"
        );
    }
);


test(
    "bridged evidence advances bridge-requested directly",
    () => {
        const bridge =
            bridgeRequested();

        const plan =
            planTelnyxCorrelatedBridgeReconciliation(
                bridge,
                correlated(
                    "operator",
                    "call.bridged"
                )
            );

        assert.equal(
            plan.kind,
            "update"
        );

        if(plan.kind !== "update"){
            return;
        }

        assert.equal(
            plan.next.state,
            "bridged"
        );
    }
);


test(
    "hangup after bridged completes bridge",
    () => {
        const bridge =
            bridgedBridge();

        const plan =
            planTelnyxCorrelatedBridgeReconciliation(
                bridge,
                correlated(
                    "lead",
                    "call.hangup"
                )
            );

        assert.equal(
            plan.kind,
            "update"
        );

        if(plan.kind !== "update"){
            return;
        }

        assert.equal(
            plan.next.state,
            "completed"
        );
    }
);


test(
    "operator hangup before bridge fails bridge with deterministic code",
    () => {
        const bridge =
            operatorAnsweredBridge();

        const plan =
            planTelnyxCorrelatedBridgeReconciliation(
                bridge,
                correlated(
                    "operator",
                    "call.hangup"
                )
            );

        assert.equal(
            plan.kind,
            "update"
        );

        if(plan.kind !== "update"){
            return;
        }

        assert.equal(
            plan.next.state,
            "failed"
        );

        assert.equal(
            plan.next.failureCode,
            "operator-hangup-before-bridge"
        );
    }
);


test(
    "lead hangup before bridge fails bridge without copying provider hangup cause",
    () => {
        const bridge =
            leadAnsweredBridge();

        const value =
            correlated(
                "lead",
                "call.hangup"
            );

        const correlatedWithCause:
            ResolvedTelnyxCorrelatedEvent = {
                ...value,
                event: {
                    ...value.event,
                    hangupCause:
                        "provider-specific-cause"
                }
            };

        const plan =
            planTelnyxCorrelatedBridgeReconciliation(
                bridge,
                correlatedWithCause
            );

        assert.equal(
            plan.kind,
            "update"
        );

        if(plan.kind !== "update"){
            return;
        }

        assert.equal(
            plan.next.failureCode,
            "lead-hangup-before-bridge"
        );

        assert.notEqual(
            plan.next.failureCode,
            correlatedWithCause.event.hangupCause
        );
    }
);


test(
    "late hangup against completed bridge is idempotent no-op",
    () => {
        const completed =
            transitionTelnyxCallBridge(
                bridgedBridge(),
                "completed",
                "2026-09-28T21:30:06.000Z"
            );

        const plan =
            planTelnyxCorrelatedBridgeReconciliation(
                completed,
                correlated(
                    "lead",
                    "call.hangup"
                )
            );

        assert.equal(
            plan.kind,
            "no-op"
        );

        assert.equal(
            plan.reason,
            "hangup-already-terminal"
        );
    }
);


test(
    "mismatched canonical attempt identity is rejected",
    () => {
        const otherAttemptId =
            createInsuranceContactAttemptId(
                "contact-attempt:e2c3b-other"
            );

        const bridge:
            TelnyxCallBridge =
                createTelnyxCallBridge({
                    attemptId:
                        otherAttemptId,
                    createdAt:
                        baseTime
                });

        assert.throws(
            () =>
                planTelnyxCorrelatedBridgeReconciliation(
                    bridge,
                    correlated(
                        "operator",
                        "call.answered"
                    )
                ),
            /matching canonical attempt identity/
        );
    }
);
