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
    "preserves caller priority when the total byte budget is exhausted",
    async () => {

        const root =
            await mkdtemp(
                join(
                    tmpdir(),
                    "river-dev-context-priority-"
                )
            );


        await writeFile(
            join(
                root,
                "z-priority.txt"
            ),
            "z".repeat(
                200000
            )
        );


        await writeFile(
            join(
                root,
                "a-lower-priority.txt"
            ),
            "a".repeat(
                200000
            )
        );


        const result =
            await loadContextArtifacts(
                root,
                [
                    {
                        path:
                            "z-priority.txt",
                        kind:
                            "file",
                        classification:
                            "source",
                        reason:
                            "approved-modifiable-scope"
                    },
                    {
                        path:
                            "a-lower-priority.txt",
                        kind:
                            "file",
                        classification:
                            "source",
                        reason:
                            "river-dev-system"
                    }
                ]
            );


        assert.equal(
            result.loadedCount,
            2
        );


        assert.equal(
            result.artifacts[0]!.path,
            "z-priority.txt"
        );


        assert.equal(
            result.artifacts[0]!.reason,
            "approved-modifiable-scope"
        );


        assert.equal(
            result.artifacts[1]!.path,
            "a-lower-priority.txt"
        );


        assert.ok(
            result.artifacts[1]!.loadedBytes <
            result.artifacts[1]!.originalBytes
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

