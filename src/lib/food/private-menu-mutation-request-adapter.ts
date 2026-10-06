import type { FoodMenuMutationRequestBoundary, FoodMenuMutationRequestEnvelope, FoodMenuMutationRequestResult } from "./private-menu-mutation-request";

export interface FoodMenuMutationRequestAdapterInput {
    readonly boundary: FoodMenuMutationRequestBoundary;
}
export interface FoodMenuMutationRequestAdapter {
    submit(request: Request): Promise<FoodMenuMutationRequestResult>;
}

/** No Request body state is accessed until the authorized consumer advances this generator. */
async function* body(request: Request): AsyncIterable<Uint8Array> {
    if (request.bodyUsed) throw new Error("Private food menu request body is unavailable.");
    const stream = request.body;
    if (stream === null) return;
    const reader = stream.getReader();
    let complete = false;
    try {
        while (true) {
            const next = await reader.read();
            if (next.done) { complete = true; return; }
            yield next.value;
        }
    } finally {
        if (!complete) { try { await reader.cancel(); } catch { /* Preserve the consumer/read failure. */ } }
        try { reader.releaseLock(); } catch { /* Cleanup cannot replace the original result. */ }
    }
}

/** Native request adaptation only; policy, authorization and parsing remain in the injected boundary. */
export function createPrivateFoodMenuMutationRequestAdapter(input: FoodMenuMutationRequestAdapterInput): Readonly<FoodMenuMutationRequestAdapter> {
    let boundary: FoodMenuMutationRequestBoundary;
    let submit: FoodMenuMutationRequestBoundary["submit"];
    try {
        if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError();
        boundary = input.boundary;
        if (!boundary || typeof boundary !== "object" || Array.isArray(boundary)) throw new TypeError();
        submit = boundary.submit;
        if (typeof submit !== "function") throw new TypeError();
    } catch { throw new TypeError("Private food menu request adapter configuration is unavailable."); }
    return Object.freeze({
        async submit(request: Request): Promise<FoodMenuMutationRequestResult> {
            const envelope: FoodMenuMutationRequestEnvelope = {
                get method() { return request.method; },
                get origin() { return request.headers.get("Origin"); },
                get contentType() { return request.headers.get("Content-Type"); },
                get contentLength() { return request.headers.get("Content-Length") ?? undefined; },
                readBody() { return body(request); },
            };
            try { return await submit.call(boundary, envelope); }
            catch { return Object.freeze({ ok: false, error: Object.freeze({ code: "callback-failed", message: "Private food menu operation could not be completed." }) }); }
        },
    });
}
