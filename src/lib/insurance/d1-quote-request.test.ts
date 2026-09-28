import assert from "node:assert/strict";
import test from "node:test";

import {
    createD1InsuranceQuoteRequestPersistence
} from "./d1-quote-request";

import type {
    InsuranceQuoteRequestD1Database,
    InsuranceQuoteRequestD1RunResult,
    InsuranceQuoteRequestD1Statement
} from "./d1-quote-request";

import {
    buildInsuranceQuoteRequestRecords
} from "./quote-request";


class FakeStatement
implements InsuranceQuoteRequestD1Statement {
    public readonly binds:
        unknown[][] = [];

    public constructor(
        public readonly sql:
            string
    ){}

    bind(
        ...values: unknown[]
    ){
        this.binds.push(
            values
        );

        return this;
    }
}

class FakeDatabase
implements InsuranceQuoteRequestD1Database {
    public readonly prepared:
        FakeStatement[] = [];

    public batchCalls:
        FakeStatement[][] = [];

    public batchError:
        Error | undefined;

    public batchResults:
        readonly InsuranceQuoteRequestD1RunResult[] |
        undefined;

    prepare(
        sql: string
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
            readonly InsuranceQuoteRequestD1Statement[]
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

function dependencies(){
    let sequence =
        0;

    return {
        now(){
            return "2026-09-28T16:45:00.000Z";
        },

        createUuid(){
            sequence += 1;

            return `batch-${sequence}`;
        }
    };
}

function emailOnlyRecords(){
    return buildInsuranceQuoteRequestRecords(
        {
            firstName:
                "Batch",
            lastName:
                "Lead",
            email:
                "batch@example.com",
            state:
                "TX",
            postalCode:
                "79720",
            productInterest:
                "home",
            campaign:
                "insurance-launch",
            consent: {
                email:
                    true,
                textVersion:
                    "quote-v1"
            }
        },
        dependencies()
    );
}

function allChannelRecords(){
    return buildInsuranceQuoteRequestRecords(
        {
            firstName:
                "All",
            lastName:
                "Channels",
            phone:
                "4325550100",
            email:
                "all@example.com",
            state:
                "TX",
            postalCode:
                "79720",
            productInterest:
                "auto",
            consent: {
                phone:
                    true,
                sms:
                    true,
                email:
                    false,
                textVersion:
                    "quote-v1"
            }
        },
        dependencies()
    );
}

test(
    "D1 quote persistence executes one batch for the complete accepted request",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceQuoteRequestPersistence(
                database
            );

        const records =
            emailOnlyRecords();

        await persistence
            .createQuoteRequest(
                records
            );

        assert.equal(
            database.batchCalls.length,
            1
        );

        const batch =
            database.batchCalls[0];

        assert.ok(
            batch
        );

        assert.equal(
            batch.length,
            6
        );

        assert.match(
            batch[0]!.sql,
            /INSERT INTO river_crm_relationships/
        );

        assert.match(
            batch[1]!.sql,
            /INSERT INTO river_crm_acquisition_attribution/
        );

        assert.match(
            batch[2]!.sql,
            /INSERT INTO river_crm_insurance_lead_profiles/
        );

        assert.match(
            batch[3]!.sql,
            /INSERT INTO river_crm_contact_consents/
        );

        assert.match(
            batch[4]!.sql,
            /INSERT INTO river_crm_relationship_events/
        );

        assert.match(
            batch[5]!.sql,
            /INSERT INTO river_crm_relationship_events/
        );
    }
);

test(
    "D1 quote persistence includes every explicit consent in the same batch",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceQuoteRequestPersistence(
                database
            );

        await persistence
            .createQuoteRequest(
                allChannelRecords()
            );

        const batch =
            database.batchCalls[0];

        assert.ok(
            batch
        );

        assert.equal(
            batch.length,
            8
        );

        const consentStatements =
            batch.filter(
                statement =>
                    /river_crm_contact_consents/
                        .test(
                            statement.sql
                        )
            );

        assert.equal(
            consentStatements.length,
            3
        );
    }
);

test(
    "D1 quote persistence binds canonical relationship fields",
    async () => {
        const database =
            new FakeDatabase();

        const records =
            emailOnlyRecords();

        await createD1InsuranceQuoteRequestPersistence(
            database
        ).createQuoteRequest(
            records
        );

        const relationship =
            database.batchCalls[0]?.[0];

        assert.ok(
            relationship
        );

        assert.deepEqual(
            relationship.binds[0],
            [
                records.relationship.relationshipId,
                "Batch Lead",
                "lead",
                "new",
                "website",
                "batch@example.com",
                null,
                null,
                null,
                null,
                "2026-09-28T16:45:00.000Z",
                "2026-09-28T16:45:00.000Z"
            ]
        );
    }
);

