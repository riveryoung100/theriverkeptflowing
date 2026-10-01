import assert from "node:assert/strict";
import test from "node:test";

import {
    createRiverCrmRelationship
} from "../river-os/crm-workspace";

import {
    createD1InsuranceLeadAppointmentExecutor,
    InsuranceLeadAppointmentConflictError
} from "./d1-lead-appointment";

import type {
    InsuranceLeadAppointmentD1Database,
    InsuranceLeadAppointmentD1RunResult,
    InsuranceLeadAppointmentD1Statement
} from "./d1-lead-appointment";


class FakeStatement
implements InsuranceLeadAppointmentD1Statement {

    public binds:
        unknown[] = [];

    public constructor(
        public readonly sql:
            string
    ) {}


    public bind(
        ...values:
            unknown[]
    ):
        InsuranceLeadAppointmentD1Statement {

        this.binds =
            values;

        return this;
    }
}


class FakeDatabase
implements InsuranceLeadAppointmentD1Database {

    public readonly prepared:
        FakeStatement[] = [];

    public readonly batchCalls:
        readonly FakeStatement[][] = [];

    public batchResults:
        readonly InsuranceLeadAppointmentD1RunResult[] |
        undefined;

    public batchError:
        Error |
        undefined;


    public prepare(
        sql:
            string
    ):
        InsuranceLeadAppointmentD1Statement {

        const statement =
            new FakeStatement(
                sql
            );

        this.prepared.push(
            statement
        );

        return statement;
    }


    public async batch(
        statements:
            readonly InsuranceLeadAppointmentD1Statement[]
    ):
        Promise<
            readonly InsuranceLeadAppointmentD1RunResult[]
        > {

        if(this.batchError !== undefined){
            throw this.batchError;
        }

        const captured =
            statements as
                readonly FakeStatement[];

        (this.batchCalls as FakeStatement[][]).push(
            [...captured]
        );

        if(this.batchResults !== undefined){
            return this.batchResults;
        }

        return captured.map(
            () => ({
                success:
                    true,

                meta: {
                    changes:
                        1
                }
            })
        );
    }
}


function relationship(
    appointmentAt?:
        string
){
    return createRiverCrmRelationship({
        relationshipId:
            "relationship:d1-appointment-1",

        displayName:
            "D1 Appointment Lead",

        kind:
            "lead",

        stage:
            "contacted",

        source:
            "website",

        nextFollowUpAt:
            "2026-10-03T16:00:00.000Z",

        ...(appointmentAt ===
            undefined
            ? {}
            : {
                appointmentAt
            }),

        createdAt:
            "2026-10-01T14:00:00.000Z",

        updatedAt:
            "2026-10-01T15:00:00.000Z"
    });
}


