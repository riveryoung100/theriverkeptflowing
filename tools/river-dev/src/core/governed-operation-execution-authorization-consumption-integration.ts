import type {
    RiverDevGovernedExecutorIntegrationOperationExecutionAuthorizationFoundationResult,
    RiverDevOperationalExecutorIntegrationEntryAuthorization
} from "../types";

import type {
    RiverDevGovernedOperationExecutionAuthorizationAcquisitionInput
} from "./governed-operation-execution-authorization-acquisition-integration";

import {
    acquireGovernedOperationExecutionAuthorization
} from "./governed-operation-execution-authorization-acquisition-integration";

export interface RiverDevGovernedOperationExecutionAuthorizationConsumptionIntegrationResult {

    readonly version:
        "DEV-318";

    readonly source:
        "governed-operation-execution-authorization-consumption-integration";

    readonly authorization:
        RiverDevOperationalExecutorIntegrationEntryAuthorization
        | null;

    readonly authorizationAcquired:
        boolean;

    readonly authorizationUsableForOperationalEntry:
        boolean;

    readonly requestedApplyIsAuthorization:
        false;

    readonly createsAuthorization:
        false;

    readonly upgradesAuthorization:
        false;

    readonly grantsArbitraryRepositoryMutation:
        false;

    readonly operationalExecutionPerformed:
        false;

}

export function consumeGovernedOperationExecutionAuthorization(
    input:
        RiverDevGovernedOperationExecutionAuthorizationAcquisitionInput
): RiverDevGovernedOperationExecutionAuthorizationConsumptionIntegrationResult {

    const acquired:
        RiverDevGovernedExecutorIntegrationOperationExecutionAuthorizationFoundationResult =
        acquireGovernedOperationExecutionAuthorization(
            input
        );

    const authorization:
        RiverDevOperationalExecutorIntegrationEntryAuthorization =
        acquired;

    const authorizationUsableForOperationalEntry =
        authorization.authorizationState ===
        "OPERATION_EXECUTION_AUTHORIZED";

    return {
        version:
            "DEV-318",

        source:
            "governed-operation-execution-authorization-consumption-integration",

        authorization:
            authorizationUsableForOperationalEntry
                ? authorization
                : null,

        authorizationAcquired:
            true,

        authorizationUsableForOperationalEntry,

        requestedApplyIsAuthorization:
            false,

        createsAuthorization:
            false,

        upgradesAuthorization:
            false,

        grantsArbitraryRepositoryMutation:
            false,

        operationalExecutionPerformed:
            false
    };

}