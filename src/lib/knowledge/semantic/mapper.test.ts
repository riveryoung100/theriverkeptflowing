import assert from "node:assert/strict";
import test from "node:test";

import {
    sampleTextAsset,
    sampleTextClassification,
    sampleTextSegment
} from "../../assimilation/fixtures/sampleTextAsset";

import {
    sampleDerivationResult
} from "../../assimilation/derivation/fixtures/sampleDerivation";

import {
    createKnowledgeEngine
} from "../engine";

import {
    isKnowledgeClaimId,
    isKnowledgeNodeId,
    isKnowledgeRelationId
} from "../identifiers";

import type {
    SemanticCandidateSet
} from "./types";

import {
    createKnowledgeRequestFromSemanticCandidates
} from "./mapper";


const candidates:
SemanticCandidateSet = {

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
        },
        {
            subjectKey:
                "derived-knowledge",
            predicate:
                "depends-on",
            objectKey:
                "source-provenance",
            truthStatus:
                "supported",
            confidence:
                0.95
        }
    ]

};


function createInput() {

    return {

        asset:
            sampleTextAsset,

        derivedObject:
            sampleDerivationResult.results[0]!.derivative,

        interpretation: {
            segment:
                sampleTextSegment,
            classification:
                sampleTextClassification
        },

        candidates

    };

}


test(
    "maps validated semantic candidates into a valid knowledge graph request",
    () => {

        const request =
            createKnowledgeRequestFromSemanticCandidates(
                createInput()
            );

        assert.equal(
            request.nodes.length,
            2
        );

        assert.equal(
            request.relations.length,
            1
        );

        assert.equal(
            request.claims.length,
            2
        );

        assert.equal(
            request.revisions.length,
            0
        );

        assert.equal(
            isKnowledgeNodeId(
                request.nodes[0]?.id
            ),
            true
        );

        assert.equal(
            isKnowledgeRelationId(
                request.relations[0]?.id
            ),
            true
        );

        assert.equal(
            isKnowledgeClaimId(
                request.claims[0]?.id
            ),
            true
        );

        assert.equal(
            request.nodes[0]?.status,
            "draft"
        );

        assert.equal(
            request.nodes[0]?.reviewStatus,
            "pending"
        );

        const result =
            createKnowledgeEngine()
                .build(
                    request
                );

        assert.equal(
            result.graph.nodes.length,
            2
        );

        assert.equal(
            result.graph.relations.length,
            1
        );

        assert.equal(
            result.graph.claims.length,
            2
        );

    }
);


test(
    "preserves complete assimilation provenance on every generated record",
    () => {

        const request =
            createKnowledgeRequestFromSemanticCandidates(
                createInput()
            );

        const records = [
            ...request.nodes,
            ...request.relations,
            ...request.claims
        ];

        for (
            const record of
            records
        ) {

            const source =
                record.provenance.sources[0];

            assert.equal(
                source?.assetId,
                sampleTextAsset.id
            );

            assert.equal(
                source?.derivativeId,
                sampleDerivationResult.results[0]!.derivative.id
            );

            assert.deepEqual(
                source?.segmentIds,
                [
                    sampleTextSegment.id
                ]
            );

            assert.deepEqual(
                source?.classificationIds,
                [
                    sampleTextClassification.id
                ]
            );

            assert.deepEqual(
                source?.transformationIds,
                [
                    sampleDerivationResult.results[0]!.derivative.transformationId
                ]
            );

        }

    }
);


test(
    "maps candidate references to generated knowledge node identifiers",
    () => {

        const request =
            createKnowledgeRequestFromSemanticCandidates(
                createInput()
            );

        const sourceProvenance =
            request.nodes.find(
                (node) =>
                    node.canonicalName ===
                    "Source provenance"
            );

        const derivedKnowledge =
            request.nodes.find(
                (node) =>
                    node.canonicalName ===
                    "Derived knowledge"
            );

        assert.equal(
            request.relations[0]?.fromNodeId,
            derivedKnowledge?.id
        );

        assert.equal(
            request.relations[0]?.toNodeId,
            sourceProvenance?.id
        );

        assert.equal(
            request.claims[1]?.subjectNodeId,
            derivedKnowledge?.id
        );

        assert.equal(
            request.claims[1]?.objectNodeId,
            sourceProvenance?.id
        );

    }
);


