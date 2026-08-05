import {
    randomUUID
} from "node:crypto";

import type {
    KnowledgeInsightId
} from "./types";


const INSIGHT_PREFIX =
    "insight:" as const;


const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


export function createKnowledgeInsightId():
KnowledgeInsightId {

    return (
        `${INSIGHT_PREFIX}${randomUUID()}`
    ) as KnowledgeInsightId;

}


export function isKnowledgeInsightId(
    value: unknown
): value is KnowledgeInsightId {

    if (
        typeof value !==
        "string"
    ) {
        return false;
    }

    if (
        !value.startsWith(
            INSIGHT_PREFIX
        )
    ) {
        return false;
    }

    const uuid =
        value.slice(
            INSIGHT_PREFIX.length
        );

    return UUID_PATTERN.test(
        uuid
    );

}


export function assertKnowledgeInsightId(
    value: unknown
): asserts value is KnowledgeInsightId {

    if (
        !isKnowledgeInsightId(
            value
        )
    ) {

        throw new TypeError(
            `Invalid knowledge insight identifier: ${String(value)}`
        );

    }

}


export function parseKnowledgeInsightId(
    value: KnowledgeInsightId
): {
    readonly prefix: "insight";
    readonly uuid: string;
} {

    assertKnowledgeInsightId(
        value
    );

    return {

        prefix:
            "insight",

        uuid:
            value.slice(
                INSIGHT_PREFIX.length
            )

    };

}
