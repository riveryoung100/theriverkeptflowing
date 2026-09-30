import assert from "node:assert/strict";
import test from "node:test";

import type {
    RiverCrmD1Database
} from "../river-os/d1-crm-growth";

import {
    createInsuranceAcquisitionOutcomeFact
} from "./acquisition-outcomes";

import {
    createD1InsuranceAcquisitionOutcomePersistence
} from "./d1-acquisition-outcomes";


interface PreparedCall {
    readonly sql:
        string;

    readonly bindings:
        readonly unknown[];

    readonly operation:
        "run" | "all";
}


class FakeDatabase {
    readonly calls:
        PreparedCall[] = [];

    rows:
        readonly Record<string, unknown>[] = [];

    readonly rowBatches:
        Array<
            readonly Record<string, unknown>[]
        > = [];

    queueRows(
        rows:
            readonly Record<string, unknown>[]
    ): void {
        this.rowBatches.push(
            rows
        );
    }

    prepare(
        sql:
            string
    ){
        const calls =
            this.calls;

        const rows =
            this.rowBatches.shift() ??
            this.rows;

        return {
            bind(
                ...bindings:
                    readonly unknown[]
            ){
                return {
                    async run(){
                        calls.push({
                            sql,
                            bindings,
                            operation:
                                "run"
                        });

                        return {
                            success:
                                true
                        };
                    },

                    async all(){
                        calls.push({
                            sql,
                            bindings,
                            operation:
                                "all"
                        });

                        return {
                            success:
                                true,
                            results:
                                rows
                        };
                    },

                    async first(){
                        return null;
                    }
                };
            }
        };
    }
}


test(
    "creates explicit quoted and bound outcome facts",
    () => {
        const quoted =
            createInsuranceAcquisitionOutcomeFact({
                outcomeFactId:
                    "outcome-fact:quoted-1",

                relationshipId:
                    "relationship:ins-003r-1",

                kind:
                    "quoted",

                occurredAt:
                    "2026-09-29T20:00:00.000Z",

                providerReference:
                    " carrier-a "
            });

        const bound =
            createInsuranceAcquisitionOutcomeFact({
                outcomeFactId:
                    "outcome-fact:bound-1",

                relationshipId:
                    "relationship:ins-003r-1",

                kind:
                    "bound",

                occurredAt:
                    "2026-09-29T21:00:00.000Z",

                policyReference:
                    " policy-123 "
            });

        assert.equal(
            quoted.kind,
            "quoted"
        );

        assert.equal(
            quoted.providerReference,
            "carrier-a"
        );

        assert.equal(
            bound.kind,
            "bound"
        );

        assert.equal(
            bound.policyReference,
            "policy-123"
        );
    }
);


test(
    "outcome domain rejects unsupported lifecycle inference",
    () => {
        for(const kind of [
            "requested",
            "in-progress",
            "declined",
            "lost",
            "written"
        ]){
            assert.throws(
                () =>
                    createInsuranceAcquisitionOutcomeFact({
                        outcomeFactId:
                            `outcome-fact:${kind}`,

                        relationshipId:
                            "relationship:ins-003r-invalid",

                        kind,

                        occurredAt:
                            "2026-09-29T20:00:00.000Z"
                    }),
                /kind is not supported/
            );
        }
    }
);


test(
    "outcome domain rejects malformed identity timestamp and fact id",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionOutcomeFact({
                    outcomeFactId:
                        "wrong:1",

                    relationshipId:
                        "relationship:ins-003r-1",

                    kind:
                        "quoted",

                    occurredAt:
                        "2026-09-29T20:00:00.000Z"
                }),
            /outcome-fact/
        );

        assert.throws(
            () =>
                createInsuranceAcquisitionOutcomeFact({
                    outcomeFactId:
                        "outcome-fact:1",

                    relationshipId:
                        "lead:not-canonical",

                    kind:
                        "quoted",

                    occurredAt:
                        "2026-09-29T20:00:00.000Z"
                }),
            /relationship/
        );

        assert.throws(
            () =>
                createInsuranceAcquisitionOutcomeFact({
                    outcomeFactId:
                        "outcome-fact:1",

                    relationshipId:
                        "relationship:ins-003r-1",

                    kind:
                        "quoted",

                    occurredAt:
                        "not-a-date"
                }),
            /valid timestamp/
        );
    }
);


test(
    "D1 persistence appends canonical outcome fact without mutating lead profile",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceAcquisitionOutcomePersistence(
                database as unknown as
                    RiverCrmD1Database
            );

        const result =
            await persistence
                .append({
                    outcomeFactId:
                        "outcome-fact:quoted-d1",

                    relationshipId:
                        "relationship:ins-003r-d1",

                    kind:
                        "quoted",

                    occurredAt:
                        "2026-09-29T20:00:00.000Z",

                    externalReference:
                        "quote-abc"
                });

        assert.equal(
            result.kind,
            "quoted"
        );

        assert.equal(
            database.calls.length,
            1
        );

        assert.equal(
            database.calls[0]
                ?.operation,
            "run"
        );

        assert.match(
            database.calls[0]
                ?.sql ??
                "",
            /INSERT INTO river_crm_insurance_acquisition_outcome_facts/
        );

        assert.doesNotMatch(
            database.calls[0]
                ?.sql ??
                "",
            /insurance_lead_profiles/
        );

        assert.deepEqual(
            database.calls[0]
                ?.bindings,
            [
                "outcome-fact:quoted-d1",
                "relationship:ins-003r-d1",
                "quoted",
                "2026-09-29T20:00:00.000Z",
                null,
                null,
                "quote-abc",
                null
            ]
        );
    }
);


