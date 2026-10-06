import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as persistence from "./menu-persistence";
import { InMemoryFoodDraftRepository } from "./draft-persistence";
import { createFoodRecipeId, createFoodProductId } from "./draft-domain";
import { createFoodDishId, createFoodServingOfferId, type FoodDishPresentation, type FoodServingOffer } from "./dish-offer-domain";
import { createFoodMenuPublicationId, type FoodMenuPublication, type FoodServingOfferAvailability } from "./menu-publication-domain";

const invalid = { ok: false, error: { code: "invalid-input", message: "Food menu repository input could not be validated." } };
const storage = { ok: false, error: { code: "storage", message: "Food menu repository storage is unavailable." } };
function value<T>(result: persistence.FoodMenuRepositoryResult<T>): T { assert.equal(result.ok, true, JSON.stringify(result)); if (!result.ok) throw new Error("Unexpected failure"); return result.value; }
function snapshot<T>(result: persistence.FoodMenuReadOutcome<T> | persistence.FoodMenuAppendOutcome<T>): T { if (!("snapshot" in result)) throw new Error("Expected snapshot"); return result.snapshot; }
function frozen(input: unknown): void { if (input && typeof input === "object") { assert.ok(Object.isFrozen(input)); Object.values(input).forEach(frozen); } }
async function fixture() {
    const drafts = new InMemoryFoodDraftRepository();
    const recipe = { id: createFoodRecipeId("rice"), version: 1, evidence: [] };
    const product = { id: createFoodProductId("rice"), version: 1, recipe: { id: recipe.id, version: 1 }, evidence: [] };
    await drafts.createInitialRecipe(recipe); await drafts.createInitialProduct(product);
    const calls: unknown[][] = [];
    const dependencies = { getProduct: async (...args: Parameters<typeof drafts.getProduct>) => { calls.push(["product", ...args]); return drafts.getProduct(...args); }, getRecipe: async (...args: Parameters<typeof drafts.getRecipe>) => { calls.push(["recipe", ...args]); return drafts.getRecipe(...args); } };
    const repo = new persistence.InMemoryFoodMenuRepository(dependencies); assert.equal(calls.length, 0);
    const presentation: FoodDishPresentation = { dishId: createFoodDishId("rice"), version: 1, product: { id: product.id, version: 1 }, recipe: { id: recipe.id, version: 1 }, name: "Rice", mediaReferences: [{ reference: "media/a" }, { reference: "media/b" }] };
    const offer: FoodServingOffer = { offerId: createFoodServingOfferId("family"), version: 1, presentation: { dishId: presentation.dishId, version: 1 }, format: { kind: "family" }, servingEstimate: { state: "unknown" } };
    const publication: FoodMenuPublication = { publicationId: createFoodMenuPublicationId("main"), version: 1, state: "published", title: "Menu", sections: [{ key: "family", title: "Family", entries: [{ presentation: offer.presentation, selection: { shortDescription: false, longDescription: false, mediaReferences: ["media/b", "media/a"] }, offers: [{ offer: { offerId: offer.offerId, version: 1 }, intent: "informational", selection: { packagingDescription: false, storageSummary: false, reheatingSummary: false, availability: true } }] }] }] };
    const availability: FoodServingOfferAvailability = { offer: { offerId: offer.offerId, version: 1 }, revision: 1, state: "available" };
    const contexts = [{ presentation, product, recipe }];
    return { repo, drafts, calls, dependencies, recipe, product, presentation, offer, publication, availability, contexts };
}
async function seeded() { const f = await fixture(); value(await f.repo.createInitialPresentation(f.presentation)); value(await f.repo.createInitialOffer(f.offer)); value(await f.repo.createInitialPublication(f.publication)); value(await f.repo.createInitialAvailability(f.availability)); return f; }

