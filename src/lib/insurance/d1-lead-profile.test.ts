import assert from "node:assert/strict";
import test from "node:test";

import {
    createD1InsuranceLeadProfilePersistence
} from "./d1-lead-profile";

import type {
    RiverCrmD1AllResult,
    RiverCrmD1RunResult,
    RiverCrmD1Statement
} from "../river-os/d1-crm-growth";


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
    "relationship:lead:insurance-persistence-001";

test(
    "D1 insurance persistence maps canonical lead profile row",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceLeadProfilePersistence(
                database
            );

        const promise =
            persistence.get(
                relationshipId
            );

        database.latest().firstValue = {
            relationship_id:
                relationshipId,
            state:
                "TX",
            postal_code:
                "79720",
            product_interest:
                "auto",
            quote_status:
                "requested",
            assigned_producer:
                "River",
            created_at:
                "2026-09-28T15:00:00.000Z",
            updated_at:
                "2026-09-28T15:00:00.000Z"
        };

        const profile =
            await promise;

        assert.equal(
            profile?.relationshipId,
            relationshipId
        );

        assert.equal(
            profile?.state,
            "TX"
        );

        assert.equal(
            profile?.quoteStatus,
            "requested"
        );
    }
);

test(
    "D1 insurance persistence returns null for absent lead profile",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceLeadProfilePersistence(
                database
            );

        const profile =
            await persistence.get(
                relationshipId
            );

        assert.equal(
            profile,
            null
        );
    }
);

test(
    "D1 insurance persistence upserts by canonical relationship",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceLeadProfilePersistence(
                database
            );

        const profile =
            await persistence.upsert({
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
                    " River ",
                createdAt:
                    "2026-09-28T15:00:00.000Z",
                updatedAt:
                    "2026-09-28T15:00:00.000Z"
            });

        assert.equal(
            profile.state,
            "TX"
        );

        assert.equal(
            profile.assignedProducer,
            "River"
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
    "D1 insurance persistence stores missing assignedProducer as null",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceLeadProfilePersistence(
                database
            );

        await persistence.upsert({
            relationshipId,
            state:
                "TX",
            postalCode:
                "79720",
            productInterest:
                "life",
            quoteStatus:
                "not-started",
            createdAt:
                "2026-09-28T15:00:00.000Z",
            updatedAt:
                "2026-09-28T15:00:00.000Z"
        });

        assert.equal(
            database.latest()
                .binds[0]?.[5],
            null
        );
    }
);

test(
    "D1 insurance persistence rejects malformed persisted rows via canonical validation",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceLeadProfilePersistence(
                database
            );

        const promise =
            persistence.get(
                relationshipId
            );

        database.latest().firstValue = {
            relationship_id:
                relationshipId,
            state:
                "Texas",
            postal_code:
                "79720",
            product_interest:
                "auto",
            quote_status:
                "requested",
            assigned_producer:
                null,
            created_at:
                "2026-09-28T15:00:00.000Z",
            updated_at:
                "2026-09-28T15:00:00.000Z"
        };

        await assert.rejects(
            promise,
            /state code/
        );
    }
);

test(
    "D1 insurance persistence propagates execution errors",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1InsuranceLeadProfilePersistence(
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
                    "insurance d1 unavailable"
                );

            return statement;
        };

        await assert.rejects(
            persistence.upsert({
                relationshipId,
                state:
                    "TX",
                postalCode:
                    "79720",
                productInterest:
                    "auto",
                quoteStatus:
                    "requested",
                createdAt:
                    "2026-09-28T15:00:00.000Z",
                updatedAt:
                    "2026-09-28T15:00:00.000Z"
            }),
            /insurance d1 unavailable/
        );
    }
);

