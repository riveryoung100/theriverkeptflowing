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