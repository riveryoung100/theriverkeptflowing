import {
    createExtractionId
} from "../../identifiers";

import {
    sampleTextAsset,
    sampleTextExtraction
} from "../../fixtures/sampleTextAsset";

import type {
    ExtractionEngineResult
} from "../types";

export const sampleExtractionResult:
ExtractionEngineResult = {

    extractionId:
        createExtractionId(),

    status:
        "completed",

    results: [

        {

            extraction:
                sampleTextExtraction,

            status:
                "completed"

        }

    ]

};

export const sampleExtractionRequest = {

    assetId:
        sampleTextAsset.id,

    requestedAt:
        "2026-08-05T14:00:00.000Z"

} as const;
