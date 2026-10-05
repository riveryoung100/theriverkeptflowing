import { parsePrincipalId, type PrincipalId } from "../identity/identifiers";
import type { SessionPrincipalResolver } from "../identity/session/principal-resolver";
import { D1FoodDraftRepository, type FoodD1Database } from "./d1-draft-persistence";
import { SingleAdminFoodDraftService, type FoodPrivateDraftService } from "./private-draft-service";

export interface FoodPrivateDraftRuntimeCompositionInput {
    readonly database: FoodD1Database;
    readonly callerResolver: SessionPrincipalResolver;
    readonly administratorPrincipalId: PrincipalId;
}
export type FoodPrivateDraftRuntimeCompositionResult = Readonly<
    { ok: true; value: FoodPrivateDraftService } |
    { ok: false; error: Readonly<{ code: "configuration-unavailable"; message: string }> }
>;
function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Invalid dependency shape");
    return value as Record<string, unknown>;
}

/** Structural composition only; callers remain responsible for dependency trust and database consistency. */
export function createPrivateFoodDraftRuntimeComposition(input: FoodPrivateDraftRuntimeCompositionInput): FoodPrivateDraftRuntimeCompositionResult {
    try {
        const dependencies = object(input);
        const database = object(dependencies.database);
        const callerResolver = object(dependencies.callerResolver);
        const administratorPrincipalId = parsePrincipalId(dependencies.administratorPrincipalId);
        if (typeof database.prepare !== "function" || typeof database.batch !== "function" || typeof callerResolver.resolve !== "function") throw new TypeError("Invalid dependency methods");
        const repository = new D1FoodDraftRepository(database as unknown as FoodD1Database);
        const service = new SingleAdminFoodDraftService({ repository, callerResolver: callerResolver as unknown as SessionPrincipalResolver, administratorPrincipalId });
        return Object.freeze({ ok: true, value: service });
    } catch {
        return Object.freeze({ ok: false, error: Object.freeze({ code: "configuration-unavailable", message: "Food draft runtime configuration is unavailable." }) });
    }
}
