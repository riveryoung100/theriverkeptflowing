import assert from "node:assert/strict";
import test from "node:test";

import {
    sampleTextAsset,
    sampleTextClassification,
    sampleTextExtraction,
    sampleTextSegment
} from "./fixtures/sampleTextAsset";

import type {
    AssetSegment,
    SourceAsset
} from "./types";

import {
    getAllowedStatusTransitions,
    isBcp47LanguageCode,
    isConfidence,
    isIsoUtcTimestamp,
    isValidStatusTransition,
    validateAssetClassification,
    validateAssetExtraction,
    validateAssetSegment,
    validateSourceAsset,
    validateSourceLocation
} from "./validation";


test(
    "accepts the complete synthetic fixture",
    () => {

        assert.equal(
            validateSourceAsset(
                sampleTextAsset
            ).valid,
            true
        );

        assert.equal(
            validateAssetExtraction(
                sampleTextExtraction
            ).valid,
            true
        );

        assert.equal(
            validateAssetSegment(
                sampleTextSegment
            ).valid,
            true
        );

        assert.equal(
            validateAssetClassification(
                sampleTextClassification
            ).valid,
            true
        );

    }
);


test(
    "validates timestamps, confidence, and language codes",
    () => {

        assert.equal(
            isIsoUtcTimestamp(
                "2026-08-05T14:00:00.000Z"
            ),
            true
        );

        assert.equal(
            isIsoUtcTimestamp(
                "2026-08-05 14:00:00"
            ),
            false
        );

        assert.equal(
            isConfidence(
                0
            ),
            true
        );

        assert.equal(
            isConfidence(
                1
            ),
            true
        );

        assert.equal(
            isConfidence(
                1.01
            ),
            false
        );

        assert.equal(
            isConfidence(
                -0.01
            ),
            false
        );

        assert.equal(
            isBcp47LanguageCode(
                "en-US"
            ),
            true
        );

        assert.equal(
            isBcp47LanguageCode(
                "English language"
            ),
            false
        );

    }
);


test(
    "enforces lifecycle transition rules",
    () => {

        assert.equal(
            isValidStatusTransition(
                "received",
                "preserved"
            ),
            true
        );

        assert.equal(
            isValidStatusTransition(
                "received",
                "assimilated"
            ),
            false
        );

        assert.equal(
            isValidStatusTransition(
                "classified",
                "classified"
            ),
            true
        );

        assert.equal(
            getAllowedStatusTransitions(
                "approved"
            ).includes(
                "assimilated"
            ),
            true
        );

    }
);


test(
    "rejects invalid source locations",
    () => {

        const invalidTime =
            validateSourceLocation({
                type:
                    "time",

                startSeconds:
                    20,

                endSeconds:
                    10
            });

        const invalidPage =
            validateSourceLocation({
                type:
                    "page",

                startPage:
                    0
            });

        const invalidSection =
            validateSourceLocation({
                type:
                    "section",

                heading:
                    "   "
            });


        assert.equal(
            invalidTime.valid,
            false
        );

        assert.equal(
            invalidPage.valid,
            false
        );

        assert.equal(
            invalidSection.valid,
            false
        );

    }
);


test(
    "rejects publication when rights are unknown",
    () => {

        const invalidAsset: SourceAsset = {
            ...sampleTextAsset,

            rightsStatus:
                "unknown",

            usagePermission: {
                ...sampleTextAsset
                    .usagePermission,

                mayPublish:
                    true
            }
        };


        const validation =
            validateSourceAsset(
                invalidAsset
            );


        assert.equal(
            validation.valid,
            false
        );

        assert.equal(
            validation.issues.some(
                (item) => {
                    return (
                        item.code ===
                        "asset.publication.rights-conflict"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects highly sensitive publishable assets",
    () => {

        const invalidAsset: SourceAsset = {
            ...sampleTextAsset,

            privacy:
                "highly-sensitive",

            usagePermission: {
                ...sampleTextAsset
                    .usagePermission,

                mayPublish:
                    true
            }
        };


        const validation =
            validateSourceAsset(
                invalidAsset
            );


        assert.equal(
            validation.valid,
            false
        );

        assert.equal(
            validation.issues.some(
                (item) => {
                    return (
                        item.code ===
                        "asset.privacy.publication-conflict"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects duplicate references",
    () => {

        const duplicateExtractionId =
            sampleTextAsset.extractionIds[0];

        const invalidAsset: SourceAsset = {
            ...sampleTextAsset,

            extractionIds: [
                duplicateExtractionId,
                duplicateExtractionId
            ]
        };


        const validation =
            validateSourceAsset(
                invalidAsset
            );


        assert.equal(
            validation.valid,
            false
        );

        assert.equal(
            validation.issues.some(
                (item) => {
                    return (
                        item.code ===
                        "reference.duplicate"
                    );
                }
            ),
            true
        );

    }
);


test(
    "rejects invalid segment confidence and location",
    () => {

        const invalidSegment =
            {
                ...sampleTextSegment,

                confidence:
                    2,

                location: {
                    type:
                        "character",

                    start:
                        20,

                    end:
                        10
                }
            } as AssetSegment;


        const validation =
            validateAssetSegment(
                invalidSegment
            );


        assert.equal(
            validation.valid,
            false
        );

        assert.equal(
            validation.issues.some(
                (item) => {
                    return (
                        item.code ===
                        "segment.confidence.invalid"
                    );
                }
            ),
            true
        );

        assert.equal(
            validation.issues.some(
                (item) => {
                    return (
                        item.code ===
                        "location.character.end.invalid"
                    );
                }
            ),
            true
        );

    }
);


test(
    "requires classified assets to reference a classification",
    () => {

        const invalidAsset: SourceAsset = {
            ...sampleTextAsset,

            classificationIds:
                []
        };


        const validation =
            validateSourceAsset(
                invalidAsset
            );


        assert.equal(
            validation.valid,
            false
        );

        assert.equal(
            validation.issues.some(
                (item) => {
                    return (
                        item.code ===
                        "asset.status.classification-missing"
                    );
                }
            ),
            true
        );

    }
);