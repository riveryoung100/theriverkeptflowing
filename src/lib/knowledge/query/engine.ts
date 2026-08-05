import type {
    KnowledgeClaim,
    KnowledgeGraph,
    KnowledgeNode,
    KnowledgeNodeId,
    KnowledgeRelation
} from "../types";

import type {
    KnowledgeQueryEngine,
    KnowledgeQueryRequest,
    KnowledgeQueryResult
} from "./types";

import {
    validateKnowledgeQueryRequest
} from "./validation";


function applyPagination<T>(
    values: readonly T[],
    request: KnowledgeQueryRequest
): {
    readonly values: readonly T[];
    readonly truncated: boolean;
} {

    const offset =
        request.offset ?? 0;

    const limit =
        request.limit ??
        values.length;

    const paginated =
        values.slice(
            offset,
            offset + limit
        );

    return {

        values:
            paginated,

        truncated:
            offset > 0 ||
            paginated.length <
                values.length

    };

}


function matchesAllKeys(
    recordValues: readonly string[],
    requestedValues:
        readonly string[] | undefined
): boolean {

    if (
        requestedValues ===
        undefined
    ) {
        return true;
    }

    return requestedValues.every(
        (value) => {
            return recordValues.includes(
                value
            );
        }
    );

}


function filterNodes(
    graph: KnowledgeGraph,
    request: KnowledgeQueryRequest
): readonly KnowledgeNode[] {

    const filter =
        request.nodeFilter;

    if (
        filter ===
        undefined
    ) {
        return graph.nodes;
    }

    return graph.nodes.filter(
        (node) => {

            if (
                filter.ids !==
                    undefined &&
                !filter.ids.includes(
                    node.id
                )
            ) {
                return false;
            }

            if (
                filter.nodeTypes !==
                    undefined &&
                !filter.nodeTypes.includes(
                    node.nodeType
                )
            ) {
                return false;
            }

            if (
                filter.statuses !==
                    undefined &&
                !filter.statuses.includes(
                    node.status
                )
            ) {
                return false;
            }

            if (
                filter.visibilities !==
                    undefined &&
                !filter.visibilities.includes(
                    node.visibility
                )
            ) {
                return false;
            }

            if (
                !matchesAllKeys(
                    node.topicKeys,
                    filter.topicKeys
                )
            ) {
                return false;
            }

            if (
                !matchesAllKeys(
                    node.domainKeys,
                    filter.domainKeys
                )
            ) {
                return false;
            }

            if (
                !matchesAllKeys(
                    node.audienceKeys,
                    filter.audienceKeys
                )
            ) {
                return false;
            }

            return true;

        }
    );

}


function filterRelations(
    graph: KnowledgeGraph,
    request: KnowledgeQueryRequest
): readonly KnowledgeRelation[] {

    const filter =
        request.relationFilter;

    if (
        filter ===
        undefined
    ) {
        return graph.relations;
    }

    return graph.relations.filter(
        (relation) => {

            if (
                filter.ids !==
                    undefined &&
                !filter.ids.includes(
                    relation.id
                )
            ) {
                return false;
            }

            if (
                filter.fromNodeIds !==
                    undefined &&
                !filter.fromNodeIds.includes(
                    relation.fromNodeId
                )
            ) {
                return false;
            }

            if (
                filter.toNodeIds !==
                    undefined &&
                !filter.toNodeIds.includes(
                    relation.toNodeId
                )
            ) {
                return false;
            }

            if (
                filter.relationTypes !==
                    undefined &&
                !filter.relationTypes.includes(
                    relation.relationType
                )
            ) {
                return false;
            }

            if (
                filter.statuses !==
                    undefined &&
                !filter.statuses.includes(
                    relation.status
                )
            ) {
                return false;
            }

            if (
                filter.minimumConfidence !==
                    undefined &&
                relation.confidence <
                    filter.minimumConfidence
            ) {
                return false;
            }

            return true;

        }
    );

}


function filterClaims(
    graph: KnowledgeGraph,
    request: KnowledgeQueryRequest
): readonly KnowledgeClaim[] {

    const filter =
        request.claimFilter;

    if (
        filter ===
        undefined
    ) {
        return graph.claims;
    }

    return graph.claims.filter(
        (claim) => {

            if (
                filter.ids !==
                    undefined &&
                !filter.ids.includes(
                    claim.id
                )
            ) {
                return false;
            }

            if (
                filter.subjectNodeIds !==
                    undefined &&
                !filter.subjectNodeIds.includes(
                    claim.subjectNodeId
                )
            ) {
                return false;
            }

            if (
                filter.objectNodeIds !==
                    undefined &&
                (
                    claim.objectNodeId ===
                        undefined ||
                    !filter.objectNodeIds.includes(
                        claim.objectNodeId
                    )
                )
            ) {
                return false;
            }

            if (
                filter.predicates !==
                    undefined &&
                !filter.predicates.includes(
                    claim.predicate
                )
            ) {
                return false;
            }

            if (
                filter.truthStatuses !==
                    undefined &&
                !filter.truthStatuses.includes(
                    claim.truthStatus
                )
            ) {
                return false;
            }

            if (
                filter.statuses !==
                    undefined &&
                !filter.statuses.includes(
                    claim.status
                )
            ) {
                return false;
            }

            if (
                filter.minimumConfidence !==
                    undefined &&
                claim.confidence <
                    filter.minimumConfidence
            ) {
                return false;
            }

            return true;

        }
    );

}


