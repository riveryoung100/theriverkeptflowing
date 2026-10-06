import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { runInNewContext } from "node:vm";
import { acquirePrivateFoodMenuDatabaseFromEnvironment as acquire } from "./private-menu-runtime-acquisition";
import { createPrivateFoodMenuRuntimeComposition } from "./private-menu-runtime-composition";
import { parsePrincipalId } from "../identity/identifiers";
import type { FoodD1Database } from "./d1-draft-persistence";

const failure = { ok: false, error: { code: "configuration-unavailable", message: "Food menu database configuration is unavailable." } };
const source = readFileSync(new URL("./private-menu-runtime-acquisition.ts", import.meta.url), "utf8");
function inert(): FoodD1Database { return { prepare() { assert.fail("Database prepare invoked"); }, batch() { assert.fail("Database batch invoked"); } }; }

test("exact selected capability is acquired synchronously without I/O or unrelated exposure", () => {
    const database = inert(); const environment = { TEST_SELECTED: database, TEST_OTHER: inert(), get callerResolver() { return assert.fail("Auth acquired"); }, get readDependencies() { return assert.fail("FOOD-001 acquired"); }, get session() { return assert.fail("Session acquired"); } };
    const r = acquire({ environment, bindingName: "TEST_SELECTED" }); assert(r.ok); assert.equal(r.value, database);
    assert.deepEqual(Object.keys(r), ["ok", "value"]); assert(Object.isFrozen(r)); assert.equal("then" in r, false);
    assert(!Object.isFrozen(database)); assert(!Object.isFrozen(environment)); assert.equal(environment.TEST_SELECTED, database);
    assert.throws(() => Object.assign(r, { environment }), TypeError);
});

test("property capture and method inspection order are exact with one selected-key read", () => {
    const trace: string[] = []; const database = new Proxy(inert(), { get(target, key, receiver) { trace.push(String(key)); return Reflect.get(target, key, receiver); }, ownKeys() { assert.fail("Database enumerated"); } });
    const environment = new Proxy({ TEST_SELECTED: database }, { get(target, key, receiver) { trace.push(String(key)); assert.equal(key, "TEST_SELECTED"); return Reflect.get(target, key, receiver); }, ownKeys() { assert.fail("Environment enumerated"); } });
    const input = { get environment() { trace.push("environment"); return environment; }, get bindingName() { trace.push("bindingName"); return "TEST_SELECTED"; }, get unrelated() { return assert.fail("Unrelated input accessed"); } };
    const r = acquire(input); assert(r.ok && r.value === database); assert.deepEqual(trace, ["environment", "bindingName", "TEST_SELECTED", "prepare", "batch"]);
});

test("all missing/malformed shapes and noncallable methods use identical frozen failure", () => {
    const malformed = [undefined, null, [], "text", 1, false, () => {}];
    const inputs: unknown[] = [...malformed, {}, ...malformed.map(environment => ({ environment, bindingName: "TEST_SELECTED" })), ...malformed.map(database => ({ environment: { TEST_SELECTED: database }, bindingName: "TEST_SELECTED" }))];
    for (const method of ["prepare", "batch"]) for (const value of [undefined, null, 1, "method", {}, []]) inputs.push({ environment: { TEST_SELECTED: { ...inert(), [method]: value } }, bindingName: "TEST_SELECTED" });
    inputs.push({ environment: {}, bindingName: "TEST_SELECTED" });
    for (const input of inputs) { const r = acquire(input as never); assert.deepEqual(r, failure); assert(Object.isFrozen(r)); assert(!r.ok && Object.isFrozen(r.error)); assert.deepEqual(Object.keys(r), ["ok", "error"]); }
});

test("canonical key syntax rejects normalization and invalid keys before any environment access", () => {
    const environment = new Proxy({}, { get() { assert.fail("Invalid-key selection attempted"); } });
    for (const bindingName of [undefined, null, 1, {}, "", " TEST_SELECTED", "TEST_SELECTED ", "test_selected", "1TEST", "TEST-KEY", "TEST.KEY", "TEST_SELECTED\n", "TEST_SELECTED\r\n", "TEST_SELECTED\u2028", "__proto__"]) assert.deepEqual(acquire({ environment, bindingName } as never), failure);
    for (const bindingName of ["A", "TEST_0", "TEST_SELECTED"]) { const db = inert(); const r = acquire({ environment: { [bindingName]: db }, bindingName }); assert(r.ok && r.value === db); }
});

