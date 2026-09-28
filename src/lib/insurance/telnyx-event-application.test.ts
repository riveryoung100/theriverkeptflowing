import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceContactAttempt,
    transitionInsuranceContactAttempt
} from "./contact-attempt";

import {
    createTelnyxEventApplicationService
} from "./telnyx-event-application";

import type {
    InsuranceContactAttempt
} from "./contact-attempt";

import type {
    ExecuteTelnyxContactEventReconciliationInput,
    ExecuteTelnyxContactEventReconciliationResult
} from "./d1-contact-event-reconciliation";

import type {
    TelnyxVoiceEvent
} from "./telnyx-voice-event";


const requestedAt =
    "2026-09-28T20:00:00.000Z";

const attemptedAt =
    "2026-09-28T20:00:01.000Z";

const bridgedAt =
    "2026-09-28T20:00:10.000Z";

const receivedAt =
    "2026-09-28T20:00:11.000Z";


function attempting(
    updatedAt:
        string = attemptedAt
):
    InsuranceContactAttempt {

    const queued =
        createInsuranceContactAttempt({
            attemptId:
                "contact-attempt:e2b5-1",
            relationshipId:
                "relationship:e2b5-1",
            channel:
                "phone",
            intent:
                "instant-contact",
            state:
                "queued",
            idempotencyKey:
                "contact-idempotency:e2b5-1",
            provider:
                "telnyx",
            providerReference:
                "call-control-e2b5",
            requestedAt,
            createdAt:
                requestedAt,
            updatedAt:
                requestedAt
        });

    const value =
        transitionInsuranceContactAttempt(
            queued,
            "attempting",
            attemptedAt
        );

    return updatedAt ===
        attemptedAt
        ? value
        : createInsuranceContactAttempt({
            ...value,
            updatedAt
        });
}


function connected():
    InsuranceContactAttempt {

    return transitionInsuranceContactAttempt(
        attempting(),
        "connected",
        bridgedAt
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
            `provider-event-${type}`,
        type,
        occurredAt:
            bridgedAt,
        callControlId:
            "call-control-e2b5"
    };
}


class FakeAttempts {
    public readonly calls:
        Array<{
            provider:
                string;
            providerReference:
                string;
        }> = [];

    public results:
        Array<
            InsuranceContactAttempt |
            undefined
        > = [];

    async getAttemptByProviderReference(
        provider:
            string,
        providerReference:
            string
    ){
        this.calls.push({
            provider,
            providerReference
        });

        return this.results.length > 0
            ? this.results.shift()
            : undefined;
    }
}


class FakeExecutor {
    public readonly calls:
        ExecuteTelnyxContactEventReconciliationInput[] = [];

    public results:
        ExecuteTelnyxContactEventReconciliationResult[] = [];

    async execute(
        input:
            ExecuteTelnyxContactEventReconciliationInput
    ){
        this.calls.push(
            input
        );

        if(this.results.length === 0){
            throw new Error(
                "Missing fake executor result."
            );
        }

        return this.results.shift()!;
    }
}


function dependencies(){
    const attempts =
        new FakeAttempts();

    const executor =
        new FakeExecutor();

    return {
        attempts,
        executor,
        service:
            createTelnyxEventApplicationService({
                attempts,
                executor
            })
    };
}


test(
    "unmatched call control id returns attempt-not-found without persistence",
    async () => {
        const deps =
            dependencies();

        deps.attempts.results = [
            undefined
        ];

        const result =
            await deps.service.apply({
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
                    "attempt-not-found"
            }
        );

        assert.equal(
            deps.executor.calls.length,
            0
        );

        assert.deepEqual(
            deps.attempts.calls,
            [
                {
                    provider:
                        "telnyx",
                    providerReference:
                        "call-control-e2b5"
                }
            ]
        );
    }
);


