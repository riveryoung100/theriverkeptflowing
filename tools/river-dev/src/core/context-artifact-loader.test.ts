import assert from "node:assert/strict";
import test from "node:test";

import {
    mkdtemp,
    writeFile
} from "node:fs/promises";

import {
    tmpdir
} from "node:os";

import {
    join
} from "node:path";

import {
    loadContextArtifacts
} from "./context-artifact-loader";


test(
    "loads deterministic text artifacts",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-context-"
                )
            );


        await writeFile(
            join(
                root,
                "example.ts"
            ),
            "export const value = 1;"
        );


        const result =
            await loadContextArtifacts(
                root,
                [
                    {
                        path:
                            "example.ts",
                        kind:
                            "file",
                        classification:
                            "source",
                        reason:
                            "test"
                    }
                ]
            );


        assert.equal(
            result.loadedCount,
            1
        );


        assert.equal(
            result.omittedCount,
            0
        );


        assert.match(
            result.artifacts[0]!.content,
            /export const value/
        );

    }
);



test(
    "blocks protected paths",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-context-"
                )
            );


        await writeFile(
            join(
                root,
                ".env"
            ),
            "SECRET=value"
        );


        const result =
            await loadContextArtifacts(
                root,
                [
                    {
                        path:
                            ".env",
                        kind:
                            "file",
                        classification:
                            "protected",
                        reason:
                            "secret"
                    }
                ]
            );


        assert.equal(
            result.loadedCount,
            0
        );


        assert.equal(
            result.omittedCount,
            1
        );

    }
);



test(
    "truncates oversized artifacts",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-context-"
                )
            );


        await writeFile(
            join(
                root,
                "large.txt"
            ),
            "a".repeat(
                100000
            )
        );


        const result =
            await loadContextArtifacts(
                root,
                [
                    {
                        path:
                            "large.txt",
                        kind:
                            "file",
                        classification:
                            "documentation",
                        reason:
                            "large-file"
                    }
                ]
            );


        assert.equal(
            result.loadedCount,
            1
        );


        assert.equal(
            result.truncatedCount,
            1
        );


        assert.ok(
            result.artifacts[0]!.loadedBytes <
            result.artifacts[0]!.originalBytes
        );

    }
);

