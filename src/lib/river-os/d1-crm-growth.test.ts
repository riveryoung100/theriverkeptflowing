import assert from "node:assert/strict";
import test from "node:test";

import {
    createD1RiverCrmGrowthPersistence
} from "./d1-crm-growth";

import type {
    RiverCrmD1AllResult,
    RiverCrmD1RunResult,
    RiverCrmD1Statement
} from "./d1-crm-growth";


class FakeStatement
implements RiverCrmD1Statement {
    public readonly binds:
        unknown[][] = [];

    public firstValue:
        unknown = null;

    public allValue:
        RiverCrmD1AllResult<unknown> = {
            results: [],
            success: true
        };

    public runValue:
        RiverCrmD1RunResult = {
            success: true,
            meta: {
                changes: 1
            }
        };

    public runError:
        Error | undefined;

    public readonly sql:
        string;

    public constructor(
        sql: string
    ){
        this.sql =
            sql;
    }

    bind(
        ...values: unknown[]
    ){
        this.binds.push(
            values
        );

        return this;
    }

    async first<
        T
    >(){
        await Promise.resolve();

        return this.firstValue as
            T | null;
    }

    async all<
        T
    >(){
        await Promise.resolve();

        return this.allValue as
            RiverCrmD1AllResult<T>;
    }

    async run(){
        if(this.runError !== undefined){
            throw this.runError;
        }

        return this.runValue;
    }
}

class FakeDatabase {
    public readonly statements:
        FakeStatement[] = [];

    prepare(
        sql: string
    ){
        const statement =
            new FakeStatement(sql);

        this.statements.push(
            statement
        );

        return statement;
    }

    latest(){
        const statement =
            this.statements.at(-1);

        assert.ok(
            statement
        );

        return statement;
    }
}

const relationshipId =
    "relationship:lead:persistence-001";

test(
    "D1 growth persistence maps acquisition attribution rows through canonical validation",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1RiverCrmGrowthPersistence(
                database
            );

        const promise =
            persistence.getAcquisitionAttribution(
                relationshipId
            );

        database.latest().firstValue = {
            relationship_id:
                relationshipId,
            source:
                "website",
            source_vendor:
                null,
            campaign:
                "launch",
            ad_or_creative_id:
                null,
            landing_page:
                null,
            utm_source:
                "google",
            utm_medium:
                null,
            utm_campaign:
                "auto",
            utm_term:
                null,
            utm_content:
                null,
            referral_source:
                null,
            captured_at:
                "2026-09-28T15:00:00.000Z",
            updated_at:
                "2026-09-28T15:00:00.000Z"
        };

        const value =
            await promise;

        assert.equal(
            value?.relationshipId,
            relationshipId
        );

        assert.equal(
            value?.campaign,
            "launch"
        );

        assert.match(
            database.latest().sql,
            /river_crm_acquisition_attribution/
        );
    }
);

test(
    "D1 growth persistence upserts canonical acquisition attribution",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1RiverCrmGrowthPersistence(
                database
            );

        const value =
            await persistence
                .upsertAcquisitionAttribution({
                    relationshipId,
                    source:
                        " website ",
                    campaign:
                        " launch ",
                    capturedAt:
                        "2026-09-28T15:00:00.000Z",
                    updatedAt:
                        "2026-09-28T15:00:00.000Z"
                });

        assert.equal(
            value.source,
            "website"
        );

        const statement =
            database.latest();

        assert.match(
            statement.sql,
            /ON CONFLICT \(relationship_id\)/
        );

        assert.equal(
            statement.binds[0]?.[0],
            relationshipId
        );
    }
);

test(
    "D1 growth persistence maps consent boolean storage and multiple channel rows",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1RiverCrmGrowthPersistence(
                database
            );

        const promise =
            persistence.listContactConsents(
                relationshipId
            );

        database.latest().allValue = {
            success: true,
            results: [
                {
                    consent_id:
                        "consent:phone",
                    relationship_id:
                        relationshipId,
                    channel:
                        "phone",
                    status:
                        "granted",
                    consent_text_version:
                        null,
                    consent_source:
                        "website",
                    captured_at:
                        "2026-09-28T15:00:00.000Z",
                    revoked_at:
                        null,
                    do_not_contact:
                        0,
                    created_at:
                        "2026-09-28T15:00:00.000Z",
                    updated_at:
                        "2026-09-28T15:00:00.000Z"
                },
                {
                    consent_id:
                        "consent:email",
                    relationship_id:
                        relationshipId,
                    channel:
                        "email",
                    status:
                        "denied",
                    consent_text_version:
                        null,
                    consent_source:
                        "manual",
                    captured_at:
                        "2026-09-28T15:00:00.000Z",
                    revoked_at:
                        null,
                    do_not_contact:
                        1,
                    created_at:
                        "2026-09-28T15:00:00.000Z",
                    updated_at:
                        "2026-09-28T16:00:00.000Z"
                }
            ]
        };

        const rows =
            await promise;

        assert.equal(
            rows.length,
            2
        );

        assert.equal(
            rows[0]?.doNotContact,
            false
        );

        assert.equal(
            rows[1]?.doNotContact,
            true
        );
    }
);

