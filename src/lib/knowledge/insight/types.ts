import type {
    KnowledgeClaimId,
    KnowledgeNodeId,
    KnowledgeRelationId
} from "../types";

import type {
    KnowledgeReasoningConclusion,
    KnowledgeReasoningResult
} from "../reasoning/types";


export const KNOWLEDGE_INSIGHT_SCHEMA_VERSION =
    "1.0.0" as const;


export type KnowledgeInsightSchemaVersion =
    typeof KNOWLEDGE_INSIGHT_SCHEMA_VERSION;


export type KnowledgeInsightId =
    `insight:${string}`;


export type KnowledgeInsightType =
    | "finding"
    | "pattern"
    | "connection"
    | "contradiction"
    | "implication"
    | "recommendation"
    | "question";


export type KnowledgeInsightStatus =
    | "draft"
    | "active"
    | "review-needed"
    | "superseded"
    | "rejected";


export type KnowledgeInsightReviewStatus =
    | "not-required"
    | "pending"
    | "approved"
    | "changes-requested"
    | "rejected";


export interface KnowledgeInsightEvidence {

    readonly nodeIds:
        readonly KnowledgeNodeId[];

    readonly relationIds:
        readonly KnowledgeRelationId[];

    readonly claimIds:
        readonly KnowledgeClaimId[];

}


export interface KnowledgeInsight {

    readonly id:
        KnowledgeInsightId;

    readonly type:
        KnowledgeInsightType;

    readonly title:
        string;

    readonly summary:
        string;

    readonly conclusion:
        KnowledgeReasoningConclusion;

    readonly confidence:
        number;

    readonly evidence:
        KnowledgeInsightEvidence;

    readonly explanation:
        string;

    readonly status:
        KnowledgeInsightStatus;

    readonly reviewStatus:
        KnowledgeInsightReviewStatus;

    readonly createdAt:
        string;

    readonly version:
        number;

    readonly schemaVersion:
        KnowledgeInsightSchemaVersion;

}


export interface KnowledgeInsightRequest {

    readonly type:
        KnowledgeInsightType;

    readonly title:
        string;

    readonly reasoning:
        KnowledgeReasoningResult;

    readonly requestedAt:
        string;

    readonly minimumConfidence?:
        number;

    readonly requireEvidence?:
        boolean;

}


export interface KnowledgeInsightEngineResult {

    readonly insight:
        KnowledgeInsight;

    readonly warnings:
        readonly string[];

}


export interface KnowledgeInsightEngine {

    create(
        request: KnowledgeInsightRequest
    ): KnowledgeInsightEngineResult;

}
