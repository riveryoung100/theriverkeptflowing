import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import { createFoodPublicMenuRuntimeFromEnvironment, handleFoodPublicMenuRequest } from "./public-menu-runtime";
import { createFoodMenuPublicationId } from "./menu-publication-domain";
import { serializeFoodMenuPublication, FOOD_MENU_SERIALIZATION_VERSION } from "./menu-persistence";
import { foodDraftIdentityOrderKey, type FoodD1Database } from "./d1-draft-persistence";

function fixture(state: "published" | "unpublished" = "published") {
    const publication = { publicationId: createFoodMenuPublicationId("synthetic-runtime"), version: 7, state, title: "Synthetic menu", sections: [] };
    const serialized = serializeFoodMenuPublication(publication, [], []); assert(serialized.ok);
    const row = { publication_id: publication.publicationId, version: 7, identity_order_key: foodDraftIdentityOrderKey(publication.publicationId), serialization_format_version: FOOD_MENU_SERIALIZATION_VERSION, payload_json: serialized.value };
    const queries: { sql: string; values: unknown[] }[] = [];
    const database: FoodD1Database = {
        prepare(sql) {
            assert.match(sql, /^SELECT /); assert.doesNotMatch(sql, /MAX\(|ORDER BY|INSERT|UPDATE|DELETE/);
            let values: unknown[] = [];
            return { bind(...args) { values = args; return this; }, async all() { queries.push({ sql, values }); return { success: true, results: sql.includes("FROM food_menu_publication_snapshots ") ? [row] : [] }; } };
        },
        async batch() { assert.fail("No write/batch capability may be used"); },
    };
    const environment: Record<string, unknown> = { RIVER_FOOD_DB: database, RIVER_FOOD_PUBLIC_MENU_PUBLICATION_ID: publication.publicationId, RIVER_FOOD_PUBLIC_MENU_PUBLICATION_VERSION: "7" };
    return { publication, row, environment, queries };
}
test("exact trusted configuration composes canonical D1/A/B graph with no construction IO or public capabilities", async () => {
    const f = fixture(); const runtime = createFoodPublicMenuRuntimeFromEnvironment(f.environment);
    assert.equal(f.queries.length, 0); assert.deepEqual(Object.keys(runtime), ["read"]); assert(Object.isFrozen(runtime));
    const result = await runtime.read({ method: "GET" });
    const { state: _state, ...menu } = f.publication; void _state;
    assert.equal(result.status, 200); assert.equal(result.body, JSON.stringify(menu));
    assert.equal(f.queries.length, 3);
    for (const query of f.queries) assert.deepEqual(query.values, [f.publication.publicationId, 7]);
    assert.doesNotMatch(result.body!, /repository|callback|database|service|selector|price|orderable|cost|nutrition/);
});
test("missing/malformed trusted config fails closed without database reads/defaults or configuration echo", async () => {
    const f = fixture();
    for (const key of ["RIVER_FOOD_PUBLIC_MENU_PUBLICATION_ID", "RIVER_FOOD_PUBLIC_MENU_PUBLICATION_VERSION"]) {
        const bad = key.endsWith("_ID") ? [undefined, null, "", "wrong", " food-menu-publication:synthetic"] : [undefined, null, "", "0", "01", "-1", "1.0", "1e1", " 7", "7\n", "latest", "9007199254740992", 7];
        for (const value of bad) {
            const result = await createFoodPublicMenuRuntimeFromEnvironment({ ...f.environment, [key]: value }).read({ method: "GET" });
            assert.equal(result.status, 503); assert.equal(result.body, '{"error":"menu-unavailable"}');
        }
    }
    assert.equal(f.queries.length, 0);
});
test("composition snapshots selection and isolates requests; stored missing/unpublished stays identical 404", async () => {
    const f = fixture(); const runtime = createFoodPublicMenuRuntimeFromEnvironment(f.environment);
    f.environment.RIVER_FOOD_PUBLIC_MENU_PUBLICATION_VERSION = "8";
    assert.equal((await runtime.read({ method: "GET" })).status, 200);
    assert.equal(f.queries[0].values[1], 7);
    assert.equal((await createFoodPublicMenuRuntimeFromEnvironment(f.environment).read({ method: "GET" })).status, 503);
    const unpublished = await createFoodPublicMenuRuntimeFromEnvironment(fixture("unpublished").environment).read({ method: "GET" });
    const missing = fixture(); missing.environment.RIVER_FOOD_DB = { prepare() { return { bind() { return this; }, async all() { return { success: true, results: [] }; } }; }, async batch() { assert.fail(); } };
    assert.deepEqual(await createFoodPublicMenuRuntimeFromEnvironment(missing.environment).read({ method: "GET" }), unpublished);
    assert.equal(unpublished.status, 404);
});
test("native adapter preserves GET/HEAD/B headers and rejects unsupported method before environment acquisition", async () => {
    const f = fixture(); const get = await handleFoodPublicMenuRequest("GET", () => f.environment);
    assert.equal(get.status, 200); assert.equal(get.headers.get("content-type"), "application/json; charset=utf-8");
    const head = await handleFoodPublicMenuRequest("HEAD", () => f.environment);
    assert.equal(head.status, get.status); assert.deepEqual([...head.headers], [...get.headers]); assert.equal(await head.text(), "");
    const response = await handleFoodPublicMenuRequest("POST", () => assert.fail("Must not acquire"));
    assert.equal(response.status, 405); assert.equal(response.headers.get("allow"), "GET, HEAD"); assert.equal(await response.text(), '{"error":"method-not-allowed"}');
});
test("runtime/environment errors are fixed 503 including HEAD; no internal diagnostics", async () => {
    for (const acquire of [() => null, () => ({}), () => { throw new Error("synthetic binding SQL private path"); }, () => ({ ...fixture().environment, RIVER_FOOD_DB: {} }), () => ({ ...fixture().environment, RIVER_FOOD_DB: { prepare() { throw new Error("private SQL"); }, batch() { assert.fail(); } } })]) {
        const get = await handleFoodPublicMenuRequest("GET", acquire); assert.equal(get.status, 503); assert.equal(await get.text(), '{"error":"menu-unavailable"}');
        const head = await handleFoodPublicMenuRequest("HEAD", acquire); assert.equal(head.status, 503); assert.equal(await head.text(), "");
    }
});
test("actual thin Astro route ignores all caller selection channels and delegates native response unchanged", async () => {
    const source = await readFile(new URL("../../pages/api/food/menu.ts", import.meta.url), "utf8");
    const f = fixture(); const exports: Record<string, unknown> = {};
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require(name: string) { if (name === "cloudflare:workers") return { env: f.environment }; if (name.endsWith("/public-menu-runtime")) return { handleFoodPublicMenuRequest }; throw new Error("Unexpected import"); } });
    assert.equal(exports.prerender, false);
    const route = exports.ALL as (context: unknown) => Promise<Response>;
    const request = { method: "GET" };
    for (const key of ["url", "headers", "cookies", "body", "json", "formData"]) Object.defineProperty(request, key, { get() { assert.fail("Caller channel accessed"); } });
    const response = await route({ request, get params() { return assert.fail("Route params accessed"); }, get locals() { return assert.fail("Session accessed"); } });
    assert.equal(response.status, 200); assert.equal((await response.json() as { version: number }).version, 7);
    assert.doesNotMatch(source, /projectFoodPublicMenu|Repository|request\.(url|headers|body)|JSON\.|status:|price|orderable/);
    const runtimeSource = await readFile(new URL("./public-menu-runtime.ts", import.meta.url), "utf8");
    assert.doesNotMatch(runtimeSource, /SELECT |INSERT |UPDATE |DELETE |getLatest|getCurrent|process\.env|fetch\(|console\.|SingleAdmin|OperationGate|Workspace/);
});
