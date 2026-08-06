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
    runArtifactPipeline
} from "../core/artifact-pipeline";

import type {
    RiverDevArtifactPipelineResult
} from "../core/artifact-pipeline";

import type {
    RiverDevImplementationIntent
} from "../core/implementation-intent";

import type {
    RiverDevImplementationPlan
} from "../core/planner";


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


export async function loadArtifactPlan(
    path:
        string
): Promise<RiverDevImplementationPlan> {

    return loadJsonFile<
        RiverDevImplementationPlan
    >(
        path
    );

}


export async function loadArtifactIntent(
    path:
        string
): Promise<RiverDevImplementationIntent> {

    return loadJsonFile<
        RiverDevImplementationIntent
    >(
        path
    );

}


export async function generateArtifactsRiverDev(
    configuration:
        RiverDevConfiguration,
    planPath:
        string,
    intentPath:
        string,
    approveProposal:
        boolean
): Promise<RiverDevArtifactPipelineResult> {

    const policy =
        createRiverDevPolicyEngine(
            configuration
        );

    const resolvedPlanPath =
        policy.assertRepositoryPath(
            planPath
        );

    const resolvedIntentPath =
        policy.assertRepositoryPath(
            intentPath
        );

    const plan =
        await loadArtifactPlan(
            resolvedPlanPath
        );

    const intent =
        await loadArtifactIntent(
            resolvedIntentPath
        );

    return runArtifactPipeline(
        {
            plan,
            intent,
            approveProposal
        }
    );

}


export function formatArtifactPipelineResult(
    result:
        RiverDevArtifactPipelineResult
): string {

    const lines = [

        "River Development Agent Artifact Pipeline",

        `Outcome: ${result.outcome}`,

        `Proposal ID: ${result.proposal.proposalId}`,

        `Proposal approved: ${result.proposalApproved}`,

        `Manifest generated: ${result.manifest !== null}`,

        `Repository writes: ${result.repositoryWritesPerformed}`,

        "Generated proposal:",

        JSON.stringify(
            result.proposal,
            null,
            2
        )

    ];

    if (
        result.manifest !==
        null
    ) {

        lines.push(
            "Generated manifest:",
            JSON.stringify(
                result.manifest,
                null,
                2
            )
        );

    }

    return lines.join(
        "\n"
    );

}
