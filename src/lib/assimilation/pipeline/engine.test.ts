import assert from "node:assert/strict";
import test from "node:test";

import {
    createExtractionEngine,
    InMemoryRawSourceReader
} from "../extraction/engine";

import {
    sampleTextAsset
} from "../fixtures/sampleTextAsset";

import {
    isTransformationId
} from "../identifiers";

import type {
    SourceAsset,
    StorageReference
} from "../types";

import {
    createAssimilationPipeline
} from "./engine";


const SAMPLE_STORAGE:
StorageReference = {

    provider:
        "memory",

    bucket:
        "raw",

    key:
        "pipeline-source.txt",

    versionId:
        "v1"

};


const pipelineAsset:
SourceAsset = {

    ...sampleTextAsset,

    storage:
        SAMPLE_STORAGE

};


test(
    "assimilates a source asset through the deterministic pipeline",
    async () => {

        const extractionEngine =
            createExtractionEngine(
                new InMemoryRawSourceReader([
                    {
                        storage:
                            SAMPLE_STORAGE,
                        text:
                            "Faith, family, purpose, stewardship, and legacy."
                    }
                ])
            );

        const pipeline =
            createAssimilationPipeline(
                extractionEngine
            );

        const result =
            await pipeline.assimilate(
                pipelineAsset
            );

        assert.equal(
            result.status,
            "completed"
        );

        assert.equal(
            result.failedStage,
            null
        );

        assert.ok(
            result.extraction
        );

        assert.ok(
            result.segment
        );

        assert.ok(
            result.classification
        );

        assert.ok(
            result.derivedObject
        );

        assert.equal(
            result.extraction.assetId,
            pipelineAsset.id
        );

        assert.equal(
            result.segment.assetId,
            pipelineAsset.id
        );

        assert.equal(
            result.classification.assetId,
            pipelineAsset.id
        );

        assert.ok(
            result.transformation
        );

        assert.equal(
            isTransformationId(result.transformation.id),
            true
        );

        assert.equal(
            result.derivedObject.transformationId,
            result.transformation.id
        );

    }
);


test(
    "stops the pipeline when extraction fails",
    async () => {

        const extractionEngine =
            createExtractionEngine(
                new InMemoryRawSourceReader()
            );

        const pipeline =
            createAssimilationPipeline(
                extractionEngine
            );

        const result =
            await pipeline.assimilate(
                pipelineAsset
            );

        assert.equal(
            result.status,
            "failed"
        );

        assert.equal(
            result.failedStage,
            "extraction"
        );

        assert.equal(
            result.extraction,
            null
        );

        assert.equal(
            result.segment,
            null
        );

        assert.equal(
            result.classification,
            null
        );

        assert.equal(
            result.derivedObject,
            null
        );

    }
);