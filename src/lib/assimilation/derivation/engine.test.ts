import assert from "node:assert/strict";
import test from "node:test";

import {
    DeterministicDerivationEngine,
    InMemoryClassificationReader,
    createDerivationEngine
} from "./engine";

import {
    validateDerivationRequest,
    validateDerivationResult
} from "./validation";

import {
    sampleDerivationRequest,
    sampleDerivationResult
} from "./fixtures/sampleDerivation";

import {
    sampleTextClassification
} from "../fixtures/sampleTextAsset";


test(
    "creates a deterministic derivation engine",
    async () => {

        const engine =
            createDerivationEngine();

        assert.ok(
            engine
        );

    }
);


test(
    "derives directly from resolved classifications without a classification reader",
    async () => {

        const engine =
            new DeterministicDerivationEngine();

        const result =
            await engine.deriveClassifications(
                sampleDerivationRequest,
                [
                    sampleTextClassification
                ]
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
                .derivative
                .id,
            result.derivationId
        );

        assert.equal(
            result.results[0]
                .derivative
                .assetId,
            sampleDerivationRequest
                .assetId
        );

        assert.deepEqual(
            result.results[0]
                .derivative
                .sourceSegmentIds,
            sampleDerivationRequest
                .sourceSegmentIds
        );

        assert.equal(
            result.results[0]
                .derivative
                .transformationId,
            sampleDerivationRequest
                .transformationId
        );

    }
);

test(
    "derives a durable object from a valid request",
    async () => {

        const classificationReader =
            new InMemoryClassificationReader([
                {
                    classification:
                        sampleTextClassification
                }
            ]);

        const engine =
            new DeterministicDerivationEngine(
                classificationReader
            );

        const result =
            await engine.derive(
                sampleDerivationRequest
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
                .derivative
                .id,
            result.derivationId
        );

        assert.equal(
            result.results[0]
                .derivative
                .assetId,
            sampleDerivationRequest
                .assetId
        );

        assert.deepEqual(
            result.results[0]
                .derivative
                .sourceSegmentIds,
            sampleDerivationRequest
                .sourceSegmentIds
        );

        assert.equal(
            result.results[0]
                .derivative
                .transformationId,
            sampleDerivationRequest
                .transformationId
        );

    }
);


test(
    "validates the sample derivation request",
    async () => {

        const validation =
            validateDerivationRequest(
                sampleDerivationRequest
            );

        assert.equal(
            validation.valid,
            true
        );

        assert.equal(
            validation.issues.length,
            0
        );

    }
);


test(
    "validates the sample derivation result",
    async () => {

        const validation =
            validateDerivationResult(
                sampleDerivationResult
            );

        assert.equal(
            validation.valid,
            true
        );

        assert.equal(
            validation.issues.length,
            0
        );

    }
);


test(
    "rejects a request without source segments",
    async () => {

        const validation =
            validateDerivationRequest({

                ...sampleDerivationRequest,

                sourceSegmentIds:
                    []

            });

        assert.equal(
            validation.valid,
            false
        );

        assert.equal(
            validation.issues.some(
                (item) => {
                    return (
                        item.code ===
                        "derivation.request.segments.empty"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects duplicate source segment references",
    async () => {

        const sourceSegmentId =
            sampleDerivationRequest
                .sourceSegmentIds[0];

        const validation =
            validateDerivationRequest({

                ...sampleDerivationRequest,

                sourceSegmentIds: [
                    sourceSegmentId,
                    sourceSegmentId
                ]

            });

        assert.equal(
            validation.valid,
            false
        );

        assert.equal(
            validation.issues.some(
                (item) => {
                    return (
                        item.code ===
                        "derivation.request.segments.duplicate"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects an empty completed derivation result",
    async () => {

        const validation =
            validateDerivationResult({

                ...sampleDerivationResult,

                results:
                    []

            });

        assert.equal(
            validation.valid,
            false
        );

        assert.equal(
            validation.issues.some(
                (item) => {
                    return (
                        item.code ===
                        "derivation.result.empty"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects mismatched derivative identifiers",
    async () => {

        const validation =
            validateDerivationResult({

                ...sampleDerivationResult,

                results: [

                    {

                        ...sampleDerivationResult
                            .results[0],

                        derivative: {

                            ...sampleDerivationResult
                                .results[0]
                                .derivative,

                            id:
                                "derivative:77777777-7777-4777-8777-777777777777"

                        }

                    }

                ]

            });

        assert.equal(
            validation.valid,
            false
        );

        assert.equal(
            validation.issues.some(
                (item) => {
                    return (
                        item.code ===
                        "derivation.derivative.id-mismatch"
                    );
                }
            ),
            true
        );

    }
);