function searchNodes(
    graph: KnowledgeGraph,
    request: KnowledgeQueryRequest
): readonly KnowledgeNode[] {

    const search =
        request.textSearch;

    if (
        search ===
        undefined
    ) {
        return [];
    }

    const text =
        search.text
            .trim()
            .toLowerCase();

    return graph.nodes.filter(
        (node) => {

            const values: string[] = [
                node.canonicalName
            ];

            if (
                search.includeAliases ===
                true
            ) {
                values.push(
                    ...node.aliases
                );
            }

            if (
                search.includeSummary ===
                    true &&
                node.summary !==
                    undefined
            ) {
                values.push(
                    node.summary
                );
            }

            if (
                search.includeDescription ===
                    true &&
                node.description !==
                    undefined
            ) {
                values.push(
                    node.description
                );
            }

            return values.some(
                (value) => {
                    return value
                        .toLowerCase()
                        .includes(
                            text
                        );
                }
            );

        }
    );

}


function collectNeighbors(
    graph: KnowledgeGraph,
    request: KnowledgeQueryRequest
): {
    readonly nodes: readonly KnowledgeNode[];
    readonly relations: readonly KnowledgeRelation[];
} {

    const query =
        request.neighborQuery;

    if (
        query ===
        undefined
    ) {

        return {
            nodes: [],
            relations: []
        };

    }

    const visited =
        new Set<KnowledgeNodeId>([
            query.nodeId
        ]);

    const foundRelations =
        new Map<
            KnowledgeRelation["id"],
            KnowledgeRelation
        >();

    let frontier:
        KnowledgeNodeId[] =
        [
            query.nodeId
        ];

    for (
        let depth = 0;
        depth <
            query.maximumDepth;
        depth += 1
    ) {

        const nextFrontier:
            KnowledgeNodeId[] =
            [];

        for (
            const nodeId of
            frontier
        ) {

            for (
                const relation of
                graph.relations
            ) {

                if (
                    query.relationTypes !==
                        undefined &&
                    !query.relationTypes.includes(
                        relation.relationType
                    )
                ) {
                    continue;
                }

                const outgoing =
                    relation.fromNodeId ===
                    nodeId;

                const incoming =
                    relation.toNodeId ===
                    nodeId;

                const includeOutgoing =
                    query.direction ===
                        "outgoing" ||
                    query.direction ===
                        "both";

                const includeIncoming =
                    query.direction ===
                        "incoming" ||
                    query.direction ===
                        "both";

                let neighborId:
                    KnowledgeNodeId |
                    undefined;

                if (
                    outgoing &&
                    includeOutgoing
                ) {
                    neighborId =
                        relation.toNodeId;
                }
                else if (
                    incoming &&
                    includeIncoming
                ) {
                    neighborId =
                        relation.fromNodeId;
                }

                if (
                    neighborId ===
                    undefined
                ) {
                    continue;
                }

                foundRelations.set(
                    relation.id,
                    relation
                );

                if (
                    !visited.has(
                        neighborId
                    )
                ) {

                    visited.add(
                        neighborId
                    );

                    nextFrontier.push(
                        neighborId
                    );

                }

            }

        }

        frontier =
            nextFrontier;

        if (
            frontier.length ===
            0
        ) {
            break;
        }

    }

    visited.delete(
        query.nodeId
    );

    return {

        nodes:
            graph.nodes.filter(
                (node) => {
                    return visited.has(
                        node.id
                    );
                }
            ),

        relations:
            [
                ...foundRelations.values()
            ]

    };

}


export class DeterministicKnowledgeQueryEngine
implements KnowledgeQueryEngine {

    query(
        graph: KnowledgeGraph,
        request: KnowledgeQueryRequest
    ): KnowledgeQueryResult {

        const validation =
            validateKnowledgeQueryRequest(
                request
            );

        if (
            !validation.valid
        ) {

            throw new TypeError(
                [
                    "Cannot execute an invalid knowledge query.",
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

        let nodes:
            readonly KnowledgeNode[] =
            [];

        let relations:
            readonly KnowledgeRelation[] =
            [];

        let claims:
            readonly KnowledgeClaim[] =
            [];

        switch (
            request.mode
        ) {

            case "node-by-id":

                nodes =
                    graph.nodes.filter(
                        (node) => {
                            return (
                                node.id ===
                                request.nodeId
                            );
                        }
                    );

                break;

            case "nodes":

                nodes =
                    filterNodes(
                        graph,
                        request
                    );

                break;

            case "relations":

                relations =
                    filterRelations(
                        graph,
                        request
                    );

                break;

            case "claims":

                claims =
                    filterClaims(
                        graph,
                        request
                    );

                break;

            case "neighbors": {

                const neighbors =
                    collectNeighbors(
                        graph,
                        request
                    );

                nodes =
                    neighbors.nodes;

                relations =
                    neighbors.relations;

                break;

            }

            case "search":

                nodes =
                    searchNodes(
                        graph,
                        request
                    );

                break;

        }

        const totalNodes =
            nodes.length;

        const totalRelations =
            relations.length;

        const totalClaims =
            claims.length;

        const paginatedNodes =
            applyPagination(
                nodes,
                request
            );

        const paginatedRelations =
            applyPagination(
                relations,
                request
            );

        const paginatedClaims =
            applyPagination(
                claims,
                request
            );

        return {

            request,

            nodes:
                paginatedNodes.values,

            relations:
                paginatedRelations.values,

            claims:
                paginatedClaims.values,

            totalNodes,

            totalRelations,

            totalClaims,

            truncated:
                paginatedNodes.truncated ||
                paginatedRelations.truncated ||
                paginatedClaims.truncated,

            warnings:
                []

        };

    }

}


export function createKnowledgeQueryEngine():
KnowledgeQueryEngine {

    return new
        DeterministicKnowledgeQueryEngine();

}

