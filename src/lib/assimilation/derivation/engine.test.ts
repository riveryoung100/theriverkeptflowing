import assert from "node:assert/strict";
import test from "node:test";

import {
    DeterministicDerivationEngine,
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


test(
    "creates a deterministic derivation engine",
    () => {

        const engine =
            createDerivationEngine();

        assert.ok(
            engine
        );

    }
);


test(
    "derives a durable object from a valid request",
    () => {

        const engine =
            new DeterministicDerivationEngine();

        const result =
            engine.derive(
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
    () => {

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
    () => {

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
    () => {

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
    () => {

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
    () => {

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
    () => {

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
