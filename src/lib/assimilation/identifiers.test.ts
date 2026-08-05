import assert from "node:assert/strict";
import test from "node:test";

import {
    assertAssetId,
    createAssetId,
    createAssimilationId,
    createClassificationId,
    createDerivativeId,
    createExtractionId,
    createReviewId,
    createSegmentId,
    createTransformationId,
    getAssimilationIdPrefix,
    getAssimilationUuid,
    isAssetId,
    isAssimilationRecordId,
    isClassificationId,
    isDerivativeId,
    isExtractionId,
    isReviewId,
    isSegmentId,
    isTransformationId
} from "./identifiers";


const FIXED_ASSET_ID =
    "asset:11111111-1111-4111-8111-111111111111";

const FIXED_EXTRACTION_ID =
    "extraction:22222222-2222-4222-8222-222222222222";


test(
    "recognizes valid prefixed UUID identifiers",
    () => {

        assert.equal(
            isAssimilationRecordId(
                FIXED_ASSET_ID
            ),
            true
        );

        assert.equal(
            isAssetId(
                FIXED_ASSET_ID
            ),
            true
        );

        assert.equal(
            isExtractionId(
                FIXED_EXTRACTION_ID
            ),
            true
        );

    }
);


test(
    "rejects malformed and mismatched identifiers",
    () => {

        assert.equal(
            isAssimilationRecordId(
                "asset:not-a-uuid"
            ),
            false
        );

        assert.equal(
            isAssetId(
                FIXED_EXTRACTION_ID
            ),
            false
        );

        assert.equal(
            isAssimilationRecordId(
                26
            ),
            false
        );

    }
);


test(
    "parses prefixes and UUID values",
    () => {

        assert.equal(
            getAssimilationIdPrefix(
                FIXED_ASSET_ID
            ),
            "asset"
        );

        assert.equal(
            getAssimilationUuid(
                FIXED_ASSET_ID
            ),
            "11111111-1111-4111-8111-111111111111"
        );

        assert.equal(
            getAssimilationIdPrefix(
                "invalid"
            ),
            null
        );

        assert.equal(
            getAssimilationUuid(
                "invalid"
            ),
            null
        );

    }
);


test(
    "creates valid identifiers for every record type",
    () => {

        const generalAssetId =
            createAssimilationId(
                "asset"
            );

        const assetId =
            createAssetId();

        const extractionId =
            createExtractionId();

        const segmentId =
            createSegmentId();

        const classificationId =
            createClassificationId();

        const transformationId =
            createTransformationId();

        const derivativeId =
            createDerivativeId();

        const reviewId =
            createReviewId();


        assert.equal(
            isAssetId(
                generalAssetId
            ),
            true
        );

        assert.equal(
            isAssetId(
                assetId
            ),
            true
        );

        assert.equal(
            isExtractionId(
                extractionId
            ),
            true
        );

        assert.equal(
            isSegmentId(
                segmentId
            ),
            true
        );

        assert.equal(
            isClassificationId(
                classificationId
            ),
            true
        );

        assert.equal(
            isTransformationId(
                transformationId
            ),
            true
        );

        assert.equal(
            isDerivativeId(
                derivativeId
            ),
            true
        );

        assert.equal(
            isReviewId(
                reviewId
            ),
            true
        );

    }
);


test(
    "assertAssetId throws for an invalid value",
    () => {

        assert.doesNotThrow(
            () => {
                assertAssetId(
                    FIXED_ASSET_ID
                );
            }
        );

        assert.throws(
            () => {
                assertAssetId(
                    "segment:33333333-3333-4333-8333-333333333333"
                );
            },
            TypeError
        );

    }
);