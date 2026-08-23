import assert from "node:assert/strict";
import test from "node:test";

import {
    mkdir,
    mkdtemp,
    rm,
    writeFile
} from "node:fs/promises";

import {
    tmpdir
} from "node:os";

import {
    join
} from "node:path";

import {
    createProductionExtractionEngine
} from "./production";

import {
    sampleTextAsset
} from "../fixtures/sampleTextAsset";

import type {
    SourceAsset
} from "../types";


async function withTemporaryStorage(
    run: (rootDirectory: string) => Promise<void>
): Promise<void> {

    const rootDirectory =
        await mkdtemp(
            join(
                tmpdir(),
                "river-production-extraction-"
            )
        );

    try {

        await run(
            rootDirectory
        );

    }
    finally {

        await rm(
            rootDirectory,
            {
                recursive:
                    true,
                force:
                    true
            }
        );

    }

}


test(
    "creates a production extraction engine backed by filesystem raw storage",
    async () => {

        await withTemporaryStorage(
            async rootDirectory => {

                const rawDirectory =
                    join(
                        rootDirectory,
                        "raw"
                    );

                await mkdir(
                    rawDirectory,
                    {
                        recursive:
                            true
                    }
                );

                await writeFile(
                    join(
                        rawDirectory,
                        "production-source.txt"
                    ),
                    "Production raw source content.",
                    "utf8"
                );

                const asset:
                    SourceAsset = {

                        ...sampleTextAsset,

                        storage: {

                            provider:
                                "filesystem",

                            bucket:
                                "raw",

                            key:
                                "production-source.txt",

                            versionId:
                                "v1"

                        }

                    };

                const engine =
                    createProductionExtractionEngine(
                        rootDirectory
                    );

                const result =
                    await engine.extract(
                        asset
                    );

                assert.equal(
                    result.status,
                    "completed"
                );

                assert.equal(
                    result.results.length,
                    1
                );

                assert.equal(
                    result.results[0].extraction.text,
                    "Production raw source content."
                );

                assert.equal(
                    result.results[0].extraction.assetId,
                    asset.id
                );

            }
        );

    }
);


test(
    "production extraction engine fails when filesystem raw source is unavailable",
    async () => {

        await withTemporaryStorage(
            async rootDirectory => {

                const asset:
                    SourceAsset = {

                        ...sampleTextAsset,

                        storage: {

                            provider:
                                "filesystem",

                            bucket:
                                "raw",

                            key:
                                "missing-source.txt",

                            versionId:
                                "v1"

                        }

                    };

                const engine =
                    createProductionExtractionEngine(
                        rootDirectory
                    );

                const result =
                    await engine.extract(
                        asset
                    );

                assert.equal(
                    result.status,
                    "failed"
                );

                assert.deepEqual(
                    result.results,
                    []
                );

            }
        );

    }
);
