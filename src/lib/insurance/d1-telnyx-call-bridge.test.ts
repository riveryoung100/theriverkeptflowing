import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceContactAttemptId
} from "./contact-attempt";

import {
    createTelnyxCallBridge,
    transitionTelnyxCallBridge
} from "./telnyx-call-bridge";

import {
    createD1TelnyxCallBridgePersistence
} from "./d1-telnyx-call-bridge";

import type {
    TelnyxCallBridgeD1RunResult,
    TelnyxCallBridgeD1Statement
} from "./d1-telnyx-call-bridge";


class FakeStatement
implements TelnyxCallBridgeD1Statement {
    public readonly binds:
        unknown[][] = [];

    public firstResult:
        unknown = null;

    public runResult:
        TelnyxCallBridgeD1RunResult = {
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

    async run(){
        return this.runResult;
    }
}


class FakeDatabase {
    public readonly statements:
        FakeStatement[] = [];

    public nextFirstResult:
        unknown = null;

    public nextRunResult:
        TelnyxCallBridgeD1RunResult = {
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

        statement.runResult =
            this.nextRunResult;

        this.nextFirstResult =
            null;

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
        "contact-attempt:e2c3a-1"
    );

const createdAt =
    "2026-09-28T21:00:00.000Z";


function createdBridge(){
    return createTelnyxCallBridge({
        attemptId,
        createdAt
    });
}


function operatorAnswered(){
    return transitionTelnyxCallBridge(
        createdBridge(),
        "operator-answered",
        "2026-09-28T21:00:01.000Z",
        {
            operatorCallControlId:
                "operator-call"
        }
    );
}


test(
    "insert persists one canonical bridge snapshot",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1TelnyxCallBridgePersistence(
                database
            );

        const bridge =
            createdBridge();

        const value =
            await persistence.insertBridge(
                bridge
            );

        assert.equal(
            value,
            bridge
        );

        assert.match(
            database.statements[0]!.sql,
            /INSERT INTO river_crm_contact_call_bridges/i
        );

        assert.deepEqual(
            database.statements[0]!.binds[0],
            [
                attemptId,
                "operator-dial-requested",
                null,
                null,
                null,
                createdAt,
                createdAt
            ]
        );
    }
);


test(
    "getBridge hydrates durable operator-answered snapshot",
    async () => {
        const database =
            new FakeDatabase();

        database.nextFirstResult = {
            attempt_id:
                attemptId,
            state:
                "operator-answered",
            operator_call_control_id:
                "operator-call",
            lead_call_control_id:
                null,
            failure_code:
                null,
            created_at:
                createdAt,
            updated_at:
                "2026-09-28T21:00:01.000Z"
        };

        const persistence =
            createD1TelnyxCallBridgePersistence(
                database
            );

        const bridge =
            await persistence.getBridge(
                attemptId
            );

        assert.equal(
            bridge?.state,
            "operator-answered"
        );

        assert.equal(
            bridge?.operatorCallControlId,
            "operator-call"
        );

        assert.equal(
            bridge?.attemptId,
            attemptId
        );
    }
);


test(
    "getBridge returns undefined when bridge does not exist",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1TelnyxCallBridgePersistence(
                database
            );

        const bridge =
            await persistence.getBridge(
                attemptId
            );

        assert.equal(
            bridge,
            undefined
        );
    }
);


test(
    "compare-and-set updates only matching previous state and timestamp",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1TelnyxCallBridgePersistence(
                database
            );

        const previous =
            createdBridge();

        const next =
            operatorAnswered();

        const result =
            await persistence.compareAndSetBridge(
                previous,
                next
            );

        assert.equal(
            result.updated,
            true
        );

        assert.match(
            database.statements[0]!.sql,
            /WHERE attempt_id = \?1[\s\S]*state = \?7[\s\S]*updated_at = \?8/i
        );

        assert.deepEqual(
            database.statements[0]!.binds[0],
            [
                attemptId,
                "operator-answered",
                "operator-call",
                null,
                null,
                "2026-09-28T21:00:01.000Z",
                "operator-dial-requested",
                createdAt
            ]
        );
    }
);


test(
    "compare-and-set reports stale bridge on zero-row update",
    async () => {
        const database =
            new FakeDatabase();

        database.nextRunResult = {
            success:
                true,
            meta: {
                changes:
                    0
            }
        };

        const persistence =
            createD1TelnyxCallBridgePersistence(
                database
            );

        const result =
            await persistence.compareAndSetBridge(
                createdBridge(),
                operatorAnswered()
            );

        assert.deepEqual(
            result,
            {
                updated:
                    false,
                reason:
                    "stale-bridge"
            }
        );
    }
);


test(
    "compare-and-set rejects canonical attempt identity changes",
    async () => {
        const database =
            new FakeDatabase();

        const persistence =
            createD1TelnyxCallBridgePersistence(
                database
            );

        const previous =
            createdBridge();

        const otherAttemptId =
            createInsuranceContactAttemptId(
                "contact-attempt:e2c3a-other"
            );

        const next =
            createTelnyxCallBridge({
                attemptId:
                    otherAttemptId,
                createdAt
            });

        await assert.rejects(
            persistence.compareAndSetBridge(
                previous,
                next
            ),
            /cannot change canonical attempt identity/
        );

        assert.equal(
            database.statements.length,
            0
        );
    }
);


test(
    "failed D1 write is surfaced",
    async () => {
        const database =
            new FakeDatabase();

        database.nextRunResult = {
            success:
                false,
            meta: {
                changes:
                    0
            }
        };

        const persistence =
            createD1TelnyxCallBridgePersistence(
                database
            );

        await assert.rejects(
            persistence.insertBridge(
                createdBridge()
            ),
            /insert failed/
        );
    }
);
