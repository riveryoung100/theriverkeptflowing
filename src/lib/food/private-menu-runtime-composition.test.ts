import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createPrivateFoodMenuRuntimeComposition, type FoodPrivateMenuRuntimeCompositionInput } from "./private-menu-runtime-composition";
import { SingleAdminFoodMenuService } from "./private-menu-service";
import { parsePrincipalId } from "../identity/identifiers";
import { foodDraftIdentityOrderKey, type FoodD1Database, type FoodD1Result, type FoodD1Statement } from "./d1-draft-persistence";
import { serializeFoodDishPresentation, serializeFoodMenuPublication } from "./menu-persistence";
import { createFoodDishId } from "./dish-offer-domain";
import { createFoodMenuPublicationId } from "./menu-publication-domain";
import { createFoodProductId, createFoodRecipeId } from "./draft-domain";

const administrator = parsePrincipalId("principal:menu-composition-test");
const source = readFileSync(new URL("./private-menu-runtime-composition.ts", import.meta.url), "utf8");
const result = (rows: readonly unknown[] = [], changes = 0): FoodD1Result => ({ success: true, results: rows, meta: { changes } });
function fixture() {
    const recipe = { id: createFoodRecipeId("composition"), version: 1, evidence: [] };
    const product = { id: createFoodProductId("composition"), version: 1, recipe: { id: recipe.id, version: 1 }, evidence: [] };
    const presentation = { dishId: createFoodDishId("composition"), version: 1, product: { id: product.id, version: 1 }, recipe: { id: recipe.id, version: 1 }, name: "Test dish" };
    const state = { resolutions: 0, principal: administrator as string, denied: undefined as "unauthenticated" | "unavailable" | undefined, prepares: 0, batches: 0, reads: [] as { kind: string; id: unknown; version: unknown; receiver: unknown }[], queries: [] as { sql: string; values: (string | number | null)[] }[], response: result(), batchResponse: [] as readonly FoodD1Result[] };
    const database: FoodD1Database = {
        prepare(sql) {
            state.prepares++; let values: (string | number | null)[] = [];
            const statement: FoodD1Statement = { bind(...args) { values = args; state.queries.push({ sql, values }); return statement; }, async all() {
                if (sql.includes("memberships")) return result();
                if (sql.includes("AND version=?") && state.response.results.some(row => (row as { version: unknown }).version !== values[1])) return result();
                return state.response;
            } };
            return statement;
        },
        async batch() { state.batches++; return state.batchResponse; },
    };
    const input: FoodPrivateMenuRuntimeCompositionInput = {
        database,
        readDependencies: {
            async getProduct(id, version) { state.reads.push({ kind: "product", id, version, receiver: this }); return { outcome: "found", snapshot: product }; },
            async getRecipe(id, version) { state.reads.push({ kind: "recipe", id, version, receiver: this }); return { outcome: "found", snapshot: recipe }; },
        },
        callerResolver: { async resolve() { state.resolutions++; return state.denied ? { ok: false, error: { code: state.denied, message: "private" } } : { ok: true, value: { principalId: parsePrincipalId(state.principal) } }; } },
        administratorPrincipalId: administrator,
    };
    const encoded = serializeFoodDishPresentation(presentation, product, recipe); assert(encoded.ok);
    const row = { dish_id: presentation.dishId, version: 1, identity_order_key: foodDraftIdentityOrderKey(presentation.dishId), serialization_format_version: 1, payload_json: encoded.value, product_id: product.id, product_version: 1, recipe_id: recipe.id, recipe_version: 1 };
    return { input, state, presentation, row };
}

test("synchronous construction exposes only frozen capabilities and performs zero dependency I/O", () => {
    const f = fixture(); const a = createPrivateFoodMenuRuntimeComposition(f.input); const b = createPrivateFoodMenuRuntimeComposition(f.input);
    assert.deepEqual(Object.keys(a), ["service", "workspace"]); assert(a.service instanceof SingleAdminFoodMenuService);
    assert(Object.isFrozen(a)); assert(Object.isFrozen(a.workspace)); assert(!Object.isFrozen(a.service));
    assert.deepEqual(Object.keys(a.service), []); assert.equal("then" in a, false);
    assert.notEqual(a.service, b.service); assert.notEqual(a.workspace, b.workspace);
    for (const value of [f.input, f.input.database, f.input.readDependencies, f.input.callerResolver]) assert(!Object.isFrozen(value));
    assert.deepEqual([f.state.prepares, f.state.batches, f.state.reads.length, f.state.resolutions], [0, 0, 0, 0]);
});

