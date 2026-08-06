import {
    resolve
} from "node:path";

import type {
    RiverDevConfiguration
} from "../types";

import {
    createRiverDevPolicyEngine
} from "../safety/policy";

import {
    loadReviewSpecification,
    reviewRepository
} from "../review/reviewer";

import type {
    RiverDevReviewResult
} from "../review/reviewer";


export async function reviewRiverDev(
    configuration:
        RiverDevConfiguration,
    specificationPath:
        string
): Promise<RiverDevReviewResult> {

    const policy =
        createRiverDevPolicyEngine(
            configuration
        );

    const resolvedSpecificationPath =
        policy.assertRepositoryPath(
            specificationPath
        );

    const specification =
        await loadReviewSpecification(
            resolvedSpecificationPath
        );

    return reviewRepository(
        configuration.repositoryRoot,
        specification
    );

}


export function getDefaultReviewSpecificationPath(
    configuration:
        RiverDevConfiguration
): string {

    return resolve(
        configuration.repositoryRoot,
        ".river-dev",
        "specifications",
        "dev-04-review-engine.json"
    );

}


export function formatReviewResult(
    result:
        RiverDevReviewResult
): string {

    const lines = [

        "River Development Agent Review",

        `Review ID: ${result.reviewId}`,

        `Branch: ${result.branch}`,

        `Passed: ${result.passed}`,

        `Changed paths: ${result.changedPaths.length}`,

        `Unexpected paths: ${result.unexpectedPaths.length}`,

        `Findings: ${result.findings.length}`

    ];

    if (
        result.changedPaths.length >
        0
    ) {

        lines.push(
            "Changed files:"
        );

        for (
            const path of
            result.changedPaths
        ) {

            lines.push(
                `- ${path}`
            );

        }

    }

    if (
        result.findings.length >
        0
    ) {

        lines.push(
            "Findings:"
        );

        for (
            const finding of
            result.findings
        ) {

            lines.push(
                `[${finding.severity.toUpperCase()}] ${finding.code}: ${finding.message}`
            );

        }

    }

    if (
        result.diffSummary.trim().length >
        0
    ) {

        lines.push(
            "Diff summary:",
            result.diffSummary
        );

    }

    return lines.join(
        "\n"
    );

}
