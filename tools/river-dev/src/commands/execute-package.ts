import {
    readFile
} from "node:fs/promises";

import type {
    RiverDevConfiguration,
    RiverDevOperationalExecutorIntegrationEntryAuthorization
} from "../types";

import {
    createRiverDevPolicyEngine
} from "../safety/policy";

import type {
    RiverDevExecutionPackage
} from "../core/execution-package";

import {
    createManifestPropagationFoundation
} from "../core/manifest-propagation-foundation";

import {
    composeManifestPackageExecutionRequest
} from "../core/manifest-package-execution-request-composition-foundation";

import {
    integrateManifestPackageExecution
} from "../core/manifest-package-execution-integration-foundation";

import type {
    RiverDevPackageExecutionResult
} from "../core/package-executor";

import type {
    RiverDevImplementationMode
} from "../execution/runner";


function removeUtf8Bom(
    source:
        string
): string {

    if (
        source.charCodeAt(
            0
        ) ===
        0xfeff
    ) {
        return source.slice(
            1
        );
    }

    return source;

}


export async function loadExecutionPackage(
    configuration:
        RiverDevConfiguration,
    packagePath:
        string
): Promise<RiverDevExecutionPackage> {

    const policy =
        createRiverDevPolicyEngine(
            configuration
        );

    const resolvedPackagePath =
        policy.assertRepositoryPath(
            packagePath
        );

    const source =
        await readFile(
            resolvedPackagePath,
            "utf8"
        );

    return JSON.parse(
        removeUtf8Bom(
            source
        )
    ) as RiverDevExecutionPackage;

}


export async function executePackageRiverDev(
    configuration:
        RiverDevConfiguration,
    packagePath:
        string,
    mode:
        RiverDevImplementationMode =
            "dry-run",
    operationExecutionAuthorization:
        RiverDevOperationalExecutorIntegrationEntryAuthorization
        | null =
            null
): Promise<RiverDevPackageExecutionResult> {

    const executionPackage =
        await loadExecutionPackage(
            configuration,
            packagePath
        );

    const manifestPropagation =
        createManifestPropagationFoundation(
            {
                manifest:
                    executionPackage.manifest,

                manifestAvailable:
                    true
            }
        );

    const composition =
        composeManifestPackageExecutionRequest(
            {
                manifestPropagation,

                executionPackage,

                mode,

                operationExecutionAuthorization
            }
        );

    const integration =
        await integrateManifestPackageExecution(
            {
                configuration,
                composition
            }
        );

    if (
        integration.integrated !== true ||
        integration.executionResult === null
    ) {

        const reasons =
            integration.blockedReasons.length > 0
                ? integration.blockedReasons.join(
                    " "
                )
                : "DEV-329 governed manifest package execution integration did not produce an execution result.";

        throw new TypeError(
            reasons
        );

    }

    return integration.executionResult;

}


export function formatPackageExecutionResult(
    result:
        RiverDevPackageExecutionResult
): string {

    return [
        "River Development Agent Package Execution",
        `Package ID: ${result.packageId}`,
        `Mode: ${result.mode}`,
        `Explicit apply authorized: ${result.explicitApplyAuthorized}`,
        `Implementation ID: ${result.implementation.implementationId}`,
        `Applied: ${result.implementation.applied}`,
        `Operations: ${result.implementation.operationCount}`
    ].join(
        "\n"
    );

}
