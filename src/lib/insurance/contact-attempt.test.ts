import assert from "node:assert/strict";
import test from "node:test";

import {
    INSURANCE_CONTACT_ATTEMPT_STATES,
    canTransitionInsuranceContactAttempt,
    createInsuranceContactAttempt,
    createInsuranceContactAttemptId,
    createInsuranceContactIdempotencyKey,
    createInsuranceContactProviderResult,
    evaluateInsuranceContactEligibility,
    transitionInsuranceContactAttempt
} from "./contact-attempt";

import type {
    InsuranceContactAttempt,
    InsuranceContactAttemptState
} from "./contact-attempt";

import type {
    InsuranceGrowthIntegrationContext
} from "./integration-boundary";

import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

const relationshipId =
    requireRiverCrmRelationshipId(
        "relationship:ins-002a"
    );

const time1 =
    "2026-09-28T18:00:00.000Z";

const time2 =
    "2026-09-28T18:01:00.000Z";

function queued():
    InsuranceContactAttempt {

    return createInsuranceContactAttempt({
        attemptId:
            "contact-attempt:test-1",
        relationshipId,
        channel:
            "phone",
        intent:
            "callback",
        state:
            "queued",
        idempotencyKey:
            "idem:test-1",
        requestedAt:
            time1,
        createdAt:
            time1,
        updatedAt:
            time1
    });
}

function context(
    overrides:
        Partial<
            InsuranceGrowthIntegrationContext
        > = {}
):
    InsuranceGrowthIntegrationContext {

    return {
        relationshipId,
        productInterest:
            "auto",
        quoteStatus:
            "requested",
        state:
            "TX",
        postalCode:
            "79720",
        contactChannels: [
            {
                channel:
                    "phone",
                status:
                    "granted",
                doNotContact:
                    false
            }
        ],
        doNotContact:
            false,
        ...overrides
    };
}

test(
    "canonicalizes valid attempt IDs",
    () => {
        assert.equal(
            createInsuranceContactAttemptId(
                " contact-attempt:abc "
            ),
            "contact-attempt:abc"
        );
    }
);

test(
    "rejects malformed attempt IDs",
    () => {
        assert.throws(
            () =>
                createInsuranceContactAttemptId(
                    "attempt:abc"
                )
        );

        assert.throws(
            () =>
                createInsuranceContactAttemptId(
                    "contact-attempt:"
                )
        );
    }
);

test(
    "canonicalizes idempotency keys",
    () => {
        assert.equal(
            createInsuranceContactIdempotencyKey(
                " idem:abc "
            ),
            "idem:abc"
        );

        assert.throws(
            () =>
                createInsuranceContactIdempotencyKey(
                    " "
                )
        );
    }
);

test(
    "creates a canonical queued attempt",
    () => {
        const attempt =
            queued();

        assert.equal(
            attempt.relationshipId,
            relationshipId
        );

        assert.equal(
            attempt.state,
            "queued"
        );

        assert.equal(
            attempt.channel,
            "phone"
        );
    }
);

test(
    "rejects unsupported channel intent state and malformed timestamp",
    () => {
        const base = {
            attemptId:
                "contact-attempt:invalid",
            relationshipId,
            channel:
                "phone",
            intent:
                "callback",
            state:
                "queued",
            idempotencyKey:
                "idem:invalid",
            requestedAt:
                time1,
            createdAt:
                time1,
            updatedAt:
                time1
        };

        assert.throws(
            () =>
                createInsuranceContactAttempt({
                    ...base,
                    channel:
                        "fax"
                })
        );

        assert.throws(
            () =>
                createInsuranceContactAttempt({
                    ...base,
                    intent:
                        "blast"
                })
        );

        assert.throws(
            () =>
                createInsuranceContactAttempt({
                    ...base,
                    state:
                        "ringing"
                })
        );

        assert.throws(
            () =>
                createInsuranceContactAttempt({
                    ...base,
                    requestedAt:
                        "not-a-date"
                })
        );
    }
);

