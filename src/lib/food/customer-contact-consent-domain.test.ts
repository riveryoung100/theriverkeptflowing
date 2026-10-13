import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import * as d from "./customer-contact-consent-domain";
import { createInitialFoodCartVersion, createInitialFoodMerchandiseQuoteVersion } from "./cart-quote-domain";
import { createInitialFoodFulfillmentIntentVersion, createInitialFoodReservationRequestVersion } from "./fulfillment-capacity-reservation-domain";
import { createInitialFoodPhysicalOrderVersion } from "./physical-order-domain";

// Synthetic fixtures only; .invalid addresses and opaque fixture references.
const contact = () => ({ displayName: "Synthetic contact", email: "Case@Example.invalid", phone: "+0 (000) 000-0000" });
const customer = () => ({ id: d.createFoodCustomerId("synthetic"), version: 1, account: { principalId: "principal:synthetic" }, contact: contact() });
const consent = () => ({ id: d.createFoodContactConsentId("synthetic"), version: 1, purpose: "order-service", target: { channel: "email", email: contact().email }, status: "granted", evidence: { sourceReference: "fixture:synthetic", occurredOn: "2026-10-13" } });
function order() {
    const s = { id: "food-sku:synthetic-g", version: 1, servingOffer: { offerId: "food-serving-offer:synthetic-g", version: 1 }, package: { id: "food-package-definition:synthetic-g", version: 1 } };
    const cart = createInitialFoodCartVersion({ id: "food-cart:synthetic-g", version: 1, lines: [{ sku: { id: s.id, version: 1 }, quantity: 1 }] });
    const price = { id: "food-approved-commercial-price:synthetic-g", version: 1, sku: { id: s.id, version: 1 }, money: { currency: "USD", minorUnits: 123 }, approval: { attribution: "fixture", sourceReference: "fixture:g", approvedOn: "2026-10-13" } };
    const q = createInitialFoodMerchandiseQuoteVersion({ id: "food-merchandise-quote:synthetic-g", version: 1 }, cart, [s], [price]);
    const f = createInitialFoodFulfillmentIntentVersion({ id: "food-fulfillment-intent:synthetic-g", version: 1 }, q, { method: "meetup", locationReference: "fixture:location", windowReference: "fixture:window" });
    const r = createInitialFoodReservationRequestVersion({ id: "food-reservation-request:synthetic-g", version: 1 }, q, f);
    return createInitialFoodPhysicalOrderVersion({ id: "food-physical-order:synthetic-g", version: 1 }, q, f, r);
}
const association = () => ({ id: d.createFoodOrderContactAssociationId("synthetic"), version: 1, order: { id: order().id, version: 1 }, contact: contact() });

