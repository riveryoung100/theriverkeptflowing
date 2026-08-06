import {
    readFile
} from "node:fs/promises";

import type {
    RiverDevConfiguration
} from "../types";

import {
    createRiverDevPolicyEngine
} from "../safety/policy";

import type {
    RiverDevExecutionPackage
} from "../core/execution-package";

import {
    executePackage
} from "../core/package-executor";

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
            "dry-run"
): Promise<RiverDevPackageExecutionResult> {

    const executionPackage =
        await loadExecutionPackage(
            configuration,
            packagePath
        );

    return executePackage(
        configuration,
        {
            executionPackage,
            mode
        }
    );

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
