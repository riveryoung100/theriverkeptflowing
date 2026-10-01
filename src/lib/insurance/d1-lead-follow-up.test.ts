import assert from "node:assert/strict";
import test from "node:test";

import {
    createRiverCrmRelationship
} from "../river-os/crm-workspace";

import {
    createD1InsuranceLeadFollowUpExecutor,
    InsuranceLeadFollowUpConflictError
} from "./d1-lead-follow-up";

import type {
    InsuranceLeadFollowUpD1Database,
    InsuranceLeadFollowUpD1RunResult,
    InsuranceLeadFollowUpD1Statement
} from "./d1-lead-follow-up";


class FakeStatement
implements InsuranceLeadFollowUpD1Statement {

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
        InsuranceLeadFollowUpD1Statement {

        this.binds =
            values;

        return this;
    }


    public async run():
        Promise<
            InsuranceLeadFollowUpD1RunResult
        > {

        this.owner.runCalls +=
            1;

        if(
            this.owner.runError !==
            undefined
        ){
            throw this.owner
                .runError;
        }

        return this.owner
            .runResult;
    }
}


class FakeDatabase
implements InsuranceLeadFollowUpD1Database {

    public readonly prepared:
        FakeStatement[] = [];

    public runCalls =
        0;

    public runResult:
        InsuranceLeadFollowUpD1RunResult = {
            success:
                true,

            meta: {
                changes:
                    1
            }
        };

    public runError:
        Error |
        undefined;


    public prepare(
        sql:
            string
    ):
        InsuranceLeadFollowUpD1Statement {

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


function relationship(
    nextFollowUpAt?:
        string
){
    return createRiverCrmRelationship({
        relationshipId:
            "relationship:d1-follow-up-1",

        displayName:
            "D1 Follow Up Lead",

        kind:
            "lead",

        stage:
            "contacted",

        source:
            "website",

        ...(nextFollowUpAt ===
            undefined
            ? {}
            : {
                nextFollowUpAt
            }),

        createdAt:
            "2026-10-01T14:00:00.000Z",

        updatedAt:
            "2026-10-01T15:00:00.000Z"
    });
}


test(
    "D1 follow-up executor performs zero writes for no-op",
    async () => {
        const database =
            new FakeDatabase();

        const current =
            relationship(
                "2026-10-02T14:30:00.000Z"
            );

        const result =
            await createD1InsuranceLeadFollowUpExecutor(
                database
            ).execute({
                relationship:
                    current,

                nextFollowUpAt:
                    "2026-10-02T09:30:00-05:00",

                occurredAt:
                    "2026-10-01T21:00:00Z"
            });

        assert.equal(
            result.outcome,
            "no-op"
        );

        assert.equal(
            result.writes,
            0
        );

        assert.equal(
            database.prepared.length,
            0
        );

        assert.equal(
            database.runCalls,
            0
        );
    }
);


test(
    "D1 follow-up executor schedules through one narrow optimistic-concurrency update",
    async () => {
        const database =
            new FakeDatabase();

        const current =
            relationship();

        const result =
            await createD1InsuranceLeadFollowUpExecutor(
                database
            ).execute({
                relationship:
                    current,

                nextFollowUpAt:
                    "2026-10-02T09:30:00-05:00",

                occurredAt:
                    "2026-10-01T15:15:00-05:00"
            });

        assert.equal(
            result.outcome,
            "scheduled"
        );

        assert.equal(
            result.writes,
            1
        );

        assert.equal(
            database.prepared.length,
            1
        );

        assert.equal(
            database.runCalls,
            1
        );

        const statement =
            database.prepared[0]!;

        assert.match(
            statement.sql,
            /UPDATE river_crm_relationships/
        );

        assert.match(
            statement.sql,
            /next_follow_up_at = \?1/
        );

        assert.match(
            statement.sql,
            /updated_at = \?2/
        );

        assert.match(
            statement.sql,
            /relationship_id = \?3/
        );

        assert.match(
            statement.sql,
            /AND updated_at = \?4/
        );

        assert.doesNotMatch(
            statement.sql,
            /\bstage\b/
        );

        assert.doesNotMatch(
            statement.sql,
            /quote_status/
        );

        assert.doesNotMatch(
            statement.sql,
            /assigned_producer/
        );

        assert.doesNotMatch(
            statement.sql,
            /relationship_events/
        );

        assert.deepEqual(
            statement.binds,
            [
                "2026-10-02T14:30:00.000Z",
                "2026-10-01T20:15:00.000Z",
                current.relationshipId,
                current.updatedAt
            ]
        );
    }
);


test(
    "D1 follow-up executor clears reminder with SQL NULL",
    async () => {
        const database =
            new FakeDatabase();

        const current =
            relationship(
                "2026-10-02T14:30:00.000Z"
            );

        const result =
            await createD1InsuranceLeadFollowUpExecutor(
                database
            ).execute({
                relationship:
                    current,

                nextFollowUpAt:
                    null,

                occurredAt:
                    "2026-10-01T21:00:00Z"
            });

        assert.equal(
            result.outcome,
            "cleared"
        );

        assert.equal(
            result.relationship
                .nextFollowUpAt,
            undefined
        );

        assert.equal(
            database.prepared[0]!
                .binds[0],
            null
        );
    }
);


test(
    "D1 follow-up executor reports a concurrency conflict when compare-and-set changes zero rows",
    async () => {
        const database =
            new FakeDatabase();

        database.runResult = {
            success:
                true,

            meta: {
                changes:
                    0
            }
        };

        await assert.rejects(
            createD1InsuranceLeadFollowUpExecutor(
                database
            ).execute({
                relationship:
                    relationship(),

                nextFollowUpAt:
                    "2026-10-02T15:00:00Z",

                occurredAt:
                    "2026-10-01T21:00:00Z"
            }),
            InsuranceLeadFollowUpConflictError
        );
    }
);


test(
    "D1 follow-up executor rejects failed D1 result",
    async () => {
        const database =
            new FakeDatabase();

        database.runResult = {
            success:
                false,

            meta: {
                changes:
                    0
            }
        };

        await assert.rejects(
            createD1InsuranceLeadFollowUpExecutor(
                database
            ).execute({
                relationship:
                    relationship(),

                nextFollowUpAt:
                    "2026-10-02T15:00:00Z",

                occurredAt:
                    "2026-10-01T21:00:00Z"
            }),
            /D1 update failed/
        );
    }
);


test(
    "D1 follow-up executor rejects missing change metadata",
    async () => {
        const database =
            new FakeDatabase();

        database.runResult = {
            success:
                true
        };

        await assert.rejects(
            createD1InsuranceLeadFollowUpExecutor(
                database
            ).execute({
                relationship:
                    relationship(),

                nextFollowUpAt:
                    "2026-10-02T15:00:00Z",

                occurredAt:
                    "2026-10-01T21:00:00Z"
            }),
            /invalid change metadata/
        );
    }
);


test(
    "D1 follow-up executor rejects unexpected multi-row update",
    async () => {
        const database =
            new FakeDatabase();

        database.runResult = {
            success:
                true,

            meta: {
                changes:
                    2
            }
        };

        await assert.rejects(
            createD1InsuranceLeadFollowUpExecutor(
                database
            ).execute({
                relationship:
                    relationship(),

                nextFollowUpAt:
                    "2026-10-02T15:00:00Z",

                occurredAt:
                    "2026-10-01T21:00:00Z"
            }),
            /unexpected number of rows/
        );
    }
);
