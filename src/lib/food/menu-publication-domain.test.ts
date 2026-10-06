import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as menu from "./menu-publication-domain";
import { createFoodDishId, createFoodServingOfferId } from "./dish-offer-domain";
import { createFoodProductId, createFoodRecipeId } from "./draft-domain";

function fixture() {
    const recipe = { id: createFoodRecipeId("private"), version: 3, evidence: [{ requirement: "allergen-review", sourceReference: "private-source", subject: { type: "recipe", id: createFoodRecipeId("private"), version: 3 }, reviewDate: "2026-10-06", reviewer: "private-reviewer" }], allergenReview: { state: "reviewed", declarations: [] } };
    const product = { id: createFoodProductId("private"), version: 7, recipe: { id: recipe.id, version: recipe.version }, evidence: [] };
    const presentation = { dishId: createFoodDishId("rice"), version: 4, product: { id: product.id, version: product.version }, recipe: { id: recipe.id, version: recipe.version }, name: "Rice", shortDescription: "Short", longDescription: "Long", mediaReferences: [{ reference: "media/first" }, { reference: "media/second" }] };
    const presentations = [{ presentation, product, recipe }];
    const offers = ["individual", "family", "catering", "custom"].map((kind, i) => ({ offerId: createFoodServingOfferId(kind), version: i + 2, presentation: { dishId: presentation.dishId, version: 4 }, format: kind === "catering" ? { kind, panSize: "half-pan" } : kind === "custom" ? { kind, code: "tray", label: "Tray" } : { kind }, servingEstimate: { state: "unknown" }, packagingDescription: { state: "unknown" }, storageSummary: { state: "specified", text: "Supplied" } }));
    const selected = offers.map(o => ({ offer: { offerId: o.offerId, version: o.version }, intent: "informational", selection: { packagingDescription: false, storageSummary: false, reheatingSummary: false, availability: true } }));
    const entry = { presentation: { dishId: presentation.dishId, version: 4 }, selection: { shortDescription: false, longDescription: false, mediaReferences: [] as string[] }, offers: selected };
    const publication = { publicationId: menu.createFoodMenuPublicationId("main"), version: 5, state: "published", title: "Menu", sections: [{ key: "featured", title: "Featured", entries: [entry] }] };
    const availabilities = offers.map(o => ({ offer: { offerId: o.offerId, version: o.version }, revision: 9, state: "available" }));
    return { recipe, product, presentation, presentations, offers, selected, entry, publication, availabilities };
}
const failure = { ok: false, error: { code: "invalid-input", message: "Food menu input could not be validated." } };
function value<T>(r: menu.FoodMenuValidationResult<T>): T { assert.equal(r.ok, true); if (!r.ok) throw new Error("Unexpected failure"); return r.value; }
function projection(f = fixture(), input: unknown = f.publication, observations: unknown = f.availabilities) { const r = value(menu.projectFoodPublicMenu(input, f.presentations, f.offers, observations)); assert.equal(r.state, "published"); if (r.state !== "published") throw new Error("Expected menu"); return r.menu; }
function frozen(v: unknown): void { if (v && typeof v === "object") { assert.ok(Object.isFrozen(v)); Object.values(v).forEach(frozen); } }

