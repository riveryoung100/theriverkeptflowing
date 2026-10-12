/** Inert FOOD-004B transport; future trusted composition supplies exact selection. */
import { validateFoodVersion } from "./draft-domain";
import { parseFoodMenuPublicationId, type FoodMenuPublicationId } from "./menu-publication-domain";
import type { FoodPublicMenuReadService } from "./public-menu-read-service";

export interface FoodExactPublicMenuReference { readonly publicationId: FoodMenuPublicationId; readonly version: number }
export interface FoodPublicMenuPublicationSelector { select(): FoodExactPublicMenuReference | null }
export interface FoodPublicMenuTransportRequest { readonly method: string }
export interface FoodPublicMenuTransportResponse {
    readonly status: 200 | 400 | 404 | 405 | 503;
    readonly headers: Readonly<Record<string, string>>;
    readonly body?: string;
}
export interface FoodPublicMenuTransport { read(request: FoodPublicMenuTransportRequest): Promise<FoodPublicMenuTransportResponse> }
export interface FoodPublicMenuTransportDependencies {
    readonly selector: FoodPublicMenuPublicationSelector;
    readonly service: FoodPublicMenuReadService;
}
function record(value: unknown, keys: readonly string[]): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError();
    const own = Reflect.ownKeys(value);
    if (keys.some(k => !own.includes(k)) || own.some(k => typeof k !== "string" || !keys.includes(k))) throw new TypeError();
    return value as Record<string, unknown>;
}
function response(status: FoodPublicMenuTransportResponse["status"], head: boolean, body?: string): FoodPublicMenuTransportResponse {
    const headers: Record<string, string> = { "Content-Type": "application/json; charset=utf-8" };
    if (status === 405) headers.Allow = "GET, HEAD";
    return Object.freeze({ status, headers: Object.freeze(headers), ...(head ? {} : { body }) });
}
function failure(status: 400 | 404 | 405 | 503, head: boolean): FoodPublicMenuTransportResponse {
    const error = { 400: "invalid-request", 404: "menu-not-found", 405: "method-not-allowed", 503: "menu-unavailable" }[status];
    return response(status, head, head ? undefined : JSON.stringify({ error }));
}
export function createFoodPublicMenuTransport(dependencies: FoodPublicMenuTransportDependencies): FoodPublicMenuTransport {
    let selector: FoodPublicMenuPublicationSelector; let service: FoodPublicMenuReadService;
    let select: FoodPublicMenuPublicationSelector["select"]; let read: FoodPublicMenuReadService["readPublicMenu"];
    try {
        selector = dependencies.selector; service = dependencies.service;
        select = selector.select; read = service.readPublicMenu;
        if (typeof select !== "function" || typeof read !== "function") throw new TypeError();
    } catch { throw new TypeError("Public food menu transport configuration is unavailable."); }
    return Object.freeze({ async read(request: FoodPublicMenuTransportRequest): Promise<FoodPublicMenuTransportResponse> {
        let head = false;
        try {
            if (!request || typeof request !== "object" || Array.isArray(request)) throw new TypeError();
            const method = request.method; head = method === "HEAD";
            record(request, ["method"]);
            if (typeof method !== "string") throw new TypeError();
            if (method !== "GET" && method !== "HEAD") return failure(405, false);
        } catch { return failure(400, head); }
        try {
            const selected = record(select.call(selector), ["publicationId", "version"]);
            const reference = Object.freeze({ publicationId: parseFoodMenuPublicationId(selected.publicationId), version: validateFoodVersion(selected.version) });
            const result = await read.call(service, reference);
            if (!result || typeof result !== "object") throw new TypeError();
            if (result.status === "found") {
                record(result, ["status", "menu"]);
                if (head) return response(200, true);
                const body = JSON.stringify(result.menu);
                if (typeof body !== "string") throw new TypeError();
                return response(200, head, body);
            }
            record(result, ["status"]);
            switch (result.status) {
                case "invalid-input": return failure(400, head);
                case "not-found": case "not-published": return failure(404, head);
                case "unavailable": return failure(503, head);
                default: return failure(503, head);
            }
        } catch { return failure(503, head); }
    } });
}
