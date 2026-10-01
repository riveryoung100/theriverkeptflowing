import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceLeadProfile
} from "./lead-profile";

import {
    createD1InsuranceLeadOperatingStateExecutor
} from "./d1-lead-operating-state";

import {
    createRiverCrmRelationship
} from "../river-os/crm-workspace";

import type {
    InsuranceLeadOperatingStateD1Database,
    InsuranceLeadOperatingStateD1RunResult,
    InsuranceLeadOperatingStateD1Statement
} from "./d1-lead-operating-state";

import type {
    PlanInsuranceLeadOperatingStateInput
} from "./lead-operating-state";


class FakeStatement
implements InsuranceLeadOperatingStateD1Statement {
    public readonly binds:
        unknown[][] = [];

    public constructor(
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
}


class FakeDatabase
implements InsuranceLeadOperatingStateD1Database {
    public readonly prepared:
        FakeStatement[] = [];

    public readonly batchCalls:
        FakeStatement[][] = [];

    public batchError:
        Error |
        undefined;

    public batchResults:
        readonly InsuranceLeadOperatingStateD1RunResult[] |
        undefined;

    prepare(
        sql:
            string
    ){
        const statement =
            new FakeStatement(
                sql
            );

        this.prepared.push(
            statement
        );

        return statement;
    }

    async batch(
        statements:
            readonly InsuranceLeadOperatingStateD1Statement[]
    ){
        if(this.batchError !== undefined){
            throw this.batchError;
        }

        const concrete =
            statements as
                readonly FakeStatement[];

        this.batchCalls.push(
            [...concrete]
        );

        if(this.batchResults !== undefined){
            return this.batchResults;
        }

        return concrete.map(
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


const relationshipId =
    "relationship:operating-d1-1";


function relationship(){
    return createRiverCrmRelationship({
        relationshipId,

        displayName:
            "River Test",

        kind:
            "lead",

        stage:
            "new",

        source:
            "website",

        email:
            "river@example.com",

        phone:
            "4325550100",

        owner:
            "River",

        createdAt:
            "2026-10-01T12:00:00.000Z",

        updatedAt:
            "2026-10-01T12:00:00.000Z"
    });
}


function profile(){
    return createInsuranceLeadProfile({
        relationshipId,

        state:
            "tx",

        postalCode:
            "79720",

        productInterest:
            "home",

        quoteStatus:
            "requested",

        assignedProducer:
            "River",

        createdAt:
            "2026-10-01T12:00:00.000Z",

        updatedAt:
            "2026-10-01T12:00:00.000Z"
    });
}


function input(
    overrides:
        Partial<
            PlanInsuranceLeadOperatingStateInput
        > = {}
):
    PlanInsuranceLeadOperatingStateInput {

    return {
        relationship:
            relationship(),

        profile:
            profile(),

        stage:
            "new",

        quoteStatus:
            "requested",

        assignedProducer:
            "River",

        occurredAt:
            "2026-10-01T13:00:00.000Z",

        ...overrides
    };
}


test(
    "D1 operating-state executor performs zero writes for no-op plan",
    async () => {
        const database =
            new FakeDatabase();

        const result =
            await createD1InsuranceLeadOperatingStateExecutor(
                database
            ).execute(
                input()
            );

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
    "D1 operating-state executor writes only insurance profile for quote and producer changes",
    async () => {
        const database =
            new FakeDatabase();

        const result =
            await createD1InsuranceLeadOperatingStateExecutor(
                database
            ).execute(
                input({
                    quoteStatus:
                        "quoted",

                    assignedProducer:
                        " Nathan "
                })
            );

        assert.equal(
            result.outcome,
            "updated"
        );

        assert.equal(
            result.writes,
            1
        );

        assert.equal(
            database.batchCalls.length,
            1
        );

        const batch =
            database.batchCalls[0]!;

        assert.equal(
            batch.length,
            1
        );

        assert.match(
            batch[0]!.sql,
            /river_crm_insurance_lead_profiles/
        );

        assert.doesNotMatch(
            batch[0]!.sql,
            /river_crm_relationship_events/
        );

        assert.deepEqual(
            batch[0]!.binds[0],
            [
                relationshipId,
                "TX",
                "79720",
                "home",
                "quoted",
                "Nathan",
                "2026-10-01T12:00:00.000Z",
                "2026-10-01T13:00:00.000Z"
            ]
        );
    }
);


test(
    "D1 operating-state executor batches stage mutation with immutable audit event",
    async () => {
        const database =
            new FakeDatabase();

        const result =
            await createD1InsuranceLeadOperatingStateExecutor(
                database
            ).execute(
                input({
                    stage:
                        "contacted",

                    eventId:
                        "crm-event:operating-d1-stage",

                    eventSource:
                        "river-os"
                })
            );

        assert.equal(
            result.outcome,
            "updated"
        );

        assert.equal(
            result.writes,
            2
        );

        const batch =
            database.batchCalls[0]!;

        assert.equal(
            batch.length,
            2
        );

        assert.match(
            batch[0]!.sql,
            /river_crm_relationships/
        );

        assert.match(
            batch[1]!.sql,
            /river_crm_relationship_events/
        );

        assert.equal(
            batch[0]!.binds[0]?.[3],
            "contacted"
        );

        assert.equal(
            batch[0]!.binds[0]?.[11],
            "2026-10-01T13:00:00.000Z"
        );

        assert.equal(
            batch[1]!.binds[0]?.[0],
            "crm-event:operating-d1-stage"
        );

        assert.equal(
            batch[1]!.binds[0]?.[1],
            relationshipId
        );

        assert.equal(
            batch[1]!.binds[0]?.[2],
            "stage-changed"
        );

        assert.equal(
            batch[1]!.binds[0]?.[4],
            "river-os"
        );

        assert.deepEqual(
            JSON.parse(
                String(
                    batch[1]!.binds[0]?.[6]
                )
            ),
            {
                fromStage:
                    "new",

                toStage:
                    "contacted",

                quoteStatusBefore:
                    "requested",

                quoteStatusAfter:
                    "requested",

                assignedProducerBefore:
                    "River",

                assignedProducerAfter:
                    "River"
            }
        );
    }
);


test(
    "D1 operating-state executor commits combined relationship profile and event plan in one batch",
    async () => {
        const database =
            new FakeDatabase();

        const result =
            await createD1InsuranceLeadOperatingStateExecutor(
                database
            ).execute(
                input({
                    stage:
                        "qualified",

                    quoteStatus:
                        "in-progress",

                    assignedProducer:
                        null,

                    eventId:
                        "crm-event:operating-d1-combined",

                    eventSource:
                        "river-os"
                })
            );

        assert.equal(
            result.outcome,
            "updated"
        );

        assert.equal(
            result.writes,
            3
        );

        assert.equal(
            database.batchCalls.length,
            1
        );

        const batch =
            database.batchCalls[0]!;

        assert.equal(
            batch.length,
            3
        );

        assert.match(
            batch[0]!.sql,
            /river_crm_relationships/
        );

        assert.match(
            batch[1]!.sql,
            /river_crm_insurance_lead_profiles/
        );

        assert.match(
            batch[2]!.sql,
            /river_crm_relationship_events/
        );

        assert.equal(
            batch[1]!.binds[0]?.[4],
            "in-progress"
        );

        assert.equal(
            batch[1]!.binds[0]?.[5],
            null
        );

        assert.deepEqual(
            JSON.parse(
                String(
                    batch[2]!.binds[0]?.[6]
                )
            ),
            {
                fromStage:
                    "new",

                toStage:
                    "qualified",

                quoteStatusBefore:
                    "requested",

                quoteStatusAfter:
                    "in-progress",

                assignedProducerBefore:
                    "River",

                assignedProducerAfter:
                    null
            }
        );
    }
);


test(
    "D1 operating-state executor preserves unchanged generic relationship fields",
    async () => {
        const database =
            new FakeDatabase();

        await createD1InsuranceLeadOperatingStateExecutor(
            database
        ).execute(
            input({
                stage:
                    "contacted",

                eventId:
                    "crm-event:preserve-fields",

                eventSource:
                    "river-os"
            })
        );

        const relationshipWrite =
            database.batchCalls[0]?.[0];

        assert.ok(
            relationshipWrite
        );

        assert.deepEqual(
            relationshipWrite.binds[0],
            [
                relationshipId,
                "River Test",
                "lead",
                "contacted",
                "website",
                "river@example.com",
                "4325550100",
                "River",
                null,
                null,
                "2026-10-01T12:00:00.000Z",
                "2026-10-01T13:00:00.000Z"
            ]
        );
    }
);


test(
    "D1 operating-state executor rejects invalid domain state before preparing writes",
    async () => {
        const database =
            new FakeDatabase();

        const mismatchedProfile =
            createInsuranceLeadProfile({
                ...profile(),

                relationshipId:
                    "relationship:different"
            });

        await assert.rejects(
            createD1InsuranceLeadOperatingStateExecutor(
                database
            ).execute(
                input({
                    profile:
                        mismatchedProfile
                })
            ),
            /identity to match/
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
    "D1 operating-state executor requires audit identity before preparing stage writes",
    async () => {
        const database =
            new FakeDatabase();

        await assert.rejects(
            createD1InsuranceLeadOperatingStateExecutor(
                database
            ).execute(
                input({
                    stage:
                        "contacted"
                })
            ),
            /event identity|event source/
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
    "D1 operating-state executor propagates D1 batch failure",
    async () => {
        const database =
            new FakeDatabase();

        database.batchError =
            new Error(
                "d1 batch unavailable"
            );

        await assert.rejects(
            createD1InsuranceLeadOperatingStateExecutor(
                database
            ).execute(
                input({
                    stage:
                        "contacted",

                    eventId:
                        "crm-event:batch-failure",

                    eventSource:
                        "river-os"
                })
            ),
            /d1 batch unavailable/
        );

        assert.equal(
            database.batchCalls.length,
            0
        );
    }
);


test(
    "D1 operating-state executor rejects a failed batch member",
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
            },
            {
                success:
                    false
            }
        ];

        await assert.rejects(
            createD1InsuranceLeadOperatingStateExecutor(
                database
            ).execute(
                input({
                    stage:
                        "contacted",

                    eventId:
                        "crm-event:failed-member",

                    eventSource:
                        "river-os"
                })
            ),
            /batch member 2 failed/
        );

        assert.equal(
            database.batchCalls.length,
            1
        );
    }
);


test(
    "D1 operating-state executor rejects unexpected D1 result count",
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
            createD1InsuranceLeadOperatingStateExecutor(
                database
            ).execute(
                input({
                    stage:
                        "contacted",

                    eventId:
                        "crm-event:wrong-result-count",

                    eventSource:
                        "river-os"
                })
            ),
            /unexpected result count/
        );
    }
);
