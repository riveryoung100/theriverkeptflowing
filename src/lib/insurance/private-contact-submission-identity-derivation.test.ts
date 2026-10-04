import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

import { deriveInsurancePrivateContactSubmissionIdentities as derive } from "./private-contact-submission-identity-derivation";
import { createInsuranceContactAttemptId, createInsuranceContactIdempotencyKey } from "./contact-attempt";
import type { InsuranceContactAttemptId, InsuranceContactIdempotencyKey } from "./contact-attempt";

test("INS-008A preserves opaque token content and returns compatible branded identities", () => {
    for (const token of ["submission-1", "internal whitespace", "a\tb\nc", "河🌊é", "e\u0301", "!@#$%^&*():/._-", "x".repeat(10000)]) {
        const result = derive(token);
        const attemptId: InsuranceContactAttemptId = result.attemptId;
        const idempotencyKey: InsuranceContactIdempotencyKey = result.idempotencyKey;
        assert.deepEqual(result, {
            attemptId: `contact-attempt:${token}`,
            idempotencyKey: `private-contact:${token}`
        });
        assert.equal(createInsuranceContactAttemptId(attemptId), attemptId);
        assert.equal(createInsuranceContactIdempotencyKey(idempotencyKey), idempotencyKey);
    }
});

test("INS-008A deterministically distinguishes tokens without case or Unicode normalization", () => {
    const tokens = ["one", "two", "ONE", "é", "e\u0301", "a b", "a  b"];
    const results = tokens.map(token => derive(token));
    assert.equal(new Set(results.map(result => result.attemptId)).size, tokens.length);
    assert.equal(new Set(results.map(result => result.idempotencyKey)).size, tokens.length);
    for (let index = 0; index < tokens.length; index += 1) {
        assert.deepEqual(derive(tokens[index]), results[index]);
    }
});

test("INS-008A rejects missing and malformed token evidence", () => {
    const values = [undefined, null, 123, true, false, {}, [], Object("token"), "", " ", "\t\n", "\u00a0"];
    for (const value of values) {
        assert.throws(() => derive(value), TypeError);
    }
    // Exercise an omitted JavaScript argument without weakening the production signature.
    assert.throws(() => Reflect.apply(derive, undefined, []), TypeError);
});

test("INS-008A rejects normalization-changing tokens rather than repairing them", () => {
    for (const token of [" token", "token ", "\ttoken", "token\n", "\u00a0token", "token\uFEFF"]) {
        assert.throws(() => derive(token), TypeError);
    }
});

test("INS-008A safely derives from a frozen holder without mutation or retained state", () => {
    const holder = Object.freeze({ token: "frozen-token" });
    const first = derive(holder.token);
    Object.freeze(first);
    assert.deepEqual(derive(holder.token), first);
    assert.deepEqual(holder, { token: "frozen-token" });
    assert.throws(() => derive(holder), TypeError);
});

test("INS-008A source permits only canonical validation and existing identity derivation", async () => {
    const source = await readFile(new URL("./private-contact-submission-identity-derivation.ts", import.meta.url), "utf8");
    const file = ts.createSourceFile("derivation.ts", source, ts.ScriptTarget.Latest, true);
    const imports = file.statements.filter(ts.isImportDeclaration);
    assert.equal(imports.length, 2);
    for (const node of imports) assert.equal((node.moduleSpecifier as ts.StringLiteral).text, "./contact-attempt");
    const bindings = imports.map(node => {
        assert.ok(node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings));
        return node.importClause.namedBindings.elements.map(element => element.name.text);
    });
    assert.deepEqual(bindings, [
        ["createInsuranceContactAttemptId", "createInsuranceContactIdempotencyKey"],
        ["InsuranceContactAttemptId", "InsuranceContactIdempotencyKey"]
    ]);
    assert.equal(imports[0].importClause?.isTypeOnly, false);
    assert.equal(imports[1].importClause?.isTypeOnly, true);
    const calls: string[] = [];
    function visit(node: ts.Node): void {
        if (ts.isCallExpression(node)) calls.push(node.expression.getText(file));
        ts.forEachChild(node, visit);
    }
    visit(file);
    assert.deepEqual(calls, ["submissionToken.trim", "createInsuranceContactAttemptId", "createInsuranceContactIdempotencyKey"]);
    assert.equal(file.statements.filter(ts.isVariableStatement).length, 0);
    assert.doesNotMatch(source, /requestContact\s*\(|process\.env|import\.meta\.env|globalThis|cloudflare:|\bfetch\b|Persistence|randomUUID|Math\.random|Date\s*[.(]|\brelationshipId\b|\bchannel\b|\bintent\b/);
});
