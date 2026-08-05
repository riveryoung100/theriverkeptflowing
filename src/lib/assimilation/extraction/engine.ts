import {
    createExtractionId
} from "../identifiers";

import type {
    SourceAsset
} from "../types";

import type {
    ExtractionEngine,
    ExtractionEngineResult
} from "./types";

export class DeterministicExtractionEngine
implements ExtractionEngine {

    extract(
        asset: SourceAsset
    ): ExtractionEngineResult {

        return {

            extractionId:
                createExtractionId(),

            status:
                "completed",

            results: []

        };

    }

}

export function createExtractionEngine():
ExtractionEngine {

    return new
        DeterministicExtractionEngine();

}
