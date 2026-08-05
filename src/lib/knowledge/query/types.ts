import type {
    ClaimTruthStatus,
    KnowledgeClaim,
    KnowledgeClaimId,
    KnowledgeGraph,
    KnowledgeNode,
    KnowledgeNodeId,
    KnowledgeNodeType,
    KnowledgeRelation,
    KnowledgeRelationId,
    KnowledgeRelationType,
    KnowledgeStatus,
    KnowledgeVisibility
} from "../types";


export type KnowledgeQueryMode =
    | "node-by-id"
    | "nodes"
    | "relations"
    | "claims"
    | "neighbors"
    | "search";


export type KnowledgeQueryDirection =
    | "incoming"
    | "outgoing"
    | "both";


export interface KnowledgeNodeFilter {

    readonly ids?:
        readonly KnowledgeNodeId[];

    readonly nodeTypes?:
        readonly KnowledgeNodeType[];

    readonly statuses?:
        readonly KnowledgeStatus[];

    readonly visibilities?:
        readonly KnowledgeVisibility[];

    readonly topicKeys?:
        readonly string[];

    readonly domainKeys?:
        readonly string[];

    readonly audienceKeys?:
        readonly string[];

}


export interface KnowledgeRelationFilter {

    readonly ids?:
        readonly KnowledgeRelationId[];

    readonly fromNodeIds?:
        readonly KnowledgeNodeId[];

    readonly toNodeIds?:
        readonly KnowledgeNodeId[];

    readonly relationTypes?:
        readonly KnowledgeRelationType[];

    readonly statuses?:
        readonly KnowledgeStatus[];

    readonly minimumConfidence?:
        number;

}


export interface KnowledgeClaimFilter {

    readonly ids?:
        readonly KnowledgeClaimId[];

    readonly subjectNodeIds?:
        readonly KnowledgeNodeId[];

    readonly objectNodeIds?:
        readonly KnowledgeNodeId[];

    readonly predicates?:
        readonly string[];

    readonly truthStatuses?:
        readonly ClaimTruthStatus[];

    readonly statuses?:
        readonly KnowledgeStatus[];

    readonly minimumConfidence?:
        number;

}


export interface KnowledgeTextSearch {

    readonly text:
        string;

    readonly includeAliases?:
        boolean;

    readonly includeSummary?:
        boolean;

    readonly includeDescription?:
        boolean;

}


export interface KnowledgeNeighborQuery {

    readonly nodeId:
        KnowledgeNodeId;

    readonly direction:
        KnowledgeQueryDirection;

    readonly relationTypes?:
        readonly KnowledgeRelationType[];

    readonly maximumDepth:
        number;

}


export interface KnowledgeQueryRequest {

    readonly mode:
        KnowledgeQueryMode;

    readonly nodeId?:
        KnowledgeNodeId;

    readonly nodeFilter?:
        KnowledgeNodeFilter;

    readonly relationFilter?:
        KnowledgeRelationFilter;

    readonly claimFilter?:
        KnowledgeClaimFilter;

    readonly neighborQuery?:
        KnowledgeNeighborQuery;

    readonly textSearch?:
        KnowledgeTextSearch;

    readonly limit?:
        number;

    readonly offset?:
        number;

}


export interface KnowledgeQueryResult {

    readonly request:
        KnowledgeQueryRequest;

    readonly nodes:
        readonly KnowledgeNode[];

    readonly relations:
        readonly KnowledgeRelation[];

    readonly claims:
        readonly KnowledgeClaim[];

    readonly totalNodes:
        number;

    readonly totalRelations:
        number;

    readonly totalClaims:
        number;

    readonly truncated:
        boolean;

    readonly warnings:
        readonly string[];

}


export interface KnowledgeQueryEngine {

    query(
        graph: KnowledgeGraph,
        request: KnowledgeQueryRequest
    ): KnowledgeQueryResult;

}
