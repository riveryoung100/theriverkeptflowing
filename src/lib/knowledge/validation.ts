import {
    isAssetId,
    isClassificationId,
    isDerivativeId,
    isSegmentId,
    isTransformationId
} from "../assimilation/identifiers";

import {
    isConfidence,
    isIsoUtcTimestamp
} from "../assimilation/validation";

import {
    isKnowledgeClaimId,
    isKnowledgeNodeId,
    isKnowledgeRecordId,
    isKnowledgeRelationId,
    isKnowledgeRevisionId
} from "./identifiers";

import {
    KNOWLEDGE_SCHEMA_VERSION
} from "./types";

import type {
    KnowledgeClaim,
    KnowledgeGraph,
    KnowledgeNode,
    KnowledgeProvenance,
    KnowledgeRelation,
    KnowledgeRevision,
    KnowledgeSourceReference
} from "./types";


export type KnowledgeValidationSeverity =
    | "error"
    | "warning";


export interface KnowledgeValidationIssue {

    readonly code:
        string;

    readonly message:
        string;

    readonly path:
        string;

    readonly severity:
        KnowledgeValidationSeverity;

}


export interface KnowledgeValidationResult {

    readonly valid:
        boolean;

    readonly issues:
        readonly KnowledgeValidationIssue[];

}


function issue(
    code: string,
    message: string,
    path: string,
    severity: KnowledgeValidationSeverity =
        "error"
): KnowledgeValidationIssue {

    return {
        code,
        message,
        path,
        severity
    };

}


function result(
    issues: readonly KnowledgeValidationIssue[]
): KnowledgeValidationResult {

    return {

        valid:
            !issues.some(
                (item) => {
                    return (
                        item.severity ===
                        "error"
                    );
                }
            ),

        issues

    };

}


function hasDuplicates(
    values: readonly string[]
): boolean {

    return (
        new Set(
            values
        ).size !==
        values.length
    );

}


function addDuplicateIssue(
    issues: KnowledgeValidationIssue[],
    values: readonly string[],
    path: string
): void {

    if (
        hasDuplicates(
            values
        )
    ) {

        issues.push(
            issue(
                "knowledge.reference.duplicate",
                "References cannot contain duplicate values.",
                path
            )
        );

    }

}


function isPositiveInteger(
    value: number
): boolean {

    return (
        Number.isInteger(
            value
        ) &&
        value > 0
    );

}


export function validateKnowledgeSourceReference(
    source: KnowledgeSourceReference,
    path =
        "source"
): KnowledgeValidationResult {

    const issues:
        KnowledgeValidationIssue[] =
        [];

    if (
        !isAssetId(
            source.assetId
        )
    ) {

        issues.push(
            issue(
                "knowledge.source.asset-id.invalid",
                "assetId must be a valid asset identifier.",
                `${path}.assetId`
            )
        );

    }

    if (
        !isDerivativeId(
            source.derivativeId
        )
    ) {

        issues.push(
            issue(
                "knowledge.source.derivative-id.invalid",
                "derivativeId must be a valid derivative identifier.",
                `${path}.derivativeId`
            )
        );

    }

    if (
        source.segmentIds.length ===
        0
    ) {

        issues.push(
            issue(
                "knowledge.source.segments.empty",
                "At least one source segment is required.",
                `${path}.segmentIds`
            )
        );

    }

    for (
        const segmentId of
        source.segmentIds
    ) {

        if (
            !isSegmentId(
                segmentId
            )
        ) {

            issues.push(
                issue(
                    "knowledge.source.segment-id.invalid",
                    `Invalid segment identifier: ${segmentId}`,
                    `${path}.segmentIds`
                )
            );

        }

    }

    for (
        const classificationId of
        source.classificationIds
    ) {

        if (
            !isClassificationId(
                classificationId
            )
        ) {

            issues.push(
                issue(
                    "knowledge.source.classification-id.invalid",
                    `Invalid classification identifier: ${classificationId}`,
                    `${path}.classificationIds`
                )
            );

        }

    }

    for (
        const transformationId of
        source.transformationIds
    ) {

        if (
            !isTransformationId(
                transformationId
            )
        ) {

            issues.push(
                issue(
                    "knowledge.source.transformation-id.invalid",
                    `Invalid transformation identifier: ${transformationId}`,
                    `${path}.transformationIds`
                )
            );

        }

    }

    addDuplicateIssue(
        issues,
        source.segmentIds,
        `${path}.segmentIds`
    );

    addDuplicateIssue(
        issues,
        source.classificationIds,
        `${path}.classificationIds`
    );

    addDuplicateIssue(
        issues,
        source.transformationIds,
        `${path}.transformationIds`
    );

    return result(
        issues
    );

}


