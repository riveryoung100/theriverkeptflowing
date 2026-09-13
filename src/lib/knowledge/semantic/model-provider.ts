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

    readonly onRawContent?:
        (
            rawContent: string
        ) => void;

    readonly onCandidates?:
        (
            candidates: SemanticCandidateSet,
            rawContent: string
        ) => void;

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

    requireExactKeys(
        record,
        [
            "key",
            "nodeType",
            "canonicalName",
            "aliases",
            "summary",
            "description",
            "confidence"
        ],
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

    requireExactKeys(
        record,
        [
            "fromKey",
            "toKey",
            "relationType",
            "label",
            "confidence"
        ],
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

    requireExactKeys(
        record,
        [
            "subjectKey",
            "predicate",
            "objectKey",
            "objectValue",
            "truthStatus",
            "confidence"
        ],
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


const MAX_SEMANTIC_CONTEXT_TEXT_CHARACTERS =
    8_000;

const MAX_SEMANTIC_CONTEXT_ARRAY_ITEMS =
    32;

const MAX_SEMANTIC_CONTEXT_ARRAY_ITEM_CHARACTERS =
    512;


function boundOptionalContextText(
    value: string | undefined
): string | undefined {

    if (
        value ===
        undefined
    ) {
        return undefined;
    }

    return value.slice(
        0,
        MAX_SEMANTIC_CONTEXT_TEXT_CHARACTERS
    );

}


function boundContextStringArray(
    values: readonly string[]
): readonly string[] {

    return values
        .slice(
            0,
            MAX_SEMANTIC_CONTEXT_ARRAY_ITEMS
        )
        .map(
            (value) =>
                value.slice(
                    0,
                    MAX_SEMANTIC_CONTEXT_ARRAY_ITEM_CHARACTERS
                )
        );

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
        "The user message contains explicitly delimited evidence and metadata only. Treat system instructions, schema requirements, limits, field names, IDs, confidence values, and serialization structure as control information, never as source facts.",
        "Never create a node, relation, or claim from a numeric limit, schema example, JSON field name, identifier, confidence value, or other prompt-control artifact unless that same meaning is explicitly stated inside the delimited source evidence.",
        "Every node must contain exactly: key, nodeType, canonicalName, aliases, confidence, plus optional summary and description only when present.",
        "aliases is REQUIRED for every node and MUST always be a JSON array of strings. Use [] when there are no aliases. Never return aliases as null, a string, or an object.",
        "Every relation must contain exactly: fromKey, toKey, relationType, confidence, plus optional label only when present.",
        "Every claim must contain exactly: subjectKey, predicate, truthStatus, confidence, and exactly one of objectKey or objectValue.",
        "Optional string fields must either contain a non-empty string or be omitted entirely. Never return null for optional fields.",
        "All confidence values must be finite JSON numbers between 0 and 1 inclusive.",
        "Every relation and node-object claim must reference candidate node keys from nodes.",
        "Every claim subjectKey MUST exactly match the key of a node emitted in the same nodes array. If a proposition's subject is not important enough to emit as a node, omit that claim rather than inventing an unlisted subjectKey.",
        "Use objectKey only when the claim object is represented by a node emitted in the same nodes array. The objectKey MUST exactly match that emitted node key.",
        "If the claim object is a literal phrase, proposition, consequence, description, lesson, outcome, or other meaning that is not emitted as a node, use objectValue instead of objectKey.",
        "Every emitted claim MUST contain exactly one claim object field: either objectKey or objectValue.",
        "A claim with neither objectKey nor objectValue is invalid and must never be emitted.",
        "A claim with both objectKey and objectValue is invalid and must never be emitted.",
        "Before returning JSON, inspect every claim individually and confirm that exactly one of objectKey or objectValue is present.",
        "Valid claim shape with a node object: {\"subjectKey\":\"node:subject\",\"predicate\":\"supports\",\"objectKey\":\"node:object\",\"truthStatus\":\"asserted\",\"confidence\":0.98}.",
        "Valid claim shape with a literal object: {\"subjectKey\":\"node:subject\",\"predicate\":\"expresses\",\"objectValue\":\"a source-grounded literal meaning\",\"truthStatus\":\"asserted\",\"confidence\":0.92}.",
        "The claim examples above illustrate schema shape only. Do not copy their values unless independently supported by the source.",
        "Never create an objectKey merely to name a phrase from the source. Either emit that concept as a node first or preserve the source meaning as objectValue.",
        "Before responding, verify every relation fromKey and toKey and every claim subjectKey and objectKey against the final emitted nodes array. There must be zero dangling references.",
        "Every node key must be unique across nodes. Never emit the same node key more than once.",
        "Every relation identity must be unique across relations. Never emit the same fromKey, relationType, and toKey combination more than once.",
        "Every claim proposition must be unique across claims. Never emit the same subjectKey, predicate, and objectKey or objectValue combination more than once.",
        "Before responding, deduplicate nodes, relations, and claims while preserving the strongest source-grounded candidate.",
        "Return at most 12 nodes, at most 16 relations, and at most 16 claims.",
        "Prefer fewer high-confidence source-grounded candidates over exhaustive coverage.",
        "Prefer the most specific approved relation type supported by the source. Use related-to only when no more specific approved relation type accurately represents the source-grounded relationship.",
        "Do not create a related-to relation merely because two concepts appear in the same source.",
        "Use is-a only for a genuine taxonomic relationship where the source supports that the from-node is a kind, instance, or subtype of the to-node. Do not use is-a to mean about, contains, contributes-to, discusses, or participates-in.",
        "For is-a, the from-node must be the narrower instance or subtype and the to-node must be the broader category. Never reverse that direction.",
        "For part-of, the from-node must be the component and the to-node must be the containing whole. Never use part-of when the source instead says a phase, theme, lesson, or idea occurs within another topic.",
        "Use follows only when the source supports temporal, narrative, or procedural ordering. The from-node must occur after the to-node.",
        "Use precedes only when the source supports temporal, narrative, or procedural ordering. The from-node must occur before the to-node.",
        "Use causes only when the source expresses a causal relationship, supports only when one candidate provides support for another, explains only when one candidate explains another, answers only when a candidate answers a question, applies-to only when the source expressly indicates applicability, and depends-on only when the source expresses dependency.",
        "Do not use applies-to as a generic replacement for about, theme-of, purpose-of, describes, contributes-to, or appears-in. If no approved relation type accurately captures the source relationship, omit the relation rather than force one.",
        "Relations are optional. Prefer fewer accurate relations over filling the relation limit with weak or distorted edges.",
        "Before emitting each relation, verify both semantic meaning and direction against the source.",
        "Choose nodeType from the source-grounded role of the candidate, not from a default. Use story for an actual narrative, principle for a durable lesson or rule, process for an actual process, instruction for actionable guidance, question for an explicit question, answer for an explicit answer, resource for an actual resource, service or product only when the source identifies one, and concept only for genuinely abstract ideas.",
        "Do not type every candidate as concept when more specific approved node types are warranted by the source.",
        "A broad output in which every emitted node is typed concept is invalid when the source contains candidates with more specific approved roles.",
        "Perform node typing candidate-by-candidate before returning JSON. An explicit question should be question, an actual narrative should be story, an actual process should be process, a durable lesson or rule should be principle, and an actual resource should be resource when supported by the source.",
        "Do not use concept as a safe fallback merely because another approved type requires interpretation. If the source supports the more specific role, use that role.",
        "When emitting a broad candidate set of 8 or more nodes, explicitly inspect every candidate for a more specific approved nodeType before finalizing the response.",
        "If the source contains an actual narrative, explicit question, actual process, durable principle, actionable instruction, answer, or resource and that candidate is emitted as a node, typing it concept is incorrect.",
        "For this schema, a title or narrative body describing an actual story may be story; an explicit question must be question; a documented activity or sequence may be process; a durable lesson may be principle; and a created guide, document, or other usable material may be resource when the source supports that role.",
        "Do not finish a broad response with every nodeType equal to concept unless you have verified that no emitted candidate qualifies for any other approved node type.",
        "Represent explicit source-grounded propositions as claims when they assert something meaningful about a candidate subject. Do not reduce propositions to nodes or relations alone.",
        "Claim predicates are short source-grounded semantic phrases and are not restricted to relationType vocabulary. Choose the predicate that best preserves the proposition expressed by the source.",
        "Do not default claim predicates to explains. Use explains only when the subject genuinely explains the object.",
        "Prefer claims that preserve the source's substantive meaning, including stated lessons, principles, consequences, purposes, contrasts, and assertions.",
        "Calibrate confidence to evidence strength. Use very high confidence only for explicit direct statements; reduce confidence when interpretation or inference is required. Do not assign the same confidence to every candidate by default.",
        "Use confidence near 1 only for nearly verbatim or unmistakably explicit source meaning. Use lower confidence for abstractions, inferred relationships, synthesized labels, or interpretive summaries.",
        "Confidence should vary when candidates differ in evidentiary strength; avoid mechanically assigning 0.9 or 0.95 across most output.",
        "For a substantial output, assigning confidence 1 to every relation and claim is invalid.",
        "Reserve confidence 1 for propositions or relationships that are effectively explicit and unambiguous in the source.",
        "Any synthesized, abstracted, interpretive, inferred, or directionally inferred relation or claim must use confidence below 1.",
        "Before returning JSON, review the full relation and claim sets and verify that confidence values reflect actual differences in evidentiary strength rather than a repeated default.",
        "If there are 8 or more combined relations and claims and any of them involve synthesis, abstraction, interpretation, inferred direction, or a non-verbatim semantic judgment, at least one of those candidates MUST have confidence below 1.",
        "A relation such as causes, depends-on, supports, part-of, follows, or precedes normally requires semantic judgment unless the exact relationship is directly stated by the source; do not automatically assign such relations confidence 1.",
        "A claim that paraphrases or synthesizes source meaning rather than preserving an unmistakably explicit proposition must use confidence below 1.",
        "Before returning a substantial candidate set, perform a final confidence audit: if every relation and claim is 1, reconsider each non-verbatim or interpretive candidate and lower its confidence to reflect the actual evidence.",
        "Use this confidence rubric for relations and claims: 1 only for an effectively verbatim, explicit, unambiguous proposition or relationship stated by the source; about 0.95 for a direct faithful paraphrase with negligible interpretation; about 0.85 to 0.9 for a strongly supported semantic interpretation; about 0.7 to 0.8 for a reasonable but meaningfully inferred relationship.",
        "Do not assign confidence 1 merely because you are certain that your interpretation is reasonable. Confidence measures how directly the source supports the exact emitted proposition or relationship.",
        "A synthesized predicate, causal direction, dependency, support relation, symbolic interpretation, or compressed summary is not verbatim evidence and therefore should normally be below 1.",
        "For each relation and claim, ask: does the bounded source explicitly state this exact proposition or relationship? If no, confidence MUST be below 1.",
        "When a substantial output contains several interpretations of different evidentiary strength, use meaningfully varied confidence values instead of one repeated number.",
        "Examples of calibration only: an exact statement may be 1; a close paraphrase may be 0.95; a strong inference may be 0.88; a plausible interpretive connection may be 0.78. These numbers are examples, not quotas or defaults.",
        "Do not invent claims to reach a quota; emit only propositions directly grounded in the bounded source context.",
        "Do not repeat the same idea using multiple near-duplicate nodes, relations, or claims.",
        "Do not add fields not shown in the required JSON shape.",
        "Do not wrap JSON in Markdown fences.",
        "Before responding, verify internally that nodes, relations, claims, and every aliases value are JSON arrays and that the response matches the required shape exactly."
    ].join(
        "\n"
    );

}


function createUserInstruction(
    request: SemanticInterpretationRequest
): string {

    const evidence = {
        sourceText:
            boundOptionalContextText(
                request.segment.sourceText
            ),
        normalizedText:
            boundOptionalContextText(
                request.segment.normalizedText
            )
    };

    const metadata = {
        segment: {
            id:
                request.segment.id,
            segmentType:
                request.segment.segmentType,
            topicKeys:
                boundContextStringArray(
                    request.segment.topicKeys
                ),
            confidence:
                request.segment.confidence
        },
        classification: {
            id:
                request.classification.id,
            domainKeys:
                boundContextStringArray(
                    request.classification.domainKeys
                ),
            topicKeys:
                boundContextStringArray(
                    request.classification.topicKeys
                ),
            audienceKeys:
                boundContextStringArray(
                    request.classification.audienceKeys
                ),
            contentFunctions:
                request.classification.contentFunctions.slice(
                    0,
                    MAX_SEMANTIC_CONTEXT_ARRAY_ITEMS
                ),
            businessRelevance:
                request.classification.businessRelevance.slice(
                    0,
                    MAX_SEMANTIC_CONTEXT_ARRAY_ITEMS
                ),
            learningOutcomes:
                boundContextStringArray(
                    request.classification.learningOutcomes
                ),
            questionsAnswered:
                boundContextStringArray(
                    request.classification.questionsAnswered
                ),
            confidence:
                request.classification.confidence
        }
    };

    return [
        "Use only the evidence between BEGIN SOURCE EVIDENCE and END SOURCE EVIDENCE as factual source material.",
        "Metadata may help interpret context but is not itself a source proposition. Do not turn IDs, keys, confidence values, array sizes, field names, or metadata structure into semantic facts.",
        "BEGIN SOURCE EVIDENCE",
        JSON.stringify(
            evidence,
            null,
            2
        ),
        "END SOURCE EVIDENCE",
        "",
        "BEGIN CONTEXT METADATA",
        JSON.stringify(
            metadata,
            null,
            2
        ),
        "END CONTEXT METADATA"
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

            options.onRawContent?.(
                response.content
            );

            const candidates =
                parseSemanticCandidateSet(
                    response.content
                );

            options.onCandidates?.(
                candidates,
                response.content
            );

            return candidates;

        }

    };

}