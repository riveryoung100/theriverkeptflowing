import {
    execFile
} from "node:child_process";

import {
    readFile
} from "node:fs/promises";

import {
    dirname,
    resolve
} from "node:path";

import {
    promisify
} from "node:util";

import type {
    RiverDevConfiguration
} from "../types";

import {
    runAutonomousRepairLoop
} from "../execution/repair-loop";

import type {
    RiverDevRepairLoopResult,
    RiverDevRepairLoopSpecification
} from "../execution/repair-loop";


const execFileAsync =
    promisify(
        execFile
    );


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


async function loadRepairSpecification(
    path: string
): Promise<RiverDevRepairLoopSpecification> {

    const source =
        await readFile(
            path,
            "utf8"
        );

    return JSON.parse(
        removeUtf8Bom(
            source
        )
    ) as RiverDevRepairLoopSpecification;

}


async function runMainTypecheck(
    repositoryRoot: string
): Promise<{
    readonly passed:
        boolean;

    readonly failureCode?:
        string;

    readonly message:
        string;
}> {

    try {

        const npmCliPath =
            resolve(
                dirname(
                    process.execPath
                ),
                "node_modules",
                "npm",
                "bin",
                "npm-cli.js"
            );

        await execFileAsync(
            process.execPath,
            [
                npmCliPath,
                "run",
                "typecheck"
            ],
            {
                cwd:
                    repositoryRoot,

                windowsHide:
                    true
            }
        );

        return {

            passed:
                true,

            message:
                "Main project typecheck passed."

        };

    }
    catch (
        error
    ) {

        const message =
            error instanceof Error
                ? error.message
                : String(
                    error
                );

        return {

            passed:
                false,

            failureCode:
                "typecheck",

            message

        };

    }

}


export function getDefaultRepairSpecificationPath(
    configuration:
        RiverDevConfiguration
): string {

    return resolve(
        configuration.repositoryRoot,
        ".river-dev",
        "specifications",
        "dev-06-autonomous-repair-loop.json"
    );

}


export async function repairRiverDev(
    configuration:
        RiverDevConfiguration,
    specificationPath:
        string,
    apply:
        boolean
): Promise<RiverDevRepairLoopResult> {

    const specification =
        await loadRepairSpecification(
            specificationPath
        );

    return runAutonomousRepairLoop(
        {

            getCurrentBranch:
                async () => {

                    const result =
                        await execFileAsync(
                            "git",
                            [
                                "branch",
                                "--show-current"
                            ],
                            {
                                cwd:
                                    configuration.repositoryRoot,

                                windowsHide:
                                    true
                            }
                        );

                    return result.stdout.trim();

                },

            verify:
                async () => {
                    return runMainTypecheck(
                        configuration.repositoryRoot
                    );
                },

            resolveManifest:
                async () => {

                    /*
                     * DEV-06 currently contains the repair-loop
                     * safety and retry architecture.
                     *
                     * Approved repair manifests will be registered
                     * in the next DEV-06 increment.
                     */

                    return undefined;

                },

            applyManifest:
                async () => {

                    throw new TypeError(
                        "No approved repair manifest is currently registered."
                    );

                },

            review:
                async () => {

                    return false;

                }

        },
        {

            specification,

            dryRun:
                !apply

        }
    );

}


export function formatRepairResult(
    result:
        RiverDevRepairLoopResult
): string {

    const lines = [

        "River Development Agent Repair",

        `Specification ID: ${result.specificationId}`,

        `Branch: ${result.branch}`,

        `Outcome: ${result.outcome}`,

        `Passed: ${result.passed}`,

        `Dry run: ${result.dryRun}`,

        `Attempts: ${result.attempts.length}`,

        `Verification: ${result.finalVerification.message}`

    ];

    for (
        const attempt of
        result.attempts
    ) {

        lines.push(
            `Attempt ${attempt.attempt}: ${attempt.message}`
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

    if (
        result.outcome ===
        "already-passing"
    ) {

        lines.push(
            "No repair was necessary."
        );

    }

    return lines.join(
        "\n"
    );

}

