import {
    sampleKnowledgeGraph
} from "../../fixtures/sampleKnowledge";

import type {
    KnowledgeQueryRequest
} from "../types";


export const sampleNodeQuery:
KnowledgeQueryRequest = {

    mode:
        "node-by-id",

    nodeId:
        sampleKnowledgeGraph
            .nodes[0]
            .id

};


export const sampleNodesQuery:
KnowledgeQueryRequest = {

    mode:
        "nodes",

    nodeFilter: {

        ids: [
            sampleKnowledgeGraph
                .nodes[0]
                .id
        ]

    }

};


export const sampleRelationsQuery:
KnowledgeQueryRequest = {

    mode:
        "relations",

    relationFilter: {

        ids: [
            sampleKnowledgeGraph
                .relations[0]
                .id
        ]

    }

};


export const sampleClaimsQuery:
KnowledgeQueryRequest = {

    mode:
        "claims",

    claimFilter: {

        ids: [
            sampleKnowledgeGraph
                .claims[0]
                .id
        ]

    }

};


export const sampleNeighborQuery:
KnowledgeQueryRequest = {

    mode:
        "neighbors",

    neighborQuery: {

        nodeId:
            sampleKnowledgeGraph
                .nodes[0]
                .id,

        direction:
            "both",

        maximumDepth:
            2

    }

};


export const sampleSearchQuery:
KnowledgeQueryRequest = {

    mode:
        "search",

    textSearch: {

        text:
            sampleKnowledgeGraph
                .nodes[0]
                .canonicalName,

        includeAliases:
            true,

        includeSummary:
            true,

        includeDescription:
            true

    },

    limit:
        25,

    offset:
        0

};
