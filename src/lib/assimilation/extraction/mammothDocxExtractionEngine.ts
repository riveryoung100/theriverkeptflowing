import mammoth from "mammoth";

import {
    createExtractionId
} from "../identifiers";

import {
    ASSIMILATION_SCHEMA_VERSION
} from "../types";

import type {
    AssetExtraction,
    SourceAsset
} from "../types";

import type {
    BinaryRawSourceReader,
    ExtractionEngine,
    ExtractionEngineResult
} from "./types";


const DOCX_MIME_TYPE =
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const DOCX_EXTRACTOR_VERSION =
    "mammoth-docx-extractor-v1";


function createFailedResult():
ExtractionEngineResult {

    return {
        extractionId:
            createExtractionId(),

        status:
            "failed",

        results:
            []
    };

}


export class MammothDocxExtractionEngine
implements ExtractionEngine {

    constructor(
        private readonly rawSourceReader:
            BinaryRawSourceReader,
        private readonly now:
            () => string =
            () => new Date().toISOString()
    ) {}


    async extract(
        asset: SourceAsset
    ): Promise<ExtractionEngineResult> {

        if (
            asset.mimeType !==
                DOCX_MIME_TYPE
        ) {
            return createFailedResult();
        }

        if (
            asset.usagePermission.mayExtract !==
                true
        ) {
            return createFailedResult();
        }

        if (!asset.storage) {
            return createFailedResult();
        }

        const rawSource =
            await this.rawSourceReader.read(
                asset.storage
            );

        if (!rawSource) {
            return createFailedResult();
        }

        try {

            const result =
                await mammoth.extractRawText({
                    buffer:
                        Buffer.from(
                            rawSource.bytes
                        )
                });

            const extractionId =
                createExtractionId();

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
                        DOCX_EXTRACTOR_VERSION,

                    text:
                        result.value,

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
        catch {

            return createFailedResult();

        }

    }

}
