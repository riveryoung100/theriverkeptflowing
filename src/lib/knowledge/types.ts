import type {
    AssetId,
    ClassificationId,
    DerivativeId,
    ReviewStatus,
    SegmentId,
    TransformationId
} from "../assimilation/types";


export const KNOWLEDGE_SCHEMA_VERSION =
    "1.0.0" as const;


export type KnowledgeSchemaVersion =
    typeof KNOWLEDGE_SCHEMA_VERSION;


export type KnowledgeNodeId =
    `knowledge:${string}`;

export type KnowledgeRelationId =
    `relation:${string}`;

export type KnowledgeClaimId =
    `claim:${string}`;

export type KnowledgeRevisionId =
    `revision:${string}`;


export type KnowledgeRecordId =
    | KnowledgeNodeId
    | KnowledgeRelationId
    | KnowledgeClaimId
    | KnowledgeRevisionId;


export type KnowledgeNodeType =
    | "concept"
    | "person"
    | "organization"
    | "place"
    | "event"
    | "process"
    | "principle"
    | "instruction"
    | "question"
    | "answer"
    | "story"
    | "resource"
    | "service"
    | "product"
    | "topic"
    | "other";


export type KnowledgeRelationType =
    | "is-a"
    | "part-of"
    | "related-to"
    | "supports"
    | "contradicts"
    | "depends-on"
    | "causes"
    | "precedes"
    | "follows"
    | "explains"
    | "answers"
    | "applies-to"
    | "created-by"
    | "owned-by"
    | "derived-from"
    | "other";


export type KnowledgeStatus =
    | "draft"
    | "active"
    | "review-needed"
    | "superseded"
    | "archived"
    | "rejected"
    | "blocked";


export type ClaimTruthStatus =
    | "asserted"
    | "supported"
    | "disputed"
    | "contradicted"
    | "uncertain"
    | "withdrawn";


export type KnowledgeVisibility =
    | "public"
    | "internal"
    | "private"
    | "restricted";


export interface KnowledgeSourceReference {

    readonly assetId:
        AssetId;

    readonly derivativeId:
        DerivativeId;

    readonly segmentIds:
        readonly SegmentId[];

    readonly classificationIds:
        readonly ClassificationId[];

    readonly transformationIds:
        readonly TransformationId[];

}


export interface KnowledgeProvenance {

    readonly sources:
        readonly KnowledgeSourceReference[];

    readonly createdAt:
        string;

    readonly createdBy:
        string;

    readonly importedFrom?: string;

}


export interface KnowledgeNode {

    readonly id:
        KnowledgeNodeId;

    readonly nodeType:
        KnowledgeNodeType;

    readonly canonicalName:
        string;

    readonly aliases:
        readonly string[];

    readonly summary?: string;

    readonly description?: string;

    readonly topicKeys:
        readonly string[];

    readonly domainKeys:
        readonly string[];

    readonly audienceKeys:
        readonly string[];

    readonly visibility:
        KnowledgeVisibility;

    readonly status:
        KnowledgeStatus;

    readonly reviewStatus:
        ReviewStatus;

    readonly provenance:
        KnowledgeProvenance;

    readonly version:
        number;

    readonly schemaVersion:
        KnowledgeSchemaVersion;

}


export interface KnowledgeRelation {

    readonly id:
        KnowledgeRelationId;

    readonly fromNodeId:
        KnowledgeNodeId;

    readonly toNodeId:
        KnowledgeNodeId;

    readonly relationType:
        KnowledgeRelationType;

    readonly label?: string;

    readonly confidence:
        number;

    readonly status:
        KnowledgeStatus;

    readonly reviewStatus:
        ReviewStatus;

    readonly provenance:
        KnowledgeProvenance;

    readonly createdAt:
        string;

    readonly version:
        number;

    readonly schemaVersion:
        KnowledgeSchemaVersion;

}


export interface KnowledgeClaim {

    readonly id:
        KnowledgeClaimId;

    readonly subjectNodeId:
        KnowledgeNodeId;

    readonly predicate:
        string;

    readonly objectNodeId?:
        KnowledgeNodeId;

    readonly objectValue?:
        string;

    readonly truthStatus:
        ClaimTruthStatus;

    readonly confidence:
        number;

    readonly status:
        KnowledgeStatus;

    readonly reviewStatus:
        ReviewStatus;

    readonly provenance:
        KnowledgeProvenance;

    readonly createdAt:
        string;

    readonly version:
        number;

    readonly schemaVersion:
        KnowledgeSchemaVersion;

}


export interface KnowledgeRevision {

    readonly id:
        KnowledgeRevisionId;

    readonly recordId:
        KnowledgeRecordId;

    readonly previousVersion:
        number;

    readonly nextVersion:
        number;

    readonly reason:
        string;

    readonly changedAt:
        string;

    readonly changedBy:
        string;

    readonly schemaVersion:
        KnowledgeSchemaVersion;

}


export interface KnowledgeGraph {

    readonly nodes:
        readonly KnowledgeNode[];

    readonly relations:
        readonly KnowledgeRelation[];

    readonly claims:
        readonly KnowledgeClaim[];

    readonly revisions:
        readonly KnowledgeRevision[];

}


export interface KnowledgeEngineResult {

    readonly graph:
        KnowledgeGraph;

    readonly createdNodeIds:
        readonly KnowledgeNodeId[];

    readonly createdRelationIds:
        readonly KnowledgeRelationId[];

    readonly createdClaimIds:
        readonly KnowledgeClaimId[];

    readonly warnings:
        readonly string[];

}


export interface KnowledgeEngineRequest {

    readonly nodes:
        readonly KnowledgeNode[];

    readonly relations:
        readonly KnowledgeRelation[];

    readonly claims:
        readonly KnowledgeClaim[];

    readonly revisions:
        readonly KnowledgeRevision[];

}


export interface KnowledgeEngine {

    build(
        request: KnowledgeEngineRequest
    ): KnowledgeEngineResult;

}
