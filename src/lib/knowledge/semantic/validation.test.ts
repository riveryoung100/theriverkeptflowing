import assert from "node:assert/strict";
import test from "node:test";

import {
    sampleTextClassification,
    sampleTextSegment
} from "../../assimilation/fixtures/sampleTextAsset";

import type {
    SemanticCandidateSet,
    SemanticInterpretationRequest
} from "./types";

import {
    validateSemanticCandidateSet
} from "./validation";


const request:
SemanticInterpretationRequest = {

    segment:
        sampleTextSegment,

    classification:
        sampleTextClassification

};


function createValidCandidates():
SemanticCandidateSet {

    return {

        nodes: [
            {
                key:
                    "source-provenance",
                nodeType:
                    "principle",
                canonicalName:
                    "Source provenance",
                aliases:
                    [],
                confidence:
                    1
            },
            {
                key:
                    "derived-knowledge",
                nodeType:
                    "concept",
                canonicalName:
                    "Derived knowledge",
                aliases:
                    [],
                confidence:
                    1
            }
        ],

        relations: [
            {
                fromKey:
                    "derived-knowledge",
                toKey:
                    "source-provenance",
                relationType:
                    "depends-on",
                confidence:
                    0.95
            }
        ],

        claims: [
            {
                subjectKey:
                    "derived-knowledge",
                predicate:
                    "must-remain-separate-from",
                objectValue:
                    "raw source assets",
                truthStatus:
                    "asserted",
                confidence:
                    1
            }
        ]

    };

}


test(
    "accepts a valid source-grounded semantic candidate set",
    () => {

        const result =
            validateSemanticCandidateSet(
                request,
                createValidCandidates()
            );

        assert.equal(
            result.valid,
            true
        );

        assert.deepEqual(
            result.issues,
            []
        );

    }
);


test(
    "rejects duplicate candidate node keys",
    () => {

        const valid =
            createValidCandidates();

        const result =
            validateSemanticCandidateSet(
                request,
                {
                    ...valid,
                    nodes: [
                        ...valid.nodes,
                        {
                            ...valid.nodes[0]!,
                            canonicalName:
                                "Duplicate provenance"
                        }
                    ]
                }
            );

        assert.equal(
            result.valid,
            false
        );

        assert.equal(
            result.issues.some(
                (item) =>
                    item.code ===
                    "semantic.node.key.duplicate"
            ),
            true
        );

    }
);


test(
    "rejects relations that reference unknown candidate nodes",
    () => {

        const valid =
            createValidCandidates();

        const result =
            validateSemanticCandidateSet(
                request,
                {
                    ...valid,
                    relations: [
                        {
                            fromKey:
                                "missing-node",
                            toKey:
                                "source-provenance",
                            relationType:
                                "related-to",
                            confidence:
                                1
                        }
                    ]
                }
            );

        assert.equal(
            result.valid,
            false
        );

        assert.equal(
            result.issues.some(
                (item) =>
                    item.code ===
                    "semantic.relation.from.unknown"
            ),
            true
        );

    }
);


test(
    "rejects claims that define both objectKey and objectValue",
    () => {

        const valid =
            createValidCandidates();

        const result =
            validateSemanticCandidateSet(
                request,
                {
                    ...valid,
                    claims: [
                        {
                            subjectKey:
                                "derived-knowledge",
                            predicate:
                                "depends-on",
                            objectKey:
                                "source-provenance",
                            objectValue:
                                "source provenance",
                            truthStatus:
                                "asserted",
                            confidence:
                                1
                        }
                    ]
                }
            );

        assert.equal(
            result.valid,
            false
        );

        assert.equal(
            result.issues.some(
                (item) =>
                    item.code ===
                    "semantic.claim.object.invalid"
            ),
            true
        );

    }
);


