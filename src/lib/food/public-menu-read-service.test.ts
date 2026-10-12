import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createFoodPublicMenuReadService, type FoodPublicMenuReadServiceDependencies } from "./public-menu-read-service";
import { projectFoodPublicMenu } from "./menu-publication-domain";

function fixture(count = 1) {
    const recipe = { id: "food-recipe:synthetic-private", version: 3, evidence: [{ requirement: "allergen-review", sourceReference: "fixture:private-evidence", subject: { type: "recipe", id: "food-recipe:synthetic-private", version: 3 }, reviewDate: "2026-10-12", reviewer: "fixture:private-reviewer" }], allergenReview: { state: "reviewed", declarations: [] } };
    const product = { id: "food-product:synthetic-private", version: 2, recipe: { id: recipe.id, version: 3 }, evidence: [] };
    const presentations = Array.from({ length: count }, (_, i) => ({ dishId: `food-dish:synthetic-${i}`, version: 4, product: { id: product.id, version: 2 }, recipe: { id: recipe.id, version: 3 }, name: `Synthetic dish ${i}`, longDescription: "Withheld synthetic private text" }));
    const offers = presentations.map((p, i) => ({ offerId: `food-serving-offer:synthetic-${i}`, version: 5, presentation: { dishId: p.dishId, version: p.version }, format: { kind: "individual" }, servingEstimate: { state: "unknown" } }));
    const publication = { publicationId: "food-menu-publication:synthetic", version: 7, state: "published", title: "Synthetic menu", sections: [{ key: "test", title: "Synthetic section", entries: presentations.map((p, i) => ({ presentation: { dishId: p.dishId, version: 4 }, selection: { shortDescription: false, longDescription: false, mediaReferences: [] }, offers: [{ offer: { offerId: offers[i].offerId, version: 5 }, intent: "informational", selection: { packagingDescription: false, storageSummary: false, reheatingSummary: false, availability: true } }] })) }] };
    return { recipe, product, presentations, offers, publication };
}
const ref = () => ({ publicationId: "food-menu-publication:synthetic", version: 7 });
type Reader = (...args: unknown[]) => Promise<unknown>;
function setup(f = fixture(), overrides: Record<string, Reader> = {}) {
    const calls: unknown[][] = [];
    const found = (snapshot: unknown) => ({ outcome: "found", snapshot });
    const defaults: Record<string, Reader> = {
        getPublication: async () => ({ ok: true, value: found(f.publication) }),
        getPresentation: async id => ({ ok: true, value: f.presentations.some(p => p.dishId === id) ? found(f.presentations.find(p => p.dishId === id)) : { outcome: "not-found" } }),
        getOffer: async id => ({ ok: true, value: f.offers.some(o => o.offerId === id) ? found(f.offers.find(o => o.offerId === id)) : { outcome: "not-found" } }),
        getProduct: async () => found(f.product), getRecipe: async () => found(f.recipe),
    };
    const wrap = (name: string): Reader => async (...args) => { calls.push([name, ...args]); return (overrides[name] ?? defaults[name])(...args); };
    const dependencies = { repository: { getPublication: wrap("getPublication"), getPresentation: wrap("getPresentation"), getOffer: wrap("getOffer") }, readDependencies: { getProduct: wrap("getProduct"), getRecipe: wrap("getRecipe") } };
    return { service: createFoodPublicMenuReadService(dependencies as unknown as FoodPublicMenuReadServiceDependencies), calls, f, dependencies };
}
test("found result is solely the existing canonical public projection, without private capabilities", async () => {
    const { service, f, calls } = setup(); const result = await service.readPublicMenu(ref());
    const expected = projectFoodPublicMenu(f.publication, f.presentations.map(presentation => ({ presentation, product: f.product, recipe: f.recipe })), f.offers, []);
    assert(expected.ok && expected.value.state === "published"); assert.deepEqual(result, { status: "found", menu: expected.value.menu });
    assert.deepEqual(calls, [["getPublication", ref().publicationId, 7], ["getPresentation", f.presentations[0].dishId, 4], ["getProduct", f.product.id, 2], ["getRecipe", f.recipe.id, 3], ["getOffer", f.offers[0].offerId, 5]]);
    assert.doesNotMatch(JSON.stringify(result), /private-evidence|private-reviewer|Withheld|food-recipe|food-product|price|orderable|nutrition|cost|repository|callback/);
    assert.deepEqual(Object.keys(service), ["readPublicMenu"]);
});
test("invalid caller references cause no reads; missing and unpublished stop at publication", async () => {
    const s = setup(); for (const r of [null, {}, { ...ref(), version: "latest" }, { ...ref(), version: 0 }, { ...ref(), publicationId: "wrong" }, { ...ref(), extra: true }]) assert.deepEqual(await s.service.readPublicMenu(r), { status: "invalid-input" });
    assert.equal(s.calls.length, 0);
    const missing = setup(undefined, { getPublication: async () => ({ ok: true, value: { outcome: "not-found" } }) }); assert.deepEqual(await missing.service.readPublicMenu(ref()), { status: "not-found" }); assert.equal(missing.calls.length, 1);
    const f = fixture(); f.publication.state = "unpublished"; const unpublished = setup(f); assert.deepEqual(await unpublished.service.readPublicMenu(ref()), { status: "not-published" }); assert.equal(unpublished.calls.length, 1);
});
test("missing or wrong exact menu/draft dependencies fail whole read, never fall back", async () => {
    const f = fixture();
    const failures: Record<string, unknown[]> = {
        getPublication: [{ ...f.publication, version: 8 }],
        getPresentation: [undefined, { ...f.presentations[0], version: 5 }],
        getOffer: [undefined, { ...f.offers[0], version: 6 }, { ...f.offers[0], presentation: { dishId: "food-dish:other", version: 4 } }],
        getProduct: [undefined, { ...f.product, version: 3 }, { ...f.product, recipe: { id: f.recipe.id, version: 4 } }],
        getRecipe: [undefined, { ...f.recipe, version: 4 }],
    };
    for (const [name, snapshots] of Object.entries(failures)) for (const snapshot of snapshots) {
        const value = snapshot === undefined ? { outcome: "not-found" } : { outcome: "found", snapshot };
        const s = setup(f, { [name]: async () => name === "getProduct" || name === "getRecipe" ? value : { ok: true, value } });
        assert.deepEqual(await s.service.readPublicMenu(ref()), { status: "unavailable" });
    }
});
test("storage exceptions and malformed envelopes expose only unavailable", async () => {
    for (const name of ["getPublication", "getPresentation", "getOffer", "getProduct", "getRecipe"]) {
        const s = setup(undefined, { [name]: async () => { throw new Error("synthetic SQL private secret"); } });
        assert.deepEqual(await s.service.readPublicMenu(ref()), { status: "unavailable" });
    }
    for (const result of [null, { ok: false, error: { code: "storage", message: "private" } }, { ok: true, value: { outcome: "found" } }, { ok: true, value: { outcome: "not-found", snapshot: {} } }]) assert.deepEqual(await setup(undefined, { getPublication: async () => result }).service.readPublicMenu(ref()), { status: "unavailable" });
});
test("de-duplication is per call and includes shared exact product/recipe dependencies", async () => {
    const f = fixture(2); f.publication.sections.push({ ...f.publication.sections[0], key: "second" });
    const s = setup(f); assert.equal((await s.service.readPublicMenu(ref())).status, "found");
    for (const name of ["getProduct", "getRecipe"]) assert.equal(s.calls.filter(c => c[0] === name).length, 1);
    for (const name of ["getPresentation", "getOffer"]) assert.equal(s.calls.filter(c => c[0] === name).length, 2);
    await s.service.readPublicMenu(ref()); assert.equal(s.calls.filter(c => c[0] === "getProduct").length, 2);
});
test("100 combined exact menu references accepted; 102 reject before downstream reads", async () => {
    assert.equal((await setup(fixture(50)).service.readPublicMenu(ref())).status, "found");
    const s = setup(fixture(51)); assert.deepEqual(await s.service.readPublicMenu(ref()), { status: "unavailable" }); assert.equal(s.calls.length, 1);
});
test("broken entry cannot be dropped into a partial menu", async () => {
    const f = fixture(2); const s = setup(f, { getOffer: async id => id === f.offers[0].offerId ? { ok: true, value: { outcome: "found", snapshot: f.offers[0] } } : { ok: true, value: { outcome: "not-found" } } });
    assert.deepEqual(await s.service.readPublicMenu(ref()), { status: "unavailable" });
    const unsupported = fixture(); unsupported.presentations[0] = { ...unsupported.presentations[0], price: 123 } as typeof unsupported.presentations[0];
    assert.deepEqual(await setup(unsupported).service.readPublicMenu(ref()), { status: "unavailable" });
});
test("captured references/snapshots survive caller and repository mutation across awaits", async () => {
    const f = fixture(); let release: (() => void) | undefined;
    const barrier = new Promise<void>(resolve => { release = resolve; });
    const s = setup(f, { getOffer: async () => { await barrier; return { ok: true, value: { outcome: "found", snapshot: f.offers[0] } }; } });
    const input = ref(); const pending = s.service.readPublicMenu(input); input.version = 999;
    while (!s.calls.some(c => c[0] === "getOffer")) await new Promise(resolve => setTimeout(resolve, 0));
    f.presentations[0].name = "Changed after presentation read"; f.publication.title = "Changed after publication read";
    release!(); const result = await pending; assert.equal(result.status, "found");
    if (result.status !== "found") throw new Error("Expected found");
    assert.equal(result.menu.title, "Synthetic menu"); assert.equal(result.menu.sections[0].entries[0].name, "Synthetic dish 0");
    function frozen(v: unknown): void { if (v && typeof v === "object") { assert(Object.isFrozen(v)); Object.values(v).forEach(frozen); } } frozen(result);
    assert.throws(() => (result.menu.sections as unknown[]).push({}));
});
test("construction performs no IO, captures original methods and exposes no auth or route", async () => {
    assert.throws(() => createFoodPublicMenuReadService({} as FoodPublicMenuReadServiceDependencies), /configuration is unavailable/);
    const s = setup(); assert.equal(s.calls.length, 0); s.dependencies.repository.getPublication = async () => { throw new Error("replacement"); };
    assert.equal((await s.service.readPublicMenu(ref())).status, "found");
    const source = await readFile(new URL("./public-menu-read-service.ts", import.meta.url), "utf8");
    assert.doesNotMatch(source, /getLatest|getCurrent|fetch\(|process\.env|APIRoute|wrangler|SessionPrincipalResolver|createInitial|appendRevision/);
});
