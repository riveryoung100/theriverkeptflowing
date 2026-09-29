import assert from "node:assert/strict";
import test from "node:test";

import {
    createD1TelnyxWebhookApplicationService
} from "./d1-telnyx-webhook-application";

import type {
    D1TelnyxCorrelatedEventApplicationDatabase
} from "./d1-telnyx-correlated-event-application";

interface PreparedCall {
    readonly sql:
        string;

    readonly bindings:
        readonly unknown[];
}

function createMissingCorrelationDatabase(){
    const prepared:
        PreparedCall[] = [];

    let active:
        {
            sql:
                string;
            bindings:
                unknown[];
        } |
        undefined;

    const statement = {
        bind(
            ...bindings:
                unknown[]
        ){
            if(active === undefined){
                throw new Error(
                    "Fake D1 bind requires an active prepare call."
                );
            }

            active.bindings =
                bindings;

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

const event = {
    provider:
        "telnyx",
    providerEventId:
        "event:f4:missing-correlation",
    type:
        "call.answered",
    occurredAt:
        "2026-09-29T14:00:00.000Z",
    callControlId:
        "call-control:f4:missing"
} as const;

const receivedAt =
    "2026-09-29T14:00:01.000Z";

test(
    "composition is lazy and performs no D1 work during construction",
    () => {
        const fake =
            createMissingCorrelationDatabase();

        const service =
            createD1TelnyxWebhookApplicationService(
                fake.database
            );

        assert.equal(
            typeof service.apply,
            "function"
        );

        assert.equal(
            fake.prepared.length,
            0
        );
    }
);

test(
    "normalized event is delegated to landed D1 application and full result is preserved",
    async () => {
        const fake =
            createMissingCorrelationDatabase();

        const service =
            createD1TelnyxWebhookApplicationService(
                fake.database
            );

        const result =
            await service.apply({
                event,
                receivedAt
            });

        assert.deepEqual(
            result.application,
            {
                handled:
                    false,
                reason:
                    "correlation-not-found"
            }
        );

        assert.ok(
            fake.prepared.length > 0
        );
    }
);

test(
    "correlation-not-found is mapped through F3 to transient provider redelivery",
    async () => {
        const fake =
            createMissingCorrelationDatabase();

        const service =
            createD1TelnyxWebhookApplicationService(
                fake.database
            );

        const result =
            await service.apply({
                event,
                receivedAt
            });

        assert.deepEqual(
            result.acknowledgement,
            {
                acknowledge:
                    false,
                retry:
                    true,
                classification:
                    "transient"
            }
        );
    }
);

test(
    "application evidence and acknowledgement are returned together from one invocation",
    async () => {
        const fake =
            createMissingCorrelationDatabase();

        const service =
            createD1TelnyxWebhookApplicationService(
                fake.database
            );

        const result =
            await service.apply({
                event,
                receivedAt
            });

        assert.equal(
            result.application.handled,
            false
        );

        assert.equal(
            result.acknowledgement.acknowledge,
            false
        );

        assert.equal(
            result.acknowledgement.retry,
            true
        );
    }
);

test(
    "receivedAt validation remains owned by landed D3 application",
    async () => {
        const fake =
            createMissingCorrelationDatabase();

        const service =
            createD1TelnyxWebhookApplicationService(
                fake.database
            );

        await assert.rejects(
            async () => {
                await service.apply({
                    event,
                    receivedAt:
                        "not-a-timestamp"
                });
            },
            /receivedAt/
        );

        assert.equal(
            fake.prepared.length,
            0
        );
    }
);
