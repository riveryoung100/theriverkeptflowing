import {
    isConfidence
} from "../../assimilation/validation";

import {
    isKnowledgeClaimId,
    isKnowledgeNodeId,
    isKnowledgeRelationId
} from "../identifiers";

import type {
    KnowledgeClaimFilter,
    KnowledgeNeighborQuery,
    KnowledgeNodeFilter,
    KnowledgeQueryRequest,
    KnowledgeRelationFilter,
    KnowledgeTextSearch
} from "./types";


export interface KnowledgeQueryValidationIssue {

    readonly code:
        string;

    readonly message:
        string;

    readonly path:
        string;

}


export interface KnowledgeQueryValidationResult {

    readonly valid:
        boolean;

    readonly issues:
        readonly KnowledgeQueryValidationIssue[];

}


function issue(
    code: string,
    message: string,
    path: string
): KnowledgeQueryValidationIssue {

    return {
        code,
        message,
        path
    };

}


function result(
    issues: readonly KnowledgeQueryValidationIssue[]
): KnowledgeQueryValidationResult {

    return {

        valid:
            issues.length === 0,

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


function validateStringValues(
    values: readonly string[] | undefined,
    path: string,
    issues: KnowledgeQueryValidationIssue[]
): void {

    if (
        values ===
        undefined
    ) {
        return;
    }

    if (
        values.some(
            (value) => {
                return (
                    value.trim().length ===
                    0
                );
            }
        )
    ) {

        issues.push(
            issue(
                "knowledge.query.string-value.empty",
                "Query string filters cannot contain empty values.",
                path
            )
        );

    }

    if (
        hasDuplicates(
            values
        )
    ) {

        issues.push(
            issue(
                "knowledge.query.reference.duplicate",
                "Query filters cannot contain duplicate values.",
                path
            )
        );

    }

}


function validatePagination(
    request: KnowledgeQueryRequest,
    issues: KnowledgeQueryValidationIssue[]
): void {

    if (
        request.limit !==
        undefined
    ) {

        if (
            !Number.isInteger(
                request.limit
            ) ||
            request.limit < 1 ||
            request.limit > 500
        ) {

            issues.push(
                issue(
                    "knowledge.query.limit.invalid",
                    "limit must be an integer between 1 and 500.",
                    "request.limit"
                )
            );

        }

    }

    if (
        request.offset !==
        undefined
    ) {

        if (
            !Number.isInteger(
                request.offset
            ) ||
            request.offset < 0
        ) {

            issues.push(
                issue(
                    "knowledge.query.offset.invalid",
                    "offset must be a non-negative integer.",
                    "request.offset"
                )
            );

        }

    }

}


export function validateKnowledgeNodeFilter(
    filter: KnowledgeNodeFilter,
    path =
        "nodeFilter"
): KnowledgeQueryValidationResult {

    const issues:
        KnowledgeQueryValidationIssue[] =
        [];

    if (
        filter.ids !==
        undefined
    ) {

        for (
            const id of
            filter.ids
        ) {

            if (
                !isKnowledgeNodeId(
                    id
                )
            ) {

                issues.push(
                    issue(
                        "knowledge.query.node-id.invalid",
                        `Invalid knowledge node identifier: ${id}`,
                        `${path}.ids`
                    )
                );

            }

        }

        if (
            hasDuplicates(
                filter.ids
            )
        ) {

            issues.push(
                issue(
                    "knowledge.query.reference.duplicate",
                    "Node identifiers cannot contain duplicates.",
                    `${path}.ids`
                )
            );

        }

    }

    validateStringValues(
        filter.nodeTypes,
        `${path}.nodeTypes`,
        issues
    );

    validateStringValues(
        filter.statuses,
        `${path}.statuses`,
        issues
    );

    validateStringValues(
        filter.visibilities,
        `${path}.visibilities`,
        issues
    );

    validateStringValues(
        filter.topicKeys,
        `${path}.topicKeys`,
        issues
    );

    validateStringValues(
        filter.domainKeys,
        `${path}.domainKeys`,
        issues
    );

    validateStringValues(
        filter.audienceKeys,
        `${path}.audienceKeys`,
        issues
    );

    return result(
        issues
    );

}


export function validateKnowledgeRelationFilter(
    filter: KnowledgeRelationFilter,
    path =
        "relationFilter"
): KnowledgeQueryValidationResult {

    const issues:
        KnowledgeQueryValidationIssue[] =
        [];

    if (
        filter.ids !==
        undefined
    ) {

        for (
            const id of
            filter.ids
        ) {

            if (
                !isKnowledgeRelationId(
                    id
                )
            ) {

                issues.push(
                    issue(
                        "knowledge.query.relation-id.invalid",
                        `Invalid knowledge relation identifier: ${id}`,
                        `${path}.ids`
                    )
                );

            }

        }

        if (
            hasDuplicates(
                filter.ids
            )
        ) {

            issues.push(
                issue(
                    "knowledge.query.reference.duplicate",
                    "Relation identifiers cannot contain duplicates.",
                    `${path}.ids`
                )
            );

        }

    }

    for (
        const nodeId of
        filter.fromNodeIds ?? []
    ) {

        if (
            !isKnowledgeNodeId(
                nodeId
            )
        ) {

            issues.push(
                issue(
                    "knowledge.query.from-node-id.invalid",
                    `Invalid source node identifier: ${nodeId}`,
                    `${path}.fromNodeIds`
                )
            );

        }

    }

    for (
        const nodeId of
        filter.toNodeIds ?? []
    ) {

        if (
            !isKnowledgeNodeId(
                nodeId
            )
        ) {

            issues.push(
                issue(
                    "knowledge.query.to-node-id.invalid",
                    `Invalid target node identifier: ${nodeId}`,
                    `${path}.toNodeIds`
                )
            );

        }

    }

    validateStringValues(
        filter.fromNodeIds,
        `${path}.fromNodeIds`,
        issues
    );

    validateStringValues(
        filter.toNodeIds,
        `${path}.toNodeIds`,
        issues
    );

    validateStringValues(
        filter.relationTypes,
        `${path}.relationTypes`,
        issues
    );

    validateStringValues(
        filter.statuses,
        `${path}.statuses`,
        issues
    );

    if (
        filter.minimumConfidence !==
            undefined &&
        !isConfidence(
            filter.minimumConfidence
        )
    ) {

        issues.push(
            issue(
                "knowledge.query.minimum-confidence.invalid",
                "minimumConfidence must be between 0 and 1.",
                `${path}.minimumConfidence`
            )
        );

    }

    return result(
        issues
    );

}


export function validateKnowledgeClaimFilter(
    filter: KnowledgeClaimFilter,
    path =
        "claimFilter"
): KnowledgeQueryValidationResult {

    const issues:
        KnowledgeQueryValidationIssue[] =
        [];

    for (
        const id of
        filter.ids ?? []
    ) {

        if (
            !isKnowledgeClaimId(
                id
            )
        ) {

            issues.push(
                issue(
                    "knowledge.query.claim-id.invalid",
                    `Invalid knowledge claim identifier: ${id}`,
                    `${path}.ids`
                )
            );

        }

    }

    for (
        const nodeId of
        filter.subjectNodeIds ?? []
    ) {

        if (
            !isKnowledgeNodeId(
                nodeId
            )
        ) {

            issues.push(
                issue(
                    "knowledge.query.subject-node-id.invalid",
                    `Invalid subject node identifier: ${nodeId}`,
                    `${path}.subjectNodeIds`
                )
            );

        }

    }

    for (
        const nodeId of
        filter.objectNodeIds ?? []
    ) {

        if (
            !isKnowledgeNodeId(
                nodeId
            )
        ) {

            issues.push(
                issue(
                    "knowledge.query.object-node-id.invalid",
                    `Invalid object node identifier: ${nodeId}`,
                    `${path}.objectNodeIds`
                )
            );

        }

    }

    validateStringValues(
        filter.ids,
        `${path}.ids`,
        issues
    );

    validateStringValues(
        filter.subjectNodeIds,
        `${path}.subjectNodeIds`,
        issues
    );

    validateStringValues(
        filter.objectNodeIds,
        `${path}.objectNodeIds`,
        issues
    );

    validateStringValues(
        filter.predicates,
        `${path}.predicates`,
        issues
    );

    validateStringValues(
        filter.truthStatuses,
        `${path}.truthStatuses`,
        issues
    );

    validateStringValues(
        filter.statuses,
        `${path}.statuses`,
        issues
    );

    if (
        filter.minimumConfidence !==
            undefined &&
        !isConfidence(
            filter.minimumConfidence
        )
    ) {

        issues.push(
            issue(
                "knowledge.query.minimum-confidence.invalid",
                "minimumConfidence must be between 0 and 1.",
                `${path}.minimumConfidence`
            )
        );

    }

    return result(
        issues
    );

}


export function validateKnowledgeTextSearch(
    search: KnowledgeTextSearch,
    path =
        "textSearch"
): KnowledgeQueryValidationResult {

    const issues:
        KnowledgeQueryValidationIssue[] =
        [];

    if (
        search.text.trim().length ===
        0
    ) {

        issues.push(
            issue(
                "knowledge.query.search-text.empty",
                "Search text cannot be empty.",
                `${path}.text`
            )
        );

    }

    return result(
        issues
    );

}


export function validateKnowledgeNeighborQuery(
    query: KnowledgeNeighborQuery,
    path =
        "neighborQuery"
): KnowledgeQueryValidationResult {

    const issues:
        KnowledgeQueryValidationIssue[] =
        [];

    if (
        !isKnowledgeNodeId(
            query.nodeId
        )
    ) {

        issues.push(
            issue(
                "knowledge.query.neighbor-node-id.invalid",
                "Neighbor traversal requires a valid knowledge node identifier.",
                `${path}.nodeId`
            )
        );

    }

    if (
        !Number.isInteger(
            query.maximumDepth
        ) ||
        query.maximumDepth < 1 ||
        query.maximumDepth > 10
    ) {

        issues.push(
            issue(
                "knowledge.query.maximum-depth.invalid",
                "maximumDepth must be an integer between 1 and 10.",
                `${path}.maximumDepth`
            )
        );

    }

    validateStringValues(
        query.relationTypes,
        `${path}.relationTypes`,
        issues
    );

    return result(
        issues
    );

}


export function validateKnowledgeQueryRequest(
    request: KnowledgeQueryRequest
): KnowledgeQueryValidationResult {

    const issues:
        KnowledgeQueryValidationIssue[] =
        [];

    validatePagination(
        request,
        issues
    );

    if (
        request.nodeFilter !==
        undefined
    ) {

        issues.push(
            ...validateKnowledgeNodeFilter(
                request.nodeFilter,
                "request.nodeFilter"
            ).issues
        );

    }

    if (
        request.relationFilter !==
        undefined
    ) {

        issues.push(
            ...validateKnowledgeRelationFilter(
                request.relationFilter,
                "request.relationFilter"
            ).issues
        );

    }

    if (
        request.claimFilter !==
        undefined
    ) {

        issues.push(
            ...validateKnowledgeClaimFilter(
                request.claimFilter,
                "request.claimFilter"
            ).issues
        );

    }

    if (
        request.textSearch !==
        undefined
    ) {

        issues.push(
            ...validateKnowledgeTextSearch(
                request.textSearch,
                "request.textSearch"
            ).issues
        );

    }

    if (
        request.neighborQuery !==
        undefined
    ) {

        issues.push(
            ...validateKnowledgeNeighborQuery(
                request.neighborQuery,
                "request.neighborQuery"
            ).issues
        );

    }

    switch (
        request.mode
    ) {

        case "node-by-id":

            if (
                request.nodeId ===
                undefined
            ) {

                issues.push(
                    issue(
                        "knowledge.query.node-id.required",
                        "node-by-id queries require nodeId.",
                        "request.nodeId"
                    )
                );

            }
            else if (
                !isKnowledgeNodeId(
                    request.nodeId
                )
            ) {

                issues.push(
                    issue(
                        "knowledge.query.node-id.invalid",
                        "nodeId must be a valid knowledge node identifier.",
                        "request.nodeId"
                    )
                );

            }

            break;

        case "nodes":

            if (
                request.nodeFilter ===
                undefined
            ) {

                issues.push(
                    issue(
                        "knowledge.query.node-filter.required",
                        "nodes queries require nodeFilter.",
                        "request.nodeFilter"
                    )
                );

            }

            break;

        case "relations":

            if (
                request.relationFilter ===
                undefined
            ) {

                issues.push(
                    issue(
                        "knowledge.query.relation-filter.required",
                        "relations queries require relationFilter.",
                        "request.relationFilter"
                    )
                );

            }

            break;

        case "claims":

            if (
                request.claimFilter ===
                undefined
            ) {

                issues.push(
                    issue(
                        "knowledge.query.claim-filter.required",
                        "claims queries require claimFilter.",
                        "request.claimFilter"
                    )
                );

            }

            break;

        case "neighbors":

            if (
                request.neighborQuery ===
                undefined
            ) {

                issues.push(
                    issue(
                        "knowledge.query.neighbor-query.required",
                        "neighbors queries require neighborQuery.",
                        "request.neighborQuery"
                    )
                );

            }

            break;

        case "search":

            if (
                request.textSearch ===
                undefined
            ) {

                issues.push(
                    issue(
                        "knowledge.query.text-search.required",
                        "search queries require textSearch.",
                        "request.textSearch"
                    )
                );

            }

            break;

    }

    return result(
        issues
    );

}
