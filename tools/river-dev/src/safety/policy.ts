import {
    isAbsolute,
    relative,
    resolve
} from "node:path";

import type {
    RiverDevConfiguration
} from "../types";


function normalizePath(
    value: string
): string {

    return value
        .replaceAll(
            "\\",
            "/"
        )
        .replace(
            /^\.\/+/,
            ""
        );

}


export class RiverDevPolicyEngine {

    constructor(
        private readonly configuration:
            RiverDevConfiguration
    ) {}


    assertRepositoryPath(
        candidatePath: string
    ): string {

        const repositoryRoot =
            this.configuration
                .repositoryRoot;

        const resolvedPath =
            resolve(
                repositoryRoot,
                candidatePath
            );

        const relativePath =
            relative(
                repositoryRoot,
                resolvedPath
            );

        if (
            relativePath ===
                ".." ||
            relativePath.startsWith(
                `..\\`
            ) ||
            relativePath.startsWith(
                "../"
            ) ||
            (
                isAbsolute(
                    relativePath
                ) &&
                resolvedPath !==
                    repositoryRoot
            )
        ) {
            throw new TypeError(
                "Path escapes the repository boundary."
            );
        }

        return resolvedPath;

    }


    assertPathIsNotProtected(
        candidatePath: string
    ): void {

        const normalizedCandidate =
            normalizePath(
                candidatePath
            );

        for (
            const protectedPath of
            this.configuration
                .projectMap
                .protectedPaths
        ) {

            const normalizedProtected =
                normalizePath(
                    protectedPath
                );

            if (
                normalizedCandidate ===
                    normalizedProtected ||
                normalizedCandidate.startsWith(
                    `${normalizedProtected}/`
                )
            ) {
                throw new TypeError(
                    `Protected path cannot be modified: ${candidatePath}`
                );
            }

        }

    }


    assertCommandIsAllowed(
        executable: string,
        argumentsList:
            readonly string[]
    ): void {

        const deniedExecutable =
            this.configuration
                .commandPolicy
                .deniedExecutables
                .some(
                    (candidate) => {
                        return (
                            candidate.toLowerCase() ===
                            executable.toLowerCase()
                        );
                    }
                );

        if (deniedExecutable) {
            throw new TypeError(
                `Executable is prohibited: ${executable}`
            );
        }

        if (
            executable.toLowerCase() ===
            "git"
        ) {

            for (
                const argument of
                argumentsList
            ) {

                if (
                    this.configuration
                        .commandPolicy
                        .deniedGitArguments
                        .includes(
                            argument
                        )
                ) {
                    throw new TypeError(
                        `Git argument is prohibited: ${argument}`
                    );
                }

            }

        }

        const allowed =
            this.configuration
                .commandPolicy
                .allowedCommands
                .some(
                    (command) => {

                        if (
                            command.executable
                                .toLowerCase() !==
                            executable.toLowerCase()
                        ) {
                            return false;
                        }

                        if (
                            command.arguments !==
                            undefined
                        ) {
                            return (
                                JSON.stringify(
                                    command.arguments
                                ) ===
                                JSON.stringify(
                                    argumentsList
                                )
                            );
                        }

                        if (
                            command.argumentsPrefix !==
                            undefined
                        ) {
                            return command
                                .argumentsPrefix
                                .every(
                                    (
                                        argument,
                                        index
                                    ) => {
                                        return (
                                            argumentsList[
                                                index
                                            ] ===
                                            argument
                                        );
                                    }
                                );
                        }

                        return true;

                    }
                );

        if (-notAllowed(allowed)) {
            throw new TypeError(
                `Command is not approved: ${executable} ${argumentsList.join(" ")}`
            );
        }

    }

}


function notAllowed(
    allowed: boolean
): boolean {

    return allowed ===
        false;

}


export function createRiverDevPolicyEngine(
    configuration:
        RiverDevConfiguration
): RiverDevPolicyEngine {

    return new
        RiverDevPolicyEngine(
            configuration
        );

}
