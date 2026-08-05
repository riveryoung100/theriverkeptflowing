import {
    createKnowledgeInsightId
} from "../identifiers";

import {
    KNOWLEDGE_INSIGHT_SCHEMA_VERSION
} from "../types";

import {
    sampleKnowledgeGraph
} from "../../fixtures/sampleKnowledge";

import {
    createKnowledgeReasoningEngine
} from "../../reasoning/engine";

import {
    sampleSupportPathRequest
} from "../../reasoning/fixtures/sampleReasoning";

import type {
    KnowledgeInsight,
    KnowledgeInsightEngineResult,
    KnowledgeInsightRequest
} from "../types";


const reasoningEngine =
    createKnowledgeReasoningEngine();


export const sampleInsightReasoning =
    reasoningEngine.reason(
        sampleKnowledgeGraph,
        sampleSupportPathRequest
    );


export const sampleInsightRequest:
KnowledgeInsightRequest = {

    type:
        "connection",

    title:
        "Deterministic Knowledge Connection",

    reasoning:
        sampleInsightReasoning,

    requestedAt:
        "2026-08-05T17:45:00.000Z",

    minimumConfidence:
        0.5,

    requireEvidence:
        false

};


export const sampleKnowledgeInsight:
KnowledgeInsight = {

    id:
        createKnowledgeInsightId(),

    type:
        sampleInsightRequest.type,

    title:
        sampleInsightRequest.title,

    summary:
        sampleInsightReasoning.explanation,

    conclusion:
        sampleInsightReasoning.conclusion,

    confidence:
        1,

    evidence: {

        nodeIds:
            sampleInsightReasoning
                .evidence
                .nodes
                .map(
                    (node) => {
                        return node.id;
                    }
                ),

        relationIds:
            sampleInsightReasoning
                .evidence
                .relations
                .map(
                    (relation) => {
                        return relation.id;
                    }
                ),

        claimIds:
            sampleInsightReasoning
                .evidence
                .claims
                .map(
                    (claim) => {
                        return claim.id;
                    }
                )

    },

    explanation:
        sampleInsightReasoning.explanation,

    status:
        "active",

    reviewStatus:
        "not-required",

    createdAt:
        sampleInsightRequest.requestedAt,

    version:
        1,

    schemaVersion:
        KNOWLEDGE_INSIGHT_SCHEMA_VERSION

};


export const sampleInsightResult:
KnowledgeInsightEngineResult = {

    insight:
        sampleKnowledgeInsight,

    warnings:
        []

};
