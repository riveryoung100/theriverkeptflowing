import assert from "node:assert/strict";
import test from "node:test";

import {
    createEmptyKnowledgeGraph,
    createKnowledgeEngine,
    DeterministicKnowledgeEngine
} from "./engine";

import {
    sampleKnowledgeGraph
} from "./fixtures/sampleKnowledge";


test(
    "creates a deterministic knowledge engine",
    () => {

        const engine =
            createKnowledgeEngine();

        assert.ok(engine);

    }
);


test(
    "creates an empty knowledge graph",
    () => {

        const graph =
            createEmptyKnowledgeGraph();

        assert.equal(
            graph.nodes.length,
            0
        );

        assert.equal(
            graph.relations.length,
            0
        );

        assert.equal(
            graph.claims.length,
            0
        );

        assert.equal(
            graph.revisions.length,
            0
        );

    }
);


test(
    "build returns a deterministic graph",
    () => {

        const engine =
            new DeterministicKnowledgeEngine();

        const result =
            engine.build({

                nodes:
                    sampleKnowledgeGraph.nodes,

                relations:
                    sampleKnowledgeGraph.relations,

                claims:
                    sampleKnowledgeGraph.claims,

                revisions:
                    sampleKnowledgeGraph.revisions

            });

        assert.equal(
            result.graph.nodes.length,
            sampleKnowledgeGraph.nodes.length
        );

        assert.equal(
            result.graph.relations.length,
            sampleKnowledgeGraph.relations.length
        );

        assert.equal(
            result.graph.claims.length,
            sampleKnowledgeGraph.claims.length
        );

        assert.equal(
            result.graph.revisions.length,
            sampleKnowledgeGraph.revisions.length
        );

    }
);


test(
    "returns created identifiers",
    () => {

        const engine =
            createKnowledgeEngine();

        const result =
            engine.build({

                nodes:
                    sampleKnowledgeGraph.nodes,

                relations:
                    sampleKnowledgeGraph.relations,

                claims:
                    sampleKnowledgeGraph.claims,

                revisions:
                    sampleKnowledgeGraph.revisions

            });

        assert.equal(
            result.createdNodeIds.length,
            sampleKnowledgeGraph.nodes.length
        );

        assert.equal(
            result.createdRelationIds.length,
            sampleKnowledgeGraph.relations.length
        );

        assert.equal(
            result.createdClaimIds.length,
            sampleKnowledgeGraph.claims.length
        );

    }
);


test(
    "rejects invalid knowledge graphs",
    () => {

        const engine =
            createKnowledgeEngine();

        assert.throws(
            () => {

                engine.build({

                    nodes:
                        [],

                    relations:
                        sampleKnowledgeGraph.relations,

                    claims:
                        sampleKnowledgeGraph.claims,

                    revisions:
                        sampleKnowledgeGraph.revisions

                });

            },
            TypeError
        );

    }
);
