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

test(
    "created-at keyset page probes one extra row and emits a compound continuation cursor",
    async () => {
        const database =
            new FakeD1Database();

        database.rows = [
            relationshipRow(
                "relationship:page-3",
                "2026-09-30T12:00:00.000Z"
            ),
            relationshipRow(
                "relationship:page-2",
                "2026-09-20T12:00:00.000Z"
            ),
            relationshipRow(
                "relationship:page-1",
                "2026-09-10T12:00:00.000Z"
            )
        ];

        const persistence =
            new D1RiverCrmPersistence(
                database as unknown as D1Database
            );

        const page =
            await persistence
                .listCreatedAtRangePage({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    pageSize:
                        2
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

        assert.doesNotMatch(
            query.sql,
            /\bOFFSET\b/i
        );

        assert.deepEqual(
            query.bindings,
            [
                "2026-09-01T00:00:00.000Z",
                "2026-10-01T00:00:00.000Z",
                3
            ]
        );

        assert.deepEqual(
            page.relationships.map(
                relationship =>
                    relationship.relationshipId
            ),
            [
                "relationship:page-3",
                "relationship:page-2"
            ]
        );

        assert.equal(
            page.hasMore,
            true
        );

        assert.deepEqual(
            page.nextCursor,
            {
                createdAt:
                    "2026-09-20T12:00:00.000Z",

                relationshipId:
                    "relationship:page-2"
            }
        );
    }
);


test(
    "created-at keyset page applies the compound cursor predicate and omits continuation when complete",
    async () => {
        const database =
            new FakeD1Database();

        database.rows = [
            relationshipRow(
                "relationship:same-time-c",
                "2026-09-20T12:00:00.000Z"
            ),
            relationshipRow(
                "relationship:older",
                "2026-09-10T12:00:00.000Z"
            )
        ];

        const persistence =
            new D1RiverCrmPersistence(
                database as unknown as D1Database
            );

        const page =
            await persistence
                .listCreatedAtRangePage({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    pageSize:
                        2,

                    cursor: {
                        createdAt:
                            "2026-09-20T12:00:00.000Z",

                        relationshipId:
                            "relationship:same-time-b"
                    }
                });

        const query =
            database.prepared[0];

        assert.ok(
            query
        );

        assert.match(
            query.sql,
            /created_at < \?3/
        );

        assert.match(
            query.sql,
            /created_at = \?3/
        );

        assert.match(
            query.sql,
            /relationship_id > \?4/
        );

        assert.match(
            query.sql,
            /ORDER BY created_at DESC, relationship_id ASC/
        );

        assert.match(
            query.sql,
            /LIMIT \?5/
        );

        assert.doesNotMatch(
            query.sql,
            /\bOFFSET\b/i
        );

        assert.deepEqual(
            query.bindings,
            [
                "2026-09-01T00:00:00.000Z",
                "2026-10-01T00:00:00.000Z",
                "2026-09-20T12:00:00.000Z",
                "relationship:same-time-b",
                3
            ]
        );

        assert.equal(
            page.hasMore,
            false
        );

        assert.equal(
            "nextCursor" in page,
            false
        );
    }
);


test(
    "created-at keyset page preserves default page size fifty while probing only fifty-one rows",
    async () => {
        const database =
            new FakeD1Database();

        const persistence =
            new D1RiverCrmPersistence(
                database as unknown as D1Database
            );

        await persistence
            .listCreatedAtRangePage({
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
                51
            ]
        );
    }
);


test(
    "created-at keyset page allows page size one hundred while using a bounded one-row probe",
    async () => {
        const database =
            new FakeD1Database();

        const persistence =
            new D1RiverCrmPersistence(
                database as unknown as D1Database
            );

        await persistence
            .listCreatedAtRangePage({
                createdAtFromInclusive:
                    "2026-09-01T00:00:00.000Z",

                createdAtToExclusive:
                    "2026-10-01T00:00:00.000Z",

                pageSize:
                    100
            });

        assert.deepEqual(
            database.prepared[0]
                ?.bindings,
            [
                "2026-09-01T00:00:00.000Z",
                "2026-10-01T00:00:00.000Z",
                101
            ]
        );
    }
);


test(
    "created-at keyset page rejects invalid page size before database access",
    async () => {
        const database =
            new FakeD1Database();

        const persistence =
            new D1RiverCrmPersistence(
                database as unknown as D1Database
            );

        await assert.rejects(
            persistence
                .listCreatedAtRangePage({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    pageSize:
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


test(
    "created-at keyset page rejects invalid cursor timestamp before database access",
    async () => {
        const database =
            new FakeD1Database();

        const persistence =
            new D1RiverCrmPersistence(
                database as unknown as D1Database
            );

        await assert.rejects(
            persistence
                .listCreatedAtRangePage({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    cursor: {
                        createdAt:
                            "2026-09-20",

                        relationshipId:
                            "relationship:cursor"
                    }
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
    "created-at keyset page rejects invalid cursor relationship identity before database access",
    async () => {
        const database =
            new FakeD1Database();

        const persistence =
            new D1RiverCrmPersistence(
                database as unknown as D1Database
            );

        await assert.rejects(
            persistence
                .listCreatedAtRangePage({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    cursor: {
                        createdAt:
                            "2026-09-20T12:00:00.000Z",

                        relationshipId:
                            "bad-id"
                    }
                }),
            /valid relationship identity/
        );

        assert.equal(
            database.prepared.length,
            0
        );
    }
);


test(
    "created-at keyset page rejects cursor outside the requested range before database access",
    async () => {
        const database =
            new FakeD1Database();

        const persistence =
            new D1RiverCrmPersistence(
                database as unknown as D1Database
            );

        await assert.rejects(
            persistence
                .listCreatedAtRangePage({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    cursor: {
                        createdAt:
                            "2026-10-01T00:00:00.000Z",

                        relationshipId:
                            "relationship:cursor"
                    }
                }),
            /fall inside the requested created-at range/
        );

        assert.equal(
            database.prepared.length,
            0
        );
    }
);
