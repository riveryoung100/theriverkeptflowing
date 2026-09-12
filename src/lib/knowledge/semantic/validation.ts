import type {
    SemanticCandidateSet,
    SemanticInterpretationRequest
} from "./types";


export type SemanticCandidateValidationSeverity =
    | "error"
    | "warning";


export interface SemanticCandidateValidationIssue {

    readonly code:
        string;

    readonly message:
        string;

    readonly path:
        string;

    readonly severity:
        SemanticCandidateValidationSeverity;

}


export interface SemanticCandidateValidationResult {

    readonly valid:
        boolean;

    readonly issues:
        readonly SemanticCandidateValidationIssue[];

}


function issue(
    code: string,
    message: string,
    path: string,
    severity: SemanticCandidateValidationSeverity =
        "error"
): SemanticCandidateValidationIssue {

    return {
        code,
        message,
        path,
        severity
    };

}


function isConfidence(
    value: number
): boolean {

    return (
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 1
    );

}


function isNonEmpty(
    value: string
): boolean {

    return (
        value.trim().length >
        0
    );

}


export function validateSemanticCandidateSet(
    request: SemanticInterpretationRequest,
    candidates: SemanticCandidateSet
): SemanticCandidateValidationResult {

    const issues:
        SemanticCandidateValidationIssue[] =
        [];

    if (
        request.segment.assetId !==
        request.classification.assetId
    ) {

        issues.push(
            issue(
                "semantic.context.asset-mismatch",
                "Segment and classification must belong to the same source asset.",
                "request"
            )
        );

    }

    const keys =
        candidates.nodes.map(
            (node) => node.key
        );

    const knownKeys =
        new Set<string>();

    candidates.nodes.forEach(
        (
            node,
            index
        ) => {

            const path =
                `nodes[${index}]`;

            if (
                !isNonEmpty(
                    node.key
                )
            ) {

                issues.push(
                    issue(
                        "semantic.node.key.empty",
                        "Candidate node key must be non-empty.",
                        `${path}.key`
                    )
                );

            }
            else if (
                knownKeys.has(
                    node.key
                )
            ) {

                issues.push(
                    issue(
                        "semantic.node.key.duplicate",
                        `Candidate node key must be unique: ${node.key}`,
                        `${path}.key`
                    )
                );

            }
            else {

                knownKeys.add(
                    node.key
                );

            }

            if (
                !isNonEmpty(
                    node.canonicalName
                )
            ) {

                issues.push(
                    issue(
                        "semantic.node.name.empty",
                        "Candidate node canonicalName must be non-empty.",
                        `${path}.canonicalName`
                    )
                );

            }

            if (
                !isConfidence(
                    node.confidence
                )
            ) {

                issues.push(
                    issue(
                        "semantic.node.confidence.invalid",
                        "Candidate node confidence must be between 0 and 1.",
                        `${path}.confidence`
                    )
                );

            }

        }
    );

    if (
        new Set(keys).size !==
        keys.length
    ) {

        const duplicateKeys =
            keys.filter(
                (key, index) =>
                    keys.indexOf(key) !==
                    index
            );

        if (
            duplicateKeys.length ===
            0
        ) {

            issues.push(
                issue(
                    "semantic.node.key.duplicate",
                    "Candidate node keys must be unique.",
                    "nodes"
                )
            );

        }

    }

    const knownRelationIdentities =
        new Set<string>();

    candidates.relations.forEach(
        (
            relation,
            index
        ) => {

            const path =
                `relations[${index}]`;

            const relationIdentity =
                [
                    relation.fromKey,
                    relation.toKey,
                    relation.relationType
                ].join(
                    "\u001f"
                );

            if (
                knownRelationIdentities.has(
                    relationIdentity
                )
            ) {

                issues.push(
                    issue(
                        "semantic.relation.duplicate",
                        `Candidate relation must be unique: ${relation.fromKey} ${relation.relationType} ${relation.toKey}`,
                        path
                    )
                );

            }
            else {

                knownRelationIdentities.add(
                    relationIdentity
                );

            }

            if (
                !knownKeys.has(
                    relation.fromKey
                )
            ) {

                issues.push(
                    issue(
                        "semantic.relation.from.unknown",
                        `Relation references unknown fromKey: ${relation.fromKey}`,
                        `${path}.fromKey`
                    )
                );

            }

            if (
                !knownKeys.has(
                    relation.toKey
                )
            ) {

                issues.push(
                    issue(
                        "semantic.relation.to.unknown",
                        `Relation references unknown toKey: ${relation.toKey}`,
                        `${path}.toKey`
                    )
                );

            }

            if (
                relation.fromKey ===
                relation.toKey
            ) {

                issues.push(
                    issue(
                        "semantic.relation.self-reference",
                        "Candidate relation cannot connect a node to itself.",
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
                        "semantic.relation.confidence.invalid",
                        "Candidate relation confidence must be between 0 and 1.",
                        `${path}.confidence`
                    )
                );

            }

        }
    );

    const knownClaimIdentities =
        new Set<string>();

    candidates.claims.forEach(
        (
            claim,
            index
        ) => {

            const path =
                `claims[${index}]`;

            const claimObjectIdentity =
                claim.objectKey !==
                    undefined
                    ? `key:${claim.objectKey}`
                    : `value:${claim.objectValue ?? ""}`;

            const claimIdentity =
                [
                    claim.subjectKey,
                    claim.predicate,
                    claimObjectIdentity
                ].join(
                    "\u001f"
                );

            if (
                knownClaimIdentities.has(
                    claimIdentity
                )
            ) {

                issues.push(
                    issue(
                        "semantic.claim.duplicate",
                        `Candidate claim must be unique: ${claim.subjectKey} ${claim.predicate} ${claimObjectIdentity}`,
                        path
                    )
                );

            }
            else {

                knownClaimIdentities.add(
                    claimIdentity
                );

            }

            if (
                !knownKeys.has(
                    claim.subjectKey
                )
            ) {

                issues.push(
                    issue(
                        "semantic.claim.subject.unknown",
                        `Claim references unknown subjectKey: ${claim.subjectKey}`,
                        `${path}.subjectKey`
                    )
                );

            }

            if (
                !isNonEmpty(
                    claim.predicate
                )
            ) {

                issues.push(
                    issue(
                        "semantic.claim.predicate.empty",
                        "Candidate claim predicate must be non-empty.",
                        `${path}.predicate`
                    )
                );

            }

            const hasObjectKey =
                typeof claim.objectKey ===
                    "string" &&
                isNonEmpty(
                    claim.objectKey
                );

            const hasObjectValue =
                typeof claim.objectValue ===
                    "string" &&
                isNonEmpty(
                    claim.objectValue
                );

            if (
                hasObjectKey ===
                hasObjectValue
            ) {

                issues.push(
                    issue(
                        "semantic.claim.object.invalid",
                        "Candidate claim must contain exactly one of objectKey or objectValue.",
                        path
                    )
                );

            }

            if (
                hasObjectKey &&
                !knownKeys.has(
                    claim.objectKey as string
                )
            ) {

                issues.push(
                    issue(
                        "semantic.claim.object-key.unknown",
                        `Claim references unknown objectKey: ${claim.objectKey}`,
                        `${path}.objectKey`
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
                        "semantic.claim.confidence.invalid",
                        "Candidate claim confidence must be between 0 and 1.",
                        `${path}.confidence`
                    )
                );

            }

        }
    );

    return {
        valid:
            !issues.some(
                (item) =>
                    item.severity ===
                    "error"
            ),
        issues
    };

}