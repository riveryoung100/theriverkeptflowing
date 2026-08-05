import {
    createSegmentId
} from "../identifiers";

import type {
    ExtractionId
} from "../types";

import type {
    SegmentationEngine,
    SegmentationEngineResult
} from "./types";

export class DeterministicSegmentationEngine
implements SegmentationEngine {

    segment(
        extractionId: ExtractionId
    ): SegmentationEngineResult {

        void extractionId;

        return {

            segmentationId:
                createSegmentId(),

            status:
                "completed",

            results: []

        };

    }

}

export function createSegmentationEngine():
SegmentationEngine {

    return new
        DeterministicSegmentationEngine();

}
