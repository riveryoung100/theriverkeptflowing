import assert from "node:assert/strict";
import test from "node:test";

import {
    createD1InsuranceLeadPresentationPersistence
} from "./d1-lead-presentation";

import type {
    RiverCrmD1AllResult,
    RiverCrmD1RunResult,
    RiverCrmD1Statement
} from "../river-os/d1-crm-growth";


class FakeStatement
implements RiverCrmD1Statement {
    public readonly binds:
        unknown[][] = [];

    public constructor(
        public readonly sql:
            string,
        private readonly result:
            RiverCrmD1AllResult<unknown>
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

    async first<
        T
    >(){
        return null as
            T | null;
    }

    async all<
        T
    >(){
        return this.result as
            RiverCrmD1AllResult<T>;
    }

    async run():
        Promise<RiverCrmD1RunResult> {
        throw new Error(
            "run must never be called by read-only insurance presentation projection"
        );
    }
}

class FakeDatabase {
    public readonly statements:
        FakeStatement[] = [];

    public readonly queuedResults:
        RiverCrmD1AllResult<unknown>[] = [];

    queue(
        result:
            RiverCrmD1AllResult<unknown>
    ){
        this.queuedResults.push(
            result
        );
    }

    prepare(
        sql:
            string
    ){
        const result =
            this.queuedResults.shift() ??
            {
                results: [],
                success:
                    true
            };

        const statement =
            new FakeStatement(
                sql,
                result
            );

        this.statements.push(
            statement
        );

        return statement;
    }
}


const idOne =
    "relationship:insurance-one";

const idTwo =
    "relationship:insurance-two";

const idGeneric =
    "relationship:generic-only";

function profileRow(
    relationshipId:
        string,
    options?: {
        readonly product?:
            string;

        readonly status?:
            string;
    }
){
    return {
        relationship_id:
            relationshipId,
        state:
            "TX",
        postal_code:
            "79720",
        product_interest:
            options?.product ??
            "home",
        quote_status:
            options?.status ??
            "requested",
        assigned_producer:
            null,
        created_at:
            "2026-09-28T12:00:00.000Z",
        updated_at:
            "2026-09-28T12:00:00.000Z"
    };
}

function acquisitionRow(
    relationshipId:
        string
){
    return {
        relationship_id:
            relationshipId,
        source:
            "website",
        source_vendor:
            "Meta",
        campaign:
            "West Texas",
        ad_or_creative_id:
            null,
        landing_page:
            null,
        utm_source:
            null,
        utm_medium:
            null,
        utm_campaign:
            null,
        utm_term:
            null,
        utm_content:
            null,
        referral_source:
            null,
        captured_at:
            "2026-09-28T12:00:00.000Z",
        updated_at:
            "2026-09-28T12:00:00.000Z"
    };
}

function consentRow(
    relationshipId:
        string,
    channel:
        string,
    doNotContact:
        0 | 1
){
    return {
        consent_id:
            `consent:${relationshipId}:${channel}`,
        relationship_id:
            relationshipId,
        channel,
        status:
            doNotContact === 1
                ? "revoked"
                : "granted",
        consent_text_version:
            "quote-v1",
        consent_source:
            "website",
        captured_at:
            "2026-09-28T12:00:00.000Z",
        revoked_at:
            doNotContact === 1
                ? "2026-09-28T13:00:00.000Z"
                : null,
        do_not_contact:
            doNotContact,
        created_at:
            "2026-09-28T12:00:00.000Z",
        updated_at:
            doNotContact === 1
                ? "2026-09-28T13:00:00.000Z"
                : "2026-09-28T12:00:00.000Z"
    };
}

function eventRow(
    relationshipId:
        string,
    suffix:
        string,
    occurredAt:
        string
){
    return {
        event_id:
            `crm-event:${relationshipId}:${suffix}`,
        relationship_id:
            relationshipId,
        event_type:
            "quote-requested",
        occurred_at:
            occurredAt,
        source:
            "website",
        external_reference:
            null,
        metadata_json:
            '{"productInterest":"home"}'
    };
}

test(
    "D1 insurance presentation projection loads multiple relationships with four bounded SELECT queries",
    async () => {
        const database =
            new FakeDatabase();

        database.queue({
            success:
                true,
            results: [
                profileRow(
                    idOne
                ),
                profileRow(
                    idTwo,
                    {
                        product:
                            "auto",
                        status:
                            "quoted"
                    }
                )
            ]
        });

        database.queue({
            success:
                true,
            results: [
                acquisitionRow(
                    idOne
                ),
                acquisitionRow(
                    idTwo
                )
            ]
        });

        database.queue({
            success:
                true,
            results: [
                consentRow(
                    idOne,
                    "email",
                    0
                ),
                consentRow(
                    idTwo,
                    "phone",
                    1
                )
            ]
        });

        database.queue({
            success:
                true,
            results: [
                eventRow(
                    idOne,
                    "one",
                    "2026-09-28T12:10:00.000Z"
                ),
                eventRow(
                    idTwo,
                    "two",
                    "2026-09-28T12:20:00.000Z"
                )
            ]
        });

        const result =
            await createD1InsuranceLeadPresentationPersistence(
                database
            ).listForRelationships([
                idOne,
                idTwo,
                idGeneric
            ]);

        assert.equal(
            database.statements.length,
            4
        );

        assert.equal(
            result.length,
            2
        );

        assert.deepEqual(
            result.map(
                value =>
                    value.relationshipId
            ),
            [
                idOne,
                idTwo
            ]
        );

        assert.equal(
            result[0]
                ?.acquisitionSource,
            "website"
        );

        assert.equal(
            result[0]
                ?.campaign,
            "West Texas"
        );

        assert.equal(
            result[0]
                ?.consentChannels[0]
                ?.channel,
            "email"
        );

        assert.equal(
            result[1]
                ?.doNotContact,
            true
        );

        assert.equal(
            result[1]
                ?.quoteStatus,
            "quoted"
        );

        assert.equal(
            result[0]
                ?.recentEvents.length,
            1
        );
    }
);

test(
    "D1 insurance presentation projection returns only relationships with insurance profiles",
    async () => {
        const database =
            new FakeDatabase();

        database.queue({
            success:
                true,
            results: [
                profileRow(
                    idOne
                )
            ]
        });

        database.queue({
            success:
                true,
            results: []
        });

        database.queue({
            success:
                true,
            results: []
        });

        database.queue({
            success:
                true,
            results: []
        });

        const result =
            await createD1InsuranceLeadPresentationPersistence(
                database
            ).listForRelationships([
                idOne,
                idGeneric
            ]);

        assert.deepEqual(
            result.map(
                value =>
                    value.relationshipId
            ),
            [
                idOne
            ]
        );
    }
);

test(
    "D1 insurance presentation projection avoids enrichment queries when no insurance profile exists",
    async () => {
        const database =
            new FakeDatabase();

        database.queue({
            success:
                true,
            results: []
        });

        const result =
            await createD1InsuranceLeadPresentationPersistence(
                database
            ).listForRelationships([
                idGeneric
            ]);

        assert.deepEqual(
            result,
            []
        );

        assert.equal(
            database.statements.length,
            1
        );
    }
);

test(
    "D1 insurance presentation projection performs no query for empty relationship set",
    async () => {
        const database =
            new FakeDatabase();

        const result =
            await createD1InsuranceLeadPresentationPersistence(
                database
            ).listForRelationships([]);

        assert.deepEqual(
            result,
            []
        );

        assert.equal(
            database.statements.length,
            0
        );
    }
);

test(
    "D1 insurance presentation projection deduplicates canonical relationship IDs before binding",
    async () => {
        const database =
            new FakeDatabase();

        database.queue({
            success:
                true,
            results: []
        });

        await createD1InsuranceLeadPresentationPersistence(
            database
        ).listForRelationships([
            idOne,
            idOne,
            idTwo
        ]);

        assert.equal(
            database.statements.length,
            1
        );

        assert.deepEqual(
            database.statements[0]
                ?.binds[0],
            [
                idOne,
                idTwo
            ]
        );

        assert.match(
            database.statements[0]!
                .sql,
            /IN\s*\(\?, \?\)/
        );
    }
);

test(
    "D1 insurance presentation projection rejects noncanonical relationship identity",
    async () => {
        const database =
            new FakeDatabase();

        await assert.rejects(
            createD1InsuranceLeadPresentationPersistence(
                database
            ).listForRelationships([
                "not-a-relationship"
            ]),
            /canonical relationship IDs/
        );

        assert.equal(
            database.statements.length,
            0
        );
    }
);

test(
    "D1 insurance presentation projection SQL is strictly read-only",
    async () => {
        const database =
            new FakeDatabase();

        database.queue({
            success:
                true,
            results: [
                profileRow(
                    idOne
                )
            ]
        });

        database.queue({
            success:
                true,
            results: []
        });

        database.queue({
            success:
                true,
            results: []
        });

        database.queue({
            success:
                true,
            results: []
        });

        await createD1InsuranceLeadPresentationPersistence(
            database
        ).listForRelationships([
            idOne
        ]);

        assert.equal(
            database.statements.length,
            4
        );

        for(const statement of database.statements){
            assert.match(
                statement.sql,
                /^\s*SELECT/i
            );

            assert.doesNotMatch(
                statement.sql,
                /\b(?:INSERT|UPDATE|DELETE|REPLACE|UPSERT)\b/i
            );
        }
    }
);

test(
    "D1 insurance presentation event query bounds newest events per relationship",
    async () => {
        const database =
            new FakeDatabase();

        database.queue({
            success:
                true,
            results: [
                profileRow(
                    idOne
                )
            ]
        });

        database.queue({
            success:
                true,
            results: []
        });

        database.queue({
            success:
                true,
            results: []
        });

        database.queue({
            success:
                true,
            results: []
        });

        await createD1InsuranceLeadPresentationPersistence(
            database
        ).listForRelationships([
            idOne
        ]);

        const eventQuery =
            database.statements[3];

        assert.ok(
            eventQuery
        );

        assert.match(
            eventQuery.sql,
            /ROW_NUMBER\(\)\s+OVER/i
        );

        assert.match(
            eventQuery.sql,
            /PARTITION BY relationship_id/i
        );

        assert.match(
            eventQuery.sql,
            /river_event_rank\s*<=\s*5/i
        );

        assert.match(
            eventQuery.sql,
            /occurred_at DESC/i
        );
    }
);

test(
    "D1 insurance presentation projection propagates failed D1 SELECT result",
    async () => {
        const database =
            new FakeDatabase();

        database.queue({
            success:
                false,
            results: []
        });

        await assert.rejects(
            createD1InsuranceLeadPresentationPersistence(
                database
            ).listForRelationships([
                idOne
            ]),
            /profile query failed/
        );
    }
);

test(
    "D1 insurance presentation projection maps persisted values through canonical constructors",
    async () => {
        const database =
            new FakeDatabase();

        database.queue({
            success:
                true,
            results: [
                {
                    ...profileRow(
                        idOne
                    ),
                    state:
                        "not-a-state"
                }
            ]
        });

        await assert.rejects(
            createD1InsuranceLeadPresentationPersistence(
                database
            ).listForRelationships([
                idOne
            ]),
            /state code/
        );
    }
);

test(
    "D1 insurance presentation projection partitions one hundred plus one relationships into bounded reads",
    async () => {
        type Persistence =
            ReturnType<
                typeof createD1InsuranceLeadPresentationPersistence
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

        const database =
            new FakeDatabase();

        const chunks = [
            relationshipIds.slice(
                0,
                100
            ),
            relationshipIds.slice(
                100
            )
        ];

        for(const chunk of chunks){
            database.queue({
                success:
                    true,
                results:
                    chunk.map(
                        relationshipId =>
                            profileRow(
                                relationshipId
                            )
                    )
            });

            database.queue({
                success:
                    true,
                results:
                    []
            });

            database.queue({
                success:
                    true,
                results:
                    []
            });

            database.queue({
                success:
                    true,
                results:
                    []
            });
        }

        const values =
            await createD1InsuranceLeadPresentationPersistence(
                database
            ).listForRelationships(
                relationshipIds
            );

        assert.equal(
            database.statements.length,
            8
        );

        for(
            let index = 0;
            index < 4;
            index += 1
        ){
            assert.equal(
                database.statements[index]!
                    .binds[0]!
                    .length,
                100
            );
        }

        for(
            let index = 4;
            index < 8;
            index += 1
        ){
            assert.equal(
                database.statements[index]!
                    .binds[0]!
                    .length,
                1
            );
        }

        assert.deepEqual(
            values.map(
                value =>
                    value.relationshipId
            ),
            [
                ...relationshipIds
            ].sort()
        );
    }
);
