import type {
    KnowledgeClaim,
    KnowledgeGraph,
    KnowledgeNode,
    KnowledgeNodeId,
    KnowledgeRelation
} from "../types";

import type {
    KnowledgeEvidenceSet,
    KnowledgeReasoningConclusion,
    KnowledgeReasoningEngine,
    KnowledgeReasoningPath,
    KnowledgeReasoningRequest,
    KnowledgeReasoningResult
} from "./types";

import {
    validateKnowledgeReasoningExecution
} from "./validation";


interface PathState {

    readonly nodeIds:
        readonly KnowledgeNodeId[];

    readonly relationIds:
        readonly KnowledgeRelation["id"][];

}


function emptyEvidence():
KnowledgeEvidenceSet {

    return {

        nodes:
            [],

        relations:
            [],

        claims:
            []

    };

}


function uniqueNodes(
    values: readonly KnowledgeNode[]
): readonly KnowledgeNode[] {

    return [
        ...new Map(
            values.map(
                (node) => {
                    return [
                        node.id,
                        node
                    ];
                }
            )
        ).values()
    ];

}


function uniqueRelations(
    values: readonly KnowledgeRelation[]
): readonly KnowledgeRelation[] {

    return [
        ...new Map(
            values.map(
                (relation) => {
                    return [
                        relation.id,
                        relation
                    ];
                }
            )
        ).values()
    ];

}


function uniqueClaims(
    values: readonly KnowledgeClaim[]
): readonly KnowledgeClaim[] {

    return [
        ...new Map(
            values.map(
                (claim) => {
                    return [
                        claim.id,
                        claim
                    ];
                }
            )
        ).values()
    ];

}


function relationPassesConfidence(
    relation: KnowledgeRelation,
    request: KnowledgeReasoningRequest
): boolean {

    return (
        request.minimumConfidence ===
            undefined ||
        relation.confidence >=
            request.minimumConfidence
    );

}


function claimPassesConfidence(
    claim: KnowledgeClaim,
    request: KnowledgeReasoningRequest
): boolean {

    return (
        request.minimumConfidence ===
            undefined ||
        claim.confidence >=
            request.minimumConfidence
    );

}


function findPaths(
    graph: KnowledgeGraph,
    request: KnowledgeReasoningRequest
): readonly KnowledgeReasoningPath[] {

    const sourceNodeId =
        request.sourceNodeId;

    const targetNodeId =
        request.targetNodeId;

    if (
        sourceNodeId ===
            undefined ||
        targetNodeId ===
            undefined
    ) {
        return [];
    }

    const maximumDepth =
        request.maximumDepth ?? 5;

    const completed:
        KnowledgeReasoningPath[] =
        [];

    const queue:
        PathState[] =
        [
            {
                nodeIds: [
                    sourceNodeId
                ],
                relationIds: []
            }
        ];

    while (
        queue.length > 0
    ) {

        const current =
            queue.shift();

        if (
            current ===
            undefined
        ) {
            break;
        }

        const currentNodeId =
            current.nodeIds[
                current.nodeIds.length - 1
            ];

        if (
            current.relationIds.length >=
            maximumDepth
        ) {
            continue;
        }

        for (
            const relation of
            graph.relations
        ) {

            if (
                relation.fromNodeId !==
                currentNodeId
            ) {
                continue;
            }

            if (
                !relationPassesConfidence(
                    relation,
                    request
                )
            ) {
                continue;
            }

            const nextNodeId =
                relation.toNodeId;

            if (
                current.nodeIds.includes(
                    nextNodeId
                )
            ) {
                continue;
            }

            const nextNodeIds = [
                ...current.nodeIds,
                nextNodeId
            ];

            const nextRelationIds = [
                ...current.relationIds,
                relation.id
            ];

            if (
                nextNodeId ===
                targetNodeId
            ) {

                completed.push({

                    nodeIds:
                        nextNodeIds,

                    relationIds:
                        nextRelationIds,

                    length:
                        nextRelationIds.length

                });

                continue;

            }

            queue.push({

                nodeIds:
                    nextNodeIds,

                relationIds:
                    nextRelationIds

            });

        }

    }

    return completed;

}


function evidenceFromPaths(
    graph: KnowledgeGraph,
    paths: readonly KnowledgeReasoningPath[]
): KnowledgeEvidenceSet {

    const nodeIds =
        new Set(
            paths.flatMap(
                (path) => {
                    return path.nodeIds;
                }
            )
        );

    const relationIds =
        new Set(
            paths.flatMap(
                (path) => {
                    return path.relationIds;
                }
            )
        );

    return {

        nodes:
            graph.nodes.filter(
                (node) => {
                    return nodeIds.has(
                        node.id
                    );
                }
            ),

        relations:
            graph.relations.filter(
                (relation) => {
                    return relationIds.has(
                        relation.id
                    );
                }
            ),

        claims:
            []

    };

}


