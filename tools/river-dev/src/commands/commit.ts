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
    createSafeLocalCommit,
    loadCommitSpecification
} from "../git/commit-engine";

import type {
    RiverDevCommitResult
} from "../git/commit-engine";


export async function commitRiverDev(
    configuration:
        RiverDevConfiguration,
    specificationPath:
        string,
    options: {
        readonly verificationPassed:
            boolean;

        readonly reviewPassed:
            boolean;

        readonly apply:
            boolean;
    }
): Promise<RiverDevCommitResult> {

    const policy =
        createRiverDevPolicyEngine(
            configuration
        );

    const resolvedSpecificationPath =
        policy.assertRepositoryPath(
            specificationPath
        );

    const specification =
        await loadCommitSpecification(
            resolvedSpecificationPath
        );

    return createSafeLocalCommit(
        configuration.repositoryRoot,
        {
            specification,

            verificationPassed:
                options.verificationPassed,

            reviewPassed:
                options.reviewPassed,

            dryRun:
                !options.apply
        }
    );

}


export function getDefaultCommitSpecificationPath(
    configuration:
        RiverDevConfiguration
): string {

    return resolve(
        configuration.repositoryRoot,
        ".river-dev",
        "specifications",
        "dev-05-commit-engine.json"
    );

}


export function formatCommitResult(
    result:
        RiverDevCommitResult
): string {

    const lines = [

        "River Development Agent Commit",

        `Specification ID: ${result.specificationId}`,

        `Branch: ${result.branch}`,

        `Commit message: ${result.commitMessage}`,

        `Dry run: ${result.dryRun}`,

        `Committed: ${result.committed}`,

        `Paths: ${result.stagedPaths.length}`

    ];

    if (
        result.stagedPaths.length >
        0
    ) {

        lines.push(
            "Approved paths:"
        );

        for (
            const path of
            result.stagedPaths
        ) {

            lines.push(
                `- ${path}`
            );

        }

    }

    if (
        result.commitHash !==
        undefined
    ) {

        lines.push(
            `Commit: ${result.commitHash}`
        );

    }

    if (
        result.dryRun
    ) {

        lines.push(
            "No commit was created."
        );

    }

    return lines.join(
        "\n"
    );

}
