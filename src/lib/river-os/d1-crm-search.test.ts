import assert from "node:assert/strict";
import test from "node:test";

import {
    createD1RiverCrmPersistence
} from "./d1-crm";

function createDatabaseCapture() {
    const capture: {
        sql?: string;
        values?: unknown[];
    } = {};

    const row = {
        relationship_id: "relationship:001",
        display_name: "River Young",
        kind: "lead",
        stage: "new",
        source: "website",
        email: "river@example.com",
        phone: "432-555-0101",
        owner: null,
        next_follow_up_at: null,
        appointment_at: null,
        created_at: "2026-10-01T20:00:00.000Z",
        updated_at: "2026-10-01T21:00:00.000Z"
    };

    const database = {
        prepare(sql: string) {
            capture.sql = sql;

            return {
                bind(...values: unknown[]) {
                    capture.values = values;

                    return {
                        async all() {
                            return {
                                results: [row]
                            };
                        }
                    };
                }
            };
        }
    } as unknown as D1Database;

    return {
        capture,
        database
    };
}

test(
    "searchRelationships searches the canonical CRM table before applying the result limit",
    async () => {
        const {
            capture,
            database
        } = createDatabaseCapture();

        const persistence =
            createD1RiverCrmPersistence(
                database
            );

        const relationships =
            await persistence.searchRelationships({
                query: "  River  ",
                limit: 25
            });

        assert.deepEqual(
            capture.values,
            [
                "River",
                25
            ]
        );

        assert.match(
            capture.sql ?? "",
            /FROM river_crm_relationships/
        );

        for (
            const field of [
                "relationship_id",
                "display_name",
                "email",
                "phone",
                "owner",
                "source"
            ]
        ) {
            assert.match(
                capture.sql ?? "",
                new RegExp(field)
            );
        }

        assert.match(
            capture.sql ?? "",
            /ORDER BY updated_at DESC, relationship_id ASC/
        );

        assert.match(
            capture.sql ?? "",
            /LIMIT \?2/
        );

        assert.equal(
            relationships[0]?.relationshipId,
            "relationship:001"
        );

        assert.equal(
            relationships[0]?.displayName,
            "River Young"
        );
    }
);

test(
    "searchRelationships rejects blank searches and invalid limits before querying D1",
    async () => {
        const {
            database
        } = createDatabaseCapture();

        const persistence =
            createD1RiverCrmPersistence(
                database
            );

        await assert.rejects(
            persistence.searchRelationships({
                query: "   "
            }),
            /1 through 200/
        );

        await assert.rejects(
            persistence.searchRelationships({
                query: "River",
                limit: 101
            }),
            /1 through 100/
        );
    }
);