test("distinct supplied branded identities and positive versions", () => {
    for (const [create, parse] of [[d.createFoodCustomerId, d.parseFoodCustomerId], [d.createFoodContactConsentId, d.parseFoodContactConsentId], [d.createFoodOrderContactAssociationId, d.parseFoodOrderContactAssociationId]]) {
        assert.equal(parse(create("synthetic")), create("synthetic"));
        for (const bad of [null, 1, "", " a", "a ", "a:b", "x".repeat(129)]) assert.throws(() => create(bad));
        assert.throws(() => parse("principal:synthetic"));
    }
    for (const version of [0, -1, 1.5, "latest", Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => d.validateFoodCustomerVersion({ ...customer(), version }));
    assert.throws(() => d.createInitialFoodCustomerVersion({ ...customer(), version: 2 }));
});
test("contacts retain exact strings, with bounded fields and no normalization/ownership", () => {
    assert.deepEqual(d.validateFoodContactSnapshot(contact()), contact());
    for (const bad of [{}, null, { email: " padded " }, { phone: "" }, { displayName: "x".repeat(201) }, { email: "x".repeat(321) }, { phone: "x".repeat(65) }]) assert.throws(() => d.validateFoodContactSnapshot(bad));
    assert.deepEqual(d.validateFoodContactSnapshot({ displayName: "Synthetic" }), { displayName: "Synthetic" });
    const a = d.createInitialFoodCustomerVersion(customer()); const b = d.createInitialFoodCustomerVersion({ ...customer(), id: d.createFoodCustomerId("different") }); assert.notEqual(a.id, b.id);
    assert.equal("verifiedEmail" in a, false); assert.equal("marketingAllowed" in a, false);
});
test("account is only parsed PrincipalId; stable linkage includes stable absence", () => {
    const v = d.createInitialFoodCustomerVersion(customer()); assert.equal(v.account?.principalId, "principal:synthetic"); assert.notEqual(String(v.id), String(v.account?.principalId));
    assert.throws(() => d.validateFoodCustomerVersion({ ...customer(), account: { principalId: "food-customer:synthetic" } }));
    const next = d.reviseFoodCustomerVersion(v, { ...customer(), version: 2, contact: { email: "Other@Example.invalid" } }); assert.equal(next.version, 2); assert.deepEqual(v.contact, contact());
    for (const account of [undefined, { principalId: "principal:other" }]) assert.throws(() => d.reviseFoodCustomerVersion(v, { ...customer(), version: 2, account }));
    const guest = { id: customer().id, version: 1 }; assert.throws(() => d.reviseFoodCustomerVersion(guest, { ...customer(), version: 2 }));
    assert.throws(() => d.reviseFoodCustomerVersion(v, { ...customer(), version: 3 }));
    assert.throws(() => d.reviseFoodCustomerVersion(v, { ...customer(), version: 2, id: d.createFoodCustomerId("other") }));
});
test("guest exact order association needs no durable customer or account", () => {
    const v = d.createInitialFoodOrderContactAssociationVersion(association(), order()); assert.equal("customer" in v, false); assert.equal("account" in v, false);
    for (const ref of [{ id: "food-physical-order:other", version: 1 }, { id: order().id, version: 2 }]) assert.throws(() => d.validateFoodOrderContactAssociationAgainstSources({ ...association(), order: ref }, order()));
    assert.throws(() => d.validateFoodOrderContactAssociationAgainstSources(association(), {}));
    assert.throws(() => d.validateFoodOrderContactAssociationAgainstSources(association(), order(), customer()));
});
test("exact customer source required, recipient contact independent; history never retargets", () => {
    const c = d.createInitialFoodCustomerVersion(customer()); const input = { ...association(), customer: { id: c.id, version: c.version }, contact: { email: "Recipient@Example.invalid" } };
    const old = d.createInitialFoodOrderContactAssociationVersion(input, order(), c); assert.notDeepEqual(old.contact, c.contact);
    assert.throws(() => d.validateFoodOrderContactAssociationAgainstSources(input, order()));
    for (const changed of [{ ...customer(), version: 2 }, { ...customer(), id: d.createFoodCustomerId("other") }]) assert.throws(() => d.validateFoodOrderContactAssociationAgainstSources(input, order(), changed));
    d.reviseFoodCustomerVersion(c, { ...customer(), version: 2, contact: { phone: "synthetic-new" } }); assert.equal(old.contact.email, "Recipient@Example.invalid"); assert.equal(old.customer?.version, 1);
    const next = d.reviseFoodOrderContactAssociationVersion(old, { ...association(), version: 2 }); assert.equal(next.customer, undefined); assert.equal(old.customer?.version, 1);
    for (const o of [{ id: order().id, version: 2 }, { id: "food-physical-order:other", version: 1 }]) assert.throws(() => d.reviseFoodOrderContactAssociationVersion(old, { ...input, version: 2, order: o }));
    assert.throws(() => d.reviseFoodOrderContactAssociationVersion(old, { ...input, version: 3 }));
});
test("consent purposes/targets are exact assertions; service grant never implies marketing", () => {
    const v = d.createInitialFoodContactConsentVersion(consent()); assert.equal(v.purpose, "order-service"); assert.equal("marketingAllowed" in v, false);
    for (const purpose of ["all", undefined]) assert.throws(() => d.validateFoodContactConsentVersion({ ...consent(), purpose }));
    for (const status of ["unknown", undefined, true]) assert.throws(() => d.validateFoodContactConsentVersion({ ...consent(), status }));
    for (const target of [{ channel: "phone", phone: "synthetic" }, { channel: "email", phone: "synthetic" }, { channel: "sms", email: contact().email }, { channel: "email", email: contact().email, phone: contact().phone }]) assert.throws(() => d.validateFoodContactConsentVersion({ ...consent(), target }));
    assert.equal(d.createInitialFoodContactConsentVersion({ ...consent(), purpose: "marketing", target: { channel: "sms", phone: contact().phone } }).target.channel, "sms");
});
test("consent revisions require fresh supplied status/evidence, stable purpose/target", () => {
    const old = d.createInitialFoodContactConsentVersion(consent()); const n = { ...consent(), version: 2, status: "revoked" };
    assert.equal(d.reviseFoodContactConsentVersion(old, n).status, "revoked"); assert.equal(old.status, "granted");
    for (const changed of [{ ...n, purpose: "marketing" }, { ...n, target: { channel: "sms", phone: contact().phone } }, { ...n, target: { channel: "email", email: "Other@Example.invalid" } }, { ...n, evidence: undefined }, { ...n, status: undefined }, { ...n, version: 3 }]) assert.throws(() => d.reviseFoodContactConsentVersion(old, changed));
    assert.throws(() => d.validateFoodContactConsentVersion({ ...consent(), evidence: { sourceReference: "fixture", occurredOn: "2026-02-30" } }));
    assert.throws(() => d.validateFoodContactConsentVersion({ ...consent(), evidence: { sourceReference: "", occurredOn: "2026-10-13" } }));
});
test("all nested customer/consent/association values detached and frozen", () => {
    const c = customer(); const cv = d.createInitialFoodCustomerVersion(c); c.contact.email = "changed"; c.account.principalId = "principal:changed"; assert.deepEqual(cv.contact, contact());
    const s = consent(); const sv = d.createInitialFoodContactConsentVersion(s); s.target.email = "changed"; s.evidence.sourceReference = "changed"; assert.equal(sv.evidence.sourceReference, "fixture:synthetic");
    const a = association(); const av = d.createInitialFoodOrderContactAssociationVersion(a, order()); a.contact.phone = "changed"; a.order.version = 9; assert.equal(av.order.version, 1); assert.deepEqual(av.contact, contact());
    for (const v of [cv, cv.account, cv.contact, sv, sv.target, sv.evidence, av, av.order, av.contact]) assert(Object.isFrozen(v));
});
test("unknown authority/sensitive fields rejected; no provider/runtime/clock dependencies", async () => {
    for (const key of ["authenticated", "verifiedEmail", "verifiedPhone", "canReadOrders", "canModifyOrder", "paymentAuthorized", "paid", "dispatchReady", "marketingAllowed", "rewardsEligible", "household", "height", "weight", "calorieTarget", "deliveryAddress"]) {
        assert.throws(() => d.validateFoodCustomerVersion({ ...customer(), [key]: true })); assert.throws(() => d.validateFoodContactSnapshot({ ...contact(), [key]: true }));
        assert.throws(() => d.validateFoodContactConsentVersion({ ...consent(), [key]: true })); assert.throws(() => d.validateFoodOrderContactAssociationVersion({ ...association(), [key]: true }));
    }
    assert.throws(() => d.validateFoodCustomerVersion({ ...customer(), [Symbol("extra")]: true }));
    const source = await readFile(new URL("./customer-contact-consent-domain.ts", import.meta.url), "utf8"); assert.doesNotMatch(source, /Date\.now|new Date|process\.env|fetch\(|Math\.random|node:fs|session\/|authentication\/|cloudflare|D1Database/);
});