test(
    "D1 growth persistence rejects malformed persisted consent rows",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1RiverCrmGrowthPersistence(
                database
            );

        const promise =
            persistence.listContactConsents(
                relationshipId
            );

        database.latest().allValue = {
            success: true,
            results: [
                {
                    consent_id:
                        "consent:bad",
                    relationship_id:
                        relationshipId,
                    channel:
                        "phone",
                    status:
                        "revoked",
                    consent_text_version:
                        null,
                    consent_source:
                        "website",
                    captured_at:
                        "2026-09-28T15:00:00.000Z",
                    revoked_at:
                        null,
                    do_not_contact:
                        1,
                    created_at:
                        "2026-09-28T15:00:00.000Z",
                    updated_at:
                        "2026-09-28T16:00:00.000Z"
                }
            ]
        };

        await assert.rejects(
            promise,
            /requires revokedAt/
        );
    }
);

test(
    "D1 growth persistence saves consent with integer suppression storage",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1RiverCrmGrowthPersistence(
                database
            );

        await persistence.saveContactConsent({
            consentId:
                "consent:suppressed",
            relationshipId,
            channel:
                "sms",
            status:
                "denied",
            consentSource:
                "manual",
            capturedAt:
                "2026-09-28T15:00:00.000Z",
            doNotContact:
                true,
            createdAt:
                "2026-09-28T15:00:00.000Z",
            updatedAt:
                "2026-09-28T15:00:00.000Z"
        });

        const binds =
            database.latest()
                .binds[0];

        assert.equal(
            binds?.[8],
            1
        );
    }
);

test(
    "D1 growth persistence appends event without update semantics and serializes metadata",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1RiverCrmGrowthPersistence(
                database
            );

        await persistence
            .appendRelationshipEvent({
                eventId:
                    "crm-event:persistence-001",
                relationshipId,
                eventType:
                    "quote-requested",
                occurredAt:
                    "2026-09-28T15:00:00.000Z",
                source:
                    "website",
                metadata: {
                    productInterest:
                        "auto"
                }
            });

        const statement =
            database.latest();

        assert.match(
            statement.sql,
            /INSERT INTO river_crm_relationship_events/
        );

        assert.doesNotMatch(
            statement.sql,
            /UPDATE river_crm_relationship_events/
        );

        assert.equal(
            statement.binds[0]?.[6],
            '{"productInterest":"auto"}'
        );
    }
);

test(
    "D1 growth persistence deserializes event metadata and preserves chronological query ordering",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1RiverCrmGrowthPersistence(
                database
            );

        const promise =
            persistence.listRelationshipEvents(
                relationshipId
            );

        database.latest().allValue = {
            success: true,
            results: [
                {
                    event_id:
                        "crm-event:a",
                    relationship_id:
                        relationshipId,
                    event_type:
                        "lead-created",
                    occurred_at:
                        "2026-09-28T15:00:00.000Z",
                    source:
                        "website",
                    external_reference:
                        null,
                    metadata_json:
                        '{"step":1}'
                },
                {
                    event_id:
                        "crm-event:b",
                    relationship_id:
                        relationshipId,
                    event_type:
                        "quote-requested",
                    occurred_at:
                        "2026-09-28T15:01:00.000Z",
                    source:
                        "website",
                    external_reference:
                        null,
                    metadata_json:
                        '{"step":2}'
                }
            ]
        };

        const events =
            await promise;

        assert.deepEqual(
            events.map(
                event =>
                    event.eventId
            ),
            [
                "crm-event:a",
                "crm-event:b"
            ]
        );

        assert.deepEqual(
            events[0]?.metadata,
            {
                step: 1
            }
        );

        assert.match(
            database.latest().sql,
            /ORDER BY\s+occurred_at ASC,\s+event_id ASC/
        );
    }
);

test(
    "D1 growth persistence propagates D1 execution failure",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1RiverCrmGrowthPersistence(
                database
            );

        const originalPrepare =
            database.prepare.bind(
                database
            );

        database.prepare = (
            sql: string
        ) => {
            const statement =
                originalPrepare(sql);

            statement.runError =
                new Error(
                    "d1 unavailable"
                );

            return statement;
        };

        await assert.rejects(
            persistence
                .upsertAcquisitionAttribution({
                    relationshipId,
                    source:
                        "website",
                    capturedAt:
                        "2026-09-28T15:00:00.000Z",
                    updatedAt:
                        "2026-09-28T15:00:00.000Z"
                }),
            /d1 unavailable/
        );
    }
);

