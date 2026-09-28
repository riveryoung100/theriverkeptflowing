import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceContactAttempt,
    createInsuranceContactAttemptId,
    createInsuranceContactIdempotencyKey,
    transitionInsuranceContactAttempt
} from "./contact-attempt";

import {
    createTelnyxCallLegCorrelation
} from "./telnyx-call-correlation";

import {
    planTelnyxCorrelatedAttemptEventReconciliation
} from "./telnyx-correlated-attempt-reconciliation";

import type {
    InsuranceContactAttempt
} from "./contact-attempt";

import type {
    ResolvedTelnyxCorrelatedEvent
} from "./telnyx-correlated-event";

import type {
    TelnyxCallLegRole
} from "./telnyx-call-correlation";

import type {
    TelnyxVoiceEventType
} from "./telnyx-voice-event";


const attemptId =
    createInsuranceContactAttemptId(
        "contact-attempt:e2c3d1-1"
    );

const baseTime =
    "2026-09-28T22:00:00.000Z";

const eventTime =
    "2026-09-28T22:00:10.000Z";


function attempting():
    InsuranceContactAttempt {

    return createInsuranceContactAttempt({
        attemptId,
        relationshipId:
            "relationship:e2c3d1-1",
        channel:
            "phone",
        intent:
            "instant-contact",
        state:
            "attempting",
        idempotencyKey:
            createInsuranceContactIdempotencyKey(
                "contact-idempotency:e2c3d1-1"
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


function connected():
    InsuranceContactAttempt {

    return transitionInsuranceContactAttempt(
        attempting(),
        "connected",
        "2026-09-28T22:00:05.000Z"
    );
}


function completed():
    InsuranceContactAttempt {

    return transitionInsuranceContactAttempt(
        connected(),
        "completed",
        "2026-09-28T22:00:08.000Z"
    );
}


function correlated(
    legRole:
        TelnyxCallLegRole,
    type:
        TelnyxVoiceEventType,
    attempt:
        InsuranceContactAttempt =
            attempting()
):
    ResolvedTelnyxCorrelatedEvent {

    const callControlId =
        legRole ===
            "operator"
            ? "operator-call"
            : "lead-call";

    const correlation =
        createTelnyxCallLegCorrelation({
            attemptId:
                attempt.attemptId,
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
        attempt,
        correlation,
        legRole
    };
}


test(
    "operator initiated evidence is canonical no-op",
    () => {
        const value =
            correlated(
                "operator",
                "call.initiated"
            );

        const plan =
            planTelnyxCorrelatedAttemptEventReconciliation(
                value
            );

        assert.equal(
            plan.kind,
            "no-op"
        );

        assert.equal(
            plan.reason,
            "initiated-observed"
        );
    }
);


test(
    "lead answered evidence is canonical no-op even though attempt providerReference belongs to operator",
    () => {
        const value =
            correlated(
                "lead",
                "call.answered"
            );

        assert.equal(
            value.attempt.providerReference,
            "operator-call"
        );

        assert.equal(
            value.event.callControlId,
            "lead-call"
        );

        const plan =
            planTelnyxCorrelatedAttemptEventReconciliation(
                value
            );

        assert.equal(
            plan.kind,
            "no-op"
        );

        assert.equal(
            plan.reason,
            "answered-observed"
        );
    }
);


test(
    "lead bridged evidence advances canonical attempting attempt to connected",
    () => {
        const value =
            correlated(
                "lead",
                "call.bridged"
            );

        const plan =
            planTelnyxCorrelatedAttemptEventReconciliation(
                value
            );

        assert.equal(
            plan.kind,
            "update"
        );

        if(plan.kind !== "update"){
            return;
        }

        assert.equal(
            plan.previous.providerReference,
            "operator-call"
        );

        assert.equal(
            value.event.callControlId,
            "lead-call"
        );

        assert.equal(
            plan.next.state,
            "connected"
        );

        assert.equal(
            plan.next.providerReference,
            "operator-call"
        );

        assert.equal(
            plan.next.connectedAt,
            eventTime
        );
    }
);


test(
    "operator bridged evidence also advances canonical attempting attempt to connected",
    () => {
        const plan =
            planTelnyxCorrelatedAttemptEventReconciliation(
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
            "connected"
        );
    }
);


test(
    "duplicate bridged evidence after connected is canonical no-op",
    () => {
        const plan =
            planTelnyxCorrelatedAttemptEventReconciliation(
                correlated(
                    "lead",
                    "call.bridged",
                    connected()
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
    "lead hangup from connected completes canonical attempt while preserving operator providerReference",
    () => {
        const value =
            correlated(
                "lead",
                "call.hangup",
                connected()
            );

        const plan =
            planTelnyxCorrelatedAttemptEventReconciliation(
                value
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
            plan.next.providerReference,
            "operator-call"
        );

        assert.equal(
            plan.next.completedAt,
            eventTime
        );
    }
);


test(
    "hangup from attempting completes canonical attempt",
    () => {
        const plan =
            planTelnyxCorrelatedAttemptEventReconciliation(
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
            "completed"
        );
    }
);


test(
    "late hangup against completed attempt is no-op",
    () => {
        const plan =
            planTelnyxCorrelatedAttemptEventReconciliation(
                correlated(
                    "lead",
                    "call.hangup",
                    completed()
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
    "mismatched correlation attempt identity is rejected",
    () => {
        const value =
            correlated(
                "operator",
                "call.answered"
            );

        const otherAttemptId =
            createInsuranceContactAttemptId(
                "contact-attempt:e2c3d1-other"
            );

        const mismatched:
            ResolvedTelnyxCorrelatedEvent = {
                ...value,
                correlation:
                    createTelnyxCallLegCorrelation({
                        attemptId:
                            otherAttemptId,
                        legRole:
                            "operator",
                        providerReference:
                            "operator-call",
                        createdAt:
                            baseTime
                    })
            };

        assert.throws(
            () =>
                planTelnyxCorrelatedAttemptEventReconciliation(
                    mismatched
                ),
            /matching canonical attempt identity/
        );
    }
);


test(
    "mismatched correlation provider reference and event callControlId is rejected",
    () => {
        const value =
            correlated(
                "lead",
                "call.answered"
            );

        const mismatched:
            ResolvedTelnyxCorrelatedEvent = {
                ...value,
                correlation:
                    createTelnyxCallLegCorrelation({
                        attemptId,
                        legRole:
                            "lead",
                        providerReference:
                            "different-lead-call",
                        createdAt:
                            baseTime
                    })
            };

        assert.throws(
            () =>
                planTelnyxCorrelatedAttemptEventReconciliation(
                    mismatched
                ),
            /matching correlation providerReference and event callControlId/
        );
    }
);


test(
    "mismatched resolved leg role is rejected",
    () => {
        const value =
            correlated(
                "lead",
                "call.answered"
            );

        const mismatched:
            ResolvedTelnyxCorrelatedEvent = {
                ...value,
                legRole:
                    "operator"
            };

        assert.throws(
            () =>
                planTelnyxCorrelatedAttemptEventReconciliation(
                    mismatched
                ),
            /matching resolved leg role/
        );
    }
);
