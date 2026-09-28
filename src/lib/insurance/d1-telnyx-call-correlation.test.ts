import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceContactAttemptId
} from "./contact-attempt";

import {
    createTelnyxCallLegCorrelation
} from "./telnyx-call-correlation";

import {
    createD1TelnyxCallLegCorrelationPersistence
} from "./d1-telnyx-call-correlation";

import type {
    TelnyxCallCorrelationD1RunResult,
    TelnyxCallCorrelationD1Statement
} from "./d1-telnyx-call-correlation";


class FakeStatement
implements TelnyxCallCorrelationD1Statement {
    public readonly binds:
        unknown[][] = [];

    public firstResult:
        unknown = null;

    public allResults:
        readonly unknown[] = [];

    public runResult:
        TelnyxCallCorrelationD1RunResult = {
            success:
                true,
            meta: {
                changes:
                    1
            }
        };

    public constructor(
        public readonly sql:
            string
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

    async first<T>(){
        return this.firstResult as
            T |
            null;
    }

    async all<T>(){
        return {
            results:
                this.allResults as
                    readonly T[]
        };
    }

    async run(){
        return this.runResult;
    }
}


class FakeDatabase {
    public readonly statements:
        FakeStatement[] = [];

    public nextFirstResult:
        unknown = null;

    public nextAllResults:
        readonly unknown[] = [];

    public nextRunResult:
        TelnyxCallCorrelationD1RunResult = {
            success:
                true,
            meta: {
                changes:
                    1
            }
        };

    prepare(
        sql:
            string
    ){
        const statement =
            new FakeStatement(
                sql
            );

        statement.firstResult =
            this.nextFirstResult;

        statement.allResults =
            this.nextAllResults;

        statement.runResult =
            this.nextRunResult;

        this.nextFirstResult =
            null;

        this.nextAllResults =
            [];

        this.nextRunResult = {
            success:
                true,
            meta: {
                changes:
                    1
            }
        };

        this.statements.push(
            statement
        );

        return statement;
    }
}


const attemptId =
    createInsuranceContactAttemptId(
        "contact-attempt:correlation-persistence-1"
    );

const createdAt =
    "2026-09-28T20:00:00.000Z";


function correlation(
    legRole:
        "operator" |
        "lead",
    providerReference:
        string
){
    return createTelnyxCallLegCorrelation({
        attemptId,
        legRole,
        providerReference,
        createdAt
    });
}


test(
    "upsert persists one role-scoped provider correlation",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1TelnyxCallLegCorrelationPersistence(
                database
            );

        const value =
            await persistence.upsert(
                correlation(
                    "operator",
                    "operator-call"
                )
            );

        assert.equal(
            value.providerReference,
            "operator-call"
        );

        assert.match(
            database.statements[0]!.sql,
            /ON CONFLICT\s*\(\s*attempt_id,\s*leg_role\s*\)/i
        );

        assert.deepEqual(
            database.statements[0]!.binds[0],
            [
                attemptId,
                "operator",
                "telnyx",
                "operator-call",
                createdAt,
                createdAt
            ]
        );
    }
);


test(
    "provider-reference lookup returns role and canonical attempt",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1TelnyxCallLegCorrelationPersistence(
                database
            );

        database.nextFirstResult = {
            attempt_id:
                attemptId,
            leg_role:
                "lead",
            provider:
                "telnyx",
            provider_reference:
                "lead-call",
            created_at:
                createdAt,
            updated_at:
                createdAt
        };

        const value =
            await persistence.getByProviderReference(
                "telnyx",
                "lead-call"
            );

        assert.equal(
            value?.attemptId,
            attemptId
        );

        assert.equal(
            value?.legRole,
            "lead"
        );

        assert.match(
            database.statements[0]!.sql,
            /provider = \?1[\s\S]*provider_reference = \?2/i
        );
    }
);


test(
    "provider-reference lookup returns undefined when absent",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1TelnyxCallLegCorrelationPersistence(
                database
            );

        const value =
            await persistence.getByProviderReference(
                "telnyx",
                "missing"
            );

        assert.equal(
            value,
            undefined
        );
    }
);


test(
    "attempt-role lookup binds canonical River identity and role",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1TelnyxCallLegCorrelationPersistence(
                database
            );

        await persistence.getByAttemptAndRole(
            attemptId,
            "operator"
        );

        assert.deepEqual(
            database.statements[0]!.binds[0],
            [
                attemptId,
                "operator"
            ]
        );
    }
);


test(
    "listForAttempt orders operator before lead",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1TelnyxCallLegCorrelationPersistence(
                database
            );

        database.nextAllResults = [
            {
                attempt_id:
                    attemptId,
                leg_role:
                    "operator",
                provider:
                    "telnyx",
                provider_reference:
                    "operator-call",
                created_at:
                    createdAt,
                updated_at:
                    createdAt
            },
            {
                attempt_id:
                    attemptId,
                leg_role:
                    "lead",
                provider:
                    "telnyx",
                provider_reference:
                    "lead-call",
                created_at:
                    createdAt,
                updated_at:
                    createdAt
            }
        ];

        const values =
            await persistence.listForAttempt(
                attemptId
            );

        assert.deepEqual(
            values.map(
                value =>
                    value.legRole
            ),
            [
                "operator",
                "lead"
            ]
        );

        assert.match(
            database.statements[0]!.sql,
            /CASE leg_role[\s\S]*WHEN 'operator' THEN 0/i
        );
    }
);


test(
    "write rejects unsuccessful D1 result",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1TelnyxCallLegCorrelationPersistence(
                database
            );

        database.nextRunResult = {
            success:
                false,
            meta: {
                changes:
                    0
            }
        };

        await assert.rejects(
            persistence.upsert(
                correlation(
                    "operator",
                    "operator-call"
                )
            ),
            /write failed/
        );
    }
);


test(
    "lookup rejects blank provider reference before SQL",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1TelnyxCallLegCorrelationPersistence(
                database
            );

        await assert.rejects(
            persistence.getByProviderReference(
                "telnyx",
                " "
            ),
            /providerReference/
        );

        assert.equal(
            database.statements.length,
            0
        );
    }
);
