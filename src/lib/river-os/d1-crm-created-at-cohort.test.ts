import assert from "node:assert/strict";
import test from "node:test";

import {
    D1RiverCrmPersistence
} from "./d1-crm";


interface PreparedQuery {
    readonly sql:
        string;

    readonly bindings:
        readonly unknown[];
}


function relationshipRow(
    relationshipId:
        string,
    createdAt:
        string
){
    return {
        relationship_id:
            relationshipId,
        display_name:
            "INS-003O Relationship",
        kind:
            "lead",
        stage:
            "new",
        source:
            "test",
        email:
            null,
        phone:
            null,
        owner:
            null,
        next_follow_up_at:
            null,
        appointment_at:
            null,
        created_at:
            createdAt,
        updated_at:
            createdAt
    };
}


class FakeD1Database {
    prepared:
        PreparedQuery[] = [];

    rows:
        readonly Record<string, unknown>[] = [];

    prepare(
        sql:
            string
    ){
        const prepared =
            this.prepared;

        const rows =
            this.rows;

        return {
            bind(
                ...bindings:
                    readonly unknown[]
            ){
                prepared.push({
                    sql,
                    bindings
                });

                return {
                    async all(){
                        return {
                            results:
                                rows
                        };
                    }
                };
            }
        };
    }
}


test(
    "created-at cohort uses inclusive lower bound exclusive upper bound deterministic order and explicit limit",
    async () => {
        const database =
            new FakeD1Database();

        database.rows = [
            relationshipRow(
                "relationship:ins-003o-2",
                "2026-09-20T12:00:00.000Z"
            ),
            relationshipRow(
                "relationship:ins-003o-1",
                "2026-09-10T12:00:00.000Z"
            )
        ];

        const persistence =
            new D1RiverCrmPersistence(
                database as unknown as D1Database
            );

        const relationships =
            await persistence
                .listCreatedAtRange({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",
                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",
                    limit:
                        25
                });

        assert.equal(
            database.prepared.length,
            1
        );

        const query =
            database.prepared[0];

        assert.ok(
            query
        );

        assert.match(
            query.sql,
            /WHERE created_at >= \?1/
        );

        assert.match(
            query.sql,
            /AND created_at < \?2/
        );

        assert.match(
            query.sql,
            /ORDER BY created_at DESC, relationship_id ASC/
        );

        assert.match(
            query.sql,
            /LIMIT \?3/
        );

        assert.deepEqual(
            query.bindings,
            [
                "2026-09-01T00:00:00.000Z",
                "2026-10-01T00:00:00.000Z",
                25
            ]
        );

        assert.deepEqual(
            relationships.map(
                relationship=>
                    relationship.relationshipId
            ),
            [
                "relationship:ins-003o-2",
                "relationship:ins-003o-1"
            ]
        );
    }
);


test(
    "created-at cohort preserves canonical CRM default limit of 50",
    async () => {
        const database =
            new FakeD1Database();

        const persistence =
            new D1RiverCrmPersistence(
                database as unknown as D1Database
            );

        await persistence
            .listCreatedAtRange({
                createdAtFromInclusive:
                    "2026-09-01T00:00:00.000Z",
                createdAtToExclusive:
                    "2026-10-01T00:00:00.000Z"
            });

        assert.deepEqual(
            database.prepared[0]
                ?.bindings,
            [
                "2026-09-01T00:00:00.000Z",
                "2026-10-01T00:00:00.000Z",
                50
            ]
        );
    }
);


test(
    "created-at cohort rejects noncanonical timestamp before database access",
    async () => {
        const database =
            new FakeD1Database();

        const persistence =
            new D1RiverCrmPersistence(
                database as unknown as D1Database
            );

        await assert.rejects(
            persistence
                .listCreatedAtRange({
                    createdAtFromInclusive:
                        "2026-09-01",
                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z"
                }),
            /canonical UTC ISO timestamp/
        );

        assert.equal(
            database.prepared.length,
            0
        );
    }
);


test(
    "created-at cohort rejects inverted or empty range before database access",
    async () => {
        const database =
            new FakeD1Database();

        const persistence =
            new D1RiverCrmPersistence(
                database as unknown as D1Database
            );

        await assert.rejects(
            persistence
                .listCreatedAtRange({
                    createdAtFromInclusive:
                        "2026-10-01T00:00:00.000Z",
                    createdAtToExclusive:
                        "2026-09-01T00:00:00.000Z"
                }),
            /earlier than/
        );

        await assert.rejects(
            persistence
                .listCreatedAtRange({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",
                    createdAtToExclusive:
                        "2026-09-01T00:00:00.000Z"
                }),
            /earlier than/
        );

        assert.equal(
            database.prepared.length,
            0
        );
    }
);


test(
    "created-at cohort reuses canonical CRM limit validation",
    async () => {
        const database =
            new FakeD1Database();

        const persistence =
            new D1RiverCrmPersistence(
                database as unknown as D1Database
            );

        await assert.rejects(
            persistence
                .listCreatedAtRange({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",
                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",
                    limit:
                        101
                }),
            /1 through 100/
        );

        assert.equal(
            database.prepared.length,
            0
        );
    }
);
