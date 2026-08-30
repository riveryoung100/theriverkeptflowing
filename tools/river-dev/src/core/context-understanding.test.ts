import assert from "node:assert/strict";
import test from "node:test";

import {
    analyzeContextArtifacts
} from "./context-understanding";
import type {
    RiverDevContextArtifactBundle,
    RiverDevRepositoryArchitectureMap
} from "../types";


function createBundle(): RiverDevContextArtifactBundle {

    return {
        version: "1.0.0",
        maximumArtifactBytes: 50000,
        maximumTotalBytes: 250000,
        loadedBytes: 120,
        loadedCount: 3,
        truncatedCount: 0,
        omittedCount: 0,
        artifacts: [
            {
                path: "src/context-engine.ts",
                classification: "source",
                reason: "test",
                originalBytes: 50,
                loadedBytes: 50,
                truncated: false,
                content: 'import { fake } from "./fabricated"; export function example() {}'
            },
            {
                path: "src/thing.ts",
                classification: "source",
                reason: "test",
                originalBytes: 50,
                loadedBytes: 50,
                truncated: false,
                content: "export const thing = 1;"
            },
            {
                path: "README.md",
                classification: "documentation",
                reason: "test",
                originalBytes: 20,
                loadedBytes: 20,
                truncated: false,
                content: "# Context documentation"
            }
        ]
    };

}


function createArchitecture(): RiverDevRepositoryArchitectureMap {

    return {
        version: "1.0.0",
        repositoryRoot: "/repo",
        projectName: "fixture",
        branch: "test",
        commit: "abc123",
        discoveredAt: "2026-08-30T00:00:00.000Z",
        modules: [
            {
                path: "src/context-engine.ts",
                classification: "source",
                imports: [
                    {
                        specifier: "./thing",
                        kind: "import",
                        resolvedPath: "src/thing.ts",
                        external: false
                    }
                ],
                exports: ["example"],
                dependencies: ["src/thing.ts"],
                dependents: [],
                entryPoint: true
            },
            {
                path: "src/thing.ts",
                classification: "source",
                imports: [],
                exports: ["thing"],
                dependencies: [],
                dependents: ["src/context-engine.ts"],
                entryPoint: false
            }
        ]
    };

}


test(
    "grounds TypeScript relationships in repository architecture deterministically",
    () => {

        const bundle = createBundle();
        const architecture = createArchitecture();

        const first =
            analyzeContextArtifacts(bundle, architecture);

        const second =
            analyzeContextArtifacts(bundle, architecture);

        assert.deepEqual(first, second);
        assert.equal(first.artifactCount, 3);
        assert.equal(first.metadata.length, 3);

        assert.deepEqual(
            first.relationships,
            [
                {
                    from: "src/context-engine.ts",
                    to: "src/thing.ts",
                    type: "imports",
                    reason: "repository architecture dependency"
                }
            ]
        );

        assert.equal(
            first.relationships.some(
                (relationship) => relationship.to.includes("fabricated")
            ),
            false
        );

    }
);


test(
    "uses architectural dependencies and dependents for relevance",
    () => {

        const result =
            analyzeContextArtifacts(
                createBundle(),
                createArchitecture()
            );

        const contextEngine =
            result.relevance.find(
                (item) => item.path === "src/context-engine.ts"
            );

        const thing =
            result.relevance.find(
                (item) => item.path === "src/thing.ts"
            );

        assert.deepEqual(
            contextEngine?.reasons,
            ["has repository-local dependencies"]
        );

        assert.deepEqual(
            thing?.reasons,
            ["has repository-local dependents"]
        );

        assert.equal(contextEngine?.score, 1);
        assert.equal(thing?.score, 1);

    }
);


test(
    "preserves non-TypeScript artifact metadata without fabricating architecture",
    () => {

        const result =
            analyzeContextArtifacts(
                createBundle(),
                createArchitecture()
            );

        const readmeMetadata =
            result.metadata.find(
                (item) => item.path === "README.md"
            );

        const readmeRelevance =
            result.relevance.find(
                (item) => item.path === "README.md"
            );

        assert.equal(readmeMetadata?.extension, ".md");
        assert.equal(readmeMetadata?.classification, "documentation");
        assert.equal(readmeRelevance?.score, 0);
        assert.deepEqual(readmeRelevance?.reasons, []);
        assert.equal(
            result.relationships.some(
                (relationship) =>
                    relationship.from === "README.md" ||
                    relationship.to === "README.md"
            ),
            false
        );

    }
);
