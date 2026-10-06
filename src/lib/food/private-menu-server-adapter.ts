import { parsePrincipalId, type PrincipalId } from "../identity/identifiers";
import type { AstroSessionLike } from "../identity/session/contracts";
import { AstroPrincipalSessionStore } from "../identity/session/astro-session-adapter";
import { DefaultSessionPrincipalResolver } from "../identity/session/principal-resolver";
import { D1PrincipalRepository } from "../identity/cloudflare/d1-principal-repository";
import type { IdentityD1DatabaseLike } from "../identity/cloudflare/types";
import type { FoodMenuReadDependencies } from "./menu-persistence";
import { acquirePrivateFoodMenuDatabaseFromEnvironment } from "./private-menu-runtime-acquisition";
import { createPrivateFoodMenuRuntimeComposition, createPrivateFoodMenuOperationRuntimeComposition, type FoodPrivateMenuRuntimeCapabilities, type FoodPrivateMenuOperationRuntimeCapabilities, type FoodPrivateMenuRuntimeCompositionInput } from "./private-menu-runtime-composition";

export interface FoodPrivateMenuServerContextInput {
    readonly environment: Readonly<Record<string, unknown>>;
    readonly bindingName: string;
    readonly session: AstroSessionLike;
    readonly readDependencies: FoodMenuReadDependencies;
    readonly administratorPrincipalId: PrincipalId;
    readonly now?: () => Date;
}
export type FoodPrivateMenuServerContextResult = Readonly<
    { ok: true; value: FoodPrivateMenuRuntimeCapabilities } |
    { ok: false; error: Readonly<{ code: "configuration-unavailable"; message: "Food menu database configuration is unavailable." }> }
>;
export type FoodPrivateMenuOperationServerContextResult = Readonly<
    { ok: true; value: FoodPrivateMenuOperationRuntimeCapabilities } |
    { ok: false; error: Readonly<{ code: "configuration-unavailable"; message: "Food menu database configuration is unavailable." }> }
>;
function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError();
    return value as Record<string, unknown>;
}

/** Trusted inputs are supplied by the caller; assembly does not authenticate or probe storage. */
function fromContext<T extends FoodPrivateMenuRuntimeCapabilities>(input: FoodPrivateMenuServerContextInput, compose: (input: FoodPrivateMenuRuntimeCompositionInput) => T): Readonly<{ ok: true; value: T } | { ok: false; error: Readonly<{ code: "configuration-unavailable"; message: "Food menu database configuration is unavailable." }> }> {
    try {
        const supplied = object(input);
        const environmentValue = supplied.environment;
        const bindingName = supplied.bindingName;
        const sessionValue = supplied.session;
        const readDependenciesValue = supplied.readDependencies;
        const administratorValue = supplied.administratorPrincipalId;
        const now = supplied.now;
        const environment = object(environmentValue);
        const session = object(sessionValue);
        const readDependencies = object(readDependenciesValue);
        const identityDatabase = object(environment.RIVER_IDENTITY_DB);
        for (const method of ["get", "set", "delete", "regenerate", "destroy"] as const) {
            if (typeof session[method] !== "function") throw new TypeError();
        }
        if (typeof identityDatabase.prepare !== "function" || typeof readDependencies.getProduct !== "function" || typeof readDependencies.getRecipe !== "function" || (now !== undefined && typeof now !== "function")) throw new TypeError();
        const administratorPrincipalId = parsePrincipalId(administratorValue);
        const acquired = acquirePrivateFoodMenuDatabaseFromEnvironment({ environment, bindingName: bindingName as string });
        if (!acquired.ok) return acquired;
        const sessions = new AstroPrincipalSessionStore(session as unknown as AstroSessionLike, now as (() => Date) | undefined);
        const principals = new D1PrincipalRepository(identityDatabase as unknown as IdentityD1DatabaseLike);
        const callerResolver = new DefaultSessionPrincipalResolver({ sessions, principals });
        const capabilities = compose({ database: acquired.value, readDependencies: readDependencies as unknown as FoodMenuReadDependencies, callerResolver, administratorPrincipalId });
        return Object.freeze({ ok: true, value: capabilities });
    } catch {
        return Object.freeze({ ok: false, error: Object.freeze({ code: "configuration-unavailable", message: "Food menu database configuration is unavailable." }) });
    }
}
export function createPrivateFoodMenuRuntimeFromServerContext(input: FoodPrivateMenuServerContextInput): FoodPrivateMenuServerContextResult {
    return fromContext(input, configuration => createPrivateFoodMenuRuntimeComposition(configuration));
}
export function createPrivateFoodMenuOperationRuntimeFromServerContext(input: FoodPrivateMenuServerContextInput): FoodPrivateMenuOperationServerContextResult {
    return fromContext(input, configuration => createPrivateFoodMenuOperationRuntimeComposition(configuration));
}
