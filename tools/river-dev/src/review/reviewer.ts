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


export interface RiverDevReviewSpecification {

    readonly id:
        string;

    readonly name:
        string;

    readonly objective:
        string;

    readonly allowedPaths:
        readonly string[];

    readonly qualityGates:
        readonly string[];

    readonly reviewChecks:
        readonly string[];

}


export interface RiverDevReviewFinding {

    readonly severity:
        "info" |
        "warning" |
        "error";

    readonly code:
        string;

    readonly message:
        string;

    readonly path?:
        string;

}


export interface RiverDevReviewResult {

    readonly reviewId:
        string;

    readonly passed:
        boolean;

    readonly repositoryRoot:
        string;

    readonly branch:
        string;

    readonly changedPaths:
        readonly string[];

    readonly unexpectedPaths:
        readonly string[];

    readonly findings:
        readonly RiverDevReviewFinding[];

    readonly diffSummary:
        string;

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


function containsPotentialSecret(
    source: string
): boolean {

    const secretPatterns = [
        /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
        /\bsk-[A-Za-z0-9_-]{20,}\b/,
        /\bAKIA[0-9A-Z]{16}\b/,
        /\bghp_[A-Za-z0-9]{20,}\b/,
        /\b(?:password|secret|api[_-]?key)\s*[:=]\s*["'][^"']+["']/i
    ];

    return secretPatterns.some(
        (pattern) => {
            return pattern.test(
                source
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


export async function loadReviewSpecification(
    path: string
): Promise<RiverDevReviewSpecification> {

    const source =
        await readFile(
            path,
            "utf8"
        );

    return JSON.parse(
        removeUtf8Bom(
            source
        )
    ) as RiverDevReviewSpecification;

}


export function validateReviewSpecification(
    specification:
        RiverDevReviewSpecification
): void {

    if (
        specification.id.trim().length ===
        0
    ) {
        throw new TypeError(
            "Review specification identifier cannot be empty."
        );
    }

    if (
        specification.name.trim().length ===
        0
    ) {
        throw new TypeError(
            "Review specification name cannot be empty."
        );
    }

    if (
        specification.objective.trim().length ===
        0
    ) {
        throw new TypeError(
            "Review objective cannot be empty."
        );
    }

    if (
        specification.allowedPaths.length ===
        0
    ) {
        throw new TypeError(
            "Review specification must contain allowed paths."
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
            "Review specification allowed paths must be unique."
        );
    }

}


export async function reviewRepository(
    repositoryRoot: string,
    specification:
        RiverDevReviewSpecification
): Promise<RiverDevReviewResult> {

    validateReviewSpecification(
        specification
    );

    const branch =
        await runGit(
            repositoryRoot,
            [
                "branch",
                "--show-current"
            ]
        );

    if (
        branch.length ===
        0
    ) {
        throw new TypeError(
            "Could not determine the current Git branch."
        );
    }

    const statusResult =
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

    const statusRecords =
        statusResult.stdout
            .split(
                "\0"
            )
            .filter(
                (record) => {
                    return record.length >
                        0;
                }
            );

    const changedPaths =
        statusRecords
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
            .filter(
                (path) => {
                    return path.length >
                        0;
                }
            )
            .sort();

    const unexpectedPaths =
        changedPaths.filter(
            (path) => {
                return !isPathAllowed(
                    path,
                    specification.allowedPaths
                );
            }
        );

    const findings:
        RiverDevReviewFinding[] =
        [];

    for (
        const unexpectedPath of
        unexpectedPaths
    ) {

        findings.push({

            severity:
                "error",

            code:
                "unexpected-path",

            message:
                `Changed path is outside the approved review scope: ${unexpectedPath}`,

            path:
                unexpectedPath

        });

    }

    for (
        const changedPath of
        changedPaths
    ) {

        try {

            const source =
                await readFile(
                    new URL(
                        `file:///${repositoryRoot.replaceAll("\\", "/")}/${changedPath}`
                    ),
                    "utf8"
                );

            if (
                containsPotentialSecret(
                    source
                )
            ) {

                findings.push({

                    severity:
                        "error",

                    code:
                        "potential-secret",

                    message:
                        `Potential secret detected in ${changedPath}.`,

                    path:
                        changedPath

                });

            }

        }
        catch {
            // Deleted files and non-text files are reviewed through Git metadata.
        }

    }

    const diffSummary =
        await runGit(
            repositoryRoot,
            [
                "diff",
                "--stat",
                "HEAD"
            ]
        );

    if (
        changedPaths.length ===
        0
    ) {

        findings.push({

            severity:
                "info",

            code:
                "clean-working-tree",

            message:
                "No repository changes are available for review."

        });

    }

    return {

        reviewId:
            specification.id,

        passed:
            findings.every(
                (finding) => {
                    return (
                        finding.severity !==
                        "error"
                    );
                }
            ),

        repositoryRoot,

        branch,

        changedPaths,

        unexpectedPaths,

        findings,

        diffSummary

    };

}

