import assert from "node:assert/strict";
import test from "node:test";

import {
    DeterministicClassificationEngine,
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

test(
    "creates a deterministic classification engine",
    () => {

        const engine =
            createClassificationEngine();

        assert.ok(engine);

    }
);

test(
    "classify returns a completed result",
    () => {

        const engine =
            new DeterministicClassificationEngine();

        const result =
            engine.classify(
                sampleTextSegment.id
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
