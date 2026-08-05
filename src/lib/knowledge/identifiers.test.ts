import assert from "node:assert/strict";
import test from "node:test";

import {
    assertKnowledgeClaimId,
    assertKnowledgeNodeId,
    assertKnowledgeRecordId,
    assertKnowledgeRelationId,
    assertKnowledgeRevisionId,
    createKnowledgeClaimId,
    createKnowledgeNodeId,
    createKnowledgeRecordId,
    createKnowledgeRelationId,
    createKnowledgeRevisionId,
    getKnowledgeIdPrefix,
    getKnowledgeUuid,
    isKnowledgeClaimId,
    isKnowledgeNodeId,
    isKnowledgeRecordId,
    isKnowledgeRelationId,
    isKnowledgeRevisionId
} from "./identifiers";


const FIXED_NODE_ID =
    "knowledge:11111111-1111-4111-8111-111111111111";

const FIXED_RELATION_ID =
    "relation:22222222-2222-4222-8222-222222222222";

const FIXED_CLAIM_ID =
    "claim:33333333-3333-4333-8333-333333333333";

const FIXED_REVISION_ID =
    "revision:44444444-4444-4444-8444-444444444444";


test(
    "recognizes valid knowledge identifiers",
    () => {

        assert.equal(
            isKnowledgeRecordId(
                FIXED_NODE_ID
            ),
            true
        );

        assert.equal(
            isKnowledgeNodeId(
                FIXED_NODE_ID
            ),
            true
        );

        assert.equal(
            isKnowledgeRelationId(
                FIXED_RELATION_ID
            ),
            true
        );

        assert.equal(
            isKnowledgeClaimId(
                FIXED_CLAIM_ID
            ),
            true
        );

        assert.equal(
            isKnowledgeRevisionId(
                FIXED_REVISION_ID
            ),
            true
        );

    }
);


test(
    "rejects malformed and mismatched knowledge identifiers",
    () => {

        assert.equal(
            isKnowledgeRecordId(
                "knowledge:not-a-uuid"
            ),
            false
        );

        assert.equal(
            isKnowledgeNodeId(
                FIXED_RELATION_ID
            ),
            false
        );

        assert.equal(
            isKnowledgeRecordId(
                27
            ),
            false
        );

    }
);


test(
    "parses knowledge prefixes and UUID values",
    () => {

        assert.equal(
            getKnowledgeIdPrefix(
                FIXED_NODE_ID
            ),
            "knowledge"
        );

        assert.equal(
            getKnowledgeUuid(
                FIXED_NODE_ID
            ),
            "11111111-1111-4111-8111-111111111111"
        );

        assert.equal(
            getKnowledgeIdPrefix(
                "invalid"
            ),
            null
        );

        assert.equal(
            getKnowledgeUuid(
                "invalid"
            ),
            null
        );

    }
);


test(
    "creates valid identifiers for every knowledge record type",
    () => {

        const generalNodeId =
            createKnowledgeRecordId(
                "knowledge"
            );

        const nodeId =
            createKnowledgeNodeId();

        const relationId =
            createKnowledgeRelationId();

        const claimId =
            createKnowledgeClaimId();

        const revisionId =
            createKnowledgeRevisionId();

        assert.equal(
            isKnowledgeNodeId(
                generalNodeId
            ),
            true
        );

        assert.equal(
            isKnowledgeNodeId(
                nodeId
            ),
            true
        );

        assert.equal(
            isKnowledgeRelationId(
                relationId
            ),
            true
        );

        assert.equal(
            isKnowledgeClaimId(
                claimId
            ),
            true
        );

        assert.equal(
            isKnowledgeRevisionId(
                revisionId
            ),
            true
        );

    }
);


test(
    "knowledge assertions accept valid values",
    () => {

        assert.doesNotThrow(
            () => {
                assertKnowledgeRecordId(
                    FIXED_NODE_ID
                );
            }
        );

        assert.doesNotThrow(
            () => {
                assertKnowledgeNodeId(
                    FIXED_NODE_ID
                );
            }
        );

        assert.doesNotThrow(
            () => {
                assertKnowledgeRelationId(
                    FIXED_RELATION_ID
                );
            }
        );

        assert.doesNotThrow(
            () => {
                assertKnowledgeClaimId(
                    FIXED_CLAIM_ID
                );
            }
        );

        assert.doesNotThrow(
            () => {
                assertKnowledgeRevisionId(
                    FIXED_REVISION_ID
                );
            }
        );

    }
);


test(
    "knowledge assertions reject invalid values",
    () => {

        assert.throws(
            () => {
                assertKnowledgeNodeId(
                    FIXED_RELATION_ID
                );
            },
            TypeError
        );

        assert.throws(
            () => {
                assertKnowledgeClaimId(
                    "claim:not-a-uuid"
                );
            },
            TypeError
        );

        assert.throws(
            () => {
                assertKnowledgeRecordId(
                    null
                );
            },
            TypeError
        );

    }
);
