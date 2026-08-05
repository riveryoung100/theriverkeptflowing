import {
    sampleKnowledgeGraph
} from "../../fixtures/sampleKnowledge";

import type {
    KnowledgeReasoningRequest
} from "../types";


const sourceNode =
    sampleKnowledgeGraph.nodes[0];

const targetNode =
    sampleKnowledgeGraph.nodes[1];

const sampleClaim =
    sampleKnowledgeGraph.claims[0];


export const sampleSupportPathRequest:
KnowledgeReasoningRequest = {

    mode:
        "support-path",

    sourceNodeId:
        sourceNode.id,

    targetNodeId:
        targetNode.id,

    maximumDepth:
        3,

    minimumConfidence:
        0.5

};


export const sampleContradictionRequest:
KnowledgeReasoningRequest = {

    mode:
        "contradiction-check",

    claimId:
        sampleClaim.id,

    minimumConfidence:
        0.5

};


export const sampleClaimEvidenceRequest:
KnowledgeReasoningRequest = {

    mode:
        "claim-evidence",

    claimId:
        sampleClaim.id,

    minimumConfidence:
        0.5

};


export const sampleSharedNeighborsRequest:
KnowledgeReasoningRequest = {

    mode:
        "shared-neighbors",

    sourceNodeId:
        sourceNode.id,

    targetNodeId:
        targetNode.id,

    maximumDepth:
        2

};


export const sampleTransitiveRelationsRequest:
KnowledgeReasoningRequest = {

    mode:
        "transitive-relations",

    sourceNodeId:
        sourceNode.id,

    targetNodeId:
        targetNode.id,

    maximumDepth:
        4,

    minimumConfidence:
        0.5

};


export const sampleReasoningRequests:
readonly KnowledgeReasoningRequest[] = [

    sampleSupportPathRequest,
    sampleContradictionRequest,
    sampleClaimEvidenceRequest,
    sampleSharedNeighborsRequest,
    sampleTransitiveRelationsRequest

];