test(
    "provider reference requires provider",
    () => {
        assert.throws(
            () =>
                createInsuranceContactAttempt({
                    ...queued(),
                    providerReference:
                        "call-123"
                })
        );
    }
);

test(
    "failure fields are rejected outside failed state",
    () => {
        assert.throws(
            () =>
                createInsuranceContactAttempt({
                    ...queued(),
                    failureCode:
                        "network"
                })
        );

        assert.throws(
            () =>
                createInsuranceContactAttempt({
                    ...queued(),
                    retryable:
                        true
                })
        );
    }
);

test(
    "valid failed attempt requires complete structured failure",
    () => {
        const failed =
            createInsuranceContactAttempt({
                ...queued(),
                state:
                    "failed",
                failedAt:
                    time2,
                failureCode:
                    "provider-timeout",
                failureMessage:
                    "Provider timed out.",
                retryable:
                    true,
                updatedAt:
                    time2
            });

        assert.equal(
            failed.state,
            "failed"
        );

        assert.equal(
            failed.retryable,
            true
        );

        assert.throws(
            () =>
                createInsuranceContactAttempt({
                    ...queued(),
                    state:
                        "failed",
                    failedAt:
                        time2,
                    failureCode:
                        "provider-timeout",
                    updatedAt:
                        time2
                })
        );
    }
);

test(
    "allowed transition matrix is exact",
    () => {
        const allowed:
            Readonly<
                Record<
                    InsuranceContactAttemptState,
                    readonly InsuranceContactAttemptState[]
                >
            > = {
                queued: [
                    "attempting",
                    "canceled"
                ],
                attempting: [
                    "connected",
                    "completed",
                    "failed",
                    "canceled"
                ],
                connected: [
                    "completed",
                    "failed"
                ],
                completed: [],
                failed: [],
                canceled: []
            };

        for(
            const from of
                INSURANCE_CONTACT_ATTEMPT_STATES
        ){
            for(
                const to of
                    INSURANCE_CONTACT_ATTEMPT_STATES
            ){
                assert.equal(
                    canTransitionInsuranceContactAttempt(
                        from,
                        to
                    ),
                    allowed[
                        from
                    ].includes(
                        to
                    ),
                    `${from} -> ${to}`
                );
            }
        }
    }
);

test(
    "transition helper preserves immutable request facts",
    () => {
        const before =
            queued();

        const attempting =
            transitionInsuranceContactAttempt(
                before,
                "attempting",
                time2,
                {
                    provider:
                        "provider-neutral-test",
                    providerReference:
                        "ref-1"
                }
            );

        assert.equal(
            attempting.attemptId,
            before.attemptId
        );

        assert.equal(
            attempting.relationshipId,
            before.relationshipId
        );

        assert.equal(
            attempting.channel,
            before.channel
        );

        assert.equal(
            attempting.intent,
            before.intent
        );

        assert.equal(
            attempting.idempotencyKey,
            before.idempotencyKey
        );

        assert.equal(
            attempting.state,
            "attempting"
        );

        assert.equal(
            attempting.attemptedAt,
            time2
        );
    }
);

test(
    "invalid and terminal transitions are rejected",
    () => {
        assert.throws(
            () =>
                transitionInsuranceContactAttempt(
                    queued(),
                    "connected",
                    time2
                )
        );

        const completed =
            createInsuranceContactAttempt({
                ...queued(),
                state:
                    "completed",
                completedAt:
                    time2,
                updatedAt:
                    time2
            });

        assert.throws(
            () =>
                transitionInsuranceContactAttempt(
                    completed,
                    "failed",
                    time2,
                    {
                        failureCode:
                            "late",
                        failureMessage:
                            "Late failure.",
                        retryable:
                            false
                    }
                )
        );
    }
);

