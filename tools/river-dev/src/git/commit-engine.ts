import {
    execFile
} from "node:child_process";

import {
    readFile
} from "node:fs/promises";

import {
    promisify
} from "node:util";


const execFileAsync =
    promisify(
        execFile
    );


export interface RiverDevCommitRequirements {

    readonly workingTreeMustContainChanges:
        boolean;

    readonly verificationMustPass:
        boolean;

    readonly reviewMustPass:
        boolean;

    readonly stagedScopeMustMatchAllowedPaths:
        boolean;

    readonly pushAllowed:
        boolean;

    readonly amendAllowed:
        boolean;

    readonly allowEmptyCommit:
        boolean;

}


export interface RiverDevCommitSpecification {

    readonly version:
        string;

    readonly id:
        string;

    readonly name:
        string;

    readonly objective:
        string;

    readonly branch:
        string;

    readonly commitMessage:
        string;

    readonly allowedPaths:
        readonly string[];

    readonly requirements:
        RiverDevCommitRequirements;

    readonly qualityGates:
        readonly string[];

}


export interface RiverDevCommitRequest {

    readonly specification:
        RiverDevCommitSpecification;

    readonly verificationPassed:
        boolean;

    readonly reviewPassed:
        boolean;

    readonly dryRun:
        boolean;

}


export interface RiverDevCommitResult {

    readonly specificationId:
        string;

    readonly branch:
        string;

    readonly commitMessage:
        string;

    readonly dryRun:
        boolean;

    readonly committed:
        boolean;

    readonly stagedPaths:
        readonly string[];

    readonly commitHash?:
        string;

    readonly warnings:
        readonly string[];

}


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


function normalizePath(
    path: string
): string {

    return path
        .replaceAll(
            "\\",
            "/"
        )
        .replace(
            /^\.\/+/,
            ""
        )
        .replace(
            /\/+$/,
            ""
        );

}


function isPathAllowed(
    path: string,
    allowedPaths: readonly string[]
): boolean {

    const normalizedPath =
        normalizePath(
            path
        );

    return allowedPaths.some(
        (allowedPath) => {

            const normalizedAllowedPath =
                normalizePath(
                    allowedPath
                );

            return (
                normalizedPath ===
                normalizedAllowedPath ||
                normalizedPath.startsWith(
                    `${normalizedAllowedPath}/`
                )
            );

        }
    );

}


async function runGit(
    repositoryRoot: string,
    argumentsList: readonly string[]
): Promise<string> {

    const result =
        await execFileAsync(
            "git",
            [
                ...argumentsList
            ],
            {
                cwd:
                    repositoryRoot,

                windowsHide:
                    true
            }
        );

    return result.stdout.trim();

}


async function readChangedPaths(
    repositoryRoot: string
): Promise<readonly string[]> {

    const result =
        await execFileAsync(
            "git",
            [
                "-c",
                "status.showUntrackedFiles=all",
                "status",
                "--porcelain=v1",
                "-z"
            ],
            {
                cwd:
                    repositoryRoot,

                windowsHide:
                    true
            }
        );

    return result.stdout
        .split(
            "\0"
        )
        .filter(
            (record) => {
                return record.length >
                    0;
            }
        )
        .map(
            (record) => {

                if (
                    record.length <
                    4
                ) {
                    throw new TypeError(
                        `Malformed Git status record: ${record}`
                    );
                }

                return normalizePath(
                    record.slice(
                        3
                    )
                );

            }
        )
        .sort();

}


export async function loadCommitSpecification(
    path: string
): Promise<RiverDevCommitSpecification> {

    const source =
        await readFile(
            path,
            "utf8"
        );

    return JSON.parse(
        removeUtf8Bom(
            source
        )
    ) as RiverDevCommitSpecification;

}


export function validateCommitSpecification(
    specification:
        RiverDevCommitSpecification
): void {

    if (
        specification.id.trim().length ===
        0
    ) {
        throw new TypeError(
            "Commit specification identifier cannot be empty."
        );
    }

    if (
        specification.branch.trim().length ===
        0
    ) {
        throw new TypeError(
            "Commit specification branch cannot be empty."
        );
    }

    if (
        specification.commitMessage.trim().length ===
        0
    ) {
        throw new TypeError(
            "Commit message cannot be empty."
        );
    }

    if (
        specification.allowedPaths.length ===
        0
    ) {
        throw new TypeError(
            "Commit specification must contain allowed paths."
        );
    }

    const normalizedAllowedPaths =
        specification.allowedPaths.map(
            normalizePath
        );

    if (
        new Set(
            normalizedAllowedPaths
        ).size !==
        normalizedAllowedPaths.length
    ) {
        throw new TypeError(
            "Commit allowed paths must be unique."
        );
    }

    if (
        specification.requirements.pushAllowed
    ) {
        throw new TypeError(
            "Autonomous push is not allowed."
        );
    }

    if (
        specification.requirements.amendAllowed
    ) {
        throw new TypeError(
            "Commit amendment is not allowed."
        );
    }

}


