import assert from "node:assert/strict";
import test from "node:test";

import {
    createD1InsuranceContactAttemptPersistence
} from "./d1-contact-attempt";

import {
    createInsuranceContactAttempt
} from "./contact-attempt";

import type {
    RiverCrmD1AllResult,
    RiverCrmD1Database,
    RiverCrmD1RunResult,
    RiverCrmD1Statement
} from "../river-os/d1-crm-growth";

import type {
    InsuranceContactAttempt
} from "./contact-attempt";


const relationshipId =
    "relationship:ins-002b";

const timestamp =
    "2026-09-28T18:30:00.000Z";


function queued():
    InsuranceContactAttempt {

    return createInsuranceContactAttempt({
        attemptId:
            "contact-attempt:persistence-1",
        relationshipId,
        channel:
            "phone",
        intent:
            "callback",
        state:
            "queued",
        idempotencyKey:
            "idem:persistence-1",
        requestedAt:
            timestamp,
        createdAt:
            timestamp,
        updatedAt:
            timestamp
    });
}


interface RecordedStatement {
    sql:
        string;

    binds:
        unknown[];
}


class FakeStatement
implements RiverCrmD1Statement {

    public binds:
        unknown[] = [];

    public constructor(
        private readonly owner:
            FakeDatabase,
        public readonly sql:
            string
    ) {}


    public bind(
        ...values:
            unknown[]
    ):
        RiverCrmD1Statement {

        this.binds =
            values;

        this.owner.recorded.push({
            sql:
                this.sql,
            binds:
                values
        });

        return this;
    }


    public async first<
        T = Record<string, unknown>
    >():
        Promise<T | null> {

        return this.owner.firstResult as
            T | null;
    }


    public async all<
        T = Record<string, unknown>
    >():
        Promise<
            RiverCrmD1AllResult<T>
        > {

        return {
            success:
                this.owner.allSuccess,
            results:
                this.owner.allResults as
                    readonly T[]
        };
    }


    public async run():
        Promise<
            RiverCrmD1RunResult
        > {

        if(
            this.owner.runError !==
                undefined
        ){
            throw this.owner.runError;
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


class FakeDatabase
implements RiverCrmD1Database {

    public readonly recorded:
        RecordedStatement[] = [];

    public firstResult:
        Record<string, unknown> |
        null =
            null;

    public allResults:
        readonly Record<string, unknown>[] =
            [];

    public allSuccess:
        boolean | undefined =
            true;

    public runResults:
        RiverCrmD1RunResult[] =
            [];

    public runError:
        Error | undefined;


    public prepare(
        sql:
            string
    ):
        RiverCrmD1Statement {

        return new FakeStatement(
            this,
            sql
        );
    }
}


test(
    "migration defines canonical attempt and provider-event receipt tables",
    async () => {
        const fs =
            await import(
                "node:fs/promises"
            );

        const migration =
            await fs.readFile(
                "migrations/river-crm/0003_river_crm_contact_attempts.sql",
                "utf8"
            );

        assert.match(
            migration,
            /CREATE TABLE IF NOT EXISTS river_crm_contact_attempts/
        );

        assert.match(
            migration,
            /CREATE TABLE IF NOT EXISTS river_crm_contact_provider_events/
        );

        assert.match(
            migration,
            /idempotency_key TEXT NOT NULL UNIQUE/
        );

        assert.match(
            migration,
            /FOREIGN KEY \(relationship_id\)[\s\S]*REFERENCES river_crm_relationships/
        );

        assert.match(
            migration,
            /FOREIGN KEY \(trigger_event_id\)[\s\S]*REFERENCES river_crm_relationship_events/
        );

        assert.doesNotMatch(
            migration,
            /raw_payload|payload_json|request_body/
        );
    }
);


test(
    "insertAttempt validates and binds canonical nullable storage",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceContactAttemptPersistence(
                database
            );

        await persistence.insertAttempt(
            queued()
        );

        assert.equal(
            database.recorded.length,
            1
        );

        const write =
            database.recorded[0]!;

        assert.match(
            write.sql,
            /INSERT INTO river_crm_contact_attempts/
        );

        assert.equal(
            write.binds[0],
            "contact-attempt:persistence-1"
        );

        assert.equal(
            write.binds[1],
            relationshipId
        );

        assert.equal(
            write.binds[2],
            null
        );

        assert.equal(
            write.binds[17],
            null
        );
    }
);


test(
    "insertAttempt rejects noncanonical attempt before D1 write",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceContactAttemptPersistence(
                database
            );

        await assert.rejects(
            () =>
                persistence.insertAttempt({
                    ...queued(),
                    attemptId:
                        "bad-attempt" as
                            InsuranceContactAttempt["attemptId"]
                })
        );

        assert.equal(
            database.recorded.length,
            0
        );
    }
);


test(
    "updateAttempt protects immutable request identity in WHERE clause",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceContactAttemptPersistence(
                database
            );

        await persistence.updateAttempt(
            queued()
        );

        const update =
            database.recorded[0]!;

        assert.match(
            update.sql,
            /UPDATE river_crm_contact_attempts/
        );

        assert.match(
            update.sql,
            /attempt_id = \?14/
        );

        assert.match(
            update.sql,
            /relationship_id = \?15/
        );

        assert.match(
            update.sql,
            /channel = \?16/
        );

        assert.match(
            update.sql,
            /intent = \?17/
        );

        assert.match(
            update.sql,
            /idempotency_key = \?18/
        );

        assert.match(
            update.sql,
            /requested_at = \?19/
        );

        assert.match(
            update.sql,
            /created_at = \?20/
        );
    }
);


