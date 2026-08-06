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
    generateImplementationManifest
} from "../core/manifest-generator";

import type {
    RiverDevManifestGenerationResult
} from "../core/manifest-generator";

import type {
    RiverDevImplementationPlan
} from "../core/planner";

import type {
    RiverDevImplementationProposal
} from "../core/implementation-proposal";


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


export async function loadImplementationPlan(
    path:
        string
): Promise<RiverDevImplementationPlan> {

    return loadJsonFile<
        RiverDevImplementationPlan
    >(
        path
    );

}


export async function loadImplementationProposal(
    path:
        string
): Promise<RiverDevImplementationProposal> {

    return loadJsonFile<
        RiverDevImplementationProposal
    >(
        path
    );

}


export async function generateManifestRiverDev(
    configuration:
        RiverDevConfiguration,
    planPath:
        string,
    proposalPath:
        string
): Promise<RiverDevManifestGenerationResult> {

    const policy =
        createRiverDevPolicyEngine(
            configuration
        );

    const resolvedPlanPath =
        policy.assertRepositoryPath(
            planPath
        );

    const resolvedProposalPath =
        policy.assertRepositoryPath(
            proposalPath
        );

    const plan =
        await loadImplementationPlan(
            resolvedPlanPath
        );

    const proposal =
        await loadImplementationProposal(
            resolvedProposalPath
        );

    return generateImplementationManifest(
        plan,
        proposal
    );

}


export function formatManifestGenerationResult(
    result:
        RiverDevManifestGenerationResult
): string {

    const lines = [

        "River Development Agent Manifest Generation",

        `Implementation ID: ${result.manifest.implementationId}`,

        `Plan ID: ${result.manifest.planId}`,

        `Branch: ${result.manifest.branch}`,

        `Operations: ${result.operationCount}`,

        "Repository writes: false",

        "Generated manifest:",

        JSON.stringify(
            result.manifest,
            null,
            2
        )

    ];

    return lines.join(
        "\n"
    );

}
