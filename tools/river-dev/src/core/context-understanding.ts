import type {
    RiverDevContextArtifactBundle,
    RiverDevContextArtifactMetadata,
    RiverDevContextArtifactRelationship,
    RiverDevContextRelevanceScore,
    RiverDevContextUnderstanding,
    RiverDevRepositoryArchitectureMap
} from "../types";


function getExtension(
    path: string
): string {

    const parts =
        path.split(".");

    return parts.length > 1
        ? "." + parts.at(-1)
        : "";

}


function calculateScore(
    path: string,
    relationships: readonly RiverDevContextArtifactRelationship[]
): RiverDevContextRelevanceScore {

    const reasons: string[] = [];
    let score = 0;

    const outgoingCount =
        relationships.filter(
            (relationship) => relationship.from === path
        ).length;

    const incomingCount =
        relationships.filter(
            (relationship) => relationship.to === path
        ).length;

    if (outgoingCount > 0) {
        score += outgoingCount;
        reasons.push("has repository-local dependencies");
    }

    if (incomingCount > 0) {
        score += incomingCount;
        reasons.push("has repository-local dependents");
    }

    return {
        path,
        score,
        reasons
    };

}


export function analyzeContextArtifacts(
    bundle: RiverDevContextArtifactBundle,
    architecture: RiverDevRepositoryArchitectureMap
): RiverDevContextUnderstanding {

    const metadata: RiverDevContextArtifactMetadata[] = [];
    const relationships: RiverDevContextArtifactRelationship[] = [];
    const loadedPaths = new Set(
        bundle.artifacts.map((artifact) => artifact.path)
    );

    for (const artifact of bundle.artifacts) {

        metadata.push({
            path: artifact.path,
            extension: getExtension(artifact.path),
            bytes: artifact.loadedBytes,
            classification: artifact.classification
        });

    }

    const architectureModules =
        architecture.modules
            .filter((module) => loadedPaths.has(module.path))
            .slice()
            .sort((left, right) => left.path.localeCompare(right.path));

    for (const module of architectureModules) {

        for (const dependency of module.dependencies) {

            relationships.push({
                from: module.path,
                to: dependency,
                type: "imports",
                reason: "repository architecture dependency"
            });

        }

    }

    relationships.sort((left, right) =>
        left.from.localeCompare(right.from) ||
        left.to.localeCompare(right.to) ||
        left.type.localeCompare(right.type) ||
        left.reason.localeCompare(right.reason)
    );

    const relevance =
        metadata.map((artifact) =>
            calculateScore(
                artifact.path,
                relationships
            )
        );

    return {
        version: "1.0.0",
        artifactCount: metadata.length,
        metadata,
        relationships,
        relevance
    };

}
