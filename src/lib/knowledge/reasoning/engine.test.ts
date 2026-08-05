import assert from "node:assert/strict";
import test from "node:test";

import {
    createKnowledgeReasoningEngine
} from "./engine";

import {
    sampleKnowledgeGraph
} from "../fixtures/sampleKnowledge";

import {
    sampleSupportPathRequest,
    sampleContradictionRequest,
    sampleClaimEvidenceRequest,
    sampleSharedNeighborsRequest,
    sampleTransitiveRelationsRequest
} from "./fixtures/sampleReasoning";


test(
    "reasons over support paths",
    () => {

        const engine =
            createKnowledgeReasoningEngine();

        const result =
            engine.reason(
                sampleKnowledgeGraph,
                sampleSupportPathRequest
            );

        assert.equal(
            result.status,
            "completed"
        );

    }
);


test(
    "checks contradictions",
    () => {

        const engine =
            createKnowledgeReasoningEngine();

        const result =
            engine.reason(
                sampleKnowledgeGraph,
                sampleContradictionRequest
            );

        assert.equal(
            result.status,
            "completed"
        );

    }
);


test(
    "returns claim evidence",
    () => {

        const engine =
            createKnowledgeReasoningEngine();

        const result =
            engine.reason(
                sampleKnowledgeGraph,
                sampleClaimEvidenceRequest
            );

        assert.ok(
            result.evidence.claims.length >= 1
        );

    }
);


test(
    "finds shared neighbors",
    () => {

        const engine =
            createKnowledgeReasoningEngine();

        const result =
            engine.reason(
                sampleKnowledgeGraph,
                sampleSharedNeighborsRequest
            );

        assert.equal(
            result.status,
            "completed"
        );

    }
);


test(
    "builds transitive reasoning",
    () => {

        const engine =
            createKnowledgeReasoningEngine();

        const result =
            engine.reason(
                sampleKnowledgeGraph,
                sampleTransitiveRelationsRequest
            );

        assert.equal(
            result.status,
            "completed"
        );

    }
);


test(
    "returns deterministic conclusions",
    () => {

        const engine =
            createKnowledgeReasoningEngine();

        const first =
            engine.reason(
                sampleKnowledgeGraph,
                sampleSupportPathRequest
            );

        const second =
            engine.reason(
                sampleKnowledgeGraph,
                sampleSupportPathRequest
            );

        assert.deepEqual(
            first,
            second
        );

    }
);
