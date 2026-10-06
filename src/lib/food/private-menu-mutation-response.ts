import { FOOD_MENU_MUTATION_TRANSPORT_MESSAGES, type FoodMenuMutationRequestResult } from "./private-menu-mutation-request";
import { FOOD_MENU_WORKSPACE_FEEDBACK } from "./private-menu-workspace";

const failures = Object.freeze({
    "method-not-allowed": [405, FOOD_MENU_MUTATION_TRANSPORT_MESSAGES["method-not-allowed"]],
    "origin-rejected": [403, FOOD_MENU_MUTATION_TRANSPORT_MESSAGES["origin-rejected"]],
    "unsupported-content-type": [415, FOOD_MENU_MUTATION_TRANSPORT_MESSAGES["unsupported-content-type"]],
    "payload-too-large": [413, FOOD_MENU_MUTATION_TRANSPORT_MESSAGES["payload-too-large"]],
    "invalid-request": [400, FOOD_MENU_MUTATION_TRANSPORT_MESSAGES["invalid-request"]],
    "body-unavailable": [400, FOOD_MENU_MUTATION_TRANSPORT_MESSAGES["body-unavailable"]],
    unauthenticated: [401, FOOD_MENU_WORKSPACE_FEEDBACK.unauthenticated],
    forbidden: [403, FOOD_MENU_WORKSPACE_FEEDBACK.forbidden],
    "access-unavailable": [503, FOOD_MENU_WORKSPACE_FEEDBACK["access-unavailable"]],
    "invalid-input": [400, FOOD_MENU_WORKSPACE_FEEDBACK["invalid-input"]],
    storage: [503, FOOD_MENU_WORKSPACE_FEEDBACK.storage],
    "callback-failed": [500, "Private food menu operation could not be completed."],
} as const);
const outcomes = Object.freeze({
    created: [201, "Snapshot recorded."],
    "already-present": [200, "Identical snapshot already recorded."],
    conflict: [409, "A different version already exists. Refresh and reconcile before retrying."],
} as const);
function record(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError();
    return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): void {
    const own = Reflect.ownKeys(value);
    if (required.some(key => !own.includes(key)) || own.some(key => typeof key !== "string" || !required.includes(key) && !optional.includes(key))) throw new TypeError();
}
function failure(code: keyof typeof failures) {
    const [status, message] = failures[code];
    return { status, body: { ok: false, error: { code, message } }, allow: code === "method-not-allowed" };
}
function project(input: unknown) {
    const result = record(input), ok = result.ok;
    if (ok === false) {
        keys(result, ["ok", "error"]);
        const error = record(result.error);
        keys(error, ["code", "message"]);
        const code = error.code, message = error.message;
        if (typeof code !== "string" || !Object.hasOwn(failures, code) || typeof message !== "string") throw new TypeError();
        return failure(code as keyof typeof failures);
    }
    if (ok !== true) throw new TypeError();
    keys(result, ["ok", "value"]);
    const value = record(result.value), outcome = value.outcome;
    if (typeof outcome !== "string" || !Object.hasOwn(outcomes, outcome)) throw new TypeError();
    keys(value, outcome === "conflict" ? ["outcome", "message"] : ["outcome", "snapshot", "message"], outcome === "conflict" ? [] : ["publicationLabel"]);
    if (typeof value.message !== "string") throw new TypeError();
    // Snapshot and publication-label values are deliberately never accessed.
    const [status, message] = outcomes[outcome as keyof typeof outcomes];
    return { status, body: { ok: true, value: { outcome, message } }, allow: false };
}

/** Maps only materialized transport results; performs no authorization or storage work. */
export function createPrivateFoodMenuMutationResponse(result: FoodMenuMutationRequestResult): Response {
    let projection;
    try { projection = project(result); }
    catch { projection = failure("callback-failed"); }
    const headers: Record<string, string> = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
    if (projection.allow) headers.Allow = "POST";
    return new Response(JSON.stringify(projection.body), { status: projection.status, headers });
}
