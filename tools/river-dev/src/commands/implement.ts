import {
    resolve
} from "node:path";

import type {
    RiverDevConfiguration,
    RiverDevProductionExecutionAuthorityOrchestrationIntegration
} from "../types";

import {
    createRiverDevPolicyEngine
} from "../safety/policy";

import {
    createImplementationRunner,
    loadImplementationManifest
} from "../execution/runner";

import type {
    RiverDevImplementationMode,
    RiverDevImplementationResult
} from "../execution/runner";

import {
    establishOperationalExecutorIntegrationEntryFoundation
} from "../core/operational-executor-integration-entry-foundation-engine";

import {
    integrateProductionExecutionAuthorityOperationalEntry
} from "../core/production-execution-authority-operational-entry-integration";


export async function implementRiverDevPlan(
    configuration:
        RiverDevConfiguration,
    manifestPath:
        string,
    mode:
        RiverDevImplementationMode =
            "dry-run",
    productionExecutionAuthority:
        RiverDevProductionExecutionAuthorityOrchestrationIntegration
        | null =
            null
): Promise<RiverDevImplementationResult> {

    const policy =
        createRiverDevPolicyEngine(
            configuration
        );

    const resolvedManifestPath =
        policy.assertRepositoryPath(
            manifestPath
        );

    const manifest =
        await loadImplementationManifest(
            resolvedManifestPath
        );

    let effectiveMode:
        RiverDevImplementationMode | null =
            null;

    if (
        mode ===
            "dry-run"
    ) {

        const operationalEntry =
            establishOperationalExecutorIntegrationEntryFoundation(
                {
                    requestedMode:
                        mode,

                    authorization:
                        null
                }
            );

        if (
            operationalEntry.admitted !==
                true
        ) {
            throw new TypeError(
                operationalEntry.blockedReasons.join(
                    " "
                )
            );
        }

        effectiveMode =
            operationalEntry.effectiveMode;

    }
    else {

        if (
            productionExecutionAuthority ===
                null
        ) {
            throw new TypeError(
                "Apply requires a preexisting DEV-323 production execution authority orchestration result."
            );
        }

        if (
            productionExecutionAuthority.productionAuthority.requestedMode !==
                "apply"
        ) {
            throw new TypeError(
                "Apply requires DEV-323 production execution authority requestedMode to be apply."
            );
        }

        const productionOperationalEntry =
            integrateProductionExecutionAuthorityOperationalEntry(
                {
                    productionExecutionAuthority
                }
            );

        if (
            productionOperationalEntry.requestedMode !==
                "apply" ||
            productionOperationalEntry.admitted !==
                true
        ) {

            const reasons =
                productionOperationalEntry.blockedReasons.length >
                    0
                    ? productionOperationalEntry.blockedReasons.join(
                          " "
                      )
                    : "DEV-324 production execution authority operational entry denied apply.";

            throw new TypeError(
                reasons
            );
        }

        effectiveMode =
            productionOperationalEntry.operationalEntry.effectiveMode;

    }

    if (
        effectiveMode ===
            null
    ) {
        throw new TypeError(
            "Operational entry did not produce an effective implementation mode."
        );
    }

    const runner =
        createImplementationRunner(
            configuration
        );

    return runner.execute(
        manifest,
        effectiveMode
    );

}


export function getDefaultImplementationManifestPath(
    configuration:
        RiverDevConfiguration
): string {

    return resolve(
        configuration.repositoryRoot,
        ".river-dev",
        "specifications",
        "dev-02-implementation-manifest.json"
    );

}


export function formatImplementationResult(
    result:
        RiverDevImplementationResult
): string {

    const lines = [

        "River Development Agent Implementation",

        `Implementation ID: ${result.implementationId}`,

        `Plan ID: ${result.planId}`,

        `Branch: ${result.branch}`,

        `Mode: ${result.mode}`,

        `Applied: ${result.applied}`,

        `Operations: ${result.operationCount}`

    ];

    for (
        const operation of
        result.operations
    ) {

        lines.push(
            `${operation.index + 1}. [${operation.status}] ${operation.type} ${operation.path}`
        );

    }

    if (
        result.mode ===
        "dry-run"
    ) {
        lines.push(
            "No repository files were modified."
        );
    }

    return lines.join(
        "\n"
    );

}
