import type {
    RiverDevConfiguration,
    RiverDevDevelopmentContext
} from "../types";

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

    ];

    return lines.join("\n");

}
