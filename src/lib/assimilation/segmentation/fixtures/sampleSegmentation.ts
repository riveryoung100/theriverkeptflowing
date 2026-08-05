import {
    createSegmentId
} from "../../identifiers";

import {
    sampleTextExtraction,
    sampleTextSegment
} from "../../fixtures/sampleTextAsset";

import type {
    SegmentationEngineResult,
    SegmentationRequest
} from "../types";

export const sampleSegmentationResult:
SegmentationEngineResult = {

    segmentationId:
        createSegmentId(),

    status:
        "completed",

    results: [

        {

            segment:
                sampleTextSegment,

            status:
                "completed"

        }

    ]

};

export const sampleSegmentationRequest:
SegmentationRequest = {

    extractionId:
        sampleTextExtraction.id,

    requestedAt:
        "2026-08-05T14:00:00.000Z"

};
