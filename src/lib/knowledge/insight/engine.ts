import {
    createHash
} from "node:crypto";

import {
    KNOWLEDGE_INSIGHT_SCHEMA_VERSION
} from "./types";

import type {
    KnowledgeInsight,
    KnowledgeInsightEngine,
    KnowledgeInsightEngineResult,
    KnowledgeInsightEvidence,
    KnowledgeInsightId,
    KnowledgeInsightRequest
} from "./types";

import {
    validateKnowledgeInsightRequest,
    validateKnowledgeInsightResult
} from "./validation";


function createDeterministicInsightId(
    request: KnowledgeInsightRequest
): KnowledgeInsightId {

    const source =
        JSON.stringify({

            type:
                request.type,

            title:
                request.title.trim(),

            requestedAt:
                request.requestedAt,

            conclusion:
                request.reasoning.conclusion,

            explanation:
                request.reasoning.explanation,

            nodeIds:
                request.reasoning
                    .evidence
                    .nodes
                    .map(
                        (node) => {
                            return node.id;
                        }
                    )
                    .sort(),

            relationIds:
                request.reasoning
                    .evidence
                    .relations
                    .map(
                        (relation) => {
                            return relation.id;
                        }
                    )
                    .sort(),

            claimIds:
                request.reasoning
                    .evidence
                    .claims
                    .map(
                        (claim) => {
                            return claim.id;
                        }
                    )
                    .sort()

        });

    const hash =
        createHash(
            "sha256"
        )
            .update(
                source
            )
            .digest(
                "hex"
            );

    const uuid =
        [
            hash.slice(0, 8),
            hash.slice(8, 12),
            `5${hash.slice(13, 16)}`,
            `8${hash.slice(17, 20)}`,
            hash.slice(20, 32)
        ].join(
            "-"
        );

    return (
        `insight:${uuid}`
    ) as KnowledgeInsightId;

}


function uniqueSorted<T extends string>(
    values: readonly T[]
): readonly T[] {

    return [
        ...new Set(
            values
        )
    ].sort();

}


function createEvidence(
    request: KnowledgeInsightRequest
): KnowledgeInsightEvidence {

    return {

        nodeIds:
            uniqueSorted(
                request.reasoning
                    .evidence
                    .nodes
                    .map(
                        (node) => {
                            return node.id;
                        }
                    )
            ),

        relationIds:
            uniqueSorted(
                request.reasoning
                    .evidence
                    .relations
                    .map(
                        (relation) => {
                            return relation.id;
                        }
                    )
            ),

        claimIds:
            uniqueSorted(
                request.reasoning
                    .evidence
                    .claims
                    .map(
                        (claim) => {
                            return claim.id;
                        }
                    )
            )

    };

}


function evidenceCount(
    evidence: KnowledgeInsightEvidence
): number {

    return (
        evidence.nodeIds.length +
        evidence.relationIds.length +
        evidence.claimIds.length
    );

}


function calculateConfidence(
    request: KnowledgeInsightRequest,
    evidence: KnowledgeInsightEvidence
): number {

    if (
        request.reasoning.conclusion ===
        "unknown"
    ) {
        return 0;
    }

    if (
        request.reasoning.conclusion ===
        "mixed"
    ) {
        return 0.5;
    }

    if (
        evidenceCount(
            evidence
        ) === 0
    ) {
        return 0.5;
    }

    return 1;

}


function createWarnings(
    request: KnowledgeInsightRequest,
    evidence: KnowledgeInsightEvidence,
    confidence: number
): readonly string[] {

    const warnings:
        string[] =
        [];

    if (
        evidenceCount(
            evidence
        ) === 0
    ) {

        warnings.push(
            "The insight was created without direct graph evidence."
        );

    }

    if (
        request.minimumConfidence !==
            undefined &&
        confidence <
            request.minimumConfidence
    ) {

        warnings.push(
            "The generated insight is below the requested minimum confidence."
        );

    }

    return warnings;

}


export class DeterministicKnowledgeInsightEngine
implements KnowledgeInsightEngine {

    create(
        request: KnowledgeInsightRequest
    ): KnowledgeInsightEngineResult {

        validateKnowledgeInsightRequest(
            request
        );

        const evidence =
            createEvidence(
                request
            );

        if (
            request.requireEvidence ===
                true &&
            evidenceCount(
                evidence
            ) === 0
        ) {

            throw new TypeError(
                "Insight creation requires evidence."
            );

        }

        const confidence =
            calculateConfidence(
                request,
                evidence
            );

        const requiresReview =
            request.reasoning.conclusion ===
                "mixed" ||
            request.reasoning.conclusion ===
                "unknown" ||
            (
                request.minimumConfidence !==
                    undefined &&
                confidence <
                    request.minimumConfidence
            );

        const insight:
            KnowledgeInsight = {

            id:
                createDeterministicInsightId(
                    request
                ),

            type:
                request.type,

            title:
                request.title.trim(),

            summary:
                request.reasoning.explanation.trim(),

            conclusion:
                request.reasoning.conclusion,

            confidence,

            evidence,

            explanation:
                request.reasoning.explanation.trim(),

            status:
                requiresReview
                    ? "review-needed"
                    : "active",

            reviewStatus:
                requiresReview
                    ? "pending"
                    : "not-required",

            createdAt:
                request.requestedAt,

            version:
                1,

            schemaVersion:
                KNOWLEDGE_INSIGHT_SCHEMA_VERSION

        };

        const result:
            KnowledgeInsightEngineResult = {

            insight,

            warnings:
                createWarnings(
                    request,
                    evidence,
                    confidence
                )

        };

        validateKnowledgeInsightResult(
            result
        );

        return result;

    }

}


export function createKnowledgeInsightEngine():
KnowledgeInsightEngine {

    return new
        DeterministicKnowledgeInsightEngine();

}
