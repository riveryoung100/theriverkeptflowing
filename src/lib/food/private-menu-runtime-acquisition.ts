import type { FoodD1Database } from "./d1-draft-persistence";

export interface FoodPrivateMenuEnvironmentAcquisitionInput {
    readonly environment: Readonly<Record<string, unknown>>;
    readonly bindingName: string;
}

export type FoodPrivateMenuDatabaseAcquisitionResult = Readonly<
    { ok: true; value: FoodD1Database } |
    { ok: false; error: Readonly<{ code: "configuration-unavailable"; message: "Food menu database configuration is unavailable." }> }
>;

function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError();
    return value as Record<string, unknown>;
}

/** The trusted caller supplies provenance and target selection; acquisition checks structure only. */
export function acquirePrivateFoodMenuDatabaseFromEnvironment(input: FoodPrivateMenuEnvironmentAcquisitionInput): FoodPrivateMenuDatabaseAcquisitionResult {
    try {
        const supplied = object(input);
        const environmentValue = supplied.environment;
        const bindingName = supplied.bindingName;
        const environment = object(environmentValue);
        if (typeof bindingName !== "string" || !/^[A-Z][A-Z0-9_]*$/.test(bindingName) || bindingName.includes("\n")) throw new TypeError();
        const database = object(environment[bindingName]);
        if (typeof database.prepare !== "function" || typeof database.batch !== "function") throw new TypeError();
        return Object.freeze({ ok: true, value: database as unknown as FoodD1Database });
    } catch {
        return Object.freeze({ ok: false, error: Object.freeze({ code: "configuration-unavailable", message: "Food menu database configuration is unavailable." }) });
    }
}
