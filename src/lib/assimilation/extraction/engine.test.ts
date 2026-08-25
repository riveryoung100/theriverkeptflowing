import assert from "node:assert/strict";
import test from "node:test";

import {
    DeterministicExtractionEngine,
    InMemoryRawSourceReader,
    createExtractionEngine
} from "./engine";

import {
    validateExtractionResult
} from "./validation";

import {
    sampleTextAsset
} from "../fixtures/sampleTextAsset";

import {
    sampleExtractionResult
} from "./fixtures/sampleExtraction";

import type {
    SourceAsset,
    StorageReference
} from "../types";


const SAMPLE_STORAGE:
StorageReference = {

    provider:
        "memory",

    bucket:
        "assimilation-tests",

    key:
        "synthetic-assimilation-fixture.txt",

    versionId:
        "1"

};


const SAMPLE_RAW_TEXT =
    "Every source asset must retain provenance and remain separate from its derived knowledge.";


function createStoredTextAsset():
SourceAsset {

    return {

        ...sampleTextAsset,

        storage:
            SAMPLE_STORAGE

    };

}


function createReader():
InMemoryRawSourceReader {

    return new
        InMemoryRawSourceReader([

            {

                storage:
                    SAMPLE_STORAGE,

                text:
                    SAMPLE_RAW_TEXT

            }

        ]);

}


test(
    "creates a deterministic extraction engine",
    () => {

        const engine =
            createExtractionEngine();

        assert.ok(engine);

    }
);


test(
    "extracts stored text into a completed asset extraction",
    async () => {

        const engine =
            new DeterministicExtractionEngine(
                createReader(),
                () =>
                    "2026-08-23T19:00:00.000Z"
            );

        const asset =
            createStoredTextAsset();

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
            result.results[0].extraction;

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
            SAMPLE_RAW_TEXT
        );

        assert.equal(
            extraction.extractedAt,
            "2026-08-23T19:00:00.000Z"
        );

        assert.equal(
            extraction.extractorVersion,
            "deterministic-text-extractor-v1"
        );

        assert.equal(
            extraction.detectedLanguage,
            asset.language
        );

        assert.equal(
            extraction.confidence,
            1
        );

        assert.deepEqual(
            extraction.warnings,
            []
        );

    }
);


test(
    "rejects extraction when permission is denied",
    async () => {

        const asset =
            createStoredTextAsset();

        const deniedAsset:
            SourceAsset = {

                ...asset,

                usagePermission: {

                    ...asset.usagePermission,

                    mayExtract:
                        false

                }

            };

        const engine =
            new DeterministicExtractionEngine(
                createReader()
            );

        const result =
            await engine.extract(
                deniedAsset
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
    "rejects extraction when storage is missing",
    async () => {

        const engine =
            new DeterministicExtractionEngine(
                createReader()
            );

        const result =
            await engine.extract(
                sampleTextAsset
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
    "rejects unsupported source mime types",
    async () => {

        const asset:
            SourceAsset = {

                ...createStoredTextAsset(),

                mimeType:
                    "application/pdf"

            };

        const engine =
            new DeterministicExtractionEngine(
                createReader()
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


test(
    "rejects extraction when stored source cannot be resolved",
    async () => {

        const engine =
            new DeterministicExtractionEngine(
                new InMemoryRawSourceReader()
            );

        const result =
            await engine.extract(
                createStoredTextAsset()
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
    "fixture validates successfully",
    () => {

        const validation =
            validateExtractionResult(
                sampleExtractionResult
            );

        assert.equal(
            validation.valid,
            true
        );

    }
);


test(
    "empty extraction is rejected",
    () => {

        const validation =
            validateExtractionResult({

                extractionId:
                    sampleExtractionResult.extractionId,

                status:
                    "completed",

                results: []

            });

        assert.equal(
            validation.valid,
            false
        );

        assert.equal(
            validation.issues.length,
            1
        );

    }
);

test(
    "extracts stored Markdown text into a completed asset extraction",
    async () => {

        const markdownText =
            "# Faith\n\nPurpose, stewardship, and legacy.";

        const asset:
            SourceAsset = {
                ...createStoredTextAsset(),

                mimeType:
                    "text/markdown"
            };

        const reader =
            new InMemoryRawSourceReader([
                {
                    storage:
                        asset.storage!,

                    text:
                        markdownText
                }
            ]);

        const engine =
            createExtractionEngine(
                reader
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
            result.results[0]
                ?.extraction
                .text,
            markdownText
        );

        assert.equal(
            result.results[0]
                ?.extraction
                .assetId,
            asset.id
        );

    }
);
