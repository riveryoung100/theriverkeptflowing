import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { acquireInsurancePrivateContactTrustedContext as acquire } from "./private-contact-trusted-context-acquisition";
import { createInsuranceGrowthIntegrationContext } from "./integration-boundary";
import { buildInsurancePrivateContactRequestFromForm } from "./private-contact-request";
import type { InsurancePrivateContactRequest } from "./private-contact-request";
import type { InsuranceLeadPresentation } from "./lead-presentation";
import type { D1InsuranceLeadPresentationPersistence } from "./d1-lead-presentation";
import { RIVER_CRM_CONSENT_STATUSES, RIVER_CRM_CONTACT_CHANNELS } from "../river-os/crm-growth-contracts";
import { INSURANCE_PRODUCT_INTERESTS, INSURANCE_QUOTE_STATUSES } from "./lead-profile";

function request(): InsurancePrivateContactRequest {
    const form = new FormData();
    form.set("relationshipId", "relationship:ins-007z");
    form.set("channel", "phone");
    form.set("intent", "callback");
    return buildInsurancePrivateContactRequestFromForm(form);
}

function presentation(): InsuranceLeadPresentation {
    return {
        relationshipId: request().relationshipId, productInterest: "auto", quoteStatus: "requested",
        state: "TX", postalCode: "79720", acquisitionSource: "referral", campaign: "test",
        consentChannels: [{ channel: "phone", status: "granted", doNotContact: false }],
        doNotContact: false, recentEvents: []
    };
}

function reader(results: unknown): D1InsuranceLeadPresentationPersistence {
    return { listForRelationships: async () => results as readonly InsuranceLeadPresentation[] };
}

test("INS-007Z reads only the validated relationship once and maps valid evidence", async () => {
    const input = { ...request(), relationshipId: " relationship:ins-007z " as InsurancePrivateContactRequest["relationshipId"] };
    const evidence = presentation();
    let reads = 0;
    const result = await acquire(input, { listForRelationships: async ids => {
        reads += 1;
        assert.deepEqual(ids, ["relationship:ins-007z"]);
        return [evidence];
    } });
    assert.equal(reads, 1);
    assert.deepEqual(result, createInsuranceGrowthIntegrationContext(evidence));
});

test("INS-007Z rejects absent, ambiguous, malformed, or mismatched results", async () => {
    for (const results of [undefined, null, {}, [], [presentation(), presentation()],
        [presentation(), { ...presentation(), relationshipId: "relationship:other" }],
        [null], [[]], [123], [{ ...presentation(), relationshipId: "relationship:other" }]]) {
        await assert.rejects(acquire(request(), reader(results)));
    }
});

test("INS-007Z rejects invalid request identity before reading and invalid presentation identities", async () => {
    for (const value of [undefined, null, 123, "", " ", "other", "relationship:"]) {
        let reads = 0;
        await assert.rejects(acquire({ ...request(), relationshipId: value as InsurancePrivateContactRequest["relationshipId"] }, {
            listForRelationships: async () => { reads += 1; return [presentation()]; }
        }));
        assert.equal(reads, 0);
        await assert.rejects(acquire(request(), reader([{ ...presentation(), relationshipId: value }])));
    }
    for (const value of [" relationship:ins-007z", "relationship:ins-007z ", "\trelationship:ins-007z\n"]) {
        await assert.rejects(acquire(request(), reader([{ ...presentation(), relationshipId: value }])));
    }
});

test("INS-007Z rejects malformed and normalization-changing consumed fields", async () => {
    const invalid: Record<string, unknown[]> = {
        productInterest: [undefined, null, 1, "", " AUTO ", "auto ", "unsupported"],
        quoteStatus: [undefined, null, 1, "", "requested ", "unsupported"],
        state: [undefined, null, 1, "", "tx", " TX", "TX ", "XX"],
        postalCode: [undefined, null, 79720, "", "1234", "79720 ", "79720-123"],
        acquisitionSource: [null, 1, "", " ", " referral"],
        campaign: [null, 1, "", " ", "test "],
        doNotContact: [undefined, null, 0, "false"],
        consentChannels: [undefined, null, {}, [null], [[]]]
    };
    for (const [field, values] of Object.entries(invalid)) {
        for (const value of values) await assert.rejects(acquire(request(), reader([{ ...presentation(), [field]: value }])), `${field}: ${String(value)}`);
    }
    for (const [field, values] of Object.entries({
        channel: [undefined, null, 1, "", " phone", "PHONE", "other"],
        status: [undefined, null, 1, "", "granted ", "GRANTED", "other"],
        doNotContact: [undefined, null, 0, "false"]
    })) {
        for (const value of values) await assert.rejects(acquire(request(), reader([{
            ...presentation(), consentChannels: [{ channel: "phone", status: "granted", doNotContact: false, [field]: value }]
        }])), `consent ${field}: ${String(value)}`);
    }
});