test(
    "updateAttempt rejects missing or immutable-mismatch row",
    async () => {
        const database =
            new FakeDatabase();

        database.runResults.push({
            success:
                true,
            meta: {
                changes:
                    0
            }
        });

        const persistence =
            createD1InsuranceContactAttemptPersistence(
                database
            );

        await assert.rejects(
            () =>
                persistence.updateAttempt(
                    queued()
                ),
            /expected exactly one changed row/
        );
    }
);


test(
    "getAttempt maps persisted row through canonical constructor",
    async () => {
        const database =
            new FakeDatabase();

        database.firstResult = {
            attempt_id:
                "contact-attempt:persistence-1",
            relationship_id:
                relationshipId,
            trigger_event_id:
                null,
            channel:
                "phone",
            intent:
                "callback",
            state:
                "queued",
            idempotency_key:
                "idem:persistence-1",
            provider:
                null,
            provider_reference:
                null,
            requested_at:
                timestamp,
            attempted_at:
                null,
            connected_at:
                null,
            completed_at:
                null,
            failed_at:
                null,
            canceled_at:
                null,
            failure_code:
                null,
            failure_message:
                null,
            retryable:
                null,
            created_at:
                timestamp,
            updated_at:
                timestamp
        };

        const persistence =
            createD1InsuranceContactAttemptPersistence(
                database
            );

        const found =
            await persistence.getAttempt(
                "contact-attempt:persistence-1"
            );

        assert.equal(
            found?.attemptId,
            "contact-attempt:persistence-1"
        );

        assert.equal(
            found?.relationshipId,
            relationshipId
        );

        assert.equal(
            found?.retryable,
            undefined
        );
    }
);


test(
    "getAttempt returns undefined when no row exists",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceContactAttemptPersistence(
                database
            );

        assert.equal(
            await persistence.getAttempt(
                "contact-attempt:missing"
            ),
            undefined
        );
    }
);


test(
    "getAttempt rejects malformed canonical attempt ID before querying",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceContactAttemptPersistence(
                database
            );

        await assert.rejects(
            () =>
                persistence.getAttempt(
                    "attempt:bad"
                )
        );

        assert.equal(
            database.recorded.length,
            0
        );
    }
);


