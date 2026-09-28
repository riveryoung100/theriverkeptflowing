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
    createTelnyxBridgeEventApplicationService
} from "./telnyx-bridge-event-application";

import type {
    CompareAndSetTelnyxCallBridgeResult
} from "./d1-telnyx-call-bridge";

import type {
    TelnyxCallBridge
} from "./telnyx-call-bridge";

import type {
    TelnyxCallLegRole
} from "./telnyx-call-correlation";

import type {
    ResolvedTelnyxCorrelatedEvent
} from "./telnyx-correlated-event";

import type {
    TelnyxVoiceEventType
} from "./telnyx-voice-event";


const attemptId =
    createInsuranceContactAttemptId(
        "contact-attempt:e2c3c-1"
    );

const baseTime =
    "2026-09-28T21:45:00.000Z";

const eventTime =
    "2026-09-28T21:45:10.000Z";


function attempt(){
    return createInsuranceContactAttempt({
        attemptId,
        relationshipId:
            "relationship:e2c3c-1",
        channel:
            "phone",
        intent:
            "instant-contact",
        state:
            "attempting",
        idempotencyKey:
            createInsuranceContactIdempotencyKey(
                "contact-idempotency:e2c3c-1"
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
        "2026-09-28T21:45:01.000Z",
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
        "2026-09-28T21:45:02.000Z"
    );
}



class FakeBridgePersistence {
    public readonly reads:
        string[] = [];

    public readonly writes:
        Array<{
            readonly previous:
                TelnyxCallBridge;

            readonly next:
                TelnyxCallBridge;
        }> = [];

    public readQueue:
        Array<
            TelnyxCallBridge |
            undefined
        > = [];

    public writeQueue:
        CompareAndSetTelnyxCallBridgeResult[] = [];

    async getBridge(
        receivedAttemptId:
            typeof attemptId
    ){
        this.reads.push(
            receivedAttemptId
        );

        return this.readQueue.shift();
    }

    async compareAndSetBridge(
        previous:
            TelnyxCallBridge,
        next:
            TelnyxCallBridge
    ){
        this.writes.push({
            previous,
            next
        });

        const queued =
            this.writeQueue.shift();

        if(queued !== undefined){
            return queued;
        }

        return {
            updated:
                true as const,
            bridge:
                next
        };
    }
}


test(
    "missing durable bridge returns bridge-not-found with no writes",
    async () => {
        const bridges =
            new FakeBridgePersistence();

        bridges.readQueue = [
            undefined
        ];

        const service =
            createTelnyxBridgeEventApplicationService({
                bridges
            });

        const result =
            await service.apply({
                correlated:
                    correlated(
                        "operator",
                        "call.answered"
                    )
            });

        assert.deepEqual(
            result,
            {
                handled:
                    false,
                reason:
                    "bridge-not-found",
                attemptId,
                replanned:
                    false
            }
        );

        assert.equal(
            bridges.writes.length,
            0
        );
    }
);


test(
    "no-op plan performs zero writes",
    async () => {
        const bridges =
            new FakeBridgePersistence();

        bridges.readQueue = [
            initialBridge()
        ];

        const service =
            createTelnyxBridgeEventApplicationService({
                bridges
            });

        const result =
            await service.apply({
                correlated:
                    correlated(
                        "operator",
                        "call.initiated"
                    )
            });

        assert.equal(
            result.handled,
            true
        );

        assert.equal(
            result.handled &&
            "outcome" in result
                ? result.outcome
                : undefined,
            "no-op"
        );

        assert.equal(
            bridges.writes.length,
            0
        );
    }
);


test(
    "defer plan performs zero writes",
    async () => {
        const bridges =
            new FakeBridgePersistence();

        bridges.readQueue = [
            initialBridge()
        ];

        const service =
            createTelnyxBridgeEventApplicationService({
                bridges
            });

        const result =
            await service.apply({
                correlated:
                    correlated(
                        "lead",
                        "call.answered"
                    )
            });

        assert.equal(
            result.handled,
            true
        );

        assert.equal(
            result.handled &&
            "outcome" in result
                ? result.outcome
                : undefined,
            "deferred"
        );

        assert.equal(
            result.handled &&
            "retryable" in result
                ? result.retryable
                : undefined,
            true
        );

        assert.equal(
            bridges.writes.length,
            0
        );
    }
);


test(
    "update plan executes one compare-and-set",
    async () => {
        const bridges =
            new FakeBridgePersistence();

        bridges.readQueue = [
            initialBridge()
        ];

        const service =
            createTelnyxBridgeEventApplicationService({
                bridges
            });

        const result =
            await service.apply({
                correlated:
                    correlated(
                        "operator",
                        "call.answered"
                    )
            });

        assert.equal(
            result.handled,
            true
        );

        assert.equal(
            result.handled &&
            "outcome" in result
                ? result.outcome
                : undefined,
            "updated"
        );

        assert.equal(
            bridges.reads.length,
            1
        );

        assert.equal(
            bridges.writes.length,
            1
        );

        assert.equal(
            bridges.writes[0]!.next.state,
            "operator-answered"
        );
    }
);


test(
    "stale update rereads once and replan no-op terminates without second write",
    async () => {
        const bridges =
            new FakeBridgePersistence();

        bridges.readQueue = [
            initialBridge(),
            operatorAnsweredBridge()
        ];

        bridges.writeQueue = [
            {
                updated:
                    false,
                reason:
                    "stale-bridge"
            }
        ];

        const service =
            createTelnyxBridgeEventApplicationService({
                bridges
            });

        const result =
            await service.apply({
                correlated:
                    correlated(
                        "operator",
                        "call.answered"
                    )
            });

        assert.equal(
            result.handled,
            true
        );

        assert.equal(
            result.handled &&
            "outcome" in result
                ? result.outcome
                : undefined,
            "no-op"
        );

        assert.equal(
            result.replanned,
            true
        );

        assert.equal(
            bridges.reads.length,
            2
        );

        assert.equal(
            bridges.writes.length,
            1
        );
    }
);


test(
    "stale update rereads once and replan defer terminates without second write",
    async () => {
        const bridges =
            new FakeBridgePersistence();

        bridges.readQueue = [
            operatorAnsweredBridge(),
            initialBridge()
        ];

        bridges.writeQueue = [
            {
                updated:
                    false,
                reason:
                    "stale-bridge"
            }
        ];

        const service =
            createTelnyxBridgeEventApplicationService({
                bridges
            });

        const result =
            await service.apply({
                correlated:
                    correlated(
                        "lead",
                        "call.answered"
                    )
            });

        assert.equal(
            result.handled,
            true
        );

        assert.equal(
            result.handled &&
            "outcome" in result
                ? result.outcome
                : undefined,
            "deferred"
        );

        assert.equal(
            result.replanned,
            true
        );

        assert.equal(
            bridges.writes.length,
            1
        );
    }
);


test(
    "stale update rereads replans and retries compare-and-set exactly once",
    async () => {
        const bridges =
            new FakeBridgePersistence();

        const fresh =
            leadDialBridge();

        bridges.readQueue = [
            operatorAnsweredBridge(),
            fresh
        ];

        bridges.writeQueue = [
            {
                updated:
                    false,
                reason:
                    "stale-bridge"
            }
        ];

        const service =
            createTelnyxBridgeEventApplicationService({
                bridges
            });

        const result =
            await service.apply({
                correlated:
                    correlated(
                        "lead",
                        "call.answered"
                    )
            });

        assert.equal(
            result.handled,
            true
        );

        assert.equal(
            result.handled &&
            "outcome" in result
                ? result.outcome
                : undefined,
            "updated"
        );

        assert.equal(
            result.replanned,
            true
        );

        assert.equal(
            bridges.reads.length,
            2
        );

        assert.equal(
            bridges.writes.length,
            2
        );

        assert.equal(
            bridges.writes[1]!.previous,
            fresh
        );

        assert.equal(
            bridges.writes[1]!.next.state,
            "lead-answered"
        );
    }
);


test(
    "second stale compare-and-set stops after bounded retry",
    async () => {
        const bridges =
            new FakeBridgePersistence();

        bridges.readQueue = [
            initialBridge(),
            initialBridge()
        ];

        bridges.writeQueue = [
            {
                updated:
                    false,
                reason:
                    "stale-bridge"
            },
            {
                updated:
                    false,
                reason:
                    "stale-bridge"
            }
        ];

        const service =
            createTelnyxBridgeEventApplicationService({
                bridges
            });

        const result =
            await service.apply({
                correlated:
                    correlated(
                        "operator",
                        "call.answered"
                    )
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
                replanned:
                    true
            }
        );

        assert.equal(
            bridges.reads.length,
            2
        );

        assert.equal(
            bridges.writes.length,
            2
        );
    }
);


test(
    "bridge disappearing during stale reread returns bridge-not-found",
    async () => {
        const bridges =
            new FakeBridgePersistence();

        bridges.readQueue = [
            initialBridge(),
            undefined
        ];

        bridges.writeQueue = [
            {
                updated:
                    false,
                reason:
                    "stale-bridge"
            }
        ];

        const service =
            createTelnyxBridgeEventApplicationService({
                bridges
            });

        const result =
            await service.apply({
                correlated:
                    correlated(
                        "operator",
                        "call.answered"
                    )
            });

        assert.deepEqual(
            result,
            {
                handled:
                    false,
                reason:
                    "bridge-not-found",
                attemptId,
                replanned:
                    true
            }
        );

        assert.equal(
            bridges.writes.length,
            1
        );
    }
);


test(
    "application rejects mismatched correlated attempt identity before persistence access",
    async () => {
        const bridges =
            new FakeBridgePersistence();

        const value =
            correlated(
                "operator",
                "call.answered"
            );

        const otherAttemptId =
            createInsuranceContactAttemptId(
                "contact-attempt:e2c3c-other"
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

        await assert.rejects(
            serviceFor(
                bridges
            ).apply({
                correlated:
                    mismatched
            }),
            /matching correlated attempt identity/
        );

        assert.equal(
            bridges.reads.length,
            0
        );

        assert.equal(
            bridges.writes.length,
            0
        );
    }
);


function serviceFor(
    bridges:
        FakeBridgePersistence
){
    return createTelnyxBridgeEventApplicationService({
        bridges
    });
}
