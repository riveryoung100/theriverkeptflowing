/** Trusted per-request FOOD-004C composition; no environment globals or writes. */
import { validateFoodVersion } from "./draft-domain";
import { parseFoodMenuPublicationId } from "./menu-publication-domain";
import { D1FoodDraftRepository } from "./d1-draft-persistence";
import { D1FoodMenuRepository } from "./d1-menu-persistence";
import { createFoodMenuReadDependencies } from "./menu-read-dependencies";
import { acquirePrivateFoodMenuDatabaseFromEnvironment } from "./private-menu-runtime-acquisition";
import { createFoodPublicMenuReadService } from "./public-menu-read-service";
import { createFoodPublicMenuTransport, type FoodPublicMenuTransport } from "./public-menu-transport";

function unavailableTransport(): FoodPublicMenuTransport {
    return createFoodPublicMenuTransport({ selector: { select: () => null }, service: { async readPublicMenu() { return { status: "unavailable" }; } } });
}
/** Environment provenance belongs to trusted server composition, never public input. */
export function createFoodPublicMenuRuntimeFromEnvironment(environment: unknown): FoodPublicMenuTransport {
    try {
        if (!environment || typeof environment !== "object" || Array.isArray(environment)) throw new TypeError();
        const values = environment as Readonly<Record<string, unknown>>;
        const publicationId = parseFoodMenuPublicationId(values.RIVER_FOOD_PUBLIC_MENU_PUBLICATION_ID);
        const configuredVersion = values.RIVER_FOOD_PUBLIC_MENU_PUBLICATION_VERSION;
        if (typeof configuredVersion !== "string" || !/^[1-9][0-9]*$/.test(configuredVersion)) throw new TypeError();
        const version = validateFoodVersion(Number(configuredVersion));
        const reference = Object.freeze({ publicationId, version });
        const acquired = acquirePrivateFoodMenuDatabaseFromEnvironment({ environment: values, bindingName: "RIVER_FOOD_DB" });
        if (!acquired.ok) return unavailableTransport();
        const drafts = new D1FoodDraftRepository(acquired.value);
        const readDependencies = createFoodMenuReadDependencies({ repository: drafts });
        const repository = new D1FoodMenuRepository(acquired.value, readDependencies);
        const service = createFoodPublicMenuReadService({ repository, readDependencies });
        return createFoodPublicMenuTransport({ selector: { select: () => reference }, service });
    } catch { return unavailableTransport(); }
}

/** Native adapter only; FOOD-004B remains all transport policy authority. */
export async function handleFoodPublicMenuRequest(method: string, acquireEnvironment: () => unknown): Promise<Response> {
    let transport = unavailableTransport();
    if (method === "GET" || method === "HEAD") {
        try { transport = createFoodPublicMenuRuntimeFromEnvironment(acquireEnvironment()); }
        catch { /* Retain the fixed unavailable transport. */ }
    }
    const result = await transport.read({ method });
    return new Response(result.body ?? null, { status: result.status, headers: result.headers });
}