test(
    "D1 appointment executor performs zero writes for no-op",
    async () => {
        const database =
            new FakeDatabase();

        const result =
            await createD1InsuranceLeadAppointmentExecutor(
                database
            ).execute({
                relationship:
                    relationship(
                        "2026-10-04T14:30:00.000Z"
                    ),

                appointmentAt:
                    "2026-10-04T09:30:00-05:00",

                occurredAt:
                    "2026-10-01T14:00:00Z"
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
            database.batchCalls.length,
            0
        );
    }
);


test(
    "D1 appointment executor atomically batches narrow schedule update with appointment-set event",
    async () => {
        const database =
            new FakeDatabase();

        const current =
            relationship();

        const result =
            await createD1InsuranceLeadAppointmentExecutor(
                database
            ).execute({
                relationship:
                    current,

                appointmentAt:
                    "2026-10-04T09:30:00-05:00",

                occurredAt:
                    "2026-10-01T15:15:00-05:00",

                eventId:
                    "crm-event:d1-appointment-schedule",

                eventSource:
                    "river-os"
            });

        assert.equal(
            result.outcome,
            "scheduled"
        );

        assert.equal(
            result.writes,
            2
        );

        assert.equal(
            database.batchCalls.length,
            1
        );

        const batch =
            database.batchCalls[0]!;

        assert.equal(
            batch.length,
            2
        );

        assert.match(
            batch[1]!.sql,
            /UPDATE river_crm_relationships/
        );

        assert.match(
            batch[1]!.sql,
            /appointment_at = \?1/
        );

        assert.match(
            batch[1]!.sql,
            /updated_at = \?2/
        );

        assert.match(
            batch[1]!.sql,
            /relationship_id = \?3/
        );

        assert.match(
            batch[1]!.sql,
            /AND updated_at = \?4/
        );

        assert.doesNotMatch(
            batch[1]!.sql,
            /\bstage\b/
        );

        assert.doesNotMatch(
            batch[1]!.sql,
            /next_follow_up_at/
        );

        assert.deepEqual(
            batch[1]!.binds,
            [
                "2026-10-04T14:30:00.000Z",
                "2026-10-01T20:15:00.000Z",
                current.relationshipId,
                current.updatedAt
            ]
        );

        assert.match(
            batch[0]!.sql,
            /river_crm_relationship_events/
        );

        assert.match(
            batch[0]!.sql,
            /WHERE EXISTS/
        );

        assert.equal(
            batch[0]!.binds[0],
            "crm-event:d1-appointment-schedule"
        );

        assert.equal(
            batch[0]!.binds[2],
            "appointment-set"
        );

        assert.equal(
            batch[0]!.binds[4],
            "river-os"
        );

        assert.deepEqual(
            JSON.parse(
                String(
                    batch[0]!.binds[6]
                )
            ),
            {
                previousAppointmentAt:
                    null,

                appointmentAt:
                    "2026-10-04T14:30:00.000Z"
            }
        );

        assert.equal(
            batch[0]!.binds[7],
            current.updatedAt
        );

        assert.match(
            batch[0]!.sql,
            /AND updated_at = \?8/
        );

        assert.doesNotMatch(
            batch[0]!.sql,
            /appointment_at = \?9/
        );
    }
);


test(
    "D1 appointment executor reschedules with the same two-write contract",
    async () => {
        const database =
            new FakeDatabase();

        const result =
            await createD1InsuranceLeadAppointmentExecutor(
                database
            ).execute({
                relationship:
                    relationship(
                        "2026-10-04T14:30:00.000Z"
                    ),

                appointmentAt:
                    "2026-10-05T10:00:00-05:00",

                occurredAt:
                    "2026-10-01T21:00:00Z",

                eventId:
                    "crm-event:d1-appointment-reschedule",

                eventSource:
                    "river-os"
            });

        assert.equal(
            result.outcome,
            "rescheduled"
        );

        assert.equal(
            result.writes,
            2
        );

        assert.deepEqual(
            JSON.parse(
                String(
                    database.batchCalls[0]![0]!
                        .binds[6]
                )
            ),
            {
                previousAppointmentAt:
                    "2026-10-04T14:30:00.000Z",

                appointmentAt:
                    "2026-10-05T15:00:00.000Z"
            }
        );
    }
);


test(
    "D1 appointment executor clears with SQL NULL and no fabricated event",
    async () => {
        const database =
            new FakeDatabase();

        const result =
            await createD1InsuranceLeadAppointmentExecutor(
                database
            ).execute({
                relationship:
                    relationship(
                        "2026-10-04T14:30:00.000Z"
                    ),

                appointmentAt:
                    null,

                occurredAt:
                    "2026-10-01T21:00:00Z"
            });

        assert.equal(
            result.outcome,
            "cleared"
        );

        assert.equal(
            result.writes,
            1
        );

        const batch =
            database.batchCalls[0]!;

        assert.equal(
            batch.length,
            1
        );

        assert.equal(
            batch[0]!.binds[0],
            null
        );

        assert.doesNotMatch(
            batch[0]!.sql,
            /relationship_events/
        );
    }
);


test(
    "D1 appointment executor reports a concurrency conflict when compare-and-set changes zero rows",
    async () => {
        const database =
            new FakeDatabase();

        database.batchResults = [
            {
                success:
                    true,

                meta: {
                    changes:
                        0
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

        await assert.rejects(
            createD1InsuranceLeadAppointmentExecutor(
                database
            ).execute({
                relationship:
                    relationship(),

                appointmentAt:
                    "2026-10-04T15:00:00Z",

                occurredAt:
                    "2026-10-01T21:00:00Z",

                eventId:
                    "crm-event:d1-appointment-conflict",

                eventSource:
                    "river-os"
            }),
            InsuranceLeadAppointmentConflictError
        );
    }
);


test(
    "D1 appointment executor rejects a failed event batch member",
    async () => {
        const database =
            new FakeDatabase();

        database.batchResults = [
            {
                success:
                    false
            },
            {
                success:
                    true,

                meta: {
                    changes:
                        1
                }
            }
        ];

        await assert.rejects(
            createD1InsuranceLeadAppointmentExecutor(
                database
            ).execute({
                relationship:
                    relationship(),

                appointmentAt:
                    "2026-10-04T15:00:00Z",

                occurredAt:
                    "2026-10-01T21:00:00Z",

                eventId:
                    "crm-event:d1-appointment-member-failure",

                eventSource:
                    "river-os"
            }),
            /batch member 1 failed/
        );
    }
);


test(
    "D1 appointment executor rejects unexpected D1 result count",
    async () => {
        const database =
            new FakeDatabase();

        database.batchResults = [
            {
                success:
                    true,

                meta: {
                    changes:
                        1
                }
            }
        ];

        await assert.rejects(
            createD1InsuranceLeadAppointmentExecutor(
                database
            ).execute({
                relationship:
                    relationship(),

                appointmentAt:
                    "2026-10-04T15:00:00Z",

                occurredAt:
                    "2026-10-01T21:00:00Z",

                eventId:
                    "crm-event:d1-appointment-count",

                eventSource:
                    "river-os"
            }),
            /unexpected result count/
        );
    }
);


test(
    "D1 appointment executor rejects missing relationship change metadata",
    async () => {
        const database =
            new FakeDatabase();

        database.batchResults = [
            {
                success:
                    true
            }
        ];

        await assert.rejects(
            createD1InsuranceLeadAppointmentExecutor(
                database
            ).execute({
                relationship:
                    relationship(
                        "2026-10-04T14:30:00.000Z"
                    ),

                appointmentAt:
                    null,

                occurredAt:
                    "2026-10-01T21:00:00Z"
            }),
            /invalid change metadata/
        );
    }
);


test(
    "D1 appointment executor rejects inconsistent atomic schedule batch when guarded event insert is zero",
    async () => {
        const database =
            new FakeDatabase();

        database.batchResults = [
            {
                success:
                    true,

                meta: {
                    changes:
                        0
                }
            },
            {
                success:
                    true,

                meta: {
                    changes:
                        1
                }
            }
        ];

        await assert.rejects(
            createD1InsuranceLeadAppointmentExecutor(
                database
            ).execute({
                relationship:
                    relationship(),

                appointmentAt:
                    "2026-10-04T15:00:00Z",

                occurredAt:
                    "2026-10-01T21:00:00Z",

                eventId:
                    "crm-event:d1-appointment-event-zero",

                eventSource:
                    "river-os"
            }),
            /atomic schedule\/reschedule returned inconsistent change counts/
        );
    }
);


test(
    "D1 appointment executor propagates D1 batch infrastructure failure",
    async () => {
        const database =
            new FakeDatabase();

        database.batchError =
            new Error(
                "d1 batch unavailable"
            );

        await assert.rejects(
            createD1InsuranceLeadAppointmentExecutor(
                database
            ).execute({
                relationship:
                    relationship(
                        "2026-10-04T14:30:00.000Z"
                    ),

                appointmentAt:
                    null,

                occurredAt:
                    "2026-10-01T21:00:00Z"
            }),
            /d1 batch unavailable/
        );
    }
);
