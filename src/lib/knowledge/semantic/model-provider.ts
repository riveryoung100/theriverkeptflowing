import type {
    ClaimTruthStatus,
    KnowledgeNodeType,
    KnowledgeRelationType
} from "../types";

import type {
    SemanticCandidateClaim,
    SemanticCandidateNode,
    SemanticCandidateRelation,
    SemanticCandidateSet,
    SemanticInterpretationProvider,
    SemanticInterpretationRequest
} from "./types";


export interface SemanticModelTransportRequest {

    readonly system:
        string;

    readonly user:
        string;

}


export interface SemanticModelTransportResponse {

    readonly content:
        string;

}


export type SemanticModelTransport =
    (
        request: SemanticModelTransportRequest
    ) => Promise<SemanticModelTransportResponse>;


export interface SemanticModelProviderOptions {

    readonly transport:
        SemanticModelTransport;

}


const NODE_TYPES =
    new Set<KnowledgeNodeType>([
        "concept",
        "person",
        "organization",
        "place",
        "event",
        "process",
        "principle",
        "instruction",
        "question",
        "answer",
        "story",
        "resource",
        "service",
        "product",
        "topic",
        "other"
    ]);


const RELATION_TYPES =
    new Set<KnowledgeRelationType>([
        "is-a",
        "part-of",
        "related-to",
        "supports",
        "contradicts",
        "depends-on",
        "causes",
        "precedes",
        "follows",
        "explains",
        "answers",
        "applies-to",
        "created-by",
        "owned-by",
        "derived-from",
        "other"
    ]);


const CLAIM_TRUTH_STATUSES =
    new Set<ClaimTruthStatus>([
        "asserted",
        "supported",
        "disputed",
        "contradicted",
        "uncertain",
        "withdrawn"
    ]);


function requireRecord(
    value: unknown,
    path: string
): Record<string, unknown> {

    if (
        typeof value !==
            "object" ||
        value ===
            null ||
        Array.isArray(
            value
        )
    ) {

        throw new TypeError(
            `Semantic model output ${path} must be an object.`
        );

    }

    return value as
        Record<string, unknown>;

}


function requireExactKeys(
    record: Record<string, unknown>,
    allowedKeys: readonly string[],
    path: string
): void {

    const allowed =
        new Set(
            allowedKeys
        );

    for (
        const key of
        Object.keys(
            record
        )
    ) {

        if (
            !allowed.has(
                key
            )
        ) {

            throw new TypeError(
                `Semantic model output ${path} contains unexpected field: ${key}.`
            );

        }

    }

}


function requireArray(
    value: unknown,
    path: string
): readonly unknown[] {

    if (
        !Array.isArray(
            value
        )
    ) {

        throw new TypeError(
            `Semantic model output ${path} must be an array.`
        );

    }

    return value;

}


function requireString(
    value: unknown,
    path: string
): string {

    if (
        typeof value !==
            "string" ||
        value.trim().length ===
            0
    ) {

        throw new TypeError(
            `Semantic model output ${path} must be a non-empty string.`
        );

    }

    return value;

}


function optionalString(
    value: unknown,
    path: string
): string | undefined {

    if (
        value ===
        undefined
    ) {

        return undefined;

    }

    return requireString(
        value,
        path
    );

}


function requireNumber(
    value: unknown,
    path: string
): number {

    if (
        typeof value !==
            "number" ||
        !Number.isFinite(
            value
        )
    ) {

        throw new TypeError(
            `Semantic model output ${path} must be a finite number.`
        );

    }

    return value;

}


function requireStringArray(
    value: unknown,
    path: string
): readonly string[] {

    return requireArray(
        value,
        path
    ).map(
        (
            item,
            index
        ) =>
            requireString(
                item,
                `${path}[${index}]`
            )
    );

}


function parseNode(
    value: unknown,
    index: number
): SemanticCandidateNode {

    const path =
        `nodes[${index}]`;

    const record =
        requireRecord(
            value,
            path
        );

    const nodeType =
        requireString(
            record.nodeType,
            `${path}.nodeType`
        );

    if (
        !NODE_TYPES.has(
            nodeType as
                KnowledgeNodeType
        )
    ) {

        throw new TypeError(
            `Semantic model output ${path}.nodeType is not an approved KnowledgeNodeType.`
        );

    }

    return {
        key:
            requireString(
                record.key,
                `${path}.key`
            ),
        nodeType:
            nodeType as
                KnowledgeNodeType,
        canonicalName:
            requireString(
                record.canonicalName,
                `${path}.canonicalName`
            ),
        aliases:
            requireStringArray(
                record.aliases,
                `${path}.aliases`
            ),
        summary:
            optionalString(
                record.summary,
                `${path}.summary`
            ),
        description:
            optionalString(
                record.description,
                `${path}.description`
            ),
        confidence:
            requireNumber(
                record.confidence,
                `${path}.confidence`
            )
    };

}


function parseRelation(
    value: unknown,
    index: number
): SemanticCandidateRelation {

    const path =
        `relations[${index}]`;

    const record =
        requireRecord(
            value,
            path
        );

    const relationType =
        requireString(
            record.relationType,
            `${path}.relationType`
        );

    if (
        !RELATION_TYPES.has(
            relationType as
                KnowledgeRelationType
        )
    ) {

        throw new TypeError(
            `Semantic model output ${path}.relationType is not an approved KnowledgeRelationType.`
        );

    }

    return {
        fromKey:
            requireString(
                record.fromKey,
                `${path}.fromKey`
            ),
        toKey:
            requireString(
                record.toKey,
                `${path}.toKey`
            ),
        relationType:
            relationType as
                KnowledgeRelationType,
        label:
            optionalString(
                record.label,
                `${path}.label`
            ),
        confidence:
            requireNumber(
                record.confidence,
                `${path}.confidence`
            )
    };

}


