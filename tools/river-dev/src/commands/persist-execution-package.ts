import {
    readFile
} from "node:fs/promises";
import type {
    RiverDevConfiguration
} from "../types";

import {
    createRiverDevPolicyEngine
} from "../safety/policy";

import {
    persistExecutionPackage,
    prepareExecutionPackagePersistence
} from "../core/execution-package-persistence";

import type {
    RiverDevExecutionPackage
} from "../core/execution-package";

import type {
    RiverDevExecutionPackagePersistenceResult
} from "../core/execution-package-persistence";


export async function persistExecutionPackageRiverDev(
    configuration:
        RiverDevConfiguration,
    executionPackage:
        RiverDevExecutionPackage
): Promise<RiverDevExecutionPackagePersistenceResult> {

    const preparation =
        prepareExecutionPackagePersistence(
            {
                repositoryRoot:
                    configuration.repositoryRoot,

                packageRoot:
                    ".river-dev/execution-packages",

                executionPackage
            }
        );

    return persistExecutionPackage(
        preparation
    );

}


export function formatExecutionPackagePersistenceResult(
    result:
        RiverDevExecutionPackagePersistenceResult
): string {

    return [

        "River Development Agent Execution Package Persistence",

        `Repository path: ${result.repositoryPath}`,

        `Persisted: ${result.persisted}`,

        `Implementation writes: ${result.implementationWritesPerformed}`

    ].join(
        "\n"
    );

}

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


export async function persistExecutionPackageFileRiverDev(
    configuration:
        RiverDevConfiguration,
    packagePath:
        string
): Promise<RiverDevExecutionPackagePersistenceResult> {

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

    const executionPackage =
        JSON.parse(
            removeUtf8Bom(
                source
            )
        ) as RiverDevExecutionPackage;

    return persistExecutionPackageRiverDev(
        configuration,
        executionPackage
    );

}

