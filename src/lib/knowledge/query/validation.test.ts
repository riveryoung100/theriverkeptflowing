import assert from "node:assert/strict";
import test from "node:test";

import {
    sampleClaimsQuery,
    sampleNeighborQuery,
    sampleNodeQuery,
    sampleNodesQuery,
    sampleRelationsQuery,
    sampleSearchQuery
} from "./fixtures/sampleQueries";

import {
    validateKnowledgeClaimFilter,
    validateKnowledgeNeighborQuery,
    validateKnowledgeNodeFilter,
    validateKnowledgeQueryRequest,
    validateKnowledgeRelationFilter,
    validateKnowledgeTextSearch
} from "./validation";


test(
    "accepts valid query fixtures",
    () => {

        const requests = [
            sampleNodeQuery,
            sampleNodesQuery,
            sampleRelationsQuery,
            sampleClaimsQuery,
            sampleNeighborQuery,
            sampleSearchQuery
        ];

        for (
            const request of
            requests
        ) {

            const validation =
                validateKnowledgeQueryRequest(
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
    "requires nodeId for node-by-id queries",
    () => {

        const validation =
            validateKnowledgeQueryRequest({
                mode:
                    "node-by-id"
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
                        "knowledge.query.node-id.required"
                    );
                }
            ),
            true
        );

    }
);


test(
    "requires filters for filtered query modes",
    () => {

        const nodeValidation =
            validateKnowledgeQueryRequest({
                mode:
                    "nodes"
            });

        const relationValidation =
            validateKnowledgeQueryRequest({
                mode:
                    "relations"
            });

        const claimValidation =
            validateKnowledgeQueryRequest({
                mode:
                    "claims"
            });

        assert.equal(
            nodeValidation.valid,
            false
        );

        assert.equal(
            relationValidation.valid,
            false
        );

        assert.equal(
            claimValidation.valid,
            false
        );

    }
);


test(
    "requires neighbor configuration",
    () => {

        const validation =
            validateKnowledgeQueryRequest({
                mode:
                    "neighbors"
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
                        "knowledge.query.neighbor-query.required"
                    );
                }
            ),
            true
        );

    }
);


test(
    "requires text search configuration",
    () => {

        const validation =
            validateKnowledgeQueryRequest({
                mode:
                    "search"
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
                        "knowledge.query.text-search.required"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects empty search text",
    () => {

        const validation =
            validateKnowledgeTextSearch({
                text:
                    "   "
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
                        "knowledge.query.search-text.empty"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects invalid neighbor depth",
    () => {

        const validation =
            validateKnowledgeNeighborQuery({

                ...sampleNeighborQuery.neighborQuery!,

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
                        "knowledge.query.maximum-depth.invalid"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects invalid pagination",
    () => {

        const invalidLimit =
            validateKnowledgeQueryRequest({

                ...sampleSearchQuery,

                limit:
                    501

            });

        const invalidOffset =
            validateKnowledgeQueryRequest({

                ...sampleSearchQuery,

                offset:
                    -1

            });

        assert.equal(
            invalidLimit.valid,
            false
        );

        assert.equal(
            invalidOffset.valid,
            false
        );

    }
);


test(
    "rejects duplicate node filter values",
    () => {

        const id =
            sampleNodesQuery
                .nodeFilter!
                .ids![0];

        const validation =
            validateKnowledgeNodeFilter({
                ids: [
                    id,
                    id
                ]
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
                        "knowledge.query.reference.duplicate"
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

        const validation =
            validateKnowledgeRelationFilter({
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
                        "knowledge.query.minimum-confidence.invalid"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects invalid claim confidence",
    () => {

        const validation =
            validateKnowledgeClaimFilter({
                minimumConfidence:
                    -1
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
                        "knowledge.query.minimum-confidence.invalid"
                    );
                }
            ),
            true
        );

    }
);
