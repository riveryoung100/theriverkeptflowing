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
    createTelnyxCorrelatedEventApplicationService
} from "./telnyx-correlated-event-application";

import type {
    InsuranceContactAttempt
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
    TelnyxVoiceEvent
} from "./telnyx-voice-event";


const attemptId =
    createInsuranceContactAttemptId(
        "contact-attempt:e2c3d3-1"
    );

const baseTime =
    "2026-09-28T22:30:00.000Z";

const eventTime =
    "2026-09-28T22:30:10.000Z";

const receivedAt =
    "2026-09-28T22:30:11.000Z";


function attempting():
    InsuranceContactAttempt {

    return createInsuranceContactAttempt({
        attemptId,
        relationshipId:
            "relationship:e2c3d3-1",
        channel:
            "phone",
        intent:
            "instant-contact",
        state:
            "attempting",
        idempotencyKey:
            createInsuranceContactIdempotencyKey(
                "contact-idempotency:e2c3d3-1"
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
        "2026-09-28T22:30:05.000Z"
    );
}


function event(
    type:
        TelnyxVoiceEvent["type"] =
            "call.bridged"
):
    TelnyxVoiceEvent {

    return {
        provider:
            "telnyx",
        providerEventId:
            `event:lead:${type}`,
        type,
        occurredAt:
            eventTime,
        callControlId:
            "lead-call"
    };
}


function correlated(
    attempt:
        InsuranceContactAttempt =
            attempting(),
    type:
        TelnyxVoiceEvent["type"] =
            "call.bridged"
):
    ResolvedTelnyxCorrelatedEvent {

    return {
        event:
            event(
                type
            ),
        attempt,
        correlation:
            createTelnyxCallLegCorrelation({
                attemptId:
                    attempt.attemptId,
                legRole:
                    "lead",
                providerReference:
                    "lead-call",
                createdAt:
                    baseTime
            }),
        legRole:
            "lead"
    };
}


class FakeResolver {
    public calls =
        0;

    public result:
        ResolveTelnyxCorrelatedEventResult = {
            resolved:
                true,
            value:
                correlated()
        };

    async resolve(
        event:
            TelnyxVoiceEvent
    ){
        void event;

        this.calls += 1;

        return this.result;
    }
}


class FakeBridgeApplication {
    public calls =
        0;

    public inputs:
        ApplyTelnyxCorrelatedBridgeEventInput[] = [];

    public result:
        ApplyTelnyxCorrelatedBridgeEventResult = {
            handled:
                true,
            outcome:
                "updated",
            reason:
                "bridged",
            bridge: {
                attemptId,
                state:
                    "bridged",
                operatorCallControlId:
                    "operator-call",
                leadCallControlId:
                    "lead-call",
                createdAt:
                    baseTime,
                updatedAt:
                    eventTime
            },
            replanned:
                false
        };

    async apply(
        input:
            ApplyTelnyxCorrelatedBridgeEventInput
    ){
        this.calls += 1;
        this.inputs.push(
            input
        );

        return this.result;
    }
}


class FakeAttemptLookup {
    public calls =
        0;

    public value:
        InsuranceContactAttempt |
        undefined =
            connected();

    async getAttempt(){
        this.calls += 1;

        return this.value;
    }
}


class FakeAttemptExecutor {
    public calls =
        0;

    public inputs:
        ExecuteTelnyxCorrelatedAttemptReconciliationInput[] = [];

    public results:
        ExecuteTelnyxCorrelatedAttemptReconciliationResult[] = [
            {
                ok:
                    true,
                duplicate:
                    false,
                attemptUpdated:
                    true
            }
        ];

    async execute(
        input:
            ExecuteTelnyxCorrelatedAttemptReconciliationInput
    ){
        this.calls += 1;
        this.inputs.push(
            input
        );

        const result =
            this.results.shift();

        if(result === undefined){
            throw new Error(
                "FakeAttemptExecutor exhausted results."
            );
        }

        return result;
    }
}


function service(){
    const resolver =
        new FakeResolver();

    const bridgeApplication =
        new FakeBridgeApplication();

    const attempts =
        new FakeAttemptLookup();

    const attemptExecutor =
        new FakeAttemptExecutor();

    return {
        resolver,
        bridgeApplication,
        attempts,
        attemptExecutor,
        application:
            createTelnyxCorrelatedEventApplicationService({
                resolver,
                bridgeApplication,
                attempts,
                attemptExecutor
            })
    };
}


test(
    "correlation is resolved exactly once before bridge and attempt processing",
    async () => {
        const value =
            service();

        const result =
            await value.application.apply({
                event:
                    event(),
                receivedAt
            });

        assert.equal(
            result.handled,
            true
        );

        assert.equal(
            value.resolver.calls,
            1
        );

        assert.equal(
            value.bridgeApplication.calls,
            1
        );

        assert.equal(
            value.attemptExecutor.calls,
            1
        );

        assert.equal(
            value.attempts.calls,
            0
        );
    }
);


test(
    "correlation-not-found performs zero bridge and attempt work",
    async () => {
        const value =
            service();

        value.resolver.result = {
            resolved:
                false,
            reason:
                "correlation-not-found"
        };

        const result =
            await value.application.apply({
                event:
                    event(),
                receivedAt
            });

        assert.deepEqual(
            result,
            {
                handled:
                    false,
                reason:
                    "correlation-not-found"
            }
        );

        assert.equal(
            value.bridgeApplication.calls,
            0
        );

        assert.equal(
            value.attemptExecutor.calls,
            0
        );
    }
);


test(
    "orphaned correlation performs zero bridge and attempt work",
    async () => {
        const value =
            service();

        value.resolver.result = {
            resolved:
                false,
            reason:
                "orphaned-correlation",
            attemptId,
            legRole:
                "lead"
        };

        const result =
            await value.application.apply({
                event:
                    event(),
                receivedAt
            });

        assert.deepEqual(
            result,
            {
                handled:
                    false,
                reason:
                    "orphaned-correlation",
                attemptId,
                legRole:
                    "lead"
            }
        );

        assert.equal(
            value.bridgeApplication.calls,
            0
        );

        assert.equal(
            value.attemptExecutor.calls,
            0
        );
    }
);


test(
    "bridge deferred prevents canonical attempt execution",
    async () => {
        const value =
            service();

        value.bridgeApplication.result = {
            handled:
                true,
            outcome:
                "deferred",
            reason:
                "bridge-prerequisites-missing",
            bridge: {
                attemptId,
                state:
                    "operator-answered",
                operatorCallControlId:
                    "operator-call",
                createdAt:
                    baseTime,
                updatedAt:
                    baseTime
            },
            retryable:
                true,
            replanned:
                false
        };

        const result =
            await value.application.apply({
                event:
                    event(),
                receivedAt
            });

        assert.deepEqual(
            result,
            {
                handled:
                    true,
                outcome:
                    "deferred",
                attemptId,
                retryable:
                    true,
                bridgeReplanned:
                    false,
                attemptReplanned:
                    false
            }
        );

        assert.equal(
            value.attemptExecutor.calls,
            0
        );

        assert.equal(
            value.attempts.calls,
            0
        );
    }
);


test(
    "bridge-not-found prevents canonical attempt execution",
    async () => {
        const value =
            service();

        value.bridgeApplication.result = {
            handled:
                false,
            reason:
                "bridge-not-found",
            attemptId,
            replanned:
                false
        };

        const result =
            await value.application.apply({
                event:
                    event(),
                receivedAt
            });

        assert.deepEqual(
            result,
            {
                handled:
                    false,
                reason:
                    "bridge-not-found",
                attemptId,
                bridgeReplanned:
                    false
            }
        );

        assert.equal(
            value.attemptExecutor.calls,
            0
        );
    }
);


test(
    "stale bridge prevents canonical attempt execution",
    async () => {
        const value =
            service();

        value.bridgeApplication.result = {
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

        const result =
            await value.application.apply({
                event:
                    event(),
                receivedAt
            });

        assert.deepEqual(
            result,
            {
                handled:
                    false,
                reason:
                    "stale-bridge",
                attemptId,
                retryable:
                    true,
                bridgeReplanned:
                    true
            }
        );

        assert.equal(
            value.attemptExecutor.calls,
            0
        );
    }
);


test(
    "bridge no-op still permits canonical no-op receipt execution",
    async () => {
        const value =
            service();

        const answered =
            correlated(
                attempting(),
                "call.answered"
            );

        value.resolver.result = {
            resolved:
                true,
            value:
                answered
        };

        value.bridgeApplication.result = {
            handled:
                true,
            outcome:
                "no-op",
            reason:
                "lead-answer-already-observed",
            bridge: {
                attemptId,
                state:
                    "lead-answered",
                operatorCallControlId:
                    "operator-call",
                leadCallControlId:
                    "lead-call",
                createdAt:
                    baseTime,
                updatedAt:
                    eventTime
            },
            replanned:
                false
        };

        value.attemptExecutor.results = [
            {
                ok:
                    true,
                duplicate:
                    false,
                attemptUpdated:
                    false
            }
        ];

        const result =
            await value.application.apply({
                event:
                    answered.event,
                receivedAt
            });

        assert.equal(
            result.handled,
            true
        );

        if(
            !result.handled ||
            result.outcome !==
                "applied"
        ){
            return;
        }

        assert.equal(
            result.bridgeOutcome,
            "no-op"
        );

        assert.equal(
            result.attemptUpdated,
            false
        );

        assert.equal(
            value.attemptExecutor.calls,
            1
        );
    }
);


test(
    "attempt stale rereads and retries exactly once without rerunning bridge",
    async () => {
        const value =
            service();

        value.attemptExecutor.results = [
            {
                ok:
                    false,
                reason:
                    "stale-attempt",
                retryable:
                    true
            },
            {
                ok:
                    true,
                duplicate:
                    false,
                attemptUpdated:
                    false
            }
        ];

        value.attempts.value =
            connected();

        const result =
            await value.application.apply({
                event:
                    event(),
                receivedAt
            });

        assert.equal(
            result.handled,
            true
        );

        if(
            !result.handled ||
            result.outcome !==
                "applied"
        ){
            return;
        }

        assert.equal(
            result.attemptReplanned,
            true
        );

        assert.equal(
            value.resolver.calls,
            1
        );

        assert.equal(
            value.bridgeApplication.calls,
            1
        );

        assert.equal(
            value.attempts.calls,
            1
        );

        assert.equal(
            value.attemptExecutor.calls,
            2
        );
    }
);


test(
    "attempt stale retry preserves original call-leg correlation",
    async () => {
        const value =
            service();

        value.attemptExecutor.results = [
            {
                ok:
                    false,
                reason:
                    "stale-attempt",
                retryable:
                    true
            },
            {
                ok:
                    true,
                duplicate:
                    false,
                attemptUpdated:
                    false
            }
        ];

        value.attempts.value =
            connected();

        await value.application.apply({
            event:
                event(),
            receivedAt
        });

        assert.equal(
            value.attemptExecutor.inputs.length,
            2
        );

        assert.equal(
            value.attemptExecutor.inputs[0]!.correlated.correlation,
            value.attemptExecutor.inputs[1]!.correlated.correlation
        );

        assert.equal(
            value.attemptExecutor.inputs[1]!.correlated.event.callControlId,
            "lead-call"
        );

        assert.equal(
            value.attemptExecutor.inputs[1]!.correlated.attempt.providerReference,
            "operator-call"
        );
    }
);


test(
    "attempt disappearing during stale recovery returns attempt-not-found",
    async () => {
        const value =
            service();

        value.attemptExecutor.results = [
            {
                ok:
                    false,
                reason:
                    "stale-attempt",
                retryable:
                    true
            }
        ];

        value.attempts.value =
            undefined;

        const result =
            await value.application.apply({
                event:
                    event(),
                receivedAt
            });

        assert.deepEqual(
            result,
            {
                handled:
                    false,
                reason:
                    "attempt-not-found",
                attemptId,
                bridgeReplanned:
                    false,
                attemptReplanned:
                    true
            }
        );

        assert.equal(
            value.bridgeApplication.calls,
            1
        );

        assert.equal(
            value.attemptExecutor.calls,
            1
        );
    }
);


test(
    "second attempt stale returns terminal retryable stale-attempt",
    async () => {
        const value =
            service();

        value.attemptExecutor.results = [
            {
                ok:
                    false,
                reason:
                    "stale-attempt",
                retryable:
                    true
            },
            {
                ok:
                    false,
                reason:
                    "stale-attempt",
                retryable:
                    true
            }
        ];

        const result =
            await value.application.apply({
                event:
                    event(),
                receivedAt
            });

        assert.deepEqual(
            result,
            {
                handled:
                    false,
                reason:
                    "stale-attempt",
                attemptId,
                retryable:
                    true,
                bridgeReplanned:
                    false,
                attemptReplanned:
                    true
            }
        );

        assert.equal(
            value.bridgeApplication.calls,
            1
        );

        assert.equal(
            value.attemptExecutor.calls,
            2
        );
    }
);


test(
    "invalid receivedAt is rejected before resolution or mutation",
    async () => {
        const value =
            service();

        await assert.rejects(
            value.application.apply({
                event:
                    event(),
                receivedAt:
                    "invalid"
            }),
            /valid timestamp/
        );

        assert.equal(
            value.resolver.calls,
            0
        );

        assert.equal(
            value.bridgeApplication.calls,
            0
        );

        assert.equal(
            value.attemptExecutor.calls,
            0
        );
    }
);