export async function createSafeLocalCommit(
    repositoryRoot: string,
    request:
        RiverDevCommitRequest
): Promise<RiverDevCommitResult> {

    validateCommitSpecification(
        request.specification
    );

    const {
        specification
    } =
        request;

    const branch =
        await runGit(
            repositoryRoot,
            [
                "branch",
                "--show-current"
            ]
        );

    if (
        branch !==
        specification.branch
    ) {
        throw new TypeError(
            `Commit branch mismatch. Expected ${specification.branch}, received ${branch}.`
        );
    }

    if (
        specification
            .requirements
            .verificationMustPass &&
        !request.verificationPassed
    ) {
        throw new TypeError(
            "Commit blocked because verification did not pass."
        );
    }

    if (
        specification
            .requirements
            .reviewMustPass &&
        !request.reviewPassed
    ) {
        throw new TypeError(
            "Commit blocked because review did not pass."
        );
    }

    const changedPaths =
        await readChangedPaths(
            repositoryRoot
        );

    if (
        specification
            .requirements
            .workingTreeMustContainChanges &&
        changedPaths.length ===
            0
    ) {
        throw new TypeError(
            "Commit blocked because the working tree contains no changes."
        );
    }

    const unexpectedPaths =
        changedPaths.filter(
            (path) => {
                return !isPathAllowed(
                    path,
                    specification.allowedPaths
                );
            }
        );

    if (
        specification
            .requirements
            .stagedScopeMustMatchAllowedPaths &&
        unexpectedPaths.length >
            0
    ) {
        throw new TypeError(
            `Commit scope contains unexpected paths: ${unexpectedPaths.join(", ")}`
        );
    }

    if (
        request.dryRun
    ) {

        return {

            specificationId:
                specification.id,

            branch,

            commitMessage:
                specification.commitMessage,

            dryRun:
                true,

            committed:
                false,

            stagedPaths:
                changedPaths,

            warnings:
                []

        };

    }

    if (
        changedPaths.length ===
            0 &&
        !specification
            .requirements
            .allowEmptyCommit
    ) {
        throw new TypeError(
            "Empty commits are not allowed."
        );
    }

    await execFileAsync(
        "git",
        [
            "add",
            "--",
            ...changedPaths
        ],
        {
            cwd:
                repositoryRoot,

            windowsHide:
                true
        }
    );

    const stagedPaths =
        (
            await runGit(
                repositoryRoot,
                [
                    "diff",
                    "--cached",
                    "--name-only"
                ]
            )
        )
            .split(
                /\r?\n/
            )
            .map(
                normalizePath
            )
            .filter(
                (path) => {
                    return path.length >
                        0;
                }
            )
            .sort();

    const unexpectedStagedPaths =
        stagedPaths.filter(
            (path) => {
                return !isPathAllowed(
                    path,
                    specification.allowedPaths
                );
            }
        );

    if (
        unexpectedStagedPaths.length >
        0
    ) {
        await execFileAsync(
            "git",
            [
                "reset"
            ],
            {
                cwd:
                    repositoryRoot,

                windowsHide:
                    true
            }
        );

        throw new TypeError(
            `Unexpected staged paths detected: ${unexpectedStagedPaths.join(", ")}`
        );
    }

    await execFileAsync(
        "git",
        [
            "commit",
            "-m",
            specification.commitMessage
        ],
        {
            cwd:
                repositoryRoot,

            windowsHide:
                true
        }
    );

    const commitHash =
        await runGit(
            repositoryRoot,
            [
                "rev-parse",
                "--short",
                "HEAD"
            ]
        );

    return {

        specificationId:
            specification.id,

        branch,

        commitMessage:
            specification.commitMessage,

        dryRun:
            false,

        committed:
            true,

        stagedPaths,

        commitHash,

        warnings:
            []

    };

}