export function validateKnowledgeProvenance(
    provenance: KnowledgeProvenance,
    path =
        "provenance"
): KnowledgeValidationResult {

    const issues:
        KnowledgeValidationIssue[] =
        [];

    if (
        provenance.sources.length ===
        0
    ) {

        issues.push(
            issue(
                "knowledge.provenance.sources.empty",
                "Knowledge provenance must contain at least one source.",
                `${path}.sources`
            )
        );

    }

    provenance.sources.forEach(
        (
            source,
            index
        ) => {

            issues.push(
                ...validateKnowledgeSourceReference(
                    source,
                    `${path}.sources[${index}]`
                ).issues
            );

        }
    );

    if (
        !isIsoUtcTimestamp(
            provenance.createdAt
        )
    ) {

        issues.push(
            issue(
                "knowledge.provenance.timestamp.invalid",
                "createdAt must be a UTC ISO 8601 timestamp.",
                `${path}.createdAt`
            )
        );

    }

    if (
        provenance.createdBy.trim().length ===
        0
    ) {

        issues.push(
            issue(
                "knowledge.provenance.creator.empty",
                "createdBy cannot be empty.",
                `${path}.createdBy`
            )
        );

    }

    return result(
        issues
    );

}


export function validateKnowledgeNode(
    node: KnowledgeNode,
    path =
        "node"
): KnowledgeValidationResult {

    const issues:
        KnowledgeValidationIssue[] =
        [];

    if (
        !isKnowledgeNodeId(
            node.id
        )
    ) {

        issues.push(
            issue(
                "knowledge.node.id.invalid",
                "Node ID must be a valid knowledge identifier.",
                `${path}.id`
            )
        );

    }

    if (
        node.canonicalName.trim().length ===
        0
    ) {

        issues.push(
            issue(
                "knowledge.node.name.empty",
                "canonicalName cannot be empty.",
                `${path}.canonicalName`
            )
        );

    }

    addDuplicateIssue(
        issues,
        node.aliases,
        `${path}.aliases`
    );

    addDuplicateIssue(
        issues,
        node.topicKeys,
        `${path}.topicKeys`
    );

    addDuplicateIssue(
        issues,
        node.domainKeys,
        `${path}.domainKeys`
    );

    addDuplicateIssue(
        issues,
        node.audienceKeys,
        `${path}.audienceKeys`
    );

    if (
        !isPositiveInteger(
            node.version
        )
    ) {

        issues.push(
            issue(
                "knowledge.record.version.invalid",
                "Record version must be a positive integer.",
                `${path}.version`
            )
        );

    }

    if (
        node.schemaVersion !==
        KNOWLEDGE_SCHEMA_VERSION
    ) {

        issues.push(
            issue(
                "knowledge.schema-version.invalid",
                `Expected schema version ${KNOWLEDGE_SCHEMA_VERSION}.`,
                `${path}.schemaVersion`
            )
        );

    }

    issues.push(
        ...validateKnowledgeProvenance(
            node.provenance,
            `${path}.provenance`
        ).issues
    );

    return result(
        issues
    );

}


export function validateKnowledgeRelation(
    relation: KnowledgeRelation,
    path =
        "relation"
): KnowledgeValidationResult {

    const issues:
        KnowledgeValidationIssue[] =
        [];

    if (
        !isKnowledgeRelationId(
            relation.id
        )
    ) {

        issues.push(
            issue(
                "knowledge.relation.id.invalid",
                "Relation ID must be a valid relation identifier.",
                `${path}.id`
            )
        );

    }

    if (
        !isKnowledgeNodeId(
            relation.fromNodeId
        )
    ) {

        issues.push(
            issue(
                "knowledge.relation.from-node.invalid",
                "fromNodeId must be a valid knowledge node identifier.",
                `${path}.fromNodeId`
            )
        );

    }

    if (
        !isKnowledgeNodeId(
            relation.toNodeId
        )
    ) {

        issues.push(
            issue(
                "knowledge.relation.to-node.invalid",
                "toNodeId must be a valid knowledge node identifier.",
                `${path}.toNodeId`
            )
        );

    }

    if (
        relation.fromNodeId ===
        relation.toNodeId
    ) {

        issues.push(
            issue(
                "knowledge.relation.self-reference",
                "A relation cannot connect a node to itself.",
                path
            )
        );

    }

    if (
        !isConfidence(
            relation.confidence
        )
    ) {

        issues.push(
            issue(
                "knowledge.relation.confidence.invalid",
                "Relation confidence must be between 0 and 1.",
                `${path}.confidence`
            )
        );

    }

    if (
        !isIsoUtcTimestamp(
            relation.createdAt
        )
    ) {

        issues.push(
            issue(
                "knowledge.relation.timestamp.invalid",
                "createdAt must be a UTC ISO 8601 timestamp.",
                `${path}.createdAt`
            )
        );

    }

    if (
        !isPositiveInteger(
            relation.version
        )
    ) {

        issues.push(
            issue(
                "knowledge.record.version.invalid",
                "Record version must be a positive integer.",
                `${path}.version`
            )
        );

    }

    if (
        relation.schemaVersion !==
        KNOWLEDGE_SCHEMA_VERSION
    ) {

        issues.push(
            issue(
                "knowledge.schema-version.invalid",
                `Expected schema version ${KNOWLEDGE_SCHEMA_VERSION}.`,
                `${path}.schemaVersion`
            )
        );

    }

    issues.push(
        ...validateKnowledgeProvenance(
            relation.provenance,
            `${path}.provenance`
        ).issues
    );

    return result(
        issues
    );

}


