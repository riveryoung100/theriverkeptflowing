import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceContactAttempt,
    transitionInsuranceContactAttempt
} from "./contact-attempt";

import {
    createD1InsuranceContactEventReconciliationExecutor
} from "./d1-contact-event-reconciliation";

import {
    planTelnyxAttemptEventReconciliation
} from "./telnyx-event-reconciliation";

import type {
    InsuranceContactReconciliationD1RunResult,
    InsuranceContactReconciliationD1Statement
} from "./d1-contact-event-reconciliation";

import type {
    TelnyxVoiceEvent
} from "./telnyx-voice-event";


interface FakeDatabaseOwner {
    readonly executed: FakeStatement[];
    runResults: InsuranceContactReconciliationD1RunResult[];
    runError: Error | undefined;
}

class FakeStatement
implements InsuranceContactReconciliationD1Statement {
    public readonly binds:
        unknown[][] = [];

    public constructor(
        private readonly owner:
            FakeDatabaseOwner,
        public readonly sql:
            string
    ){}

    bind(
        ...values:
            unknown[]
    ){
        this.binds.push(
            values
        );

        return this;
    }

    async run(){
        this.owner.executed.push(
            this
        );

        if(
            this.owner.runError !==
                undefined
        ){
            const error =
                this.owner.runError;

            this.owner.runError =
                undefined;

            throw error;
        }

        return this.owner.runResults.length > 0
            ? this.owner.runResults.shift()!
            : {
                success:
                    true,
                meta: {
                    changes:
                        1
                }
            };
    }
}


class FakeDatabase {
    public readonly prepared:
        FakeStatement[] = [];

    public readonly executed:
        FakeStatement[] = [];

    public runResults:
        InsuranceContactReconciliationD1RunResult[] = [];

    public runError:
        Error | undefined;

    prepare(
        sql:
            string
    ){
        const statement =
            new FakeStatement(
                this,
                sql
            );

        this.prepared.push(
            statement
        );

        return statement;
    }
}


const requestedAt =
    "2026-09-28T20:00:00.000Z";

const attemptedAt =
    "2026-09-28T20:00:01.000Z";

const bridgedAt =
    "2026-09-28T20:00:10.000Z";

const receivedAt =
    "2026-09-28T20:00:11.000Z";


function attempting(){
    const queued =
        createInsuranceContactAttempt({
            attemptId:
                "contact-attempt:e2b4-1",
            relationshipId:
                "relationship:e2b4-1",
            channel:
                "phone",
            intent:
                "instant-contact",
            state:
                "queued",
            idempotencyKey:
                "contact-idempotency:e2b4-1",
            provider:
                "telnyx",
            providerReference:
                "call-control-e2b4",
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
        TelnyxVoiceEvent["type"]
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
            "call-control-e2b4"
    };
}


test(
    "update plan executes CAS before provider-event receipt",
    async () => {
        const database =
            new FakeDatabase();

        const providerEvent =
            event(
                "call.bridged"
            );

        const result =
            await createD1InsuranceContactEventReconciliationExecutor(
                database
            ).execute({
                event:
                    providerEvent,
                plan:
                    planTelnyxAttemptEventReconciliation(
                        attempting(),
                        providerEvent
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
            database.executed[0]!.sql,
            /AND state = \?21[\s\S]*AND updated_at = \?22/
        );

        assert.match(
            database.executed[1]!.sql,
            /INSERT OR IGNORE INTO\s+river_crm_contact_provider_events/
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

        const providerEvent =
            event(
                "call.bridged"
            );

        const result =
            await createD1InsuranceContactEventReconciliationExecutor(
                database
            ).execute({
                event:
                    providerEvent,
                plan:
                    planTelnyxAttemptEventReconciliation(
                        attempting(),
                        providerEvent
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
    "no-op records receipt without attempt update",
    async () => {
        const database =
            new FakeDatabase();

        const providerEvent =
            event(
                "call.answered"
            );

        const result =
            await createD1InsuranceContactEventReconciliationExecutor(
                database
            ).execute({
                event:
                    providerEvent,
                plan:
                    planTelnyxAttemptEventReconciliation(
                        attempting(),
                        providerEvent
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
    "duplicate no-op receipt is idempotent",
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

        const providerEvent =
            event(
                "call.answered"
            );

        const result =
            await createD1InsuranceContactEventReconciliationExecutor(
                database
            ).execute({
                event:
                    providerEvent,
                plan:
                    planTelnyxAttemptEventReconciliation(
                        attempting(),
                        providerEvent
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
    "receipt failure after successful CAS is surfaced for recoverable redelivery",
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

        const providerEvent =
            event(
                "call.bridged"
            );

        await assert.rejects(
            createD1InsuranceContactEventReconciliationExecutor(
                database
            ).execute({
                event:
                    providerEvent,
                plan:
                    planTelnyxAttemptEventReconciliation(
                        attempting(),
                        providerEvent
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
    "duplicate receipt after successful CAS remains harmless",
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

        const providerEvent =
            event(
                "call.bridged"
            );

        const result =
            await createD1InsuranceContactEventReconciliationExecutor(
                database
            ).execute({
                event:
                    providerEvent,
                plan:
                    planTelnyxAttemptEventReconciliation(
                        attempting(),
                        providerEvent
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
    "CAS update retains exact prior state and updated_at predicates",
    async () => {
        const database =
            new FakeDatabase();

        const providerEvent =
            event(
                "call.bridged"
            );

        await createD1InsuranceContactEventReconciliationExecutor(
            database
        ).execute({
            event:
                providerEvent,
            plan:
                planTelnyxAttemptEventReconciliation(
                    attempting(),
                    providerEvent
                ),
            receivedAt
        });

        assert.deepEqual(
            database.executed[0]!.binds[0]?.slice(-2),
            [
                "attempting",
                attemptedAt
            ]
        );
    }
);


test(
    "executor rejects mismatched provider reference before persistence",
    async () => {
        const database =
            new FakeDatabase();

        const mismatched:
            TelnyxVoiceEvent = {
                ...event(
                    "call.answered"
                ),
                callControlId:
                    "different-call-control"
            };

        await assert.rejects(
            createD1InsuranceContactEventReconciliationExecutor(
                database
            ).execute({
                event:
                    mismatched,
                plan: {
                    kind:
                        "no-op",
                    reason:
                        "answered-observed",
                    attempt:
                        attempting()
                },
                receivedAt
            }),
            /matching providerReference and callControlId/
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

        const providerEvent =
            event(
                "call.answered"
            );

        await assert.rejects(
            createD1InsuranceContactEventReconciliationExecutor(
                database
            ).execute({
                event:
                    providerEvent,
                plan:
                    planTelnyxAttemptEventReconciliation(
                        attempting(),
                        providerEvent
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

        const providerEvent =
            event(
                "call.bridged"
            );

        await assert.rejects(
            createD1InsuranceContactEventReconciliationExecutor(
                database
            ).execute({
                event:
                    providerEvent,
                plan:
                    planTelnyxAttemptEventReconciliation(
                        attempting(),
                        providerEvent
                    ),
                receivedAt
            }),
            /invalid changed-row count/
        );
    }
);