test("canonical publication identities reject rather than normalize and sanitize identity errors", () => {
    for (const local of ["main", "日本 🍚", "x".repeat(10000)]) assert.equal(menu.parseFoodMenuPublicationId(menu.createFoodMenuPublicationId(local)), `food-menu-publication:${local}`);
    for (const bad of [null, undefined, 1, {}, "", " x", "x ", "a:b"]) assert.throws(() => menu.createFoodMenuPublicationId(bad), { name: "TypeError", message: "Invalid food menu publication identity." });
    for (const bad of ["food-dish:x", "food-menu-publication:", "food-menu-publication: x", "food-menu-publication:a:b", null]) assert.throws(() => menu.parseFoodMenuPublicationId(bad), { message: "Invalid food menu publication identity." });
});
test("publication validates historical versions and full-replacement consecutive revisions", () => {
    const f = fixture(); const validate = (p: unknown) => menu.validateFoodMenuPublication(p, f.presentations, f.offers);
    assert.deepEqual(value(validate(f.publication)), f.publication);
    value(validate({ ...f.publication, version: Number.MAX_SAFE_INTEGER }));
    for (const version of [0, -1, 1.5, "5", NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.deepEqual(validate({ ...f.publication, version }), failure);
    const next = { ...f.publication, version: 6, state: "unpublished", sections: [] };
    const revise = (p: unknown, n: unknown) => menu.reviseFoodMenuPublication(p, n, f.presentations, f.offers, f.presentations, f.offers);
    assert.deepEqual(value(revise(f.publication, next)), next); assert.equal(f.publication.sections.length, 1);
    for (const n of [{ ...next, version: 7 }, { ...next, publicationId: menu.createFoodMenuPublicationId("other") }, { ...next, sections: undefined }]) assert.deepEqual(revise(f.publication, n), failure);
    assert.deepEqual(revise({ ...f.publication, version: Number.MAX_SAFE_INTEGER }, { ...next, version: Number.MAX_SAFE_INTEGER }), failure);
    assert.deepEqual(revise({ ...f.publication, title: "" }, next), failure);
});
test("publication and availability remain independent, absent and withheld stay absent", () => {
    const f = fixture();
    assert.deepEqual(value(menu.projectFoodPublicMenu({ ...f.publication, state: "unpublished" }, f.presentations, f.offers, f.availabilities)), { state: "unpublished" });
    for (const state of ["available", "sold-out", "temporarily-paused", "outside-ordering-window", "unavailable", "retired"]) {
        const out = projection(f, f.publication, f.availabilities.map(a => ({ ...a, state })));
        assert.equal(out.sections[0].entries[0].offers[0].availability?.state, state);
        assert.ok(!("orderable" in out.sections[0].entries[0].offers[0]));
    }
    assert.ok(!("availability" in projection(f, f.publication, []).sections[0].entries[0].offers[0]));
    f.selected[0].selection.availability = false;
    assert.ok(!("availability" in projection(f).sections[0].entries[0].offers[0]));
    const empty = { ...f.publication, sections: [] }; assert.deepEqual(projection(f, empty).sections, []);
    f.entry.offers = []; assert.deepEqual(projection(f).sections[0].entries[0].offers, []);
});
test("availability validates exact references and rejects ambiguous observations even unpublished", () => {
    const f = fixture(); assert.deepEqual(value(menu.validateFoodServingOfferAvailability(f.availabilities[0])), f.availabilities[0]);
    for (const bad of [{ ...f.availabilities[0], revision: 0 }, { ...f.availabilities[0], state: "unknown" }, { ...f.availabilities[0], offer: { ...f.availabilities[0].offer, version: "latest" } }, { ...f.availabilities[0], timestamp: "secret" }]) assert.deepEqual(menu.validateFoodServingOfferAvailability(bad), failure);
    for (const observations of [[{ ...f.availabilities[0], offer: { ...f.availabilities[0].offer, version: 99 } }], [{ ...f.availabilities[0], offer: { offerId: createFoodServingOfferId("missing"), version: 2 } }], [f.availabilities[0], { ...f.availabilities[0], revision: 10 }]]) {
        assert.deepEqual(menu.projectFoodPublicMenu(f.publication, f.presentations, f.offers, observations), failure);
        assert.deepEqual(menu.projectFoodPublicMenu({ ...f.publication, state: "unpublished" }, f.presentations, f.offers, observations), failure);
    }
});
test("one canonical dish supports family-only, catering inquiry-only and ordered subsets", () => {
    const f = fixture();
    for (const indexes of [[1], [2], [0, 1], [1, 2], [3, 2, 0, 1]]) {
        f.entry.offers = indexes.map(i => ({ ...f.selected[i], intent: i === 2 ? "inquiry-only" : "informational" }));
        const e = projection(f).sections[0].entries[0]; assert.equal(e.dishId, f.presentation.dishId);
        assert.deepEqual(e.offers.map(o => o.offerId), indexes.map(i => f.offers[i].offerId));
        for (const o of e.offers) assert.equal(o.intent, o.format.kind === "catering" ? "inquiry-only" : "informational");
    }
});
test("section/entry ordering and exact contextual bindings reject duplicates and mismatches", () => {
    const f = fixture(); const validate = (p: unknown, ps: unknown = f.presentations, os: unknown = f.offers) => menu.validateFoodMenuPublication(p, ps, os);
    const second = { ...f.publication.sections[0], key: "family", title: "Dinner for Everyone" };
    assert.deepEqual(projection(f, { ...f.publication, sections: [second, f.publication.sections[0]] }).sections.map(s => s.key), ["family", "featured"]);
    for (const sections of [[f.publication.sections[0], f.publication.sections[0]], [{ ...second, entries: [f.entry, f.entry] }]]) assert.deepEqual(validate({ ...f.publication, sections }), failure);
    assert.deepEqual(validate({ ...f.publication, sections: [{ ...second, entries: [{ ...f.entry, offers: [f.selected[0], f.selected[0]] }] }] }), failure);
    assert.deepEqual(validate(f.publication, [], f.offers), failure); assert.deepEqual(validate(f.publication, f.presentations, []), failure);
    assert.deepEqual(validate(f.publication, [f.presentations[0], f.presentations[0]]), failure);
    assert.deepEqual(validate(f.publication, f.presentations, [...f.offers, f.offers[0]]), failure);
    assert.deepEqual(validate(f.publication, [{ ...f.presentations[0], product: { ...f.product, recipe: { ...f.product.recipe, version: 99 } } }]), failure);
    const newPresentation = { ...f.presentation, version: 5 };
    const ps = [...f.presentations, { ...f.presentations[0], presentation: newPresentation }];
    const os = [...f.offers, { ...f.offers[0], version: 99, presentation: { dishId: f.presentation.dishId, version: 5 } }];
    const newEntry = { ...f.entry, presentation: { dishId: f.presentation.dishId, version: 5 }, offers: [{ ...f.selected[0], offer: { offerId: f.offers[0].offerId, version: 99 } }] };
    assert.deepEqual(validate({ ...f.publication, sections: [f.publication.sections[0], { ...second, entries: [newEntry] }] }, ps, os), failure);
    assert.deepEqual(validate({ ...f.publication, sections: [{ ...second, entries: [{ ...f.entry, offers: newEntry.offers }] }] }, ps, os), failure);
    assert.deepEqual(validate({ ...f.publication, state: "unpublished" }, [], []), failure);
    const otherPresentation = { ...f.presentation, dishId: createFoodDishId("other") };
    const otherEntry = { ...f.entry, presentation: { dishId: otherPresentation.dishId, version: 4 }, offers: [] };
    const out = value(validate({ ...f.publication, sections: [{ ...second, entries: [otherEntry, f.entry] }] }, [...f.presentations, { ...f.presentations[0], presentation: otherPresentation }]));
    assert.deepEqual(out.sections[0].entries.map(e => e.presentation.dishId), [otherPresentation.dishId, f.presentation.dishId]);
});
test("explicit descriptions, media subset and unresolved descriptors never publish implicitly", () => {
    const f = fixture(); let out = projection(f).sections[0].entries[0];
    assert.ok(!("shortDescription" in out)); assert.ok(!("longDescription" in out)); assert.deepEqual(out.mediaReferences, []);
    assert.ok(!("packagingDescription" in out.offers[0]));
    f.entry.selection = { shortDescription: true, longDescription: true, mediaReferences: ["media/second", "media/first"] };
    f.selected[0].selection.packagingDescription = true; f.selected[0].selection.storageSummary = true;
    out = projection(f).sections[0].entries[0]; assert.equal(out.shortDescription, "Short"); assert.equal(out.longDescription, "Long");
    assert.deepEqual(out.mediaReferences, [{ reference: "media/second" }, { reference: "media/first" }]);
    assert.deepEqual(out.offers[0].packagingDescription, { state: "unknown" }); assert.deepEqual(out.offers[0].storageSummary, { state: "specified", text: "Supplied" });
    for (const references of [["missing"], ["media/first", "media/first"], ["https://test"], ["x".repeat(513)]]) { f.entry.selection.mediaReferences = references; assert.deepEqual(menu.projectFoodPublicMenu(f.publication, f.presentations, f.offers, []), failure); }
    f.entry.selection.mediaReferences = []; f.selected[0].selection.reheatingSummary = true;
    assert.deepEqual(menu.projectFoodPublicMenu(f.publication, f.presentations, f.offers, []), failure);
    f.selected[0].selection.reheatingSummary = false; delete (f.presentation as Partial<typeof f.presentation>).shortDescription;
    assert.deepEqual(menu.validateFoodMenuPublication(f.publication, f.presentations, f.offers), failure);
});
test("public allowlist excludes private evidence, references and unrelated structured claims", () => {
    const f = fixture(); const out = projection(f); const encoded = JSON.stringify(out);
    for (const privateText of ["food-product:", "food-recipe:", "private-source", "private-reviewer", "evidence", "reviewer", "administrator"]) assert.ok(!encoded.includes(privateText));
    assert.deepEqual(Object.keys(out.sections[0].entries[0]).sort(), ["dishId", "mediaReferences", "name", "offers", "presentationVersion"]);
    for (const field of ["popular", "customerFavorite", "backByDemand", "limitedBatch", "new", "price", "currency", "tax", "orderable", "readiness", "bundle", "admin", "runtime"]) {
        assert.deepEqual(menu.validateFoodMenuPublication({ ...f.publication, [field]: true }, f.presentations, f.offers), failure);
        const p = { ...f.publication, sections: [{ ...f.publication.sections[0], entries: [{ ...f.entry, [field]: true }] }] };
        assert.deepEqual(menu.validateFoodMenuPublication(p, f.presentations, f.offers), failure);
    }
    value(menu.validateFoodMenuPublication({ ...f.publication, sections: [{ ...f.publication.sections[0], title: "Supplied editorial text" }] }, f.presentations, f.offers));
});
test("malformed shapes, selections, sparse arrays and throwing getters produce fixed failures", () => {
    const f = fixture(); const validate = (p: unknown) => menu.validateFoodMenuPublication(p, f.presentations, f.offers);
    for (const p of [null, [], {}, { ...f.publication, state: "approved" }, { ...f.publication, [Symbol("secret")]: true }, { ...f.publication, sections: new Array(1) }]) assert.deepEqual(validate(p), failure);
    const throwing = { get title() { throw new Error("SQL secret evidence"); } }; assert.deepEqual(validate(throwing), failure);
    assert.deepEqual(menu.projectFoodPublicMenu(f.publication, [{ get presentation() { throw new Error("secret"); } }], f.offers, []), failure);
    for (const selection of [{ ...f.entry.selection, shortDescription: "true" }, { ...f.entry.selection, longDescription: undefined }, { ...f.entry.selection, extra: true }]) assert.deepEqual(validate({ ...f.publication, sections: [{ ...f.publication.sections[0], entries: [{ ...f.entry, selection }] }] }), failure);
    for (const selection of [{ ...f.selected[0].selection, availability: 1 }, { ...f.selected[0].selection, storageSummary: null }, { ...f.selected[0].selection, extra: true }]) assert.deepEqual(validate({ ...f.publication, sections: [{ ...f.publication.sections[0], entries: [{ ...f.entry, offers: [{ ...f.selected[0], selection }] }] }] }), failure);
    assert.deepEqual(menu.validateFoodServingOfferAvailability({ get offer() { throw new Error("secret"); } }), failure);
});
test("text and collection limits are inclusive and reject oversize without truncation", () => {
    const f = fixture(); const validate = (p: unknown, ps: unknown = f.presentations, os: unknown = f.offers) => menu.validateFoodMenuPublication(p, ps, os);
    for (const title of ["x".repeat(160), "🍚".repeat(80)]) value(validate({ ...f.publication, title }));
    for (const title of ["x".repeat(161), " x", "", "x "]) assert.deepEqual(validate({ ...f.publication, title }), failure);
    const section = f.publication.sections[0];
    value(validate({ ...f.publication, sections: [{ ...section, key: "x".repeat(128), title: "x".repeat(160) }] }));
    for (const s of [{ ...section, key: "x".repeat(129) }, { ...section, key: "x:y" }, { ...section, title: "x".repeat(161) }]) assert.deepEqual(validate({ ...f.publication, sections: [s] }), failure);
    value(validate({ ...f.publication, sections: Array.from({ length: 20 }, (_, i) => ({ key: `s${i}`, title: "Section", entries: [] })) }));
    assert.deepEqual(validate({ ...f.publication, sections: Array.from({ length: 21 }, (_, i) => ({ key: `s${i}`, title: "Section", entries: [] })) }), failure);
    const ps = Array.from({ length: 100 }, (_, i) => ({ ...f.presentations[0], presentation: { ...f.presentation, dishId: createFoodDishId(`d${i}`) } }));
    const entries = ps.map(c => ({ ...f.entry, presentation: { dishId: c.presentation.dishId, version: 4 }, offers: [] }));
    value(validate({ ...f.publication, sections: [{ ...section, entries }] }, ps, []));
    assert.deepEqual(validate({ ...f.publication, sections: [{ ...section, entries: [...entries, entries[0]] }] }, ps, []), failure);
    const os = Array.from({ length: 20 }, (_, i) => ({ ...f.offers[0], offerId: createFoodServingOfferId(`o${i}`) }));
    const offers = os.map(o => ({ ...f.selected[0], offer: { offerId: o.offerId, version: o.version } }));
    value(validate({ ...f.publication, sections: [{ ...section, entries: [{ ...f.entry, offers }] }] }, f.presentations, os));
    assert.deepEqual(validate({ ...f.publication, sections: [{ ...section, entries: [{ ...f.entry, offers: [...offers, offers[0]] }] }] }, f.presentations, os), failure);
    const refs = Array.from({ length: 20 }, (_, i) => ({ reference: `media/${i}` })); f.presentation.mediaReferences = refs; f.entry.selection.mediaReferences = refs.map(m => m.reference); value(validate(f.publication));
    f.entry.selection.mediaReferences.push("media/extra"); assert.deepEqual(validate(f.publication), failure);
    assert.deepEqual(validate(f.publication, new Array(2001), []), failure);
    assert.deepEqual(validate(f.publication, f.presentations, new Array(40001)), failure);
    assert.deepEqual(menu.projectFoodPublicMenu(f.publication, f.presentations, f.offers, new Array(40001)), failure);
});
test("validated records and projections are detached frozen deterministic and accept frozen inputs", () => {
    const f = fixture(); f.selected[0].selection.packagingDescription = true;
    const validated = menu.validateFoodMenuPublication(f.publication, f.presentations, f.offers); frozen(validated);
    const observed = menu.validateFoodServingOfferAvailability(f.availabilities[0]); frozen(observed);
    const out = projection(f); frozen(out);
    assert.notEqual(out.sections[0].entries[0].offers[0].format, f.offers[0].format);
    assert.notEqual(out.sections[0].entries[0].offers[0].availability, f.availabilities[0]);
    assert.deepEqual(projection(f, value(validated), [value(observed)]).sections[0].entries[0].offers[0], out.sections[0].entries[0].offers[0]);
    assert.deepEqual(projection(f), out);
    f.availabilities[0].state = "sold-out"; f.presentation.name = "Changed"; f.entry.selection.shortDescription = true;
    assert.equal(out.sections[0].entries[0].name, "Rice"); assert.equal(out.sections[0].entries[0].offers[0].availability?.state, "available");
    assert.throws(() => { (out.sections[0] as { title: string }).title = "Changed"; });
});
test("source isolation imports only food domain authority and has no runtime or I/O", () => {
    const source = readFileSync(new URL("./menu-publication-domain.ts", import.meta.url), "utf8");
    assert.deepEqual([...source.matchAll(/from\s+"([^"]+)"/g)].map(m => m[1]), ["./draft-domain", "./dish-offer-domain"]);
    assert.doesNotMatch(source, /cloudflare:workers|node:|fetch\(|Date\.|Math\.random|process\.|FormData|wrangler|Stripe|session|insurance|sesh/i);
});
