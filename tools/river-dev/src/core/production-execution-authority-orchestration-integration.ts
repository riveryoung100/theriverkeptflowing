import type {
    RiverDevProductionExecutionAuthorityCompositionFoundation,
    RiverDevProductionExecutionAuthorityOrchestrationIntegration
} from "../types";

import type {
    RiverDevGovernedOperationExecutionAuthorizationAcquisitionInput
} from "./governed-operation-execution-authorization-acquisition-integration";

import {
    orchestrateGovernedOperationExecutionAuthorization
} from "./governed-operation-execution-authorization-orchestration-integration";


export interface RiverDevProductionExecutionAuthorityOrchestrationIntegrationInput {
    readonly productionAuthority:
        RiverDevProductionExecutionAuthorityCompositionFoundation;

    readonly authorizationOrchestrationInput:
        RiverDevGovernedOperationExecutionAuthorizationAcquisitionInput;
}


export function integrateProductionExecutionAuthorityOrchestration(
    input:
        RiverDevProductionExecutionAuthorityOrchestrationIntegrationInput
): RiverDevProductionExecutionAuthorityOrchestrationIntegration {

    const {
        productionAuthority,
        authorizationOrchestrationInput
    } = input;

    const blockedReasons: string[] = [];

    if (!productionAuthority.trusted) {
        blockedReasons.push(
            "DEV-322 production execution authority composition is not trusted."
        );
    }

    if (!productionAuthority.ready) {
        blockedReasons.push(
            "DEV-322 production execution authority composition is not ready."
        );
    }

    if (
        productionAuthority.compositionState !==
        "PRODUCTION_EXECUTION_AUTHORITY_COMPOSED"
    ) {
        blockedReasons.push(
            "DEV-322 production execution authority composition is not composed."
        );
    }

    if (productionAuthority.blockedReasons.length > 0) {
        blockedReasons.push(
            "DEV-322 production execution authority composition contains blockers."
        );
    }

    if (
        productionAuthority.requestedMode !==
        authorizationOrchestrationInput.requestedMode
    ) {
        blockedReasons.push(
            "DEV-322 requested mode does not match DEV-319 authorization orchestration requested mode."
        );
    }

    const authorizationOrchestration =
        orchestrateGovernedOperationExecutionAuthorization(
            authorizationOrchestrationInput
        );

    if (!authorizationOrchestration.readyForOperationalEntry) {
        blockedReasons.push(
            "DEV-319 governed operation-execution authorization orchestration is not ready for operational entry."
        );
    }

    if (!authorizationOrchestration.authorizationAcquired) {
        blockedReasons.push(
            "DEV-319 governed operation-execution authorization was not acquired."
        );
    }

    if (!authorizationOrchestration.authorizationConsumed) {
        blockedReasons.push(
            "DEV-319 governed operation-execution authorization was not consumed."
        );
    }

    if (
        !authorizationOrchestration.authorizationUsableForOperationalEntry
    ) {
        blockedReasons.push(
            "DEV-319 governed operation-execution authorization is not usable for operational entry."
        );
    }

    if (authorizationOrchestration.authorization === null) {
        blockedReasons.push(
            "DEV-319 did not preserve usable operation-execution authorization."
        );
    }

    if (authorizationOrchestration.blockedReasons.length > 0) {
        blockedReasons.push(
            ...authorizationOrchestration.blockedReasons
        );
    }

    const readyForOperationalEntry =
        blockedReasons.length === 0;

    return {
        version:
            "DEV-323",

        source:
            "production-execution-authority-orchestration-integration",

        integrationState:
            readyForOperationalEntry
                ? "PRODUCTION_EXECUTION_AUTHORITY_ORCHESTRATION_READY"
                : "PRODUCTION_EXECUTION_AUTHORITY_ORCHESTRATION_BLOCKED",

        readyForOperationalEntry,

        productionAuthority,

        authorization:
            readyForOperationalEntry
                ? authorizationOrchestration.authorization
                : null,

        authorizationAcquired:
            authorizationOrchestration.authorizationAcquired,

        authorizationConsumed:
            authorizationOrchestration.authorizationConsumed,

        authorizationUsableForOperationalEntry:
            authorizationOrchestration.authorizationUsableForOperationalEntry,

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

        integrationEvidence:
            readyForOperationalEntry
                ? [
                    "DEV-322 production execution authority composition accepted.",
                    "DEV-319 independently validated preexisting operation-execution authorization.",
                    "production execution authority and operation-execution authorization composed without creating authorization.",
                    "operational executor entry remains outside DEV-323."
                ]
                : [
                    "DEV-323 production execution authority orchestration integration blocked.",
                    ...blockedReasons
                ],

        blockedReasons
    };
}
