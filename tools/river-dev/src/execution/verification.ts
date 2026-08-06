import {
    execFile
} from "node:child_process";

import {
    readFile
} from "node:fs/promises";

import {
    promisify
} from "node:util";

import type {
    RiverDevCommandDefinition,
    RiverDevConfiguration
} from "../types";

import {
    createRiverDevPolicyEngine
} from "../safety/policy";


const execFileAsync =
    promisify(
        execFile
    );


export const RIVER_DEV_VERIFICATION_VERSION =
    "1.0.0" as const;


export interface RiverDevVerificationCommandRequest {

    readonly name:
        string;

    readonly required:
        boolean;

}


export interface RiverDevVerificationSpecification {

    readonly version:
        string;

    readonly verificationId:
        string;

    readonly branch:
        string;

    readonly commands:
        readonly RiverDevVerificationCommandRequest[];

}


export interface RiverDevVerificationCommandResult {

    readonly name:
        string;

    readonly executable:
        string;

    readonly arguments:
        readonly string[];

    readonly required:
        boolean;

    readonly passed:
        boolean;

    readonly exitCode:
        number;

    readonly stdout:
        string;

    readonly stderr:
        string;

    readonly durationMilliseconds:
        number;

}


export interface RiverDevVerificationResult {

    readonly version:
        typeof RIVER_DEV_VERIFICATION_VERSION;

    readonly verificationId:
        string;

    readonly branch:
        string;

    readonly passed:
        boolean;

    readonly requiredCommandsPassed:
        boolean;

    readonly commandCount:
        number;

    readonly commands:
        readonly RiverDevVerificationCommandResult[];

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


export async function loadVerificationSpecification(
    path: string
): Promise<RiverDevVerificationSpecification> {

    const source =
        await readFile(
            path,
            "utf8"
        );

    return JSON.parse(
        removeUtf8Bom(
            source
        )
    ) as RiverDevVerificationSpecification;

}


function resolveCommand(
    configuration:
        RiverDevConfiguration,
    commandName:
        string
): RiverDevCommandDefinition {

    const command =
        configuration
            .commandPolicy
            .allowedCommands
            .find(
                (candidate) => {
                    return (
                        candidate.name ===
                        commandName
                    );
                }
            );

    if (
        command ===
        undefined
    ) {
        throw new TypeError(
            `Unknown verification command: ${commandName}`
        );
    }

    return command;

}


export function validateVerificationSpecification(
    configuration:
        RiverDevConfiguration,
    specification:
        RiverDevVerificationSpecification
): void {

    assertNonEmpty(
        specification.verificationId,
        "Verification identifier"
    );

    assertNonEmpty(
        specification.branch,
        "Verification branch"
    );

    if (
        specification.commands.length ===
        0
    ) {
        throw new TypeError(
            "Verification specification must contain at least one command."
        );
    }

    const seenCommands =
        new Set<string>();

    for (
        const commandRequest of
        specification.commands
    ) {

        assertNonEmpty(
            commandRequest.name,
            "Verification command name"
        );

        if (
            seenCommands.has(
                commandRequest.name
            )
        ) {
            throw new TypeError(
                `Verification commands must be unique: ${commandRequest.name}`
            );
        }

        seenCommands.add(
            commandRequest.name
        );

        resolveCommand(
            configuration,
            commandRequest.name
        );

    }

}


function getCommandArguments(
    command:
        RiverDevCommandDefinition
): readonly string[] {

    if (
        command.arguments !==
        undefined
    ) {
        return command.arguments;
    }

    if (
        command.argumentsPrefix !==
        undefined
    ) {
        return command.argumentsPrefix;
    }

    return [];

}


export class RiverDevVerificationRunner {

    constructor(
        private readonly configuration:
            RiverDevConfiguration
    ) {}


