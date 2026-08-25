import assert from "node:assert/strict";
import test from "node:test";

import {
    DeterministicSegmentationEngine,
    InMemoryExtractionReader,
    createSegmentationEngine
} from "./engine";

import {
    validateSegmentationResult
} from "./validation";

import {
    sampleTextExtraction
} from "../fixtures/sampleTextAsset";

import {
    sampleSegmentationResult
} from "./fixtures/sampleSegmentation";


function createReader():
InMemoryExtractionReader {

    return new InMemoryExtractionReader([

        {
            extraction:
                sampleTextExtraction
        }

    ]);
}


test(
    "creates a deterministic segmentation engine",
    () => {

        const engine =
            createSegmentationEngine();

        assert.ok(engine);

    }
);


test(
    "segments resolved extraction text into a completed asset segment",
    async () => {

        const engine =
            new DeterministicSegmentationEngine(
                createReader()
            );

        const result =
            await engine.segment(
                sampleTextExtraction.id
            );

        assert.equal(
            result.status,
            "completed"
        );

        assert.equal(
            result.results.length,
            1
        );

        const segment =
            result.results[0].segment;

        assert.equal(
            result.segmentationId,
            segment.id
        );

        assert.equal(
            segment.assetId,
            sampleTextExtraction.assetId
        );

        assert.equal(
            segment.extractionId,
            sampleTextExtraction.id
        );

        assert.equal(
            segment.sourceText,
            sampleTextExtraction.text
        );

        assert.equal(
            segment.normalizedText,
            sampleTextExtraction.text
        );

        assert.deepEqual(
            segment.location,
            {
                type:
                    "character",

                start:
                    0,

                end:
                    sampleTextExtraction.text?.length
            }
        );

    }
);


test(
    "segments an AssetExtraction directly without an extraction reader",
    async () => {

        const engine =
            new DeterministicSegmentationEngine();

        const result =
            await engine.segmentExtraction(
                sampleTextExtraction
            );

        assert.equal(
            result.status,
            "completed"
        );

        assert.equal(
            result.results.length,
            1
        );

        const segment =
            result.results[0].segment;

        assert.equal(
            result.segmentationId,
            segment.id
        );

        assert.equal(
            segment.assetId,
            sampleTextExtraction.assetId
        );

        assert.equal(
            segment.extractionId,
            sampleTextExtraction.id
        );

        assert.equal(
            segment.sourceText,
            sampleTextExtraction.text
        );

        assert.equal(
            segment.normalizedText,
            sampleTextExtraction.text
        );

        assert.deepEqual(
            segment.location,
            {
                type:
                    "character",

                start:
                    0,

                end:
                    sampleTextExtraction.text?.length
            }
        );

    }
);

test(
    "rejects segmentation when extraction cannot be resolved",
    async () => {

        const engine =
            new DeterministicSegmentationEngine(
                new InMemoryExtractionReader()
            );

        const result =
            await engine.segment(
                sampleTextExtraction.id
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
    "rejects segmentation when extraction has no text",
    async () => {

        const extraction = {

            ...sampleTextExtraction,

            text:
                undefined

        };

        const engine =
            new DeterministicSegmentationEngine(
                new InMemoryExtractionReader([

                    {
                        extraction
                    }

                ])
            );

        const result =
            await engine.segment(
                extraction.id
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
            validateSegmentationResult(
                sampleSegmentationResult
            );

        assert.equal(
            validation.valid,
            true
        );

    }
);


test(
    "empty segmentation is rejected",
    () => {

        const validation =
            validateSegmentationResult({

                segmentationId:
                    sampleSegmentationResult.segmentationId,

                status:
                    "completed",

                results:
                    []

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
