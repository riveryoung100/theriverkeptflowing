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


export class ProductionExtractionRouter
implements ExtractionEngine {

    constructor(
        private readonly textExtractionEngine:
            ExtractionEngine
    ) {}

    async extract(
        asset: SourceAsset
    ): Promise<ExtractionEngineResult> {

        if (
            asset.mimeType ===
            "text/plain"
        ) {

            return this.textExtractionEngine.extract(
                asset
            );

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
