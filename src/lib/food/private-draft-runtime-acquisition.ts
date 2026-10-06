import { parsePrincipalId } from "../identity/identifiers";
import type { SessionPrincipalResolver } from "../identity/session/principal-resolver";
import type { FoodD1Database } from "./d1-draft-persistence";
import { createPrivateFoodDraftRuntimeComposition, createPrivateFoodDraftRuntimeCapabilitiesComposition, type FoodPrivateDraftRuntimeCompositionResult, type FoodPrivateDraftRuntimeCompositionInput, type FoodPrivateDraftRuntimeCapabilitiesResult } from "./private-draft-runtime-composition";

export interface FoodPrivateDraftRuntimeEnvironment {
    readonly RIVER_FOOD_DB?: unknown;
    readonly RIVER_FOOD_ADMIN_PRINCIPAL_ID?: unknown;
}
export interface FoodPrivateDraftRuntimeAcquisitionInput {
    readonly environment: FoodPrivateDraftRuntimeEnvironment;
    readonly callerResolver: SessionPrincipalResolver;
}

function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Invalid dependency shape");
    return value as Record<string, unknown>;
}

/** Structural acquisition only; the trusted caller supplies environment provenance and request scoping. */
function acquire(input: FoodPrivateDraftRuntimeAcquisitionInput): FoodPrivateDraftRuntimeCompositionInput {
        const supplied = object(input);
        const environment = object(supplied.environment);
        const database = object(environment.RIVER_FOOD_DB);
        const administratorPrincipalId = parsePrincipalId(environment.RIVER_FOOD_ADMIN_PRINCIPAL_ID);
        const callerResolver = object(supplied.callerResolver);
        if (typeof database.prepare !== "function" || typeof database.batch !== "function" || typeof callerResolver.resolve !== "function") throw new TypeError("Invalid dependency methods");
        return {
            database: database as unknown as FoodD1Database,
            callerResolver: callerResolver as unknown as SessionPrincipalResolver,
            administratorPrincipalId,
        };
}
export function createPrivateFoodDraftRuntimeFromEnvironment(input: FoodPrivateDraftRuntimeAcquisitionInput): FoodPrivateDraftRuntimeCompositionResult {
    try {
        return createPrivateFoodDraftRuntimeComposition(acquire(input));
    } catch {
        return Object.freeze({ ok: false, error: Object.freeze({ code: "configuration-unavailable", message: "Food draft runtime configuration is unavailable." }) });
    }
}
export function createPrivateFoodDraftRuntimeCapabilitiesFromEnvironment(input: FoodPrivateDraftRuntimeAcquisitionInput): FoodPrivateDraftRuntimeCapabilitiesResult {
    try {
        return createPrivateFoodDraftRuntimeCapabilitiesComposition(acquire(input));
    } catch {
        return Object.freeze({ ok: false, error: Object.freeze({ code: "configuration-unavailable", message: "Food draft runtime configuration is unavailable." }) });
    }
}