test(
    "rejects semantic interpretation across mismatched source assets",
    () => {

        const result =
            validateSemanticCandidateSet(
                {
                    segment:
                        sampleTextSegment,
                    classification: {
                        ...sampleTextClassification,
                        assetId:
                            "asset:99999999-9999-4999-8999-999999999999"
                    }
                },
                createValidCandidates()
            );

        assert.equal(
            result.valid,
            false
        );

        assert.equal(
            result.issues.some(
                (item) =>
                    item.code ===
                    "semantic.context.asset-mismatch"
            ),
            true
        );

    }
);


test(
    "rejects confidence values outside the normalized range",
    () => {

        const valid =
            createValidCandidates();

        const result =
            validateSemanticCandidateSet(
                request,
                {
                    ...valid,
                    nodes: [
                        {
                            ...valid.nodes[0]!,
                            confidence:
                                1.1
                        },
                        valid.nodes[1]!
                    ]
                }
            );

        assert.equal(
            result.valid,
            false
        );

        assert.equal(
            result.issues.some(
                (item) =>
                    item.code ===
                    "semantic.node.confidence.invalid"
            ),
            true
        );

    }
);

test(
    "rejects duplicate semantic relations by durable identity",
    () => {

        const valid =
            createValidCandidates();

        const duplicateRelation = {
            ...valid.relations[0]!,
            confidence:
                0.5,
            label:
                "Different presentation metadata"
        };

        const result =
            validateSemanticCandidateSet(
                request,
                {
                    ...valid,
                    relations: [
                        ...valid.relations,
                        duplicateRelation
                    ]
                }
            );

        assert.equal(
            result.valid,
            false
        );

        assert.equal(
            result.issues.some(
                (item) =>
                    item.code ===
                    "semantic.relation.duplicate"
            ),
            true
        );

    }
);


test(
    "rejects duplicate semantic claims by durable proposition identity",
    () => {

        const valid =
            createValidCandidates();

        const duplicateClaim = {
            ...valid.claims[0]!,
            truthStatus:
                "supported" as const,
            confidence:
                0.5
        };

        const result =
            validateSemanticCandidateSet(
                request,
                {
                    ...valid,
                    claims: [
                        ...valid.claims,
                        duplicateClaim
                    ]
                }
            );

        assert.equal(
            result.valid,
            false
        );

        assert.equal(
            result.issues.some(
                (item) =>
                    item.code ===
                    "semantic.claim.duplicate"
            ),
            true
        );

    }
);

test(
    "rejects broad all-concept semantic node collapse",
    () => {

        const valid =
            createValidCandidates();

        const result =
            validateSemanticCandidateSet(
                request,
                {
                    nodes:
                        Array.from(
                            {
                                length:
                                    8
                            },
                            (
                                _,
                                index
                            ) => ({
                                ...valid.nodes[0]!,
                                key:
                                    `concept-${index}`,
                                canonicalName:
                                    `Concept ${index}`,
                                nodeType:
                                    "concept" as const,
                                confidence:
                                    0.8
                            })
                        ),
                    relations:
                        [],
                    claims:
                        []
                }
            );

        assert.equal(
            result.valid,
            false
        );

        assert.equal(
            result.issues.some(
                (item) =>
                    item.code ===
                    "semantic.quality.node-type-collapse"
            ),
            true
        );

    }
);


test(
    "rejects multi-edge relation type collapse",
    () => {

        const nodes =
            Array.from(
                {
                    length:
                        7
                },
                (
                    _,
                    index
                ) => ({
                    key:
                        `relation-node-${index}`,
                    nodeType:
                        (
                            index ===
                                0
                                ? "story"
                                : "concept"
                        ) as
                            | "story"
                            | "concept",
                    canonicalName:
                        `Relation Node ${index}`,
                    aliases:
                        [],
                    confidence:
                        0.8
                })
            );

        const result =
            validateSemanticCandidateSet(
                request,
                {
                    nodes,
                    relations:
                        Array.from(
                            {
                                length:
                                    6
                            },
                            (
                                _,
                                index
                            ) => ({
                                fromKey:
                                    nodes[index]!.key,
                                toKey:
                                    nodes[index + 1]!.key,
                                relationType:
                                    "related-to" as const,
                                confidence:
                                    0.8
                            })
                        ),
                    claims:
                        []
                }
            );

        assert.equal(
            result.valid,
            false
        );

        assert.equal(
            result.issues.some(
                (item) =>
                    item.code ===
                    "semantic.quality.relation-type-collapse"
            ),
            true
        );

    }
);


