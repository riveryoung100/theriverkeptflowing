import assert from "node:assert/strict";
import test from "node:test";

import {
    DeterministicClassificationEngine,
    InMemorySegmentReader,
    createClassificationEngine
} from "./engine";

import {
    validateClassificationResult
} from "./validation";

import {
    sampleTextSegment
} from "../fixtures/sampleTextAsset";

import {
    sampleClassificationResult
} from "./fixtures/sampleClassification";

import {
    createSegmentId
} from "../identifiers";


test(
    "creates a deterministic classification engine",
    () => {

        const engine =
            createClassificationEngine();

        assert.ok(engine);

    }
);


test(
    "classifies a resolved segment into a completed asset classification",
    async () => {

        const reader =
            new InMemorySegmentReader([

                {
                    segment:
                        sampleTextSegment
                }

            ]);

        const engine =
            new DeterministicClassificationEngine(
                reader
            );

        const result =
            await engine.classify(
                sampleTextSegment.id
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
            result.results[0].status,
            "completed"
        );

        assert.equal(
            result.results[0].classification.id,
            result.classificationId
        );

        assert.equal(
            result.results[0].classification.assetId,
            sampleTextSegment.assetId
        );

        assert.deepEqual(
            result.results[0].classification.sourceSegmentIds,
            [sampleTextSegment.id]
        );

    }
);


test(
    "rejects classification when segment cannot be resolved",
    async () => {

        const engine =
            new DeterministicClassificationEngine(
                new InMemorySegmentReader()
            );

        const result =
            await engine.classify(
                createSegmentId()
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
    "rejects classification when segment has no normalized text",
    async () => {

        const segment = {

            ...sampleTextSegment,

            normalizedText:
                ""

        };

        const reader =
            new InMemorySegmentReader([

                {
                    segment
                }

            ]);

        const engine =
            new DeterministicClassificationEngine(
                reader
            );

        const result =
            await engine.classify(
                segment.id
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
            validateClassificationResult(
                sampleClassificationResult
            );

        assert.equal(
            validation.valid,
            true
        );

    }
);


test(
    "empty classification is rejected",
    () => {

        const validation =
            validateClassificationResult({

                classificationId:
                    sampleClassificationResult.classificationId,

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