test(
    "batch read deduplicates explicit cohort and performs one ordered SQL read",
    async () => {
        const database =
            new FakeDatabase();

        database.rows = [
            {
                outcome_fact_id:
                    "outcome-fact:quoted-a",

                relationship_id:
                    "relationship:ins-003r-a",

                kind:
                    "quoted",

                occurred_at:
                    "2026-09-29T20:00:00.000Z",

                provider_reference:
                    null,

                policy_reference:
                    null,

                external_reference:
                    "quote-a",

                note:
                    null
            },
            {
                outcome_fact_id:
                    "outcome-fact:bound-a",

                relationship_id:
                    "relationship:ins-003r-a",

                kind:
                    "bound",

                occurred_at:
                    "2026-09-29T21:00:00.000Z",

                provider_reference:
                    null,

                policy_reference:
                    "policy-a",

                external_reference:
                    null,

                note:
                    null
            }
        ];

        const persistence =
            createD1InsuranceAcquisitionOutcomePersistence(
                database as unknown as
                    RiverCrmD1Database
            );

        const result =
            await persistence
                .listForRelationships([
                    "relationship:ins-003r-a" as never,
                    "relationship:ins-003r-a" as never,
                    "relationship:ins-003r-b" as never
                ]);

        assert.equal(
            database.calls.length,
            1
        );

        assert.equal(
            database.calls[0]
                ?.operation,
            "all"
        );

        assert.deepEqual(
            database.calls[0]
                ?.bindings,
            [
                "relationship:ins-003r-a",
                "relationship:ins-003r-b"
            ]
        );

        assert.match(
            database.calls[0]
                ?.sql ??
                "",
            /ORDER BY\s+relationship_id ASC,\s+occurred_at ASC,\s+outcome_fact_id ASC/
        );

        assert.deepEqual(
            result.map(
                fact =>
                    fact.kind
            ),
            [
                "quoted",
                "bound"
            ]
        );
    }
);


test(
    "empty outcome cohort performs zero SQL reads",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceAcquisitionOutcomePersistence(
                database as unknown as
                    RiverCrmD1Database
            );

        const result =
            await persistence
                .listForRelationships(
                    []
                );

        assert.deepEqual(
            result,
            []
        );

        assert.equal(
            database.calls.length,
            0
        );
    }
);


test(
    "invalid requested relationship fails before SQL",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceAcquisitionOutcomePersistence(
                database as unknown as
                    RiverCrmD1Database
            );

        await assert.rejects(
            persistence
                .listForRelationships([
                    "lead:not-a-relationship" as never
                ]),
            /relationship/
        );

        assert.equal(
            database.calls.length,
            0
        );
    }
);

test(
    "outcome batch read partitions one hundred plus one relationships and restores global relationship ordering",
    async () => {
        type Persistence =
            ReturnType<
                typeof createD1InsuranceAcquisitionOutcomePersistence
            >;

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
                    `relationship:ins-005e-${String(
                        100 - index
                    ).padStart(
                        3,
                        "0"
                    )}`
            ) as unknown as
                Parameters<
                    Persistence[
                        "listForRelationships"
                    ]
                >[0];

        const firstRelationship =
            relationshipIds[0]!;

        const finalRelationship =
            relationshipIds[100]!;

        const database =
            new FakeDatabase();

        database.queueRows([
            {
                outcome_fact_id:
                    "outcome-fact:ins-005e-high",
                relationship_id:
                    firstRelationship,
                kind:
                    "quoted",
                occurred_at:
                    "2026-09-30T02:00:00.000Z",
                provider_reference:
                    null,
                policy_reference:
                    null,
                external_reference:
                    "quote-high",
                note:
                    null
            }
        ]);

        database.queueRows([
            {
                outcome_fact_id:
                    "outcome-fact:ins-005e-low",
                relationship_id:
                    finalRelationship,
                kind:
                    "bound",
                occurred_at:
                    "2026-09-30T01:00:00.000Z",
                provider_reference:
                    null,
                policy_reference:
                    "policy-low",
                external_reference:
                    null,
                note:
                    null
            }
        ]);

        const values =
            await createD1InsuranceAcquisitionOutcomePersistence(
                database as unknown as
                    RiverCrmD1Database
            ).listForRelationships(
                relationshipIds
            );

        assert.equal(
            database.calls.length,
            2
        );

        assert.equal(
            database.calls[0]!
                .bindings.length,
            100
        );

        assert.equal(
            database.calls[1]!
                .bindings.length,
            1
        );

        assert.deepEqual(
            values.map(
                value =>
                    value.relationshipId
            ),
            [
                finalRelationship,
                firstRelationship
            ]
        );

        for(const call of database.calls){
            assert.equal(
                call.operation,
                "all"
            );

            assert.match(
                call.sql,
                /ORDER BY\s+relationship_id ASC,\s+occurred_at ASC,\s+outcome_fact_id ASC/
            );
        }
    }
);
