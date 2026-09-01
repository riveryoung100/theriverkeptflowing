import assert from "node:assert/strict";
import {
    mkdtemp,
    readFile,
    rm,
    writeFile
} from "node:fs/promises";
import {
    tmpdir
} from "node:os";
import {
    join
} from "node:path";
import test from "node:test";

import {
    sampleKnowledgeGraph
} from "../fixtures/sampleKnowledge";

import type {
    KnowledgeGraph
} from "../types";

import {
    createFilesystemKnowledgeGraphPersistence
} from "./filesystem";


async function withPersistence(
    run: (
        rootDirectory: string,
        persistence: ReturnType<
            typeof createFilesystemKnowledgeGraphPersistence
        >
    ) => Promise<void>
): Promise<void> {

    const rootDirectory =
        await mkdtemp(
            join(
                tmpdir(),
                "river-knowledge-002-"
            )
        );

    const persistence =
        createFilesystemKnowledgeGraphPersistence({
            rootDirectory
        });

    try {

        await run(
            rootDirectory,
            persistence
        );

    } finally {

        await rm(
            rootDirectory,
            {
                recursive: true,
                force: true
            }
        );

    }

}


test(
    "persists and retrieves the complete knowledge graph deterministically",
    async () => {

        await withPersistence(
            async (
                rootDirectory,
                persistence
            ) => {

                await persistence.persist(
                    "sample-graph",
                    sampleKnowledgeGraph
                );

                const retrieved =
                    await persistence.retrieve(
                        "sample-graph"
                    );

                assert.deepEqual(
                    retrieved,
                    sampleKnowledgeGraph
                );

                assert.deepEqual(
                    retrieved.nodes,
                    sampleKnowledgeGraph.nodes
                );

                assert.deepEqual(
                    retrieved.relations,
                    sampleKnowledgeGraph.relations
                );

                assert.deepEqual(
                    retrieved.claims,
                    sampleKnowledgeGraph.claims
                );

                assert.deepEqual(
                    retrieved.revisions,
                    sampleKnowledgeGraph.revisions
                );

                assert.deepEqual(
                    retrieved.nodes[0]?.provenance,
                    sampleKnowledgeGraph.nodes[0]?.provenance
                );

                const serialized =
                    await readFile(
                        join(
                            rootDirectory,
                            "sample-graph.json"
                        ),
                        "utf8"
                    );

                assert.deepEqual(
                    JSON.parse(
                        serialized
                    ),
                    sampleKnowledgeGraph
                );

            }
        );

    }
);


test(
    "rejects unsafe or empty persistence keys",
    async () => {

        await withPersistence(
            async (
                _rootDirectory,
                persistence
            ) => {

                for (
                    const key of [
                        "",
                        " ",
                        ".",
                        "..",
                        "../escape",
                        "..\\escape",
                        "nested/graph",
                        "nested\\graph"
                    ]
                ) {

                    await assert.rejects(
                        persistence.persist(
                            key,
                            sampleKnowledgeGraph
                        ),
                        /persistence key is invalid/
                    );

                }

            }
        );

    }
);


test(
    "fails closed when the durable graph is missing",
    async () => {

        await withPersistence(
            async (
                _rootDirectory,
                persistence
            ) => {

                await assert.rejects(
                    persistence.retrieve(
                        "missing"
                    ),
                    /could not be retrieved/
                );

            }
        );

    }
);


test(
    "fails closed on malformed durable JSON",
    async () => {

        await withPersistence(
            async (
                rootDirectory,
                persistence
            ) => {

                await writeFile(
                    join(
                        rootDirectory,
                        "malformed.json"
                    ),
                    "{not-json",
                    "utf8"
                );

                await assert.rejects(
                    persistence.retrieve(
                        "malformed"
                    ),
                    /malformed JSON/
                );

            }
        );

    }
);


test(
    "fails closed when the durable graph lacks the required aggregate shape",
    async () => {

        await withPersistence(
            async (
                rootDirectory,
                persistence
            ) => {

                await writeFile(
                    join(
                        rootDirectory,
                        "structural.json"
                    ),
                    JSON.stringify({
                        nodes: []
                    }),
                    "utf8"
                );

                await assert.rejects(
                    persistence.retrieve(
                        "structural"
                    ),
                    /invalid structure/
                );

            }
        );

    }
);


test(
    "delegates semantic and cross-record rejection to authoritative knowledge validation",
    async () => {

        await withPersistence(
            async (
                rootDirectory,
                persistence
            ) => {

                const invalidGraph:
                    KnowledgeGraph = {
                        ...sampleKnowledgeGraph,
                        relations: [
                            {
                                ...sampleKnowledgeGraph.relations[0]!,
                                fromNodeId:
                                    "knowledge:99999999-9999-4999-8999-999999999999"
                            }
                        ]
                    };

                await writeFile(
                    join(
                        rootDirectory,
                        "invalid.json"
                    ),
                    JSON.stringify(
                        invalidGraph
                    ),
                    "utf8"
                );

                await assert.rejects(
                    persistence.retrieve(
                        "invalid"
                    ),
                    /Knowledge graph validation failed/
                );

            }
        );

    }
);


test(
    "rejects invalid knowledge graphs before durable persistence",
    async () => {

        await withPersistence(
            async (
                _rootDirectory,
                persistence
            ) => {

                const invalidGraph:
                    KnowledgeGraph = {
                        ...sampleKnowledgeGraph,
                        nodes: []
                    };

                await assert.rejects(
                    persistence.persist(
                        "invalid-write",
                        invalidGraph
                    ),
                    /Knowledge graph validation failed/
                );

            }
        );

    }
);
