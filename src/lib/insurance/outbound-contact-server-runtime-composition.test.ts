import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";
import test from "node:test";
import {
    fileURLToPath
} from "node:url";

import {
    resolveInsuranceOutboundContactServerRuntimeComposition
} from "./outbound-contact-server-runtime-composition";

import type {
    TelnyxFetch
} from "./telnyx-contact-provider";

import type {
    InsuranceOutboundContactRuntimeEnvironment
} from "./outbound-contact-runtime-configuration";

import {
    createInsuranceContactAttemptId,
    createInsuranceContactIdempotencyKey
} from "./contact-attempt";

import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

const enabledEnvironment: InsuranceOutboundContactRuntimeEnvironment = {
    INSURANCE_OUTBOUND_CONTACT_ENABLED: "true",
    INSURANCE_CONTACT_PROVIDER: "telnyx",
    TELNYX_API_KEY: "test-key",
    TELNYX_CONNECTION_ID: "test-connection",
    TELNYX_FROM_NUMBER: "+14325550999"
};


test(
    "INS-007W fails closed without complete enabled outbound runtime configuration",
    () => {
        let transportCalls =
            0;

        const fetchImpl:
            TelnyxFetch =
            async () => {
                transportCalls +=
                    1;

                throw new Error(
                    "Transport must not execute during composition."
                );
            };

        const cases: Array<{
            name: string;
            environment: InsuranceOutboundContactRuntimeEnvironment;
        }> = [
            { name: "empty environment", environment: {} },
            { name: "disabled", environment: { ...enabledEnvironment, INSURANCE_OUTBOUND_CONTACT_ENABLED: "false" } },
            { name: "missing enable flag", environment: { ...enabledEnvironment, INSURANCE_OUTBOUND_CONTACT_ENABLED: undefined } },
            { name: "malformed enable flag", environment: { ...enabledEnvironment, INSURANCE_OUTBOUND_CONTACT_ENABLED: true } },
            { name: "unsupported provider", environment: { ...enabledEnvironment, INSURANCE_CONTACT_PROVIDER: "other" } }
        ];

        for (const field of [
            "INSURANCE_CONTACT_PROVIDER",
            "TELNYX_API_KEY",
            "TELNYX_CONNECTION_ID",
            "TELNYX_FROM_NUMBER"
        ] as const) {
            for (const value of [undefined, "", "   ", 123]) {
                cases.push({
                    name: `${field} = ${String(value)}`,
                    environment: { ...enabledEnvironment, [field]: value }
                });
            }
        }

        for (const { name, environment } of cases) {
            assert.equal(
                resolveInsuranceOutboundContactServerRuntimeComposition(environment, fetchImpl),
                undefined,
                name
            );
            assert.equal(transportCalls, 0, name);
        }
    }
);


test(
    "INS-007W composes complete enabled Telnyx runtime without executing transport",
    () => {
        let transportCalls =
            0;

        const fetchImpl:
            TelnyxFetch =
            async () => {
                transportCalls +=
                    1;

                throw new Error(
                    "Transport must not execute during composition."
                );
            };

        const composition =
            resolveInsuranceOutboundContactServerRuntimeComposition(
                {
                    INSURANCE_OUTBOUND_CONTACT_ENABLED:
                        "true",
                    INSURANCE_CONTACT_PROVIDER:
                        "telnyx",
                    TELNYX_API_KEY:
                        "test-key",
                    TELNYX_CONNECTION_ID:
                        "test-connection",
                    TELNYX_FROM_NUMBER:
                        "+14325550999"
                },
                fetchImpl
            );

        assert.notEqual(
            composition,
            undefined
        );

        assert.equal(
            composition?.providerName,
            "telnyx"
        );

        assert.equal(
            typeof composition?.provider.requestContact,
            "function"
        );

        assert.equal(
            transportCalls,
            0
        );
    }
);


test(
    "INS-007W returned provider uses the injected fake transport only when explicitly exercised",
    async () => {
        const calls: Array<{ input: string; init: RequestInit }> = [];
        const fetchImpl: TelnyxFetch = async (input, init) => {
            calls.push({ input, init });
            return new Response(JSON.stringify({
                data: { call_control_id: "fake-call-control" }
            }), { status: 200 });
        };

        const composition = resolveInsuranceOutboundContactServerRuntimeComposition(
            enabledEnvironment,
            fetchImpl
        );

        assert.ok(composition);
        assert.equal(calls.length, 0);

        const result = await composition.provider.requestContact({
            attemptId: createInsuranceContactAttemptId("contact-attempt:ins-007w"),
            relationshipId: requireRiverCrmRelationshipId("relationship:ins-007w"),
            channel: "phone",
            intent: "instant-contact",
            idempotencyKey: createInsuranceContactIdempotencyKey("contact-idempotency:ins-007w"),
            destination: { channel: "phone", value: "+14325550123" }
        });

        assert.equal(calls.length, 1);
        assert.equal(calls[0].input, "https://api.telnyx.com/v2/calls");
        assert.equal(calls[0].init.method, "POST");
        assert.equal(new Headers(calls[0].init.headers).get("authorization"), "Bearer test-key");
        assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
            connection_id: "test-connection",
            from: "+14325550999",
            to: "+14325550123"
        });
        assert.deepEqual(result, {
            accepted: true,
            providerReference: "fake-call-control",
            providerState: "dial-request-accepted"
        });
    }
);


test(
    "INS-007W resolver remains isolated from Cloudflare runtime, global fetch, private route, and contact execution",
    async () => {
        const source =
            await readFile(
                fileURLToPath(
                    new URL(
                        "./outbound-contact-server-runtime-composition.ts",
                        import.meta.url
                    )
                ),
                "utf8"
            );

        assert.doesNotMatch(
            source,
            /cloudflare:workers|process\.env|import\.meta\.env/
        );

        assert.doesNotMatch(
            source,
            /globalThis\.fetch|\bfetch\s*\(/
        );

        assert.doesNotMatch(
            source,
            /\.requestContact\s*\(/
        );

        assert.doesNotMatch(
            source,
            /insurance-contact\.ts/
        );
    }
);
