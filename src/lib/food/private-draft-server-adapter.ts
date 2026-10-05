import { AstroPrincipalSessionStore } from "../identity/session/astro-session-adapter";
import { DefaultSessionPrincipalResolver } from "../identity/session/principal-resolver";
import type { AstroSessionLike } from "../identity/session/contracts";
import { D1PrincipalRepository } from "../identity/cloudflare/d1-principal-repository";
import type { IdentityD1DatabaseLike } from "../identity/cloudflare/types";
import { createPrivateFoodDraftRuntimeFromEnvironment, type FoodPrivateDraftRuntimeEnvironment } from "./private-draft-runtime-acquisition";
import type { FoodPrivateDraftRuntimeCompositionResult } from "./private-draft-runtime-composition";

export interface FoodPrivateDraftServerContextInput {
    readonly environment: FoodPrivateDraftRuntimeEnvironment & { readonly RIVER_IDENTITY_DB?: unknown };
    readonly session: AstroSessionLike;
    readonly now?: () => Date;
}

function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Invalid dependency shape");
    return value as Record<string, unknown>;
}

/** The caller supplies trusted environment provenance and the request's session; construction performs structural checks only. */
export function createPrivateFoodDraftRuntimeFromServerContext(input: FoodPrivateDraftServerContextInput): FoodPrivateDraftRuntimeCompositionResult {
    try {
        const supplied = object(input);
        const environment = object(supplied.environment);
        const session = object(supplied.session);
        const database = object(environment.RIVER_IDENTITY_DB);
        const now = supplied.now;
        for (const method of ["get", "set", "delete", "regenerate", "destroy"] as const) {
            if (typeof session[method] !== "function") throw new TypeError("Invalid session methods");
        }
        if (typeof database.prepare !== "function" || (now !== undefined && typeof now !== "function")) throw new TypeError("Invalid dependency methods");
        const sessions = new AstroPrincipalSessionStore(session as unknown as AstroSessionLike, now as (() => Date) | undefined);
        const principals = new D1PrincipalRepository(database as unknown as IdentityD1DatabaseLike);
        const callerResolver = new DefaultSessionPrincipalResolver({ sessions, principals });
        return createPrivateFoodDraftRuntimeFromEnvironment({ environment, callerResolver });
    } catch {
        return Object.freeze({ ok: false, error: Object.freeze({ code: "configuration-unavailable", message: "Food draft runtime configuration is unavailable." }) });
    }
}