test(
    "listAttemptsForRelationship uses newest-first ordering and bounded limit",
    async () => {
        const database =
            new FakeDatabase();

        database.allResults = [];

        const persistence =
            createD1InsuranceContactAttemptPersistence(
                database
            );

        await persistence.listAttemptsForRelationship(
            relationshipId,
            25
        );

        const query =
            database.recorded[0]!;

        assert.match(
            query.sql,
            /WHERE relationship_id = \?1/
        );

        assert.match(
            query.sql,
            /ORDER BY\s+requested_at DESC,\s+attempt_id ASC/
        );

        assert.equal(
            query.binds[0],
            relationshipId
        );

        assert.equal(
            query.binds[1],
            25
        );

        await assert.rejects(
            () =>
                persistence.listAttemptsForRelationship(
                    relationshipId,
                    0
                )
        );
    }
);


test(
    "persisted retryable maps zero and one",
    async () => {
        for(
            const [
                stored,
                expected
            ] of [
                [
                    0,
                    false
                ],
                [
                    1,
                    true
                ]
            ] as const
        ){
            const database =
                new FakeDatabase();

            database.firstResult = {
                attempt_id:
                    `contact-attempt:retryable-${stored}`,
                relationship_id:
                    relationshipId,
                trigger_event_id:
                    null,
                channel:
                    "phone",
                intent:
                    "callback",
                state:
                    "failed",
                idempotency_key:
                    `idem:retryable-${stored}`,
                provider:
                    "test-provider",
                provider_reference:
                    `provider-${stored}`,
                requested_at:
                    timestamp,
                attempted_at:
                    timestamp,
                connected_at:
                    null,
                completed_at:
                    null,
                failed_at:
                    timestamp,
                canceled_at:
                    null,
                failure_code:
                    "provider-error",
                failure_message:
                    "Provider error.",
                retryable:
                    stored,
                created_at:
                    timestamp,
                updated_at:
                    timestamp
            };

            const persistence =
                createD1InsuranceContactAttemptPersistence(
                    database
                );

            const found =
                await persistence.getAttempt(
                    `contact-attempt:retryable-${stored}`
                );

            assert.equal(
                found?.retryable,
                expected
            );
        }
    }
);


test(
    "invalid persisted retryable value is rejected",
    async () => {
        const database =
            new FakeDatabase();

        database.firstResult = {
            attempt_id:
                "contact-attempt:invalid-retryable",
            relationship_id:
                relationshipId,
            trigger_event_id:
                null,
            channel:
                "phone",
            intent:
                "callback",
            state:
                "failed",
            idempotency_key:
                "idem:invalid-retryable",
            provider:
                "test-provider",
            provider_reference:
                "provider-invalid",
            requested_at:
                timestamp,
            attempted_at:
                timestamp,
            connected_at:
                null,
            completed_at:
                null,
            failed_at:
                timestamp,
            canceled_at:
                null,
            failure_code:
                "provider-error",
            failure_message:
                "Provider error.",
            retryable:
                2,
            created_at:
                timestamp,
            updated_at:
                timestamp
        };

        const persistence =
            createD1InsuranceContactAttemptPersistence(
                database
            );

        await assert.rejects(
            () =>
                persistence.getAttempt(
                    "contact-attempt:invalid-retryable"
                ),
            /retryable/
        );
    }
);


