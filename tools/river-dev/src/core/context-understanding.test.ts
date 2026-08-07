import assert from "node:assert/strict";
import test from "node:test";

import {
analyzeContextArtifacts
} from "./context-understanding";

test(
"builds artifact metadata and relationships deterministically",
() => {

    const result =
        analyzeContextArtifacts(
            {
                version:
                    "1.0.0",

                maximumArtifactBytes:
                    50000,

                maximumTotalBytes:
                    250000,

                loadedBytes:
                    100,

                loadedCount:
                    2,

                truncatedCount:
                    0,

                omittedCount:
                    0,

                artifacts: [
                    {
                        path:
                            "src/context-engine.ts",

                        classification:
                            "source",

                        reason:
                            "test",

                        originalBytes:
                            50,

                        loadedBytes:
                            50,

                        truncated:
                            false,

                        content:
                            `
                            import { thing } from "./thing";
                            export function example() {}
                            `
                    },

                    {
                        path:
                            "src/thing.ts",

                        classification:
                            "source",

                        reason:
                            "test",

                        originalBytes:
                            20,

                        loadedBytes:
                            20,

                        truncated:
                            false,

                        content:
                            `
                            export const thing = 1;
                            `
                    }
                ]
            }
        );


    assert.equal(
        result.artifactCount,
        2
    );


    assert.equal(
        result.metadata.length,
        2
    );


    assert.equal(
        result.relationships.length,
        1
    );


    assert.equal(
        result.relationships[0]!.type,
        "imports"
    );


    assert.ok(
        result.relevance.some(
            (item) =>
                item.path ===
                "src/context-engine.ts"
        )
    );

});


test(
"produces higher relevance for context artifacts",
() => {

    const result =
        analyzeContextArtifacts(
            {
                version:
                    "1.0.0",

                maximumArtifactBytes:
                    50000,

                maximumTotalBytes:
                    250000,

                loadedBytes:
                    20,

                loadedCount:
                    1,

                truncatedCount:
                    0,

                omittedCount:
                    0,

                artifacts: [
                    {
                        path:
                            "context-engine.ts",

                        classification:
                            "source",

                        reason:
                            "test",

                        originalBytes:
                            20,

                        loadedBytes:
                            20,

                        truncated:
                            false,

                        content:
                            "export const value = 1;"
                    }
                ]
            }
        );


    assert.ok(
        result.relevance[0]!.score > 0
    );


    assert.ok(
        result.relevance[0]!.reasons.length > 0
    );

});

