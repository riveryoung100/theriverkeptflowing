import assert from "node:assert/strict";
import {
    readFile
} from "node:fs/promises";
import test from "node:test";
import {
    fileURLToPath
} from "node:url";

import {
    createInsuranceOutboundContactProviderComposition
} from "./outbound-contact-provider-composition";

import type {
    InsuranceOutboundContactRuntimeConfiguration
} from "./outbound-contact-runtime-configuration";

import type {
    TelnyxFetch
} from "./telnyx-contact-provider";


const configuration:
    InsuranceOutboundContactRuntimeConfiguration = {
        provider:
            "telnyx",
        apiKey:
            "test-api-key",
        connectionId:
            "test-connection-id",
        fromNumber:
            "+14325550999"
    };

const fakeFetch:
    TelnyxFetch =
        async () =>
            new Response(
                JSON.stringify({
                    data: {
                        call_control_id:
                            "unused-test-call"
                    }
                }),
                {
                    status:
                        200,
                    headers: {
                        "content-type":
                            "application/json"
                    }
                }
            );


test(
    "INS-007V composes validated Telnyx configuration into the provider-neutral private composition",
    () => {
        const composition =
            createInsuranceOutboundContactProviderComposition(
                configuration,
                fakeFetch
            );

        assert.equal(
            composition.providerName,
            "telnyx"
        );

        assert.equal(
            typeof composition.provider.requestContact,
            "function"
        );
    }
);


test(
    "INS-007V composition remains isolated from runtime environment and route execution",
    async () => {
        const source =
            await readFile(
                fileURLToPath(
                    new URL(
                        "./outbound-contact-provider-composition.ts",
                        import.meta.url
                    )
                ),
                "utf8"
            );

        assert.match(
            source,
            /createTelnyxContactProvider/
        );

        assert.doesNotMatch(
            source,
            /cloudflare:workers|process\.env|import\.meta\.env/
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
