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
    createVerificationRunner,
    loadVerificationSpecification
} from "../execution/verification";

import type {
    RiverDevVerificationResult
} from "../execution/verification";


export async function verifyRiverDev(
    configuration:
        RiverDevConfiguration,
    specificationPath:
        string
): Promise<RiverDevVerificationResult> {

    const policy =
        createRiverDevPolicyEngine(
            configuration
        );

    const resolvedSpecificationPath =
        policy.assertRepositoryPath(
            specificationPath
        );

    const specification =
        await loadVerificationSpecification(
            resolvedSpecificationPath
        );

    const runner =
        createVerificationRunner(
            configuration
        );

    return runner.verify(
        specification
    );

}


export function getDefaultVerificationSpecificationPath(
    configuration:
        RiverDevConfiguration
): string {

    return resolve(
        configuration.repositoryRoot,
        ".river-dev",
        "specifications",
        "dev-03-verification.json"
    );

}


export function formatVerificationResult(
    result:
        RiverDevVerificationResult
): string {

    const lines = [

        "River Development Agent Verification",

        `Verification ID: ${result.verificationId}`,

        `Branch: ${result.branch}`,

        `Passed: ${result.passed}`,

        `Commands: ${result.commandCount}`

    ];

    for (
        const command of
        result.commands
    ) {

        lines.push(
            `[${command.passed ? "PASS" : "FAIL"}] ${command.name} (${command.exitCode})`
        );

        if (
            command.passed ===
                false &&
            command.stderr.trim().length >
                0
        ) {
            lines.push(
                `  Error: ${command.stderr.trim()}`
            );
        }

    }

    if (
        result.warnings.length >
        0
    ) {

        lines.push(
            "Warnings:"
        );

        for (
            const warning of
            result.warnings
        ) {
            lines.push(
                `- ${warning}`
            );
        }

    }

    return lines.join(
        "\n"
    );

}

