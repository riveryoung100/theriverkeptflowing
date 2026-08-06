import {
    readFile
} from "node:fs/promises";

import {
    resolve
} from "node:path";

import type {
    RiverDevCommandPolicy,
    RiverDevConfiguration,
    RiverDevProjectMap,
    RiverDevQualityGates,
    RiverDevSafetyPolicy
} from "../types";


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


async function readJsonFile<T>(
    path: string
): Promise<T> {

    const source =
        await readFile(
            path,
            "utf8"
        );

    const normalizedSource =
        removeUtf8Bom(
            source
        );

    return JSON.parse(
        normalizedSource
    ) as T;

}


function requireString(
    value: unknown,
    label: string
): asserts value is string {

    if (
        typeof value !==
            "string" ||
        value.trim().length ===
            0
    ) {
        throw new TypeError(
            `${label} must be a non-empty string.`
        );
    }

}


export function validateConfiguration(
    configuration: RiverDevConfiguration
): void {

    requireString(
        configuration.repositoryRoot,
        "Repository root"
    );

    requireString(
        configuration.policyRoot,
        "Policy root"
    );

    requireString(
        configuration.projectMap.project.name,
        "Project name"
    );

    if (
        configuration.safetyPolicy
            .repositoryBoundary
            .allowOutsideRepository
    ) {
        throw new TypeError(
            "River Dev may not operate outside the repository."
        );
    }

    if (
        configuration.safetyPolicy
            .git
            .allowPush ===
        true
    ) {
        throw new TypeError(
            "Autonomous Git push must remain disabled."
        );
    }

    if (
        configuration.safetyPolicy
            .repairs
            .maximumAttempts <
        1
    ) {
        throw new TypeError(
            "At least one repair attempt must be configured."
        );
    }

    if (
        configuration.qualityGates
            .requiredBeforeCommit
            .length ===
        0
    ) {
        throw new TypeError(
            "At least one quality gate is required."
        );
    }

    if (
        configuration.commandPolicy
            .allowedCommands
            .length ===
        0
    ) {
        throw new TypeError(
            "At least one approved command is required."
        );
    }

}


export async function loadRiverDevConfiguration(
    repositoryRoot:
        string = process.cwd()
): Promise<RiverDevConfiguration> {

    const resolvedRepositoryRoot =
        resolve(
            repositoryRoot
        );

    const policyRoot =
        resolve(
            resolvedRepositoryRoot,
            ".river-dev"
        );

    const [
        projectMap,
        safetyPolicy,
        qualityGates,
        commandPolicy
    ] =
        await Promise.all([

            readJsonFile<RiverDevProjectMap>(
                resolve(
                    policyRoot,
                    "project-map.json"
                )
            ),

            readJsonFile<RiverDevSafetyPolicy>(
                resolve(
                    policyRoot,
                    "safety-policy.json"
                )
            ),

            readJsonFile<RiverDevQualityGates>(
                resolve(
                    policyRoot,
                    "quality-gates.json"
                )
            ),

            readJsonFile<RiverDevCommandPolicy>(
                resolve(
                    policyRoot,
                    "commands.json"
                )
            )

        ]);

    const configuration:
        RiverDevConfiguration = {

        repositoryRoot:
            resolvedRepositoryRoot,

        policyRoot,

        projectMap,

        safetyPolicy,

        qualityGates,

        commandPolicy

    };

    validateConfiguration(
        configuration
    );

    return configuration;

}
