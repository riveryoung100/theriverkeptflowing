import assert from "node:assert/strict";
import test from "node:test";

import {
    createKnowledgeQueryEngine
} from "./engine";

import {
    sampleKnowledgeGraph
} from "../fixtures/sampleKnowledge";

import {
    sampleNodeQuery,
    sampleNodesQuery,
    sampleRelationsQuery,
    sampleClaimsQuery,
    sampleNeighborQuery,
    sampleSearchQuery
} from "./fixtures/sampleQueries";


test(
    "queries node by id",
    () => {

        const engine =
            createKnowledgeQueryEngine();

        const result =
            engine.query(
                sampleKnowledgeGraph,
                sampleNodeQuery
            );

        assert.equal(
            result.nodes.length,
            1
        );

    }
);


test(
    "queries nodes",
    () => {

        const engine =
            createKnowledgeQueryEngine();

        const result =
            engine.query(
                sampleKnowledgeGraph,
                sampleNodesQuery
            );

        assert.ok(
            result.nodes.length >= 1
        );

    }
);


test(
    "queries relations",
    () => {

        const engine =
            createKnowledgeQueryEngine();

        const result =
            engine.query(
                sampleKnowledgeGraph,
                sampleRelationsQuery
            );

        assert.ok(
            result.relations.length >= 1
        );

    }
);


test(
    "queries claims",
    () => {

        const engine =
            createKnowledgeQueryEngine();

        const result =
            engine.query(
                sampleKnowledgeGraph,
                sampleClaimsQuery
            );

        assert.ok(
            result.claims.length >= 1
        );

    }
);


test(
    "queries neighbors",
    () => {

        const engine =
            createKnowledgeQueryEngine();

        const result =
            engine.query(
                sampleKnowledgeGraph,
                sampleNeighborQuery
            );

        assert.ok(
            result.nodes.length >= 1
        );

    }
);


test(
    "queries search",
    () => {

        const engine =
            createKnowledgeQueryEngine();

        const result =
            engine.query(
                sampleKnowledgeGraph,
                sampleSearchQuery
            );

        assert.ok(
            result.nodes.length >= 1
        );

    }
);


test(
    "returns totals",
    () => {

        const engine =
            createKnowledgeQueryEngine();

        const result =
            engine.query(
                sampleKnowledgeGraph,
                sampleSearchQuery
            );

        assert.ok(
            result.totalNodes >=
            result.nodes.length
        );

        assert.ok(
            result.totalRelations >=
            result.relations.length
        );

        assert.ok(
            result.totalClaims >=
            result.claims.length
        );

    }
);
