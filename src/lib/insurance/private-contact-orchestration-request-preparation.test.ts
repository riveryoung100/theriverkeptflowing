import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

import { prepareInsurancePrivateContactOrchestrationRequest as prepare } from "./private-contact-orchestration-request-preparation";
import { buildInsurancePrivateContactRequestFromForm } from "./private-contact-request";
import type { InsurancePrivateContactRequest } from "./private-contact-request";
import type { InsuranceGrowthIntegrationContext } from "./integration-boundary";

function parsedRequest(channel = "phone", intent = "instant-contact"): InsurancePrivateContactRequest {
    const form = new FormData();
    form.set("relationshipId", "relationship:ins-007y");
    form.set("channel", channel);
    form.set("intent", intent);
    return buildInsurancePrivateContactRequestFromForm(form);
}

function trustedContext(): InsuranceGrowthIntegrationContext {
    return {
        relationshipId: parsedRequest().relationshipId,
        productInterest: "auto",
        quoteStatus: "requested",
        state: "TX",
        postalCode: "79720",
        acquisitionSource: "referral",
        campaign: "test-campaign",
        contactChannels: [{ channel: "phone", status: "granted", doNotContact: false }],
        doNotContact: false
    };
}

const attemptId = "contact-attempt:ins-007y";
const idempotencyKey = "arbitrary retry key";

test("INS-007Y maps every parsed channel and intent to the existing request shape", () => {
    for (const channel of ["phone", "sms", "email"]) {
        for (const intent of ["instant-contact", "callback"]) {
            const request = parsedRequest(channel, intent);
            const context = trustedContext();
            const result = prepare(request, context, attemptId, idempotencyKey);
            assert.deepEqual(result, { context, attemptId, idempotencyKey, channel, intent });
            assert.equal(result.context, context);
            assert.equal(Object.hasOwn(result, "triggerEventId"), false);
        }
    }
});

test("INS-007Y rejects relationship mismatch and noncanonical trusted context IDs", () => {
    const request = parsedRequest();
    const context = trustedContext();
    assert.throws(() => prepare(request, {
        ...context, relationshipId: "relationship:other" as typeof context.relationshipId
    }, attemptId, idempotencyKey), /does not match/);
    for (const relationshipId of [" relationship:ins-007y", "relationship:ins-007y ", "\trelationship:ins-007y\n"]) {
        assert.throws(() => prepare(request, {
            ...context, relationshipId: relationshipId as typeof context.relationshipId
        }, attemptId, idempotencyKey), /canonical relationship identity/);
    }
    const paddedRequest = { ...request, relationshipId: " relationship:ins-007y " as typeof request.relationshipId };
    assert.equal(prepare(paddedRequest, context, attemptId, idempotencyKey).context, context);
    assert.equal(paddedRequest.relationshipId, " relationship:ins-007y ");
});

test("INS-007Y rejects invalid relationship identities on either input", () => {
    for (const value of [undefined, null, 123, {}, "", "   ", "other", "relationship:"]) {
        const request = parsedRequest();
        const context = trustedContext();
        // Deliberately violate the typed input contract to verify runtime validators.
        assert.throws(() => prepare({
            ...request, relationshipId: value as typeof request.relationshipId
        }, context, attemptId, idempotencyKey));
        assert.throws(() => prepare(request, {
            ...context, relationshipId: value as typeof context.relationshipId
        }, attemptId, idempotencyKey));
    }
});

test("INS-007Y rejects missing and invalid explicit attempt identities", () => {
    for (const value of [undefined, null, 123, {}, "", "   ", "wrong:attempt", "contact-attempt:", " contact-attempt: "]) {
        assert.throws(() => prepare(parsedRequest(), trustedContext(), value, idempotencyKey));
    }
});

test("INS-007Y rejects missing and invalid explicit idempotency identities", () => {
    for (const value of [undefined, null, 123, {}, "", "   "]) {
        assert.throws(() => prepare(parsedRequest(), trustedContext(), attemptId, value));
    }
});

test("INS-007Y reuses identity normalization without inventing idempotency prefix rules", () => {
    const result = prepare(parsedRequest(), trustedContext(), ` ${attemptId}\n`, `\t${idempotencyKey} `);
    assert.equal(result.attemptId, attemptId);
    assert.equal(result.idempotencyKey, idempotencyKey);
});

test("INS-007Y preserves consent, suppression, and all context evidence without mutation", () => {
    for (const status of ["granted", "denied"] as const) {
        for (const doNotContact of [false, true]) {
            for (const channelSuppressed of [false, true]) {
                const context: InsuranceGrowthIntegrationContext = {
                    ...trustedContext(), doNotContact,
                    contactChannels: [{ channel: "phone", status, doNotContact: channelSuppressed }]
                };
                Object.freeze(context.contactChannels[0]);
                Object.freeze(context.contactChannels);
                Object.freeze(context);
                const snapshot = structuredClone(context);
                const request = Object.freeze(parsedRequest());
                const result = prepare(request, context, attemptId, idempotencyKey);
                assert.equal(result.context, context);
                assert.equal(result.context.contactChannels, context.contactChannels);
                assert.deepEqual(context, snapshot);
                assert.deepEqual(result, prepare(request, context, attemptId, idempotencyKey));
            }
        }
    }
    const context = Object.freeze({ ...trustedContext(), contactChannels: Object.freeze([]), doNotContact: true });
    assert.equal(prepare(Object.freeze(parsedRequest()), context, attemptId, idempotencyKey).context, context);
    assert.deepEqual(context.contactChannels, []);
});

test("INS-007Y source isolates preparation from runtime and execution dependencies", async () => {
    const source = await readFile(new URL("./private-contact-orchestration-request-preparation.ts", import.meta.url), "utf8");
    const file = ts.createSourceFile("preparation.ts", source, ts.ScriptTarget.Latest, true);
    const runtimeImports = file.statements.filter(ts.isImportDeclaration)
        .filter(statement => !statement.importClause?.isTypeOnly)
        .map(statement => (statement.moduleSpecifier as ts.StringLiteral).text);
    assert.deepEqual(runtimeImports, ["../river-os/crm-actions", "./contact-attempt"]);
    const calls: string[] = [];
    function visit(node: ts.Node): void {
        if (ts.isCallExpression(node)) calls.push(node.expression.getText(file));
        ts.forEachChild(node, visit);
    }
    visit(file);
    assert.deepEqual(calls, [
        "requireRiverCrmRelationshipId", "requireRiverCrmRelationshipId",
        "createInsuranceContactAttemptId", "createInsuranceContactIdempotencyKey"
    ]);
    assert.doesNotMatch(source, /requestContact\s*\(|process\.env|import\.meta\.env|globalThis|cloudflare:|\bfetch\b|D1Database|Persistence|randomUUID|Math\.random|Date\s*[.(]/);
});
