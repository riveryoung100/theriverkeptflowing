import type { PrincipalId } from "../identity/identifiers";
import type { SessionPrincipalResolver } from "../identity/session/principal-resolver";
import type { FoodD1Database } from "./d1-draft-persistence";
import type { FoodMenuReadDependencies } from "./menu-persistence";
import { D1FoodMenuRepository } from "./d1-menu-persistence";
import { SingleAdminFoodMenuService, type FoodPrivateMenuService, type FoodPrivateMenuOperationGate } from "./private-menu-service";
import { createPrivateFoodMenuWorkspaceController, type FoodPrivateMenuWorkspaceController } from "./private-menu-workspace";

export interface FoodPrivateMenuRuntimeCompositionInput {
    readonly database: FoodD1Database;
    readonly readDependencies: FoodMenuReadDependencies;
    readonly callerResolver: SessionPrincipalResolver;
    readonly administratorPrincipalId: PrincipalId;
}

export interface FoodPrivateMenuRuntimeCapabilities {
    readonly service: FoodPrivateMenuService;
    readonly workspace: FoodPrivateMenuWorkspaceController;
}
export interface FoodPrivateMenuOperationRuntimeCapabilities extends FoodPrivateMenuRuntimeCapabilities {
    readonly operationGate: FoodPrivateMenuOperationGate;
}

/** Structural assembly only; dependency trust and database consistency belong to the caller. */
function construct(input: FoodPrivateMenuRuntimeCompositionInput): { service: SingleAdminFoodMenuService; workspace: FoodPrivateMenuWorkspaceController } {
    let database: FoodD1Database;
    let readDependencies: FoodMenuReadDependencies;
    let callerResolver: SessionPrincipalResolver;
    let administratorPrincipalId: PrincipalId;
    try {
        if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError();
        database = input.database;
        readDependencies = input.readDependencies;
        callerResolver = input.callerResolver;
        administratorPrincipalId = input.administratorPrincipalId;
    } catch {
        throw new TypeError("Private food menu runtime composition input is unavailable.");
    }
    const repository = new D1FoodMenuRepository(database, readDependencies);
    const service = new SingleAdminFoodMenuService({ repository, callerResolver, administratorPrincipalId });
    const workspace = createPrivateFoodMenuWorkspaceController(service);
    return { service, workspace };
}
export function createPrivateFoodMenuRuntimeComposition(input: FoodPrivateMenuRuntimeCompositionInput): FoodPrivateMenuRuntimeCapabilities {
    const { service, workspace } = construct(input);
    return Object.freeze({ service, workspace });
}
export function createPrivateFoodMenuOperationRuntimeComposition(input: FoodPrivateMenuRuntimeCompositionInput): FoodPrivateMenuOperationRuntimeCapabilities {
    const { service, workspace } = construct(input);
    return Object.freeze({ service, workspace, operationGate: service });
}