test(
    "rejects substantial claim predicate collapse",
    () => {

        const nodes =
            Array.from(
                {
                    length:
                        6
                },
                (
                    _,
                    index
                ) => ({
                    key:
                        `claim-node-${index}`,
                    nodeType:
                        (
                            index ===
                                0
                                ? "story"
                                : "concept"
                        ) as
                            | "story"
                            | "concept",
                    canonicalName:
                        `Claim Node ${index}`,
                    aliases:
                        [],
                    confidence:
                        0.8
                })
            );

        const result =
            validateSemanticCandidateSet(
                request,
                {
                    nodes,
                    relations:
                        [],
                    claims:
                        nodes.map(
                            (
                                node,
                                index
                            ) => ({
                                subjectKey:
                                    node.key,
                                predicate:
                                    "is-a",
                                objectValue:
                                    `Claim value ${index}`,
                                truthStatus:
                                    "asserted" as const,
                                confidence:
                                    0.8
                            })
                        )
                }
            );

        assert.equal(
            result.valid,
            false
        );

        assert.equal(
            result.issues.some(
                (item) =>
                    item.code ===
                    "semantic.quality.claim-predicate-collapse"
            ),
            true
        );

    }
);


test(
    "rejects mechanically uniform maximum semantic confidence",
    () => {

        const nodes =
            Array.from(
                {
                    length:
                        5
                },
                (
                    _,
                    index
                ) => ({
                    key:
                        `confidence-node-${index}`,
                    nodeType:
                        (
                            index ===
                                0
                                ? "story"
                                : "concept"
                        ) as
                            | "story"
                            | "concept",
                    canonicalName:
                        `Confidence Node ${index}`,
                    aliases:
                        [],
                    confidence:
                        0.8
                })
            );

        const result =
            validateSemanticCandidateSet(
                request,
                {
                    nodes,
                    relations: [
                        {
                            fromKey:
                                nodes[0]!.key,
                            toKey:
                                nodes[1]!.key,
                            relationType:
                                "supports",
                            confidence:
                                1
                        },
                        {
                            fromKey:
                                nodes[1]!.key,
                            toKey:
                                nodes[2]!.key,
                            relationType:
                                "explains",
                            confidence:
                                1
                        },
                        {
                            fromKey:
                                nodes[2]!.key,
                            toKey:
                                nodes[3]!.key,
                            relationType:
                                "part-of",
                            confidence:
                                1
                        },
                        {
                            fromKey:
                                nodes[3]!.key,
                            toKey:
                                nodes[4]!.key,
                            relationType:
                                "follows",
                            confidence:
                                1
                        }
                    ],
                    claims:
                        Array.from(
                            {
                                length:
                                    4
                            },
                            (
                                _,
                                index
                            ) => ({
                                subjectKey:
                                    nodes[index]!.key,
                                predicate:
                                    `predicate-${index}`,
                                objectValue:
                                    `Value ${index}`,
                                truthStatus:
                                    "asserted" as const,
                                confidence:
                                    1
                            })
                        )
                }
            );

        assert.equal(
            result.valid,
            false
        );

        assert.equal(
            result.issues.some(
                (item) =>
                    item.code ===
                    "semantic.quality.uniform-max-confidence"
            ),
            true
        );

    }
);


