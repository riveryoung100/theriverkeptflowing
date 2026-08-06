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
    generateImplementationProposal
} from "../core/proposal-generator";

import type {
    RiverDevProposalGenerationResult
} from "../core/proposal-generator";

import type {
    RiverDevImplementationPlan
} from "../core/planner";

import type {
    RiverDevImplementationIntent
} from "../core/implementation-intent";


function removeUtf8Bom(
    source: string
): string {

    if (
        source.charCodeAt(0) === 0xfeff
    ) {
        return source.slice(1);
    }

    return source;

}


async function loadJsonFile<T>(
    path: string
): Promise<T> {

    const source =
        await readFile(
            path,
            "utf8"
        );

    return JSON.parse(
        removeUtf8Bom(source)
    ) as T;

}


export async function loadImplementationPlan(
    path: string
): Promise<RiverDevImplementationPlan> {

    return loadJsonFile<
        RiverDevImplementationPlan
    >(path);

}


export async function loadImplementationIntent(
    path: string
): Promise<RiverDevImplementationIntent> {

    return loadJsonFile<
        RiverDevImplementationIntent
    >(path);

}


export async function generateProposalRiverDev(
    configuration:
        RiverDevConfiguration,
    planPath:
        string,
    intentPath:
        string
): Promise<RiverDevProposalGenerationResult> {

    const policy =
        createRiverDevPolicyEngine(
            configuration
        );

    const plan =
        await loadImplementationPlan(
            policy.assertRepositoryPath(
                planPath
            )
        );

    const intent =
        await loadImplementationIntent(
            policy.assertRepositoryPath(
                intentPath
            )
        );

    return generateImplementationProposal(
        plan,
        intent
    );

}


export function formatProposalGenerationResult(
    result:
        RiverDevProposalGenerationResult
): string {

    return [

        "River Development Agent Proposal Generation",

        `Proposal ID: ${result.proposal.proposalId}`,

        `Plan ID: ${result.proposal.planId}`,

        `Branch: ${result.proposal.branch}`,

        `Operations: ${result.operationCount}`,

        "Repository writes: false",

        "Generated proposal:",

        JSON.stringify(
            result.proposal,
            null,
            2
        )

    ].join("\n");

}