export function validateKnowledgeClaim(
    claim: KnowledgeClaim,
    path =
        "claim"
): KnowledgeValidationResult {

    const issues:
        KnowledgeValidationIssue[] =
        [];

    if (
        !isKnowledgeClaimId(
            claim.id
        )
    ) {

        issues.push(
            issue(
                "knowledge.claim.id.invalid",
                "Claim ID must be a valid claim identifier.",
                `${path}.id`
            )
        );

    }

    if (
        !isKnowledgeNodeId(
            claim.subjectNodeId
        )
    ) {

        issues.push(
            issue(
                "knowledge.claim.subject.invalid",
                "subjectNodeId must be a valid knowledge node identifier.",
                `${path}.subjectNodeId`
            )
        );

    }

    if (
        claim.predicate.trim().length ===
        0
    ) {

        issues.push(
            issue(
                "knowledge.claim.predicate.empty",
                "predicate cannot be empty.",
                `${path}.predicate`
            )
        );

    }

    const hasObjectNode =
        claim.objectNodeId !==
        undefined;

    const hasObjectValue =
        claim.objectValue !==
        undefined &&
        claim.objectValue.trim().length >
            0;

    if (
        hasObjectNode ===
        hasObjectValue
    ) {

        issues.push(
            issue(
                "knowledge.claim.object.invalid",
                "A claim must contain exactly one of objectNodeId or objectValue.",
                path
            )
        );

    }

    if (
        claim.objectNodeId !==
            undefined &&
        !isKnowledgeNodeId(
            claim.objectNodeId
        )
    ) {

        issues.push(
            issue(
                "knowledge.claim.object-node.invalid",
                "objectNodeId must be a valid knowledge node identifier.",
                `${path}.objectNodeId`
            )
        );

    }

    if (
        !isConfidence(
            claim.confidence
        )
    ) {

        issues.push(
            issue(
                "knowledge.claim.confidence.invalid",
                "Claim confidence must be between 0 and 1.",
                `${path}.confidence`
            )
        );

    }

    if (
        !isIsoUtcTimestamp(
            claim.createdAt
        )
    ) {

        issues.push(
            issue(
                "knowledge.claim.timestamp.invalid",
                "createdAt must be a UTC ISO 8601 timestamp.",
                `${path}.createdAt`
            )
        );

    }

    if (
        !isPositiveInteger(
            claim.version
        )
    ) {

        issues.push(
            issue(
                "knowledge.record.version.invalid",
                "Record version must be a positive integer.",
                `${path}.version`
            )
        );

    }

    if (
        claim.schemaVersion !==
        KNOWLEDGE_SCHEMA_VERSION
    ) {

        issues.push(
            issue(
                "knowledge.schema-version.invalid",
                `Expected schema version ${KNOWLEDGE_SCHEMA_VERSION}.`,
                `${path}.schemaVersion`
            )
        );

    }

    issues.push(
        ...validateKnowledgeProvenance(
            claim.provenance,
            `${path}.provenance`
        ).issues
    );

    return result(
        issues
    );

}


