import assert from "node:assert/strict";
import test from "node:test";

import {
    createD1InsuranceLeadQueuePersistence
} from "./d1-lead-queue";


interface QueryCapture {
    sql:
        string;

    bindings:
        unknown[];
}


function relationshipRow(
    relationshipId:
        string,
    createdAt:
        string,
    updatedAt:
        string =
            createdAt
){
    return {
        relationship_id:
            relationshipId,

        display_name:
            relationshipId,

        kind:
            "lead",

        stage:
            "new",

        source:
            "website",

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
            updatedAt
    };
}


function databaseFromPages(
    pages:
        readonly (readonly ReturnType<typeof relationshipRow>[])[]
): {
    readonly database:
        D1Database;

    readonly captures:
        QueryCapture[];
} {
    const captures:
        QueryCapture[] =
            [];

    let pageIndex =
        0;

    const database = {
        prepare(
            sql:
                string
        ){
            const capture:
                QueryCapture = {
                    sql,

                    bindings:
                        []
                };

            captures.push(
                capture
            );

            return {
                bind(
                    ...values:
                        unknown[]
                ){
                    capture.bindings =
                        values;

                    return {
                        async all(){
                            const results =
                                pages[
                                    pageIndex
                                ] ??
                                [];

                            pageIndex +=
                                1;

                            return {
                                results:
                                    [...results]
                            };
                        }
                    };
                }
            };
        }
    } as unknown as D1Database;

    return {
        database,
        captures
    };
}


test(
    "insurance queue page reads only canonical profile-backed relationships with immutable keyset order",
    async () => {
        const {
            database,
            captures
        } =
            databaseFromPages([
                [
                    relationshipRow(
                        "relationship:c",
                        "2026-10-01T15:00:00.000Z"
                    ),

                    relationshipRow(
                        "relationship:a",
                        "2026-10-01T14:00:00.000Z"
                    ),

                    relationshipRow(
                        "relationship:b",
                        "2026-10-01T13:00:00.000Z"
                    )
                ]
            ]);

        const page =
            await createD1InsuranceLeadQueuePersistence(
                database
            ).listPage({
                pageSize:
                    2
            });

        assert.equal(
            captures.length,
            1
        );

        assert.match(
            captures[0]!.sql,
            /INNER JOIN river_crm_insurance_lead_profiles AS insurance/
        );

        assert.match(
            captures[0]!.sql,
            /insurance\.relationship_id = relationships\.relationship_id/
        );

        assert.match(
            captures[0]!.sql,
            /ORDER BY\s+relationships\.created_at DESC,\s+relationships\.relationship_id ASC/s
        );

        assert.deepEqual(
            captures[0]!.bindings,
            [
                3
            ]
        );

        assert.deepEqual(
            page.relationships.map(
                value =>
                    value.relationshipId
            ),
            [
                "relationship:c",
                "relationship:a"
            ]
        );

        assert.deepEqual(
            page.nextCursor,
            {
                createdAt:
                    "2026-10-01T14:00:00.000Z",

                relationshipId:
                    "relationship:a"
            }
        );
    }
);


test(
    "insurance queue continuation preserves descending created time and ascending identity tie-break",
    async () => {
        const {
            database,
            captures
        } =
            databaseFromPages([
                [
                    relationshipRow(
                        "relationship:b",
                        "2026-10-01T14:00:00.000Z"
                    )
                ]
            ]);

        const page =
            await createD1InsuranceLeadQueuePersistence(
                database
            ).listPage({
                pageSize:
                    2,

                cursor: {
                    createdAt:
                        "2026-10-01T14:00:00.000Z",

                    relationshipId:
                        "relationship:a"
                }
            });

        assert.match(
            captures[0]!.sql,
            /relationships\.created_at < \?1/
        );

        assert.match(
            captures[0]!.sql,
            /relationships\.created_at = \?1[\s\S]*relationships\.relationship_id > \?2/
        );

        assert.deepEqual(
            captures[0]!.bindings,
            [
                "2026-10-01T14:00:00.000Z",
                "relationship:a",
                3
            ]
        );

        assert.equal(
            page.hasMore,
            false
        );

        assert.equal(
            page.nextCursor,
            undefined
        );
    }
);


test(
    "insurance queue complete reader follows bounded pages without truncating older relationships",
    async () => {
        const {
            database,
            captures
        } =
            databaseFromPages([
                [
                    relationshipRow(
                        "relationship:c",
                        "2026-10-03T00:00:00.000Z"
                    ),

                    relationshipRow(
                        "relationship:b",
                        "2026-10-02T00:00:00.000Z"
                    )
                ],

                [
                    relationshipRow(
                        "relationship:b",
                        "2026-10-02T00:00:00.000Z"
                    ),

                    relationshipRow(
                        "relationship:a",
                        "2026-10-01T00:00:00.000Z"
                    )
                ],

                [
                    relationshipRow(
                        "relationship:a",
                        "2026-10-01T00:00:00.000Z"
                    )
                ]
            ]);

        const relationships =
            await createD1InsuranceLeadQueuePersistence(
                database
            ).listComplete(
                1
            );

        assert.equal(
            captures.length,
            3
        );

        assert.deepEqual(
            relationships.map(
                value =>
                    value.relationshipId
            ),
            [
                "relationship:c",
                "relationship:b",
                "relationship:a"
            ]
        );

        assert.deepEqual(
            captures[0]!.bindings,
            [
                2
            ]
        );

        assert.deepEqual(
            captures[1]!.bindings,
            [
                "2026-10-03T00:00:00.000Z",
                "relationship:c",
                2
            ]
        );

        assert.deepEqual(
            captures[2]!.bindings,
            [
                "2026-10-02T00:00:00.000Z",
                "relationship:b",
                2
            ]
        );
    }
);


test(
    "insurance queue rejects invalid page size and timezone-ambiguous cursors",
    async () => {
        const {
            database
        } =
            databaseFromPages([
                []
            ]);

        const persistence =
            createD1InsuranceLeadQueuePersistence(
                database
            );

        await assert.rejects(
            async () =>
                await persistence
                    .listPage({
                        pageSize:
                            101
                    }),
            /page size must be an integer from 1 through 100/
        );

        await assert.rejects(
            async () =>
                await persistence
                    .listPage({
                        cursor: {
                            createdAt:
                                "2026-10-01T12:00:00",

                            relationshipId:
                                "relationship:a"
                        }
                    }),
            /cursor.createdAt/
        );
    }
);
