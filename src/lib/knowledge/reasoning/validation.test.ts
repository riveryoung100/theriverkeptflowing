import assert from "node:assert/strict";
import test from "node:test";

import {
    sampleKnowledgeGraph
} from "../fixtures/sampleKnowledge";

import {
    sampleClaimEvidenceRequest,
    sampleContradictionRequest,
    sampleReasoningRequests,
    sampleSharedNeighborsRequest,
    sampleSupportPathRequest,
    sampleTransitiveRelationsRequest
} from "./fixtures/sampleReasoning";

import {
    validateKnowledgeReasoningExecution,
    validateKnowledgeReasoningGraphReferences,
    validateKnowledgeReasoningRequest
} from "./validation";


test(
    "accepts all valid reasoning fixtures",
    () => {

        for (
            const request of
            sampleReasoningRequests
        ) {

            const validation =
                validateKnowledgeReasoningExecution(
                    sampleKnowledgeGraph,
                    request
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

    }
);


test(
    "requires source and target nodes for path reasoning",
    () => {

        const validation =
            validateKnowledgeReasoningRequest({
                mode:
                    "support-path"
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
                        "knowledge.reasoning.source-node-id.required"
                    );
                }
            ),
            true
        );

        assert.equal(
            validation.issues.some(
                (item) => {
                    return (
                        item.code ===
                        "knowledge.reasoning.target-node-id.required"
                    );
                }
            ),
            true
        );

    }
);


test(
    "requires source and target nodes for shared-neighbor reasoning",
    () => {

        const validation =
            validateKnowledgeReasoningRequest({
                mode:
                    "shared-neighbors"
            });

        assert.equal(
            validation.valid,
            false
        );

    }
);


test(
    "requires source and target nodes for transitive reasoning",
    () => {

        const validation =
            validateKnowledgeReasoningRequest({
                mode:
                    "transitive-relations"
            });

        assert.equal(
            validation.valid,
            false
        );

    }
);


test(
    "requires a contradiction subject",
    () => {

        const validation =
            validateKnowledgeReasoningRequest({
                mode:
                    "contradiction-check"
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
                        "knowledge.reasoning.contradiction-subject.required"
                    );
                }
            ),
            true
        );

    }
);


test(
    "requires claimId for claim evidence reasoning",
    () => {

        const validation =
            validateKnowledgeReasoningRequest({
                mode:
                    "claim-evidence"
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
                        "knowledge.reasoning.claim-id.required"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects identical source and target nodes",
    () => {

        const sourceNodeId =
            sampleSupportPathRequest
                .sourceNodeId!;

        const validation =
            validateKnowledgeReasoningRequest({

                ...sampleSupportPathRequest,

                targetNodeId:
                    sourceNodeId

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
                        "knowledge.reasoning.nodes.identical"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects invalid maximum depth",
    () => {

        const validation =
            validateKnowledgeReasoningRequest({

                ...sampleSharedNeighborsRequest,

                maximumDepth:
                    0

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
                        "knowledge.reasoning.maximum-depth.invalid"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects invalid minimum confidence",
    () => {

        const validation =
            validateKnowledgeReasoningRequest({

                ...sampleContradictionRequest,

                minimumConfidence:
                    2

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
                        "knowledge.reasoning.minimum-confidence.invalid"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects missing source graph references",
    () => {

        const validation =
            validateKnowledgeReasoningGraphReferences(
                {
                    ...sampleKnowledgeGraph,
                    nodes: [
                        sampleKnowledgeGraph.nodes[1]
                    ]
                },
                sampleSupportPathRequest
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
                        "knowledge.reasoning.source-node.missing"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects missing target graph references",
    () => {

        const validation =
            validateKnowledgeReasoningGraphReferences(
                {
                    ...sampleKnowledgeGraph,
                    nodes: [
                        sampleKnowledgeGraph.nodes[0]
                    ]
                },
                sampleTransitiveRelationsRequest
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
                        "knowledge.reasoning.target-node.missing"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects missing claim graph references",
    () => {

        const validation =
            validateKnowledgeReasoningGraphReferences(
                {
                    ...sampleKnowledgeGraph,
                    claims: []
                },
                sampleClaimEvidenceRequest
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
                        "knowledge.reasoning.claim.missing"
                    );
                }
            ),
            true
        );

    }
);