test("constructor instrumentation proves one graph, exact references and property capture order", () => {
    const f = fixture(); const repositories: object[] = [], services: object[] = [], workspaces: object[] = [];
    const trace: string[] = []; const input = Object.fromEntries(Object.keys(f.input).map(key => [key, undefined]));
    for (const key of Object.keys(f.input)) Object.defineProperty(input, key, { get() { trace.push(key); return f.input[key as keyof typeof f.input]; } });
    Object.defineProperty(input, "unrelated", { get() { assert.fail("Unrelated input accessed"); } });
    class Repository { constructor(database: unknown, dependencies: unknown) { trace.push("repository"); assert.equal(database, f.input.database); assert.equal(dependencies, f.input.readDependencies); repositories.push(this); } }
    class Service { constructor(config: { repository: unknown; callerResolver: unknown; administratorPrincipalId: unknown }) { trace.push("service"); assert.equal(config.repository, repositories.at(-1)); assert.equal(config.callerResolver, f.input.callerResolver); assert.equal(config.administratorPrincipalId, administrator); services.push(this); } }
    const exports: Record<string, (input: unknown) => { service: object; workspace: object }> = {};
    runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
        exports, Object, require(name: string) {
            if (name === "./d1-menu-persistence") return { D1FoodMenuRepository: Repository };
            if (name === "./private-menu-service") return { SingleAdminFoodMenuService: Service };
            if (name === "./private-menu-workspace") return { createPrivateFoodMenuWorkspaceController(service: unknown) { trace.push("workspace"); assert.equal(service, services.at(-1)); const workspace = Object.freeze({}); workspaces.push(workspace); return workspace; } };
            assert.fail(`Unexpected runtime import: ${name}`);
        },
    });
    for (let i = 0; i < 2; i++) { const bundle = exports.createPrivateFoodMenuRuntimeComposition(input); assert.equal(bundle.service, services[i]); assert.equal(bundle.workspace, workspaces[i]); assert(Object.isFrozen(bundle)); }
    assert.equal(repositories.length, 2); assert.equal(services.length, 2); assert.equal(workspaces.length, 2); assert.notEqual(repositories[0], repositories[1]);
    assert.deepEqual(trace, Array(2).fill(["database", "readDependencies", "callerResolver", "administratorPrincipalId", "repository", "service", "workspace"]).flat());
});

test("invalid outer inputs and throwing property getters preserve fixed input failure", () => {
    const f = fixture();
    for (const bad of [undefined, null, [], 1, "input", () => {}, ...Object.keys(f.input).map(key => Object.defineProperty({ ...f.input }, key, { get() { throw new Error("private configuration"); } }))]) {
        assert.throws(() => createPrivateFoodMenuRuntimeComposition(bad as never), { name: "TypeError", message: "Private food menu runtime composition input is unavailable." });
    }
    assert.equal(f.state.prepares + f.state.batches + f.state.resolutions + f.state.reads.length, 0);
});

test("existing repository/service constructor failures remain sanitized without fallback or I/O", () => {
    const f = fixture();
    const repositoryFailures = [undefined, {}, { ...f.input, database: null }, { ...f.input, database: [] }, { ...f.input, database: { prepare: 1, batch() {} } }, { ...f.input, database: { prepare() {}, batch: null } }, { ...f.input, database: { get prepare() { throw new Error("private"); } } }, { ...f.input, readDependencies: null }, { ...f.input, readDependencies: [] }, ...["getProduct", "getRecipe"].map(key => ({ ...f.input, readDependencies: { ...f.input.readDependencies, [key]: 1 } })), { ...f.input, readDependencies: { get getRecipe() { throw new Error("private"); }, getProduct() {} } }];
    for (const bad of repositoryFailures.slice(1)) assert.throws(() => createPrivateFoodMenuRuntimeComposition(bad as never), { name: "TypeError", message: "Food menu repository dependencies are unavailable." });
    const serviceFailures = [null, [], {}, { resolve: 1 }, { get resolve() { throw new Error("private"); } }].map(callerResolver => ({ ...f.input, callerResolver }));
    serviceFailures.push(...[undefined, null, 1, "admin", " principal:admin", "principal:admin ", "principal:a:b"].map(administratorPrincipalId => ({ ...f.input, administratorPrincipalId })) as never[]);
    for (const bad of serviceFailures) assert.throws(() => createPrivateFoodMenuRuntimeComposition(bad as never), { name: "TypeError", message: "Private food menu service configuration is unavailable." });
    assert.equal(f.state.prepares + f.state.batches + f.state.resolutions + f.state.reads.length, 0);
});

