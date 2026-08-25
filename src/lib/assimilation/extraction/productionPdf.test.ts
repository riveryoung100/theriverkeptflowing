import assert from "node:assert/strict";
import test from "node:test";

import {
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
    sampleTextAsset
} from "../fixtures/sampleTextAsset";

import type {
    SourceAsset
} from "../types";

import {
    createSamplePdfBytes
} from "./fixtures/samplePdfBytes";

import {
    createProductionExtractionEngine
} from "./production";


async function withTemporaryStorage(
    run:
        (
            rootDirectory:
                string
        ) => Promise<void>
): Promise<void> {

    const rootDirectory =
        await mkdtemp(
            join(
                tmpdir(),
                "river-production-pdf-extraction-"
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


function createPdfAsset(
    key:
        string
): SourceAsset {

    return {
        ...sampleTextAsset,

        mimeType:
            "application/pdf",

        storage: {
            provider:
                "filesystem",

            key,

            versionId:
                "1"
        }
    };

}


test(
    "production extraction engine extracts filesystem-backed PDF text",
    async () => {

        await withTemporaryStorage(
            async (
                rootDirectory
            ) => {

                const key =
                    "river-guide.pdf";

                await writeFile(
                    join(
                        rootDirectory,
                        key
                    ),
                    createSamplePdfBytes(
                        "Production PDF Extraction"
                    )
                );

                const engine =
                    createProductionExtractionEngine(
                        rootDirectory
                    );

                const result =
                    await engine.extract(
                        createPdfAsset(
                            key
                        )
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
                    result.results[0]
                        ?.extraction
                        .text,
                    "Production PDF Extraction"
                );

                assert.equal(
                    result.results[0]
                        ?.extraction
                        .extractorVersion,
                    "pdfjs-text-extractor-v1"
                );

            }
        );

    }
);


test(
    "production extraction engine converts malformed PDF bytes into extraction failure",
    async () => {

        await withTemporaryStorage(
            async (
                rootDirectory
            ) => {

                const key =
                    "malformed.pdf";

                await writeFile(
                    join(
                        rootDirectory,
                        key
                    ),
                    Uint8Array.from([
                        0,
                        1,
                        2,
                        3,
                        4,
                        5
                    ])
                );

                const engine =
                    createProductionExtractionEngine(
                        rootDirectory
                    );

                const result =
                    await engine.extract(
                        createPdfAsset(
                            key
                        )
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