test(
    "rejects overwhelming relation type dominance without requiring total collapse",
    () => {

        const nodes =
            Array.from(
                {
                    length:
                        10
                },
                (
                    _,
                    index
                ) => ({
                    key:
                        `relation-dominance-node-${index}`,
                    nodeType:
                        (
                            index ===
                                0
                                ? "story"
                                : "concept"
                        ) as
                            | "story"
                            | "concept",
                    canonicalName:
                        `Relation Dominance Node ${index}`,
                    aliases:
                        [],
                    confidence:
                        0.8
                })
            );

        const result =
            validateSemanticCandidateSet(
                request,
                {
                    nodes,
                    relations:
                        Array.from(
                            {
                                length:
                                    9
                            },
                            (
                                _,
                                index
                            ) => ({
                                fromKey:
                                    nodes[index]!.key,
                                toKey:
                                    nodes[index + 1]!.key,
                                relationType:
                                    (
                                        index ===
                                            8
                                            ? "causes"
                                            : "is-a"
                                    ) as
                                        | "is-a"
                                        | "causes",
                                confidence:
                                    0.8
                            })
                        ),
                    claims:
                        []
                }
            );

        assert.equal(
            result.valid,
            false
        );

        assert.equal(
            result.issues.some(
                (item) =>
                    item.code ===
                    "semantic.quality.relation-type-dominance"
            ),
            true
        );

    }
);


test(
    "rejects overwhelming claim predicate dominance without requiring total collapse",
    () => {

        const nodes =
            Array.from(
                {
                    length:
                        10
                },
                (
                    _,
                    index
                ) => ({
                    key:
                        `claim-dominance-node-${index}`,
                    nodeType:
                        (
                            index ===
                                0
                                ? "story"
                                : "concept"
                        ) as
                            | "story"
                            | "concept",
                    canonicalName:
                        `Claim Dominance Node ${index}`,
                    aliases:
                        [],
                    confidence:
                        0.8
                })
            );

        const result =
            validateSemanticCandidateSet(
                request,
                {
                    nodes,
                    relations:
                        [],
                    claims:
                        nodes.map(
                            (
                                node,
                                index
                            ) => ({
                                subjectKey:
                                    node.key,
                                predicate:
                                    index ===
                                        9
                                        ? "explains"
                                        : "represents",
                                objectValue:
                                    `Dominance claim ${index}`,
                                truthStatus:
                                    "asserted" as const,
                                confidence:
                                    0.8
                            })
                        )
                }
            );

        assert.equal(
            result.valid,
            false
        );

        assert.equal(
            result.issues.some(
                (item) =>
                    item.code ===
                    "semantic.quality.claim-predicate-dominance"
            ),
            true
        );

    }
);


test(
    "rejects overwhelming maximum claim confidence without requiring total uniform confidence",
    () => {

        const nodes =
            Array.from(
                {
                    length:
                        10
                },
                (
                    _,
                    index
                ) => ({
                    key:
                        `claim-confidence-node-${index}`,
                    nodeType:
                        (
                            index ===
                                0
                                ? "story"
                                : "concept"
                        ) as
                            | "story"
                            | "concept",
                    canonicalName:
                        `Claim Confidence Node ${index}`,
                    aliases:
                        [],
                    confidence:
                        0.8
                })
            );

        const result =
            validateSemanticCandidateSet(
                request,
                {
                    nodes,
                    relations:
                        [],
                    claims:
                        nodes.map(
                            (
                                node,
                                index
                            ) => ({
                                subjectKey:
                                    node.key,
                                predicate:
                                    `predicate-${index}`,
                                objectValue:
                                    `Confidence claim ${index}`,
                                truthStatus:
                                    "asserted" as const,
                                confidence:
                                    index <
                                        8
                                        ? 1
                                        : 0.88
                            })
                        )
                }
            );

        assert.equal(
            result.valid,
            false
        );

        assert.equal(
            result.issues.some(
                (item) =>
                    item.code ===
                    "semantic.quality.claim-max-confidence-dominance"
            ),
            true
        );

    }
);


test(
    "keeps small uniform semantic candidate sets valid",
    () => {

        const valid =
            createValidCandidates();

        const result =
            validateSemanticCandidateSet(
                request,
                valid
            );

        assert.equal(
            result.valid,
            true
        );

        assert.deepEqual(
            result.issues,
            []
        );

    }
);
