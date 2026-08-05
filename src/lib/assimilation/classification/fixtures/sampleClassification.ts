import {
    createClassificationId
} from "../../identifiers";

import {
    sampleTextClassification,
    sampleTextSegment
} from "../../fixtures/sampleTextAsset";

import type {
    ClassificationEngineResult,
    ClassificationRequest
} from "../types";

export const sampleClassificationResult:
ClassificationEngineResult = {

    classificationId:
        createClassificationId(),

    status:
        "completed",

    results: [

        {

            classification:
                sampleTextClassification,

            status:
                "completed"

        }

    ]

};

export const sampleClassificationRequest:
ClassificationRequest = {

    segmentId:
        sampleTextSegment.id,

    requestedAt:
        "2026-08-05T14:00:00.000Z"

};