    async verify(
        specification:
            RiverDevVerificationSpecification
    ): Promise<RiverDevVerificationResult> {

        validateVerificationSpecification(
            this.configuration,
            specification
        );

        const currentBranch =
            await this.getCurrentBranch();

        if (
            currentBranch !==
            specification.branch
        ) {
            throw new TypeError(
                `Verification branch mismatch. Expected ${specification.branch}, received ${currentBranch}.`
            );
        }

        const policy =
            createRiverDevPolicyEngine(
                this.configuration
            );

        const results:
            RiverDevVerificationCommandResult[] =
            [];

        for (
            const commandRequest of
            specification.commands
        ) {

            const command =
                resolveCommand(
                    this.configuration,
                    commandRequest.name
                );

            const argumentsList =
                getCommandArguments(
                    command
                );

            policy.assertCommandIsAllowed(
                command.executable,
                argumentsList
            );

            const startedAt =
                performance.now();

            try {

                const npmExecutablePath =
                    process.env.npm_execpath;

                const useNodePackageManager =
                    (
                        command.executable ===
                            "npm" ||
                        command.executable ===
                            "npx"
                    ) &&
                    npmExecutablePath !==
                        undefined &&
                    npmExecutablePath.trim().length >
                        0;

                const executable =
                    useNodePackageManager
                        ? process.execPath
                        : command.executable;

                const executionArguments =
                    useNodePackageManager
                        ? [
                            npmExecutablePath,
                            ...argumentsList
                        ]
                        : [
                            ...argumentsList
                        ];

                const execution =
                    await execFileAsync(
                        executable,
                        executionArguments,
                        {
                            cwd:
                                this.configuration
                                    .repositoryRoot,

                            windowsHide:
                                true,

                            timeout:
                                this.configuration
                                    .safetyPolicy
                                    .commands
                                    .maximumCommandSeconds *
                                1000
                        }
                    );

                results.push({

                    name:
                        commandRequest.name,

                    executable:
                        command.executable,

                    arguments:
                        argumentsList,

                    required:
                        commandRequest.required,

                    passed:
                        true,

                    exitCode:
                        0,

                    stdout:
                        execution.stdout,

                    stderr:
                        execution.stderr,

                    durationMilliseconds:
                        performance.now() -
                        startedAt

                });

            }
            catch (
                error: unknown
            ) {

                const record =
                    (
                        error !==
                            null &&
                        typeof error ===
                            "object"
                    )
                        ? error as {
                            code?: unknown;
                            stdout?: unknown;
                            stderr?: unknown;
                        }
                        : {};

                const exitCode =
                    typeof record.code ===
                    "number"
                        ? record.code
                        : 1;

                results.push({

                    name:
                        commandRequest.name,

                    executable:
                        command.executable,

                    arguments:
                        argumentsList,

                    required:
                        commandRequest.required,

                    passed:
                        false,

                    exitCode,

                    stdout:
                        typeof record.stdout ===
                        "string"
                            ? record.stdout
                            : "",

                    stderr:
                        typeof record.stderr ===
                        "string"
                            ? record.stderr
                            : String(
                                error
                            ),

                    durationMilliseconds:
                        performance.now() -
                        startedAt

                });

            }

        }

        const requiredCommandsPassed =
            results
                .filter(
                    (result) => {
                        return result.required;
                    }
                )
                .every(
                    (result) => {
                        return result.passed;
                    }
                );

        return {

            version:
                RIVER_DEV_VERIFICATION_VERSION,

            verificationId:
                specification.verificationId,

            branch:
                specification.branch,

            passed:
                requiredCommandsPassed,

            requiredCommandsPassed,

            commandCount:
                results.length,

            commands:
                results,

            warnings:
                results
                    .filter(
                        (result) => {
                            return (
                                !result.required &&
                                !result.passed
                            );
                        }
                    )
                    .map(
                        (result) => {
                            return (
                                `Optional verification failed: ${result.name}`
                            );
                        }
                    )

        };

    }


    private async getCurrentBranch():
    Promise<string> {

        const result =
            await execFileAsync(
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


export function createVerificationRunner(
    configuration:
        RiverDevConfiguration
): RiverDevVerificationRunner {

    return new
        RiverDevVerificationRunner(
            configuration
        );

}


