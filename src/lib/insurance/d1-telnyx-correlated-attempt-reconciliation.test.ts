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
    planTelnyxCorrelatedAttemptEventReconciliation
} from "./telnyx-correlated-attempt-reconciliation";

import {
    createD1TelnyxCorrelatedAttemptReconciliationExecutor
} from "./d1-telnyx-correlated-attempt-reconciliation";

import type {
    InsuranceContactReconciliationD1Database,
    InsuranceContactReconciliationD1RunResult,
    InsuranceContactReconciliationD1Statement
} from "./d1-contact-event-reconciliation";

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
        "contact-attempt:e2c3d2-1"
    );

const attemptedAt =
    "2026-09-28T22:15:00.000Z";

const occurredAt =
    "2026-09-28T22:15:10.000Z";

const receivedAt =
    "2026-09-28T22:15:11.000Z";


function attempting(){
    return createInsuranceContactAttempt({
        attemptId,
        relationshipId:
            "relationship:e2c3d2-1",
        channel:
            "phone",
        intent:
            "instant-contact",
        state:
            "attempting",
        idempotencyKey:
            createInsuranceContactIdempotencyKey(
                "contact-idempotency:e2c3d2-1"
            ),
        provider:
            "telnyx",
        providerReference:
            "operator-call",
        requestedAt:
            attemptedAt,
        attemptedAt,
        createdAt:
            attemptedAt,
        updatedAt:
            attemptedAt
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

    return {
        event: {
            provider:
                "telnyx",
            providerEventId:
                `event:${legRole}:${type}`,
            type,
            occurredAt,
            callControlId
        },
        attempt:
            attempting(),
        correlation:
            createTelnyxCallLegCorrelation({
                attemptId,
                legRole,
                providerReference:
                    callControlId,
                createdAt:
                    attemptedAt
            }),
        legRole
    };
}


interface ExecutedStatement {
    readonly sql:
        string;

    readonly binds:
        unknown[];
}


class FakeStatement
implements InsuranceContactReconciliationD1Statement {

    public readonly binds:
        unknown[] = [];

    public constructor(
        private readonly database:
            FakeDatabase,
        public readonly sql:
            string
    ){}

    bind(
        ...values:
            unknown[]
    ){
        this.binds.push(
            ...values
        );

        return this;
    }

    async run(){
        this.database.executed.push({
            sql:
                this.sql,
            binds:
                [...this.binds]
        });

        return (
            this.database.runResults.shift() ??
            {
                success:
                    true,
                meta: {
                    changes:
                        1
                }
            }
        );
    }
}


class FakeDatabase
implements InsuranceContactReconciliationD1Database {

    public readonly executed:
        ExecutedStatement[] = [];

    public runResults:
        InsuranceContactReconciliationD1RunResult[] = [];

    prepare(
        sql:
            string
    ){
        return new FakeStatement(
            this,
            sql
        );
    }
}


test(
    "lead-leg update executes canonical CAS before provider-event receipt",
    async () => {
        const database =
            new FakeDatabase();

        const value =
            correlated(
                "lead",
                "call.bridged"
            );

        const result =
            await createD1TelnyxCorrelatedAttemptReconciliationExecutor(
                database
            ).execute({
                correlated:
                    value,
                plan:
                    planTelnyxCorrelatedAttemptEventReconciliation(
                        value
                    ),
                receivedAt
            });

        assert.deepEqual(
            result,
            {
                ok:
                    true,
                duplicate:
                    false,
                attemptUpdated:
                    true
            }
        );

        assert.equal(
            database.executed.length,
            2
        );

        assert.match(
            database.executed[0]!.sql,
            /UPDATE river_crm_contact_attempts/
        );

        assert.match(
            database.executed[1]!.sql,
            /INSERT OR IGNORE INTO\s+river_crm_contact_provider_events/
        );
    }
);


test(
    "lead-leg update preserves canonical operator providerReference in CAS",
    async () => {
        const database =
            new FakeDatabase();

        const value =
            correlated(
                "lead",
                "call.bridged"
            );

        await createD1TelnyxCorrelatedAttemptReconciliationExecutor(
            database
        ).execute({
            correlated:
                value,
            plan:
                planTelnyxCorrelatedAttemptEventReconciliation(
                    value
                ),
            receivedAt
        });

        assert.equal(
            database.executed[0]!.binds[3],
            "operator-call"
        );

        assert.equal(
            value.event.callControlId,
            "lead-call"
        );
    }
);


test(
    "CAS miss returns retryable stale-attempt and never consumes receipt",
    async () => {
        const database =
            new FakeDatabase();

        database.runResults = [
            {
                success:
                    true,
                meta: {
                    changes:
                        0
                }
            }
        ];

        const value =
            correlated(
                "lead",
                "call.bridged"
            );

        const result =
            await createD1TelnyxCorrelatedAttemptReconciliationExecutor(
                database
            ).execute({
                correlated:
                    value,
                plan:
                    planTelnyxCorrelatedAttemptEventReconciliation(
                        value
                    ),
                receivedAt
            });

        assert.deepEqual(
            result,
            {
                ok:
                    false,
                reason:
                    "stale-attempt",
                retryable:
                    true
            }
        );

        assert.equal(
            database.executed.length,
            1
        );

        assert.doesNotMatch(
            database.executed[0]!.sql,
            /river_crm_contact_provider_events/
        );
    }
);


test(
    "correlated no-op records receipt without attempt update",
    async () => {
        const database =
            new FakeDatabase();

        const value =
            correlated(
                "lead",
                "call.answered"
            );

        const result =
            await createD1TelnyxCorrelatedAttemptReconciliationExecutor(
                database
            ).execute({
                correlated:
                    value,
                plan:
                    planTelnyxCorrelatedAttemptEventReconciliation(
                        value
                    ),
                receivedAt
            });

        assert.deepEqual(
            result,
            {
                ok:
                    true,
                duplicate:
                    false,
                attemptUpdated:
                    false
            }
        );

        assert.equal(
            database.executed.length,
            1
        );

        assert.match(
            database.executed[0]!.sql,
            /INSERT OR IGNORE/
        );
    }
);


test(
    "duplicate correlated no-op receipt is idempotent",
    async () => {
        const database =
            new FakeDatabase();

        database.runResults = [
            {
                success:
                    true,
                meta: {
                    changes:
                        0
                }
            }
        ];

        const value =
            correlated(
                "lead",
                "call.answered"
            );

        const result =
            await createD1TelnyxCorrelatedAttemptReconciliationExecutor(
                database
            ).execute({
                correlated:
                    value,
                plan:
                    planTelnyxCorrelatedAttemptEventReconciliation(
                        value
                    ),
                receivedAt
            });

        assert.deepEqual(
            result,
            {
                ok:
                    true,
                duplicate:
                    true,
                attemptUpdated:
                    false
            }
        );
    }
);


test(
    "duplicate receipt after successful correlated CAS remains harmless",
    async () => {
        const database =
            new FakeDatabase();

        database.runResults = [
            {
                success:
                    true,
                meta: {
                    changes:
                        1
                }
            },
            {
                success:
                    true,
                meta: {
                    changes:
                        0
                }
            }
        ];

        const value =
            correlated(
                "lead",
                "call.bridged"
            );

        const result =
            await createD1TelnyxCorrelatedAttemptReconciliationExecutor(
                database
            ).execute({
                correlated:
                    value,
                plan:
                    planTelnyxCorrelatedAttemptEventReconciliation(
                        value
                    ),
                receivedAt
            });

        assert.deepEqual(
            result,
            {
                ok:
                    true,
                duplicate:
                    true,
                attemptUpdated:
                    true
            }
        );
    }
);


test(
    "receipt failure after successful correlated CAS is surfaced",
    async () => {
        const database =
            new FakeDatabase();

        database.runResults = [
            {
                success:
                    true,
                meta: {
                    changes:
                        1
                }
            },
            {
                success:
                    false,
                meta: {
                    changes:
                        0
                }
            }
        ];

        const value =
            correlated(
                "lead",
                "call.bridged"
            );

        await assert.rejects(
            createD1TelnyxCorrelatedAttemptReconciliationExecutor(
                database
            ).execute({
                correlated:
                    value,
                plan:
                    planTelnyxCorrelatedAttemptEventReconciliation(
                        value
                    ),
                receivedAt
            }),
            /provider-event receipt failed/
        );

        assert.equal(
            database.executed.length,
            2
        );
    }
);


test(
    "CAS retains exact prior state and updated_at predicates",
    async () => {
        const database =
            new FakeDatabase();

        const value =
            correlated(
                "lead",
                "call.bridged"
            );

        await createD1TelnyxCorrelatedAttemptReconciliationExecutor(
            database
        ).execute({
            correlated:
                value,
            plan:
                planTelnyxCorrelatedAttemptEventReconciliation(
                    value
                ),
            receivedAt
        });

        assert.deepEqual(
            database.executed[0]!.binds.slice(-2),
            [
                "attempting",
                attemptedAt
            ]
        );
    }
);


test(
    "executor accepts lead correlation even when canonical providerReference belongs to operator",
    async () => {
        const database =
            new FakeDatabase();

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

        await createD1TelnyxCorrelatedAttemptReconciliationExecutor(
            database
        ).execute({
            correlated:
                value,
            plan:
                planTelnyxCorrelatedAttemptEventReconciliation(
                    value
                ),
            receivedAt
        });

        assert.equal(
            database.executed.length,
            1
        );
    }
);


test(
    "executor rejects mismatched correlation provider reference before persistence",
    async () => {
        const database =
            new FakeDatabase();

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
                            attemptedAt
                    })
            };

        await assert.rejects(
            createD1TelnyxCorrelatedAttemptReconciliationExecutor(
                database
            ).execute({
                correlated:
                    mismatched,
                plan: {
                    kind:
                        "no-op",
                    reason:
                        "answered-observed",
                    attempt:
                        mismatched.attempt
                },
                receivedAt
            }),
            /matching correlation providerReference and event callControlId/
        );

        assert.equal(
            database.executed.length,
            0
        );
    }
);


