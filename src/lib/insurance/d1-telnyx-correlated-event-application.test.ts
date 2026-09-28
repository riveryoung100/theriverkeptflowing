import assert from "node:assert/strict";
import test from "node:test";

import {
    createD1TelnyxCorrelatedEventApplicationService
} from "./d1-telnyx-correlated-event-application";

import type {
    D1TelnyxCorrelatedEventApplicationDatabase
} from "./d1-telnyx-correlated-event-application";


interface PreparedCall {
    readonly sql:
        string;

    readonly bindings:
        readonly unknown[];
}


function createFakeDatabase(){
    const prepared:
        PreparedCall[] = [];

    let active:
        PreparedCall |
        undefined;

    const statement = {
        bind(
            ...bindings:
                unknown[]
        ){
            if(active === undefined){
                throw new Error(
                    "Fake D1 statement bind requires an active prepare call."
                );
            }

            active =
                {
                    sql:
                        active.sql,
                    bindings
                };

            prepared[
                prepared.length -
                1
            ] =
                active;

            return statement;
        },

        async first(){
            return null;
        },

        async all(){
            return {
                results:
                    []
            };
        },

        async run(){
            return {
                success:
                    true,
                meta: {
                    changes:
                        0
                }
            };
        }
    };

    const database = {
        prepare(
            sql:
                string
        ){
            active = {
                sql,
                bindings:
                    []
            };

            prepared.push(
                active
            );

            return statement;
        }
    } as unknown as
        D1TelnyxCorrelatedEventApplicationDatabase;

    return {
        database,
        prepared
    };
}


test(
    "composition is lazy and performs no D1 query during construction",
    () => {
        const fake =
            createFakeDatabase();

        const application =
            createD1TelnyxCorrelatedEventApplicationService(
                fake.database
            );

        assert.equal(
            typeof application.apply,
            "function"
        );

        assert.equal(
            fake.prepared.length,
            0
        );
    }
);


test(
    "composed service resolves correlation through the caller-provided database",
    async () => {
        const fake =
            createFakeDatabase();

        const application =
            createD1TelnyxCorrelatedEventApplicationService(
                fake.database
            );

        const result =
            await application.apply({
                event: {
                    provider:
                        "telnyx",
                    providerEventId:
                        "event:e2c3e:missing-correlation",
                    type:
                        "call.answered",
                    occurredAt:
                        "2026-09-28T22:45:00.000Z",
                    callControlId:
                        "call-control:e2c3e:missing"
                },
                receivedAt:
                    "2026-09-28T22:45:01.000Z"
            });

        assert.deepEqual(
            result,
            {
                handled:
                    false,
                reason:
                    "correlation-not-found"
            }
        );

        assert.equal(
            fake.prepared.length,
            1
        );

        assert.match(
            fake.prepared[0]!.sql,
            /river_crm_contact_call_correlations/
        );

        assert.deepEqual(
            fake.prepared[0]!.bindings,
            [
                "telnyx",
                "call-control:e2c3e:missing"
            ]
        );
    }
);


test(
    "correlation-not-found stops before bridge attempt or receipt persistence",
    async () => {
        const fake =
            createFakeDatabase();

        const application =
            createD1TelnyxCorrelatedEventApplicationService(
                fake.database
            );

        await application.apply({
            event: {
                provider:
                    "telnyx",
                providerEventId:
                    "event:e2c3e:zero-downstream",
                type:
                    "call.bridged",
                occurredAt:
                    "2026-09-28T22:46:00.000Z",
                callControlId:
                    "call-control:e2c3e:zero-downstream"
            },
            receivedAt:
                "2026-09-28T22:46:01.000Z"
        });

        const sql =
            fake.prepared
                .map(
                    entry =>
                        entry.sql
                )
                .join(
                    "`n"
                );

        assert.match(
            sql,
            /river_crm_contact_call_correlations/
        );

        assert.doesNotMatch(
            sql,
            /river_crm_contact_call_bridges/
        );

        assert.doesNotMatch(
            sql,
            /river_crm_contact_attempts/
        );

        assert.doesNotMatch(
            sql,
            /river_crm_contact_provider_events/
        );
    }
);
