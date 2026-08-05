import assert from "node:assert/strict";
import test from "node:test";

import {
    sampleKnowledgeClaim,
    sampleKnowledgeGraph,
    sampleKnowledgeNode,
    sampleKnowledgeProvenance,
    sampleKnowledgeRelation,
    sampleKnowledgeRevision
} from "./fixtures/sampleKnowledge";

import type {
    KnowledgeClaim,
    KnowledgeGraph,
    KnowledgeNode,
    KnowledgeRelation,
    KnowledgeRevision
} from "./types";

import {
    validateKnowledgeClaim,
    validateKnowledgeGraph,
    validateKnowledgeNode,
    validateKnowledgeProvenance,
    validateKnowledgeRelation,
    validateKnowledgeRevision
} from "./validation";


test(
    "accepts the complete synthetic knowledge graph",
    () => {

        const validation =
            validateKnowledgeGraph(
                sampleKnowledgeGraph
            );

        assert.equal(
            validation.valid,
            true
        );

        assert.equal(
            validation.issues.length,
            0
        );

    }
);


test(
    "accepts valid knowledge records",
    () => {

        assert.equal(
            validateKnowledgeNode(
                sampleKnowledgeNode
            ).valid,
            true
        );

        assert.equal(
            validateKnowledgeRelation(
                sampleKnowledgeRelation
            ).valid,
            true
        );

        assert.equal(
            validateKnowledgeClaim(
                sampleKnowledgeClaim
            ).valid,
            true
        );

        assert.equal(
            validateKnowledgeRevision(
                sampleKnowledgeRevision
            ).valid,
            true
        );

        assert.equal(
            validateKnowledgeProvenance(
                sampleKnowledgeProvenance
            ).valid,
            true
        );

    }
);


test(
    "rejects empty knowledge provenance",
    () => {

        const validation =
            validateKnowledgeProvenance({

                ...sampleKnowledgeProvenance,

                sources:
                    []

            });

        assert.equal(
            validation.valid,
            false
        );

        assert.equal(
            validation.issues.some(
                (item) => {
                    return (
                        item.code ===
                        "knowledge.provenance.sources.empty"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects an empty canonical node name",
    () => {

        const invalidNode: KnowledgeNode = {

            ...sampleKnowledgeNode,

            canonicalName:
                "   "

        };

        const validation =
            validateKnowledgeNode(
                invalidNode
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.equal(
            validation.issues.some(
                (item) => {
                    return (
                        item.code ===
                        "knowledge.node.name.empty"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects duplicate node taxonomy values",
    () => {

        const topicKey =
            sampleKnowledgeNode
                .topicKeys[0];

        const invalidNode: KnowledgeNode = {

            ...sampleKnowledgeNode,

            topicKeys: [
                topicKey,
                topicKey
            ]

        };

        const validation =
            validateKnowledgeNode(
                invalidNode
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.equal(
            validation.issues.some(
                (item) => {
                    return (
                        item.code ===
                        "knowledge.reference.duplicate"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects a self-referencing relation",
    () => {

        const invalidRelation:
        KnowledgeRelation = {

            ...sampleKnowledgeRelation,

            toNodeId:
                sampleKnowledgeRelation
                    .fromNodeId

        };

        const validation =
            validateKnowledgeRelation(
                invalidRelation
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.equal(
            validation.issues.some(
                (item) => {
                    return (
                        item.code ===
                        "knowledge.relation.self-reference"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects invalid relation confidence",
    () => {

        const invalidRelation:
        KnowledgeRelation = {

            ...sampleKnowledgeRelation,

            confidence:
                2

        };

        const validation =
            validateKnowledgeRelation(
                invalidRelation
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.equal(
            validation.issues.some(
                (item) => {
                    return (
                        item.code ===
                        "knowledge.relation.confidence.invalid"
                    );
                }
            ),
            true
        );

    }
);


test(
    "requires exactly one claim object",
    () => {

        const invalidClaim:
        KnowledgeClaim = {

            ...sampleKnowledgeClaim,

            objectNodeId:
                undefined,

            objectValue:
                undefined

        };

        const validation =
            validateKnowledgeClaim(
                invalidClaim
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.equal(
            validation.issues.some(
                (item) => {
                    return (
                        item.code ===
                        "knowledge.claim.object.invalid"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects claims with both object forms",
    () => {

        const invalidClaim:
        KnowledgeClaim = {

            ...sampleKnowledgeClaim,

            objectValue:
                "Knowledge Lineage"

        };

        const validation =
            validateKnowledgeClaim(
                invalidClaim
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.equal(
            validation.issues.some(
                (item) => {
                    return (
                        item.code ===
                        "knowledge.claim.object.invalid"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects invalid revision version sequences",
    () => {

        const invalidRevision:
        KnowledgeRevision = {

            ...sampleKnowledgeRevision,

            nextVersion:
                4

        };

        const validation =
            validateKnowledgeRevision(
                invalidRevision
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.equal(
            validation.issues.some(
                (item) => {
                    return (
                        item.code ===
                        "knowledge.revision.version-sequence.invalid"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects graph relations with missing nodes",
    () => {

        const invalidGraph:
        KnowledgeGraph = {

            ...sampleKnowledgeGraph,

            nodes: [
                sampleKnowledgeGraph.nodes[0]
            ]

        };

        const validation =
            validateKnowledgeGraph(
                invalidGraph
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.equal(
            validation.issues.some(
                (item) => {
                    return (
                        item.code ===
                        "knowledge.graph.relation-target.missing"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects graph claims with missing subject nodes",
    () => {

        const invalidGraph:
        KnowledgeGraph = {

            ...sampleKnowledgeGraph,

            nodes:
                [],

            relations:
                []

        };

        const validation =
            validateKnowledgeGraph(
                invalidGraph
            );

        assert.equal(
            validation.valid,
            false
        );

        assert.equal(
            validation.issues.some(
                (item) => {
                    return (
                        item.code ===
                        "knowledge.graph.claim-subject.missing"
                    );
                }
            ),
            true
        );

    }
);
