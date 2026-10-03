import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

import { resolveInsuranceOutboundContactServerRuntimeComposition } from "./outbound-contact-server-runtime-composition";
import { createInsurancePrivateContactOrchestrationService } from "./private-contact-orchestration";
import { buildInsurancePrivateContactRequestFromForm } from "./private-contact-request";
import { isSameOriginRiverCrmWriteRequest } from "../river-os/crm-actions";


const routePath =
    "src/pages/river-os/actions/insurance-contact.ts";

const source =
    fs.readFileSync(
        routePath,
        "utf8"
    );


test(
    "private contact route is POST-only and non-prerendered",
    () => {
        assert.match(
            source,
            /export const prerender\s*=\s*false/
        );

        assert.match(
            source,
            /export const POST/
        );

        assert.doesNotMatch(
            source,
            /export const GET/
        );
    }
);


test(
    "private contact route uses the canonical same-origin write guard",
    () => {
        assert.match(
            source,
            /isSameOriginRiverCrmWriteRequest/
        );

        assert.match(
            source,
            /403/
        );
    }
);


test(
    "private contact route requires the canonical River CRM D1 binding",
    () => {
        assert.match(
            source,
            /RIVER_CRM_DB/
        );

        assert.match(
            source,
            /createD1RiverCrmPersistence/
        );

        assert.match(
            source,
            /\.get\s*\(\s*contactRequest\.relationshipId\s*\)/s
        );
    }
);


