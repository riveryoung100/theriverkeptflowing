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
    createRiverDevDevelopmentContext
} from "../core/context-engine";

import {
    createImplementationPlan,
    loadPhaseSpecification
} from "../core/planner";

import type {
    RiverDevImplementationPlan
} from "../core/planner";


export async function planRiverDevPhase(
    configuration:
        RiverDevConfiguration,
    specificationPath:
        string,
    generatedAt?:
        string
): Promise<RiverDevImplementationPlan> {

    const policy =
        createRiverDevPolicyEngine(
            configuration
        );

    const resolvedPath =
        policy.assertRepositoryPath(
            specificationPath
        );

    const specification =
        await loadPhaseSpecification(
            resolvedPath
        );

    const context =
        await createRiverDevDevelopmentContext(
            configuration,
            generatedAt,
            resolvedPath
        );

    return createImplementationPlan(
        configuration,
        specification,
        generatedAt,
        context.understanding
    );

}


export function formatImplementationPlan(
    plan:
        RiverDevImplementationPlan
): string {

    const lines = [

        "River Development Agent Plan",

        `Plan ID: ${plan.planId}`,

        `Phase: ${plan.phase}`,

        `Branch: ${plan.branch}`,

        `Objective: ${plan.objective}`,

        `Commit message: ${plan.commitMessage}`,

        `Allowed paths: ${plan.allowedPaths.length}`,

        `Required tests: ${plan.requiredTests.length}`,

        `Quality gates: ${plan.requiredQualityGates.length}`,

        `Maximum repair attempts: ${plan.maximumRepairAttempts}`,

        `Scope expansion allowed: ${plan.scopeExpansionAllowed}`,

        "Implementation steps:"

    ];

    for (
        const step of
        plan.steps
    ) {

        lines.push(
            `${step.order}. [${step.type}] ${step.description}`
        );

    }

    lines.push(
        "Allowed files:"
    );

    for (
        const path of
        plan.allowedPaths
    ) {

        lines.push(
            `- ${path}`
        );

    }

    return lines.join(
        "\n"
    );

}


export function getDefaultSpecificationPath(
    configuration:
        RiverDevConfiguration
): string {

    return resolve(
        configuration.repositoryRoot,
        ".river-dev",
        "specifications",
        "dev-01-planning-engine.json"
    );

}
