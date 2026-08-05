import type {
    KnowledgeInsight,
    KnowledgeInsightEngineResult,
    KnowledgeInsightRequest
} from "./types";

import {
    assertKnowledgeInsightId
} from "./identifiers";


export function validateKnowledgeInsightRequest(
    request: KnowledgeInsightRequest
): void {

    if (
        request.title.trim().length === 0
    ) {
        throw new TypeError(
            "Insight title cannot be empty."
        );
    }

    if (
        request.reasoning.explanation
            .trim()
            .length === 0
    ) {
        throw new TypeError(
            "Reasoning explanation cannot be empty."
        );
    }

    if (
        request.minimumConfidence !==
        undefined
    ) {

        if (
            request.minimumConfidence < 0 ||
            request.minimumConfidence > 1
        ) {
            throw new TypeError(
                "Minimum confidence must be between 0 and 1."
            );
        }

    }

}


export function validateKnowledgeInsight(
    insight: KnowledgeInsight
): void {

    assertKnowledgeInsightId(
        insight.id
    );

    if (
        insight.title.trim().length === 0
    ) {
        throw new TypeError(
            "Insight title cannot be empty."
        );
    }

    if (
        insight.summary.trim().length === 0
    ) {
        throw new TypeError(
            "Insight summary cannot be empty."
        );
    }

    if (
        insight.confidence < 0 ||
        insight.confidence > 1
    ) {
        throw new TypeError(
            "Insight confidence must be between 0 and 1."
        );
    }

}


export function validateKnowledgeInsightResult(
    result: KnowledgeInsightEngineResult
): void {

    validateKnowledgeInsight(
        result.insight
    );

}