test(
    "D1 quote persistence binds acquisition and profile records",
    async () => {
        const database =
            new FakeDatabase();

        const records =
            emailOnlyRecords();

        await createD1InsuranceQuoteRequestPersistence(
            database
        ).createQuoteRequest(
            records
        );

        const batch =
            database.batchCalls[0];

        assert.ok(
            batch
        );

        const acquisition =
            batch[1];

        const profile =
            batch[2];

        assert.ok(
            acquisition
        );

        assert.ok(
            profile
        );

        assert.equal(
            acquisition.binds[0]?.[0],
            records.relationship.relationshipId
        );

        assert.equal(
            acquisition.binds[0]?.[1],
            "website"
        );

        assert.equal(
            acquisition.binds[0]?.[3],
            "insurance-launch"
        );

        assert.deepEqual(
            profile.binds[0],
            [
                records.relationship.relationshipId,
                "TX",
                "79720",
                "home",
                "requested",
                null,
                "2026-09-28T16:45:00.000Z",
                "2026-09-28T16:45:00.000Z"
            ]
        );
    }
);

test(
    "D1 quote persistence serializes event metadata",
    async () => {
        const database =
            new FakeDatabase();

        await createD1InsuranceQuoteRequestPersistence(
            database
        ).createQuoteRequest(
            emailOnlyRecords()
        );

        const eventStatements =
            database.batchCalls[0]!
                .filter(
                    statement =>
                        /river_crm_relationship_events/
                            .test(
                                statement.sql
                            )
                );

        assert.equal(
            eventStatements.length,
            2
        );

        assert.equal(
            eventStatements[0]!
                .binds[0]?.[6],
            '{"productInterest":"home","state":"TX"}'
        );

        assert.equal(
            eventStatements[1]!
                .binds[0]?.[6],
            '{"productInterest":"home","state":"TX"}'
        );
    }
);

test(
    "D1 quote persistence maps suppression boolean to integer",
    async () => {
        const database =
            new FakeDatabase();

        await createD1InsuranceQuoteRequestPersistence(
            database
        ).createQuoteRequest(
            emailOnlyRecords()
        );

        const consent =
            database.batchCalls[0]!
                .find(
                    statement =>
                        /river_crm_contact_consents/
                            .test(
                                statement.sql
                            )
                );

        assert.ok(
            consent
        );

        assert.equal(
            consent.binds[0]?.[8],
            0
        );
    }
);

test(
    "D1 quote persistence rejects mismatched child relationship before batch",
    async () => {
        const database =
            new FakeDatabase();

        const records =
            emailOnlyRecords();

        const corrupted = {
            ...records,
            insuranceProfile: {
                ...records.insuranceProfile,
                relationshipId:
                    "relationship:other"
            }
        };

        await assert.rejects(
            createD1InsuranceQuoteRequestPersistence(
                database
            ).createQuoteRequest(
                corrupted
            ),
            /does not match canonical relationship/
        );

        assert.equal(
            database.batchCalls.length,
            0
        );
    }
);

test(
    "D1 quote persistence propagates batch execution failure",
    async () => {
        const database =
            new FakeDatabase();

        database.batchError =
            new Error(
                "d1 batch unavailable"
            );

        await assert.rejects(
            createD1InsuranceQuoteRequestPersistence(
                database
            ).createQuoteRequest(
                emailOnlyRecords()
            ),
            /d1 batch unavailable/
        );
    }
);

test(
    "D1 quote persistence rejects failed batch member",
    async () => {
        const database =
            new FakeDatabase();

        database.batchResults = [
            {
                success:
                    true
            },
            {
                success:
                    true
            },
            {
                success:
                    false
            },
            {
                success:
                    true
            },
            {
                success:
                    true
            },
            {
                success:
                    true
            }
        ];

        await assert.rejects(
            createD1InsuranceQuoteRequestPersistence(
                database
            ).createQuoteRequest(
                emailOnlyRecords()
            ),
            /batch failed/
        );
    }
);

test(
    "D1 quote persistence rejects unexpected batch result count",
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
            createD1InsuranceQuoteRequestPersistence(
                database
            ).createQuoteRequest(
                emailOnlyRecords()
            ),
            /unexpected result count/
        );
    }
);