test(
    "creates deterministic identifiers for equivalent semantic input",
    () => {

        const first =
            createKnowledgeRequestFromSemanticCandidates(
                createInput()
            );

        const second =
            createKnowledgeRequestFromSemanticCandidates(
                createInput()
            );

        assert.deepEqual(
            second,
            first
        );

    }
);


test(
    "fails closed before knowledge construction for invalid semantic candidates",
    () => {

        const input =
            createInput();

        assert.throws(
            () =>
                createKnowledgeRequestFromSemanticCandidates({
                    ...input,
                    candidates: {
                        ...input.candidates,
                        relations: [
                            {
                                fromKey:
                                    "missing",
                                toKey:
                                    "source-provenance",
                                relationType:
                                    "related-to",
                                confidence:
                                    1
                            }
                        ]
                    }
                }),
            /Cannot map invalid semantic candidates/
        );

    }
);


test(
    "fails closed when derivative lineage does not include the interpreted segment",
    () => {

        const input =
            createInput();

        assert.throws(
            () =>
                createKnowledgeRequestFromSemanticCandidates({
                    ...input,
                    derivedObject: {
                        ...input.derivedObject,
                        sourceSegmentIds:
                            []
                    }
                }),
            /reference the interpreted segment/
        );

    }
);

test(
    "keeps relation and claim identifiers stable when candidate arrays are reordered",
    () => {

        const input =
            createInput();

        const expandedCandidates:
        SemanticCandidateSet = {
            ...input.candidates,
            relations: [
                ...input.candidates.relations,
                {
                    fromKey:
                        "source-provenance",
                    toKey:
                        "derived-knowledge",
                    relationType:
                        "explains",
                    confidence:
                        0.8
                }
            ]
        };

        const first =
            createKnowledgeRequestFromSemanticCandidates({
                ...input,
                candidates:
                    expandedCandidates
            });

        const second =
            createKnowledgeRequestFromSemanticCandidates({
                ...input,
                candidates: {
                    ...expandedCandidates,
                    relations:
                        [...expandedCandidates.relations].reverse(),
                    claims:
                        [...expandedCandidates.claims].reverse()
                }
            });

        const relationIdentities =
            (
                request:
                    typeof first
            ) =>
                new Map(
                    request.relations.map(
                        (relation) => [
                            [
                                relation.fromNodeId,
                                relation.toNodeId,
                                relation.relationType
                            ].join("|"),
                            relation.id
                        ]
                    )
                );

        const claimIdentities =
            (
                request:
                    typeof first
            ) =>
                new Map(
                    request.claims.map(
                        (claim) => [
                            [
                                claim.subjectNodeId,
                                claim.predicate,
                                claim.objectNodeId ??
                                    claim.objectValue ??
                                    ""
                            ].join("|"),
                            claim.id
                        ]
                    )
                );

        assert.deepEqual(
            relationIdentities(second),
            relationIdentities(first)
        );

        assert.deepEqual(
            claimIdentities(second),
            claimIdentities(first)
        );

    }
);

test(
    "distinguishes object key and object value in durable claim identifiers",
    () => {

        const input =
            createInput();

        const request =
            createKnowledgeRequestFromSemanticCandidates({
                ...input,
                candidates: {
                    ...input.candidates,
                    claims: [
                        {
                            subjectKey:
                                "derived-knowledge",
                            predicate:
                                "references",
                            objectKey:
                                "source-provenance",
                            truthStatus:
                                "supported",
                            confidence:
                                1
                        },
                        {
                            subjectKey:
                                "derived-knowledge",
                            predicate:
                                "references",
                            objectValue:
                                "source-provenance",
                            truthStatus:
                                "supported",
                            confidence:
                                1
                        }
                    ]
                }
            });

        assert.equal(
            request.claims.length,
            2
        );

        assert.notEqual(
            request.claims[0]?.id,
            request.claims[1]?.id
        );

    }
);