function parseClaim(
    value: unknown,
    index: number
): SemanticCandidateClaim {

    const path =
        `claims[${index}]`;

    const record =
        requireRecord(
            value,
            path
        );

    const truthStatus =
        requireString(
            record.truthStatus,
            `${path}.truthStatus`
        );

    if (
        !CLAIM_TRUTH_STATUSES.has(
            truthStatus as
                ClaimTruthStatus
        )
    ) {

        throw new TypeError(
            `Semantic model output ${path}.truthStatus is not an approved ClaimTruthStatus.`
        );

    }

    return {
        subjectKey:
            requireString(
                record.subjectKey,
                `${path}.subjectKey`
            ),
        predicate:
            requireString(
                record.predicate,
                `${path}.predicate`
            ),
        objectKey:
            optionalString(
                record.objectKey,
                `${path}.objectKey`
            ),
        objectValue:
            optionalString(
                record.objectValue,
                `${path}.objectValue`
            ),
        truthStatus:
            truthStatus as
                ClaimTruthStatus,
        confidence:
            requireNumber(
                record.confidence,
                `${path}.confidence`
            )
    };

}


export function parseSemanticCandidateSet(
    content: string
): SemanticCandidateSet {

    if (
        content.trim().length ===
        0
    ) {

        throw new TypeError(
            "Semantic model returned empty candidate content."
        );

    }

    let parsed:
        unknown;

    try {

        parsed =
            JSON.parse(
                content
            );

    } catch {

        throw new TypeError(
            "Semantic model returned malformed JSON."
        );

    }

    const record =
        requireRecord(
            parsed,
            "root"
        );

    requireExactKeys(
        record,
        [
            "nodes",
            "relations",
            "claims"
        ],
        "root"
    );

    return {
        nodes:
            requireArray(
                record.nodes,
                "nodes"
            ).map(
                parseNode
            ),
        relations:
            requireArray(
                record.relations,
                "relations"
            ).map(
                parseRelation
            ),
        claims:
            requireArray(
                record.claims,
                "claims"
            ).map(
                parseClaim
            )
    };

}


function createSystemInstruction():
string {

    return [
        "You are a bounded semantic interpretation provider for River OS.",
        "Interpret only the supplied source segment and classification.",
        "Return candidate knowledge only; do not claim authority, execute actions, use tools, mutate data, publish, contact anyone, or infer hidden source material.",
        "Use only the approved node types, relation types, and claim truth statuses supplied in this instruction.",
        `Approved node types: ${[
            ...NODE_TYPES
        ].join(", ")}`,
        `Approved relation types: ${[
            ...RELATION_TYPES
        ].join(", ")}`,
        `Approved claim truth statuses: ${[
            ...CLAIM_TRUTH_STATUSES
        ].join(", ")}`,
        "Return strict JSON only with exactly these top-level arrays: nodes, relations, claims.",
        "Every relation and node-object claim must reference candidate node keys from nodes.",
        "Do not wrap JSON in Markdown fences."
    ].join(
        "\n"
    );

}


function createUserInstruction(
    request: SemanticInterpretationRequest
): string {

    const context = {
        segment: {
            id:
                request.segment.id,
            segmentType:
                request.segment.segmentType,
            sourceText:
                request.segment.sourceText,
            normalizedText:
                request.segment.normalizedText,
            topicKeys:
                request.segment.topicKeys,
            confidence:
                request.segment.confidence
        },
        classification: {
            id:
                request.classification.id,
            domainKeys:
                request.classification.domainKeys,
            topicKeys:
                request.classification.topicKeys,
            audienceKeys:
                request.classification.audienceKeys,
            contentFunctions:
                request.classification.contentFunctions,
            businessRelevance:
                request.classification.businessRelevance,
            learningOutcomes:
                request.classification.learningOutcomes,
            questionsAnswered:
                request.classification.questionsAnswered,
            confidence:
                request.classification.confidence
        }
    };

    return [
        "Create source-grounded semantic candidates from this bounded context:",
        JSON.stringify(
            context,
            null,
            2
        ),
        "",
        "Required JSON shape:",
        JSON.stringify(
            {
                nodes: [
                    {
                        key:
                            "stable-local-key",
                        nodeType:
                            "concept",
                        canonicalName:
                            "Canonical name",
                        aliases:
                            [],
                        summary:
                            "Optional summary",
                        description:
                            "Optional description",
                        confidence:
                            0
                    }
                ],
                relations: [
                    {
                        fromKey:
                            "stable-local-key",
                        toKey:
                            "another-local-key",
                        relationType:
                            "related-to",
                        label:
                            "Optional label",
                        confidence:
                            0
                    }
                ],
                claims: [
                    {
                        subjectKey:
                            "stable-local-key",
                        predicate:
                            "plain-language-or-stable-predicate",
                        objectValue:
                            "Use objectValue OR objectKey, never both",
                        truthStatus:
                            "asserted",
                        confidence:
                            0
                    }
                ]
            },
            null,
            2
        )
    ].join(
        "\n"
    );

}


export function createSemanticModelProvider(
    options: SemanticModelProviderOptions
): SemanticInterpretationProvider {

    return {

        async interpret(
            request
        ) {

            const response =
                await options.transport({
                    system:
                        createSystemInstruction(),
                    user:
                        createUserInstruction(
                            request
                        )
                });

            return parseSemanticCandidateSet(
                response.content
            );

        }

    };

}