test(
    "provider event receipt returns true for first durable receipt",
    async () => {
        const database =
            new FakeDatabase();

        database.runResults.push({
            success:
                true,
            meta: {
                changes:
                    1
            }
        });

        const persistence =
            createD1InsuranceContactAttemptPersistence(
                database
            );

        assert.equal(
            await persistence.recordProviderEventReceipt({
                provider:
                    "provider-test",
                providerEventId:
                    "event-1",
                attemptId:
                    queued().attemptId,
                receivedAt:
                    timestamp
            }),
            true
        );

        const write =
            database.recorded[0]!;

        assert.match(
            write.sql,
            /INSERT OR IGNORE INTO\s+river_crm_contact_provider_events/
        );

        assert.deepEqual(
            write.binds,
            [
                "provider-test",
                "event-1",
                "contact-attempt:persistence-1",
                timestamp
            ]
        );
    }
);


test(
    "provider event receipt returns false for duplicate",
    async () => {
        const database =
            new FakeDatabase();

        database.runResults.push({
            success:
                true,
            meta: {
                changes:
                    0
            }
        });

        const persistence =
            createD1InsuranceContactAttemptPersistence(
                database
            );

        assert.equal(
            await persistence.recordProviderEventReceipt({
                provider:
                    "provider-test",
                providerEventId:
                    "event-1",
                receivedAt:
                    timestamp
            }),
            false
        );
    }
);


test(
    "provider event receipt rejects invalid changed-row count",
    async () => {
        const database =
            new FakeDatabase();

        database.runResults.push({
            success:
                true,
            meta: {
                changes:
                    2
            }
        });

        const persistence =
            createD1InsuranceContactAttemptPersistence(
                database
            );

        await assert.rejects(
            () =>
                persistence.recordProviderEventReceipt({
                    provider:
                        "provider-test",
                    providerEventId:
                        "event-1",
                    receivedAt:
                        timestamp
                }),
            /invalid changed-row count/
        );
    }
);


test(
    "D1 run failure propagates",
    async () => {
        const database =
            new FakeDatabase();

        database.runError =
            new Error(
                "D1 unavailable"
            );

        const persistence =
            createD1InsuranceContactAttemptPersistence(
                database
            );

        await assert.rejects(
            () =>
                persistence.insertAttempt(
                    queued()
                ),
            /D1 unavailable/
        );
    }
);


test(
    "provider-reference lookup binds provider identity and returns canonical attempt",
    async () => {
        const database =
            new FakeDatabase();

        database.firstResult = {
            attempt_id:
                "contact-attempt:provider-reference-1",
            relationship_id:
                "relationship:provider-reference-1",
            trigger_event_id:
                null,
            channel:
                "phone",
            intent:
                "instant-contact",
            state:
                "attempting",
            idempotency_key:
                "contact-idempotency:provider-reference-1",
            provider:
                "telnyx",
            provider_reference:
                "call-control-1",
            requested_at:
                timestamp,
            attempted_at:
                timestamp,
            connected_at:
                null,
            completed_at:
                null,
            failed_at:
                null,
            canceled_at:
                null,
            failure_code:
                null,
            failure_message:
                null,
            retryable:
                null,
            created_at:
                timestamp,
            updated_at:
                timestamp
        };

        const persistence =
            createD1InsuranceContactAttemptPersistence(
                database
            );

        const result =
            await persistence.getAttemptByProviderReference(
                "telnyx",
                "call-control-1"
            );

        assert.ok(
            result
        );

        assert.equal(
            result.attemptId,
            "contact-attempt:provider-reference-1"
        );

        assert.equal(
            result.provider,
            "telnyx"
        );

        assert.equal(
            result.providerReference,
            "call-control-1"
        );

        const read =
            database.recorded[0]!;

        assert.match(
            read.sql,
            /WHERE\s+provider = \?1\s+AND provider_reference = \?2/i
        );

        assert.deepEqual(
            read.binds,
            [
                "telnyx",
                "call-control-1"
            ]
        );
    }
);


test(
    "provider-reference lookup returns undefined when no attempt matches",
    async () => {
        const database =
            new FakeDatabase();

        database.firstResult =
            null;

        const persistence =
            createD1InsuranceContactAttemptPersistence(
                database
            );

        assert.equal(
            await persistence.getAttemptByProviderReference(
                "telnyx",
                "missing-call-control"
            ),
            undefined
        );
    }
);