test(
    "matched event plans and executes once",
    async () => {
        const deps =
            dependencies();

        deps.attempts.results = [
            attempting()
        ];

        deps.executor.results = [
            {
                ok:
                    true,
                duplicate:
                    false,
                attemptUpdated:
                    true
            }
        ];

        const result =
            await deps.service.apply({
                event:
                    event(
                        "call.bridged"
                    ),
                receivedAt
            });

        assert.deepEqual(
            result,
            {
                handled:
                    true,
                attemptId:
                    "contact-attempt:e2b5-1",
                duplicate:
                    false,
                attemptUpdated:
                    true,
                replanned:
                    false
            }
        );

        assert.equal(
            deps.executor.calls.length,
            1
        );

        assert.equal(
            deps.executor.calls[0]!.plan.kind,
            "update"
        );
    }
);


test(
    "answered event remains non-advancing through application composition",
    async () => {
        const deps =
            dependencies();

        deps.attempts.results = [
            attempting()
        ];

        deps.executor.results = [
            {
                ok:
                    true,
                duplicate:
                    false,
                attemptUpdated:
                    false
            }
        ];

        await deps.service.apply({
            event:
                event(
                    "call.answered"
                ),
            receivedAt
        });

        assert.equal(
            deps.executor.calls[0]!.plan.kind,
            "no-op"
        );

        assert.equal(
            deps.executor.calls[0]!.plan.reason,
            "answered-observed"
        );
    }
);


test(
    "stale execution re-reads fresh attempt and replans once",
    async () => {
        const deps =
            dependencies();

        deps.attempts.results = [
            attempting(),
            connected()
        ];

        deps.executor.results = [
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

        const result =
            await deps.service.apply({
                event:
                    event(
                        "call.bridged"
                    ),
                receivedAt
            });

        assert.deepEqual(
            result,
            {
                handled:
                    true,
                attemptId:
                    "contact-attempt:e2b5-1",
                duplicate:
                    false,
                attemptUpdated:
                    false,
                replanned:
                    true
            }
        );

        assert.equal(
            deps.attempts.calls.length,
            2
        );

        assert.equal(
            deps.executor.calls.length,
            2
        );

        assert.equal(
            deps.executor.calls[0]!.plan.kind,
            "update"
        );

        assert.equal(
            deps.executor.calls[1]!.plan.kind,
            "no-op"
        );

        assert.equal(
            deps.executor.calls[1]!.plan.reason,
            "bridged-already-advanced"
        );
    }
);


test(
    "second stale execution stops after one bounded replan",
    async () => {
        const deps =
            dependencies();

        deps.attempts.results = [
            attempting(),
            attempting(
                "2026-09-28T20:00:02.000Z"
            )
        ];

        deps.executor.results = [
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
            await deps.service.apply({
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
                retryable:
                    true,
                attemptId:
                    "contact-attempt:e2b5-1",
                replanned:
                    true
            }
        );

        assert.equal(
            deps.attempts.calls.length,
            2
        );

        assert.equal(
            deps.executor.calls.length,
            2
        );
    }
);


test(
    "attempt disappearing during stale re-read returns unmatched",
    async () => {
        const deps =
            dependencies();

        deps.attempts.results = [
            attempting(),
            undefined
        ];

        deps.executor.results = [
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
            await deps.service.apply({
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
                    "attempt-not-found"
            }
        );

        assert.equal(
            deps.executor.calls.length,
            1
        );
    }
);


test(
    "duplicate executor result is preserved by application result",
    async () => {
        const deps =
            dependencies();

        deps.attempts.results = [
            connected()
        ];

        deps.executor.results = [
            {
                ok:
                    true,
                duplicate:
                    true,
                attemptUpdated:
                    false
            }
        ];

        const result =
            await deps.service.apply({
                event:
                    event(),
                receivedAt
            });

        assert.equal(
            result.handled,
            true
        );

        if(!result.handled){
            return;
        }

        assert.equal(
            result.duplicate,
            true
        );

        assert.equal(
            result.attemptUpdated,
            false
        );
    }
);


test(
    "invalid received timestamp fails before attempt lookup",
    async () => {
        const deps =
            dependencies();

        await assert.rejects(
            deps.service.apply({
                event:
                    event(),
                receivedAt:
                    "invalid"
            }),
            /valid timestamp/
        );

        assert.equal(
            deps.attempts.calls.length,
            0
        );

        assert.equal(
            deps.executor.calls.length,
            0
        );
    }
);
