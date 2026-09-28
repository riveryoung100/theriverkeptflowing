import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceContactAttempt,
    transitionInsuranceContactAttempt
} from "./contact-attempt";

import {
    planTelnyxAttemptEventReconciliation
} from "./telnyx-event-reconciliation";

import type {
    InsuranceContactAttempt
} from "./contact-attempt";

import type {
    TelnyxVoiceEvent,
    TelnyxVoiceEventType
} from "./telnyx-voice-event";


const requestedAt =
    "2026-09-28T20:00:00.000Z";

const attemptedAt =
    "2026-09-28T20:00:01.000Z";

const bridgedAt =
    "2026-09-28T20:00:10.000Z";

const hangupAt =
    "2026-09-28T20:05:00.000Z";


function attempting():
    InsuranceContactAttempt {

    const queued =
        createInsuranceContactAttempt({
            attemptId:
                "contact-attempt:reconciliation-1",
            relationshipId:
                "relationship:reconciliation-1",
            channel:
                "phone",
            intent:
                "instant-contact",
            state:
                "queued",
            idempotencyKey:
                "contact-idempotency:reconciliation-1",
            provider:
                "telnyx",
            providerReference:
                "call-control-1",
            requestedAt,
            createdAt:
                requestedAt,
            updatedAt:
                requestedAt
        });

    return transitionInsuranceContactAttempt(
        queued,
        "attempting",
        attemptedAt
    );
}


function event(
    type:
        TelnyxVoiceEventType,
    occurredAt:
        string = bridgedAt
):
    TelnyxVoiceEvent {

    return {
        provider:
            "telnyx",
        providerEventId:
            `event-${type}`,
        type,
        occurredAt,
        callControlId:
            "call-control-1",
        callLegId:
            "call-leg-1",
        callSessionId:
            "call-session-1"
    };
}


test(
    "initiated evidence does not advance canonical attempt",
    () => {
        const current =
            attempting();

        assert.deepEqual(
            planTelnyxAttemptEventReconciliation(
                current,
                event(
                    "call.initiated"
                )
            ),
            {
                kind:
                    "no-op",
                reason:
                    "initiated-observed",
                attempt:
                    current
            }
        );
    }
);


test(
    "answered evidence does not advance canonical attempt in operator-first topology",
    () => {
        const current =
            attempting();

        const plan =
            planTelnyxAttemptEventReconciliation(
                current,
                event(
                    "call.answered"
                )
            );

        assert.equal(
            plan.kind,
            "no-op"
        );

        assert.equal(
            plan.reason,
            "answered-observed"
        );

        assert.equal(
            current.state,
            "attempting"
        );
    }
);


test(
    "bridged evidence advances attempting attempt to connected",
    () => {
        const current =
            attempting();

        const plan =
            planTelnyxAttemptEventReconciliation(
                current,
                event(
                    "call.bridged",
                    bridgedAt
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
            plan.previous,
            current
        );

        assert.equal(
            plan.next.state,
            "connected"
        );

        assert.equal(
            plan.next.connectedAt,
            bridgedAt
        );

        assert.equal(
            plan.next.providerReference,
            "call-control-1"
        );
    }
);


test(
    "duplicate bridged evidence against connected attempt is idempotent no-op",
    () => {
        const current =
            transitionInsuranceContactAttempt(
                attempting(),
                "connected",
                bridgedAt
            );

        const plan =
            planTelnyxAttemptEventReconciliation(
                current,
                event(
                    "call.bridged",
                    bridgedAt
                )
            );

        assert.equal(
            plan.kind,
            "no-op"
        );

        assert.equal(
            plan.reason,
            "bridged-already-advanced"
        );
    }
);


test(
    "hangup evidence completes attempting attempt",
    () => {
        const current =
            attempting();

        const plan =
            planTelnyxAttemptEventReconciliation(
                current,
                event(
                    "call.hangup",
                    hangupAt
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

        assert.equal(
            plan.next.completedAt,
            hangupAt
        );
    }
);


test(
    "hangup evidence completes connected attempt",
    () => {
        const current =
            transitionInsuranceContactAttempt(
                attempting(),
                "connected",
                bridgedAt
            );

        const plan =
            planTelnyxAttemptEventReconciliation(
                current,
                event(
                    "call.hangup",
                    hangupAt
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

        assert.equal(
            plan.next.connectedAt,
            bridgedAt
        );

        assert.equal(
            plan.next.completedAt,
            hangupAt
        );
    }
);


test(
    "duplicate hangup against completed attempt is idempotent no-op",
    () => {
        const connected =
            transitionInsuranceContactAttempt(
                attempting(),
                "connected",
                bridgedAt
            );

        const completed =
            transitionInsuranceContactAttempt(
                connected,
                "completed",
                hangupAt
            );

        const plan =
            planTelnyxAttemptEventReconciliation(
                completed,
                event(
                    "call.hangup",
                    hangupAt
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
    "late bridged evidence cannot regress completed attempt",
    () => {
        const completed =
            transitionInsuranceContactAttempt(
                attempting(),
                "completed",
                hangupAt
            );

        const plan =
            planTelnyxAttemptEventReconciliation(
                completed,
                event(
                    "call.bridged",
                    bridgedAt
                )
            );

        assert.equal(
            plan.kind,
            "no-op"
        );

        assert.equal(
            plan.attempt.state,
            "completed"
        );
    }
);


test(
    "hangup cause does not infer canonical failed state",
    () => {
        const current =
            attempting();

        const hangup:
            TelnyxVoiceEvent = {
                ...event(
                    "call.hangup",
                    hangupAt
                ),
                hangupCause:
                    "originator_cancel",
                hangupSource:
                    "caller",
                sipHangupCause:
                    "487"
            };

        const plan =
            planTelnyxAttemptEventReconciliation(
                current,
                hangup
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

        assert.equal(
            plan.next.failureCode,
            undefined
        );

        assert.equal(
            plan.next.retryable,
            undefined
        );
    }
);


test(
    "reconciliation rejects non-Telnyx attempt provider",
    () => {
        const current =
            createInsuranceContactAttempt({
                ...attempting(),
                provider:
                    "other-provider"
            });

        assert.throws(
            () =>
                planTelnyxAttemptEventReconciliation(
                    current,
                    event(
                        "call.bridged"
                    )
                ),
            /requires a Telnyx contact attempt/
        );
    }
);


test(
    "reconciliation rejects mismatched provider reference",
    () => {
        const current =
            attempting();

        const mismatched:
            TelnyxVoiceEvent = {
                ...event(
                    "call.bridged"
                ),
                callControlId:
                    "different-call-control"
            };

        assert.throws(
            () =>
                planTelnyxAttemptEventReconciliation(
                    current,
                    mismatched
                ),
            /matching providerReference and callControlId/
        );
    }
);


test(
    "failed terminal attempt ignores later hangup evidence without reset",
    () => {
        const failed =
            transitionInsuranceContactAttempt(
                attempting(),
                "failed",
                hangupAt,
                {
                    failureCode:
                        "provider-error",
                    failureMessage:
                        "Provider error.",
                    retryable:
                        true
                }
            );

        const plan =
            planTelnyxAttemptEventReconciliation(
                failed,
                event(
                    "call.hangup",
                    hangupAt
                )
            );

        assert.equal(
            plan.kind,
            "no-op"
        );

        assert.equal(
            plan.attempt.state,
            "failed"
        );
    }
);
