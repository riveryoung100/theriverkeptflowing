import {
    createHash
} from "node:crypto";

import type {
    DerivedObjectReference,
    SourceAsset
} from "../../assimilation/types";

import {
    createKnowledgeProvenanceFromAssimilation
} from "../assimilationKnowledgeMapper";

import {
    KNOWLEDGE_SCHEMA_VERSION
} from "../types";

import type {
    KnowledgeClaim,
    KnowledgeClaimId,
    KnowledgeEngineRequest,
    KnowledgeNode,
    KnowledgeNodeId,
    KnowledgeRelation,
    KnowledgeRelationId
} from "../types";

import type {
    SemanticCandidateSet,
    SemanticInterpretationRequest
} from "./types";

import {
    validateSemanticCandidateSet
} from "./validation";


export interface SemanticKnowledgeMappingInput {

    readonly asset:
        SourceAsset;

    readonly derivedObject:
        DerivedObjectReference;

    readonly interpretation:
        SemanticInterpretationRequest;

    readonly candidates:
        SemanticCandidateSet;

}


function createDeterministicUuid(
    seed: string
): string {

    const hash =
        createHash(
            "sha256"
        )
            .update(
                seed
            )
            .digest(
                "hex"
            );

    return (
        `${hash.slice(0, 8)}-` +
        `${hash.slice(8, 12)}-` +
        `4${hash.slice(13, 16)}-` +
        `8${hash.slice(17, 20)}-` +
        `${hash.slice(20, 32)}`
    );

}


function createDeterministicNodeId(
    derivativeId: string,
    key: string
): KnowledgeNodeId {

    return (
        `knowledge:${createDeterministicUuid(
            `semantic-node:${derivativeId}:${key}`
        )}`
    ) as KnowledgeNodeId;

}


function createDeterministicRelationId(
    derivativeId: string,
    fromKey: string,
    toKey: string,
    relationType: string
): KnowledgeRelationId {

    return (
        `relation:${createDeterministicUuid(
            [
                "semantic-relation",
                derivativeId,
                fromKey,
                toKey,
                relationType
            ].join(":")
        )}`
    ) as KnowledgeRelationId;

}


function createDeterministicClaimId(
    derivativeId: string,
    subjectKey: string,
    predicate: string,
    objectIdentity: string
): KnowledgeClaimId {

    return (
        `claim:${createDeterministicUuid(
            [
                "semantic-claim",
                derivativeId,
                subjectKey,
                predicate,
                objectIdentity
            ].join(":")
        )}`
    ) as KnowledgeClaimId;

}


function requireValidCandidates(
    input: SemanticKnowledgeMappingInput
): void {

    const validation =
        validateSemanticCandidateSet(
            input.interpretation,
            input.candidates
        );

    if (
        validation.valid
    ) {

        return;

    }

    const messages =
        validation.issues
            .filter(
                (item) =>
                    item.severity ===
                    "error"
            )
            .map(
                (item) =>
                    `${item.code}: ${item.message}`
            );

    throw new TypeError(
        [
            "Cannot map invalid semantic candidates.",
            ...messages
        ].join(
            " "
        )
    );

}


