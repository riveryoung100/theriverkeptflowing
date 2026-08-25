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


export function normalizeMimeType(
    mimeType:
        string | undefined
): string | undefined {

    if (mimeType === undefined) {
        return undefined;
    }

    const mediaType =
        mimeType
            .split(
                ";",
                1
            )[0]
            ?.trim()
            .toLowerCase();

    if (
        mediaType === undefined ||
        mediaType.length === 0
    ) {
        return undefined;
    }

    return mediaType;

}

export class ProductionExtractionRouter
implements ExtractionEngine {

    constructor(
        private readonly textExtractionEngine:
            ExtractionEngine
    ) {}

    async extract(
        asset: SourceAsset
    ): Promise<ExtractionEngineResult> {

        const normalizedMimeType =
            normalizeMimeType(
                asset.mimeType
            );

        if (
            normalizedMimeType ===
            "text/plain"
        ) {

            if (
                asset.mimeType ===
                normalizedMimeType
            ) {

                return this.textExtractionEngine.extract(
                    asset
                );

            }

            return this.textExtractionEngine.extract({
                ...asset,

                mimeType:
                    normalizedMimeType
            });

        }

        return {

            extractionId:
                createExtractionId(),

            status:
                "failed",

            results:
                []

        };

    }

}


export function createProductionExtractionRouter(
    textExtractionEngine:
        ExtractionEngine
): ExtractionEngine {

    return new ProductionExtractionRouter(
        textExtractionEngine
    );

}
