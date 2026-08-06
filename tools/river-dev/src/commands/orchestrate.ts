import {
    readFile
} from "node:fs/promises";

import {
    resolve
} from "node:path";

import type {
    RiverDevConfiguration
} from "../types";

import {
    runEndToEndOrchestrator
} from "../execution/orchestrator";

import type {
    RiverDevOrchestratorDependencies,
    RiverDevOrchestratorResult,
    RiverDevOrchestratorSpecification
} from "../execution/orchestrator";


function removeUtf8Bom(
    source: string
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


export async function loadOrchestratorSpecification(
    specificationPath:
        string
): Promise<RiverDevOrchestratorSpecification> {

    const source =
        await readFile(
            specificationPath,
            "utf8"
        );

    return JSON.parse(
        removeUtf8Bom(
            source
        )
    ) as RiverDevOrchestratorSpecification;

}


export function getDefaultOrchestratorSpecificationPath(
    configuration:
        RiverDevConfiguration
): string {

    return resolve(
        configuration.repositoryRoot,
        ".river-dev",
        "specifications",
        "dev-07-end-to-end-orchestrator.json"
    );

}


export async function orchestrateRiverDev(
    configuration:
        RiverDevConfiguration,
    specificationPath:
        string,
    apply:
        boolean,
    dependencies:
        RiverDevOrchestratorDependencies
): Promise<RiverDevOrchestratorResult> {

    const resolvedSpecificationPath =
        resolve(
            configuration.repositoryRoot,
            specificationPath
        );

    const specification =
        await loadOrchestratorSpecification(
            resolvedSpecificationPath
        );

    return runEndToEndOrchestrator(
        dependencies,
        {
            specification,
            apply
        }
    );

}


export function formatOrchestratorResult(
    result:
        RiverDevOrchestratorResult
): string {

    const lines = [

        "River Development Agent Orchestrator",

        `Specification ID: ${result.specificationId}`,

        `Branch: ${result.branch}`,

        `Outcome: ${result.outcome}`,

        `Passed: ${result.passed}`,

        `Dry run: ${result.dryRun}`,

        `Stage results: ${result.stages.length}`

    ];

    for (
        const stage of
        result.stages
    ) {

        const status =
            stage.skipped
                ? "SKIPPED"
                : stage.passed
                    ? "PASS"
                    : "FAIL";

        lines.push(
            `[${status}] ${stage.stage}: ${stage.message}`
        );

    }

    for (
        const warning of
        result.warnings
    ) {

        lines.push(
            `Warning: ${warning}`
        );

    }

    return lines.join(
        "\n"
    );

}
