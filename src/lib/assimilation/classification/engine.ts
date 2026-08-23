import {
    ASSIMILATION_SCHEMA_VERSION
} from "../types";

import {
    createClassificationId
} from "../identifiers";

import type {
    AssetSegment,
    SegmentId
} from "../types";

import type {
    ClassificationEngine,
    ClassificationEngineResult,
    SegmentReader
} from "./types";


export interface InMemorySegmentEntry {

    readonly segment:
        AssetSegment;

}


export class InMemorySegmentReader
implements SegmentReader {

    public constructor(
        private readonly entries:
            readonly InMemorySegmentEntry[] = []
    ) {}


    public async read(
        segmentId: SegmentId
    ): Promise<AssetSegment | null> {

        const entry =
            this.entries.find(
                candidate =>
                    candidate.segment.id ===
                    segmentId
            );

        return entry?.segment ?? null;
    }

}


export class DeterministicClassificationEngine
implements ClassificationEngine {

    public constructor(
        private readonly segmentReader:
            SegmentReader =
                new InMemorySegmentReader()
    ) {}


    public async classify(
        segmentId: SegmentId
    ): Promise<ClassificationEngineResult> {

        const classificationId =
            createClassificationId();

        const segment =
            await this.segmentReader.read(
                segmentId
            );

        if (
            segment === null ||
            typeof segment.normalizedText !== "string" ||
            segment.normalizedText.length === 0
        ) {

            return {

                classificationId,

                status:
                    "failed",

                results:
                    []

            };
        }

        const classification = {

            id:
                classificationId,

            assetId:
                segment.assetId,

            domainKeys:
                [],

            topicKeys:
                segment.topicKeys,

            audienceKeys:
                [],

            contentFunctions:
                [],

            businessRelevance:
                [],

            learningOutcomes:
                [],

            questionsAnswered:
                [],

            confidence:
                1,

            reviewStatus:
                "not-required" as const,

            classifiedAt:
                new Date(0).toISOString(),

            version:
                1,

            schemaVersion:
                ASSIMILATION_SCHEMA_VERSION

        };

        return {

            classificationId,

            status:
                "completed",

            results: [

                {

                    classification,

                    status:
                        "completed"

                }

            ]

        };
    }

}


export function createClassificationEngine(
    segmentReader:
        SegmentReader =
            new InMemorySegmentReader()
): ClassificationEngine {

    return new DeterministicClassificationEngine(
        segmentReader
    );
}