function reasonSupportPath(
    graph: KnowledgeGraph,
    request: KnowledgeReasoningRequest
): KnowledgeReasoningResult {

    const paths =
        findPaths(
            graph,
            request
        );

    const supported =
        paths.length > 0;

    return {

        request,

        status:
            "completed",

        conclusion:
            supported
                ? "supported"
                : "unknown",

        paths,

        evidence:
            evidenceFromPaths(
                graph,
                paths
            ),

        explanation:
            supported
                ? "A deterministic relation path connects the requested nodes."
                : "No qualifying relation path connects the requested nodes.",

        warnings:
            []

    };

}


function reasonClaimEvidence(
    graph: KnowledgeGraph,
    request: KnowledgeReasoningRequest
): KnowledgeReasoningResult {

    const claim =
        graph.claims.find(
            (candidate) => {
                return (
                    candidate.id ===
                    request.claimId
                );
            }
        );

    if (
        claim ===
        undefined
    ) {

        return {

            request,

            status:
                "inconclusive",

            conclusion:
                "unknown",

            paths:
                [],

            evidence:
                emptyEvidence(),

            explanation:
                "The requested claim could not be found.",

            warnings:
                []

        };

    }

    const evidenceClaims =
        claimPassesConfidence(
            claim,
            request
        )
            ? [claim]
            : [];

    const relatedNodeIds =
        new Set<KnowledgeNodeId>([
            claim.subjectNodeId
        ]);

    if (
        claim.objectNodeId !==
        undefined
    ) {
        relatedNodeIds.add(
            claim.objectNodeId
        );
    }

    return {

        request,

        status:
            "completed",

        conclusion:
            evidenceClaims.length > 0
                ? (
                    claim.truthStatus ===
                    "supported"
                        ? "supported"
                        : claim.truthStatus ===
                            "contradicted"
                            ? "contradicted"
                            : "unknown"
                )
                : "unknown",

        paths:
            [],

        evidence: {

            nodes:
                graph.nodes.filter(
                    (node) => {
                        return relatedNodeIds.has(
                            node.id
                        );
                    }
                ),

            relations:
                [],

            claims:
                evidenceClaims

        },

        explanation:
            evidenceClaims.length > 0
                ? "The requested claim and its directly referenced nodes were returned as evidence."
                : "The claim did not meet the requested confidence threshold.",

        warnings:
            []

    };

}


function reasonContradiction(
    graph: KnowledgeGraph,
    request: KnowledgeReasoningRequest
): KnowledgeReasoningResult {

    const subjectClaim =
        request.claimId ===
            undefined
            ? undefined
            : graph.claims.find(
                (claim) => {
                    return (
                        claim.id ===
                        request.claimId
                    );
                }
            );

    const subjectNodeId =
        subjectClaim?.subjectNodeId ??
        request.sourceNodeId;

    const relevantClaims =
        graph.claims.filter(
            (claim) => {

                return (
                    claim.subjectNodeId ===
                        subjectNodeId &&
                    claimPassesConfidence(
                        claim,
                        request
                    )
                );

            }
        );

    const supported =
        relevantClaims.some(
            (claim) => {
                return (
                    claim.truthStatus ===
                    "supported"
                );
            }
        );

    const contradicted =
        relevantClaims.some(
            (claim) => {
                return (
                    claim.truthStatus ===
                    "contradicted"
                );
            }
        );

    let conclusion:
        KnowledgeReasoningConclusion =
        "unknown";

    if (
        supported &&
        contradicted
    ) {
        conclusion =
            "mixed";
    }
    else if (
        contradicted
    ) {
        conclusion =
            "contradicted";
    }
    else if (
        supported
    ) {
        conclusion =
            "supported";
    }

    const relatedNodeIds =
        new Set<KnowledgeNodeId>();

    for (
        const claim of
        relevantClaims
    ) {

        relatedNodeIds.add(
            claim.subjectNodeId
        );

        if (
            claim.objectNodeId !==
            undefined
        ) {
            relatedNodeIds.add(
                claim.objectNodeId
            );
        }

    }

    return {

        request,

        status:
            "completed",

        conclusion,

        paths:
            [],

        evidence: {

            nodes:
                graph.nodes.filter(
                    (node) => {
                        return relatedNodeIds.has(
                            node.id
                        );
                    }
                ),

            relations:
                [],

            claims:
                relevantClaims

        },

        explanation:
            relevantClaims.length > 0
                ? "Claims for the selected subject were compared deterministically by truth status."
                : "No qualifying claims were available for contradiction analysis.",

        warnings:
            []

    };

}


function connectedNeighborIds(
    graph: KnowledgeGraph,
    nodeId: KnowledgeNodeId,
    request: KnowledgeReasoningRequest
): Set<KnowledgeNodeId> {

    const neighborIds =
        new Set<KnowledgeNodeId>();

    for (
        const relation of
        graph.relations
    ) {

        if (
            !relationPassesConfidence(
                relation,
                request
            )
        ) {
            continue;
        }

        if (
            relation.fromNodeId ===
            nodeId
        ) {
            neighborIds.add(
                relation.toNodeId
            );
        }

        if (
            relation.toNodeId ===
            nodeId
        ) {
            neighborIds.add(
                relation.fromNodeId
            );
        }

    }

    return neighborIds;

}


