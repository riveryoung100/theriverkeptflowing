import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceContactAttempt,
    createInsuranceContactAttemptId,
    createInsuranceContactIdempotencyKey
} from "./contact-attempt";

import {
    createTelnyxCallLegCorrelation
} from "./telnyx-call-correlation";

import {
    createTelnyxCorrelatedEventResolver
} from "./telnyx-correlated-event";

import type {
    InsuranceContactAttempt
} from "./contact-attempt";

import type {
    TelnyxCallLegCorrelation
} from "./telnyx-call-correlation";

import type {
    TelnyxVoiceEvent
} from "./telnyx-voice-event";


const attemptId =
    createInsuranceContactAttemptId(
        "contact-attempt:e2c2-1"
    );

const relationshipId =
    "relationship:e2c2-1";

const requestedAt =
    "2026-09-28T20:00:00.000Z";


function attempt():
    InsuranceContactAttempt {

    return createInsuranceContactAttempt({
        attemptId,
        relationshipId,
        channel:
            "phone",
        intent:
            "instant-contact",
        state:
            "attempting",
        idempotencyKey:
            createInsuranceContactIdempotencyKey(
                "contact-idempotency:e2c2-1"
            ),
        provider:
            "telnyx",
        providerReference:
            "operator-call-control",
        requestedAt,
        attemptedAt:
            requestedAt,
        createdAt:
            requestedAt,
        updatedAt:
            requestedAt
    });
}


function correlation(
    legRole:
        "operator" |
        "lead",
    providerReference:
        string
):
    TelnyxCallLegCorrelation {

    return createTelnyxCallLegCorrelation({
        attemptId,
        legRole,
        providerReference,
        createdAt:
            requestedAt
    });
}


function event(
    callControlId:
        string,
    type:
        TelnyxVoiceEvent["type"] =
            "call.answered"
):
    TelnyxVoiceEvent {

    return {
        provider:
            "telnyx",
        providerEventId:
            `event:${callControlId}`,
        type,
        occurredAt:
            "2026-09-28T20:00:01.000Z",
        callControlId
    };
}


test(
    "returns unmatched when no call-leg correlation exists",
    async () => {
        const calls:
            unknown[][] = [];

        const resolver =
            createTelnyxCorrelatedEventResolver({
                correlations: {
                    async getByProviderReference(
                        provider,
                        providerReference
                    ){
                        calls.push([
                            provider,
                            providerReference
                        ]);

                        return undefined;
                    }
                },
                attempts: {
                    async getAttempt(){
                        throw new Error(
                            "attempt lookup must not run without correlation"
                        );
                    }
                }
            });

        const result =
            await resolver.resolve(
                event(
                    "unknown-call"
                )
            );

        assert.deepEqual(
            result,
            {
                resolved:
                    false,
                reason:
                    "correlation-not-found"
            }
        );

        assert.deepEqual(
            calls,
            [
                [
                    "telnyx",
                    "unknown-call"
                ]
            ]
        );
    }
);


test(
    "resolves operator leg through persisted River correlation",
    async () => {
        const operatorCorrelation =
            correlation(
                "operator",
                "operator-call-control"
            );

        const canonicalAttempt =
            attempt();

        const resolver =
            createTelnyxCorrelatedEventResolver({
                correlations: {
                    async getByProviderReference(){
                        return operatorCorrelation;
                    }
                },
                attempts: {
                    async getAttempt(
                        receivedAttemptId
                    ){
                        assert.equal(
                            receivedAttemptId,
                            attemptId
                        );

                        return canonicalAttempt;
                    }
                }
            });

        const normalizedEvent =
            event(
                "operator-call-control"
            );

        const result =
            await resolver.resolve(
                normalizedEvent
            );

        assert.equal(
            result.resolved,
            true
        );

        if(!result.resolved){
            return;
        }

        assert.equal(
            result.value.legRole,
            "operator"
        );

        assert.equal(
            result.value.attempt,
            canonicalAttempt
        );

        assert.equal(
            result.value.event,
            normalizedEvent
        );
    }
);


test(
    "resolves lead leg even when canonical attempt providerReference belongs to operator leg",
    async () => {
        const leadCorrelation =
            correlation(
                "lead",
                "lead-call-control"
            );

        const canonicalAttempt =
            attempt();

        assert.equal(
            canonicalAttempt.providerReference,
            "operator-call-control"
        );

        const resolver =
            createTelnyxCorrelatedEventResolver({
                correlations: {
                    async getByProviderReference(){
                        return leadCorrelation;
                    }
                },
                attempts: {
                    async getAttempt(){
                        return canonicalAttempt;
                    }
                }
            });

        const result =
            await resolver.resolve(
                event(
                    "lead-call-control"
                )
            );

        assert.equal(
            result.resolved,
            true
        );

        if(!result.resolved){
            return;
        }

        assert.equal(
            result.value.legRole,
            "lead"
        );

        assert.equal(
            result.value.correlation.providerReference,
            "lead-call-control"
        );

        assert.equal(
            result.value.attempt.providerReference,
            "operator-call-control"
        );
    }
);


test(
    "returns orphaned correlation when canonical attempt is absent",
    async () => {
        const leadCorrelation =
            correlation(
                "lead",
                "lead-call-control"
            );

        const resolver =
            createTelnyxCorrelatedEventResolver({
                correlations: {
                    async getByProviderReference(){
                        return leadCorrelation;
                    }
                },
                attempts: {
                    async getAttempt(){
                        return undefined;
                    }
                }
            });

        const result =
            await resolver.resolve(
                event(
                    "lead-call-control"
                )
            );

        assert.deepEqual(
            result,
            {
                resolved:
                    false,
                reason:
                    "orphaned-correlation",
                attemptId,
                legRole:
                    "lead"
            }
        );
    }
);


test(
    "rejects correlation whose provider reference disagrees with event call control identity",
    async () => {
        const resolver =
            createTelnyxCorrelatedEventResolver({
                correlations: {
                    async getByProviderReference(){
                        return correlation(
                            "lead",
                            "different-call"
                        );
                    }
                },
                attempts: {
                    async getAttempt(){
                        throw new Error(
                            "attempt lookup must not run after identity mismatch"
                        );
                    }
                }
            });

        await assert.rejects(
            resolver.resolve(
                event(
                    "lead-call-control"
                )
            ),
            /does not match event callControlId/
        );
    }
);


test(
    "does not infer leg role from callLegId or callSessionId",
    async () => {
        const operatorCorrelation =
            correlation(
                "operator",
                "operator-call-control"
            );

        const canonicalAttempt =
            attempt();

        const resolver =
            createTelnyxCorrelatedEventResolver({
                correlations: {
                    async getByProviderReference(){
                        return operatorCorrelation;
                    }
                },
                attempts: {
                    async getAttempt(){
                        return canonicalAttempt;
                    }
                }
            });

        const normalizedEvent:
            TelnyxVoiceEvent = {
                ...event(
                    "operator-call-control"
                ),
                callLegId:
                    "provider-leg-says-nothing-about-role",
                callSessionId:
                    "provider-session-says-nothing-about-role"
            };

        const result =
            await resolver.resolve(
                normalizedEvent
            );

        assert.equal(
            result.resolved,
            true
        );

        if(!result.resolved){
            return;
        }

        assert.equal(
            result.value.legRole,
            "operator"
        );
    }
);
