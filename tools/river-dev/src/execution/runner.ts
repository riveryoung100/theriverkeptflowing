import {
    mkdir,
    readFile,
    writeFile
} from "node:fs/promises";

import {
    dirname
} from "node:path";

import type {
    RiverDevConfiguration
} from "../types";

import {
    createRiverDevPolicyEngine
} from "../safety/policy";


export const RIVER_DEV_IMPLEMENTATION_VERSION =
    "1.0.0" as const;


export type RiverDevImplementationMode =
    | "dry-run"
    | "apply";


export interface RiverDevWriteFileOperation {

    readonly type:
        "write-file";

    readonly path:
        string;

    readonly content:
        string;

    readonly overwrite:
        boolean;

}


export type RiverDevImplementationOperation =
    RiverDevWriteFileOperation;


export interface RiverDevImplementationManifest {

    readonly version:
        string;

    readonly implementationId:
        string;

    readonly planId:
        string;

    readonly branch:
        string;

    readonly description:
        string;

    readonly operations:
        readonly RiverDevImplementationOperation[];

}


export interface RiverDevOperationResult {

    readonly index:
        number;

    readonly type:
        RiverDevImplementationOperation["type"];

    readonly path:
        string;

    readonly status:
        | "validated"
        | "applied";

    readonly message:
        string;

}


export interface RiverDevImplementationResult {

    readonly version:
        typeof RIVER_DEV_IMPLEMENTATION_VERSION;

    readonly implementationId:
        string;

    readonly planId:
        string;

    readonly branch:
        string;

    readonly mode:
        RiverDevImplementationMode;

    readonly applied:
        boolean;

    readonly operationCount:
        number;

    readonly operations:
        readonly RiverDevOperationResult[];

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


function assertNonEmpty(
    value: string,
    label: string
): void {

    if (
        value.trim().length ===
        0
    ) {
        throw new TypeError(
            `${label} cannot be empty.`
        );
    }

}


export async function loadImplementationManifest(
    path: string
): Promise<RiverDevImplementationManifest> {

    const source =
        await readFile(
            path,
            "utf8"
        );

    return JSON.parse(
        removeUtf8Bom(
            source
        )
    ) as RiverDevImplementationManifest;

}


export function validateImplementationManifest(
    configuration:
        RiverDevConfiguration,
    manifest:
        RiverDevImplementationManifest
): void {

    assertNonEmpty(
        manifest.implementationId,
        "Implementation identifier"
    );

    assertNonEmpty(
        manifest.planId,
        "Plan identifier"
    );

    assertNonEmpty(
        manifest.branch,
        "Implementation branch"
    );

    assertNonEmpty(
        manifest.description,
        "Implementation description"
    );

    if (
        manifest.operations.length ===
        0
    ) {
        throw new TypeError(
            "Implementation manifest must contain at least one operation."
        );
    }

    const policy =
        createRiverDevPolicyEngine(
            configuration
        );

    const seenPaths =
        new Set<string>();

    for (
        const operation of
        manifest.operations
    ) {

        if (
            operation.type !==
            "write-file"
        ) {
            throw new TypeError(
                `Unsupported implementation operation: ${(operation as { type?: unknown }).type ?? "(missing)"}`
            );
        }

        assertNonEmpty(
            operation.path,
            "Operation path"
        );

        policy.assertRepositoryPath(
            operation.path
        );

        policy.assertPathIsNotProtected(
            operation.path
        );

        const normalizedPath =
            operation.path
                .replaceAll(
                    "\\",
                    "/"
                )
                .replace(
                    /^\.\/+/,
                    ""
                );

        if (
            seenPaths.has(
                normalizedPath
            )
        ) {
            throw new TypeError(
                `Implementation paths must be unique: ${normalizedPath}`
            );
        }

        seenPaths.add(
            normalizedPath
        );

    }

}


export class SafeRiverDevImplementationRunner {

    constructor(
        private readonly configuration:
            RiverDevConfiguration
    ) {}


    async execute(
        manifest:
            RiverDevImplementationManifest,
        mode:
            RiverDevImplementationMode =
                "dry-run"
    ): Promise<RiverDevImplementationResult> {

        validateImplementationManifest(
            this.configuration,
            manifest
        );

        const currentBranch =
            await this.readCurrentBranch();

        if (
            currentBranch !==
            manifest.branch
        ) {
            throw new TypeError(
                `Implementation branch mismatch. Expected ${manifest.branch}, received ${currentBranch}.`
            );
        }

        const results:
            RiverDevOperationResult[] =
            [];

        for (
            const [
                index,
                operation
            ] of
            manifest.operations.entries()
        ) {

            const policy =
                createRiverDevPolicyEngine(
                    this.configuration
                );

            const resolvedPath =
                policy.assertRepositoryPath(
                    operation.path
                );

            policy.assertPathIsNotProtected(
                operation.path
            );

            if (
                mode ===
                "apply"
            ) {

                await mkdir(
                    dirname(
                        resolvedPath
                    ),
                    {
                        recursive:
                            true
                    }
                );

                if (
                    operation.overwrite ===
                    false
                ) {

                    try {

                        await readFile(
                            resolvedPath,
                            "utf8"
                        );

                        throw new TypeError(
                            `Refusing to overwrite existing file: ${operation.path}`
                        );

                    }
                    catch (
                        error: unknown
                    ) {

                        if (
                            error !==
                                null &&
                            typeof error ===
                                "object" &&
                            "code" in error &&
                            error.code ===
                                "ENOENT"
                        ) {
                            // File does not exist, so creation is allowed.
                        }
                        else {
                            throw error;
                        }

                    }

                }

                await writeFile(
                    resolvedPath,
                    operation.content,
                    "utf8"
                );

                results.push({

                    index,

                    type:
                        operation.type,

                    path:
                        operation.path,

                    status:
                        "applied",

                    message:
                        `Applied write-file operation to ${operation.path}.`

                });

            }
            else {

                results.push({

                    index,

                    type:
                        operation.type,

                    path:
                        operation.path,

                    status:
                        "validated",

                    message:
                        `Validated write-file operation for ${operation.path}.`

                });

            }

        }

        return {

            version:
                RIVER_DEV_IMPLEMENTATION_VERSION,

            implementationId:
                manifest.implementationId,

            planId:
                manifest.planId,

            branch:
                manifest.branch,

            mode,

            applied:
                mode ===
                "apply",

            operationCount:
                results.length,

            operations:
                results,

            warnings:
                []

        };

    }


    private async readCurrentBranch():
    Promise<string> {

        const {
            execFile
        } =
            await import(
                "node:child_process"
            );

        const {
            promisify
        } =
            await import(
                "node:util"
            );

        const execute =
            promisify(
                execFile
            );

        const result =
            await execute(
                "git",
                [
                    "branch",
                    "--show-current"
                ],
                {
                    cwd:
                        this.configuration
                            .repositoryRoot,
                    windowsHide:
                        true
                }
            );

        const branch =
            result.stdout.trim();

        if (
            branch.length ===
            0
        ) {
            throw new TypeError(
                "Could not determine the current Git branch."
            );
        }

        return branch;

    }

}


export function createImplementationRunner(
    configuration:
        RiverDevConfiguration
): SafeRiverDevImplementationRunner {

    return new
        SafeRiverDevImplementationRunner(
            configuration
        );

}
