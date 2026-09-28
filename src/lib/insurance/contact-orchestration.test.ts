import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceContactOrchestrationService
} from "./contact-orchestration";

import type {
    InsuranceContactOrchestrationDependencies
} from "./contact-orchestration";

import {
    createInsuranceContactAttempt
} from "./contact-attempt";

import type {
    InsuranceContactAttempt,
    InsuranceContactProviderRequest
} from "./contact-attempt";

import {
    createRiverCrmContactConsent
} from "../river-os/crm-growth-contracts";

import type {
    RiverCrmContactConsent
} from "../river-os/crm-growth-contracts";

import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";


const relationshipId =
    requireRiverCrmRelationshipId(
        "relationship:ins-002c"
    );

const attemptId =
    "contact-attempt:ins-002c-1";

const idempotencyKey =
    "idem:ins-002c-1";

const times = [
    "2026-09-28T19:00:00.000Z",
    "2026-09-28T19:00:01.000Z",
    "2026-09-28T19:00:02.000Z",
    "2026-09-28T19:00:03.000Z"
];


function context(){
    return {
        relationshipId:
            relationshipId,
        productInterest:
            "auto" as const,
        quoteStatus:
            "requested" as const,
        state:
            "TX",
        postalCode:
            "79720",
        contactChannels: [
            {
                channel:
                    "phone" as const,
                status:
                    "granted" as const,
                doNotContact:
                    false
            }
        ],
        doNotContact:
            false
    };
}


function grantedConsent():
    RiverCrmContactConsent {

    return createRiverCrmContactConsent({
        consentId:
            "consent:ins-002c",
        relationshipId,
        channel:
            "phone",
        status:
            "granted",
        consentSource:
            "test",
        capturedAt:
            times[0]!,
        doNotContact:
            false,
        createdAt:
            times[0]!,
        updatedAt:
            times[0]!
    });
}


function dependencies(){
    const writes:
        InsuranceContactAttempt[] =
            [];

    const providerRequests:
        InsuranceContactProviderRequest[] =
            [];

    let timeIndex=0;

    const deps:
        InsuranceContactOrchestrationDependencies = {
        relationships: {
            async get(){
                return {
                    relationshipId,
                    displayName:
                        "Insurance Lead",
                    kind:
                        "lead" as const,
                    stage:
                        "new" as const,
                    source:
                        "test",
                    email:
                        "river@example.com",
                    phone:
                        "+14325550123",
                    createdAt:
                        times[0]!,
                    updatedAt:
                        times[0]!
                };
            }
        },

        growth: {
            async listContactConsents(){
                return [
                    grantedConsent()
                ];
            }
        },

        attempts: {
            async insertAttempt(
                attempt:
                    InsuranceContactAttempt
            ){
                writes.push(
                    attempt
                );
            },

            async updateAttempt(
                attempt:
                    InsuranceContactAttempt
            ){
                writes.push(
                    attempt
                );
            },

            async getAttempt(){
                return undefined;
            },

            async getAttemptByIdempotencyKey(){
                return undefined;
            },

            async listAttemptsForRelationship(){
                return [];
            },

            async recordProviderEventReceipt(){
                return true;
            }
        },

        provider: {
            async requestContact(
                request:
                    InsuranceContactProviderRequest
            ){
                providerRequests.push(
                    request
                );

                return {
                    accepted:
                        true as const,
                    providerReference:
                        "provider-ref-1"
                };
            }
        },

        providerName:
            "provider-test",

        now(){
            const value=
                times[
                    Math.min(
                        timeIndex,
                        times.length - 1
                    )
                ]!;

            timeIndex += 1;

            return value;
        }
    };

    return {
        deps,
        writes,
        providerRequests
    };
}


test(
    "resolves phone destination server-side and invokes provider only after queued and attempting persistence",
    async () => {
        const {
            deps,
            writes,
            providerRequests
        } =
            dependencies();

        const service =
            createInsuranceContactOrchestrationService(
                deps
            );

        const result =
            await service.requestContact({
                context:
                    context(),
                attemptId,
                channel:
                    "phone",
                intent:
                    "callback",
                idempotencyKey
            });

        assert.equal(
            result.ok,
            true
        );

        assert.deepEqual(
            writes.map(
                attempt =>
                    attempt.state
            ),
            [
                "queued",
                "attempting",
                "attempting"
            ]
        );

        assert.equal(
            providerRequests.length,
            1
        );

        assert.deepEqual(
            providerRequests[0]?.destination,
            {
                channel:
                    "phone",
                value:
                    "+14325550123"
            }
        );

        if(result.ok){
            assert.equal(
                result.attempt.state,
                "attempting"
            );

            assert.equal(
                result.attempt.provider,
                "provider-test"
            );

            assert.equal(
                result.attempt.providerReference,
                "provider-ref-1"
            );
        }
    }
);


