import type {
    KnowledgeClaimId,
    KnowledgeEngine,
    KnowledgeEngineRequest,
    KnowledgeEngineResult,
    KnowledgeGraph,
    KnowledgeNodeId,
    KnowledgeRelationId
} from "./types";

import {
    validateKnowledgeGraph
} from "./validation";


export function createEmptyKnowledgeGraph():
KnowledgeGraph {

    return {

        nodes:
            [],

        relations:
            [],

        claims:
            [],

        revisions:
            []

    };

}


export class DeterministicKnowledgeEngine
implements KnowledgeEngine {

    build(
        request: KnowledgeEngineRequest
    ): KnowledgeEngineResult {

        const graph:
        KnowledgeGraph = {

            nodes: [
                ...request.nodes
            ],

            relations: [
                ...request.relations
            ],

            claims: [
                ...request.claims
            ],

            revisions: [
                ...request.revisions
            ]

        };

        const validation =
            validateKnowledgeGraph(
                graph
            );

        if (
            !validation.valid
        ) {

            const messages =
                validation.issues
                    .filter(
                        (item) => {
                            return (
                                item.severity ===
                                "error"
                            );
                        }
                    )
                    .map(
                        (item) => {
                            return (
                                `${item.code}: ${item.message}`
                            );
                        }
                    );

            throw new TypeError(
                [
                    "Cannot build an invalid knowledge graph.",
                    ...messages
                ].join(
                    " "
                )
            );

        }

        const createdNodeIds:
        KnowledgeNodeId[] =
            graph.nodes.map(
                (node) => {
                    return node.id;
                }
            );

        const createdRelationIds:
        KnowledgeRelationId[] =
            graph.relations.map(
                (relation) => {
                    return relation.id;
                }
            );

        const createdClaimIds:
        KnowledgeClaimId[] =
            graph.claims.map(
                (claim) => {
                    return claim.id;
                }
            );

        return {

            graph,

            createdNodeIds,

            createdRelationIds,

            createdClaimIds,

            warnings:
                validation.issues
                    .filter(
                        (item) => {
                            return (
                                item.severity ===
                                "warning"
                            );
                        }
                    )
                    .map(
                        (item) => {
                            return (
                                `${item.code}: ${item.message}`
                            );
                        }
                    )

        };

    }

}


export function createKnowledgeEngine():
KnowledgeEngine {

    return new
        DeterministicKnowledgeEngine();

}