test(
    "executor rejects mismatched resolved leg role before persistence",
    async () => {
        const database =
            new FakeDatabase();

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

        await assert.rejects(
            createD1TelnyxCorrelatedAttemptReconciliationExecutor(
                database
            ).execute({
                correlated:
                    mismatched,
                plan: {
                    kind:
                        "no-op",
                    reason:
                        "answered-observed",
                    attempt:
                        mismatched.attempt
                },
                receivedAt
            }),
            /matching resolved leg role/
        );

        assert.equal(
            database.executed.length,
            0
        );
    }
);


test(
    "executor rejects invalid receipt timestamp before persistence",
    async () => {
        const database =
            new FakeDatabase();

        const value =
            correlated(
                "lead",
                "call.answered"
            );

        await assert.rejects(
            createD1TelnyxCorrelatedAttemptReconciliationExecutor(
                database
            ).execute({
                correlated:
                    value,
                plan:
                    planTelnyxCorrelatedAttemptEventReconciliation(
                        value
                    ),
                receivedAt:
                    "invalid"
            }),
            /valid timestamp/
        );

        assert.equal(
            database.executed.length,
            0
        );
    }
);


test(
    "executor rejects invalid changed-row count",
    async () => {
        const database =
            new FakeDatabase();

        database.runResults = [
            {
                success:
                    true,
                meta: {
                    changes:
                        2
                }
            }
        ];

        const value =
            correlated(
                "lead",
                "call.bridged"
            );

        await assert.rejects(
            createD1TelnyxCorrelatedAttemptReconciliationExecutor(
                database
            ).execute({
                correlated:
                    value,
                plan:
                    planTelnyxCorrelatedAttemptEventReconciliation(
                        value
                    ),
                receivedAt
            }),
            /invalid changed-row count/
        );
    }
);
