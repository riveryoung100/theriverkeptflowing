/** FOOD-005G: private supplied identity/contact assertions, never authorization. */
import { parsePrincipalId, type PrincipalId } from "../identity/identifiers";
import { validateFoodVersion, validateFoodReviewDate } from "./draft-domain";
import { parseFoodPhysicalOrderId, validateFoodPhysicalOrderVersion, type FoodPhysicalOrderId } from "./physical-order-domain";

export type FoodCustomerId = string & { readonly __brand: "FoodCustomerId" };
export type FoodContactConsentId = string & { readonly __brand: "FoodContactConsentId" };
export type FoodOrderContactAssociationId = string & { readonly __brand: "FoodOrderContactAssociationId" };
export interface FoodContactSnapshot { readonly displayName?: string; readonly email?: string; readonly phone?: string }
export interface FoodCustomerVersion {
    readonly id: FoodCustomerId; readonly version: number;
    readonly account?: Readonly<{ principalId: PrincipalId }>;
    readonly contact?: FoodContactSnapshot;
}
export type FoodContactConsentPurpose = "order-service" | "marketing";
export type FoodContactConsentStatus = "granted" | "denied" | "revoked";
export type FoodContactConsentTarget = Readonly<{ channel: "email"; email: string }> | Readonly<{ channel: "sms"; phone: string }>;
export interface FoodContactConsentVersion {
    readonly id: FoodContactConsentId; readonly version: number;
    readonly purpose: FoodContactConsentPurpose; readonly target: FoodContactConsentTarget;
    readonly status: FoodContactConsentStatus;
    readonly evidence: Readonly<{ sourceReference: string; occurredOn: string }>;
}
export interface FoodOrderContactAssociationVersion {
    readonly id: FoodOrderContactAssociationId; readonly version: number;
    readonly order: Readonly<{ id: FoodPhysicalOrderId; version: number }>;
    readonly customer?: Readonly<{ id: FoodCustomerId; version: number }>;
    readonly contact: FoodContactSnapshot;
}
function record(v: unknown, allowed: readonly string[]): Record<string, unknown> {
    if (!v || typeof v !== "object" || Array.isArray(v) || Reflect.ownKeys(v).some(k => typeof k !== "string" || !allowed.includes(k))) throw new TypeError("Invalid FOOD contact record");
    return v as Record<string, unknown>;
}
function text(v: unknown, max: number): string {
    if (typeof v !== "string" || !v.length || v.trim() !== v || v.length > max) throw new TypeError("Invalid bounded contact text"); return v;
}
function identity(v: unknown, prefix: string, parse = false): string {
    const s = text(v, parse ? prefix.length + 129 : 128); const local = parse ? s.slice(prefix.length + 1) : s;
    if ((parse && !s.startsWith(prefix + ":")) || !local.length || local.length > 128 || local.trim() !== local || local.includes(":")) throw new TypeError("Invalid FOOD contact identity");
    return `${prefix}:${local}`;
}
export function createFoodCustomerId(v: unknown): FoodCustomerId { return identity(v, "food-customer") as FoodCustomerId; }
export function parseFoodCustomerId(v: unknown): FoodCustomerId { return identity(v, "food-customer", true) as FoodCustomerId; }
export function createFoodContactConsentId(v: unknown): FoodContactConsentId { return identity(v, "food-contact-consent") as FoodContactConsentId; }
export function parseFoodContactConsentId(v: unknown): FoodContactConsentId { return identity(v, "food-contact-consent", true) as FoodContactConsentId; }
export function createFoodOrderContactAssociationId(v: unknown): FoodOrderContactAssociationId { return identity(v, "food-order-contact-association") as FoodOrderContactAssociationId; }
export function parseFoodOrderContactAssociationId(v: unknown): FoodOrderContactAssociationId { return identity(v, "food-order-contact-association", true) as FoodOrderContactAssociationId; }
function initial(version: number): void { if (version !== 1) throw new TypeError("Initial version must be one"); }
function revision(previous: { id: string; version: number }, next: { id: string; version: number }): void {
    if (previous.id !== next.id || previous.version === Number.MAX_SAFE_INTEGER || next.version !== previous.version + 1) throw new TypeError("Invalid consecutive contact revision");
}
export function validateFoodContactSnapshot(input: unknown): FoodContactSnapshot {
    const r = record(input, ["displayName", "email", "phone"]);
    if (r.displayName === undefined && r.email === undefined && r.phone === undefined) throw new TypeError("Empty contact snapshot");
    return Object.freeze({ ...(r.displayName === undefined ? {} : { displayName: text(r.displayName, 200) }),
        ...(r.email === undefined ? {} : { email: text(r.email, 320) }), ...(r.phone === undefined ? {} : { phone: text(r.phone, 64) }) });
}
export function validateFoodCustomerVersion(input: unknown): FoodCustomerVersion {
    const r = record(input, ["id", "version", "account", "contact"]);
    const account = r.account === undefined ? undefined : Object.freeze({ principalId: parsePrincipalId(record(r.account, ["principalId"]).principalId) });
    return Object.freeze({ id: parseFoodCustomerId(r.id), version: validateFoodVersion(r.version),
        ...(account === undefined ? {} : { account }), ...(r.contact === undefined ? {} : { contact: validateFoodContactSnapshot(r.contact) }) });
}
export function createInitialFoodCustomerVersion(input: unknown): FoodCustomerVersion { const v = validateFoodCustomerVersion(input); initial(v.version); return v; }
export function reviseFoodCustomerVersion(previousInput: unknown, nextInput: unknown): FoodCustomerVersion {
    const p = validateFoodCustomerVersion(previousInput); const n = validateFoodCustomerVersion(nextInput); revision(p, n);
    if (p.account?.principalId !== n.account?.principalId) throw new TypeError("Account linkage must remain stable"); return n;
}
export function validateFoodContactConsentVersion(input: unknown): FoodContactConsentVersion {
    const r = record(input, ["id", "version", "purpose", "target", "status", "evidence"]);
    if (r.purpose !== "order-service" && r.purpose !== "marketing") throw new TypeError("Invalid consent purpose");
    if (r.status !== "granted" && r.status !== "denied" && r.status !== "revoked") throw new TypeError("Invalid consent status");
    const t = record(r.target, ["channel", "email", "phone"]); let target: FoodContactConsentTarget;
    if (t.channel === "email") { record(r.target, ["channel", "email"]); target = Object.freeze({ channel: "email", email: text(t.email, 320) }); }
    else if (t.channel === "sms") { record(r.target, ["channel", "phone"]); target = Object.freeze({ channel: "sms", phone: text(t.phone, 64) }); }
    else throw new TypeError("Invalid consent channel");
    const e = record(r.evidence, ["sourceReference", "occurredOn"]);
    return Object.freeze({ id: parseFoodContactConsentId(r.id), version: validateFoodVersion(r.version), purpose: r.purpose, target, status: r.status,
        evidence: Object.freeze({ sourceReference: text(e.sourceReference, 512), occurredOn: validateFoodReviewDate(e.occurredOn) }) });
}
export function createInitialFoodContactConsentVersion(input: unknown): FoodContactConsentVersion { const v = validateFoodContactConsentVersion(input); initial(v.version); return v; }
export function reviseFoodContactConsentVersion(previousInput: unknown, nextInput: unknown): FoodContactConsentVersion {
    const p = validateFoodContactConsentVersion(previousInput); const n = validateFoodContactConsentVersion(nextInput); revision(p, n);
    if (p.purpose !== n.purpose || JSON.stringify(p.target) !== JSON.stringify(n.target)) throw new TypeError("Consent purpose/target must remain stable"); return n;
}
export function validateFoodOrderContactAssociationVersion(input: unknown): FoodOrderContactAssociationVersion {
    const r = record(input, ["id", "version", "order", "customer", "contact"]); const o = record(r.order, ["id", "version"]);
    let customer: FoodOrderContactAssociationVersion["customer"];
    if (r.customer !== undefined) { const c = record(r.customer, ["id", "version"]); customer = Object.freeze({ id: parseFoodCustomerId(c.id), version: validateFoodVersion(c.version) }); }
    return Object.freeze({ id: parseFoodOrderContactAssociationId(r.id), version: validateFoodVersion(r.version),
        order: Object.freeze({ id: parseFoodPhysicalOrderId(o.id), version: validateFoodVersion(o.version) }),
        ...(customer === undefined ? {} : { customer }), contact: validateFoodContactSnapshot(r.contact) });
}
export function validateFoodOrderContactAssociationAgainstSources(input: unknown, orderInput: unknown, customerInput?: unknown): FoodOrderContactAssociationVersion {
    const v = validateFoodOrderContactAssociationVersion(input); const o = validateFoodPhysicalOrderVersion(orderInput);
    if (v.order.id !== o.id || v.order.version !== o.version) throw new TypeError("Exact order mismatch");
    if (v.customer) {
        const c = validateFoodCustomerVersion(customerInput);
        if (v.customer.id !== c.id || v.customer.version !== c.version) throw new TypeError("Exact customer mismatch");
    } else if (customerInput !== undefined) throw new TypeError("Unused customer source");
    return v;
}
export function createInitialFoodOrderContactAssociationVersion(input: unknown, orderInput: unknown, customerInput?: unknown): FoodOrderContactAssociationVersion {
    const v = validateFoodOrderContactAssociationAgainstSources(input, orderInput, customerInput); initial(v.version); return v;
}
export function reviseFoodOrderContactAssociationVersion(previousInput: unknown, nextInput: unknown): FoodOrderContactAssociationVersion {
    const p = validateFoodOrderContactAssociationVersion(previousInput); const n = validateFoodOrderContactAssociationVersion(nextInput); revision(p, n);
    if (p.order.id !== n.order.id || p.order.version !== n.order.version) throw new TypeError("Exact order binding must remain stable"); return n;
}