test("service and workspace retain fresh authorization, denial and revocation without persistence calls", async () => {
    const f = fixture(); const { service, workspace } = createPrivateFoodMenuRuntimeComposition(f.input);
    const poison = new Proxy({}, { get() { assert.fail("Denied payload used"); }, ownKeys() { assert.fail("Denied payload inspected"); } });
    for (const denied of ["unauthenticated", "unavailable"] as const) { f.state.denied = denied; const r = await service.createInitialPresentation(poison as never); assert(!r.ok && r.error.code === (denied === "unavailable" ? "access-unavailable" : denied)); }
    f.state.denied = undefined; f.state.principal = "principal:other"; const denied = await workspace.listLatestOffers(); assert(!denied.ok && denied.error.code === "forbidden");
    assert.equal(f.state.prepares + f.state.batches + f.state.reads.length, 0); assert.equal(f.state.resolutions, 3);
    f.state.principal = administrator; assert.deepEqual(await workspace.getPresentation(f.presentation.dishId, 1), { ok: true, value: { outcome: "not-found", message: "No snapshot recorded." } });
    const calls = f.state.prepares; f.state.principal = "principal:revoked"; assert(!(await service.getPresentation(f.presentation.dishId, 1)).ok); assert.equal(f.state.prepares, calls); assert.equal(f.state.resolutions, 5);
});

test("authorized exact reads preserve FOOD-001 dependency receivers, versions, frozen results and listing cursors", async () => {
    const f = fixture(); const { service, workspace } = createPrivateFoodMenuRuntimeComposition(f.input); f.state.response = result([f.row]);
    const read = await workspace.getPresentation(f.presentation.dishId, 1); assert(read.ok && read.value.outcome === "found"); assert.deepEqual(read.value.snapshot, f.presentation); assert(Object.isFrozen(read.value.snapshot));
    for (const call of f.state.reads) { assert.equal(call.receiver, f.input.readDependencies); assert.equal(call.version, 1); assert.equal(call.id, call.kind === "product" ? f.presentation.product.id : f.presentation.recipe.id); }
    assert.deepEqual(f.state.queries[0].values, [f.presentation.dishId, 1]);
    f.state.response = result([]); const page = await service.listLatestPresentations({ limit: 7, afterId: f.presentation.dishId }); assert(page.ok && page.value.items.length === 0);
    assert.deepEqual(f.state.queries.at(-1)?.values, [foodDraftIdentityOrderKey(f.presentation.dishId), 8]);
});

