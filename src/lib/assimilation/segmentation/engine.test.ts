import assert from "node:assert/strict";
import test from "node:test";

import {
    DeterministicSegmentationEngine,
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

test(
    "creates a deterministic segmentation engine",
    () => {

        const engine =
            createSegmentationEngine();

        assert.ok(engine);

    }
);

test(
    "segment returns a completed result",
    () => {

        const engine =
            new DeterministicSegmentationEngine();

        const result =
            engine.segment(
                sampleTextExtraction.id
            );

        assert.equal(
            result.status,
            "completed"
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
