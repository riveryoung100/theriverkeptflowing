import {
    resolve
} from "node:path";

import type {
    RiverDevConfiguration,
    RiverDevOperationalExecutorIntegrationEntryAuthorization
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


export async function implementRiverDevPlan(
    configuration:
        RiverDevConfiguration,
    manifestPath:
        string,
    mode:
        RiverDevImplementationMode =
            "dry-run",
    operationExecutionAuthorization:
        RiverDevOperationalExecutorIntegrationEntryAuthorization
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

    const operationalEntry =
        establishOperationalExecutorIntegrationEntryFoundation(
            {
                requestedMode:
                    mode,

                authorization:
                    operationExecutionAuthorization
            }
        );

    if (
        mode ===
            "apply" &&
        operationalEntry.admitted !==
            true
    ) {
        throw new TypeError(
            operationalEntry.blockedReasons.join(
                " "
            )
        );
    }

    const runner =
        createImplementationRunner(
            configuration
        );

    return runner.execute(
        manifest,
        operationalEntry.effectiveMode
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
