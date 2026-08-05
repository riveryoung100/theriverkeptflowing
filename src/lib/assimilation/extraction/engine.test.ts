import assert from "node:assert/strict";
import test from "node:test";

import {
    DeterministicExtractionEngine,
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

test(
    "creates a deterministic extraction engine",
    () => {

        const engine =
            createExtractionEngine();

        assert.ok(engine);

    }
);

test(
    "extract returns a completed result",
    () => {

        const engine =
            new DeterministicExtractionEngine();

        const result =
            engine.extract(
                sampleTextAsset
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
