import type {
    RiverDevConfiguration
} from "../types";

import {
    createRiverDevPolicyEngine
} from "../safety/policy";

import {
    createRiverDevDevelopmentContext
} from "../core/context-engine";

import {
    generateImplementationIntent
} from "../core/implementation-intent-generator";

import type {
    RiverDevImplementationContentGenerationProvider,
    RiverDevImplementationIntentGenerationResult
} from "../core/implementation-intent-generator";

import {
    loadImplementationPlan
} from "./generate-proposal";


export interface GenerateIntentRiverDevOptions {

    readonly repositoryRoot:
        string;

    readonly configuration:
        RiverDevConfiguration;

    readonly planPath:
        string;

    readonly specificationPath:
        string;

    readonly generatedAt:
        string;

    readonly provider:
        RiverDevImplementationContentGenerationProvider;

}


export async function loadImplementationPlanForIntentGeneration(
    repositoryRoot:
        string,
    planPath:
        string
) {

    const {
        isAbsolute,
        relative,
        resolve
    } =
        await import(
            "node:path"
        );

    const resolvedRoot =
        resolve(
            repositoryRoot
        );

    const resolvedPath =
        resolve(
            resolvedRoot,
            planPath
        );

    const repositoryRelativePath =
        relative(
            resolvedRoot,
            resolvedPath
        );

    if (
        repositoryRelativePath === ".." ||
        repositoryRelativePath.startsWith(
            `..${process.platform === "win32" ? "\\" : "/"}`
        ) ||
        isAbsolute(
            repositoryRelativePath
        )
    ) {
        throw new Error(
            "Implementation plan path must remain within the repository root."
        );
    }

    return loadImplementationPlan(
        resolvedPath
    );

}


export async function generateIntentRiverDev(
    options:
        GenerateIntentRiverDevOptions
): Promise<RiverDevImplementationIntentGenerationResult> {

    if (
        options.repositoryRoot !==
        options.configuration.repositoryRoot
    ) {
        throw new Error(
            "Generate-intent repository root must match River Dev configuration repository root."
        );
    }

    const policy =
        createRiverDevPolicyEngine(
            options.configuration
        );

    const resolvedPlanPath =
        policy.assertRepositoryPath(
            options.planPath
        );

    const resolvedSpecificationPath =
        policy.assertRepositoryPath(
            options.specificationPath
        );

    const plan =
        await loadImplementationPlan(
            resolvedPlanPath
        );

    const context =
        await createRiverDevDevelopmentContext(
            options.configuration,
            options.generatedAt,
            resolvedSpecificationPath
        );

    if (
        context.identity.branch !==
        plan.branch
    ) {
        throw new Error(
            `Generate-intent plan branch "${plan.branch}" does not match repository branch "${context.identity.branch}".`
        );
    }

    return generateImplementationIntent(
        plan,
        context,
        options.provider
    );

}


export function formatIntentGenerationResult(
    result:
        RiverDevImplementationIntentGenerationResult
): string {

    return JSON.stringify(
        result.intent,
        null,
        2
    );

}