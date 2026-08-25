import assert from "node:assert/strict";
import test from "node:test";

import {
    createSamplePdfBytes
} from "./fixtures/samplePdfBytes";

import {
    sampleTextAsset
} from "../fixtures/sampleTextAsset";

import type {
    SourceAsset,
    StorageReference
} from "../types";

import type {
    BinaryRawSourceReader
} from "./types";

import {
    PdfJsExtractionEngine
} from "./pdfJsExtractionEngine";


const STORAGE:
StorageReference = {

    provider:
        "filesystem",

    key:
        "sample.pdf",

    versionId:
        "1"

};


function createPdfAsset():
SourceAsset {

    return {
        ...sampleTextAsset,

        mimeType:
            "application/pdf",

        storage:
            STORAGE
    };

}


function createBinaryReader(
    bytes:
        Uint8Array | null
): BinaryRawSourceReader {

    return {
        async read() {

            if (bytes === null) {
                return null;
            }

            return {
                bytes
            };

        }
    };

}


test(
    "extracts text from stored PDF bytes",
    async () => {

        const engine =
            new PdfJsExtractionEngine(
                createBinaryReader(
                    createSamplePdfBytes(
                        "The River Kept Flowing"
                    )
                ),
                () =>
                    "2026-08-25T15:00:00.000Z"
            );

        const asset =
            createPdfAsset();

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

        const extraction =
            result.results[0]?.extraction;

        assert.ok(
            extraction
        );

        assert.equal(
            result.extractionId,
            extraction.id
        );

        assert.equal(
            extraction.assetId,
            asset.id
        );

        assert.equal(
            extraction.status,
            "complete"
        );

        assert.equal(
            extraction.text,
            "The River Kept Flowing"
        );

        assert.equal(
            extraction.extractedAt,
            "2026-08-25T15:00:00.000Z"
        );

        assert.equal(
            extraction.extractorVersion,
            "pdfjs-text-extractor-v1"
        );

        assert.equal(
            extraction.detectedLanguage,
            asset.language
        );

        assert.deepEqual(
            extraction.warnings,
            []
        );

        assert.equal(
            extraction.confidence,
            1
        );

    }
);


test(
    "rejects PDF extraction when permission is denied",
    async () => {

        let readCount =
            0;

        const reader:
            BinaryRawSourceReader = {

                async read() {

                    readCount++;

                    return {
                        bytes:
                            createSamplePdfBytes()
                    };

                }

            };

        const engine =
            new PdfJsExtractionEngine(
                reader
            );

        const asset =
            createPdfAsset();

        const result =
            await engine.extract({
                ...asset,

                usagePermission: {
                    ...asset.usagePermission,

                    mayExtract:
                        false
                }
            });

        assert.equal(
            readCount,
            0
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


test(
    "rejects PDF extraction when storage is missing",
    async () => {

        let readCount =
            0;

        const reader:
            BinaryRawSourceReader = {

                async read() {

                    readCount++;

                    return {
                        bytes:
                            createSamplePdfBytes()
                    };

                }

            };

        const engine =
            new PdfJsExtractionEngine(
                reader
            );

        const result =
            await engine.extract({
                ...createPdfAsset(),

                storage:
                    undefined
            });

        assert.equal(
            readCount,
            0
        );

        assert.equal(
            result.status,
            "failed"
        );

    }
);


test(
    "rejects non-PDF MIME without reading binary source",
    async () => {

        let readCount =
            0;

        const reader:
            BinaryRawSourceReader = {

                async read() {

                    readCount++;

                    return {
                        bytes:
                            createSamplePdfBytes()
                    };

                }

            };

        const engine =
            new PdfJsExtractionEngine(
                reader
            );

        const result =
            await engine.extract({
                ...createPdfAsset(),

                mimeType:
                    "text/plain"
            });

        assert.equal(
            readCount,
            0
        );

        assert.equal(
            result.status,
            "failed"
        );

    }
);


test(
    "fails when stored PDF bytes cannot be resolved",
    async () => {

        const engine =
            new PdfJsExtractionEngine(
                createBinaryReader(
                    null
                )
            );

        const result =
            await engine.extract(
                createPdfAsset()
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


test(
    "converts malformed PDF parser failure into a failed extraction result",
    async () => {

        const engine =
            new PdfJsExtractionEngine(
                createBinaryReader(
                    Uint8Array.from([
                        0,
                        1,
                        2,
                        3,
                        4,
                        5
                    ])
                )
            );

        const result =
            await engine.extract(
                createPdfAsset()
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
