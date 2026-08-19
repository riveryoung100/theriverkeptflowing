import type {
    RiverDevProductionExecutionAuthorityOperationalEntryIntegrationInput,
    RiverDevProductionExecutionAuthorityOperationalEntryIntegrationResult
} from "../types";

import {
    establishOperationalExecutorIntegrationEntryFoundation
} from "./operational-executor-integration-entry-foundation-engine";

export function integrateProductionExecutionAuthorityOperationalEntry(
    input: RiverDevProductionExecutionAuthorityOperationalEntryIntegrationInput
): RiverDevProductionExecutionAuthorityOperationalEntryIntegrationResult {
    const productionExecutionAuthority =
        input.productionExecutionAuthority;

    const requestedMode =
        productionExecutionAuthority.productionAuthority.requestedMode;

    const upstreamReady =
        productionExecutionAuthority.readyForOperationalEntry === true &&
        productionExecutionAuthority.integrationState ===
            "PRODUCTION_EXECUTION_AUTHORITY_ORCHESTRATION_READY";

    const upstreamAuthorizationUsable =
        productionExecutionAuthority.authorizationUsableForOperationalEntry === true &&
        productionExecutionAuthority.authorization !== null;

    const authorization =
        upstreamReady && upstreamAuthorizationUsable
            ? productionExecutionAuthority.authorization
            : null;

    const operationalEntry =
        establishOperationalExecutorIntegrationEntryFoundation({
            requestedMode,
            authorization
        });

    const admitted =
        upstreamReady &&
        (
            requestedMode === "dry-run"
                ? operationalEntry.admitted === true &&
                  operationalEntry.entryState === "DRY_RUN_ADMITTED"
                : upstreamAuthorizationUsable &&
                  operationalEntry.admitted === true &&
                  operationalEntry.entryState === "APPLY_ADMITTED" &&
                  operationalEntry.authorizationState ===
                      "OPERATION_EXECUTION_AUTHORIZED"
        );

    const integrationState =
        admitted
            ? "PRODUCTION_EXECUTION_AUTHORITY_OPERATIONAL_ENTRY_READY"
            : "PRODUCTION_EXECUTION_AUTHORITY_OPERATIONAL_ENTRY_BLOCKED";

    const integrationEvidence: string[] = [
        "DEV-324 consumed an existing DEV-323 production execution authority orchestration result.",
        `DEV-323 integration state: ${productionExecutionAuthority.integrationState}.`,
        `DEV-323 readyForOperationalEntry: ${String(productionExecutionAuthority.readyForOperationalEntry)}.`,
        `Requested mode preserved as ${requestedMode}.`,
        `DEV-323 authorization usable for operational entry: ${String(productionExecutionAuthority.authorizationUsableForOperationalEntry)}.`,
        "Operational-entry admission was delegated exclusively to DEV-314.",
        `DEV-314 entry state: ${operationalEntry.entryState}.`,
        `DEV-314 admitted: ${String(operationalEntry.admitted)}.`,
        `DEV-324 admitted: ${String(admitted)}.`,
        "DEV-324 performed no operational execution or repository mutation."
    ];

    const blockedReasons: string[] = [];

    if (!upstreamReady) {
        blockedReasons.push(
            "DEV-323 production execution authority orchestration is not ready for operational entry."
        );
    }

    if (
        requestedMode === "apply" &&
        !upstreamAuthorizationUsable
    ) {
        blockedReasons.push(
            "Apply progression requires usable DEV-323 operation-execution authorization."
        );
    }

    if (!operationalEntry.admitted) {
        blockedReasons.push(
            ...operationalEntry.blockedReasons
        );
    }

    if (
        requestedMode === "apply" &&
        operationalEntry.authorizationState !==
            "OPERATION_EXECUTION_AUTHORIZED"
    ) {
        blockedReasons.push(
            "DEV-314 did not independently confirm OPERATION_EXECUTION_AUTHORIZED."
        );
    }

    return {
        version: "DEV-324",
        source:
            "production-execution-authority-operational-entry-integration",
        integrationState,
        readyForOperationalEntry:
            admitted,
        requestedMode,
        authorization,
        operationalEntry,
        admitted,
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
        broadensApprovedExecutionScope:
            false,
        bypassesOperationalEntry:
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
        integrationEvidence,
        blockedReasons
    };
}