test("all entity families enforce initial/consecutive versions, retry precedence and fixed conflict", async () => {
    const f = await fixture();
    const cases = [
        { initial: (s: FoodDishPresentation) => f.repo.createInitialPresentation(s), append: (s: FoodDishPresentation, p: number) => f.repo.appendPresentationRevision(s, p), base: f.presentation, changed: { ...f.presentation, name: "Changed" } },
        { initial: (s: FoodServingOffer) => f.repo.createInitialOffer(s), append: (s: FoodServingOffer, p: number) => f.repo.appendOfferRevision(s, p), base: f.offer, changed: { ...f.offer, format: { kind: "individual" } } },
        { initial: (s: FoodMenuPublication) => f.repo.createInitialPublication(s), append: (s: FoodMenuPublication, p: number) => f.repo.appendPublicationRevision(s, p), base: f.publication, changed: { ...f.publication, title: "Changed" } }
    ];
    for (const entry of cases) {
        // The table exercises the same contract with its family's typed operations.
        const c = entry as unknown as { initial(s: unknown): Promise<persistence.FoodMenuRepositoryResult<persistence.FoodMenuAppendOutcome<unknown>>>; append(s: unknown, p: unknown): Promise<persistence.FoodMenuRepositoryResult<persistence.FoodMenuAppendOutcome<unknown>>>; base: { version: number }; changed: { version: number } };
        assert.deepEqual(await c.initial({ ...c.base, version: 2 }), invalid);
        assert.equal(value(await c.initial(c.base)).outcome, "created");
        assert.equal(value(await c.initial(c.base)).outcome, "already-present");
        assert.deepEqual(value(await c.initial(c.changed)), { outcome: "conflict", reason: "different-content" });
        assert.deepEqual(await c.append({ ...c.base, version: 3 }, 1), invalid);
        assert.deepEqual(await c.append({ ...c.base, version: 3 }, 2), invalid);
        const second = { ...c.base, version: 2 }; assert.equal(value(await c.append(second, 1)).outcome, "created");
        assert.equal(value(await c.append({ ...c.base, version: 3 }, 2)).outcome, "created");
        assert.equal(value(await c.append(second, 1)).outcome, "already-present");
        assert.equal(value(await c.initial(c.base)).outcome, "already-present");
        assert.deepEqual(value(await c.append({ ...c.changed, version: 2 }, 1)), { outcome: "conflict", reason: "different-content" });
        for (const predecessor of [undefined, null, "1", 0, 1.5, Number.MAX_SAFE_INTEGER]) assert.deepEqual(await c.append(second, predecessor), invalid);
        assert.deepEqual(await c.append({ ...c.base, version: Number.MAX_SAFE_INTEGER + 1 }, Number.MAX_SAFE_INTEGER), invalid);
    }
});
test("availability streams preserve retired history, retries and independent offer-version state", async () => {
    const f = await seeded(); const a2 = { ...f.availability, revision: 2, state: "retired" } as const;
    assert.deepEqual(await f.repo.createInitialAvailability({ ...f.availability, revision: 2 }), invalid);
    assert.deepEqual(await f.repo.appendAvailabilityRevision({ ...f.availability, revision: 3 }, 1), invalid);
    assert.equal(value(await f.repo.appendAvailabilityRevision(a2, 1)).outcome, "created");
    value(await f.repo.appendAvailabilityRevision({ ...a2, revision: 3, state: "temporarily-paused" }, 2));
    assert.equal(value(await f.repo.appendAvailabilityRevision(a2, 1)).outcome, "already-present");
    assert.deepEqual(value(await f.repo.appendAvailabilityRevision({ ...a2, state: "sold-out" }, 1)), { outcome: "conflict", reason: "different-content" });
    assert.equal(value(await f.repo.createInitialAvailability(f.availability)).outcome, "already-present");
    assert.equal(snapshot(value(await f.repo.getAvailability(f.offer.offerId, 1, 2))).state, "retired");
    assert.equal(snapshot(value(await f.repo.getCurrentAvailability(f.offer.offerId, 1))).revision, 3);
    value(await f.repo.appendOfferRevision({ ...f.offer, version: 2 }, 1));
    assert.deepEqual(value(await f.repo.getCurrentAvailability(f.offer.offerId, 2)), { outcome: "not-found" });
    value(await f.repo.createInitialAvailability({ ...f.availability, offer: { offerId: f.offer.offerId, version: 2 }, state: "unavailable" }));
    assert.equal(snapshot(value(await f.repo.getCurrentAvailability(f.offer.offerId, 1))).revision, 3);
    assert.equal(snapshot(value(await f.repo.getCurrentAvailability(f.offer.offerId, 2))).state, "unavailable");
    assert.deepEqual(value(await f.repo.listAvailabilityRevisions(f.offer.offerId, 1)).items.map(a => a.revision), [1, 2, 3]);
    assert.deepEqual(value(await f.repo.listAvailabilityRevisions(f.offer.offerId, 1, { limit: 1, afterRevision: 1 })).nextCursor, 2);
    assert.deepEqual(await f.repo.appendAvailabilityRevision({ ...f.availability, revision: Number.MAX_SAFE_INTEGER + 1 }, Number.MAX_SAFE_INTEGER), invalid);
});
test("exact historical reads, latest methods and histories never substitute newer references", async () => {
    const f = await seeded();
    value(await f.repo.appendPresentationRevision({ ...f.presentation, version: 2, name: "New" }, 1));
    const offer2 = { ...f.offer, version: 2, presentation: { ...f.offer.presentation, version: 2 } }; value(await f.repo.appendOfferRevision(offer2, 1));
    value(await f.repo.appendPublicationRevision({ ...f.publication, version: 2, state: "unpublished", sections: [] }, 1));
    assert.deepEqual(snapshot(value(await f.repo.getPresentation(f.presentation.dishId, 1))), f.presentation);
    assert.equal(snapshot(value(await f.repo.getLatestPresentation(f.presentation.dishId))).version, 2);
    assert.deepEqual(snapshot(value(await f.repo.getOffer(f.offer.offerId, 1))).presentation, f.offer.presentation);
    assert.equal(snapshot(value(await f.repo.getLatestOffer(f.offer.offerId))).presentation.version, 2);
    assert.deepEqual(snapshot(value(await f.repo.getPublication(f.publication.publicationId, 1))), f.publication);
    assert.equal(snapshot(value(await f.repo.getLatestPublication(f.publication.publicationId))).state, "unpublished");
    assert.deepEqual(value(await f.repo.listPresentationVersions(f.presentation.dishId)).items.map(p => p.version), [1, 2]);
    assert.deepEqual(value(await f.repo.listOfferVersions(f.offer.offerId)).items.map(p => p.version), [1, 2]);
    assert.deepEqual(value(await f.repo.listPublicationVersions(f.publication.publicationId)).items.map(p => p.version), [1, 2]);
    assert.deepEqual(value(await f.repo.getPresentation(f.presentation.dishId, 99)), { outcome: "not-found" });
    assert.deepEqual(value(await f.repo.getLatestOffer(createFoodServingOfferId("absent"))), { outcome: "not-found" });
});
test("dangling references fail closed and offers cannot move to a different dish", async () => {
    const f = await fixture();
    assert.deepEqual(await f.repo.createInitialOffer(f.offer), invalid);
    assert.deepEqual(await f.repo.createInitialPublication(f.publication), invalid);
    assert.deepEqual(await f.repo.createInitialAvailability(f.availability), invalid);
    value(await f.repo.createInitialPresentation(f.presentation));
    assert.deepEqual(await f.repo.createInitialPublication(f.publication), invalid);
    value(await f.repo.createInitialOffer(f.offer));
    assert.deepEqual(await f.repo.createInitialOffer({ ...f.offer, offerId: createFoodServingOfferId("missing"), presentation: { ...f.offer.presentation, version: 2 } }), invalid);
    const other = { ...f.presentation, dishId: createFoodDishId("other") }; value(await f.repo.createInitialPresentation(other));
    const moved = { ...f.offer, version: 2, presentation: { dishId: other.dishId, version: 1 } };
    assert.deepEqual(await f.repo.createInitialOffer({ ...moved, version: 1 }), invalid);
    assert.deepEqual(await f.repo.appendOfferRevision(moved, 1), invalid);
    value(await f.repo.appendOfferRevision({ ...f.offer, version: 2 }, 1)); assert.deepEqual(await f.repo.appendOfferRevision(moved, 1), invalid);
    const incompatible = { ...f.publication, sections: [{ ...f.publication.sections[0], entries: [{ ...f.publication.sections[0].entries[0], presentation: { dishId: other.dishId, version: 1 } }] }] };
    assert.deepEqual(await f.repo.createInitialPublication(incompatible), invalid);
});
test("exact FOOD-001 dependency failures are classified and sanitized without writes", async () => {
    const f = await fixture(); const missing = new persistence.InMemoryFoodMenuRepository({ getProduct: async () => ({ outcome: "not-found" }), getRecipe: f.dependencies.getRecipe });
    assert.deepEqual(await missing.createInitialPresentation(f.presentation), invalid);
    for (const bad of [null, {}, { outcome: "found", snapshot: { ...f.product, version: 2 } }, { outcome: "found", snapshot: { ...f.product, evidence: [{ secret: "private" }] } }]) {
        const repo = new persistence.InMemoryFoodMenuRepository({ getProduct: async () => bad as never, getRecipe: f.dependencies.getRecipe }); assert.deepEqual(await repo.createInitialPresentation(f.presentation), storage);
    }
    const failed = new persistence.InMemoryFoodMenuRepository({ getProduct: async () => { throw new Error("private SQL evidence"); }, getRecipe: f.dependencies.getRecipe }); assert.deepEqual(await failed.createInitialPresentation(f.presentation), storage);
    const wrongRecipe = { ...f.recipe, id: createFoodRecipeId("other") }; await f.drafts.createInitialRecipe(wrongRecipe);
    assert.deepEqual(await f.repo.createInitialPresentation({ ...f.presentation, recipe: { id: wrongRecipe.id, version: 1 } }), invalid);
    f.calls.length = 0; value(await f.repo.createInitialPresentation(f.presentation)); assert.deepEqual(f.calls.slice(0, 2), [["product", f.product.id, 1], ["recipe", f.recipe.id, 1]]);
    let state: "found" | "missing" | "corrupt" = "found";
    const dynamic = new persistence.InMemoryFoodMenuRepository({ getProduct: async () => state === "missing" ? { outcome: "not-found" } : state === "corrupt" ? { outcome: "found", snapshot: {} as never } : f.drafts.getProduct(f.product.id, 1), getRecipe: f.dependencies.getRecipe });
    value(await dynamic.createInitialPresentation(f.presentation)); state = "missing";
    assert.deepEqual(await dynamic.getPresentation(f.presentation.dishId, 1), storage); assert.deepEqual(await dynamic.listLatestPresentations(), storage);
    state = "corrupt"; assert.deepEqual(await dynamic.getLatestPresentation(f.presentation.dishId), storage);
});
test("same-instance competing calls linearize with identical and differing canonical content", async () => {
    const f = await fixture();
    const results = await Promise.all([f.repo.createInitialPresentation(f.presentation), f.repo.createInitialPresentation(f.presentation), f.repo.createInitialPresentation({ ...f.presentation, name: "Different" })]);
    assert.deepEqual(results.map(r => value(r).outcome), ["created", "already-present", "conflict"]);
    const next = { ...f.presentation, version: 2 };
    assert.deepEqual((await Promise.all([f.repo.appendPresentationRevision(next, 1), f.repo.appendPresentationRevision(next, 1), f.repo.appendPresentationRevision({ ...next, name: "Different" }, 1)])).map(r => value(r).outcome), ["created", "already-present", "conflict"]);
    value(await f.repo.createInitialOffer(f.offer)); value(await f.repo.createInitialPublication(f.publication)); value(await f.repo.createInitialAvailability(f.availability));
    assert.deepEqual((await Promise.all([f.repo.appendOfferRevision({ ...f.offer, version: 2 }, 1), f.repo.appendOfferRevision({ ...f.offer, version: 2, format: { kind: "individual" } }, 1)])).map(r => value(r).outcome), ["created", "conflict"]);
    assert.deepEqual((await Promise.all([f.repo.appendPublicationRevision({ ...f.publication, version: 2 }, 1), f.repo.appendPublicationRevision({ ...f.publication, version: 2 }, 1)])).map(r => value(r).outcome), ["created", "already-present"]);
    assert.deepEqual((await Promise.all([f.repo.appendAvailabilityRevision({ ...f.availability, revision: 2, state: "retired" }, 1), f.repo.appendAvailabilityRevision({ ...f.availability, revision: 2, state: "sold-out" }, 1)])).map(r => value(r).outcome), ["created", "conflict"]);
});
test("submitted objects are captured before asynchronous resolution and reads detach deeply", async () => {
    const f = await fixture(); let release!: () => void; const wait = new Promise<void>(resolve => { release = resolve; });
    const repo = new persistence.InMemoryFoodMenuRepository({ getProduct: async (...args) => { await wait; return f.dependencies.getProduct(...args); }, getRecipe: f.dependencies.getRecipe });
    const input = { ...f.presentation, mediaReferences: [{ reference: "media/original" }] }; const pending = repo.createInitialPresentation(input); input.name = "Changed"; input.mediaReferences[0].reference = "changed"; release();
    const stored = snapshot(value(await pending)); assert.equal(stored.name, "Rice"); assert.equal(stored.mediaReferences?.[0].reference, "media/original"); frozen(stored);
    const read = value(await repo.getPresentation(input.dishId, 1)); frozen(read); assert.notEqual(snapshot(read), stored); assert.notEqual(snapshot(read).mediaReferences, stored.mediaReferences);
    assert.equal(value(await repo.createInitialPresentation(stored)).outcome, "already-present");
    assert.throws(() => { (stored.product as { version: number }).version = 99; });
    const s = await seeded(); const pub = value(await s.repo.getPublication(s.publication.publicationId, 1)); frozen(pub); assert.notEqual(snapshot(pub).sections, s.publication.sections);
});
test("all family codecs are canonical, context-bound and distinguish availability dimensions", async () => {
    const f = await fixture();
    const codecs = [
        { input: f.presentation, encode: (v: unknown) => persistence.serializeFoodDishPresentation(v, f.product, f.recipe), decode: (s: unknown) => persistence.deserializeFoodDishPresentation(s, f.product, f.recipe) },
        { input: f.offer, encode: (v: unknown) => persistence.serializeFoodServingOffer(v, f.presentation, f.product, f.recipe), decode: (s: unknown) => persistence.deserializeFoodServingOffer(s, f.presentation, f.product, f.recipe) },
        { input: f.publication, encode: (v: unknown) => persistence.serializeFoodMenuPublication(v, f.contexts, [f.offer]), decode: (s: unknown) => persistence.deserializeFoodMenuPublication(s, f.contexts, [f.offer]) },
        { input: f.availability, encode: persistence.serializeFoodServingOfferAvailability, decode: persistence.deserializeFoodServingOfferAvailability }
    ];
    for (const c of codecs) {
        const encoded = value(c.encode(c.input)); const reversed = Object.fromEntries(Object.entries(c.input).reverse()); assert.equal(value(c.encode(reversed)), encoded);
        const roundTrip = value<unknown>(c.decode(encoded)); assert.deepEqual(roundTrip, c.input); frozen(roundTrip);
        for (const bad of [null, "{", encoded + " ", JSON.stringify(JSON.parse(encoded), null, 2)]) assert.deepEqual(c.decode(bad), invalid);
        for (const change of [{ formatVersion: 2 }, { recordType: "wrong" }, { recordId: "wrong" }, { recordVersion: 99 }, { extra: true }, { snapshot: {} }]) assert.deepEqual(c.decode(JSON.stringify({ ...JSON.parse(encoded), ...change })), invalid);
        assert.deepEqual(c.decode(encoded.replace('"formatVersion":1', '"formatVersion":1,"formatVersion":1')), invalid);
    }
    const a = JSON.parse(value(persistence.serializeFoodServingOfferAvailability({ ...f.availability, offer: { offerId: f.offer.offerId, version: 7 }, revision: 3 })));
    assert.equal(a.recordVersion, 7); assert.equal(a.observationRevision, 3);
    assert.deepEqual(persistence.deserializeFoodServingOfferAvailability(JSON.stringify({ ...a, observationRevision: 7 })), invalid);
    assert.notEqual(value(persistence.serializeFoodDishPresentation(f.presentation, f.product, f.recipe)), value(persistence.serializeFoodDishPresentation({ ...f.presentation, mediaReferences: [...f.presentation.mediaReferences!].reverse() }, f.product, f.recipe)));
    assert.deepEqual(persistence.deserializeFoodDishPresentation(value(codecs[0].encode(f.presentation)), f.product, { ...f.recipe, version: 2 }), invalid);
    assert.deepEqual(persistence.deserializeFoodMenuPublication(value(codecs[2].encode(f.publication)), [], []), invalid);
});
test("bounded deterministic UTF-16 listings and numeric history cursors cover all families", async () => {
    const f = await seeded(); const names = ["\uE000", "🍚", "日本", "z", "A", ...Array.from({ length: 101 }, (_, i) => `n${i}`)];
    for (const name of names.slice().reverse()) {
        value(await f.repo.createInitialPresentation({ ...f.presentation, dishId: createFoodDishId(name) }));
        value(await f.repo.createInitialOffer({ ...f.offer, offerId: createFoodServingOfferId(name) }));
        value(await f.repo.createInitialPublication({ ...f.publication, publicationId: createFoodMenuPublicationId(name), sections: [] }));
    }
    const listing = [
        { run: (o?: persistence.FoodMenuLatestOptions<ReturnType<typeof createFoodDishId>>) => f.repo.listLatestPresentations(o), id: (s: FoodDishPresentation) => s.dishId },
        { run: (o?: persistence.FoodMenuLatestOptions<ReturnType<typeof createFoodServingOfferId>>) => f.repo.listLatestOffers(o), id: (s: FoodServingOffer) => s.offerId },
        { run: (o?: persistence.FoodMenuLatestOptions<ReturnType<typeof createFoodMenuPublicationId>>) => f.repo.listLatestPublications(o), id: (s: FoodMenuPublication) => s.publicationId }
    ];
    for (const raw of listing) {
        const c = raw as unknown as { run(o?: unknown): Promise<persistence.FoodMenuRepositoryResult<persistence.FoodMenuPage<unknown, string>>>; id(s: unknown): string };
        const first = value(await c.run()); assert.equal(first.items.length, 20); frozen(first);
        const max = value(await c.run({ limit: 100 })); assert.equal(max.items.length, 100); const tail = value(await c.run({ limit: 100, afterId: max.nextCursor }));
        const ids = [...max.items, ...tail.items].map(c.id); assert.deepEqual(ids, ids.slice().sort()); assert.equal(new Set(ids).size, ids.length);
        assert.equal(value(await c.run({ afterId: first.nextCursor })).items.map(c.id)[0], ids[20]);
        for (const opts of [null, { limit: 0 }, { limit: 101 }, { limit: "20" }, { limit: 1.5 }, { limit: null }, { afterId: "wrong" }, { extra: true }]) assert.deepEqual(await c.run(opts), invalid);
    }
    for (let v = 2; v <= 22; v++) {
        value(await f.repo.appendPresentationRevision({ ...f.presentation, version: v }, v - 1));
        value(await f.repo.appendOfferRevision({ ...f.offer, version: v }, v - 1));
        value(await f.repo.appendPublicationRevision({ ...f.publication, version: v }, v - 1));
        value(await f.repo.appendAvailabilityRevision({ ...f.availability, revision: v }, v - 1));
    }
    for (const run of [(o: persistence.FoodMenuHistoryOptions) => f.repo.listPresentationVersions(f.presentation.dishId, o), (o: persistence.FoodMenuHistoryOptions) => f.repo.listOfferVersions(f.offer.offerId, o), (o: persistence.FoodMenuHistoryOptions) => f.repo.listPublicationVersions(f.publication.publicationId, o)]) {
        assert.equal(value<persistence.FoodMenuPage<unknown, number>>(await run({})).items.length, 20); assert.equal(value<persistence.FoodMenuPage<unknown, number>>(await run({ limit: 100 })).items.length, 22); assert.equal(value<persistence.FoodMenuPage<unknown, number>>(await run({ afterVersion: 20 })).items.length, 2);
        for (const o of [{ afterVersion: 0 }, { afterVersion: "1" }, { limit: 101 }, { extra: true }]) assert.deepEqual(await run(o as never), invalid);
    }
    assert.equal(value(await f.repo.listAvailabilityRevisions(f.offer.offerId, 1)).items.length, 20);
    assert.equal(value(await f.repo.listAvailabilityRevisions(f.offer.offerId, 1, { limit: 100 })).items.length, 22);
    for (const o of [{ afterRevision: 0 }, { afterRevision: "1" }, { limit: 101 }]) assert.deepEqual(await f.repo.listAvailabilityRevisions(f.offer.offerId, 1, o as never), invalid);
});
test("constructors, runtime inputs and source isolation preserve the bounded contract", async () => {
    for (const dependencies of [null, [], {}, { getProduct: 1, getRecipe() {} }, { get getProduct() { throw new Error("secret"); } }]) assert.throws(() => new persistence.InMemoryFoodMenuRepository(dependencies as never), { name: "TypeError", message: "Food menu repository dependencies are unavailable." });
    const f = await fixture();
    for (const input of [null, [], { ...f.presentation, extra: true }, { ...f.presentation, [Symbol("extra")]: true }, { ...f.presentation, version: "1" }, { get dishId() { throw new Error("secret"); } }]) assert.deepEqual(await f.repo.createInitialPresentation(input as never), invalid);
    assert.deepEqual(await f.repo.getPresentation("bad" as never, 1), invalid); assert.deepEqual(await f.repo.getAvailability(f.offer.offerId, 0, 1), invalid);
    const names = Object.getOwnPropertyNames(persistence.InMemoryFoodMenuRepository.prototype).filter(n => n !== "constructor"); assert.equal(names.length, 23); assert.ok(names.every(n => !/delete|update|reset|overwrite|publish|activate/i.test(n)));
    const source = readFileSync(new URL("./menu-persistence.ts", import.meta.url), "utf8");
    assert.deepEqual([...source.matchAll(/from\s+"([^"]+)"/g)].map(m => m[1]), ["./draft-domain", "./draft-persistence", "./dish-offer-domain", "./menu-publication-domain"]);
    assert.doesNotMatch(source, /cloudflare:workers|node:|fetch\(|Date\.|Math\.random|process\.|wrangler|Stripe|FormData|session|insurance|sesh/i);
});
test("all availability states remain supplied observations and failed aggregate reads stay storage", async () => {
    const f = await seeded();
    for (const [index, state] of (["sold-out", "temporarily-paused", "outside-ordering-window", "unavailable", "retired"] as const).entries()) {
        const revision = index + 2; value(await f.repo.appendAvailabilityRevision({ ...f.availability, revision, state }, revision - 1));
        assert.equal(snapshot(value(await f.repo.getAvailability(f.offer.offerId, 1, revision))).state, state);
    }
    let missing = false;
    const repo = new persistence.InMemoryFoodMenuRepository({ getProduct: (...args) => missing ? Promise.resolve({ outcome: "not-found" }) : f.dependencies.getProduct(...args), getRecipe: f.dependencies.getRecipe });
    value(await repo.createInitialPresentation(f.presentation)); value(await repo.createInitialOffer(f.offer)); value(await repo.createInitialPublication(f.publication)); value(await repo.createInitialAvailability(f.availability)); missing = true;
    for (const read of [() => repo.getOffer(f.offer.offerId, 1), () => repo.getPublication(f.publication.publicationId, 1), () => repo.getAvailability(f.offer.offerId, 1, 1), () => repo.getCurrentAvailability(f.offer.offerId, 1), () => repo.listLatestOffers(), () => repo.listLatestPublications(), () => repo.listAvailabilityRevisions(f.offer.offerId, 1)]) assert.deepEqual(await read(), storage);
    assert.deepEqual(await repo.appendOfferRevision({ ...f.offer, version: 2 }, 1), storage);
});
test("recursive key-order equality excludes private context and full replacement retains no omitted fields", async () => {
    const f = await fixture();
    function reverse(v: unknown): unknown { if (Array.isArray(v)) return v.map(reverse); if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).reverse().map(([k, value]) => [k, reverse(value)])); return v; }
    const original = value(persistence.serializeFoodMenuPublication(f.publication, f.contexts, [f.offer]));
    assert.equal(value(persistence.serializeFoodMenuPublication(reverse(f.publication), reverse(f.contexts), reverse([f.offer]))), original);
    const changedRecipe = { ...f.recipe, ingredients: [{ kind: "simple", name: "Private ingredient" }] };
    assert.equal(value(persistence.serializeFoodDishPresentation(f.presentation, f.product, changedRecipe)), value(persistence.serializeFoodDishPresentation(f.presentation, f.product, f.recipe)));
    assert.ok(!original.includes("food-product:")); assert.ok(!original.includes("food-recipe:"));
    const enriched = { ...f.presentation, shortDescription: "Previous" }; value(await f.repo.createInitialPresentation(enriched));
    const second = { ...f.presentation, version: 2, mediaReferences: undefined }; value(await f.repo.appendPresentationRevision(second, 1));
    const read = snapshot(value(await f.repo.getPresentation(f.presentation.dishId, 2))); assert.ok(!("shortDescription" in read)); assert.ok(!("mediaReferences" in read));
    assert.equal(snapshot(value(await f.repo.getPresentation(f.presentation.dishId, 1))).shortDescription, "Previous");
});
