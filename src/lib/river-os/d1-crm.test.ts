import assert from "node:assert/strict";
import {
    describe,
    it
} from "node:test";

import {
    createRiverCrmRelationship
} from "./crm-workspace";

import {
    D1RiverCrmPersistence
} from "./d1-crm";


interface StoredRow {
    [key: string]:
        unknown;
}


function createRelationship(
    overrides:
        Partial<Parameters<typeof createRiverCrmRelationship>[0]> = {}
) {

    return createRiverCrmRelationship({
        relationshipId:
            "relationship:lead:001",

        displayName:
            "Example Lead",

        kind:
            "lead",

        stage:
            "new",

        source:
            "website",

        email:
            "lead@example.com",

        createdAt:
            "2026-09-11T12:00:00.000Z",

        updatedAt:
            "2026-09-11T12:00:00.000Z",

        ...overrides
    });

}


function createFakeD1Database():
D1Database {

    const rows =
        new Map<
            string,
            StoredRow
        >();

    const database = {

        prepare(
            sql:
                string
        ) {

            return {

                bind(
                    ...values:
                        unknown[]
                ) {

                    return {

                        async run() {

                            if (
                                !sql.includes(
                                    "INSERT INTO river_crm_relationships"
                                )
                            ) {

                                throw new Error(
                                    "Unexpected fake CRM D1 mutation."
                                );

                            }

                            const relationshipId =
                                String(
                                    values[0]
                                );

                            const existing =
                                rows.get(
                                    relationshipId
                                );

                            rows.set(
                                relationshipId,
                                {
                                    relationship_id:
                                        values[0],

                                    display_name:
                                        values[1],

                                    kind:
                                        values[2],

                                    stage:
                                        values[3],

                                    source:
                                        values[4],

                                    email:
                                        values[5],

                                    phone:
                                        values[6],

                                    owner:
                                        values[7],

                                    next_follow_up_at:
                                        values[8],

                                    appointment_at:
                                        values[9],

                                    created_at:
                                        existing?.created_at ??
                                        values[10],

                                    updated_at:
                                        values[11]
                                }
                            );

                            return {
                                success:
                                    true
                            };

                        },


                        async first() {

                            const row =
                                rows.get(
                                    String(
                                        values[0]
                                    )
                                );

                            return row === undefined
                                ? null
                                : {
                                    ...row
                                };

                        },


                        async all() {

                            const limit =
                                Number(
                                    values[0]
                                );

                            const results =
                                Array.from(
                                    rows.values()
                                )
                                    .sort(
                                        (
                                            left,
                                            right
                                        ) => {

                                            return (
                                                String(
                                                    right.updated_at
                                                ).localeCompare(
                                                    String(
                                                        left.updated_at
                                                    )
                                                ) ||
                                                String(
                                                    left.relationship_id
                                                ).localeCompare(
                                                    String(
                                                        right.relationship_id
                                                    )
                                                )
                                            );

                                        }
                                    )
                                    .slice(
                                        0,
                                        limit
                                    )
                                    .map(
                                        row => ({
                                            ...row
                                        })
                                    );

                            return {
                                success:
                                    true,
                                results,
                                meta:
                                    {}
                            };

                        }

                    };

                }

            };

        }

    };

    return database as unknown as
        D1Database;

}


describe(
    "River OS CRM D1 persistence",
    () => {

        it(
            "persists and retrieves a CRM relationship",
            async () => {

                const persistence =
                    new D1RiverCrmPersistence(
                        createFakeD1Database()
                    );

                const relationship =
                    createRelationship();

                await persistence.upsert(
                    relationship
                );

                assert.deepEqual(
                    await persistence.get(
                        relationship.relationshipId
                    ),
                    relationship
                );

            }
        );


        it(
            "updates operational state while preserving createdAt",
            async () => {

                const persistence =
                    new D1RiverCrmPersistence(
                        createFakeD1Database()
                    );

                const relationship =
                    createRelationship();

                await persistence.upsert(
                    relationship
                );

                const updated =
                    createRelationship({
                        stage:
                            "qualified",

                        nextFollowUpAt:
                            "2026-09-12T15:00:00.000Z",

                        updatedAt:
                            "2026-09-11T16:00:00.000Z"
                    });

                await persistence.upsert(
                    updated
                );

                assert.deepEqual(
                    await persistence.get(
                        updated.relationshipId
                    ),
                    updated
                );

                assert.equal(
                    (
                        await persistence.get(
                            updated.relationshipId
                        )
                    )?.createdAt,
                    relationship.createdAt
                );

            }
        );


        it(
            "lists relationships by most recently updated",
            async () => {

                const persistence =
                    new D1RiverCrmPersistence(
                        createFakeD1Database()
                    );

                const older =
                    createRelationship({
                        relationshipId:
                            "relationship:lead:001",

                        updatedAt:
                            "2026-09-11T12:00:00.000Z"
                    });

                const newer =
                    createRelationship({
                        relationshipId:
                            "relationship:client:002",

                        displayName:
                            "Example Client",

                        kind:
                            "client",

                        stage:
                            "won",

                        updatedAt:
                            "2026-09-11T18:00:00.000Z"
                    });

                await persistence.upsert(
                    older
                );

                await persistence.upsert(
                    newer
                );

                assert.deepEqual(
                    await persistence.list(),
                    [
                        newer,
                        older
                    ]
                );

            }
        );


        it(
            "rejects invalid relationship identity before querying D1",
            async () => {

                const persistence =
                    new D1RiverCrmPersistence(
                        createFakeD1Database()
                    );

                await assert.rejects(
                    () =>
                        persistence.get(
                            "lead:001"
                        ),
                    /valid relationship identity/
                );

            }
        );


        it(
            "rejects invalid list bounds before querying D1",
            async () => {

                const persistence =
                    new D1RiverCrmPersistence(
                        createFakeD1Database()
                    );

                await assert.rejects(
                    () =>
                        persistence.list(
                            101
                        ),
                    /1 through 100/
                );

            }
        );

    }
);