test(
    "failed transition requires structured retryability",
    () => {
        const attempting =
            transitionInsuranceContactAttempt(
                queued(),
                "attempting",
                time2
            );

        assert.throws(
            () =>
                transitionInsuranceContactAttempt(
                    attempting,
                    "failed",
                    "2026-09-28T18:02:00.000Z",
                    {
                        failureCode:
                            "provider-error",
                        failureMessage:
                            "Provider error."
                    }
                )
        );

        const failed =
            transitionInsuranceContactAttempt(
                attempting,
                "failed",
                "2026-09-28T18:02:00.000Z",
                {
                    failureCode:
                        "provider-error",
                    failureMessage:
                        "Provider error.",
                    retryable:
                        true
                }
            );

        assert.equal(
            failed.state,
            "failed"
        );

        assert.equal(
            failed.retryable,
            true
        );
    }
);

test(
    "eligibility allows granted unsuppressed channel",
    () => {
        assert.deepEqual(
            evaluateInsuranceContactEligibility(
                context(),
                "phone"
            ),
            {
                eligible:
                    true
            }
        );
    }
);

test(
    "eligibility rejects missing channel",
    () => {
        assert.deepEqual(
            evaluateInsuranceContactEligibility(
                context({
                    contactChannels:
                        []
                }),
                "phone"
            ),
            {
                eligible:
                    false,
                reason:
                    "channel-missing"
            }
        );
    }
);

test(
    "eligibility rejects denied revoked and unknown consent",
    () => {
        for(
            const status of [
                "denied",
                "revoked",
                "unknown"
            ] as const
        ){
            assert.deepEqual(
                evaluateInsuranceContactEligibility(
                    context({
                        contactChannels: [
                            {
                                channel:
                                    "phone",
                                status,
                                doNotContact:
                                    false
                            }
                        ]
                    }),
                    "phone"
                ),
                {
                    eligible:
                        false,
                    reason:
                        "consent-not-granted"
                }
            );
        }
    }
);

test(
    "eligibility rejects channel suppression",
    () => {
        assert.deepEqual(
            evaluateInsuranceContactEligibility(
                context({
                    contactChannels: [
                        {
                            channel:
                                "phone",
                            status:
                                "granted",
                            doNotContact:
                                true
                        }
                    ]
                }),
                "phone"
            ),
            {
                eligible:
                    false,
                reason:
                    "channel-suppressed"
            }
        );
    }
);

test(
    "eligibility rejects relationship suppression before channel evaluation",
    () => {
        assert.deepEqual(
            evaluateInsuranceContactEligibility(
                context({
                    doNotContact:
                        true
                }),
                "phone"
            ),
            {
                eligible:
                    false,
                reason:
                    "relationship-suppressed"
            }
        );
    }
);

test(
    "provider success result is normalized",
    () => {
        assert.deepEqual(
            createInsuranceContactProviderResult({
                accepted:
                    true,
                providerReference:
                    " ref-1 ",
                providerState:
                    " accepted "
            }),
            {
                accepted:
                    true,
                providerReference:
                    "ref-1",
                providerState:
                    "accepted"
            }
        );
    }
);

test(
    "provider failure requires code message and retryability",
    () => {
        assert.deepEqual(
            createInsuranceContactProviderResult({
                accepted:
                    false,
                code:
                    "timeout",
                message:
                    "Provider timeout.",
                retryable:
                    true
            }),
            {
                accepted:
                    false,
                code:
                    "timeout",
                message:
                    "Provider timeout.",
                retryable:
                    true
            }
        );

        assert.throws(
            () =>
                createInsuranceContactProviderResult({
                    accepted:
                        false,
                    code:
                        "timeout",
                    message:
                        "Provider timeout."
                })
        );
    }
);

test(
    "provider result rejects malformed input",
    () => {
        assert.throws(
            () =>
                createInsuranceContactProviderResult(
                    null
                )
        );

        assert.throws(
            () =>
                createInsuranceContactProviderResult({
                    accepted:
                        "yes"
                })
        );
    }
);
