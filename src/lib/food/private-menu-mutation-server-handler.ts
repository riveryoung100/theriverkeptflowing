import type { FoodMenuMutationRequestAdapter } from "./private-menu-mutation-request-adapter";
import type { FoodMenuMutationRequestResult } from "./private-menu-mutation-request";
import { createPrivateFoodMenuMutationResponse } from "./private-menu-mutation-response";

export interface FoodMenuMutationServerHandlerInput {
    readonly adapter: FoodMenuMutationRequestAdapter;
}
export interface FoodMenuMutationServerHandler {
    handle(request: Request): Promise<Response>;
}

/** Composes existing adaptation and response mapping without acquiring runtime capabilities. */
export function createPrivateFoodMenuMutationServerHandler(input: FoodMenuMutationServerHandlerInput): Readonly<FoodMenuMutationServerHandler> {
    let adapter: FoodMenuMutationRequestAdapter;
    let submit: FoodMenuMutationRequestAdapter["submit"];
    try {
        if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError();
        adapter = input.adapter;
        if (!adapter || typeof adapter !== "object" || Array.isArray(adapter)) throw new TypeError();
        submit = adapter.submit;
        if (typeof submit !== "function") throw new TypeError();
    } catch { throw new TypeError("Private food menu mutation server handler configuration is unavailable."); }
    return Object.freeze({
        async handle(request: Request): Promise<Response> {
            let result: FoodMenuMutationRequestResult;
            try { result = await submit.call(adapter, request); }
            catch {
                result = Object.freeze({ ok: false, error: Object.freeze({ code: "callback-failed", message: "Private food menu operation could not be completed." }) });
            }
            return createPrivateFoodMenuMutationResponse(result);
        },
    });
}
