import {
    isConfidence
} from "../../assimilation/validation";

import {
    isKnowledgeClaimId,
    isKnowledgeNodeId
} from "../identifiers";

import type {
    KnowledgeGraph
} from "../types";

import type {
    KnowledgeReasoningRequest
} from "./types";


export interface KnowledgeReasoningValidationIssue {

    readonly code:
        string;

    readonly message:
        string;

    readonly path:
        string;

}


export interface KnowledgeReasoningValidationResult {

    readonly valid:
        boolean;

    readonly issues:
        readonly KnowledgeReasoningValidationIssue[];

}


function issue(
    code: string,
    message: string,
    path: string
): KnowledgeReasoningValidationIssue {

    return {
        code,
        message,
        path
    };

}


function result(
    issues:
        readonly KnowledgeReasoningValidationIssue[]
): KnowledgeReasoningValidationResult {

    return {

        valid:
            issues.length === 0,

        issues

    };

}


function validateDepth(
    request: KnowledgeReasoningRequest,
    issues: KnowledgeReasoningValidationIssue[]
): void {

    if (
        request.maximumDepth ===
        undefined
    ) {
        return;
    }

    if (
        !Number.isInteger(
            request.maximumDepth
        ) ||
        request.maximumDepth < 1 ||
        request.maximumDepth > 10
    ) {

        issues.push(
            issue(
                "knowledge.reasoning.maximum-depth.invalid",
                "maximumDepth must be an integer between 1 and 10.",
                "request.maximumDepth"
            )
        );

    }

}


function validateConfidence(
    request: KnowledgeReasoningRequest,
    issues: KnowledgeReasoningValidationIssue[]
): void {

    if (
        request.minimumConfidence ===
        undefined
    ) {
        return;
    }

    if (
        !isConfidence(
            request.minimumConfidence
        )
    ) {

        issues.push(
            issue(
                "knowledge.reasoning.minimum-confidence.invalid",
                "minimumConfidence must be between 0 and 1.",
                "request.minimumConfidence"
            )
        );

    }

}


function validateOptionalIdentifiers(
    request: KnowledgeReasoningRequest,
    issues: KnowledgeReasoningValidationIssue[]
): void {

    if (
        request.sourceNodeId !==
            undefined &&
        !isKnowledgeNodeId(
            request.sourceNodeId
        )
    ) {

        issues.push(
            issue(
                "knowledge.reasoning.source-node-id.invalid",
                "sourceNodeId must be a valid knowledge node identifier.",
                "request.sourceNodeId"
            )
        );

    }

    if (
        request.targetNodeId !==
            undefined &&
        !isKnowledgeNodeId(
            request.targetNodeId
        )
    ) {

        issues.push(
            issue(
                "knowledge.reasoning.target-node-id.invalid",
                "targetNodeId must be a valid knowledge node identifier.",
                "request.targetNodeId"
            )
        );

    }

    if (
        request.claimId !==
            undefined &&
        !isKnowledgeClaimId(
            request.claimId
        )
    ) {

        issues.push(
            issue(
                "knowledge.reasoning.claim-id.invalid",
                "claimId must be a valid knowledge claim identifier.",
                "request.claimId"
            )
        );

    }

}


export function validateKnowledgeReasoningRequest(
    request: KnowledgeReasoningRequest
): KnowledgeReasoningValidationResult {

    const issues:
        KnowledgeReasoningValidationIssue[] =
        [];

    validateDepth(
        request,
        issues
    );

    validateConfidence(
        request,
        issues
    );

    validateOptionalIdentifiers(
        request,
        issues
    );

    switch (
        request.mode
    ) {

        case "support-path":
        case "shared-neighbors":
        case "transitive-relations":

            if (
                request.sourceNodeId ===
                undefined
            ) {

                issues.push(
                    issue(
                        "knowledge.reasoning.source-node-id.required",
                        `${request.mode} reasoning requires sourceNodeId.`,
                        "request.sourceNodeId"
                    )
                );

            }

            if (
                request.targetNodeId ===
                undefined
            ) {

                issues.push(
                    issue(
                        "knowledge.reasoning.target-node-id.required",
                        `${request.mode} reasoning requires targetNodeId.`,
                        "request.targetNodeId"
                    )
                );

            }

            if (
                request.sourceNodeId !==
                    undefined &&
                request.targetNodeId !==
                    undefined &&
                request.sourceNodeId ===
                    request.targetNodeId
            ) {

                issues.push(
                    issue(
                        "knowledge.reasoning.nodes.identical",
                        "sourceNodeId and targetNodeId must be different.",
                        "request"
                    )
                );

            }

            break;

        case "contradiction-check":

            if (
                request.claimId ===
                    undefined &&
                request.sourceNodeId ===
                    undefined
            ) {

                issues.push(
                    issue(
                        "knowledge.reasoning.contradiction-subject.required",
                        "contradiction-check requires claimId or sourceNodeId.",
                        "request"
                    )
                );

            }

            break;

        case "claim-evidence":

            if (
                request.claimId ===
                undefined
            ) {

                issues.push(
                    issue(
                        "knowledge.reasoning.claim-id.required",
                        "claim-evidence reasoning requires claimId.",
                        "request.claimId"
                    )
                );

            }

            break;

    }

    return result(
        issues
    );

}


export function validateKnowledgeReasoningGraphReferences(
    graph: KnowledgeGraph,
    request: KnowledgeReasoningRequest
): KnowledgeReasoningValidationResult {

    const issues:
        KnowledgeReasoningValidationIssue[] =
        [];

    const nodeIds =
        new Set(
            graph.nodes.map(
                (node) => {
                    return node.id;
                }
            )
        );

    const claimIds =
        new Set(
            graph.claims.map(
                (claim) => {
                    return claim.id;
                }
            )
        );

    if (
        request.sourceNodeId !==
            undefined &&
        !nodeIds.has(
            request.sourceNodeId
        )
    ) {

        issues.push(
            issue(
                "knowledge.reasoning.source-node.missing",
                `Unknown source node: ${request.sourceNodeId}`,
                "request.sourceNodeId"
            )
        );

    }

    if (
        request.targetNodeId !==
            undefined &&
        !nodeIds.has(
            request.targetNodeId
        )
    ) {

        issues.push(
            issue(
                "knowledge.reasoning.target-node.missing",
                `Unknown target node: ${request.targetNodeId}`,
                "request.targetNodeId"
            )
        );

    }

    if (
        request.claimId !==
            undefined &&
        !claimIds.has(
            request.claimId
        )
    ) {

        issues.push(
            issue(
                "knowledge.reasoning.claim.missing",
                `Unknown claim: ${request.claimId}`,
                "request.claimId"
            )
        );

    }

    return result(
        issues
    );

}


export function validateKnowledgeReasoningExecution(
    graph: KnowledgeGraph,
    request: KnowledgeReasoningRequest
): KnowledgeReasoningValidationResult {

    const requestValidation =
        validateKnowledgeReasoningRequest(
            request
        );

    const referenceValidation =
        validateKnowledgeReasoningGraphReferences(
            graph,
            request
        );

    return result([
        ...requestValidation.issues,
        ...referenceValidation.issues
    ]);

}