test(
    "private contact route parses the canonical provider-neutral request contract",
    () => {
        assert.match(
            source,
            /buildInsurancePrivateContactRequestFromForm/
        );

        assert.doesNotMatch(
            source,
            /formData\.get\s*\(\s*["']phone["']/s
        );

        assert.doesNotMatch(
            source,
            /formData\.get\s*\(\s*["']email["']/s
        );

        assert.doesNotMatch(
            source,
            /formData\.get\s*\(\s*["']destination["']/s
        );
    }
);


test(
    "private contact route fails closed before provider composition exists",
    () => {
        assert.match(
            source,
            /Insurance contact provider is not configured\./
        );

        assert.match(
            source,
            /503/
        );

        assert.doesNotMatch(
            source,
            /createInsuranceContactOrchestrationService/
        );

        assert.doesNotMatch(
            source,
            /\.requestContact\s*\(/
        );
    }
);


test(
    "private contact route contains no provider SDK or direct network transport",
    () => {
        assert.doesNotMatch(
            source,
            /Twilio|RingCentral|OpenPhone|Telnyx|Plivo|Vonage/i
        );

        assert.doesNotMatch(
            source,
            /\bfetch\s*\(/
        );

        assert.doesNotMatch(
            source,
            /axios/i
        );
    }
);

test(
    "INS-007T route uses provider-neutral composition seam",
    () => {
        assert.match(source,/createInsurancePrivateContactOrchestrationService/);
        assert.match(source,/orchestration\s*===\s*undefined/s);
        assert.doesNotMatch(source,/\.requestContact\s*\(/);
    }
);

test("INS-007X route injects server runtime and transport into the canonical composition seam", () => {
    assert.match(source, /resolveInsuranceOutboundContactServerRuntimeComposition\s*\(\s*runtimeEnvironment\s*,\s*globalThis\.fetch\s*\)/s);
    assert.match(source, /createInsurancePrivateContactOrchestrationService\s*\(\s*database\s*,\s*providerComposition\s*\)/s);
    assert.doesNotMatch(source, /process\.env|import\.meta\.env|API_KEY|CONNECTION_ID|FROM_NUMBER/);
});

test("INS-007X actual route remains 503 without transport or contact execution for absent, invalid, and complete configuration", async () => {
    // Execute the transpiled route with a fake Cloudflare module and database read.
    // The real configuration resolver and private orchestration factory remain in use.
    const javascript = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText;

    for (const configuration of [
        {},
        { INSURANCE_OUTBOUND_CONTACT_ENABLED: "true", INSURANCE_CONTACT_PROVIDER: "other" },
        {
            INSURANCE_OUTBOUND_CONTACT_ENABLED: "true",
            INSURANCE_CONTACT_PROVIDER: "telnyx",
            TELNYX_API_KEY: "fake-key",
            TELNYX_CONNECTION_ID: "fake-connection",
            TELNYX_FROM_NUMBER: "+14325550999"
        }
    ]) {
        let transportCalls = 0;
        let contactCalls = 0;
        let resolverCalls = 0;
        let orchestrationCalls = 0;
        let relationshipReads = 0;
        const database = {} as D1Database;
        const environment = { ...configuration, RIVER_CRM_DB: database };
        const transport = async () => {
            transportCalls += 1;
            throw new Error("Route must not execute transport.");
        };
        let resolvedComposition: ReturnType<typeof resolveInsuranceOutboundContactServerRuntimeComposition>;
        const modules: Record<string, unknown> = {
            "cloudflare:workers": { env: environment },
            "../../../lib/river-os/crm-actions": { isSameOriginRiverCrmWriteRequest },
            "../../../lib/river-os/d1-crm": {
                createD1RiverCrmPersistence: (receivedDatabase: D1Database) => {
                    assert.equal(receivedDatabase, database);
                    return { get: async (id: string) => {
                        relationshipReads += 1;
                        assert.equal(id, "relationship:ins-007x");
                        return { relationshipId: id };
                    } };
                }
            },
            "../../../lib/insurance/private-contact-request": { buildInsurancePrivateContactRequestFromForm },
            "../../../lib/insurance/outbound-contact-server-runtime-composition": {
                resolveInsuranceOutboundContactServerRuntimeComposition: (
                    ...args: Parameters<typeof resolveInsuranceOutboundContactServerRuntimeComposition>
                ) => {
                    resolverCalls += 1;
                    assert.equal(relationshipReads, 1);
                    assert.equal(args[0], environment);
                    assert.equal(args[1], transport);
                    resolvedComposition = resolveInsuranceOutboundContactServerRuntimeComposition(...args);
                    return resolvedComposition;
                }
            },
            "../../../lib/insurance/private-contact-orchestration": {
                createInsurancePrivateContactOrchestrationService: (
                    ...args: Parameters<typeof createInsurancePrivateContactOrchestrationService>
                ) => {
                    orchestrationCalls += 1;
                    assert.equal(args[0], database);
                    assert.equal(args[1], resolvedComposition);
                    const service = createInsurancePrivateContactOrchestrationService(...args);
                    if (service !== undefined) {
                        service.requestContact = async () => {
                            contactCalls += 1;
                            throw new Error("Route must not execute contact.");
                        };
                    }
                    return service;
                }
            }
        };
        const exports: { POST?: (context: { request: Request }) => Promise<Response> } = {};
        vm.runInNewContext(javascript, {
            exports,
            require: (name: string) => {
                assert.ok(Object.hasOwn(modules, name), `Unexpected route dependency: ${name}`);
                return modules[name];
            },
            fetch: transport,
            Response
        });

        const form = new FormData();
        form.set("relationshipId", "relationship:ins-007x");
        form.set("channel", "phone");
        form.set("intent", "instant-contact");
        assert.ok(exports.POST);
        const response = await exports.POST({ request: new Request("https://example.com/river-os/actions/insurance-contact", {
            method: "POST", headers: { origin: "https://example.com" }, body: form
        }) });
        assert.equal(response.status, 503);
        assert.equal(await response.text(), "Insurance contact provider is not configured.");
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.equal(resolverCalls, 1);
        assert.equal(orchestrationCalls, 1);
        assert.equal(resolvedComposition?.providerName, "TELNYX_API_KEY" in configuration ? "telnyx" : undefined);
        assert.equal(transportCalls, 0);
        assert.equal(contactCalls, 0);
    }
});
