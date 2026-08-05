import type {
    KnowledgeClaim,
    KnowledgeClaimId,
    KnowledgeGraph,
    KnowledgeNode,
    KnowledgeNodeId,
    KnowledgeRelation,
    KnowledgeRelationId
} from "../types";


export type KnowledgeReasoningMode =
    | "support-path"
    | "contradiction-check"
    | "claim-evidence"
    | "shared-neighbors"
    | "transitive-relations";


export type KnowledgeReasoningStatus =
    | "completed"
    | "inconclusive"
    | "blocked"
    | "failed";


export type KnowledgeReasoningConclusion =
    | "supported"
    | "contradicted"
    | "mixed"
    | "unknown";


export interface KnowledgeReasoningRequest {

    readonly mode:
        KnowledgeReasoningMode;

    readonly sourceNodeId?:
        KnowledgeNodeId;

    readonly targetNodeId?:
        KnowledgeNodeId;

    readonly claimId?:
        KnowledgeClaimId;

    readonly maximumDepth?:
        number;

    readonly minimumConfidence?:
        number;

}


export interface KnowledgeReasoningPath {

    readonly nodeIds:
        readonly KnowledgeNodeId[];

    readonly relationIds:
        readonly KnowledgeRelationId[];

    readonly length:
        number;

}


export interface KnowledgeEvidenceSet {

    readonly nodes:
        readonly KnowledgeNode[];

    readonly relations:
        readonly KnowledgeRelation[];

    readonly claims:
        readonly KnowledgeClaim[];

}


export interface KnowledgeReasoningResult {

    readonly request:
        KnowledgeReasoningRequest;

    readonly status:
        KnowledgeReasoningStatus;

    readonly conclusion:
        KnowledgeReasoningConclusion;

    readonly paths:
        readonly KnowledgeReasoningPath[];

    readonly evidence:
        KnowledgeEvidenceSet;

    readonly explanation:
        string;

    readonly warnings:
        readonly string[];

}


export interface KnowledgeReasoningEngine {

    reason(
        graph: KnowledgeGraph,
        request: KnowledgeReasoningRequest
    ): KnowledgeReasoningResult;

}