export function validateKnowledgeRevision(
    revision: KnowledgeRevision,
    path =
        "revision"
): KnowledgeValidationResult {

    const issues:
        KnowledgeValidationIssue[] =
        [];

    if (
        !isKnowledgeRevisionId(
            revision.id
        )
    ) {

        issues.push(
            issue(
                "knowledge.revision.id.invalid",
                "Revision ID must be a valid revision identifier.",
                `${path}.id`
            )
        );

    }

    if (
        !isKnowledgeRecordId(
            revision.recordId
        )
    ) {

        issues.push(
            issue(
                "knowledge.revision.record-id.invalid",
                "recordId must be a valid knowledge record identifier.",
                `${path}.recordId`
            )
        );

    }

    if (
        !isPositiveInteger(
            revision.previousVersion
        )
    ) {

        issues.push(
            issue(
                "knowledge.revision.previous-version.invalid",
                "previousVersion must be a positive integer.",
                `${path}.previousVersion`
            )
        );

    }

    if (
        revision.nextVersion !==
        revision.previousVersion + 1
    ) {

        issues.push(
            issue(
                "knowledge.revision.version-sequence.invalid",
                "nextVersion must equal previousVersion plus one.",
                `${path}.nextVersion`
            )
        );

    }

    if (
        revision.reason.trim().length ===
        0
    ) {

        issues.push(
            issue(
                "knowledge.revision.reason.empty",
                "Revision reason cannot be empty.",
                `${path}.reason`
            )
        );

    }

    if (
        revision.changedBy.trim().length ===
        0
    ) {

        issues.push(
            issue(
                "knowledge.revision.actor.empty",
                "changedBy cannot be empty.",
                `${path}.changedBy`
            )
        );

    }

    if (
        !isIsoUtcTimestamp(
            revision.changedAt
        )
    ) {

        issues.push(
            issue(
                "knowledge.revision.timestamp.invalid",
                "changedAt must be a UTC ISO 8601 timestamp.",
                `${path}.changedAt`
            )
        );

    }

    if (
        revision.schemaVersion !==
        KNOWLEDGE_SCHEMA_VERSION
    ) {

        issues.push(
            issue(
                "knowledge.schema-version.invalid",
                `Expected schema version ${KNOWLEDGE_SCHEMA_VERSION}.`,
                `${path}.schemaVersion`
            )
        );

    }

    return result(
        issues
    );

}


export function validateKnowledgeGraph(
    graph: KnowledgeGraph
): KnowledgeValidationResult {

    const issues:
        KnowledgeValidationIssue[] =
        [];

    const nodeIds =
        new Set(
            graph.nodes.map(
                (node) => {
                    return node.id;
                }
            )
        );

    const recordIds = [
        ...graph.nodes.map(
            (node) => {
                return node.id;
            }
        ),
        ...graph.relations.map(
            (relation) => {
                return relation.id;
            }
        ),
        ...graph.claims.map(
            (claim) => {
                return claim.id;
            }
        ),
        ...graph.revisions.map(
            (revision) => {
                return revision.id;
            }
        )
    ];

    addDuplicateIssue(
        issues,
        recordIds,
        "graph"
    );

    graph.nodes.forEach(
        (
            node,
            index
        ) => {

            issues.push(
                ...validateKnowledgeNode(
                    node,
                    `graph.nodes[${index}]`
                ).issues
            );

        }
    );

    graph.relations.forEach(
        (
            relation,
            index
        ) => {

            issues.push(
                ...validateKnowledgeRelation(
                    relation,
                    `graph.relations[${index}]`
                ).issues
            );

            if (
                !nodeIds.has(
                    relation.fromNodeId
                )
            ) {

                issues.push(
                    issue(
                        "knowledge.graph.relation-source.missing",
                        `Unknown relation source node: ${relation.fromNodeId}`,
                        `graph.relations[${index}].fromNodeId`
                    )
                );

            }

            if (
                !nodeIds.has(
                    relation.toNodeId
                )
            ) {

                issues.push(
                    issue(
                        "knowledge.graph.relation-target.missing",
                        `Unknown relation target node: ${relation.toNodeId}`,
                        `graph.relations[${index}].toNodeId`
                    )
                );

            }

        }
    );

    graph.claims.forEach(
        (
            claim,
            index
        ) => {

            issues.push(
                ...validateKnowledgeClaim(
                    claim,
                    `graph.claims[${index}]`
                ).issues
            );

            if (
                !nodeIds.has(
                    claim.subjectNodeId
                )
            ) {

                issues.push(
                    issue(
                        "knowledge.graph.claim-subject.missing",
                        `Unknown claim subject node: ${claim.subjectNodeId}`,
                        `graph.claims[${index}].subjectNodeId`
                    )
                );

            }

            if (
                claim.objectNodeId !==
                    undefined &&
                !nodeIds.has(
                    claim.objectNodeId
                )
            ) {

                issues.push(
                    issue(
                        "knowledge.graph.claim-object.missing",
                        `Unknown claim object node: ${claim.objectNodeId}`,
                        `graph.claims[${index}].objectNodeId`
                    )
                );

            }

        }
    );

    graph.revisions.forEach(
        (
            revision,
            index
        ) => {

            issues.push(
                ...validateKnowledgeRevision(
                    revision,
                    `graph.revisions[${index}]`
                ).issues
            );

        }
    );

    return result(
        issues
    );

}