test(
    "sms resolves the canonical CRM phone field",
    async () => {
        const {
            deps,
            providerRequests
        } =
            dependencies();

        deps.growth.listContactConsents =
            async () => [
                {
                    ...grantedConsent(),
                    channel:
                        "sms"
                }
            ];

        const service =
            createInsuranceContactOrchestrationService(
                deps
            );

        await service.requestContact({
            context: {
                ...context(),
                contactChannels: [
                    {
                        channel:
                            "sms",
                        status:
                            "granted",
                        doNotContact:
                            false
                    }
                ]
            },
            attemptId,
            channel:
                "sms",
            intent:
                "instant-contact",
            idempotencyKey
        });

        assert.equal(
            providerRequests[0]?.destination.value,
            "+14325550123"
        );
    }
);


test(
    "email resolves canonical CRM email",
    async () => {
        const {
            deps,
            providerRequests
        } =
            dependencies();

        deps.growth.listContactConsents =
            async () => [
                {
                    ...grantedConsent(),
                    channel:
                        "email"
                }
            ];

        const service =
            createInsuranceContactOrchestrationService(
                deps
            );

        await service.requestContact({
            context: {
                ...context(),
                contactChannels: [
                    {
                        channel:
                            "email",
                        status:
                            "granted",
                        doNotContact:
                            false
                    }
                ]
            },
            attemptId,
            channel:
                "email",
            intent:
                "callback",
            idempotencyKey
        });

        assert.equal(
            providerRequests[0]?.destination.value,
            "river@example.com"
        );
    }
);


test(
    "missing destination prevents attempt persistence and provider invocation",
    async () => {
        const {
            deps,
            writes,
            providerRequests
        } =
            dependencies();

        deps.relationships.get =
            async () => ({
                relationshipId,
                displayName:
                    "No Phone",
                kind:
                    "lead",
                stage:
                    "new",
                source:
                    "test",
                createdAt:
                    times[0]!,
                updatedAt:
                    times[0]!
            });

        const service =
            createInsuranceContactOrchestrationService(
                deps
            );

        const result =
            await service.requestContact({
                context:
                    context(),
                attemptId,
                channel:
                    "phone",
                intent:
                    "callback",
                idempotencyKey
            });

        assert.deepEqual(
            result,
            {
                ok:
                    false,
                code:
                    "destination-missing"
            }
        );

        assert.equal(
            writes.length,
            0
        );

        assert.equal(
            providerRequests.length,
            0
        );
    }
);


test(
    "missing relationship prevents provider invocation",
    async () => {
        const {
            deps,
            providerRequests
        } =
            dependencies();

        deps.relationships.get =
            async () =>
                undefined;

        const service =
            createInsuranceContactOrchestrationService(
                deps
            );

        const result =
            await service.requestContact({
                context:
                    context(),
                attemptId,
                channel:
                    "phone",
                intent:
                    "callback",
                idempotencyKey
            });

        assert.deepEqual(
            result,
            {
                ok:
                    false,
                code:
                    "relationship-not-found"
            }
        );

        assert.equal(
            providerRequests.length,
            0
        );
    }
);


test(
    "current denied consent overrides stale granted integration context",
    async () => {
        const {
            deps,
            writes,
            providerRequests
        } =
            dependencies();

        deps.growth.listContactConsents =
            async () => [
                {
                    ...grantedConsent(),
                    status:
                        "denied"
                }
            ];

        const service =
            createInsuranceContactOrchestrationService(
                deps
            );

        const result =
            await service.requestContact({
                context:
                    context(),
                attemptId,
                channel:
                    "phone",
                intent:
                    "callback",
                idempotencyKey
            });

        assert.equal(
            result.ok,
            false
        );

        if(!result.ok){
            assert.equal(
                result.code,
                "contact-ineligible"
            );

            assert.equal(
                result.reason,
                "consent-not-granted"
            );
        }

        assert.equal(
            writes.length,
            0
        );

        assert.equal(
            providerRequests.length,
            0
        );
    }
);


test(
    "current channel suppression prevents provider invocation",
    async () => {
        const {
            deps,
            providerRequests
        } =
            dependencies();

        deps.growth.listContactConsents =
            async () => [
                {
                    ...grantedConsent(),
                    doNotContact:
                        true
                }
            ];

        const service =
            createInsuranceContactOrchestrationService(
                deps
            );

        const result =
            await service.requestContact({
                context:
                    context(),
                attemptId,
                channel:
                    "phone",
                intent:
                    "callback",
                idempotencyKey
            });

        assert.equal(
            result.ok,
            false
        );

        if(!result.ok){
            assert.equal(
                result.reason,
                "channel-suppressed"
            );
        }

        assert.equal(
            providerRequests.length,
            0
        );
    }
);


