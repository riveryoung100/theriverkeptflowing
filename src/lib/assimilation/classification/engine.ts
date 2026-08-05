import {
    createClassificationId
} from "../identifiers";

import type {
    SegmentId
} from "../types";

import type {
    ClassificationEngine,
    ClassificationEngineResult
} from "./types";

export class DeterministicClassificationEngine
implements ClassificationEngine {

    classify(
        segmentId: SegmentId
    ): ClassificationEngineResult {

        void segmentId;

        return {

            classificationId:
                createClassificationId(),

            status:
                "completed",

            results: []

        };

    }

}

export function createClassificationEngine():
ClassificationEngine {

    return new
        DeterministicClassificationEngine();

}
