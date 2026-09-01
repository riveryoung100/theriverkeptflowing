import {
    ASSIMILATION_SCHEMA_VERSION
} from "../../types";

import {
    createDerivativeId
} from "../../identifiers";

import {
    sampleTextAsset,
    sampleTextClassification,
    sampleTextSegment,
    sampleTextTransformation
} from "../../fixtures/sampleTextAsset";

import type {
    DerivationEngineResult,
    DerivationRequest
} from "../types";


export const SAMPLE_DERIVATIVE_ID =
    createDerivativeId();


export const sampleDerivationResult:
DerivationEngineResult = {

    derivationId:
        SAMPLE_DERIVATIVE_ID,

    assetId:
        sampleTextAsset.id,

    status:
        "completed",

    reviewStatus:
        "not-required",

    results: [

        {

            derivative: {

                id:
                    SAMPLE_DERIVATIVE_ID,

                assetId:
                    sampleTextAsset.id,

                objectType:
                    "knowledge-entry",

                objectId:
                    "knowledge-demo",

                sourceSegmentIds: [
                    sampleTextSegment.id
                ],

                sourceClassificationIds: [
                    sampleTextClassification.id
                ],

                transformationId:
                    sampleTextTransformation.id,

                reviewStatus:
                    "not-required",

                createdAt:
                    "2026-08-05T14:00:00.000Z",

                version:
                    1,

                schemaVersion:
                    ASSIMILATION_SCHEMA_VERSION

            },

            status:
                "completed"

        }

    ],

    warnings:
        []

};


export const sampleDerivationRequest:
DerivationRequest = {

    assetId:
        sampleTextAsset.id,

    objectType:
        "knowledge-entry",

    objectId:
        "knowledge-demo",

    sourceSegmentIds: [
        sampleTextSegment.id
    ],

    sourceClassificationIds: [
        sampleTextClassification.id
    ],

    transformationId:
        sampleTextTransformation.id,

    requestedAt:
        "2026-08-05T14:00:00.000Z"

};

