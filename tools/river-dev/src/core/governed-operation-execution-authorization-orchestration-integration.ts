import type {
    RiverDevGovernedOperationExecutionAuthorizationAcquisitionInput
} from "./governed-operation-execution-authorization-acquisition-integration";

import type {
    RiverDevGovernedOperationExecutionAuthorizationConsumptionIntegrationResult
} from "./governed-operation-execution-authorization-consumption-integration";

import {
    consumeGovernedOperationExecutionAuthorization
} from "./governed-operation-execution-authorization-consumption-integration";


export interface RiverDevGovernedOperationExecutionAuthorizationOrchestrationIntegrationResult {

    readonly version:
        "DEV-319";

    readonly source:
        "governed-operation-execution-authorization-orchestration-integration";

    readonly orchestrationState:
        "AUTHORIZATION_READY_FOR_OPERATIONAL_ENTRY"
        | "AUTHORIZATION_BLOCKED";

    readonly authorization:
        RiverDevGovernedOperationExecutionAuthorizationConsumptionIntegrationResult["authorization"];

    readonly authorizationAcquired:
        boolean;

    readonly authorizationConsumed:
        boolean;

    readonly authorizationUsableForOperationalEntry:
        boolean;

    readonly readyForOperationalEntry:
        boolean;

    readonly requestedApplyIsAuthorization:
        false;

    readonly createsAuthorization:
        false;

    readonly upgradesAuthorization:
        false;

    readonly synthesizesAuthorization:
        false;

    readonly broadensAuthorization:
        false;

    readonly invokesOperationalEntry:
        false;

    readonly operationalExecutionPerformed:
        false;

    readonly repositoryMutationPerformed:
        false;

    readonly commandExecutionPerformed:
        false;

    readonly commitPerformed:
        false;

    readonly pushPerformed:
        false;

    readonly deploymentPerformed:
        false;

    readonly blockedReasons:
        readonly string[];

}


export function orchestrateGovernedOperationExecutionAuthorization(
    input:
        RiverDevGovernedOperationExecutionAuthorizationAcquisitionInput
): RiverDevGovernedOperationExecutionAuthorizationOrchestrationIntegrationResult {

    const consumption =
        consumeGovernedOperationExecutionAuthorization(
            input
        );

    const readyForOperationalEntry =
        consumption.authorizationAcquired &&
        consumption.authorizationUsableForOperationalEntry &&
        consumption.authorization !==
            null;

    const blockedReasons =
        readyForOperationalEntry
            ? []
            : [
                "Governed operation-execution authorization is not ready for operational executor entry."
            ];

    return {
        version:
            "DEV-319",

        source:
            "governed-operation-execution-authorization-orchestration-integration",

        orchestrationState:
            readyForOperationalEntry
                ? "AUTHORIZATION_READY_FOR_OPERATIONAL_ENTRY"
                : "AUTHORIZATION_BLOCKED",

        authorization:
            readyForOperationalEntry
                ? consumption.authorization
                : null,

        authorizationAcquired:
            consumption.authorizationAcquired,

        authorizationConsumed:
            true,

        authorizationUsableForOperationalEntry:
            consumption.authorizationUsableForOperationalEntry,

        readyForOperationalEntry,

        requestedApplyIsAuthorization:
            false,

        createsAuthorization:
            false,

        upgradesAuthorization:
            false,

        synthesizesAuthorization:
            false,

        broadensAuthorization:
            false,

        invokesOperationalEntry:
            false,

        operationalExecutionPerformed:
            false,

        repositoryMutationPerformed:
            false,

        commandExecutionPerformed:
            false,

        commitPerformed:
            false,

        pushPerformed:
            false,

        deploymentPerformed:
            false,

        blockedReasons
    };

}