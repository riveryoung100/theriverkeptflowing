import {
    sampleTextAsset,
    sampleTextClassification,
    sampleTextSegment,
    sampleTextTransformation
} from "../../assimilation/fixtures/sampleTextAsset";

import {
    SAMPLE_DERIVATIVE_ID
} from "../../assimilation/derivation/fixtures/sampleDerivation";

import {
    KNOWLEDGE_SCHEMA_VERSION,
    type KnowledgeClaim,
    type KnowledgeGraph,
    type KnowledgeNode,
    type KnowledgeProvenance,
    type KnowledgeRelation,
    type KnowledgeRevision
} from "../types";


export const SAMPLE_KNOWLEDGE_NODE_ID =
    "knowledge:11111111-1111-4111-8111-111111111111" as const;

export const SAMPLE_RELATED_NODE_ID =
    "knowledge:22222222-2222-4222-8222-222222222222" as const;

export const SAMPLE_KNOWLEDGE_RELATION_ID =
    "relation:33333333-3333-4333-8333-333333333333" as const;

export const SAMPLE_KNOWLEDGE_CLAIM_ID =
    "claim:44444444-4444-4444-8444-444444444444" as const;

export const SAMPLE_KNOWLEDGE_REVISION_ID =
    "revision:55555555-5555-4555-8555-555555555555" as const;


export const sampleKnowledgeProvenance:
KnowledgeProvenance = {

    sources: [

        {

            assetId:
                sampleTextAsset.id,

            derivativeId:
                SAMPLE_DERIVATIVE_ID,

            segmentIds: [
                sampleTextSegment.id
            ],

            classificationIds: [
                sampleTextClassification.id
            ],

            transformationIds: [
                sampleTextTransformation.id
            ]

        }

    ],

    createdAt:
        "2026-08-05T14:10:00.000Z",

    createdBy:
        "river:owner",

    importedFrom:
        "phase-27a-synthetic-fixture"

};


export const sampleKnowledgeNode:
KnowledgeNode = {

    id:
        SAMPLE_KNOWLEDGE_NODE_ID,

    nodeType:
        "principle",

    canonicalName:
        "Preserve Source Provenance",

    aliases: [
        "Source Provenance",
        "Provenance Preservation"
    ],

    summary:
        "Original source material must remain traceable throughout the knowledge pipeline.",

    description:
        "Knowledge records retain references to their originating assets, segments, classifications, transformations, and derived objects.",

    topicKeys: [
        "provenance",
        "data-lineage",
        "knowledge-integrity"
    ],

    domainKeys: [
        "technology",
        "business-systems"
    ],

    audienceKeys: [
        "internal-team"
    ],

    visibility:
        "internal",

    status:
        "active",

    reviewStatus:
        "not-required",

    provenance:
        sampleKnowledgeProvenance,

    version:
        1,

    schemaVersion:
        KNOWLEDGE_SCHEMA_VERSION

};


export const sampleRelatedKnowledgeNode:
KnowledgeNode = {

    id:
        SAMPLE_RELATED_NODE_ID,

    nodeType:
        "concept",

    canonicalName:
        "Knowledge Lineage",

    aliases: [
        "Knowledge Traceability"
    ],

    summary:
        "The recorded path connecting knowledge to its original sources.",

    topicKeys: [
        "lineage",
        "traceability"
    ],

    domainKeys: [
        "technology"
    ],

    audienceKeys: [
        "internal-team"
    ],

    visibility:
        "internal",

    status:
        "active",

    reviewStatus:
        "not-required",

    provenance:
        sampleKnowledgeProvenance,

    version:
        1,

    schemaVersion:
        KNOWLEDGE_SCHEMA_VERSION

};


export const sampleKnowledgeRelation:
KnowledgeRelation = {

    id:
        SAMPLE_KNOWLEDGE_RELATION_ID,

    fromNodeId:
        SAMPLE_KNOWLEDGE_NODE_ID,

    toNodeId:
        SAMPLE_RELATED_NODE_ID,

    relationType:
        "supports",

    label:
        "supports reliable knowledge lineage",

    confidence:
        1,

    status:
        "active",

    reviewStatus:
        "not-required",

    provenance:
        sampleKnowledgeProvenance,

    createdAt:
        "2026-08-05T14:11:00.000Z",

    version:
        1,

    schemaVersion:
        KNOWLEDGE_SCHEMA_VERSION

};


export const sampleKnowledgeClaim:
KnowledgeClaim = {

    id:
        SAMPLE_KNOWLEDGE_CLAIM_ID,

    subjectNodeId:
        SAMPLE_KNOWLEDGE_NODE_ID,

    predicate:
        "requires",

    objectNodeId:
        SAMPLE_RELATED_NODE_ID,

    truthStatus:
        "supported",

    confidence:
        1,

    status:
        "active",

    reviewStatus:
        "not-required",

    provenance:
        sampleKnowledgeProvenance,

    createdAt:
        "2026-08-05T14:12:00.000Z",

    version:
        1,

    schemaVersion:
        KNOWLEDGE_SCHEMA_VERSION

};


export const sampleKnowledgeRevision:
KnowledgeRevision = {

    id:
        SAMPLE_KNOWLEDGE_REVISION_ID,

    recordId:
        SAMPLE_KNOWLEDGE_NODE_ID,

    previousVersion:
        1,

    nextVersion:
        2,

    reason:
        "Synthetic revision fixture for Phase 27A validation.",

    changedAt:
        "2026-08-05T14:13:00.000Z",

    changedBy:
        "river:owner",

    schemaVersion:
        KNOWLEDGE_SCHEMA_VERSION

};


export const sampleKnowledgeGraph:
KnowledgeGraph = {

    nodes: [
        sampleKnowledgeNode,
        sampleRelatedKnowledgeNode
    ],

    relations: [
        sampleKnowledgeRelation
    ],

    claims: [
        sampleKnowledgeClaim
    ],

    revisions: [
        sampleKnowledgeRevision
    ]

};
