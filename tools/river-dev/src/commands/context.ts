import type {
    RiverDevConfiguration,
    RiverDevDevelopmentContext
} from "../types";

import {
createImplementationPlan
} from "../core/planning-engine";

import {
    createRiverDevDevelopmentContext
} from "../core/context-engine";


export async function createContextReport(
    configuration: RiverDevConfiguration
): Promise<RiverDevDevelopmentContext> {

    return createRiverDevDevelopmentContext(
        configuration
    );

}


export function formatContextReport(
    context: RiverDevDevelopmentContext
): string {


const plan =
    createImplementationPlan(
        context.understanding,
        context.phase.objective
    );
const lines: string[] = [

        "River Development Context",

        `Phase: ${context.phase.phase}`,
        `Branch: ${context.identity.branch}`,
        `Commit: ${context.identity.commit}`,

        `Repository: ${context.identity.repositoryRoot}`,

        `Generated: ${context.generatedAt}`,

        "",

        "Project",

        `- ${context.project.name}`,
        `- ${context.project.repositoryType}`,
        `- ${context.project.packageManager}`,

        "",

        "Relevant repository entries:",

        ...context.relevantEntries.map(
            (entry) =>
                `- ${entry.path} (${entry.reason})`
        )

,

    "",

    "Implementation Plan:",

    ...plan.steps.map(
        (step) =>
            `- ${step}`
    ),

    "",

    "Planning Decisions:",

    ...plan.decisions.map(
        (decision) =>
            `- ${decision.path}: ${decision.reason}`
    )



];

return lines.join("\n");

}