function reasonSharedNeighbors(
    graph: KnowledgeGraph,
    request: KnowledgeReasoningRequest
): KnowledgeReasoningResult {

    const sourceNodeId =
        request.sourceNodeId!;

    const targetNodeId =
        request.targetNodeId!;

    const sourceNeighbors =
        connectedNeighborIds(
            graph,
            sourceNodeId,
            request
        );

    const targetNeighbors =
        connectedNeighborIds(
            graph,
            targetNodeId,
            request
        );

    const sharedIds =
        new Set(
            [...sourceNeighbors].filter(
                (nodeId) => {
                    return targetNeighbors.has(
                        nodeId
                    );
                }
            )
        );

    const relations =
        graph.relations.filter(
            (relation) => {

                return (
                    relationPassesConfidence(
                        relation,
                        request
                    ) &&
                    (
                        (
                            relation.fromNodeId ===
                                sourceNodeId &&
                            sharedIds.has(
                                relation.toNodeId
                            )
                        ) ||
                        (
                            relation.toNodeId ===
                                sourceNodeId &&
                            sharedIds.has(
                                relation.fromNodeId
                            )
                        ) ||
                        (
                            relation.fromNodeId ===
                                targetNodeId &&
                            sharedIds.has(
                                relation.toNodeId
                            )
                        ) ||
                        (
                            relation.toNodeId ===
                                targetNodeId &&
                            sharedIds.has(
                                relation.fromNodeId
                            )
                        )
                    )
                );

            }
        );

    const nodes =
        graph.nodes.filter(
            (node) => {

                return (
                    node.id ===
                        sourceNodeId ||
                    node.id ===
                        targetNodeId ||
                    sharedIds.has(
                        node.id
                    )
                );

            }
        );

    return {

        request,

        status:
            "completed",

        conclusion:
            sharedIds.size > 0
                ? "supported"
                : "unknown",

        paths:
            [],

        evidence: {

            nodes,

            relations,

            claims:
                []

        },

        explanation:
            sharedIds.size > 0
                ? "The requested nodes share one or more directly connected neighbors."
                : "The requested nodes do not share directly connected neighbors.",

        warnings:
            []

    };

}


function reasonTransitiveRelations(
    graph: KnowledgeGraph,
    request: KnowledgeReasoningRequest
): KnowledgeReasoningResult {

    const paths =
        findPaths(
            graph,
            request
        );

    const transitivePaths =
        paths.filter(
            (path) => {
                return (
                    path.length >= 2
                );
            }
        );

    return {

        request,

        status:
            "completed",

        conclusion:
            transitivePaths.length > 0
                ? "supported"
                : "unknown",

        paths:
            transitivePaths,

        evidence:
            evidenceFromPaths(
                graph,
                transitivePaths
            ),

        explanation:
            transitivePaths.length > 0
                ? "A deterministic multi-step relation path connects the requested nodes."
                : "No qualifying multi-step relation path connects the requested nodes.",

        warnings:
            []

    };

}


export class DeterministicKnowledgeReasoningEngine
implements KnowledgeReasoningEngine {

    reason(
        graph: KnowledgeGraph,
        request: KnowledgeReasoningRequest
    ): KnowledgeReasoningResult {

        const validation =
            validateKnowledgeReasoningExecution(
                graph,
                request
            );

        if (
            !validation.valid
        ) {

            throw new TypeError(
                [
                    "Cannot execute invalid knowledge reasoning.",
                    ...validation.issues.map(
                        (item) => {
                            return (
                                `${item.code}: ${item.message}`
                            );
                        }
                    )
                ].join(
                    " "
                )
            );

        }

        let result:
            KnowledgeReasoningResult;

        switch (
            request.mode
        ) {

            case "support-path":

                result =
                    reasonSupportPath(
                        graph,
                        request
                    );

                break;

            case "contradiction-check":

                result =
                    reasonContradiction(
                        graph,
                        request
                    );

                break;

            case "claim-evidence":

                result =
                    reasonClaimEvidence(
                        graph,
                        request
                    );

                break;

            case "shared-neighbors":

                result =
                    reasonSharedNeighbors(
                        graph,
                        request
                    );

                break;

            case "transitive-relations":

                result =
                    reasonTransitiveRelations(
                        graph,
                        request
                    );

                break;

        }

        return {

            ...result,

            evidence: {

                nodes:
                    uniqueNodes(
                        result.evidence.nodes
                    ),

                relations:
                    uniqueRelations(
                        result.evidence.relations
                    ),

                claims:
                    uniqueClaims(
                        result.evidence.claims
                    )

            }

        };

    }

}


export function createKnowledgeReasoningEngine():
KnowledgeReasoningEngine {

    return new
        DeterministicKnowledgeReasoningEngine();

}

