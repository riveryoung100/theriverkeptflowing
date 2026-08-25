import {
    ASSIMILATION_SCHEMA_VERSION
} from "../types";

import {
    createSegmentId
} from "../identifiers";

import type {
    AssetExtraction,
    ExtractionId,
    SegmentId
} from "../types";

import type {
    ExtractionReader,
    SegmentationEngine,
    SegmentationEngineResult
} from "./types";


export interface InMemoryExtractionEntry {

    readonly extraction:
        AssetExtraction;

}


export class InMemoryExtractionReader
implements ExtractionReader {

    public constructor(
        private readonly entries:
            readonly InMemoryExtractionEntry[] = []
    ) {}

    public async read(
        extractionId: ExtractionId
    ): Promise<AssetExtraction | null> {

        const entry =
            this.entries.find(
                candidate =>
                    candidate.extraction.id ===
                    extractionId
            );

        return entry?.extraction ?? null;
    }

}


export class DeterministicSegmentationEngine
implements SegmentationEngine {

    public constructor(
        private readonly extractionReader:
            ExtractionReader =
                new InMemoryExtractionReader()
    ) {}


    public async segment(
        extractionId: ExtractionId
    ): Promise<SegmentationEngineResult> {

        const segmentationId =
            createSegmentId();

        const extraction =
            await this.extractionReader.read(
                extractionId
            );

        if (extraction === null) {

            return {

                segmentationId,

                status:
                    "failed",

                results:
                    []

            };
        }

        return this.segmentExtraction(
            extraction,
            segmentationId
        );
    }


    public async segmentExtraction(
        extraction: AssetExtraction,
        segmentationId:
            SegmentId =
                createSegmentId()
    ): Promise<SegmentationEngineResult> {

        if (
            extraction.status !== "complete" ||
            typeof extraction.text !== "string" ||
            extraction.text.length === 0
        ) {

            return {

                segmentationId,

                status:
                    "failed",

                results:
                    []

            };
        }

        const segment = {

            id:
                segmentationId,

            assetId:
                extraction.assetId,

            extractionId:
                extraction.id,

            segmentType:
                "section" as const,

            location: {

                type:
                    "character" as const,

                start:
                    0,

                end:
                    extraction.text.length

            },

            sourceText:
                extraction.text,

            normalizedText:
                extraction.text,

            topicKeys:
                [],

            confidence:
                1,

            publicationEligibility:
                "private" as const,

            reviewStatus:
                "not-required" as const,

            version:
                1,

            schemaVersion:
                ASSIMILATION_SCHEMA_VERSION

        };

        return {

            segmentationId,

            status:
                "completed",

            results: [

                {

                    segment,

                    status:
                        "completed"

                }

            ]

        };
    }

}


export function createSegmentationEngine(
    extractionReader:
        ExtractionReader =
            new InMemoryExtractionReader()
): SegmentationEngine {

    return new DeterministicSegmentationEngine(
        extractionReader
    );
}
