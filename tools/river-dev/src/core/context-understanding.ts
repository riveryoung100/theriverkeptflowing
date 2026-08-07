import type {
RiverDevContextArtifactBundle,
RiverDevContextArtifactMetadata,
RiverDevContextArtifactRelationship,
RiverDevContextRelevanceScore,
RiverDevContextUnderstanding
} from "../types";


function getExtension(
path:
string
): string {

const parts =
    path.split(".");

return parts.length > 1
    ? "." + parts.at(-1)
    : "";

}


function detectImports(
content:
string
): readonly string[] {

const matches =
    [
        ...content.matchAll(
            /from\s+["'](.+?)["']/g
        )
    ];

return matches.map(
    (match) =>
        match[1] ?? ""
).filter(
    Boolean
);

}


function detectExports(
content:
string
): readonly string[] {

const exports =
    [];

if (
    /export\s+(interface|type|const|function|class)/.test(
        content
    )
) {
    exports.push(
        "typescript-export"
    );
}

return exports;

}


function calculateScore(
path:
string,
relationships:
readonly RiverDevContextArtifactRelationship[]
):
RiverDevContextRelevanceScore {

const reasons:
string[] =
    [];

let score =
    0;


if (
    path.includes(
        "context"
    )
) {
    score += 5;

    reasons.push(
        "context-related artifact"
    );
}


const relationshipCount =
    relationships.filter(
        (relationship) =>
            relationship.from === path ||
            relationship.to === path
    ).length;


if (
    relationshipCount > 0
) {
    score += relationshipCount;

    reasons.push(
        "connected through artifact relationships"
    );
}


return {
    path,
    score,
    reasons
};

}


export function analyzeContextArtifacts(
bundle:
RiverDevContextArtifactBundle
):
RiverDevContextUnderstanding {


const metadata:
RiverDevContextArtifactMetadata[] =
    [];


const relationships:
RiverDevContextArtifactRelationship[] =
    [];


for (
    const artifact of bundle.artifacts
) {

    metadata.push(
        {
            path:
                artifact.path,

            extension:
                getExtension(
                    artifact.path
                ),

            bytes:
                artifact.loadedBytes,

            classification:
                artifact.classification
        }
    );


    const imports =
        detectImports(
            artifact.content
        );


    for (
        const imported of imports
    ) {

        relationships.push(
            {
                from:
                    artifact.path,

                to:
                    imported,

                type:
                    "imports",

                reason:
                    "typescript import detected"
            }
        );

    }


    detectExports(
        artifact.content
    );

}


const relevance =
    metadata.map(
        (artifact) =>
            calculateScore(
                artifact.path,
                relationships
            )
    );


return {

    version:
        "1.0.0",

    artifactCount:
        metadata.length,

    metadata,

    relationships,

    relevance

};

}
