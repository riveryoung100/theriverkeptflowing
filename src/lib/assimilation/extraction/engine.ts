import {
    createExtractionId
} from "../identifiers";

import {
    ASSIMILATION_SCHEMA_VERSION
} from "../types";

import type {
    AssetExtraction,
    SourceAsset,
    StorageReference
} from "../types";

import type {
    ExtractionEngine,
    ExtractionEngineResult,
    RawSourceContent,
    RawSourceReader
} from "./types";


export interface InMemoryRawSourceEntry {

    readonly storage:
        StorageReference;

    readonly text:
        string;

}


function storageReferencesEqual(
    left: StorageReference,
    right: StorageReference
): boolean {

    return (
        left.provider ===
            right.provider &&
        left.bucket ===
            right.bucket &&
        left.key ===
            right.key &&
        left.versionId ===
            right.versionId
    );

}


export class InMemoryRawSourceReader
implements RawSourceReader {

    constructor(
        private readonly entries:
            readonly InMemoryRawSourceEntry[] = []
    ) {}

    async read(
        storage: StorageReference
    ): Promise<RawSourceContent | null> {

        const entry =
            this.entries.find(
                (candidate) =>
                    storageReferencesEqual(
                        candidate.storage,
                        storage
                    )
            );

        if (!entry) {

            return null;

        }

        return {
            text:
                entry.text
        };

    }

}


export class DeterministicExtractionEngine
implements ExtractionEngine {

    constructor(
        private readonly rawSourceReader:
            RawSourceReader =
                new InMemoryRawSourceReader(),
        private readonly now:
            () => string =
                () =>
                    new Date().toISOString()
    ) {}

    async extract(
        asset: SourceAsset
    ): Promise<ExtractionEngineResult> {

        const extractionId =
            createExtractionId();

        if (
            !asset.usagePermission.mayExtract
        ) {

            return {
                extractionId,
                status:
                    "failed",
                results:
                    []
            };

        }

        if (!asset.storage) {

            return {
                extractionId,
                status:
                    "failed",
                results:
                    []
            };

        }

        if (
            asset.mimeType !==
            "text/plain"
        ) {

            return {
                extractionId,
                status:
                    "failed",
                results:
                    []
            };

        }

        const rawSource =
            await this.rawSourceReader.read(
                asset.storage
            );

        if (!rawSource) {

            return {
                extractionId,
                status:
                    "failed",
                results:
                    []
            };

        }

        const extraction:
            AssetExtraction = {

                id:
                    extractionId,

                assetId:
                    asset.id,

                status:
                    "complete",

                extractedAt:
                    this.now(),

                extractorVersion:
                    "deterministic-text-extractor-v1",

                text:
                    rawSource.text,

                detectedLanguage:
                    asset.language,

                warnings:
                    [],

                confidence:
                    1,

                version:
                    1,

                schemaVersion:
                    ASSIMILATION_SCHEMA_VERSION

            };

        return {

            extractionId,

            status:
                "completed",

            results: [

                {

                    extraction,

                    status:
                        "completed"

                }

            ]

        };

    }

}


export function createExtractionEngine(
    rawSourceReader:
        RawSourceReader =
            new InMemoryRawSourceReader()
): ExtractionEngine {

    return new
        DeterministicExtractionEngine(
            rawSourceReader
        );

}