import type {
    RiverDevDevelopmentContext
} from "../types";

import type {
    RiverDevImplementationContentGenerationProvider,
    RiverDevImplementationContentGenerationRequest
} from "../core/implementation-intent-generator";

import type {
    RiverDevModelTransport
} from "./openai-compatible-transport";

export interface RiverDevModelSourceAuthoringProviderOptions {
    readonly transport: RiverDevModelTransport;
}

function requireGeneratedContent(
    content: string
): string {
    if (content.trim().length === 0) {
        throw new TypeError(
            "Model source-authoring provider returned empty candidate content."
        );
    }

    return content;
}

function serializeDevelopmentContext(
    context: RiverDevDevelopmentContext
): string {
    return JSON.stringify(
        context,
        null,
        2
    );
}

function createSystemInstruction(): string {
    return [
        "You are a bounded source-authoring provider for the River Development Agent.",
        "Author candidate file content only for the exact target path supplied by governance.",
        "Do not choose another path, broaden scope, request repository mutation, approve execution, invoke tools, use Git, commit, push, deploy, or claim any authority.",
        "Return only the complete candidate file content. Do not wrap it in Markdown fences and do not include explanatory prose."
    ].join("\n");
}

function createUserInstruction(
    request:
        RiverDevImplementationContentGenerationRequest
): string {
    return [
        `Objective: ${request.plan.objective}`,
        `Target path: ${request.decision.path}`,
        `Planned action: ${request.decision.action}`,
        `Planning reason: ${request.decision.reason}`,
        "",
        "Authoritative architecture-grounded development context:",
        serializeDevelopmentContext(
            request.context
        ),
        "",
        `Return only the complete candidate content for ${request.decision.path}.`
    ].join("\n");
}

export function createModelSourceAuthoringProvider(
    options:
        RiverDevModelSourceAuthoringProviderOptions
): RiverDevImplementationContentGenerationProvider {
    return async (
        request:
            RiverDevImplementationContentGenerationRequest
    ) => {
        const response =
            await options.transport({
                system:
                    createSystemInstruction(),
                user:
                    createUserInstruction(
                        request
                    )
            });

        return {
            content:
                requireGeneratedContent(
                    response.content
                ),
            overwrite:
                request.decision.action ===
                "modify",
            reason:
                request.decision.reason
        };
    };
}