test("throwing outer/environment/method access and proxies fail without leaking internals", () => {
    const boom = () => { throw new Error("private key secret SQL stack evidence"); };
    const good = { environment: { TEST_SELECTED: inert() }, bindingName: "TEST_SELECTED" };
    const inputs: unknown[] = [new Proxy({}, { get: boom }), ...["environment", "bindingName"].map(key => Object.defineProperty({ ...good }, key, { get: boom })), { ...good, environment: new Proxy({}, { get: boom }) }, { ...good, environment: Object.defineProperty({}, "TEST_SELECTED", { get: boom }) }];
    for (const method of ["prepare", "batch"]) inputs.push({ ...good, environment: { TEST_SELECTED: Object.defineProperty(inert(), method, { get: boom }) } });
    for (const input of inputs) assert.deepEqual(acquire(input as never), failure);
});

test("no alternate selection, caching or proxying; independent environments preserve receiver identity", () => {
    const first = inert(); const second = inert(); const environment = { TEST_SELECTED: first, TEST_OTHER: second };
    assert.deepEqual(acquire({ environment, bindingName: "TEST_MISSING" }), failure);
    for (let i = 0; i < 2; i++) { const r = acquire({ environment, bindingName: "TEST_SELECTED" }); assert(r.ok && r.value === first); }
    environment.TEST_SELECTED = second; const changed = acquire({ environment, bindingName: "TEST_SELECTED" }); assert(changed.ok && changed.value === second);
    const independent = acquire({ environment: { TEST_SELECTED: first }, bindingName: "TEST_SELECTED" }); assert(independent.ok && independent.value === first);
    // This inert method is invoked only by the test after acquisition, to verify receiver preservation.
    let receiver: unknown; const db: FoodD1Database = { prepare() { receiver = this; return { bind() { return this; }, async all() { return { success: true, results: [] }; } }; }, batch() { assert.fail("Unexpected batch"); } };
    const r = acquire({ environment: { TEST_SELECTED: db }, bindingName: "TEST_SELECTED" }); assert(r.ok); assert.equal(receiver, undefined); r.value.prepare("synthetic inert test"); assert.equal(receiver, db);
});

test("acquired capability can be manually supplied to H without acquisition composing or authorizing", async () => {
    const database = inert(); const acquired = acquire({ environment: { TEST_SELECTED: database }, bindingName: "TEST_SELECTED" }); assert(acquired.ok);
    let resolutions = 0;
    const bundle = createPrivateFoodMenuRuntimeComposition({ database: acquired.value, readDependencies: { getProduct() { assert.fail("FOOD-001 read"); }, getRecipe() { assert.fail("FOOD-001 read"); } }, callerResolver: { async resolve() { resolutions++; return { ok: false, error: { code: "unauthenticated", message: "Authentication is required." } }; } }, administratorPrincipalId: parsePrincipalId("principal:synthetic-acquisition-test") });
    assert.equal(resolutions, 0); const denied = await bundle.workspace.listLatestOffers(); assert(!denied.ok && denied.error.code === "unauthenticated"); assert.equal(resolutions, 1);
});

test("isolated module has no runtime imports or global acquisition/composition path", () => {
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports: Record<string, typeof acquire> = {};
    runInNewContext(compiled, { exports, require() { assert.fail("Runtime dependency imported"); }, get process() { return assert.fail("Process accessed"); }, get globalThis() { return assert.fail("Global accessed"); } });
    const db = inert(); const r = exports.acquirePrivateFoodMenuDatabaseFromEnvironment({ environment: { TEST_SELECTED: db }, bindingName: "TEST_SELECTED" }); assert(r.ok && r.value === db);
    assert.deepEqual([...source.matchAll(/^import.*from "([^"]+)";/gm)].map(m => m[1]), ["./d1-draft-persistence"]);
    for (const banned of ["process.env", "import.meta", "globalThis", "cloudflare:", "wrangler", "RIVER_", "createPrivateFood", "SessionPrincipal", "FormData", "fetch(", "Date.now", "Math.random"]) assert.equal(source.includes(banned), false, banned);
});
