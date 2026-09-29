import assert from "node:assert/strict";
import test from "node:test";

import type {
    ApplyTelnyxCorrelatedEventResult
} from "./telnyx-correlated-event-application";

import {
    mapTelnyxCorrelatedEventApplicationToWebhookAcknowledgement
} from "./telnyx-webhook-acknowledgement";

const attemptId =
    "contact-attempt:f3-test" as never;

function policy(
    result:
        ApplyTelnyxCorrelatedEventResult
){
    return mapTelnyxCorrelatedEventApplicationToWebhookAcknowledgement(
        result
    );
}

test(
    "applied application outcome is acknowledged without retry",
    () => {
        assert.deepEqual(
            policy({
                handled: true,
                outcome:
                    "applied",
                attemptId,
                duplicate:
                    false,
                attemptUpdated:
                    true,
                bridgeOutcome:
                    "updated",
                bridgeReplanned:
                    false,
                attemptReplanned:
                    false
            }),
            {
                acknowledge: true,
                retry: false,
                classification:
                    "accepted"
            }
        );
    }
);

test(
    "duplicate applied application outcome is still acknowledged",
    () => {
        assert.deepEqual(
            policy({
                handled: true,
                outcome:
                    "applied",
                attemptId,
                duplicate:
                    true,
                attemptUpdated:
                    false,
                bridgeOutcome:
                    "no-op",
                bridgeReplanned:
                    false,
                attemptReplanned:
                    false
            }),
            {
                acknowledge: true,
                retry: false,
                classification:
                    "accepted"
            }
        );
    }
);

test(
    "correlation-not-found preserves provider redelivery",
    () => {
        assert.deepEqual(
            policy({
                handled: false,
                reason:
                    "correlation-not-found"
            }),
            {
                acknowledge: false,
                retry: true,
                classification:
                    "transient"
            }
        );
    }
);

test(
    "orphaned correlation is acknowledged as ignored",
    () => {
        assert.deepEqual(
            policy({
                handled: false,
                reason:
                    "orphaned-correlation",
                attemptId,
                legRole:
                    "lead"
            }),
            {
                acknowledge: true,
                retry: false,
                classification:
                    "ignored"
            }
        );
    }
);

test(
    "bridge-not-found is acknowledged as ignored",
    () => {
        assert.deepEqual(
            policy({
                handled: false,
                reason:
                    "bridge-not-found",
                attemptId,
                bridgeReplanned:
                    false
            }),
            {
                acknowledge: true,
                retry: false,
                classification:
                    "ignored"
            }
        );
    }
);

test(
    "stale bridge requests provider redelivery",
    () => {
        assert.deepEqual(
            policy({
                handled: false,
                reason:
                    "stale-bridge",
                attemptId,
                retryable:
                    true,
                bridgeReplanned:
                    true
            }),
            {
                acknowledge: false,
                retry: true,
                classification:
                    "transient"
            }
        );
    }
);

test(
    "deferred bridge application requests provider redelivery",
    () => {
        assert.deepEqual(
            policy({
                handled: true,
                outcome:
                    "deferred",
                attemptId,
                retryable:
                    true,
                bridgeReplanned:
                    false,
                attemptReplanned:
                    false
            }),
            {
                acknowledge: false,
                retry: true,
                classification:
                    "transient"
            }
        );
    }
);

test(
    "attempt-not-found is acknowledged as ignored",
    () => {
        assert.deepEqual(
            policy({
                handled: false,
                reason:
                    "attempt-not-found",
                attemptId,
                bridgeReplanned:
                    false,
                attemptReplanned:
                    true
            }),
            {
                acknowledge: true,
                retry: false,
                classification:
                    "ignored"
            }
        );
    }
);

test(
    "stale attempt requests provider redelivery",
    () => {
        assert.deepEqual(
            policy({
                handled: false,
                reason:
                    "stale-attempt",
                attemptId,
                retryable:
                    true,
                bridgeReplanned:
                    false,
                attemptReplanned:
                    true
            }),
            {
                acknowledge: false,
                retry: true,
                classification:
                    "transient"
            }
        );
    }
);

test(
    "all policy outputs maintain acknowledge retry opposition",
    () => {
        const results:
            readonly ApplyTelnyxCorrelatedEventResult[] = [
                {
                    handled: false,
                    reason:
                        "correlation-not-found"
                },
                {
                    handled: false,
                    reason:
                        "orphaned-correlation",
                    attemptId,
                    legRole:
                        "operator"
                },
                {
                    handled: false,
                    reason:
                        "bridge-not-found",
                    attemptId,
                    bridgeReplanned:
                        false
                },
                {
                    handled: false,
                    reason:
                        "stale-bridge",
                    attemptId,
                    retryable:
                        true,
                    bridgeReplanned:
                        true
                },
                {
                    handled: true,
                    outcome:
                        "deferred",
                    attemptId,
                    retryable:
                        true,
                    bridgeReplanned:
                        false,
                    attemptReplanned:
                        false
                },
                {
                    handled: false,
                    reason:
                        "attempt-not-found",
                    attemptId,
                    bridgeReplanned:
                        false,
                    attemptReplanned:
                        true
                },
                {
                    handled: false,
                    reason:
                        "stale-attempt",
                    attemptId,
                    retryable:
                        true,
                    bridgeReplanned:
                        false,
                    attemptReplanned:
                        true
                },
                {
                    handled: true,
                    outcome:
                        "applied",
                    attemptId,
                    duplicate:
                        false,
                    attemptUpdated:
                        false,
                    bridgeOutcome:
                        "no-op",
                    bridgeReplanned:
                        false,
                    attemptReplanned:
                        false
                }
            ];

        for(const result of results){
            const mapped =
                policy(
                    result
                );

            assert.equal(
                mapped.acknowledge,
                !mapped.retry
            );
        }
    }
);