test(
    "relationship suppression prevents provider invocation",
    async () => {
        const {
            deps,
            providerRequests
        } =
            dependencies();

        const service =
            createInsuranceContactOrchestrationService(
                deps
            );

        const result =
            await service.requestContact({
                context: {
                    ...context(),
                    doNotContact:
                        true
                },
                attemptId,
                channel:
                    "phone",
                intent:
                    "callback",
                idempotencyKey
            });

        assert.equal(
            result.ok,
            false
        );

        if(!result.ok){
            assert.equal(
                result.reason,
                "relationship-suppressed"
            );
        }

        assert.equal(
            providerRequests.length,
            0
        );
    }
);


test(
    "provider rejection persists canonical failed state",
    async () => {
        const {
            deps,
            writes
        } =
            dependencies();

        deps.provider.requestContact =
            async () => ({
                accepted:
                    false,
                code:
                    "busy",
                message:
                    "Destination unavailable.",
                retryable:
                    true
            });

        const service =
            createInsuranceContactOrchestrationService(
                deps
            );

        const result =
            await service.requestContact({
                context:
                    context(),
                attemptId,
                channel:
                    "phone",
                intent:
                    "callback",
                idempotencyKey
            });

        assert.equal(
            result.ok,
            true
        );

        if(result.ok){
            assert.equal(
                result.attempt.state,
                "failed"
            );

            assert.equal(
                result.attempt.failureCode,
                "busy"
            );

            assert.equal(
                result.attempt.retryable,
                true
            );
        }

        assert.equal(
            writes.at(-1)?.state,
            "failed"
        );
    }
);


test(
    "provider exception becomes stable retryable failed attempt",
    async () => {
        const {
            deps,
            writes
        } =
            dependencies();

        deps.provider.requestContact =
            async () => {
                throw new Error(
                    "secret provider exception"
                );
            };

        const service =
            createInsuranceContactOrchestrationService(
                deps
            );

        const result =
            await service.requestContact({
                context:
                    context(),
                attemptId,
                channel:
                    "phone",
                intent:
                    "callback",
                idempotencyKey
            });

        assert.equal(
            result.ok,
            true
        );

        if(result.ok){
            assert.equal(
                result.attempt.state,
                "failed"
            );

            assert.equal(
                result.attempt.failureCode,
                "provider-exception"
            );

            assert.equal(
                result.attempt.failureMessage,
                "Contact provider request failed."
            );

            assert.equal(
                result.attempt.retryable,
                true
            );
        }

        assert.equal(
            writes.at(-1)?.state,
            "failed"
        );
    }
);


test(
    "existing idempotent request returns prior attempt without CRM, consent, persistence write, or provider invocation",
    async () => {
        const {
            deps,
            writes,
            providerRequests
        } =
            dependencies();

        let relationshipReads=0;
        let consentReads=0;

        deps.relationships.get =
            async () => {
                relationshipReads += 1;
                return undefined;
            };

        deps.growth.listContactConsents =
            async () => {
                consentReads += 1;
                return [];
            };

        deps.attempts.getAttemptByIdempotencyKey =
            async () =>
                createInsuranceContactAttempt({
                    attemptId,
                    relationshipId:
                        relationshipId,
                    channel:
                        "phone",
                    intent:
                        "callback",
                    state:
                        "attempting",
                    idempotencyKey,
                    provider:
                        "provider-test",
                    requestedAt:
                        times[0]!,
                    attemptedAt:
                        times[1]!,
                    createdAt:
                        times[0]!,
                    updatedAt:
                        times[1]!
                });

        const service =
            createInsuranceContactOrchestrationService(
                deps
            );

        const result =
            await service.requestContact({
                context:
                    context(),
                attemptId,
                channel:
                    "phone",
                intent:
                    "callback",
                idempotencyKey
            });

        assert.equal(
            result.ok,
            true
        );

        assert.equal(
            relationshipReads,
            0
        );

        assert.equal(
            consentReads,
            0
        );

        assert.equal(
            writes.length,
            0
        );

        assert.equal(
            providerRequests.length,
            0
        );
    }
);


test(
    "reusing idempotency key for different request identity is rejected",
    async () => {
        const {
            deps
        } =
            dependencies();

        deps.attempts.getAttemptByIdempotencyKey =
            async () =>
                createInsuranceContactAttempt({
                    attemptId:
                        "contact-attempt:prior",
                    relationshipId:
                        relationshipId,
                    channel:
                        "email",
                    intent:
                        "callback",
                    state:
                        "queued",
                    idempotencyKey,
                    requestedAt:
                        times[0]!,
                    createdAt:
                        times[0]!,
                    updatedAt:
                        times[0]!
                });

        const service =
            createInsuranceContactOrchestrationService(
                deps
            );

        await assert.rejects(
            () =>
                service.requestContact({
                    context:
                        context(),
                    attemptId,
                    channel:
                        "phone",
                    intent:
                        "callback",
                    idempotencyKey
                }),
            /already bound to a different request/
        );
    }
);
