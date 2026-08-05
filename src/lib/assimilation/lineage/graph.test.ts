import assert from "node:assert/strict";
import test from "node:test";

import {
    addEdge,
    addNode,
    createLineageGraph,
    findChildren,
    findParents,
    hasCycle
} from "./graph";

import {
    validateLineageGraph
} from "./validation";

import {
    sampleLineageGraph
} from "./fixtures/sampleLineage";

import {
    sampleTextAsset,
    sampleTextExtraction,
    sampleTextClassification
} from "../fixtures/sampleTextAsset";

test(
    "creates an empty lineage graph",
    () => {

        const graph =
            createLineageGraph();

        assert.equal(
            graph.nodes.length,
            0
        );

        assert.equal(
            graph.edges.length,
            0
        );

    }
);

test(
    "adds lineage nodes",
    () => {

        let graph =
            createLineageGraph();

        graph =
            addNode(
                graph,
                {
                    id:
                        sampleTextAsset.id,

                    type:
                        "asset"
                }
            );

        assert.equal(
            graph.nodes.length,
            1
        );

    }
);

test(
    "adds lineage edges",
    () => {

        let graph =
            createLineageGraph();

        graph =
            addNode(
                graph,
                {
                    id:
                        sampleTextAsset.id,

                    type:
                        "asset"
                }
            );

        graph =
            addNode(
                graph,
                {
                    id:
                        sampleTextExtraction.id,

                    type:
                        "extraction"
                }
            );

        graph =
            addEdge(
                graph,
                {
                    from:
                        sampleTextAsset.id,

                    to:
                        sampleTextExtraction.id,

                    relationship:
                        "extracted-from"
                }
            );

        assert.equal(
            graph.edges.length,
            1
        );

    }
);

test(
    "finds parents",
    () => {

        const result =
            findParents(
                sampleLineageGraph,
                sampleTextClassification.id
            );

        assert.equal(
            result.visited.length > 0,
            true
        );

    }
);

test(
    "finds children",
    () => {

        const result =
            findChildren(
                sampleLineageGraph,
                sampleTextAsset.id
            );

        assert.equal(
            result.visited.length > 0,
            true
        );

    }
);

test(
    "validates a correct lineage graph",
    () => {

        const validation =
            validateLineageGraph(
                sampleLineageGraph
            );

        assert.equal(
            validation.valid,
            true
        );

    }
);

test(
    "rejects missing nodes",
    () => {

        const validation =
            validateLineageGraph({

                nodes: [],

                edges: sampleLineageGraph.edges

            });

        assert.equal(
            validation.valid,
            false
        );

    }
);

test(
    "rejects self-referencing edges",
    () => {

        const validation =
            validateLineageGraph({

                nodes: [
                    {
                        id:
                            sampleTextAsset.id,

                        type:
                            "asset"
                    }
                ],

                edges: [
                    {
                        from:
                            sampleTextAsset.id,

                        to:
                            sampleTextAsset.id,

                        relationship:
                            "derived-from"
                    }
                ]

            });

        assert.equal(
            validation.valid,
            false
        );

    }
);



test(
    "recursively traverses descendants",
    () => {

        const result =
            findChildren(
                sampleLineageGraph,
                sampleTextAsset.id
            );

        assert.equal(
            result.visited.includes(
                sampleTextClassification.id
            ),
            true
        );

    }
);

test(
    "recursively traverses ancestors",
    () => {

        const result =
            findParents(
                sampleLineageGraph,
                sampleTextClassification.id
            );

        assert.equal(
            result.visited.includes(
                sampleTextAsset.id
            ),
            true
        );

    }
);

test(
    "detects lineage cycles",
    () => {

        const cyclic: typeof sampleLineageGraph = {

            nodes:
                sampleLineageGraph.nodes,

            edges: [

                ...sampleLineageGraph.edges,

                {
                    from:
                        sampleTextClassification.id,

                    to:
                        sampleTextAsset.id,

                    relationship:
                        "derived-from" as const
                }

            ]

        };

        assert.equal(
            hasCycle(
                cyclic
            ),
            true
        );

    }
);

test(
    "does not report cycles for valid graphs",
    () => {

        assert.equal(
            hasCycle(
                sampleLineageGraph
            ),
            false
        );

    }
);