test("publication mutation delegates canonical versions/predecessors and preserves created/retry/conflict feedback", async () => {
    const f = fixture(); const { workspace } = createPrivateFoodMenuRuntimeComposition(f.input);
    const snapshot = { publicationId: createFoodMenuPublicationId("composition"), version: 1, state: "published" as const, title: "Test", sections: [] };
    const encoded = serializeFoodMenuPublication(snapshot, [], []); assert(encoded.ok);
    const row = { publication_id: snapshot.publicationId, version: 1, identity_order_key: foodDraftIdentityOrderKey(snapshot.publicationId), serialization_format_version: 1, payload_json: encoded.value };
    f.state.batchResponse = [result([row], 1), result([row])]; const created = await workspace.createInitialPublication(snapshot); assert(created.ok && created.value.outcome === "created"); assert.equal(created.value.publicationLabel, "Publication snapshot: published");
    assert.equal(f.state.reads.length, 0); assert(f.state.queries.some(q => q.sql.includes("RETURNING *") && q.values.includes(encoded.value)));
    f.state.batchResponse = [result(), result([row])]; const retry = await workspace.createInitialPublication(snapshot); assert(retry.ok && retry.value.outcome === "already-present");
    const conflict = await workspace.createInitialPublication({ ...snapshot, title: "Different" }); assert.deepEqual(conflict, { ok: true, value: { outcome: "conflict", message: "A different version already exists. Refresh and reconcile before retrying." } });
    const before = f.state.batches; const invalid = await workspace.appendPublicationRevision({ ...snapshot, version: 3 }, 1); assert(!invalid.ok && invalid.error.code === "invalid-input"); assert.equal(f.state.batches, before);
    f.state.response = result([row]); f.state.batchResponse = []; const failed = await workspace.appendPublicationRevision({ ...snapshot, version: 2 }, 1); assert(!failed.ok && failed.error.code === "storage");
    assert(f.state.queries.some(q => q.sql.includes("RETURNING *") && q.values[1] === 2 && q.values.includes(1)));
    assert.equal(f.state.resolutions, 5);
});

test("workspace aggregate uses the exact service for both independently authorized calls", async () => {
    // Instrument persistence only; exercise the actual composition, service and workspace together.
    const f = fixture(); let reads = 0; let availability = 0;
    const methods = JSON.parse(readFileSync(new URL("../../../.river-dev/specifications/food-002e-single-admin-private-menu-management-service-boundary.json", import.meta.url), "utf8")).service.methods as string[];
    const offerId = "food-serving-offer:aggregate"; let missing = true; let secondFailure = false;
    class Repository {}
    for (const method of methods) Object.defineProperty(Repository.prototype, method, { value: async (...args: unknown[]) => {
        reads++; if (method === "getOffer") { assert.deepEqual(args, [offerId, 7]); return { ok: true, value: missing ? { outcome: "not-found" } : { outcome: "found", snapshot: { offerId, version: 7 } } }; }
        assert.equal(method, "getCurrentAvailability"); availability++; assert.deepEqual(args, [offerId, 7]); return secondFailure ? { ok: false, error: { code: "storage", message: "private SQL" } } : { ok: true, value: { outcome: "not-found" } };
    } });
    const exports: Record<string, typeof createPrivateFoodMenuRuntimeComposition> = {};
    const workspaceModule = await import("./private-menu-workspace");
    runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Object, require(name: string) {
        if (name === "./d1-menu-persistence") return { D1FoodMenuRepository: Repository };
        if (name === "./private-menu-service") return { SingleAdminFoodMenuService };
        if (name === "./private-menu-workspace") return workspaceModule;
        assert.fail(name);
    } });
    const { workspace } = exports.createPrivateFoodMenuRuntimeComposition(f.input);
    const first = await workspace.getOfferWorkspaceDetail(offerId as never, 7); assert(first.ok && first.value.outcome === "not-found"); assert.equal(availability, 0);
    missing = false; const second = await workspace.getOfferWorkspaceDetail(offerId as never, 7); assert(second.ok && second.value.outcome === "found" && second.value.availability.state === "not-recorded");
    secondFailure = true; const third = await workspace.getOfferWorkspaceDetail(offerId as never, 7); assert(!third.ok && third.error.code === "storage"); assert.equal("value" in third, false);
    assert.equal(f.state.resolutions, 5); assert.equal(reads, 5); assert.equal(f.state.prepares, 0);
});

test("source has only composition imports and no acquisition, activation or request behavior", () => {
    const runtimeImports = [...source.matchAll(/^import (?!type).*from "([^"]+)";/gm)].map(match => match[1]);
    assert.deepEqual(runtimeImports, ["./d1-menu-persistence", "./private-menu-service", "./private-menu-workspace"]);
    for (const banned of ["import.meta.env", "process.env", "cloudflare:workers", "wrangler", "RIVER_", "runAuthorized", "FormData", "fetch(", "Date.now", "Math.random", "private-draft-runtime-acquisition", "private-draft-server-adapter"]) assert.equal(source.includes(banned), false, banned);
});
