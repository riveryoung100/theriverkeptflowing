import type {
    KnowledgeClaimId,
    KnowledgeNodeId,
    KnowledgeRecordId,
    KnowledgeRelationId,
    KnowledgeRevisionId
} from "./types";


export type KnowledgeIdPrefix =
    | "knowledge"
    | "relation"
    | "claim"
    | "revision";


const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


const KNOWLEDGE_ID_PATTERN =
    /^(knowledge|relation|claim|revision):([0-9a-f-]+)$/i;


function createUuid(): string {

    if (
        typeof globalThis.crypto ===
            "undefined" ||
        typeof globalThis.crypto.randomUUID !==
            "function"
    ) {

        throw new Error(
            "A runtime with crypto.randomUUID() is required to create knowledge identifiers."
        );

    }

    return globalThis.crypto.randomUUID();

}


export function createKnowledgeRecordId(
    prefix: KnowledgeIdPrefix
): KnowledgeRecordId {

    return `${prefix}:${createUuid()}` as
        KnowledgeRecordId;

}


export function createKnowledgeNodeId():
KnowledgeNodeId {

    return createKnowledgeRecordId(
        "knowledge"
    ) as KnowledgeNodeId;

}


export function createKnowledgeRelationId():
KnowledgeRelationId {

    return createKnowledgeRecordId(
        "relation"
    ) as KnowledgeRelationId;

}


export function createKnowledgeClaimId():
KnowledgeClaimId {

    return createKnowledgeRecordId(
        "claim"
    ) as KnowledgeClaimId;

}


export function createKnowledgeRevisionId():
KnowledgeRevisionId {

    return createKnowledgeRecordId(
        "revision"
    ) as KnowledgeRevisionId;

}


export function getKnowledgeIdPrefix(
    value: string
): KnowledgeIdPrefix | null {

    const match =
        KNOWLEDGE_ID_PATTERN.exec(
            value.trim()
        );

    if (!match) {
        return null;
    }

    return match[1].toLowerCase() as
        KnowledgeIdPrefix;

}


export function getKnowledgeUuid(
    value: string
): string | null {

    const match =
        KNOWLEDGE_ID_PATTERN.exec(
            value.trim()
        );

    if (
        !match ||
        !UUID_PATTERN.test(
            match[2]
        )
    ) {
        return null;
    }

    return match[2].toLowerCase();

}


export function isKnowledgeRecordId(
    value: unknown
): value is KnowledgeRecordId {

    if (
        typeof value !==
        "string"
    ) {
        return false;
    }

    const match =
        KNOWLEDGE_ID_PATTERN.exec(
            value.trim()
        );

    return (
        Boolean(match) &&
        UUID_PATTERN.test(
            match?.[2] ?? ""
        )
    );

}


export function hasKnowledgeIdPrefix(
    value: unknown,
    prefix: KnowledgeIdPrefix
): boolean {

    return (
        isKnowledgeRecordId(
            value
        ) &&
        getKnowledgeIdPrefix(
            value
        ) ===
            prefix
    );

}


export function isKnowledgeNodeId(
    value: unknown
): value is KnowledgeNodeId {

    return hasKnowledgeIdPrefix(
        value,
        "knowledge"
    );

}


export function isKnowledgeRelationId(
    value: unknown
): value is KnowledgeRelationId {

    return hasKnowledgeIdPrefix(
        value,
        "relation"
    );

}


export function isKnowledgeClaimId(
    value: unknown
): value is KnowledgeClaimId {

    return hasKnowledgeIdPrefix(
        value,
        "claim"
    );

}


export function isKnowledgeRevisionId(
    value: unknown
): value is KnowledgeRevisionId {

    return hasKnowledgeIdPrefix(
        value,
        "revision"
    );

}


export function assertKnowledgeRecordId(
    value: unknown
): asserts value is KnowledgeRecordId {

    if (
        !isKnowledgeRecordId(
            value
        )
    ) {

        throw new TypeError(
            "Expected a valid knowledge record identifier."
        );

    }

}


export function assertKnowledgeNodeId(
    value: unknown
): asserts value is KnowledgeNodeId {

    if (
        !isKnowledgeNodeId(
            value
        )
    ) {

        throw new TypeError(
            "Expected a valid knowledge node identifier."
        );

    }

}


export function assertKnowledgeRelationId(
    value: unknown
): asserts value is KnowledgeRelationId {

    if (
        !isKnowledgeRelationId(
            value
        )
    ) {

        throw new TypeError(
            "Expected a valid knowledge relation identifier."
        );

    }

}


export function assertKnowledgeClaimId(
    value: unknown
): asserts value is KnowledgeClaimId {

    if (
        !isKnowledgeClaimId(
            value
        )
    ) {

        throw new TypeError(
            "Expected a valid knowledge claim identifier."
        );

    }

}


export function assertKnowledgeRevisionId(
    value: unknown
): asserts value is KnowledgeRevisionId {

    if (
        !isKnowledgeRevisionId(
            value
        )
    ) {

        throw new TypeError(
            "Expected a valid knowledge revision identifier."
        );

    }

}