test("INS-007Z propagates the original reader failure without retry", async () => {
    const failure = new Error("reader unavailable");
    let reads = 0;
    await assert.rejects(acquire(request(), { listForRelationships: async () => {
        reads += 1; throw failure;
    } }), error => error === failure);
    assert.equal(reads, 1);
});

test("INS-007Z preserves all consent statuses, order, and supplied suppression without recomputing", async () => {
    for (const status of RIVER_CRM_CONSENT_STATUSES) {
        for (const relationshipSuppressed of [false, true]) {
            for (const channelSuppressed of [false, true]) {
                const evidence: InsuranceLeadPresentation = {
                    ...presentation(), doNotContact: relationshipSuppressed,
                    consentChannels: RIVER_CRM_CONTACT_CHANNELS.map(channel => ({ channel, status, doNotContact: channelSuppressed }))
                };
                assert.deepEqual(await acquire(request(), reader([evidence])), createInsuranceGrowthIntegrationContext(evidence));
            }
        }
    }
    const evidence = { ...presentation(), consentChannels: [], doNotContact: true, acquisitionSource: undefined, campaign: undefined };
    assert.deepEqual(await acquire(request(), reader([evidence])), createInsuranceGrowthIntegrationContext(evidence));
});

test("INS-007Z accepts canonical domain values and validates no ignored presentation fields", async () => {
    for (const productInterest of INSURANCE_PRODUCT_INTERESTS) {
        for (const quoteStatus of INSURANCE_QUOTE_STATUSES) {
            const evidence = { ...presentation(), productInterest, quoteStatus, state: "DC", postalCode: "20001-1234" };
            assert.deepEqual(await acquire(request(), reader([evidence])), createInsuranceGrowthIntegrationContext(evidence));
        }
    }
    const evidence = presentation();
    for (const field of ["recentEvents", "assignedProducer", "sourceVendor"]) {
        Object.defineProperty(evidence, field, { get: () => { throw new Error(`Ignored field accessed: ${field}`); } });
    }
    assert.deepEqual(await acquire(request(), reader([evidence])), createInsuranceGrowthIntegrationContext(evidence));
});

test("INS-007Z leaves frozen inputs and evidence unchanged", async () => {
    const evidence = presentation();
    Object.freeze(evidence.consentChannels[0]);
    Object.freeze(evidence.consentChannels);
    Object.freeze(evidence.recentEvents);
    Object.freeze(evidence);
    const snapshot = structuredClone(evidence);
    const results = Object.freeze([evidence]);
    await acquire(Object.freeze(request()), reader(results));
    assert.deepEqual(evidence, snapshot);
    assert.equal(results[0], evidence);
});

test("INS-007Z source isolates reads and mapping from writes and execution", async () => {
    const source = await readFile(new URL("./private-contact-trusted-context-acquisition.ts", import.meta.url), "utf8");
    const file = ts.createSourceFile("acquisition.ts", source, ts.ScriptTarget.Latest, true);
    const imports = file.statements.filter(ts.isImportDeclaration).filter(node => !node.importClause?.isTypeOnly)
        .map(node => (node.moduleSpecifier as ts.StringLiteral).text);
    assert.deepEqual(imports, ["../river-os/crm-actions", "../river-os/crm-growth-contracts", "./integration-boundary", "./lead-profile"]);
    const calls = new Set<string>();
    function visit(node: ts.Node): void {
        if (ts.isCallExpression(node)) calls.add(node.expression.getText(file));
        ts.forEachChild(node, visit);
    }
    visit(file);
    assert.deepEqual([...calls].sort(), [
        "Array.isArray", "allowed.includes", "booleanEvidence", "canonicalText", "createInsuranceGrowthIntegrationContext",
        "enumEvidence", "reader.listForRelationships", "record", "requireRiverCrmRelationshipId", "stateCodes.has", "/^\\d{5}(?:-\\d{4})?$/.test", "value.trim"
    ].sort());
    assert.doesNotMatch(source, /requestContact\s*\(|process\.env|import\.meta\.env|globalThis|cloudflare:|\bfetch\b|\bSQL\b|randomUUID|Math\.random|Date\s*[.(]|createInsuranceContactAttemptId|createInsuranceContactIdempotencyKey/);
});
