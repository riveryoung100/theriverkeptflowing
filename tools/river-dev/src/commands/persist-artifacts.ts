import type {
    RiverDevConfiguration
} from "../types";

import type {
    RiverDevArtifactPipelineOutcome
} from "../core/artifact-pipeline";
import {
    generateArtifactsRiverDev
} from "./generate-artifacts";

import {
    persistPreparedArtifacts,
    prepareArtifactPersistence
} from "../core/artifact-persistence";

export interface RiverDevGeneratedArtifactPersistenceResult {

    readonly pipelineOutcome:
        RiverDevArtifactPipelineOutcome;

    readonly proposalApproved:
        boolean;

    readonly manifestGenerated:
        boolean;

    readonly persistence:
        RiverDevArtifactPersistenceResult;

    readonly implementationWritesPerformed:
        false;

}

import type {
    RiverDevArtifactPersistencePreparation,
    RiverDevArtifactPersistenceResult
} from "../core/artifact-persistence";


export async function persistArtifactsRiverDev(
    configuration:
        RiverDevConfiguration,
    preparation:
        RiverDevArtifactPersistencePreparation
): Promise<RiverDevArtifactPersistenceResult> {

    return persistPreparedArtifacts(
        configuration.repositoryRoot,
        preparation
    );

}


export async function persistGeneratedArtifactsRiverDev(
    configuration:
        RiverDevConfiguration,
    planPath:
        string,
    intentPath:
        string,
    approveProposal:
        boolean,
    artifactRoot:
        string =
            ".river-dev/artifacts"
): Promise<RiverDevGeneratedArtifactPersistenceResult> {

    const pipelineResult =
        await generateArtifactsRiverDev(
            configuration,
            planPath,
            intentPath,
            approveProposal
        );

    const preparation =
        prepareArtifactPersistence(
            {
                repositoryRoot:
                    configuration.repositoryRoot,

                artifactRoot,

                proposal:
                    pipelineResult.proposal,

                manifest:
                    pipelineResult.manifest
            }
        );

    const persistence =
        await persistArtifactsRiverDev(
            configuration,
            preparation
        );

    return {

        pipelineOutcome:
            pipelineResult.outcome,

        proposalApproved:
            pipelineResult.proposalApproved,

        manifestGenerated:
            pipelineResult.manifest !==
            null,

        persistence,

        implementationWritesPerformed:
            false

    };

}

export function formatArtifactPersistenceResult(
    result:
        RiverDevArtifactPersistenceResult
): string {

    const lines = [

        "River Development Agent Artifact Persistence",

        `Artifacts: ${result.artifactCount}`,

        `Implementation writes: ${result.implementationWritesPerformed}`

    ];

    for (
        const artifact of
        result.artifacts
    ) {

        lines.push(
            `${artifact.type}: ${artifact.repositoryPath}`
        );

    }

    return lines.join(
        "\n"
    );

}

export function formatGeneratedArtifactPersistenceResult(
    result:
        RiverDevGeneratedArtifactPersistenceResult
): string {

    return [

        "River Development Agent Generated Artifact Persistence",

        `Pipeline outcome: ${result.pipelineOutcome}`,

        `Proposal approved: ${result.proposalApproved}`,

        `Manifest generated: ${result.manifestGenerated}`,

        formatArtifactPersistenceResult(
            result.persistence
        )

    ].join(
        "\n"
    );

}


