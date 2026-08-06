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
    createExecutionPackage
} from "../core/execution-package";

import type {
    RiverDevExecutionPackageResult,
    RiverDevExecutionVerificationMetadata
} from "../core/execution-package";

import type {
    RiverDevImplementationProposal
} from "../core/implementation-proposal";

import type {
    RiverDevImplementationManifest
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


async function loadJsonFile<T>(
    path:
        string
): Promise<T> {

    const source =
        await readFile(
            path,
            "utf8"
        );

    return JSON.parse(
        removeUtf8Bom(
            source
        )
    ) as T;

}


export async function createExecutionPackageRiverDev(
    configuration:
        RiverDevConfiguration,
    proposalPath:
        string,
    manifestPath:
        string,
    verificationPath:
        string
): Promise<RiverDevExecutionPackageResult> {

    const policy =
        createRiverDevPolicyEngine(
            configuration
        );

    const proposal =
        await loadJsonFile<
            RiverDevImplementationProposal
        >(
            policy.assertRepositoryPath(
                proposalPath
            )
        );

    const manifest =
        await loadJsonFile<
            RiverDevImplementationManifest
        >(
            policy.assertRepositoryPath(
                manifestPath
            )
        );

    const verification =
        await loadJsonFile<
            RiverDevExecutionVerificationMetadata
        >(
            policy.assertRepositoryPath(
                verificationPath
            )
        );

    return createExecutionPackage(
        {
            proposal,
            manifest,
            verification
        }
    );

}


export function formatExecutionPackageResult(
    result:
        RiverDevExecutionPackageResult
): string {

    return [
        "River Development Agent Execution Package",
        `Package ID: ${result.executionPackage.packageId}`,
        `Plan ID: ${result.executionPackage.planId}`,
        `Branch: ${result.executionPackage.branch}`,
        `State: ${result.executionPackage.state}`,
        `Implementation ready: ${result.executionPackage.implementationReady}`,
        `Implementation writes: ${result.implementationWritesPerformed}`,
        "Execution package:",
        result.serialized.trimEnd()
    ].join(
        "\n"
    );

}