export function createKnowledgeRequestFromSemanticCandidates(
    input: SemanticKnowledgeMappingInput
): KnowledgeEngineRequest {

    requireValidCandidates(
        input
    );

    const {
        segment,
        classification
    } =
        input.interpretation;

    if (
        input.asset.id !==
        segment.assetId ||
        input.asset.id !==
        classification.assetId ||
        input.asset.id !==
        input.derivedObject.assetId
    ) {

        throw new TypeError(
            "Semantic knowledge mapping requires asset, segment, classification, and derivative to share one source asset."
        );

    }

    if (
        !input.derivedObject.sourceSegmentIds.includes(
            segment.id
        )
    ) {

        throw new TypeError(
            "Semantic knowledge mapping requires the derivative to reference the interpreted segment."
        );

    }

    if (
        !input.derivedObject.sourceClassificationIds.includes(
            classification.id
        )
    ) {

        throw new TypeError(
            "Semantic knowledge mapping requires the derivative to reference the interpreted classification."
        );

    }

    const provenance =
        createKnowledgeProvenanceFromAssimilation({
            asset:
                input.asset,
            segment,
            classification,
            derivedObject:
                input.derivedObject
        });

    const nodeIds =
        new Map<string, KnowledgeNodeId>();

    input.candidates.nodes.forEach(
        (candidate) => {

            nodeIds.set(
                candidate.key,
                createDeterministicNodeId(
                    input.derivedObject.id,
                    candidate.key
                )
            );

        }
    );

    const nodes:
        KnowledgeNode[] =
        input.candidates.nodes.map(
            (candidate) => {

                const id =
                    nodeIds.get(
                        candidate.key
                    );

                if (
                    id ===
                    undefined
                ) {

                    throw new TypeError(
                        `Missing deterministic knowledge node ID for semantic key: ${candidate.key}`
                    );

                }

                return {
                    id,
                    nodeType:
                        candidate.nodeType,
                    canonicalName:
                        candidate.canonicalName,
                    aliases:
                        [...candidate.aliases],
                    summary:
                        candidate.summary,
                    description:
                        candidate.description,
                    topicKeys:
                        [...classification.topicKeys],
                    domainKeys:
                        [...classification.domainKeys],
                    audienceKeys:
                        [...classification.audienceKeys],
                    visibility:
                        "internal",
                    status:
                        "draft",
                    reviewStatus:
                        "pending",
                    provenance,
                    version:
                        1,
                    schemaVersion:
                        KNOWLEDGE_SCHEMA_VERSION
                };

            }
        );

    const relations:
        KnowledgeRelation[] =
        input.candidates.relations.map(
            (candidate) => {

                const fromNodeId =
                    nodeIds.get(
                        candidate.fromKey
                    );

                const toNodeId =
                    nodeIds.get(
                        candidate.toKey
                    );

                if (
                    fromNodeId ===
                    undefined ||
                    toNodeId ===
                    undefined
                ) {

                    throw new TypeError(
                        "Semantic relation references an unresolved candidate node."
                    );

                }

                return {
                    id:
                        createDeterministicRelationId(
                            input.derivedObject.id,
                            candidate.fromKey,
                            candidate.toKey,
                            candidate.relationType
                        ),
                    fromNodeId,
                    toNodeId,
                    relationType:
                        candidate.relationType,
                    label:
                        candidate.label,
                    confidence:
                        candidate.confidence,
                    status:
                        "draft",
                    reviewStatus:
                        "pending",
                    provenance,
                    createdAt:
                        classification.classifiedAt,
                    version:
                        1,
                    schemaVersion:
                        KNOWLEDGE_SCHEMA_VERSION
                };

            }
        );

    const claims:
        KnowledgeClaim[] =
        input.candidates.claims.map(
            (candidate) => {

                const subjectNodeId =
                    nodeIds.get(
                        candidate.subjectKey
                    );

                if (
                    subjectNodeId ===
                    undefined
                ) {

                    throw new TypeError(
                        "Semantic claim references an unresolved subject node."
                    );

                }

                const objectNodeId =
                    candidate.objectKey ===
                        undefined
                        ? undefined
                        : nodeIds.get(
                            candidate.objectKey
                        );

                if (
                    candidate.objectKey !==
                        undefined &&
                    objectNodeId ===
                        undefined
                ) {

                    throw new TypeError(
                        "Semantic claim references an unresolved object node."
                    );

                }

                const objectIdentity =
                    candidate.objectKey ??
                    candidate.objectValue ??
                    "";

                return {
                    id:
                        createDeterministicClaimId(
                            input.derivedObject.id,
                            candidate.subjectKey,
                            candidate.predicate,
                            objectIdentity
                        ),
                    subjectNodeId,
                    predicate:
                        candidate.predicate,
                    objectNodeId,
                    objectValue:
                        candidate.objectValue,
                    truthStatus:
                        candidate.truthStatus,
                    confidence:
                        candidate.confidence,
                    status:
                        "draft",
                    reviewStatus:
                        "pending",
                    provenance,
                    createdAt:
                        classification.classifiedAt,
                    version:
                        1,
                    schemaVersion:
                        KNOWLEDGE_SCHEMA_VERSION
                };

            }
        );

    return {
        nodes,
        relations,
        claims,
        revisions:
            []
    };

}