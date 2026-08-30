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

interface RiverDevModelFacingContextArtifact {
    readonly path: string;
    readonly classification: string;
    readonly reason: string;
    readonly content: string;
}

interface RiverDevModelFacingContextProjection {
    readonly version: "1.0.0";
    readonly targetPath: string;
    readonly artifacts: readonly RiverDevModelFacingContextArtifact[];
}

function normalizeModelContextPath(
    value: string
): string {
    return value
        .replace(/\\/g, "/")
        .replace(/^\.\/+/, "");
}

function isSameOrDescendantModelContextPath(
    candidate: string,
    boundary: string
): boolean {
    const normalizedCandidate =
        normalizeModelContextPath(candidate);
    const normalizedBoundary =
        normalizeModelContextPath(boundary)
            .replace(/\/+$/, "");

    return (
        normalizedCandidate === normalizedBoundary ||
        normalizedCandidate.startsWith(
            `${normalizedBoundary}/`
        )
    );
}

function isSecretLikeModelContextPath(
    path: string
): boolean {
    const normalized =
        normalizeModelContextPath(path)
            .toLowerCase();
    const segments =
        normalized.split("/");

    return segments.some((segment) =>
        segment === ".env" ||
        segment.startsWith(".env.") ||
        segment === ".git" ||
        segment === "node_modules" ||
        segment === "dist" ||
        segment === "secrets"
    );
}

function createModelFacingContextProjection(
    request: RiverDevImplementationContentGenerationRequest
): RiverDevModelFacingContextProjection {
    const targetPath =
        normalizeModelContextPath(
            request.decision.path
        );
    const excludedPaths =
        request.plan.excludedPaths.map(
            normalizeModelContextPath
        );
    const relevantPaths =
        new Set(
            request.context.understanding.relevance
                .filter((entry) => entry.score > 0)
                .map((entry) =>
                    normalizeModelContextPath(
                        entry.path
                    )
                )
        );

    const artifacts =
        request.context.artifacts.artifacts
            .filter((artifact) => {
                const path =
                    normalizeModelContextPath(
                        artifact.path
                    );

                if (
                    isSecretLikeModelContextPath(path)
                ) {
                    return false;
                }

                if (
                    excludedPaths.some((excludedPath) =>
                        isSameOrDescendantModelContextPath(
                            path,
                            excludedPath
                        )
                    )
                ) {
                    return false;
                }

                return (
                    path === targetPath ||
                    relevantPaths.has(path)
                );
            })
            .map((artifact) => ({
                path:
                    normalizeModelContextPath(
                        artifact.path
                    ),
                classification:
                    artifact.classification,
                reason:
                    artifact.reason,
                content:
                    artifact.content
            }))
            .sort((left, right) =>
                left.path.localeCompare(
                    right.path
                )
            );

    return {
        version: "1.0.0",
        targetPath,
        artifacts
    };
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
        JSON.stringify(
            createModelFacingContextProjection(request),
            null,
            2
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