test(
    "provider-reference lookup rejects blank provider identity",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceContactAttemptPersistence(
                database
            );

        await assert.rejects(
            () =>
                persistence.getAttemptByProviderReference(
                    "",
                    "call-control-1"
                ),
            /provider/
        );

        assert.equal(
            database.recorded.length,
            0
        );
    }
);


test(
    "provider-reference lookup rejects blank provider reference",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceContactAttemptPersistence(
                database
            );

        await assert.rejects(
            () =>
                persistence.getAttemptByProviderReference(
                    "telnyx",
                    " "
                ),
            /provider_reference/
        );

        assert.equal(
            database.recorded.length,
            0
        );
    }
);

test(
    "listAttemptsForRelationships performs no query for an empty cohort",
    async () => {
        const database =
            new FakeDatabase();

        const result =
            await createD1InsuranceContactAttemptPersistence(
                database
            ).listAttemptsForRelationships([]);

        assert.deepEqual(
            result,
            []
        );

        assert.equal(
            database.recorded.length,
            0
        );
    }
);


test(
    "listAttemptsForRelationships deduplicates IDs and bounds newest attempts per relationship",
    async () => {
        const database =
            new FakeDatabase();

        database.allResults = [];

        await createD1InsuranceContactAttemptPersistence(
            database
        ).listAttemptsForRelationships(
            [
                relationshipId,
                relationshipId,
                "relationship:ins-007s-two"
            ],
            5
        );

        assert.equal(
            database.recorded.length,
            1
        );

        const query =
            database.recorded[0]!;

        assert.deepEqual(
            query.binds,
            [
                relationshipId,
                "relationship:ins-007s-two"
            ]
        );

        assert.match(
            query.sql,
            /WHERE relationship_id IN \(\?, \?\)/
        );

        assert.match(
            query.sql,
            /ROW_NUMBER\(\)\s+OVER/i
        );

        assert.match(
            query.sql,
            /PARTITION BY relationship_id/i
        );

        assert.match(
            query.sql,
            /river_attempt_rank\s*<=\s*5/i
        );

        assert.match(
            query.sql,
            /ORDER BY\s+relationship_id ASC,\s+requested_at DESC,\s+attempt_id ASC/i
        );

        assert.doesNotMatch(
            query.sql,
            /\b(?:INSERT|UPDATE|DELETE|REPLACE|UPSERT)\b/i
        );
    }
);


test(
    "listAttemptsForRelationships chunks one hundred plus one relationships",
    async () => {
        const database =
            new FakeDatabase();

        database.allResults = [];

        const relationshipIds =
            Array.from(
                {
                    length:
                        101
                },
                (
                    _,
                    index
                ) =>
                    `relationship:ins-007s-${String(
                        index
                    ).padStart(
                        4,
                        "0"
                    )}`
            );

        await createD1InsuranceContactAttemptPersistence(
            database
        ).listAttemptsForRelationships(
            relationshipIds,
            3
        );

        assert.equal(
            database.recorded.length,
            2
        );

        assert.equal(
            database.recorded[0]!
                .binds.length,
            100
        );

        assert.equal(
            database.recorded[1]!
                .binds.length,
            1
        );

        for(const query of database.recorded){
            assert.match(
                query.sql,
                /river_attempt_rank\s*<=\s*3/i
            );
        }
    }
);


test(
    "listAttemptsForRelationships rejects invalid relationship identity before querying",
    async () => {
        const database =
            new FakeDatabase();

        await assert.rejects(
            createD1InsuranceContactAttemptPersistence(
                database
            ).listAttemptsForRelationships([
                "not-a-relationship"
            ]),
            /canonical River CRM relationship identity/
        );

        assert.equal(
            database.recorded.length,
            0
        );
    }
);
